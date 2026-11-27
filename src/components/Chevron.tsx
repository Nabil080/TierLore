// Drawn arrow: the ‹ › characters sit off-center in round buttons depending on the font
export function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg className="chevron" viewBox="0 0 24 24" aria-hidden="true">
      <path d={direction === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
    </svg>
  )
}
