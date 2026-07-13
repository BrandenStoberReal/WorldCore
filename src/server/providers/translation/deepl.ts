export async function translateDeepL(text: string, sourceLang: string, targetLang: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api-free.deepl.com/v2/translate", {
    method: "POST",
    headers: {
      "Authorization": `DeepL-Auth-Key ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `text=${encodeURIComponent(text)}&source_lang=${sourceLang}&target_lang=${targetLang}`,
  })
  const data = await res.json() as Record<string, unknown>
  return ((data.translations as Array<Record<string, unknown>>)[0]?.text as string) || text
}