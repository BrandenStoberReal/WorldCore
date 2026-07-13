export async function searchSearXNG(query: string, baseUrl: string): Promise<Array<Record<string, unknown>>> {
  const res = await fetch(
    `${baseUrl}/search?q=${encodeURIComponent(query)}&format=json`,
  )
  const data = await res.json() as Record<string, unknown>
  return (data.results as Array<Record<string, unknown>>) || []
}