import { useEffect } from 'react'
import type { Appearance } from '../people'
import { coverOf, type Person } from '../types'

type Props = {
  name: string
  details?: Person
  appearances: Appearance[]
  onOpenItem: (list: string, itemId: string) => void
  onClose: () => void
}

export function PersonCard({ name, details, appearances, onOpenItem, onClose }: Props) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const roles = [...new Set(appearances.map((a) => a.label).filter(Boolean))]

  return (
    <div className="person-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={name}>
      <div className="person-card" onClick={(e) => e.stopPropagation()}>
        <header className="person-header">
          {details?.image && <img className="person-photo" src={details.image} alt="" />}
          <div>
            <h2>{name}</h2>
            {roles.length > 0 && <p>{roles.join(' · ')}</p>}
            {details?.url && <a href={details.url} target="_blank" rel="noreferrer">{details.url.includes('deezer.com') ? 'Listen on Deezer' : 'AniList page'} ↗</a>}
          </div>
          <button className="person-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <h3>In TierLore</h3>
        <div className="person-grid">
          {appearances.map(({ list, listTitle, item }) => {
            const cover = coverOf(item)
            return (
              <button key={`${list}:${item.id}`} className="person-tile" onClick={() => onOpenItem(list, item.id)}>
                {cover && <img src={cover} alt="" />}
                <strong>{item.name}</strong>
                <span>{listTitle}</span>
              </button>
            )
          })}
        </div>

        {details?.roles && details.roles.length > 0 && (
          <>
            <h3>Also known for</h3>
            <div className="person-grid">
              {details.roles.map((role) => {
                const content = (
                  <>
                    <img src={role.image} alt="" />
                    <strong>{role.name}</strong>
                    {role.media && <span>{role.media}</span>}
                  </>
                )
                // Songs open on Deezer; voice actors' roles stay plain tiles
                return role.url
                  ? <a key={role.name} className="person-tile" href={role.url} target="_blank" rel="noreferrer">{content}</a>
                  : <div key={role.name} className="person-tile static">{content}</div>
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
