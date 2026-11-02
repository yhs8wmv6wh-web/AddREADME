// Baut die Artefakt-Variante und legt alles in eine einzige HTML-Datei (ohne <html>/<head>/<body>,
// die setzt claude.ai beim Veröffentlichen selbst).
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

execSync('npx vite build --mode artifact', { stdio: 'inherit' })
const dir = 'dist-artifact'
const assets = join(dir, 'assets')
const files = readdirSync(assets)
const js = files.filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(assets, f), 'utf8'))
const css = files.filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(assets, f), 'utf8'))
if (js.length !== 1) throw new Error('Erwarte genau eine JS-Datei, gefunden: ' + js.length)
const safeJs = js[0].replace(/<\/script/gi, '<\\/script')
const out = `<title>Gitarre üben</title>
<style>${css.join('\n')}</style>
<div id="root"></div>
<script type="module">${safeJs}</script>
`
writeFileSync('gitarre-artifact.html', out)
console.log('gitarre-artifact.html', (out.length / 1024).toFixed(0), 'KB')
