export async function translateBing(text: string, sourceLang: string, targetLang: string, _apiKey: string): Promise<string> {
  const tokenRes = await fetch("https://edge.microsoft.com/translate/auth")
  const tokenData = await tokenRes.json() as Record<string, unknown>
  const result = tokenData.result as Record<string, unknown> | undefined
  const token = (result?.token as string | undefined) || ""

  if (!token) {
    return text
  }

  const res = await fetch("https://api-edge.cognitive.microsofttranslator.com/translate?from=&to=" + targetLang, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "X-ClientTransactionId": crypto.randomUUID(),
    },
    body: JSON.stringify([{ Text: text }]),
  })
  const data = await res.json() as Array<Record<string, unknown>>
  return ((data[0]?.translations as Array<Record<string, unknown>> | undefined)?.[0]?.text as string) || text
}