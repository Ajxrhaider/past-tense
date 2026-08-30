import { ElevenLabsClient } from "elevenlabs";

const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });

export async function POST(req: Request) {
  try {
    const { text, voiceId } = await req.json();

    // Fallback to Adam's voice ID if the persona's string is empty or invalid
    const targetVoice = voiceId?.trim() ? voiceId : "pNInz6obpgDQGcFmaJcg";

    const audioStream = await client.textToSpeech.convertAsStream(targetVoice, {
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    });

    return new Response(audioStream as any, {
      headers: { "Content-Type": "audio/mpeg" },
    });
  } catch (error) {
    console.error("TTS Error:", error);
    return new Response(JSON.stringify({ error: "Voice synthesis failed" }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}