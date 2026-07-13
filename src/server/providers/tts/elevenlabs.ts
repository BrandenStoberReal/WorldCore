export async function synthesizeElevenLabs(
  text: string,
  apiKey: string,
  options: {
    voice?: string;
    model?: string;
    speed?: number;
  },
): Promise<{ audioBase64: string; duration?: number }> {
  const { voice = "21m00Tcm4TlvDq8ikWAM", model = "eleven_monolingual_v1" } = options;

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: model,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ElevenLabs TTS error ${res.status}: ${errText}`);
  }

  const buffer = await res.arrayBuffer();
  return {
    audioBase64: Buffer.from(buffer).toString("base64"),
  };
}
