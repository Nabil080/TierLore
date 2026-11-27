// Adds the credited singers and composers to src/people.json, from Deezer (free API, no key): their
// photo, Deezer page and best-known tracks ("Also known for"), leaving out the songs already in TierLore.
// Artists are found by exact name; ARTIST_IDS fixes the ambiguous ones (Deezer artist id, or null to skip).
// Run after gen-themes.mjs / gen-osts.mjs. Usage: node scripts/gen-artists.mjs

import { readdir, readFile, writeFile } from 'node:fs/promises'

const TRACKS_SHOWN = 6

// Name in TierLore -> Deezer artist id, when the search can't tell (homonyms, other spellings)
const ARTIST_IDS = {
  SID: 7936428, // not the Brazilian band
  LiSA: 11446160, // not BLACKPINK's Lisa
  "Lil'B": 14838797, // not the rapper Lil B
  ViViD: 118802022,
  'Kōsuke Atari': 4022612,
  'MAN WITH A MISSION × milet': 5797990,
  'MY FIRST STORY × HYDE': 14893207,
  // No reliable match on Deezer: their card shows their songs in TierLore only
  June: null,
  Universe: null,
  'Six Lounge': null,
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const norm = (text) => text.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]/g, '')

async function deezer(path) {
  for (let attempt = 0; attempt < 5; attempt++) {
    await sleep(150)
    const json = await (await fetch(`https://api.deezer.com${path}`)).json()
    // Quota: 50 requests / 5 s
    if (json.error?.code === 4) {
      await sleep(5000)
      continue
    }
    if (json.error) throw new Error(`${path}: ${json.error.message}`)
    return json
  }
  throw new Error(`${path}: Deezer quota`)
}

// Every artist credited in the lists, and every song title already in TierLore (left out of their top tracks)
const artists = new Map()
const songs = new Set()
for (const file of await readdir('src/data')) {
  if (!file.endsWith('.json')) continue
  const { items } = JSON.parse(await readFile(`src/data/${file}`, 'utf8'))
  for (const item of items) {
    for (const section of item.sections ?? []) {
      for (const entry of section.entries) {
        if (!entry.person?.startsWith('artist-')) continue
        artists.set(entry.person, entry.text)
        songs.add(norm(item.shortName ?? item.name))
      }
    }
  }
}

async function findArtist(name) {
  if (name in ARTIST_IDS) return ARTIST_IDS[name] && deezer(`/artist/${ARTIST_IDS[name]}`)
  const { data } = await deezer(`/search/artist?q=${encodeURIComponent(name)}&limit=10`)
  // Exact name only (case, accents and punctuation aside), the most followed one if several
  const exact = data.filter((artist) => norm(artist.name) === norm(name)).sort((a, b) => b.nb_fan - a.nb_fan)
  return exact[0] ?? null
}

const people = JSON.parse(await readFile('src/people.json', 'utf8'))
const missing = []
for (const [id, name] of artists) {
  const artist = await findArtist(name)
  if (!artist) {
    missing.push(name)
    continue
  }
  const { data: top } = await deezer(`/artist/${artist.id}/top?limit=25`)
  const seen = new Set()
  const tracks = top.filter((track) => {
    // One version per title ("Live", "TV size"...), none of the songs already ranked here
    const key = norm(track.title_short ?? track.title)
    if (seen.has(key) || songs.has(key) || [...songs].some((song) => song.length > 3 && key.startsWith(song))) return false
    seen.add(key)
    return true
  }).slice(0, TRACKS_SHOWN)
  people[id] = {
    name,
    image: artist.picture_xl ?? artist.picture_big,
    url: artist.link,
    roles: tracks.map((track) => ({ name: track.title_short ?? track.title, image: track.album.cover_medium, media: track.album.title, url: track.link })),
  }
  console.log(`${name} -> ${artist.name} (${artist.nb_fan ?? '?'} fans): ${tracks.map((t) => t.title_short ?? t.title).join(', ')}`)
}

await writeFile('src/people.json', JSON.stringify(people, null, 1) + '\n')
console.log(`\n${artists.size - missing.length} artists added${missing.length ? `, not found: ${missing.join(', ')}` : ''}`)
