// The fonts embedded into PNG exports. html-to-image would embed every font file the page loads, and
// M PLUS 1 comes in dozens of Japanese subsets: that download was most of the export's freeze. Only
// the Latin subsets are kept (the board shows Latin names), turned into data URLs once per visit
let fontCss: Promise<string> | undefined

const toDataUrl = async (url: string) => {
  const blob = await (await fetch(url)).blob()
  return new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(blob)
  })
}

async function build() {
  const link = document.querySelector<HTMLLinkElement>('link[rel="stylesheet"][href*="fonts.googleapis.com"]')
  if (!link) return ''
  const css = await (await fetch(link.href)).text()
  const latin = css.split('@font-face').slice(1).map((block) => `@font-face${block.slice(0, block.indexOf('}') + 1)}`)
    .filter((block) => /unicode-range:[^;]*U\+0000-00FF/i.test(block))
  const embedded = await Promise.all(latin.map(async (block) => {
    const url = block.match(/url\((https:[^)]+)\)/)?.[1]
    return url ? block.replace(url, await toDataUrl(url)) : block
  }))
  return embedded.join('\n')
}

export function exportFontCss() {
  fontCss ??= build().catch(() => '')
  return fontCss
}
