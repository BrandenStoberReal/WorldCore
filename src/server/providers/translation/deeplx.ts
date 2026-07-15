export async function translateDeepLX(
  text: string,
  sourceLang: string,
  targetLang: string,
  baseUrl: string,
): Promise<string> {
  const url = `${baseUrl}/translate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, source_lang: sourceLang, target_lang: targetLang }),
  });
  const data = (await res.json()) as Record<string, unknown>;
  return (data.data as string) || text;
}
