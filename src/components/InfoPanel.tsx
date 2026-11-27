import { useState } from 'react'
import { usePeople } from '../people'
import type { Category, Entry, Section, Spoiler } from '../types'

// "Soul Society arc · Major spoiler", or just "Minor spoiler" when no arc is tied to it
function spoilerLabel(spoiler: Spoiler) {
  const severity = spoiler.severity === 'major' ? 'Major spoiler' : 'Minor spoiler'
  return spoiler.segment ? `${spoiler.segment} · ${severity}` : severity
}

// Each entry is revealed on its own: minor ones are blurred until clicked, major ones are hidden
// behind a button so they can't be read by accident
function EntryView({ entry }: { entry: Entry }) {
  const [revealed, setRevealed] = useState(!entry.spoiler)
  const { openPerson } = usePeople()
  const spoiler = entry.spoiler

  let content
  if (!revealed && spoiler?.severity === 'major') {
    content = (
      <button className="spoiler-gate" onClick={() => setRevealed(true)}>
        Hidden · click to show
      </button>
    )
  } else {
    content = (
      <span
        className={revealed ? 'entry-text' : 'entry-text blurred'}
        onClick={() => setRevealed(true)}
        title={revealed ? undefined : 'Click to reveal'}
      >
        {/* No link while blurred: the first click only reveals */}
        {!revealed ? entry.text
          : entry.person ? <button className="person-link" onClick={() => openPerson(entry.person!)}>{entry.text}</button>
          : entry.url ? <a href={entry.url} target="_blank" rel="noreferrer">{entry.text}</a>
          : entry.text}
      </span>
    )
  }

  return (
    <li className={entry.label ? 'entry labeled' : 'entry'}>
      {entry.label && <span className="entry-label">{entry.label}</span>}
      <div className="entry-value">
        {spoiler && <span className={`spoiler-tag ${spoiler.severity}`}>{spoilerLabel(spoiler)}</span>}
        {content}
      </div>
    </li>
  )
}

type Props = {
  sections: Section[]
  categories: Category[]
}

// Every category this item has info for, in the list's order
export function InfoPanel({ sections, categories }: Props) {
  const available = categories.flatMap((category) => {
    const section = sections.find((s) => s.category === category.id)
    return section?.entries.length ? [{ category, entries: section.entries }] : []
  })
  if (available.length === 0) return null

  return (
    <div className="info">
      {available.map(({ category, entries }) => (
        <article key={category.id} className="info-section">
          <h3>{category.label}</h3>
          <ul className="entries">
            {entries.map((entry, i) => <EntryView key={i} entry={entry} />)}
          </ul>
        </article>
      ))}
    </div>
  )
}
