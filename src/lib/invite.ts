// Share the app link with a mate: the phone's share sheet, or copy as a fallback.
export async function inviteMate() {
  const url = window.location.origin
  const text = 'Join me on Count Me In: find a crew for runs, dives, rides and more around Adelaide.'
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Count Me In', text, url })
      return
    }
    await navigator.clipboard.writeText(`${text} ${url}`)
    window.alert('Invite link copied. Paste it in a message to your mate.')
  } catch {
    // Sharing was cancelled.
  }
}
