// Downloads every remote media (src + thumb) of a tierlist JSON into public/images/<dataset>/<itemId>/
// and rewrites the JSON to point to the local copies, resized to web sizes (webp).
// Needed because some hosts block hotlinking, and because the PNG export refuses cross-origin images.
// Resizing matters too: multi-MB originals made switching characters laggy.
// Safe to re-run: local paths are skipped, already downloaded or resized files are reused.
//
// Usage: node scripts/localize-images.mjs src/data/<list>.json

import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import sharp from 'sharp'

// Its file cache keeps originals locked on Windows, which breaks deleting them
sharp.cache(false)

// Long side in px: enough for the zoom on a 1440p screen / thumbnails on the board
const SIZES = { src: { max: 1600, suffix: '-web.webp' }, thumb: { max: 320, suffix: '-thumb.webp' } }

const jsonPath = process.argv[2]
if (!jsonPath) throw new Error('Usage: node scripts/localize-images.mjs src/data/<list>.json')
const dataset = basename(jsonPath, '.json')
const data = JSON.parse(await readFile(jsonPath, 'utf8'))

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// zerochan answers 429 when downloading too fast: pace requests and back off on 429
async function fetchWithRetry(url, attempts = 5) {
  for (let i = 0; ; i++) {
    await sleep(500)
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (res.ok) return res
    if (res.status !== 429 || i >= attempts - 1) throw new Error(`${res.status} ${url}`)
    await sleep(2000 * 2 ** i)
  }
}

async function localize(url, itemId) {
  if (!url || !/^https?:\/\//.test(url)) return url
  // Some hosts end URLs with a non-file segment (fandom: .../Name.png/revision/latest), and a thumb
  // can share its file name with the full image: keep the last segment with an extension, prefixed by a URL hash
  const segments = new URL(url).pathname.split('/').map(decodeURIComponent)
  const name = segments.findLast((s) => /\.\w{3,4}$/.test(s)) ?? 'image'
  const hash = createHash('sha1').update(url).digest('hex').slice(0, 8)
  const file = `${hash}-${name}`.replace(/[^\w.-]/g, '_')
  const dir = join('public', 'images', dataset, itemId)
  const dest = join(dir, file)
  if (!existsSync(dest)) {
    const res = await fetchWithRetry(url)
    await mkdir(dir, { recursive: true })
    await writeFile(dest, Buffer.from(await res.arrayBuffer()))
    console.log(`downloaded ${dest}`)
  }
  return `/images/${dataset}/${itemId}/${file}`
}

// Converts a local image to a web-sized webp next to it
async function optimize(path, key) {
  const { max, suffix } = SIZES[key]
  if (!path?.startsWith('/images/') || path.endsWith(suffix)) return path
  const source = join('public', path)
  const optimized = path.replace(/\.\w+$/, '') + suffix
  if (!existsSync(join('public', optimized))) {
    await sharp(source)
      .resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(join('public', optimized))
  }
  return optimized
}

const allPaths = () => data.items.flatMap((item) => item.media.flatMap((m) => [m.src, m.thumb]))

let failures = 0
for (const item of data.items) {
  for (const media of item.media) {
    for (const key of ['src', 'thumb']) {
      try {
        media[key] = await localize(media[key], item.id)
        const original = media[key]
        media[key] = await optimize(original, key)
        if (media[key] !== original) {
          console.log(`optimized ${media[key]}`)
          // src and thumb can share a file: delete the original only once nothing points to it anymore
          if (!allPaths().includes(original)) await rm(join('public', original), { force: true })
        }
      } catch (err) {
        // Keep the remote URL so the app still works where the host allows it
        failures++
        console.error(`FAILED ${item.id} ${key}: ${err.message}`)
      }
    }
  }
}

await writeFile(jsonPath, JSON.stringify(data, null, 1) + '\n')
console.log(failures ? `Done with ${failures} failure(s).` : 'Done, all media are local and web-sized.')
process.exitCode = failures ? 1 : 0
