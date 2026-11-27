export type Media = {
  kind: 'image' | 'video'
  // For a video, src is a YouTube URL and thumb a local image (chips and PNG export need local images)
  src: string
  thumb?: string
  caption?: string | null
}

export type Item = {
  id: string
  name: string
  // Shown on tierlist chips, where the full name doesn't fit
  shortName?: string
  // Corner tag on the chip ("OST 2 · 08"); openings and endings get "OP 2" / "ED 6" from their id
  tag?: string
  // Small square-ish picture for tier chips and cards; defaults to the first media's thumb
  cover?: string
  // Line under the name on the sheet (e.g. artist and episodes for an opening)
  subtitle?: string
  media: Media[]
  // Info sheet under the main media, one block per section
  sections?: Section[]
  // YouTube views, used by the "Popular" order
  popularity?: number
  // When a track has several official uploads: the videos whose views were added up
  popularityVideos?: string[]
}

// A heading of the info sheet ("Fun facts", "Credits"), shared by every item of a list
export type Category = {
  id: string
  label: string
}

// minor: blurred, one click to read. major: hidden until confirmed
export type Spoiler = {
  severity: 'minor' | 'major'
  // When it's revealed in the story ("S2", "Soul Society arc"), if tied to one
  segment?: string
}

// One piece of info, revealed on its own. With a label it's a "label: value" row, else a sentence
export type Entry = {
  label?: string
  text: string
  // Makes the text a link, opened in a new tab
  url?: string
  // Makes the text open this person's card (their other items in TierLore): "artist-aqua-timez",
  // "anilist-staff-95205"... Same id in every list, so the card gathers everything they're credited on
  person?: string
  spoiler?: Spoiler
}

export type Section = {
  category: string
  entries: Entry[]
}

export type Tier = {
  id: string
  label: string
  color: string
}

export type TierlistConfig = {
  // Anime it belongs to ("Bleach"): lists are grouped by it on the home page
  universe?: string
  title: string
  subtitle?: string
  // Order and labels of the info sheet headings
  categories?: Category[]
  tiers: Tier[]
  items: Item[]
}

// Extra details on a credited person, from src/people.json (voice actors for now)
export type Person = {
  name: string
  image?: string
  url?: string
  // Best-known roles outside TierLore
  roles?: { name: string; image: string; media: string | null; url?: string }[]
}

// Picture used for an item on chips, cards and tiles
export const coverOf = (item: Item) => item.cover ?? item.media[0]?.thumb ?? item.media[0]?.src

export const POOL_ID = 'pool'

// Container id (tier id or POOL_ID) -> ordered item ids
export type Placement = Record<string, string[]>
