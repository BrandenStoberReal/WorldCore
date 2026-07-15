export async function remoteCount(url: string, text: string, model?: string): Promise<number> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: text, model }),
    });
    const data = (await res.json()) as Record<string, unknown>;
    return (data.tokenCount as number) || Math.ceil(text.length / 4);
  } catch {
    return Math.ceil(text.length / 4);
  }
}
