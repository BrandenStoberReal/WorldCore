export async function searchDuckDuckGo(query: string): Promise<Array<Record<string, unknown>>> {
  const res = await fetch(
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    },
  )
  const html = await res.text()
  const results: Array<Record<string, unknown>> = []
  const regex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(html)) !== null) {
    const title = match[2]
    const link = match[1]
    if (title && link) {
      results.push({ title: title.trim(), link })
    }
  }
  return results
}