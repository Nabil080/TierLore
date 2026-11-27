import type { MouseEvent } from 'react'
import type { Media } from '../types'
import { Chevron } from './Chevron'

type Props = {
  media: Media[]
  index: number
  onClose: () => void
  onSelect: (index: number) => void
}

export function Lightbox({ media, index, onClose, onSelect }: Props) {
  const current = media[index]
  if (!current) return null
  const count = media.length
  // Wraps around: next on the last image goes back to the first
  const go = (step: number) => (event: MouseEvent) => {
    event.stopPropagation()
    onSelect((index + step + count) % count)
  }

  return (
    <div className="lightbox" onClick={onClose} role="dialog" aria-modal="true">
      <img src={current.src} alt={current.caption ?? ''} onClick={(e) => e.stopPropagation()} />
      {count > 1 && (
        <>
          <button className="lightbox-arrow prev" onClick={go(-1)} aria-label="Previous image"><Chevron direction="left" /></button>
          <button className="lightbox-arrow next" onClick={go(1)} aria-label="Next image"><Chevron direction="right" /></button>
        </>
      )}
      <div className="lightbox-dots" onClick={(e) => e.stopPropagation()}>
        {media.map((m, i) => (
          <button
            key={m.src}
            className={i === index ? 'dot active' : 'dot'}
            onClick={() => onSelect(i)}
            aria-label={`Fit ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
