export async function translateLibre(text: string, sourceLang: string, targetLang: string, baseUrl: string): Promise<string> {
  const url = `${baseUrl}/translate`
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: text, source: sourceLang, target: targetLang }),
  })
  const data = await res.json() as Array<Record<string, unknown>>
  return (data[0]?.translatedText as string) || text
}