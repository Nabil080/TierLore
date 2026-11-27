import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CharacterSheet } from './components/CharacterSheet'
import { Lightbox } from './components/Lightbox'
import { TierBoard } from './components/TierBoard'
import { LogoMark, Watermark } from './components/Logo'
import { PrototypeBanner } from './components/PrototypeBanner'
import { TierEditor } from './components/TierEditor'
import { exportFontCss } from './exportFonts'
import { coverOf, POOL_ID, type Item, type Tier, type TierlistConfig } from './types'
import { usePeople } from './people'
import { useRecordingMode } from './useRecordingMode'
import { useTierState } from './useTierState'

type Order = { mode: 'list' } | { mode: 'popularity' } | { mode: 'shuffle'; ids: string[] }

function shuffled<T>(array: T[]) {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function orderItems(items: Item[], order: Order) {
  if (order.mode === 'popularity') return [...items].sort((a, b) => (b.popularity ?? -1) - (a.popularity ?? -1))
  if (order.mode === 'shuffle') {
    const rank = new Map(order.ids.map((id, i) => [id, i]))
    // Items added since the shuffle go last
    return [...items].sort((a, b) => (rank.get(a.id) ?? rank.size) - (rank.get(b.id) ?? rank.size))
  }
  return items
}

type Props = {
  config: TierlistConfig
  // Link back to the list picker, only when the build contains several lists
  homeHref?: string
  // Item to jump to (from a person card or a link). token changes on every request
  focus?: { itemId: string; token: number }
}

export function TierlistPage({ config, homeHref, focus }: Props) {
  // The viewer's own tiers (renamed, recolored, reordered while ranking), else the list's
  const tiersKey = `tierlist:${config.title}:tiers`
  const [ownTiers, setOwnTiers] = useState<Tier[] | null>(() => {
    try {
      return JSON.parse(localStorage.getItem(tiersKey) ?? 'null') as Tier[] | null
    } catch {
      return null
    }
  })
  const tiers = ownTiers ?? config.tiers
  const [editingTiers, setEditingTiers] = useState(false)
  const saveTiers = (next: Tier[] | null) => {
    setOwnTiers(next)
    try {
      if (next) localStorage.setItem(tiersKey, JSON.stringify(next))
      else localStorage.removeItem(tiersKey)
    } catch {
      // Remembering them is a convenience
    }
  }
  const { placement, containerOf, move: moveItem, reset } = useTierState({ items: config.items, tiers }, `tierlist:${config.title}`)
  // The last item placed in a tier plays a small "stamp" animation
  const [landedId, setLandedId] = useState<string>()
  const move = useCallback((itemId: string, targetId: string, beforeId?: string) => {
    moveItem(itemId, targetId, beforeId)
    setLandedId(targetId === POOL_ID ? undefined : itemId)
  }, [moveItem])
  const categories = config.categories ?? []
  // Browsing order: the list's own, most popular first (lists with popularity data) or shuffled.
  // Remembered per list; a shuffle keeps its order until shuffled again
  const canSort = config.items.some((item) => item.popularity !== undefined)
  const orderKey = `tierlist:${config.title}:order`
  const [order, setOrder] = useState<Order>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(orderKey) ?? 'null') as Order | null
      return saved && (saved.mode !== 'popularity' || canSort) ? saved : { mode: 'list' }
    } catch {
      return { mode: 'list' }
    }
  })
  const items = useMemo(() => orderItems(config.items, order), [config, order])
  const itemsById = useMemo(() => new Map(config.items.map((item) => [item.id, item])), [config])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [imageIndex, setImageIndex] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const [recording, setRecording] = useRecordingMode()
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const exportRef = useRef<HTMLDivElement>(null)

  const total = items.length
  const current = items[currentIndex]
  const currentTier = tiers.find((tier) => tier.id === containerOf(current.id))

  const goTo = useCallback((index: number) => {
    setCurrentIndex((index + total) % total)
    setImageIndex(0)
  }, [total])

  const selectById = useCallback((id: string) => {
    const index = items.findIndex((item) => item.id === id)
    if (index !== -1) goTo(index)
  }, [items, goTo])

  // Jump to the requested item once per request (React's "adjust state during render" pattern)
  const [appliedFocus, setAppliedFocus] = useState<number>()
  if (focus && focus.token !== appliedFocus) {
    setAppliedFocus(focus.token)
    const index = items.findIndex((item) => item.id === focus.itemId)
    if (index !== -1) {
      setCurrentIndex(index)
      setImageIndex(0)
    }
  }

  const { personOpen } = usePeople()

  // Navigation only (ranking stays on drag and drop): ← → item, ↑ ↓ image, Space zoom, Escape closes the zoom
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // The person card has the keyboard while it's open
      if (personOpen) return
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      const mediaCount = current.media.length
      if (event.key === 'ArrowRight') goTo(currentIndex + 1)
      else if (event.key === 'ArrowLeft') goTo(currentIndex - 1)
      else if (event.key === 'ArrowDown') setImageIndex((i) => (i + 1) % mediaCount)
      else if (event.key === 'ArrowUp') setImageIndex((i) => (i - 1 + mediaCount) % mediaCount)
      // A video has no zoom: the player has its own fullscreen
      else if (event.key === ' ' && current.media[imageIndex]?.kind !== 'video') setZoomed((z) => !z)
      else if (event.key === 'Escape') setZoomed(false)
      else if (event.key.toLowerCase() === 'r' && !event.ctrlKey && !event.metaKey && !event.altKey) setRecording((on) => !on)
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, currentIndex, goTo, imageIndex, personOpen, setRecording])

  useEffect(() => {
    document.title = `${config.title} · TierLore`
  }, [config.title])

  // Prepares the export's fonts while the viewer looks around, so "Export as PNG" starts right away
  useEffect(() => {
    const id = window.setTimeout(() => exportFontCss(), 3000)
    return () => window.clearTimeout(id)
  }, [])

  // Preloads every fit of the current and neighbouring characters, so ← → and ↑ ↓ feel instant
  useEffect(() => {
    for (const step of [0, 1, -1]) {
      for (const media of items[(currentIndex + step + total) % total].media) {
        if (media.kind === 'image') new Image().src = media.src
      }
    }
  }, [items, currentIndex, total])

  // Small distance threshold so a simple click on a chip still selects it
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const onDragStart = (event: DragStartEvent) => setDraggingId(String(event.active.id))

  const onDragEnd = (event: DragEndEvent) => {
    setDraggingId(null)
    const overId = event.over ? String(event.over.id) : null
    if (!overId) return
    const itemId = String(event.active.id)
    if (overId.startsWith('item:')) {
      const beforeId = overId.slice('item:'.length)
      if (beforeId !== itemId) move(itemId, containerOf(beforeId), beforeId)
    } else {
      move(itemId, overId)
    }
  }

  const [exporting, setExporting] = useState(false)
  const exportPng = async () => {
    const node = exportRef.current
    if (!node || exporting) return
    setExporting(true)
    // Lets "Exporting…" show before the heavy work, which runs on the page's thread
    await new Promise((resolve) => setTimeout(resolve, 30))
    // Shows the title, which only belongs in the exported image
    node.classList.add('exporting')
    try {
      const [{ toPng }, fontEmbedCSS] = await Promise.all([import('html-to-image'), exportFontCss()])
      const url = await toPng(node, { pixelRatio: 2, backgroundColor: getComputedStyle(document.body).backgroundColor, fontEmbedCSS })
      const link = document.createElement('a')
      link.download = `${config.title.toLowerCase().replace(/\s+/g, '-')}.png`
      link.href = url
      link.click()
    } catch (error) {
      console.error('PNG export failed', error)
      alert('Export failed: images hosted on other sites block the export. Run scripts/localize-images.mjs to bundle them.')
    } finally {
      node.classList.remove('exporting')
      setExporting(false)
    }
  }

  // Tier label click: places the current item there, then moves on to the next item still to rank
  const placeCurrent = (tierId: string) => {
    move(current.id, tierId)
    const pool = placement[POOL_ID].filter((id) => id !== current.id)
    for (let step = 1; step <= total; step++) {
      const index = (currentIndex + step) % total
      if (pool.includes(items[index].id)) return goTo(index)
    }
  }

  const confirmReset = () => {
    if (confirm('Reset the whole tierlist?')) {
      reset()
      goTo(0)
    }
  }

  const draggingItem = draggingId ? itemsById.get(draggingId) : undefined

  // The items still to rank follow the browsing order too, narrowed by the search
  const [search, setSearch] = useState('')
  const shownPlacement = useMemo(() => {
    const query = search.trim().toLowerCase()
    const rank = new Map(items.map((item, i) => [item.id, i]))
    let pool = order.mode === 'list' ? placement[POOL_ID] : [...placement[POOL_ID]].sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0))
    if (query) pool = pool.filter((id) => itemsById.get(id)?.name.toLowerCase().includes(query))
    return { ...placement, [POOL_ID]: pool }
  }, [placement, items, order.mode, search, itemsById])

  const changeOrder = (mode: Order['mode']) => {
    const next: Order = mode === 'shuffle' ? { mode, ids: shuffled(config.items.map((item) => item.id)) } : { mode }
    setOrder(next)
    try {
      localStorage.setItem(orderKey, JSON.stringify(next))
    } catch {
      // Remembering the order is a convenience
    }
    // Keep showing the same item
    setCurrentIndex(Math.max(0, orderItems(config.items, next).findIndex((item) => item.id === current.id)))
  }

  return (
    <div className={recording ? 'app recording' : 'app'}>
      {recording ? (
        <>
          <button className="recording-exit" onClick={() => setRecording(false)} title="Leave recording mode (R or Esc)">×</button>
          <Watermark />
        </>
      ) : (
      <>
      <PrototypeBanner />
      <header className="topbar">
        <a className="topbar-logo" href={homeHref ?? '#/'} title="All lists" aria-label="All lists"><LogoMark size={26} /></a>
        <div className="topbar-title">
          <h1>{config.title}</h1>
          {config.subtitle && <p>{config.subtitle}</p>}
        </div>
        <div className="topbar-spacer" />
        <div className="topbar-actions">
          <button className="ghost" onClick={() => setEditingTiers(true)}>Tiers</button>
          <button onClick={() => setRecording(true)} title="Full screen with only the sheet and the board, to record with OBS (shortcut: R)">● Record</button>
          <details className="topbar-menu">
            <summary aria-label="More actions" title="More actions">⋯</summary>
            <div className="topbar-menu-list" onClick={(e) => (e.currentTarget.parentElement as HTMLDetailsElement).removeAttribute('open')}>
              <button onClick={exportPng} disabled={exporting}>Export as PNG</button>
              <button onClick={confirmReset}>Reset the ranking</button>
            </div>
          </details>
        </div>
        {exporting && <div className="toast" role="status">Exporting…</div>}
      </header>
      </>
      )}

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDraggingId(null)}>
        <main className="layout">
          <CharacterSheet
            item={current}
            position={currentIndex + 1}
            total={total}
            imageIndex={imageIndex}
            tier={currentTier}
            categories={categories}
            onSelectImage={setImageIndex}
            onZoom={() => setZoomed(true)}
            onPrev={() => goTo(currentIndex - 1)}
            onNext={() => goTo(currentIndex + 1)}
          />
          <TierBoard
            tiers={tiers}
            placement={shownPlacement}
            itemsById={itemsById}
            currentId={current.id}
            onSelect={selectById}
            onPlace={placeCurrent}
            landedId={landedId}
            poolToolbar={(
              <div className="pool-toolbar">
                <input
                  type="search"
                  className="pool-search"
                  placeholder={`Search ${placement[POOL_ID].length} items to rank…`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    // Enter shows the first match on the sheet
                    if (e.key === 'Enter' && shownPlacement[POOL_ID][0]) selectById(shownPlacement[POOL_ID][0])
                    if (e.key === 'Escape') setSearch('')
                  }}
                />
                <div className="order-switch" role="group" aria-label="Order of the items">
                  <button className={order.mode === 'list' ? 'on' : ''} onClick={() => changeOrder('list')}>In order</button>
                  <button
                    className={order.mode === 'popularity' ? 'on' : ''}
                    onClick={() => changeOrder('popularity')}
                    disabled={!canSort}
                    title={canSort ? 'Most popular first (YouTube views)' : 'Coming soon: popularity from AniList favourites'}
                  >Popular</button>
                  <button className={order.mode === 'shuffle' ? 'on' : ''} onClick={() => changeOrder('shuffle')} title="Shuffle again">Shuffle</button>
                </div>
              </div>
            )}
            exportRef={exportRef}
            title={config.title}
          />
        </main>
        <DragOverlay>
          {draggingItem && (
            <div className="chip overlay">
              <img src={coverOf(draggingItem)} alt="" />
              <span className="chip-name">{draggingItem.shortName ?? draggingItem.name}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {editingTiers && (
        <div className="person-overlay" onClick={() => setEditingTiers(false)} role="dialog" aria-modal="true">
          <div className="person-card" onClick={(e) => e.stopPropagation()}>
            <header className="person-header">
              <div>
                <h2>Tiers</h2>
                <p>Rename, recolor, reorder, add or remove rows. Items of a removed row go back to rank.</p>
              </div>
              <button className="person-close" onClick={() => setEditingTiers(false)} aria-label="Close">×</button>
            </header>
            <TierEditor tiers={tiers} onChange={saveTiers} />
            {ownTiers && <button className="text-button" onClick={() => saveTiers(null)}>Back to the default tiers</button>}
          </div>
        </div>
      )}

      {zoomed && (
        <Lightbox media={current.media} index={imageIndex} onClose={() => setZoomed(false)} onSelect={setImageIndex} />
      )}
    </div>
  )
}
