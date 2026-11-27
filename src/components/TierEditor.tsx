import type { Tier } from '../types'

// Ready-made tier sets, colored from red (top) to purple (bottom)
const TIER_PRESETS: { id: string; labels: string[] }[] = [
  { id: 'sd', labels: ['S', 'A', 'B', 'C', 'D'] },
  { id: 'sf', labels: ['S', 'A', 'B', 'C', 'D', 'E', 'F'] },
  { id: 'ten', labels: ['10', '9', '8', '7', '6', '5', '4', '3', '2', '1'] },
  { id: 'watch', labels: ['Must watch', 'Worth it', 'Meh', 'Skip'] },
  { id: 'goat', labels: ['GOAT', 'Great', 'Good', 'Mid', 'Bad'] },
]

const newTierId = () => `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`

const TIER_RAMP = ['#FF5C77', '#FF9B54', '#FFD35C', '#8FDB6E', '#5EC4F0', '#B9A2FF']

// A template keeps the current rows' ids by position, so items already ranked stay in the same row
const presetTiers = (labels: string[], current: Tier[]): Tier[] => labels.map((label, i) => ({
  id: current[i]?.id ?? newTierId(),
  label,
  color: TIER_RAMP[Math.round((i / Math.max(labels.length - 1, 1)) * (TIER_RAMP.length - 1))],
}))

const randomColor = () => `hsl(${Math.floor(Math.random() * 360)} 70% 72%)`

// <input type="color"> only takes #rrggbb
function toHex(color: string) {
  if (/^#[0-9a-f]{6}$/i.test(color)) return color
  const canvas = document.createElement('canvas').getContext('2d')
  if (!canvas) return '#cccccc'
  canvas.fillStyle = color
  return canvas.fillStyle.startsWith('#') ? canvas.fillStyle : '#cccccc'
}

export function TierEditor({ tiers, onChange }: { tiers: Tier[]; onChange: (tiers: Tier[]) => void }) {
  const update = (index: number, patch: Partial<Tier>) => onChange(tiers.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)))
  const move = (index: number, step: number) => {
    const target = index + step
    if (target < 0 || target >= tiers.length) return
    const next = [...tiers]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <>
      <div className="filter-row">
        <span className="filter-label">Templates</span>
        {TIER_PRESETS.map((preset) => (
          <button key={preset.id} className="info-toggle" onClick={() => onChange(presetTiers(preset.labels, tiers))}>
            {preset.labels.length > 6 ? `${preset.labels[0]} … ${preset.labels[preset.labels.length - 1]}` : preset.labels.join(' / ')}
          </button>
        ))}
      </div>
      <div className="tier-editor">
        {tiers.map((tier, i) => (
          <div key={tier.id} className="tier-edit-row">
            <input type="color" value={toHex(tier.color)} onChange={(e) => update(i, { color: e.target.value })} aria-label="Color" />
            <input className="tier-label-input" style={{ background: tier.color }} value={tier.label} onChange={(e) => update(i, { label: e.target.value })} />
            <button className="icon-button" onClick={() => move(i, -1)} aria-label="Move up">↑</button>
            <button className="icon-button" onClick={() => move(i, 1)} aria-label="Move down">↓</button>
            <button className="icon-button" onClick={() => onChange(tiers.filter((_, j) => j !== i))} disabled={tiers.length <= 1} aria-label="Remove tier">×</button>
          </div>
        ))}
      </div>
      <button className="text-button" onClick={() => onChange([...tiers, { id: newTierId(), label: String.fromCharCode(65 + tiers.length), color: randomColor() }])}>
        + Add a tier
      </button>
    </>
  )
}
