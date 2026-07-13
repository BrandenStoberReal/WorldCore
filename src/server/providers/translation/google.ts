export async function translateGoogle(text: string, sourceLang: string, targetLang: string, apiKey: string): Promise<string> {
  const res = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, source: sourceLang, target: targetLang }),
    },
  )
  const data = await res.json() as Record<string, unknown>
  return (((data.data as Record<string, unknown>)?.translations as Array<Record<string, unknown>>)[0]?.translatedText as string) || text
}