// Reads the current view count of every opening / ending video from its YouTube page (no API key) and
// stores it as the item's popularity: shown on the sheet and used by the "Popular" order.
// OST counts come from the checked export instead (sum of the official uploads, gen-osts.mjs).
//
// Usage: node scripts/scrape-views.mjs

import { readFile, writeFile } from 'node:fs/promises'

const LISTS = ['bleach-openings', 'bleach-endings', 'demon-slayer-openings']
const BROWSER = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const youtubeId = (url) => url.match(/(?:youtu\.be\/|[?&]v=|\/embed\/)([\w-]{11})/)?.[1]

async function views(id) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`https://www.youtube.com/watch?v=${id}`, { headers: { 'user-agent': BROWSER, 'accept-language': 'en' } })
    if (response.status === 429) {
      await sleep(20000)
      continue
    }
    const count = (await response.text()).match(/"viewCount":"(\d+)"/)?.[1]
    return count ? Number(count) : undefined
  }
}

for (const list of LISTS) {
  const file = `src/data/${list}.json`
  const data = JSON.parse(await readFile(file, 'utf8'))
  for (const item of data.items) {
    const id = youtubeId(item.media.find((m) => m.kind === 'video')?.src ?? '')
    if (!id) continue
    const count = await views(id)
    if (count !== undefined) item.popularity = count
    console.log(`${list} ${item.id}: ${count ?? 'not found'}`)
    await sleep(1200)
  }
  await writeFile(file, JSON.stringify(data, null, 1) + '\n')
}
