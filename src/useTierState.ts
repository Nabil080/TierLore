import { useCallback, useEffect, useMemo, useState } from 'react'
import { POOL_ID, type Placement, type TierlistConfig } from './types'

type Rankable = Pick<TierlistConfig, 'items' | 'tiers'>

function initialPlacement(config: Rankable): Placement {
  const placement: Placement = { [POOL_ID]: config.items.map((item) => item.id) }
  for (const tier of config.tiers) placement[tier.id] = []
  return placement
}

// Drops unknown ids and re-adds missing ones, so a stale save survives data edits
function sanitize(saved: Placement, config: Rankable): Placement {
  const fresh = initialPlacement(config)
  const known = new Set(config.items.map((item) => item.id))
  const seen = new Set<string>()
  const result: Placement = {}
  for (const containerId of Object.keys(fresh)) {
    result[containerId] = (saved[containerId] ?? []).filter((id) => {
      if (!known.has(id) || seen.has(id)) return false
      seen.add(id)
      return true
    })
  }
  for (const id of fresh[POOL_ID]) if (!seen.has(id)) result[POOL_ID].push(id)
  return result
}

function load(key: string, config: Rankable): Placement {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return sanitize(JSON.parse(raw) as Placement, config)
  } catch {
    // Storage unavailable or corrupted: start fresh
  }
  return initialPlacement(config)
}

export function useTierState(config: Rankable, storageKey: string) {
  const [saved, setPlacement] = useState<Placement>(() => load(storageKey, config))
  // Fitted to the current tiers, which the viewer can edit: a removed tier's items go back to rank
  const tierIds = config.tiers.map((tier) => tier.id).join()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const placement = useMemo(() => sanitize(saved, config), [saved, tierIds])

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(placement))
    } catch {
      // Ignore: saving is a convenience, not a requirement
    }
  }, [placement, storageKey])

  const containerOf = useCallback(
    (itemId: string) => Object.keys(placement).find((id) => placement[id].includes(itemId)) ?? POOL_ID,
    [placement],
  )

  // Moves an item into a container, before `beforeId` when given, else at the end
  const move = useCallback((itemId: string, targetId: string, beforeId?: string) => {
    setPlacement((prev) => {
      const next: Placement = {}
      for (const [id, list] of Object.entries(prev)) next[id] = list.filter((x) => x !== itemId)
      const target = next[targetId] ?? []
      const index = beforeId ? target.indexOf(beforeId) : -1
      if (index === -1) target.push(itemId)
      else target.splice(index, 0, itemId)
      next[targetId] = target
      return next
    })
  }, [])

  const reset = useCallback(() => setPlacement(initialPlacement(config)), [config])

  return { placement, containerOf, move, reset }
}
