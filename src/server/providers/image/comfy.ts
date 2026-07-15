const DEFAULT_COMFY_WORKFLOW: Record<string, unknown> = {
  '3': {
    class_type: 'KSampler',
    inputs: {
      seed: 0,
      steps: 20,
      cfg: 7,
      sampler_name: 'euler',
      scheduler: 'normal',
      denoise: 1,
    },
  },
  '5': {
    class_type: 'CLIPTextEncode',
    inputs: { text: '' },
  },
  '6': {
    class_type: 'CLIPTextEncode',
    inputs: { text: '' },
  },
  '8': {
    class_type: 'EmptyLatentImage',
    inputs: { width: 512, height: 512, batch_size: 1 },
  },
};

export async function generateComfy(
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
  const { width = 512, height = 512, steps = 20, cfgScale = 7, seed, sampler, count = 1 } = options;

  const workflow = JSON.parse(JSON.stringify(DEFAULT_COMFY_WORKFLOW)) as Record<
    string,
    Record<string, unknown>
  >;

  const inputs5 = workflow['5']?.inputs as Record<string, unknown>;
  const inputs6 = workflow['6']?.inputs as Record<string, unknown>;
  const inputs8 = workflow['8']?.inputs as Record<string, unknown>;
  const inputs3 = workflow['3']?.inputs as Record<string, unknown>;

  inputs5['text'] = prompt;
  inputs6['text'] = negativePrompt;
  inputs8['width'] = width;
  inputs8['height'] = height;
  inputs8['batch_size'] = count;
  inputs3['steps'] = steps;
  inputs3['cfg'] = cfgScale;
  inputs3['seed'] = seed ?? Math.floor(Math.random() * 2 ** 32);
  if (sampler) {
    inputs3['sampler_name'] = sampler;
  }

  const actualSeed = inputs3['seed'] as number;

  const queueRes = await fetch(`${apiUrl}/queue/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
  });

  if (!queueRes.ok) {
    const errText = await queueRes.text();
    throw new Error(`ComfyUI queue error ${queueRes.status}: ${errText}`);
  }

  const queueData = (await queueRes.json()) as Record<string, unknown>;
  const promptId = queueData.prompt_id as string | undefined;
  if (!promptId) {
    throw new Error('ComfyUI did not return prompt_id');
  }

  let resultImages: Array<{ url: string; seed: number }> = [];
  const historyRes = await fetch(`${apiUrl}/history/${promptId}`);
  const historyData = (await historyRes.json()) as Record<string, unknown>;
  const promptHistory = (historyData[promptId] as Record<string, unknown> | undefined)?.[
    'outputs'
  ] as Record<string, unknown> | undefined;
  if (promptHistory) {
    const imagesOutput = promptHistory['6'] as Record<string, unknown> | undefined;
    const images = (imagesOutput?.images as Array<Record<string, unknown>> | undefined) ?? [];
    for (const img of images) {
      const filename = img.filename as string | undefined;
      const subfolder = img.subfolder as string | undefined;
      if (filename) {
        const subfolderPart = subfolder ? `/${subfolder}` : '';
        resultImages.push({
          url: `${apiUrl}/view?filename=${filename}&subfolder=${subfolderPart}&type=${img.type as string}`,
          seed: actualSeed,
        });
      }
    }
  }

  return resultImages;
}
