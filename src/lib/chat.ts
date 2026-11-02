export type ChatThread = {
  id: string
  title: string
  sport: "fish" | "mountain" | "run"
  preview: string
  lastMessageAt: number
  unreadCount: number
  participants: string[]
}

export type ChatMessage = {
  id: string
  sender: string
  text: string
  time: string
  mine: boolean
  type: "message" | "system"
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
