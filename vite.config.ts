import react from '@vitejs/plugin-react'
import { cpSync, existsSync, readdirSync } from 'node:fs'
import { relative, sep } from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'

const DATA_DIR = 'src/data'
const IMAGES_DIR = 'public/images'
const VIRTUAL_ID = 'virtual:datasets'

// Which lists go into the site. A dataset = src/data/<name>.json + public/images/<name>/.
// VITE_DATASETS (comma separated, see .env.example) picks them and their order, and a build
// with only some of them doesn't ship the JSON or the images of the others. Default: every dataset.
function datasetNames(mode: string) {
  const all = readdirSync(DATA_DIR).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -'.json'.length))
  const wanted = loadEnv(mode, process.cwd(), 'VITE_').VITE_DATASETS
  if (!wanted) return all
  const names = wanted.split(',').map((n) => n.trim()).filter(Boolean)
  const unknown = names.filter((n) => !all.includes(n))
  if (unknown.length) throw new Error(`Unknown dataset(s) in VITE_DATASETS: ${unknown.join(', ')}`)
  return names
}

function datasets(names: string[]): Plugin {
  let outDir = 'dist'
  return {
    name: 'datasets',
    configResolved: (config) => {
      outDir = config.build.outDir
    },
    // The dataset list is read once at startup: restart the dev server when a JSON is added or removed
    configureServer(server) {
      const onChange = (file: string) => {
        if (file.endsWith('.json') && relative(DATA_DIR, file).split(sep).length === 1) server.restart()
      }
      server.watcher.on('add', onChange).on('unlink', onChange)
    },
    resolveId: (id) => (id === VIRTUAL_ID ? '\0' + VIRTUAL_ID : undefined),
    load(id) {
      if (id !== '\0' + VIRTUAL_ID) return
      const imports = names.map((name, i) => `import d${i} from '/${DATA_DIR}/${name}.json'`)
      const entries = names.map((name, i) => `${JSON.stringify(name)}: d${i}`)
      return `${imports.join('\n')}\nexport default { ${entries.join(', ')} }`
    },
    // publicDir is disabled for builds: copy public/ ourselves, minus the images of excluded datasets
    closeBundle() {
      if (!existsSync('public')) return
      cpSync('public', outDir, {
        recursive: true,
        filter: (src) => {
          const parts = relative(IMAGES_DIR, src).split(sep)
          const insideImages = !parts[0].startsWith('..') && parts[0] !== ''
          return !insideImages || names.includes(parts[0])
        },
      })
    },
  }
}

export default defineConfig(({ command, mode }) => ({
  base: './',
  publicDir: command === 'build' ? false : 'public',
  plugins: [react(), datasets(datasetNames(mode))],
}))
