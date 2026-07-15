export async function searchTavily(
  query: string,
  apiKey: string,
): Promise<Array<Record<string, unknown>>> {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, max_results: 10 }),
  });
  const data = (await res.json()) as Record<string, unknown>;
  return (data.results as Array<Record<string, unknown>>) || [];
}
