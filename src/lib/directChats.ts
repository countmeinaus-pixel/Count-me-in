import type { ChatMessage } from './chat'
import { supabase } from './supabase'

// Private 1-on-1 chats between friends (tables direct_chats, direct_messages,
// direct_chat_reads). Text only.

export type DirectChat = {
  id: string
  friendId: string
  friendName: string
  friendPhotoUrl: string | null
  preview: string
  lastMessageAt: number
  unreadCount: number
}

export const directChatPath = (chatId: string) => `/chats/dm/${chatId}`

function notifyUnreadChanged() {
  window.dispatchEvent(new Event('count-me-in-chat-unread-changed'))
}

async function currentUserId() {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  const { data, error } = await supabase.auth.getUser()
  if (error?.name === 'AuthSessionMissingError') return null
  if (error) throw error
  return data.user?.id ?? null
}

// The missing table means SQL 18 has not been run yet: show no private chats instead of an error.
function isMissingTable(error: { code?: string; message?: string }) {
  const message = error.message ?? ''
  return error.code === '42P01' || error.code === 'PGRST205' ||
    (/direct_chats|direct_messages/.test(message) && /not find|does not exist/i.test(message))
}

// Opens the chat with a friend (creates it the first time) and returns its id.
export async function openDirectChat(friendId: string) {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  const { data, error } = await supabase.rpc('open_direct_chat', { target_profile_id: friendId })
  if (error) {
    if (error.code === 'PGRST202' || isMissingTable(error)) {
      throw new Error('Private chats need a database update (SQL 18 in docs/sql-to-run.md).')
    }
    throw error
  }
  return data as string
}

export async function getDirectChatsForViewer(): Promise<DirectChat[]> {
  if (!supabase) return []
  const userId = await currentUserId()
  if (!userId) return []

  const { data: chats, error } = await supabase
    .from('direct_chats')
    .select('id, user_low, user_high, last_message_at')
    .or(`user_low.eq.${userId},user_high.eq.${userId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })
  if (error) {
    if (isMissingTable(error)) return []
    throw error
  }
  const rows = chats ?? []
  if (rows.length === 0) return []

  const chatIds = rows.map((chat) => chat.id)
  const friendIds = rows.map((chat) => (chat.user_low === userId ? chat.user_high : chat.user_low))
  const [profilesResult, readsResult, messagesResult] = await Promise.all([
    supabase.from('profiles').select('id, first_name, photo_url').in('id', friendIds),
    supabase.from('direct_chat_reads').select('chat_id, last_read_at').eq('user_id', userId).in('chat_id', chatIds),
    supabase.from('direct_messages').select('chat_id, sender_id, body, created_at').in('chat_id', chatIds).order('created_at', { ascending: false }).limit(500),
  ])
  if (profilesResult.error) throw profilesResult.error
  if (readsResult.error) throw readsResult.error
  if (messagesResult.error) throw messagesResult.error

  const profileById = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]))
  const readByChat = new Map((readsResult.data ?? []).map((read) => [read.chat_id, Date.parse(read.last_read_at)]))
  const messages = messagesResult.data ?? []

  return rows
    .map((chat) => {
      const friendId = chat.user_low === userId ? chat.user_high : chat.user_low
      const profile = profileById.get(friendId)
      const chatMessages = messages.filter((message) => message.chat_id === chat.id)
      const latest = chatMessages[0]
      const lastRead = readByChat.get(chat.id) ?? 0
      return {
        id: chat.id,
        friendId,
        friendName: profile?.first_name ?? 'Member',
        friendPhotoUrl: profile?.photo_url ?? null,
        preview: latest ? `${latest.sender_id === userId ? 'You: ' : ''}${latest.body}` : 'No messages yet',
        lastMessageAt: latest ? Date.parse(latest.created_at) : 0,
        unreadCount: chatMessages.filter((message) => message.sender_id !== userId && Date.parse(message.created_at) > lastRead).length,
      }
    })
    .sort((left, right) => right.lastMessageAt - left.lastMessageAt)
}

export async function getDirectChat(chatId: string) {
  return (await getDirectChatsForViewer()).find((chat) => chat.id === chatId) ?? null
}

// False when you are no longer friends or one of you blocked the other.
export async function canSendDirectMessage(chatId: string) {
  if (!supabase) return false
  const { data, error } = await supabase.rpc('can_send_direct_message', { target_chat_id: chatId })
  if (error) return false
  return data === true
}

export async function getDirectMessages(chatId: string, friendName: string, friendPhotoUrl: string | null): Promise<ChatMessage[]> {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  const userId = await currentUserId()
  if (!userId) throw new Error('Sign in to open this chat.')
  const { data, error } = await supabase
    .from('direct_messages')
    .select('id, sender_id, body, created_at')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    sender: row.sender_id === userId ? 'You' : friendName,
    senderPhotoUrl: row.sender_id === userId ? null : friendPhotoUrl,
    text: row.body,
    time: new Date(row.created_at).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }),
    mine: row.sender_id === userId,
    type: 'message' as const,
    createdAt: row.created_at,
  }))
}

export async function sendDirectMessage(chatId: string, text: string) {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  const body = text.trim()
  if (!body || body.length > 2000) throw new Error('Messages must be between 1 and 2000 characters.')
  const userId = await currentUserId()
  if (!userId) throw new Error('Sign in before sending a message.')
  const { error } = await supabase.from('direct_messages').insert({ chat_id: chatId, sender_id: userId, body })
  if (error) {
    if (error.code === '42501') throw new Error('You can only message friends. This chat is read-only now.')
    throw error
  }
}

export async function markDirectChatRead(chatId: string) {
  if (!supabase) return
  const userId = await currentUserId()
  if (!userId) return
  const { error } = await supabase.from('direct_chat_reads').upsert(
    { chat_id: chatId, user_id: userId, last_read_at: new Date().toISOString() },
    { onConflict: 'chat_id,user_id' },
  )
  if (error) throw error
  notifyUnreadChanged()
}

export async function getUnreadDirectChatCount() {
  return (await getDirectChatsForViewer()).filter((chat) => chat.unreadCount > 0).length
}
