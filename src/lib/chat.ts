import { supabase } from './supabase'

export type ChatThread = {
  id: string
  title: string
  sport: string
  preview: string
  lastMessageAt: number
  unreadCount: number
  participants: string[]
  activityId?: string
}

export type ChatMessage = {
  id: string
  sender: string
  text: string
  time: string
  mine: boolean
  type: "message" | "system"
  createdAt?: string
}

export const chatThreads: ChatThread[] = [
  {
    id: "port-noarlunga-spearfishing",
    title: "Port Noarlunga spearfishing",
    sport: "fish",
    preview:
      "Matt: We are meeting by the southern end of the jetty, at 7:00am.",
    lastMessageAt: Date.now() - 15 * 60 * 1000,
    unreadCount: 2,
    participants: ["Matt", "Jai", "Luca"],
  },
  {
    id: "mount-lofty-hike",
    title: "Mount Lofty hike",
    sport: "mountain",
    preview: "Hamish: Coffee stop after the ridge if everyone is keen.",
    lastMessageAt: Date.now() - 24 * 60 * 60 * 1000,
    unreadCount: 0,
    participants: ["Hamish", "Jai", "Ben"],
  },
  {
    id: "onkaparinga-trail-run",
    title: "Onkaparinga trail run",
    sport: "run",
    preview: "Sam: I can keep the pace steady this morning.",
    lastMessageAt: Date.now() - 48 * 60 * 60 * 1000,
    unreadCount: 0,
    participants: ["Sam", "Jai", "Raj"],
  },
]

export const chatMessagesByThread: Record<string, ChatMessage[]> = {
  "port-noarlunga-spearfishing": [
    {
      id: "m1",
      sender: "Matt",
      text: "Morning all, meet by the southern end of the jetty and we will walk down together.",
      time: "7:02 am",
      mine: false,
      type: "message",
    },
    {
      id: "m2",
      sender: "Jai",
      text: "Perfect, I will be there around 6:55.",
      time: "7:03 am",
      mine: true,
      type: "message",
    },
    {
      id: "m3",
      sender: "Matt",
      text: "Nice, keep an eye on the swell and bring a light layer.",
      time: "7:04 am",
      mine: false,
      type: "message",
    },
    {
      id: "m4",
      sender: "System",
      text: "Luca joined the group.",
      time: "7:05 am",
      mine: false,
      type: "system",
    },
  ],
  "mount-lofty-hike": [
    {
      id: "m5",
      sender: "Hamish",
      text: "Trail looks good. We will start just after sunrise.",
      time: "Sun",
      mine: false,
      type: "message",
    },
    {
      id: "m6",
      sender: "Jai",
      text: "Great, I will bring water and a spare layer.",
      time: "Sun",
      mine: true,
      type: "message",
    },
    {
      id: "m7",
      sender: "System",
      text: "Ben joined the group.",
      time: "Sun",
      mine: false,
      type: "system",
    },
  ],
  "onkaparinga-trail-run": [
    {
      id: "m8",
      sender: "Sam",
      text: "I can keep the pace steady and we can take it easy on the hills.",
      time: "Mon",
      mine: false,
      type: "message",
    },
    {
      id: "m9",
      sender: "Jai",
      text: "Sounds good, I am in.",
      time: "Mon",
      mine: true,
      type: "message",
    },
  ],
}

export function getChatThreads() {
  return [...chatThreads].sort((a, b) => b.lastMessageAt - a.lastMessageAt)
}

export function getChatMessages(threadId: string) {
  return chatMessagesByThread[threadId] ?? []
}

export function getChatThread(threadId: string) {
  return chatThreads.find((thread) => thread.id === threadId)
}

export function hasUnreadChatThreads() {
  return chatThreads.some((thread) => thread.unreadCount > 0)
}

export function markChatRead(threadId: string) {
  const thread = getChatThread(threadId)
  if (thread) thread.unreadCount = 0
}

export function sendChatMessage(threadId: string, text: string) {
  const entry: ChatMessage = {
    id: `local-${Date.now()}`,
    sender: "Jai",
    text,
    time: new Date().toLocaleTimeString("en-AU", {
      hour: "numeric",
      minute: "2-digit",
    }),
    mine: true,
    type: "message",
  }

  const existing = chatMessagesByThread[threadId] ?? []
  chatMessagesByThread[threadId] = [...existing, entry]

  const thread = chatThreads.find((item) => item.id === threadId)
  if (thread) {
    thread.preview = `Jai: ${text}`
    thread.lastMessageAt = Date.now()
    thread.unreadCount = 0
  }

  return entry
}

export async function getChatThreadsForViewer(): Promise<ChatThread[]> {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError?.name === 'AuthSessionMissingError') return getChatThreads()
  if (userError) throw userError
  if (!userData.user) return getChatThreads()

  const userId = userData.user.id
  const { data: memberships, error: membershipsError } = await supabase
    .from('activity_chat_members')
    .select('thread_id')
    .eq('user_id', userId)
    .eq('status', 'accepted')
  if (membershipsError) throw membershipsError
  const threadIds = (memberships ?? []).map((membership) => membership.thread_id)
  if (threadIds.length === 0) return []

  const { data: threadRows, error: threadsError } = await supabase
    .from('activity_chat_threads')
    .select('id, activity_id, title, organiser_id')
    .in('id', threadIds)
  if (threadsError) throw threadsError
  const threads = threadRows ?? []
  if (threads.length === 0) return []

  const activityIds = [...new Set(threads.map((thread) => thread.activity_id))]
  const participantIds = [...new Set(threads.map((thread) => thread.organiser_id))]
  const [activitiesResult, membersResult, readsResult, messagesResult] = await Promise.all([
    supabase.from('activities').select('id, sport_id').in('id', activityIds),
    supabase.from('activity_chat_members').select('thread_id, user_id').in('thread_id', threadIds).eq('status', 'accepted'),
    supabase.from('activity_chat_reads').select('thread_id, last_read_at').eq('user_id', userId).in('thread_id', threadIds),
    supabase.from('activity_chat_messages').select('id, thread_id, sender_id, body, message_type, created_at').in('thread_id', threadIds).order('created_at', { ascending: false }).limit(200),
  ])
  if (activitiesResult.error) throw activitiesResult.error
  if (membersResult.error) throw membersResult.error
  if (readsResult.error) throw readsResult.error
  if (messagesResult.error) throw messagesResult.error

  const activities = activitiesResult.data ?? []
  const sportIds = [...new Set(activities.map((activity) => activity.sport_id))]
  const { data: sports, error: sportsError } = sportIds.length
    ? await supabase.from('sports').select('id, name').in('id', sportIds)
    : { data: [], error: null }
  if (sportsError) throw sportsError

  const memberIds = [...new Set([
    ...participantIds,
    ...(membersResult.data ?? []).map((member) => member.user_id),
  ])]
  const { data: profiles, error: profilesError } = memberIds.length
    ? await supabase.from('profiles').select('id, first_name').in('id', memberIds)
    : { data: [], error: null }
  if (profilesError) throw profilesError

  const activityById = new Map(activities.map((activity) => [activity.id, activity]))
  const sportById = new Map((sports ?? []).map((sport) => [sport.id, sport.name]))
  const nameById = new Map((profiles ?? []).map((profile) => [profile.id, profile.first_name]))
  const readByThread = new Map((readsResult.data ?? []).map((read) => [read.thread_id, read.last_read_at]))
  const latestByThread = new Map<string, NonNullable<typeof messagesResult.data>[number]>()
  for (const message of messagesResult.data ?? []) {
    if (!latestByThread.has(message.thread_id)) latestByThread.set(message.thread_id, message)
  }

  const unreadCounts = await Promise.all(threads.map(async (thread) => {
    const lastReadAt = readByThread.get(thread.id)
    const client = supabase
    if (!client) throw new Error('Supabase is not configured yet.')
    let query = client
      .from('activity_chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('thread_id', thread.id)
      .neq('sender_id', userId)
    if (lastReadAt) query = query.gt('created_at', lastReadAt)
    const { count, error } = await query
    if (error) throw error
    return [thread.id, count ?? 0] as const
  }))
  const unreadByThread = new Map(unreadCounts)

  return threads.map((thread) => {
    const activity = activityById.get(thread.activity_id)
    const latestMessage = latestByThread.get(thread.id)
    const participants = [
      thread.organiser_id,
      ...(membersResult.data ?? [])
        .filter((member) => member.thread_id === thread.id)
        .map((member) => member.user_id),
    ]
    return {
      id: thread.id,
      title: thread.title,
      sport: activity ? sportById.get(activity.sport_id) ?? 'Open activity' : 'Open activity',
      preview: latestMessage
        ? `${latestMessage.message_type === 'system' ? '' : `${nameById.get(latestMessage.sender_id) ?? 'Member'}: `}${latestMessage.body}`
        : 'No messages yet',
      lastMessageAt: latestMessage ? Date.parse(latestMessage.created_at) : 0,
      unreadCount: unreadByThread.get(thread.id) ?? 0,
      participants: [...new Set(participants)].map((participantId) => nameById.get(participantId) ?? 'Member'),
      activityId: thread.activity_id,
    }
  }).sort((left, right) => right.lastMessageAt - left.lastMessageAt)
}

export async function getChatThreadForViewer(threadId: string): Promise<ChatThread | null> {
  const threads = await getChatThreadsForViewer()
  return threads.find((thread) => thread.id === threadId) ?? null
}

export async function getActivityChatThreadId(activityId: string): Promise<string | null> {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData.user) throw new Error('Sign in to open this group chat.')

  const { data, error } = await supabase
    .from('activity_chat_threads')
    .select('id')
    .eq('activity_id', activityId)
    .maybeSingle()
  if (error) throw error
  return data?.id ?? null
}

export async function getSavedChatMessages(threadId: string): Promise<ChatMessage[]> {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData.user) throw new Error('Sign in to open this group chat.')

  const { data: rows, error } = await supabase
    .from('activity_chat_messages')
    .select('id, sender_id, body, message_type, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
  if (error) throw error

  const senderIds = [...new Set((rows ?? []).map((row) => row.sender_id))]
  const { data: profiles, error: profilesError } = senderIds.length
    ? await supabase.from('profiles').select('id, first_name').in('id', senderIds)
    : { data: [], error: null }
  if (profilesError) throw profilesError
  const namesById = new Map((profiles ?? []).map((profile) => [profile.id, profile.first_name]))

  return (rows ?? []).map((row) => ({
    id: row.id,
    sender: namesById.get(row.sender_id) ?? 'Member',
    text: row.body,
    time: new Date(row.created_at).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }),
    mine: row.sender_id === userData.user.id && row.message_type !== 'system',
    type: row.message_type === 'system' ? 'system' : 'message',
    createdAt: row.created_at,
  }))
}

export async function sendSavedChatMessage(threadId: string, text: string) {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  const body = text.trim()
  if (!body || body.length > 2000) throw new Error('Messages must be between 1 and 2000 characters.')
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData.user) throw new Error('Sign in before sending a message.')

  const { error } = await supabase.from('activity_chat_messages').insert({
    thread_id: threadId,
    sender_id: userData.user.id,
    body,
    message_type: 'message',
  })
  if (error) throw error
}

export async function markSavedChatRead(threadId: string) {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData.user) throw new Error('Sign in to open this group chat.')

  const { error } = await supabase.from('activity_chat_reads').upsert({
    thread_id: threadId,
    user_id: userData.user.id,
    last_read_at: new Date().toISOString(),
  }, { onConflict: 'thread_id,user_id' })
  if (error) throw error
  window.dispatchEvent(new Event('count-me-in-chat-unread-changed'))
}

export async function getUnreadChatThreadCount() {
  return (await getChatThreadsForViewer()).filter((thread) => thread.unreadCount > 0).length
}
