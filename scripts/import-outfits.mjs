// Replaces the Bleach characters' sheet pictures with a folder of official art, one subfolder
// per character in order ("01_ichigo/01.jpg", "02.jpg"...). The chips keep their face picture (cover).
//
// Usage: node scripts/import-outfits.mjs <folder with 01_ichigo, 02_rukia... and sources.csv>

import { readdir, readFile, rm, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const LIST = 'bleach-characters'
const DIR = `public/images/${LIST}`
// Folder names that differ from the item ids
const IDS = { hitsugaya: 'toshiro' }

const source = process.argv[2]
if (!source) throw new Error('Usage: node scripts/import-outfits.mjs <folder>')
const data = JSON.parse(await readFile(`src/data/${LIST}.json`, 'utf8'))
const byId = new Map(data.items.map((item) => [item.id, item]))

// Previous sheet pictures are replaced; the chip faces (<id>-thumb.webp) stay
for (const file of await readdir(DIR)) {
  if (/-(official|outfit-\d+)(-thumb)?\.webp$/.test(file) || /^[a-z]+\.webp$/.test(file)) await rm(`${DIR}/${file}`)
}

// sources.csv (optional): where each picture comes from ("Couverture ch. 378"), shown as its caption
const captions = new Map()
try {
  const lines = (await readFile(`${source}/sources.csv`, 'utf8')).replace(/^﻿/, '').trim().split(/\r?\n/)
  const header = lines.shift().split(';')
  for (const line of lines) {
    const row = Object.fromEntries(line.split(';').map((value, i) => [header[i], value]))
    // "Ajoutée par ..." says who added the picture, not where it comes from: no caption
    if (row.source && !row.source.startsWith('Ajoutée')) captions.set(row.fichier.split('/').slice(-2).join('/'), row.source)
  }
} catch {
  // No sources file
}

const folders = (await readdir(source, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()
for (const folder of folders) {
  const name = folder.replace(/^\d+_/, '')
  const id = IDS[name] ?? name
  const item = byId.get(id)
  if (!item) throw new Error(`No character "${id}" for folder ${folder}`)
  const files = (await readdir(`${source}/${folder}`)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort()
  item.media = []
  for (const [i, file] of files.entries()) {
    const base = `${id}-outfit-${i + 1}`
    const input = await readFile(`${source}/${folder}/${file}`)
    await sharp(input).resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 86 }).toFile(`${DIR}/${base}.webp`)
    await sharp(input).resize(160, 220, { fit: 'cover', position: 'top' }).webp({ quality: 80 }).toFile(`${DIR}/${base}-thumb.webp`)
    item.media.push({ kind: 'image', src: `/images/${LIST}/${base}.webp`, thumb: `/images/${LIST}/${base}-thumb.webp`, caption: captions.get(`${folder}/${file}`) ?? null })
  }
  console.log(`${id}: ${files.length} pictures`)
}

data.subtitle = 'Official arts only'
await writeFile(`src/data/${LIST}.json`, JSON.stringify(data, null, 1) + '\n')
