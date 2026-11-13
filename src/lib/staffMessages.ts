import { supabase } from './supabase'

// Warnings and messages from the Count Me In team (admins) to a member.
// Pinned at the top of Chats until the member taps "I understand" or replies.

export type StaffMessageKind = 'warning' | 'message'

export type StaffMessage = {
  id: string
  kind: StaffMessageKind
  body: string
  createdAt: string
  acknowledgedAt: string | null
  reply: string | null
  repliedAt: string | null
}

// For admins: the same plus who sent it, and whether (and why) it was revoked.
export type SentStaffMessage = StaffMessage & {
  senderName: string
  revokedAt: string | null
  revokedByName: string | null
  revokeReason: string
}

export const staffMessagePath = (id: string) => `/chats/team/${id}`

// Still needs the member's attention: pinned at the top of Chats.
export const isOpenStaffMessage = (message: StaffMessage) => !message.acknowledgedAt && !message.reply

const needsUpdate = 'Team messages need a database update (SQL 23 and 24 in docs/sql-to-run.md).'

function errorMessage(error: { code?: string; message?: string }) {
  return error.code === 'PGRST202' || error.code === '42P01' || error.code === 'PGRST205' || error.code === '42703' ? needsUpdate : error.message ?? 'Something went wrong.'
}

function fromRow(row: Record<string, string | null>): StaffMessage {
  return {
    id: String(row.id),
    kind: row.kind === 'warning' ? 'warning' : 'message',
    body: row.body ?? '',
    createdAt: row.created_at ?? '',
    acknowledgedAt: row.acknowledged_at,
    reply: row.reply,
    repliedAt: row.replied_at,
  }
}

function notifyChanged() {
  window.dispatchEvent(new Event('count-me-in-chat-unread-changed'))
}

// The signed-in member's own team messages, newest first. Empty before SQL 23.
export async function getMyStaffMessages(): Promise<StaffMessage[]> {
  if (!supabase) return []
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return []
  const { data, error } = await supabase.rpc('my_staff_messages')
  if (error) {
    if (errorMessage(error) === needsUpdate) return []
    throw new Error(errorMessage(error))
  }
  return ((data ?? []) as Array<Record<string, string | null>>).map(fromRow)
}

export async function getOpenStaffMessageCount() {
  return (await getMyStaffMessages()).filter(isOpenStaffMessage).length
}

export async function acknowledgeStaffMessage(id: string) {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  const { error } = await supabase.rpc('acknowledge_staff_message', { target_message_id: id })
  if (error) throw new Error(errorMessage(error))
  notifyChanged()
}

export async function replyToStaffMessage(id: string, reply: string) {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  const { error } = await supabase.rpc('reply_to_staff_message', { target_message_id: id, reply_body: reply })
  if (error) throw new Error(errorMessage(error))
  notifyChanged()
}

// Admin: send a warning or message to a member.
export async function sendStaffMessage(userId: string, kind: StaffMessageKind, body: string) {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  const { error } = await supabase.rpc('send_staff_message', { target_user_id: userId, message_kind: kind, message_body: body })
  if (error) throw new Error(errorMessage(error))
}

// Admin: every team message sent to this member, newest first.
export async function getStaffMessagesForMember(userId: string): Promise<SentStaffMessage[]> {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  const { data, error } = await supabase
    .from('staff_messages')
    .select('id, kind, body, created_at, acknowledged_at, reply, replied_at, sender_id, revoked_at, revoked_by, revoke_reason')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(errorMessage(error))
  const rows = (data ?? []) as Array<Record<string, string | null>>
  const senderIds = [...new Set(rows.flatMap((row) => [row.sender_id, row.revoked_by]).filter((id): id is string => Boolean(id)))]
  const { data: senders } = senderIds.length
    ? await supabase.from('profiles').select('id, first_name').in('id', senderIds)
    : { data: [] }
  const nameById = new Map((senders ?? []).map((sender) => [sender.id, sender.first_name as string]))
  return rows.map((row) => ({
    ...fromRow(row),
    senderName: (row.sender_id && nameById.get(row.sender_id)) || 'Admin',
    revokedAt: row.revoked_at ?? null,
    revokedByName: row.revoked_by ? nameById.get(row.revoked_by) ?? 'Admin' : null,
    revokeReason: row.revoke_reason ?? '',
  }))
}

// Admin: withdraw a warning or message sent by mistake. The member is notified.
export async function revokeStaffMessage(id: string, reason: string) {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  const { error } = await supabase.rpc('revoke_staff_message', { target_message_id: id, reason })
  if (error) {
    if (error.code === 'PGRST202') throw new Error('Revoking needs a database update (SQL 24 in docs/sql-to-run.md).')
    throw new Error(error.message)
  }
}
