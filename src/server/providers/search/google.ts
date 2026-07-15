export async function searchGoogle(
  query: string,
  _apiKey: string,
): Promise<Array<Record<string, unknown>>> {
  const res = await fetch(
    `https://www.googleapis.com/customsearch/v1?key=${_apiKey}&q=${encodeURIComponent(query)}&cx=pub-000000000000000000000:00000000000`,
  );
  const data = (await res.json()) as Record<string, unknown>;
  return (data.items as Array<Record<string, unknown>>) || [];
}
