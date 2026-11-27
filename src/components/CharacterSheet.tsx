import { useState } from 'react'
import type { Category, Item, Media, Tier } from '../types'
import { Chevron } from './Chevron'
import { InfoPanel } from './InfoPanel'

// Shows the (already cached) thumb right away, then fades the full image in once loaded,
// so switching characters never leaves the previous image on screen
function StageImage({ media, alt }: { media: Media; alt: string }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <>
      {media.thumb && !loaded && <img className="stage-placeholder" src={media.thumb} alt="" />}
      <img
        className={loaded ? 'stage-full loaded' : 'stage-full'}
        src={media.src}
        alt={alt}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />
    </>
  )
}

// The same picture, blurred and darkened, fills the stage around the image or video
function Backdrop({ src }: { src?: string }) {
  return src ? <div className="stage-backdrop" style={{ backgroundImage: `url("${src}")` }} aria-hidden="true" /> : null
}

// "https://youtu.be/ID", "https://www.youtube.com/watch?v=ID&list=..." -> "ID"
function youtubeId(url: string) {
  const match = url.match(/(?:youtu\.be\/|[?&]v=|\/embed\/)([\w-]{11})/)
  return match?.[1]
}

function StageVideo({ media }: { media: Media }) {
  const id = youtubeId(media.src)
  if (!id) return <span>Unsupported video link</span>
  return (
    <iframe
      src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`}
      title={media.caption ?? 'Video'}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      // YouTube refuses to play (error 153) when the embed gets no referrer
      referrerPolicy="strict-origin-when-cross-origin"
    />
  )
}

// Videos: their YouTube view count (popularity), above the other info
const YOUTUBE_CATEGORY = { id: 'youtube', label: 'YouTube' }
const youtubeSection = (item: Item) => (item.popularity !== undefined && item.media.some((m) => m.kind === 'video')
  ? [{ category: 'youtube', entries: [{ label: 'Views', text: item.popularity.toLocaleString('en-US') }] }]
  : [])

type Props = {
  item: Item
  position: number
  total: number
  imageIndex: number
  tier: Tier | undefined
  categories: Category[]
  onSelectImage: (index: number) => void
  onZoom: () => void
  onPrev: () => void
  onNext: () => void
}

export function CharacterSheet(props: Props) {
  const { item, imageIndex, tier } = props
  const media = item.media[imageIndex]

  return (
    <section className="sheet">
      <header className="sheet-header">
        <button className="nav-button" onClick={props.onPrev} aria-label="Previous character"><Chevron direction="left" /></button>
        <div className="sheet-title">
          <span className="sheet-counter">{props.position} / {props.total}</span>
          <h2>{item.name}</h2>
          {item.subtitle && <p className="sheet-subtitle">{item.subtitle}</p>}
        </div>
        {tier && (
          <span className="tier-badge" style={{ background: tier.color }}>{tier.label}</span>
        )}
        <button className="nav-button" onClick={props.onNext} aria-label="Next character"><Chevron direction="right" /></button>
      </header>

      {/* Everything under the header scrolls together, so a long info sheet never squeezes the media */}
      <div className={props.categories.length > 0 ? 'sheet-scroll has-info' : 'sheet-scroll'}>
        {media?.kind === 'video' ? (
          // Not a button: clicks belong to the player. key: a new iframe per item, so the previous one stops
          <div className="sheet-stage video">
            <Backdrop src={media.thumb} />
            <StageVideo key={`${item.id}:${imageIndex}`} media={media} />
          </div>
        ) : (
          <button className="sheet-stage" onClick={props.onZoom} aria-label="Zoom image">
            {/* key: a fresh element per image, so a stale one is never reused */}
            {media && <Backdrop src={media.thumb ?? media.src} />}
            {media ? <StageImage key={media.src} media={media} alt={media.caption ?? item.name} /> : <span>No image</span>}
          </button>
        )}
        {media?.kind === 'video' && (
          <a className="sheet-video-link" href={media.src} target="_blank" rel="noreferrer">Video blocked? Open on YouTube ↗</a>
        )}

        {item.media.length > 1 && (
          <div className="sheet-thumbs">
            {item.media.map((m, i) => (
              <button
                key={m.src}
                className={i === imageIndex ? 'thumb active' : 'thumb'}
                onClick={() => props.onSelectImage(i)}
                aria-label={`Fit ${i + 1}`}
              >
                <img src={m.thumb ?? m.src} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}

        {props.categories.length > 0 && (
          // key: spoilers revealed on one item stay hidden on the next
          <InfoPanel
            key={item.id}
            sections={[...youtubeSection(item), ...(item.sections ?? [])]}
            categories={[YOUTUBE_CATEGORY, ...props.categories]}
          />
        )}
      </div>
    </section>
  )
}
