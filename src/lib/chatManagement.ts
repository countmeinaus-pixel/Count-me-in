import { supabase } from './supabase'

// Removing members, closing and deleting group chats, and removing chats from
// your own list (SQL 25: supabase/migrations/20261113210000_chat_management.sql).

const needsUpdate = 'This needs a database update (SQL 25 in docs/sql-to-run.md).'

function client() {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  return supabase
}

function fail(error: { code?: string; message?: string }): never {
  if (error.code === 'PGRST202' || error.code === '42P01' || error.code === 'PGRST205' || error.code === '42703') throw new Error(needsUpdate)
  throw new Error(error.message ?? 'Something went wrong.')
}

function changed() {
  window.dispatchEvent(new Event('count-me-in-chat-unread-changed'))
}

// Host: remove a member from the activity (and its group chat). He gets a notification.
export async function removeActivityMember(activityId: string, userId: string, reason: string) {
  const { error } = await client().rpc('remove_activity_member', { target_activity_id: activityId, target_user_id: userId, reason })
  if (error) fail(error)
  changed()
}

// Host: close (read-only for everyone) or reopen the group chat.
export async function setActivityChatClosed(threadId: string, closed: boolean) {
  const { error } = await client().rpc('set_activity_chat_closed', { target_thread_id: threadId, closed })
  if (error) fail(error)
  changed()
}

// Host: delete the group chat and all messages for everyone. The activity stays.
export async function deleteActivityChat(threadId: string) {
  const { error } = await client().rpc('delete_activity_chat', { target_thread_id: threadId })
  if (error) fail(error)
  changed()
}

export type ChatType = 'activity' | 'direct'
export const hideKey = (type: ChatType, id: string) => `${type}:${id}`

// Remove a chat from your own list. A group chat returns with the next message;
// a private chat only shows messages sent after this moment.
export async function hideChat(type: ChatType, chatId: string) {
  const db = client()
  const { data } = await db.auth.getUser()
  if (!data.user) throw new Error('Sign in first.')
  const { error } = await db.from('chat_hides').upsert(
    { user_id: data.user.id, chat_type: type, chat_id: chatId, hidden_at: new Date().toISOString() },
    { onConflict: 'user_id,chat_type,chat_id' },
  )
  if (error) fail(error)
  changed()
}

// When you removed each chat from your list (ms since 1970), keyed by hideKey().
// Empty before SQL 25.
export async function getChatHides(): Promise<Map<string, number>> {
  if (!supabase) return new Map()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return new Map()
  const { data, error } = await supabase.from('chat_hides').select('chat_type, chat_id, hidden_at').eq('user_id', userData.user.id)
  if (error) return new Map()
  return new Map((data ?? []).map((row) => [hideKey(row.chat_type as ChatType, row.chat_id as string), Date.parse(row.hidden_at as string)]))
}
