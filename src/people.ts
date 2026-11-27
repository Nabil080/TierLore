import { createContext, useContext } from 'react'
import peopleData from './people.json'
import type { Item, Person, TierlistConfig } from './types'

export const people = peopleData as Record<string, Person>

// Where a person is credited: one entry per item, with the credit's label ("Artist", "Japanese voice")
export type Appearance = { list: string; listTitle: string; item: Item; label?: string }

// person id -> every item crediting them, across all the lists of this build
export function indexAppearances(configs: Record<string, TierlistConfig>) {
  const index = new Map<string, { name: string; appearances: Appearance[] }>()
  for (const [list, config] of Object.entries(configs)) {
    for (const item of config.items) {
      for (const section of item.sections ?? []) {
        for (const entry of section.entries) {
          if (!entry.person) continue
          const known = index.get(entry.person) ?? { name: entry.text, appearances: [] }
          known.appearances.push({ list, listTitle: config.title, item, label: entry.label })
          index.set(entry.person, known)
        }
      }
    }
  }
  return index
}

export const PeopleContext = createContext<{ openPerson: (id: string) => void; personOpen: boolean }>({
  openPerson: () => {},
  personOpen: false,
})

export const usePeople = () => useContext(PeopleContext)
