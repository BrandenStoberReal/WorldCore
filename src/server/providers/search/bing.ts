export async function searchBing(query: string, _apiKey: string): Promise<Array<Record<string, unknown>>> {
  const res = await fetch(
    `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}`,
    {
      headers: { "Ocp-Apim-Subscription-Key": _apiKey },
    },
  )
  const data = await res.json() as Record<string, unknown>
  const webPages = data.webPages as Record<string, unknown> | undefined
  return (webPages?.value as Array<Record<string, unknown>> | undefined) || []
}