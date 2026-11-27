// Redraws the opening / ending card images (public/images/<list>/<id>-thumb.webp): the video's
// YouTube thumbnail, a dark fade at the bottom and "OP 3" / "ED 12" in Dela Gothic One.
// Keeps the lists' JSON as it is (ids, videos, info).
//
// Usage: node scripts/redraw-song-cards.mjs [--plain]

import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

// --plain: no "OP 3" badge, the thumbnail only
const PLAIN = process.argv.includes('--plain')
const LISTS = ['bleach-openings', 'bleach-endings', 'demon-slayer-openings']
const COLORS = { OP: '#FF4D94', ED: '#F3F0FA' }
const FONT = 'scripts/fonts/DelaGothicOne-Regular.ttf'
const CACHE_DIR = 'node_modules/.cache/yt-thumbs'

const youtubeId = (url) => url.match(/(?:youtu\.be\/|[?&]v=|\/embed\/)([\w-]{11})/)?.[1]

async function thumbnail(url) {
  const id = youtubeId(url)
  if (!id) return null
  const file = `${CACHE_DIR}/${id}.jpg`
  if (existsSync(file)) return readFile(file)
  for (const size of ['maxresdefault', 'sddefault', 'hqdefault']) {
    const response = await fetch(`https://i.ytimg.com/vi/${id}/${size}.jpg`)
    if (!response.ok) continue
    const buffer = Buffer.from(await response.arrayBuffer())
    await mkdir(CACHE_DIR, { recursive: true })
    await writeFile(file, buffer)
    return buffer
  }
  return null
}

// "OP 3" in Dela Gothic One, ink outline so it reads on any thumbnail
async function label(text, color) {
  const render = (fill) => sharp({ text: { text: `<span foreground="${fill}">${text}</span>`, font: 'Dela Gothic One 150', fontfile: FONT, rgba: true, dpi: 72 } }).png().toBuffer()
  const front = await render(color)
  const { width, height } = await sharp(front).metadata()
  const pad = 10
  // Outline: the ink version, spread around the colored one
  const ink = await render('#0F0E17')
  const outline = []
  for (let dx = -pad; dx <= pad; dx += 5) for (let dy = -pad; dy <= pad; dy += 5) outline.push({ input: ink, left: pad + dx, top: pad + dy })
  return sharp({ create: { width: width + pad * 2, height: height + pad * 2, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([...outline, { input: front, left: pad, top: pad }]).png().toBuffer()
}

const fade = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
  <defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0.4" stop-color="#0F0E17" stop-opacity="0"/><stop offset="1" stop-color="#0F0E17" stop-opacity="0.9"/></linearGradient></defs>
  <rect width="1280" height="720" fill="url(#f)"/></svg>`)

for (const list of LISTS) {
  const { items } = JSON.parse(await readFile(`src/data/${list}.json`, 'utf8'))
  for (const item of items) {
    const [, tag, number] = item.id.match(/^(op|ed)0*(\d+)$/i) ?? []
    if (!tag) continue
    const text = `${tag.toUpperCase()} ${number}`
    const video = item.media.find((m) => m.kind === 'video')?.src
    const image = video && await thumbnail(video)
    const base = image
      ? await sharp(image).resize(1280, 720, { fit: 'cover' }).toBuffer()
      : await sharp({ create: { width: 1280, height: 720, channels: 3, background: '#1A1824' } }).png().toBuffer()
    if (PLAIN) {
      // The thumbnail alone: the chip shows the song's name over it
      await sharp(base).resize(320).webp({ quality: 85 }).toFile(`public/images/${list}/${item.id}-thumb.webp`)
      continue
    }
    const badge = await label(text, COLORS[tag.toUpperCase()])
    const { width, height } = await sharp(badge).metadata()
    const card = await sharp(base).composite([{ input: fade }, { input: badge, left: Math.round((1280 - width) / 2), top: 720 - height - 20 }]).png().toBuffer()
    await sharp(card).resize(320).webp({ quality: 85 }).toFile(`public/images/${list}/${item.id}-thumb.webp`)
  }
  console.log(`${list}: ${items.length} cards`)
}
