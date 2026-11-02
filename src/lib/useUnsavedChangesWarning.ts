import { useEffect } from 'react'
import { useBeforeUnload, useBlocker } from 'react-router-dom'

export function useUnsavedChangesWarning(shouldWarn: boolean) {
  const blocker = useBlocker(shouldWarn)

  useBeforeUnload((event) => {
    if (!shouldWarn) return
    event.preventDefault()
    event.returnValue = ''
  })

  useEffect(() => {
    if (blocker.state !== 'blocked') return

    if (window.confirm('Discard changes?')) {
      blocker.proceed()
    } else {
      blocker.reset()
    }
  }, [blocker])
}
