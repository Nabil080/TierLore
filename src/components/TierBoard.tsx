import { useDraggable, useDroppable } from '@dnd-kit/core'
import type { CSSProperties, ReactNode, Ref } from 'react'
import { coverOf, POOL_ID, type Item, type Placement, type Tier } from '../types'

type ChipProps = {
  landed?: boolean
  item: Item
  current: boolean
  onSelect: (id: string) => void
}

export function Chip({ item, current, landed, onSelect }: ChipProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id })
  const { setNodeRef: setDropRef } = useDroppable({ id: `item:${item.id}` })
  const cover = coverOf(item)
  // Openings and endings get an "OP 2" / "ED 6" corner tag from their id
  const [, kind, number] = item.id.match(/^(op|ed)0*(\d+)$/i) ?? []
  const tag = item.tag ?? (kind && `${kind.toUpperCase()} ${number}`)

  return (
    <div
      ref={(node) => {
        setNodeRef(node)
        setDropRef(node)
      }}
      className={`chip${current ? ' current' : ''}${isDragging ? ' dragging' : ''}${landed ? ' landed' : ''}`}
      onClick={() => onSelect(item.id)}
      title={item.name}
      {...attributes}
      {...listeners}
    >
      {cover && <img src={cover} alt="" draggable={false} />}
      <span className="chip-name">{item.shortName ?? item.name}</span>
      {tag && <span className={kind?.toLowerCase() === 'ed' ? 'chip-tag ending' : 'chip-tag'}>{tag}</span>}
    </div>
  )
}

type RowProps = {
  id: string
  label: string
  color?: string
  itemIds: string[]
  itemsById: Map<string, Item>
  currentId: string
  landedId?: string
  onSelect: (id: string) => void
  // Clicking the label places the current item in this row
  onPlace?: (rowId: string) => void
}

// Short labels stay big ("S"), longer ones shrink and wrap ("Must watch", "GOAT")
const labelSize = (label: string) => (label.length <= 2 ? '' : label.length <= 5 ? ' medium' : ' long')

function Row({ id, label, color, itemIds, itemsById, currentId, landedId, onSelect, onPlace }: RowProps) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const labelClass = `row-label${id === POOL_ID ? '' : labelSize(label)}`
  const style = color ? { background: color } : undefined

  return (
    // --tier: the row's color, for its glow when an item is dragged over it
    <div className={id === POOL_ID ? 'row pool' : 'row'} style={color ? { '--tier': color } as CSSProperties : undefined}>
      {onPlace && id !== POOL_ID
        ? <button className={`${labelClass} placeable`} style={style} onClick={() => onPlace(id)} title={`Place the current item in ${label}`}>{label}</button>
        : <div className={labelClass} style={style}>{label}</div>}
      <div ref={setNodeRef} className={isOver ? 'row-items over' : 'row-items'}>
        {itemIds.map((itemId) => {
          const item = itemsById.get(itemId)
          return item && (
            <Chip key={itemId} item={item} current={itemId === currentId} landed={itemId === landedId && id !== POOL_ID} onSelect={onSelect} />
          )
        })}
      </div>
    </div>
  )
}

type BoardProps = {
  tiers: Tier[]
  placement: Placement
  itemsById: Map<string, Item>
  currentId: string
  landedId?: string
  onSelect: (id: string) => void
  onPlace?: (rowId: string) => void
  // Search and order controls, between the tiers and the items to rank
  poolToolbar?: ReactNode
  exportRef: Ref<HTMLDivElement>
  title: string
}

export function TierBoard({ tiers, placement, itemsById, currentId, landedId, onSelect, onPlace, poolToolbar, exportRef, title }: BoardProps) {
  // The label column fits the longest tier name, the same width for every row
  const longest = Math.max(...tiers.map((tier) => tier.label.length), 1)
  const labelWidth = longest <= 2 ? 72 : longest <= 5 ? 88 : 112
  return (
    // Tiers and items to rank scroll separately, so both stay reachable however many there are
    <section className="board" style={{ '--label-width': `${labelWidth}px` } as CSSProperties}>
      <div className="board-scroll">
      <div ref={exportRef} className="board-tiers">
        <div className="board-export-title">{title}</div>
        {tiers.map((tier) => (
          <Row
            key={tier.id}
            id={tier.id}
            label={tier.label}
            color={tier.color}
            itemIds={placement[tier.id] ?? []}
            itemsById={itemsById}
            currentId={currentId}
            landedId={landedId}
            onSelect={onSelect}
            onPlace={onPlace}
          />
        ))}
      </div>
      </div>
      {poolToolbar}
      <div className="board-pool">
      <Row
        id={POOL_ID}
        label="To rank"
        itemIds={placement[POOL_ID]}
        itemsById={itemsById}
        currentId={currentId}
        onSelect={onSelect}
      />
      </div>
    </section>
  )
}
