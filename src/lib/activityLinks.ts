// Activities shared in a chat are sent as a normal message with the activity
// link in it. The chat shows that link as a tappable activity card.

const activityLinkPattern = /(?:https?:\/\/[^\s/]+)?\/activity\/([A-Za-z0-9-]+)\b/

export function activityShareMessage(activityId: string | number) {
  return `${window.location.origin}/activity/${activityId}`
}

// The shared activity id and any text written around the link.
export function parseActivityLink(text: string) {
  const match = text.match(activityLinkPattern)
  if (!match) return null
  return { activityId: match[1], rest: text.replace(match[0], '').trim() }
}

// Chat list previews: "Shared an activity" instead of a long link.
export function previewWithActivityLinks(text: string) {
  const link = parseActivityLink(text)
  if (!link) return text
  return link.rest ? `${link.rest} · Shared an activity` : 'Shared an activity'
}
