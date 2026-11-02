// Online nachsehen über den eingebauten Browser der Claude-Desktop-App
// (MCP-Server "host:claude_browser"). Die Werkzeug-Schemas werden zur Laufzeit
// gelesen und direkt an Claude weitergegeben – Claude ruft die Werkzeuge selbst auf.
import { getCapability, type McpNs, type SampleFn, type SampleTool } from './env'

export const BROWSER_SERVER = 'host:claude_browser'
const TOOL_NAMES = ['navigate', 'get_page_text', 'find']
const MAX_TEXT = 20_000

function textOf(r: Awaited<ReturnType<McpNs['callTool']>>): string {
  const t = r.content
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('\n')
  if (t) return t
  return r.structuredContent ? JSON.stringify(r.structuredContent) : ''
}

/** Browser-Werkzeuge für Claude, oder null wenn hier nicht verfügbar. */
export async function browserTools(sample: SampleFn, signal?: AbortSignal): Promise<SampleTool[] | null> {
  const mcp = await getCapability<McpNs>('mcp')
  if (!mcp) return null
  try {
    const lim = await sample.limits()
    if (!lim.tools || lim.tools.maxCount < 2) return null
  } catch {
    return null
  }
  const tools: SampleTool[] = []
  for (const name of TOOL_NAMES) {
    try {
      const d = await mcp.describeTool(BROWSER_SERVER, name)
      tools.push({
        name,
        description: d.description,
        inputSchema: d.inputSchema,
        execute: async (input) => {
          const r = await mcp.callTool(BROWSER_SERVER, name, input, { cache: false, signal })
          const t = textOf(r)
          return t.length > MAX_TEXT ? t.slice(0, MAX_TEXT) + '\n[… gekürzt]' : t
        },
      })
    } catch {
      // Werkzeug nicht verfügbar (keine Desktop-App, nicht erlaubt …)
    }
  }
  return tools.some((t) => t.name === 'navigate') && tools.some((t) => t.name !== 'navigate') ? tools : null
}
