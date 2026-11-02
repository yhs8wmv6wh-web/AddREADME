// Holt echte Tabs und Akkorde von Ultimate Guitar über eine kurze Claude-Code-Cloud-Sitzung
// (Connector "Claude Code Remote"). Artefakte selbst dürfen keine fremden Seiten laden –
// die Cloud-Sitzung schon. Funktioniert damit überall, auch auf dem iPhone.
import { getCapability } from './env'

const SERVER = 'Claude Code Remote'

export interface UgResult {
  url: string
  type: string
  part: string
  rating: number
  votes: number
  song: string
  artist: string
  content: string
  error?: string
}

export class UgError extends Error {}

interface Mcp {
  callTool(server: string, tool: string, input?: unknown, options?: { cache?: false; signal?: AbortSignal }): Promise<{ payload?: unknown; content: { type: string; text?: string }[] }>
}

// Abruf-Skript (Python, nur Standardbibliothek). Behält nur Tabs, Akkordzeilen und Abschnitte – keine Liedtexte.
const SCRIPT = String.raw`import sys,re,json,html,urllib.request,urllib.parse
UA={'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36'}
def get(u):
    return urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=25).read().decode('utf-8','replace')
def store(s):
    m=re.search(r'class="js-store" data-content="([^"]*)"',s)
    return json.loads(html.unescape(m.group(1)))['store']['page']['data'] if m else {}
title=sys.argv[1]; artist=sys.argv[2] if len(sys.argv)>2 else ''; n=int(sys.argv[3]) if len(sys.argv)>3 else 3
q=(title+' '+artist).strip()
N=lambda x:re.sub(r'[^a-z0-9]','',(x or '').lower().replace('&','and'))
a2=re.sub(r'^the\s+','',artist,flags=re.I)
qs=[]
for x in [title+' '+a2, title+' '+artist, title, title.replace("'",'')+' '+a2]:
    x=x.strip()
    if x and x not in qs: qs.append(x)
res=[]
for x in qs:
    rr=store(get('https://www.ultimate-guitar.com/search.php?search_type=title&value='+urllib.parse.quote(x))).get('results',[])
    rr=[r for r in rr if isinstance(r,dict) and r.get('tab_url','').startswith('https://tabs.ultimate-guitar.com/')]
    m=[r for r in rr if N(r.get('song_name'))==N(title) or (N(r.get('song_name')) and N(r.get('song_name')) in N(q))]
    if artist: m=[r for r in m if N(a2) in N(r.get('artist_name')) or N(r.get('artist_name')) in N(artist)]
    if m:
        res=m; break
def score(r): return (r.get('rating') or 0)*min(r.get('votes') or 0,500)
tabs=sorted([r for r in res if r.get('type')=='Tabs'],key=score,reverse=True)[:n]
chords=sorted([r for r in res if r.get('type')=='Chords'],key=score,reverse=True)[:1]
CH=re.compile(r'^\(?[A-H][#b]?(m|maj|min|dim|aug|sus|add|M|[0-9]|#|b|\+|\(|\))*(/[A-H][#b]?)?\)?,?$')
def keep(c):
    # Nur Tabs, Akkordzeilen, Abschnitte und Stimmung behalten - keine Liedtexte
    o=[]
    for l in c.split('\n'):
        t=l.strip()
        if not t: o.append('')
        elif re.match(r'^\[[^\]]+\]$',t) or re.match(r'^(tuning|key|capo|tempo|bpm)\b',t,re.I): o.append(t)
        elif '|' in t and t.count('-')>=4: o.append(l.rstrip())
        elif all(CH.match(x) or x in ('|','||','x2','x3','x4','(x2)','(x4)','N.C.','-') for x in t.split()): o.append(l.rstrip())
    return re.sub(r'\n{3,}','\n\n','\n'.join(o)).strip()
out=[]
for r in tabs+chords:
    try:
        d=store(get(r['tab_url']))
        c=d['tab_view']['wiki_tab']['content']
        c=re.sub(r'\[/?(ch|tab)\]','',c).replace('\r','')
        c=keep(c)
        out.append({'url':r['tab_url'],'type':r.get('type'),'part':r.get('part') or '','rating':round(r.get('rating') or 0,2),'votes':r.get('votes') or 0,
                    'song':r.get('song_name',''),'artist':r.get('artist_name',''),'content':c[:9000]})
    except Exception as e:
        out.append({'url':r['tab_url'],'error':str(e)[:200]})
print('<<<UGJSON'); print(json.dumps({'query':q,'results':out},ensure_ascii=False)); print('UGJSON>>>')
`

const shq = (s: string) => "'" + s.replace(/'/g, `'"'"'`) + "'"

function payloadOf(r: { payload?: unknown; content: { type: string; text?: string }[] }): unknown {
  if (r.payload !== undefined) return r.payload
  const t = r.content.find((b) => b.type === 'text')?.text ?? ''
  try {
    return JSON.parse(t)
  } catch {
    return t
  }
}

/** Sucht in beliebig verschachtelten Daten den Text mit der Skript-Ausgabe. */
function findOutput(v: unknown, depth = 0): string | null {
  if (depth > 12 || v == null) return null
  if (typeof v === 'string') {
    const i = v.indexOf('<<<UGJSON\n{')
    if (i >= 0) {
      const j = v.indexOf('UGJSON>>>', i)
      return v.slice(i + 10, j > 0 ? j : undefined).trim()
    }
    return null
  }
  if (Array.isArray(v)) {
    for (const x of v) {
      const r = findOutput(x, depth + 1)
      if (r) return r
    }
    return null
  }
  if (typeof v === 'object') {
    for (const x of Object.values(v as Record<string, unknown>)) {
      const r = findOutput(x, depth + 1)
      if (r) return r
    }
  }
  return null
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(t)
      reject(new UgError('abgebrochen'))
    })
  })

function mcpMessage(err: unknown): string {
  const code = (err as { code?: string })?.code
  if (code === 'server_not_connected' || code === 'server_not_found')
    return 'Der Connector „Claude Code Remote" ist nicht verbunden (claude.ai → Einstellungen → Connectors).'
  if (code === 'not_granted' || code === 'consent_required' || code === 'approval_required')
    return 'Der Zugriff auf Claude Code wurde nicht erlaubt.'
  if (code === 'needs_reauth') return 'Claude Code muss neu verbunden werden (claude.ai → Connectors).'
  if (code === 'rate_limited') return 'Gerade zu viele Anfragen – bitte kurz warten.'
  return (err as { message?: string })?.message || 'Claude Code ist gerade nicht erreichbar.'
}

/** Holt Tabs (bis zu n) und die beste Akkordversion eines Songs von Ultimate Guitar. */
export async function fetchUltimateGuitar(
  title: string,
  artist: string,
  opts: { n?: number; signal?: AbortSignal; onStatus?: (s: string) => void } = {},
): Promise<UgResult[]> {
  const mcp = await getCapability<Mcp>('mcp')
  if (!mcp) throw new UgError('Online-Abruf ist in dieser Ansicht nicht verfügbar.')
  const call = async (tool: string, input: unknown) => {
    try {
      return payloadOf(await mcp.callTool(SERVER, tool, input, { cache: false, signal: opts.signal }))
    } catch (err) {
      throw new UgError(mcpMessage(err))
    }
  }
  const status = opts.onStatus ?? (() => {})

  status('Cloud-Umgebung wird gesucht …')
  const envs = ((await call('list_environments', { limit: 20 })) as { environments?: { environment_id: string; kind?: string; state?: string }[] })
    ?.environments ?? []
  const env = envs.find((e) => e.kind === 'anthropic_cloud' && e.state !== 'archived') ?? envs[0]
  if (!env) throw new UgError('Keine Claude-Code-Cloud-Umgebung gefunden (auf claude.ai/code einmal eine anlegen).')

  status('Cloud-Sitzung startet …')
  const prompt = `Automatischer Auftrag der App "Gitarre üben". Führe genau diesen einen Bash-Befehl aus (er lädt öffentliche Tabs von Ultimate Guitar) und antworte danach nur mit dem Wort: fertig

cat > /tmp/ug.py <<'PYEOF'
${SCRIPT}PYEOF
python3 /tmp/ug.py ${shq(title)} ${shq(artist)} ${opts.n ?? 3}`
  const created = (await call('create_session', {
    environment_id: env.environment_id,
    title: `Gitarre üben: Tabs für ${title}`.slice(0, 200),
    model: 'claude-haiku-5-5',
    prompt,
  })) as { ccr?: { id?: string } }
  const sid = created?.ccr?.id
  if (!sid) throw new UgError('Cloud-Sitzung konnte nicht gestartet werden.')

  try {
    status('Ultimate Guitar wird gelesen …')
    const deadline = Date.now() + 180_000
    for (;;) {
      await sleep(4000, opts.signal)
      const s = (await call('get_session', { session_id: sid })) as { ccr?: { status_bucket?: string; session_status?: string } }
      const bucket = s?.ccr?.status_bucket ?? ''
      if (/COMPLETED|FAILED|REVIEW_READY|BLOCKED/.test(bucket) || s?.ccr?.session_status === 'SESSION_STATUS_IDLE') break
      if (Date.now() > deadline) throw new UgError('Zeitüberschreitung beim Abruf (3 Min.).')
    }
    const events = await call('list_events', { session_id: sid, kinds: ['user'], limit: 100 })
    const out = findOutput(events)
    if (!out) throw new UgError('Die Cloud-Sitzung hat kein Ergebnis geliefert.')
    let parsed: { results?: UgResult[] }
    try {
      parsed = JSON.parse(out)
    } catch {
      throw new UgError('Das Ergebnis war unvollständig.')
    }
    return (parsed.results ?? []).filter((r) => r && typeof r.url === 'string')
  } finally {
    // Aufräumen: die Hilfssitzung wird archiviert (taucht nicht mehr in der Sitzungsliste auf)
    void mcp.callTool(SERVER, 'archive_session', { session_id: sid }).catch(() => {})
  }
}
