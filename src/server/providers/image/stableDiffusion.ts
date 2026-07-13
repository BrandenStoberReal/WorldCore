export async function generateStableDiffusion(
  prompt: string,
  negativePrompt: string,
  apiUrl: string,
  options: {
    model?: string;
    width?: number;
    height?: number;
    steps?: number;
    cfgScale?: number;
    seed?: number;
    sampler?: string;
    count?: number;
  },
): Promise<Array<{ url: string; seed: number }>> {
  const {
    width = 512,
    height = 512,
    steps = 20,
    cfgScale = 7,
    seed = -1,
    sampler,
    count = 1,
  } = options;

  const body: Record<string, unknown> = {
    prompt,
    negative_prompt: negativePrompt,
    width,
    height,
    steps,
    cfg_scale: cfgScale,
    seed,
    batch_size: count,
  };

  if (sampler) {
    body.sampler_name = sampler;
  }

  const res = await fetch(`${apiUrl}/sdapi/v1/txt2img`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`SD WebUI error ${res.status}: ${errText}`);
  }

  const data = await res.json() as Record<string, unknown>;
  const images = (data.images as string[] | undefined) ?? [];
  const info = (data.info as string | undefined) ?? "";
  const match = info.match(/Seed: (\d+)/);
  const baseSeed = match ? Number(match[1]) : 0;

  return images.map((img, i) => ({
    url: `data:image/png;base64,${img}`,
    seed: baseSeed + i,
  }));
}
