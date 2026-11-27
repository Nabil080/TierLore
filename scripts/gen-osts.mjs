// Generates the Bleach OST list (src/data/bleach-osts.json) from the track export of the official
// albums (TV OST 1-4, TYBW OST 1-2, in album order): one card per track with its YouTube video, a card
// image made from the album art (YouTube thumbnail) with the album and track number on it.
// `views` (YouTube views, summed over the official uploads) becomes the item's popularity ("Most popular").
//
// Usage: node scripts/gen-osts.mjs <bleach-ost-tracks.json>

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const LIST = 'bleach-osts'
const DIR = `public/images/${LIST}`
const FONT = 'scripts/fonts/DelaGothicOne-Regular.ttf'
// Album art only: the site shows "OST 2 · 08" in a corner tag and the name over the picture (--labels to draw them in)
const PLAIN = !process.argv.includes('--labels')
const BROWSER = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'

// "TV OST 1 (2005)" -> "OST 1", "TYBW OST 2" -> "TYBW 2"
const shortAlbum = (album) => album.replace(/\s*\(\d{4}\)/, '').replace(/^TV /, '').replace('TYBW OST', 'TYBW')
// Composer of the soundtrack unless the export names another artist
const artistName = (artist) => (artist ?? 'Shiro Sagisu').replace(/ - Topic$/, '')
const slug = (text) => text.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-')
const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;')

async function thumbnail(videoId) {
  for (const size of ['maxresdefault', 'hqdefault']) {
    const response = await fetch(`https://i.ytimg.com/vi/${videoId}/${size}.jpg`, { headers: { 'user-agent': BROWSER } })
    if (response.ok) return Buffer.from(await response.arrayBuffer())
  }
  return null
}

// Text in Dela Gothic One with a dark outline, like the OP/ED cards
async function label(text, color, size) {
  const render = (fill) => sharp({ text: { text: `<span foreground="${fill}">${escape(text)}</span>`, font: `Dela Gothic One ${size}`, fontfile: FONT, rgba: true, dpi: 72 } }).png().toBuffer()
  const front = await render(color)
  const ink = await render('#0F0E17')
  const { width, height } = await sharp(front).metadata()
  const pad = 7
  const outline = []
  for (let dx = -pad; dx <= pad; dx += 7) for (let dy = -pad; dy <= pad; dy += 7) outline.push({ input: ink, left: pad + dx, top: pad + dy })
  return sharp({ create: { width: width + pad * 2, height: height + pad * 2, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([...outline, { input: front, left: pad, top: pad }]).png().toBuffer()
}

const SHADE = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">
  <defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0F0E17" stop-opacity="0.85"/><stop offset="0.3" stop-color="#0F0E17" stop-opacity="0"/>
  <stop offset="0.7" stop-color="#0F0E17" stop-opacity="0"/><stop offset="1" stop-color="#0F0E17" stop-opacity="0.85"/></linearGradient></defs>
  <rect width="640" height="360" fill="url(#f)"/></svg>`)

// Centered and kept within the middle 340 px, which the square-ish chips don't crop
async function centered(image, top) {
  let { width } = await sharp(image).metadata()
  const input = width > 340 ? await sharp(image).resize(340).toBuffer() : image
  width = Math.min(width, 340)
  return { input, left: Math.round((640 - width) / 2), top }
}

// 640x360: the album art (square, center of the thumbnail) on a blurred copy of itself, album and track below
async function card(videoId, album, track) {
  const image = await thumbnail(videoId)
  let art
  if (image) {
    const { width, height } = await sharp(image).metadata()
    const side = Math.min(width, height)
    art = await sharp(image).extract({ left: Math.round((width - side) / 2), top: Math.round((height - side) / 2), width: side, height: side }).toBuffer()
  } else {
    art = await sharp({ create: { width: 360, height: 360, channels: 3, background: '#1A1824' } }).png().toBuffer()
  }
  const background = await sharp(art).resize(640, 360, { fit: 'cover' }).blur(18).modulate({ brightness: 0.55 }).toBuffer()
  // The album art in full height: the square middle is what the chips keep
  const front = await sharp(art).resize(360, 360).toBuffer()
  // Album name at the top in pink, track number at the bottom in white
  const albumLabel = await label(album, '#FF4D94', 64)
  const trackLabel = await label(`#${track}`, '#F3F0FA', 64)
  const trackHeight = (await sharp(trackLabel).metadata()).height
  return sharp(background)
    .composite(PLAIN
      ? [{ input: front, left: 140, top: 0 }]
      : [{ input: front, left: 140, top: 0 }, { input: SHADE }, await centered(albumLabel, 4), await centered(trackLabel, 360 - trackHeight - 4)])
    .webp({ quality: 82 })
}

const source = process.argv[2]
if (!source) throw new Error('Usage: node scripts/gen-osts.mjs <bleach-ost-tracks.json>')
// Tracks marked playable: false have no working upload on YouTube: left out
const tracks = JSON.parse(await readFile(source, 'utf8')).tracks.filter((track) => track.playable !== false)
await mkdir(DIR, { recursive: true })

const items = []
for (const [index, track] of tracks.entries()) {
  const album = shortAlbum(track.album)
  const id = `ost${String(index + 1).padStart(3, '0')}`
  const badge = `${album} · ${String(track.track).padStart(2, '0')}`
  const artist = artistName(track.artist)
  process.stdout.write(`${id} ${badge} ${track.title}\n`)
  await (await card(track.videoId, album, String(track.track).padStart(2, '0'))).toFile(`${DIR}/${id}-thumb.webp`)
  items.push({
    id,
    name: track.title,
    shortName: track.title,
    tag: `${album.replace(' ', '')}·${String(track.track).padStart(2, '0')}`,
    subtitle: [artist, `${track.album}, track ${track.track}`, track.duration].filter(Boolean).join(' · '),
    ...(typeof track.views === 'number' && { popularity: track.views }),
    // Every official upload of the track, whose views were added up
    ...(track.uploads?.length > 1 && { popularityVideos: track.uploads.map((upload) => upload.videoId) }),
    media: [{ kind: 'video', src: `https://youtu.be/${track.videoId}`, thumb: `/images/${LIST}/${id}-thumb.webp`, caption: `${track.title} by ${artist}` }],
    sections: [
      { category: 'credits', entries: [{ label: 'Artist', text: artist, person: `artist-${slug(artist)}` }] },
    ],
  })
}

const list = {
  universe: 'Bleach',
  title: 'Bleach OST',
  subtitle: 'TV OST 1-4 + Thousand-Year Blood War OST 1-2',
  categories: [
    { id: 'facts', label: 'Fun facts' },
    { id: 'credits', label: 'Credits' },
  ],
  tiers: [
    { id: 'S', label: 'S', color: '#FF5C77' },
    { id: 'A', label: 'A', color: '#FF9B54' },
    { id: 'B', label: 'B', color: '#FFD35C' },
    { id: 'C', label: 'C', color: '#8FDB6E' },
    { id: 'D', label: 'D', color: '#5EC4F0' },
  ],
  items,
}
await writeFile(`src/data/${LIST}.json`, JSON.stringify(list, null, 1) + '\n')
console.log(`${items.length} tracks -> src/data/${LIST}.json`)
