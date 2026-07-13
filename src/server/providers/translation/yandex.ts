export async function translateYandex(text: string, sourceLang: string, targetLang: string, apiKey: string): Promise<string> {
  const lang = `${sourceLang}-${targetLang}`
  const res = await fetch("https://translate.api.cloud.yandex.net/translate/v2/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Api-Key ${apiKey}`,
    },
    body: JSON.stringify({ texts: [text], sourceLanguageCode: sourceLang, targetLanguageCode: targetLang, format: "TEXT" }),
  })
  const data = await res.json() as Record<string, unknown>
  return ((data.translations as Array<Record<string, unknown>> | undefined)?.[0]?.text as string) || text
}