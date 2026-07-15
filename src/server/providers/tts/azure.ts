export async function synthesizeAzure(
  text: string,
  apiKey: string,
  options: {
    voice?: string;
    model?: string;
    speed?: number;
  },
): Promise<{ audioBase64: string; duration?: number }> {
  const { voice = 'en-US-JennyNeural', speed = 1 } = options;

  const ssml = `<?xml version="1.0" encoding="utf-8"?>
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
  <voice name="${voice}">
    <prosody rate="${((speed - 1) * 100).toFixed(0)}%">
      ${text}
    </prosody>
  </voice>
</speak>`;

  const region = 'eastus';
  const res = await fetch(`https://${region}.tts.speech.azure.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'riff-48khz-192kbitrate-mono-mp3',
    },
    body: ssml,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Azure TTS error ${res.status}: ${errText}`);
  }

  const buffer = await res.arrayBuffer();
  return {
    audioBase64: Buffer.from(buffer).toString('base64'),
  };
}
