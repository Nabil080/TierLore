import { useEffect, useState } from 'react'

// Recording mode: the page goes full screen and keeps only the sheet and the board, for screen captures.
// Leaving full screen (Esc, the browser's own controls) leaves the mode too
export function useRecordingMode() {
  const [recording, setRecording] = useState(false)

  useEffect(() => {
    if (recording && !document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {})
    if (!recording && document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
  }, [recording])

  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setRecording(false)
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  return [recording, setRecording] as const
}
