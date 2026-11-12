// Inviting a mate: free share links only (no APIs, no keys).

export const inviteText = 'Join me on Count Me In: find a crew for runs, dives, rides and more near you.'

export function getInviteUrl() {
  return window.location.origin
}

// Opens WhatsApp (app or web) with the message filled in.
export function getWhatsAppUrl() {
  return `https://wa.me/?text=${encodeURIComponent(`${inviteText} ${getInviteUrl()}`)}`
}

// Messenger's share link only works in the phone app; on a computer it needs
// a Facebook developer account, so the button is only shown on phones.
export function getMessengerUrl() {
  return `fb-messenger://share/?link=${encodeURIComponent(getInviteUrl())}`
}

export function isPhone() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

export function canUseShareSheet() {
  return typeof navigator.share === 'function'
}

export async function copyInvite() {
  await navigator.clipboard.writeText(`${inviteText} ${getInviteUrl()}`)
}

// The device's own share menu (AirDrop, Messages, Instagram on phones, ...).
export async function openShareSheet() {
  try {
    await navigator.share({ title: 'Count Me In', text: inviteText, url: getInviteUrl() })
  } catch {
    // Sharing was cancelled.
  }
}
