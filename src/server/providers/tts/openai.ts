export async function synthesizeOpenAI(
  text: string,
  apiKey: string,
  options: {
    voice?: string;
    model?: string;
    speed?: number;
  },
): Promise<{ audioBase64: string; duration?: number }> {
  const { voice = 'alloy', model = 'tts-1', speed = 1 } = options;

  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: text,
      voice,
      speed,
      response_format: 'mp3',
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI TTS error ${res.status}: ${errText}`);
  }

  const buffer = await res.arrayBuffer();
  return {
    audioBase64: Buffer.from(buffer).toString('base64'),
  };
}
