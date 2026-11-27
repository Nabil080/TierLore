import { useCallback, useEffect, useMemo, useState } from 'react'
import datasets from 'virtual:datasets'
import { Logo } from './components/Logo'
import { PersonCard } from './components/PersonCard'
import { PrototypeBanner } from './components/PrototypeBanner'
import { indexAppearances, PeopleContext, people } from './people'
import { TierlistPage } from './TierlistPage'
import { coverOf, POOL_ID, type Placement, type TierlistConfig } from './types'

const configs = datasets as Record<string, TierlistConfig>
const names = Object.keys(configs)
const appearances = indexAppearances(configs)
const year = new Date().getFullYear()

// How many items of a list the viewer has placed in a tier (saved ranking, see useTierState)
function rankedCount(config: TierlistConfig) {
  try {
    const saved = JSON.parse(localStorage.getItem(`tierlist:${config.title}`) ?? 'null') as Placement | null
    if (!saved) return 0
    const known = new Set(config.items.map((item) => item.id))
    return new Set(Object.entries(saved).filter(([id]) => id !== POOL_ID).flatMap(([, ids]) => ids).filter((id) => known.has(id))).size
  } catch {
    return 0
  }
}

// Key visual shown behind each anime's name on the home page
const BANNERS: Record<string, string> = {
  Bleach: './banners/bleach.webp',
  'Demon Slayer': './banners/demon-slayer.webp',
}

// Lists grouped by anime, in the build's order
const groups = names.reduce<[string, string[]][]>((all, name) => {
  const universe = configs[name].universe ?? 'Other'
  const group = all.find(([u]) => u === universe)
  if (group) group[1].push(name)
  else all.push([universe, [name]])
  return all
}, [])

// "#/demon-slayer" -> ["demon-slayer"], "#/bleach-openings/op06" -> ["bleach-openings", "op06"]
const readHash = () => decodeURIComponent(window.location.hash.replace(/^#\/?/, '')).split('/')

export default function App() {
  const [[route, itemFromHash], setRoute] = useState(readHash)
  // Item to show once the list is open. token: re-applies when asking again for the same item
  const [focus, setFocus] = useState(() => itemFromHash ? { itemId: itemFromHash, token: 0 } : undefined)
  const [personId, setPersonId] = useState<string | null>(null)

  useEffect(() => {
    const onHashChange = () => {
      const [list, item] = readHash()
      setRoute([list])
      if (!item) return
      setFocus((prev) => ({ itemId: item, token: (prev?.token ?? 0) + 1 }))
      history.replaceState(null, '', `#/${list}`)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // The item part of the hash is only an instruction: once read, the URL goes back to the list's
  useEffect(() => {
    if (itemFromHash) history.replaceState(null, '', `#/${route}`)
  }, [route, itemFromHash])

  const openItem = useCallback((list: string, itemId: string) => {
    setPersonId(null)
    setRoute([list])
    setFocus((prev) => ({ itemId, token: (prev?.token ?? 0) + 1 }))
    history.replaceState(null, '', `#/${list}`)
  }, [])

  const closePerson = useCallback(() => setPersonId(null), [])
  const peopleContext = useMemo(() => ({ openPerson: setPersonId, personOpen: personId !== null }), [personId])
  const person = personId ? appearances.get(personId) : undefined

  // A build with a single list skips the home page
  const name = names.length === 1 ? names[0] : route
  const config = configs[name]

  return (
    <PeopleContext.Provider value={peopleContext}>
      {config ? (
        // key: remount so placement, current character, etc. never leak between lists
        <TierlistPage key={name} config={config} homeHref={names.length > 1 ? '#/' : undefined} focus={focus} />
      ) : (
        <>
        <PrototypeBanner />
        <div className="home">
          <h1><Logo size={44} /></h1>
          <p className="home-tagline">Tier lists with the context built in. Pick a list and rank.</p>
          {groups.map(([universe, lists]) => (
            <section key={universe} className="home-universe">
              <div className="home-banner" style={BANNERS[universe] ? { backgroundImage: `url("${BANNERS[universe]}")` } : undefined}>
                <h2>{universe}</h2>
              </div>
              <div className="home-list">
                {lists.map((n) => {
                  const total = configs[n].items.length
                  const ranked = rankedCount(configs[n])
                  return (
                    <a key={n} className="home-card" href={`#/${n}`}>
                      {configs[n].items[0] && <img src={coverOf(configs[n].items[0])} alt="" />}
                      <strong>{configs[n].title.replace(`${universe} `, '')}</strong>
                      <span>{ranked === 0 ? `${total} items` : ranked === total ? `All ${total} ranked` : `${ranked} / ${total} ranked`}</span>
                      <div className={ranked === total ? 'home-progress done' : 'home-progress'} role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={ranked}>
                        <div style={{ width: `${(ranked / total) * 100}%` }} />
                      </div>
                    </a>
                  )
                })}
              </div>
            </section>
          ))}
          <footer className="site-footer">
            <p>© {year} <a href="https://kozuma.studio" target="_blank" rel="noreferrer">Kozuma</a> · TierLore</p>
            <p>Fan project, not affiliated with the rights holders. Characters, artwork, music and videos belong to their respective owners.</p>
          </footer>
        </div>
        </>
      )}
      {personId && person && (
        <PersonCard
          name={person.name}
          details={people[personId]}
          appearances={person.appearances}
          onOpenItem={openItem}
          onClose={closePerson}
        />
      )}
    </PeopleContext.Provider>
  )
}
