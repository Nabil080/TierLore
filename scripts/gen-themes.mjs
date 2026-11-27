// Generates the openings / endings lists (src/data/bleach-openings.json, bleach-endings.json, demon-slayer-openings.json)
// with a card image per song in public/images/<list>/: the YouTube thumbnail of its video with the
// OP/ED number on top (a generated card if the thumbnail can't be downloaded).
// Tracklist: original anime (366 episodes, from MyAnimeList) + Thousand-Year Blood War.
// Videos: official uploads where there is one. Demon Slayer: the creditless openings.
//
// Usage: node scripts/gen-themes.mjs, then redraw-song-cards.mjs (the cards used on the site) and scrape-views.mjs

import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const PLACEHOLDER_VIDEO = 'https://www.youtube.com/watch?v=wW9TwZdWpjw'

const OPENINGS = [
  ['*~Asterisk~', 'Orange Range', 'episodes 1-25', 'https://youtu.be/wW9TwZdWpjw'],
  ['D-tecnoLife', 'UVERworld', 'episodes 26-51', 'https://youtu.be/h1MoLQ9Wcv0'],
  ['Ichirin no Hana', 'High and Mighty Color', 'episodes 52-74', 'https://youtu.be/eIm0dpBjQPg'],
  ['Tonight, Tonight, Tonight', 'Beat Crusaders', 'episodes 75-97', 'https://youtu.be/oi3wY1-EwDs'],
  ['Rolling Star', 'YUI', 'episodes 98-120', 'https://youtu.be/PSDIaaRC3jc'],
  ['Alones', 'Aqua Timez', 'episodes 121-143', 'https://youtu.be/WEN4qOcVKeM'],
  ['After Dark', 'Asian Kung-Fu Generation', 'episodes 144-167', 'https://youtu.be/Rv5V-5CErRE'],
  ['Chu-Bura', 'Kelun', 'episodes 168-189', 'https://youtu.be/cZ8Xpej1hXo'],
  ['Velonica', 'Aqua Timez', 'episodes 190-214', 'https://youtu.be/almG54sVBuw'],
  ['Shōjo S', 'Scandal', 'episodes 215-242', 'https://youtu.be/HN_-WaTLD_A'],
  ['Anima Rossa', 'Porno Graffitti', 'episodes 243-265', 'https://youtu.be/d3ze_mYwhR0'],
  ['chAngE', 'miwa', 'episodes 266-291', 'https://youtu.be/i0we6am_25g'],
  ['Ranbu no Melody', 'SID', 'episodes 292-316', 'https://youtu.be/5emM3JGI5JA'],
  ['Blue', 'ViViD', 'episodes 317-342', 'https://youtu.be/lTkCqZA4i3U'],
  ['Harukaze', 'Scandal', 'episodes 343-366', 'https://youtu.be/T6wo7bfYYu4'],
  // Thousand-Year Blood War (2022-2026)
  ['Scar', 'Tatsuya Kitani', 'TYBW part 1', 'https://youtu.be/mjeR7vUrDvM'],
  ['Stars', 'w.o.d.', 'TYBW part 2', 'https://youtu.be/bHME-AwOnc4'],
  ['Without Any Words', 'Six Lounge', 'TYBW part 3', 'https://youtu.be/ECWciPlUt0s'],
  ['I-Bull', 'jo0ji', 'TYBW final part', 'https://youtu.be/3b00HiT4B04'],
]

const ENDINGS = [
  ['Life is Like a Boat', 'Rie Fu', 'episodes 1-13', 'https://youtu.be/hYD6Ocj8dp8'],
  ['Thank You!!', 'Home Made Kazoku', 'episodes 14-26', 'https://youtu.be/EEh_fsD7-ZM'],
  ['Hōki Boshi', 'Younha', 'episodes 26-38', 'https://youtu.be/QJGy2n7ReHk'],
  ['Happy People', 'Skoop On Somebody', 'episodes 39-51', 'https://youtu.be/ca11p-P3P-A'],
  ['Life', 'YUI', 'episodes 52-63', 'https://youtu.be/CYbKRePEKOw'],
  ['My Pace', 'SunSet Swish', 'episodes 64-74', 'https://youtu.be/W_M7D_qxOUk'],
  ['Hanabi', 'Ikimonogakari', 'episodes 75-86', 'https://youtu.be/svwlbXKZrn0'],
  ['Movin!!', 'Takacha', 'episodes 87-97', 'https://youtu.be/gxWdDTYKtGA'],
  ["Baby It's You", 'June', 'episodes 98-109', 'https://youtu.be/ocOJpCwrr24'],
  ['Sakura Biyori', 'Mai Hoshimura', 'episodes 110-120', 'https://youtu.be/fGO-jmLujyg'],
  ['Tsumasaki', 'Ore Ska Band', 'episodes 121-131', 'https://youtu.be/B5NO509N_NI'],
  ['Daidai', 'Chatmonchy', 'episodes 132-143', 'https://youtu.be/NNwnH6Q-YMs'],
  ['Tane wo Maku Hibi', 'Kōsuke Atari', 'episodes 144-154', 'https://youtu.be/tGf48itMSPM'],
  ['Kansha.', 'RSP', 'episodes 155-167', 'https://youtu.be/KA4OGln46yI'],
  ['Orange', "Lil'B", 'episodes 168-179', 'https://youtu.be/F4DXogJ7qpM'],
  ['Gallop', "Pe'zmoku", 'episodes 180-189', 'https://youtu.be/_LO1pkk91d0'],
  ['Hitohira no Hanabira', 'Stereopony', 'episodes 190-201', 'https://youtu.be/lLEqAvVRMi4'],
  ['Sky Chord', 'Shion Tsuji', 'episodes 202-214', 'https://youtu.be/VV5Jbun1K50'],
  ['Kimi wo Mamotte, Kimi wo Aishite', 'Sambomaster', 'episodes 215-229', 'https://youtu.be/v1fiGwbXUWU'],
  ['Mad Surfer', 'Kenichi Asai', 'episodes 230-242', 'https://youtu.be/YtoeVohWVu8'],
  ['Sakurabito', 'SunSet Swish', 'episodes 243-255', 'https://youtu.be/GisDChgSi94'],
  ['Tabidatsu Kimi e', 'RSP', 'episodes 256-265', 'https://youtu.be/_jO29BFiyEs'],
  ['Stay Beautiful', "Diggy-MO'", 'episodes 266-278', 'https://youtu.be/YPa8M8neYLA'],
  ['Echoes', 'Universe', 'episodes 279-291', 'https://youtu.be/-eYpa31N86I'],
  ['Last Moment', 'SPYAIR', 'episodes 292-303', 'https://youtu.be/cRdYidq7d8g'],
  ['Song for...', "ROOKiEZ is PUNK'D", 'episodes 304-316', 'https://youtu.be/68vVfmt_9pM'],
  ['Aoi Tori', 'Fumika', 'episodes 317-329', 'https://youtu.be/TN6U4GA-cP4'],
  ['Haruka Kanata', 'Unlimits', 'episodes 330-342', 'https://youtu.be/WG2MvwLfhUQ'],
  ['Re:pray', 'Aimer', 'episodes 343-354', 'https://youtu.be/O63cbh6EyQ8'],
  ['Mask', 'Aqua Timez', 'episodes 355-366', 'https://youtu.be/m3OA8ypd3ZY'],
  // Thousand-Year Blood War (2022-2026)
  ['Saihate', 'SennaRin', 'TYBW part 1', 'https://youtu.be/y7Ko9UrIOB4'],
  ['Endroll', 'Yoh Kamiyama', 'TYBW part 2', 'https://youtu.be/lYKPh-WUCJ0'],
  ['Monochrome', 'suisoh', 'TYBW part 3', 'https://youtu.be/04-Yy1CE4vQ'],
]

const DEMON_SLAYER_OPENINGS = [
  ['Gurenge', 'LiSA', 'Season 1', 'https://youtu.be/YkJvHe3KK2c'],
  ['Akeboshi', 'LiSA', 'Mugen Train Arc', 'https://youtu.be/XIUDjQ5sVKk'],
  ['Zankyō Sanka', 'Aimer', 'Entertainment District Arc', 'https://youtu.be/st4wcpjZeQQ'],
  ['Kizuna no Kiseki', 'MAN WITH A MISSION × milet', 'Swordsmith Village Arc', 'https://youtu.be/OWBCIRhly4U'],
  ['Mugen', 'MY FIRST STORY × HYDE', 'Hashira Training Arc', 'https://youtu.be/WRrZr6k7ZSU'],
]

// Same artist in every list -> same id, so its page gathers all its songs ("Aqua Timez" -> "artist-aqua-timez")
const artistId = (artist) => `artist-${artist.normalize('NFKD').replace(/[^\w\s-]/g, '').trim().toLowerCase().replace(/\s+/g, '-')}`

// "Anime" row of the song sheet, from the "Used in" value
const bleachSeries = (usedIn) => (usedIn.startsWith('TYBW') ? 'Bleach: Thousand-Year Blood War' : 'Bleach (2004-2012)')

// Same ids and labels as the character lists: fun facts can be added per song later
const CATEGORIES = [
  { id: 'facts', label: 'Fun facts' },
  { id: 'credits', label: 'Credits' },
]

const TIERS = [
  { id: 'S', label: 'S', color: '#FF5C77' },
  { id: 'A', label: 'A', color: '#FF9B54' },
  { id: 'B', label: 'B', color: '#FFD35C' },
  { id: 'C', label: 'C', color: '#8FDB6E' },
  { id: 'D', label: 'D', color: '#5EC4F0' },
]

const escapeXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&apos;')

// Splits a title on two lines when it is too long for the card
function wrap(title, max = 16) {
  if (title.length <= max) return [title]
  const words = title.split(' ')
  let first = ''
  while (words.length && (first + ' ' + words[0]).trim().length <= max) first = (first + ' ' + words.shift()).trim()
  return first ? [first, words.join(' ')] : [title]
}

const CACHE_DIR = 'node_modules/.cache/yt-thumbs'

const youtubeId = (url) => url.match(/(?:youtu\.be\/|[?&]v=|\/embed\/)([\w-]{11})/)?.[1]

// Best available YouTube thumbnail (maxres doesn't exist for every video), cached between runs
async function youtubeThumbnail(url) {
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

// Number badge drawn over the thumbnail, centered at the bottom so the chip's crop keeps it
function badgeSvg({ tag, number, accent }) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.85"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#fade)"/>
  <text x="640" y="680" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-weight="900"
    font-size="200" fill="${accent}" stroke="#000" stroke-width="8" paint-order="stroke">${tag} ${number}</text>
</svg>`)
}

async function cardImage({ video, tag, number, title, artist, accent }) {
  const thumbnail = await youtubeThumbnail(video)
  if (!thumbnail) return sharp(Buffer.from(cardSvg({ tag, number, title, artist, accent })))
  const base = await sharp(thumbnail).resize(1280, 720, { fit: 'cover' }).toBuffer()
  return sharp(base).composite([{ input: badgeSvg({ tag, number, accent }) }])
}

// 16:9 card: the tierlist chip crops the middle, so the number and title stay centered
function cardSvg({ tag, number, title, artist, accent }) {
  const lines = wrap(title)
  const titleSize = lines.length > 1 ? 54 : 64
  const titleY = lines.length > 1 ? 400 : 430
  const tspans = lines
    .map((line, i) => `<tspan x="640" dy="${i ? titleSize * 1.1 : 0}">${escapeXml(line)}</tspan>`)
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1b1b24"/><stop offset="1" stop-color="#07070a"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#bg)"/>
  <rect x="0" y="0" width="1280" height="10" fill="${accent}"/>
  <text x="640" y="300" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-weight="900"
    font-size="230" fill="${accent}">${tag} ${number}</text>
  <text x="640" y="${titleY}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-weight="700"
    font-size="${titleSize}" fill="#ececf1">${tspans}</text>
  <text x="640" y="640" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif"
    font-size="40" fill="#9a9aa8">${escapeXml(artist)}</text>
</svg>`
}

async function generate({ dataset, title, subtitle, anime, tag, accent, songs }) {
  const dir = `public/images/${dataset}`
  await mkdir(dir, { recursive: true })
  const items = []
  for (const [i, [song, artist, episodes, video = PLACEHOLDER_VIDEO]] of songs.entries()) {
    const number = i + 1
    const id = `${tag.toLowerCase()}${String(number).padStart(2, '0')}`
    const card = await cardImage({ video, tag, number, title: song, artist, accent })
    // Composite first, then resize: sharp applies resize before composite within one pipeline
    const flat = await card.png().toBuffer()
    await sharp(flat).resize(320).webp({ quality: 85 }).toFile(`${dir}/${id}-thumb.webp`)
    items.push({
      id,
      name: `${tag} ${number} · ${song}`,
      shortName: song,
      subtitle: `${artist} · ${episodes}`,
      media: [
        {
          kind: 'video',
          src: video,
          thumb: `/images/${dataset}/${id}-thumb.webp`,
          caption: `${song} by ${artist}`,
        },
      ],
      sections: [
        { category: 'credits', entries: [{ label: 'Artist', text: artist, person: artistId(artist) }] },
      ],
    })
  }
  const config = { universe: anime === bleachSeries ? 'Bleach' : 'Demon Slayer', title, subtitle, categories: CATEGORIES, tiers: TIERS, items }
  await writeFile(`src/data/${dataset}.json`, JSON.stringify(config, null, 1) + '\n')
  console.log(`${dataset}: ${items.length} items`)
}

await generate({ dataset: 'bleach-openings', title: 'Bleach Openings', subtitle: 'Bleach + Thousand-Year Blood War', anime: bleachSeries, tag: 'OP', accent: '#f28c28', songs: OPENINGS })
await generate({ dataset: 'bleach-endings', title: 'Bleach Endings', subtitle: 'Bleach + Thousand-Year Blood War', anime: bleachSeries, tag: 'ED', accent: '#5aa9ff', songs: ENDINGS })
await generate({ dataset: 'demon-slayer-openings', title: 'Demon Slayer Openings', subtitle: 'Kimetsu no Yaiba', anime: () => 'Demon Slayer: Kimetsu no Yaiba', tag: 'OP', accent: '#e8475f', songs: DEMON_SLAYER_OPENINGS })
