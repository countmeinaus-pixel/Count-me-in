// Keeps form fields visible above the on-screen keyboard on phones.
// The keyboard height is published as --keyboard-inset, so pages get extra room
// at the bottom to scroll into, and the focused field is scrolled to the middle
// of the visible area once the keyboard has opened.

function isTextField(element: Element | null): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false
  if (element instanceof HTMLTextAreaElement || element.isContentEditable) return true
  return element instanceof HTMLInputElement &&
    !['button', 'checkbox', 'radio', 'range', 'submit', 'file', 'color'].includes(element.type)
}

export function keepFieldsAboveKeyboard() {
  const viewport = window.visualViewport
  if (!viewport) return

  const root = document.documentElement
  let scrollTimer = 0

  function revealFocusedField() {
    const field = document.activeElement
    if (!isTextField(field)) return
    window.clearTimeout(scrollTimer)
    // Wait for the keyboard animation before measuring.
    scrollTimer = window.setTimeout(() => {
      const box = field.getBoundingClientRect()
      const visibleTop = viewport!.offsetTop
      const visibleBottom = viewport!.offsetTop + viewport!.height
      if (box.top < visibleTop + 16 || box.bottom > visibleBottom - 16) {
        field.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    }, 250)
  }

  function updateInset() {
    const inset = Math.max(0, window.innerHeight - viewport!.height - viewport!.offsetTop)
    root.style.setProperty('--keyboard-inset', `${Math.round(inset)}px`)
    if (inset > 0) revealFocusedField()
  }

  viewport.addEventListener('resize', updateInset)
  viewport.addEventListener('scroll', updateInset)
  document.addEventListener('focusin', revealFocusedField)
  updateInset()
}
