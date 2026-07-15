export async function searchBrave(
  query: string,
  apiKey: string,
): Promise<Array<Record<string, unknown>>> {
  const res = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}`,
    {
      headers: { Accept: 'application/json', 'X-Subscription-Token': apiKey },
    },
  );
  const data = (await res.json()) as Record<string, unknown>;
  const web = data.web as Record<string, unknown> | undefined;
  return (web?.results as Array<Record<string, unknown>> | undefined) || [];
}
