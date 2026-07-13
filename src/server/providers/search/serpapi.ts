export async function searchSerpApi(query: string, apiKey: string): Promise<Array<Record<string, unknown>>> {
  const res = await fetch(
    `https://serpapi.com/search?q=${encodeURIComponent(query)}&api_key=${apiKey}&engine=google`,
  )
  const data = await res.json() as Record<string, unknown>
  return (data.organic_results as Array<Record<string, unknown>>) || []
}