// Generates src/people.json: details for the people credited in the lists' info sheets.
// For now only voice actors (credits whose `person` is "anilist-staff-<id>"): photo, AniList page and
// their best-known roles elsewhere. Artists need nothing here: their page lists their songs found
// in TierLore, built at runtime from the credits.
// Usage: node scripts/gen-people.mjs

import { readdir, readFile, writeFile } from 'node:fs/promises'

// Roles from these franchises are left out: they're already in the lists, and some are spoilers
// (alternate forms with their own name)
const EXCLUDED_MEDIA = [/bleach/i]
const ROLES_SHOWN = 6

async function anilistQuery(query, variables) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    })
    if (response.status !== 429) return (await response.json()).data
    const wait = Number(response.headers.get('retry-after') ?? 60)
    console.log(`AniList rate limit, waiting ${wait}s`)
    await new Promise((resolve) => setTimeout(resolve, wait * 1000))
  }
  throw new Error('AniList keeps answering 429')
}

// Every "anilist-staff-<id>" credited in any list
const staffIds = new Set()
for (const file of await readdir('src/data')) {
  if (!file.endsWith('.json')) continue
  const { items } = JSON.parse(await readFile(`src/data/${file}`, 'utf8'))
  for (const item of items) {
    for (const section of item.sections ?? []) {
      for (const entry of section.entries) {
        const id = entry.person?.match(/^anilist-staff-(\d+)$/)?.[1]
        if (id) staffIds.add(Number(id))
      }
    }
  }
}

const people = {}
const ids = [...staffIds]
for (let i = 0; i < ids.length; i += 25) {
  const data = await anilistQuery(`query($ids: [Int]) { Page(perPage: 50) { staff(id_in: $ids) {
    id name { full } image { large } siteUrl
    characters(sort: FAVOURITES_DESC, perPage: 25) { edges { node { name { full } image { large } } media { title { romaji english } } } }
  } } }`, { ids: ids.slice(i, i + 25) })
  for (const staff of data.Page.staff) {
    const roles = staff.characters.edges
      .filter((edge) => !edge.media.some((m) => EXCLUDED_MEDIA.some((re) => re.test(`${m.title.romaji} ${m.title.english ?? ''}`))))
      .slice(0, ROLES_SHOWN)
      .map((edge) => ({
        name: edge.node.name.full,
        image: edge.node.image.large,
        media: edge.media[0] ? edge.media[0].title.english ?? edge.media[0].title.romaji : null,
      }))
    people[`anilist-staff-${staff.id}`] = { name: staff.name.full, image: staff.image.large, url: staff.siteUrl, roles }
  }
}

await writeFile('src/people.json', JSON.stringify(people, null, 1) + '\n')
console.log(`people: ${Object.keys(people).length} voice actors`)
