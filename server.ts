import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: GoogleGenAI | null = null;

// In-memory cache for synthesized audio to minimize API quota consumption
const audioCache = new Map<string, string>();

// Hard Cost & Bill Protection Shield (Max budget ceiling)
const MAX_MONTHLY_ESTIMATED_COST_INR = 2000; // Hard limit: budget protection
const COST_PER_CHARACTER_INR = 0.0001; // Approximate Gemini Flash TTS cost per char in INR
let totalAccumulatedSpentINR = 0;
let requestCountToday = 0;
const MAX_DAILY_REQUESTS_CAP = 5000; // Daily maximum requests cap

// IP-based Rate Limiter (Max 100 requests per 10 minutes per IP)
const ipRequestHistory = new Map<string, { count: number; firstRequestTime: number }>();

function checkRateLimitAndBudget(clientIp: string, textLength: number): { allowed: boolean; reason?: string } {
  const estimatedCostForThis = textLength * COST_PER_CHARACTER_INR;

  // 1. Hard Budget Protection
  if (totalAccumulatedSpentINR + estimatedCostForThis > MAX_MONTHLY_ESTIMATED_COST_INR) {
    return {
      allowed: false,
      reason: `Monthly safety budget limit reached.`,
    };
  }

  // 2. Daily Total Request Cap Protection
  if (requestCountToday >= MAX_DAILY_REQUESTS_CAP) {
    return {
      allowed: false,
      reason: `Daily Maximum Generation Limit reached (${MAX_DAILY_REQUESTS_CAP} reqs).`,
    };
  }

  // 3. Client IP Anti-Abuse Rate Limiter (100 reqs / 10 mins)
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const maxReqsPerWindow = 100;

  const record = ipRequestHistory.get(clientIp) || { count: 0, firstRequestTime: now };

  if (now - record.firstRequestTime > windowMs) {
    record.count = 1;
    record.firstRequestTime = now;
  } else {
    record.count += 1;
    if (record.count > maxReqsPerWindow) {
      return {
        allowed: false,
        reason: "Security Rate Limit: Too many requests from this device. Please wait 5-10 minutes.",
      };
    }
  }

  ipRequestHistory.set(clientIp, record);

  // Track consumption
  totalAccumulatedSpentINR += estimatedCostForThis;
  requestCountToday += 1;

  return { allowed: true };
}

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

/**
 * Converts raw PCM audio buffer into a valid standard RIFF WAV buffer
 */
function pcmToWavBuffer(
  pcmBuffer: Buffer,
  sampleRate: number = 24000,
  numChannels: number = 1,
  bitsPerSample: number = 16
): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  // RIFF chunk descriptor
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);

  // "fmt " sub-chunk
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  header.writeUInt16LE(numChannels, 22); // NumChannels (1 = Mono)
  header.writeUInt32LE(sampleRate, 24); // SampleRate (24000 Hz)
  header.writeUInt32LE(byteRate, 28); // ByteRate
  header.writeUInt16LE(blockAlign, 32); // BlockAlign
  header.writeUInt16LE(bitsPerSample, 34); // BitsPerSample (16 bits)

  // "data" sub-chunk
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

/**
 * Helper to extract rate limit retry duration if available
 */
function parseRetryDelay(errorMsg: string): number {
  const match = errorMsg.match(/retry in\s+([0-9.]+)\s*s/i) || errorMsg.match(/retryDelay"?:\s*"([0-9]+)s?"/i);
  if (match && match[1]) {
    return Math.ceil(parseFloat(match[1]));
  }
  return 20; // Default 20 second cooldown for free tier rate limit
}

// Voice resolution mapping with distinct voice models & vocal characteristics
const VOICE_RESOLVER: Record<string, { geminiVoice: string; language: string; promptGuide: string }> = {
  Ananya: {
    geminiVoice: "Kore",
    language: "Hindi",
    promptGuide: "Vocal Persona: Ananya (Female, Clear, Sweet Indian Hindi accent). High clarity, pleasant pitch. Critical: Pronounce every word strictly letter-by-letter as written without altering phonemes.",
  },
  Aarav: {
    geminiVoice: "Charon",
    language: "Hindi",
    promptGuide: "Vocal Persona: Aarav (Male, Deep Baritone Indian Hindi broadcaster). Resonant chest voice, authoritative and articulate tone. Strictly preserve exact phonetic spelling.",
  },
  Kavya: {
    geminiVoice: "Aoede",
    language: "Hindi",
    promptGuide: "Vocal Persona: Kavya (Female, Melodic, Poetic Hindi Storyteller). Soft, gentle, expressive storytelling inflection with pristine phonetic precision.",
  },
  Kore: {
    geminiVoice: "Kore",
    language: "English",
    promptGuide: "Vocal Persona: Kore (Female, Warm, Conversational American tone). Friendly, comforting, and natural.",
  },
  Puck: {
    geminiVoice: "Puck",
    language: "English",
    promptGuide: "Vocal Persona: Puck (Male, Youthful, High-Energy, Playful). Quick, enthusiastic, and vibrant pacing.",
  },
  Charon: {
    geminiVoice: "Charon",
    language: "English",
    promptGuide: "Vocal Persona: Charon (Male, Deep Cinematic Baritone). Slow, gravelly, dramatic documentary narration.",
  },
  Fenrir: {
    geminiVoice: "Fenrir",
    language: "English",
    promptGuide: "Vocal Persona: Fenrir (Male, Bold, Powerful, Commanding). Confident, intense, and authoritative delivery.",
  },
  Zephyr: {
    geminiVoice: "Zephyr",
    language: "English",
    promptGuide: "Vocal Persona: Zephyr (Female, Gentle, Whispering, Calming). Soft, meditative, airy, and soothing flow.",
  },
  Aoede: {
    geminiVoice: "Aoede",
    language: "English",
    promptGuide: "Vocal Persona: Aoede (Female, Sophisticated, Theatrical, Classical). Dramatic, expressive, and lyrical articulation.",
  },
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "text-to-speech-api", cacheEntries: audioCache.size });
  });

  // Single Speaker Text-to-Speech API
  app.post("/api/tts", async (req, res) => {
    try {
      const { text, voice = "Kore", style = "natural", speed = 1.0, emotion_strength = "neutral" } = req.body;

      if (!text || typeof text !== "string" || !text.trim()) {
        return res.status(400).json({ error: "Text is required for speech synthesis." });
      }

      // 🛡️ Bill Protection & Abuse Safety Check
      const clientIp = req.ip || (req.headers["x-forwarded-for"] as string) || "127.0.0.1";
      const safetyCheck = checkRateLimitAndBudget(clientIp, text.length);
      if (!safetyCheck.allowed) {
        return res.status(429).json({
          error: safetyCheck.reason,
          rateLimited: true,
          retryDelay: 30,
        });
      }

      const voiceConfig = VOICE_RESOLVER[voice] || { geminiVoice: "Kore", language: "English" };
      const selectedVoice = voiceConfig.geminiVoice;
      const isHindiVoice = voiceConfig.language === "Hindi" || /[\u0900-\u097F]/.test(text) || style === "hindi-shudh" || style === "hinglish-conversational";

      const cacheKey = `single:${voice}:${style}:${speed.toFixed(2)}:${emotion_strength}:${text.trim()}`;

      // Check in-memory cache to save API quota
      if (audioCache.has(cacheKey)) {
        const cachedAudio = audioCache.get(cacheKey)!;
        return res.json({
          success: true,
          voice: voice,
          audioData: cachedAudio,
          format: "wav",
          sampleRate: 24000,
          cached: true,
          textLength: text.length,
        });
      }

      const ai = getAiClient();

      // Style and phonetic instruction enrichment
      let promptText = text.trim();

      // Explicit Exact Phonetic Directive for Hindi/Hinglish/Transliterated speech
      let phoneticInstruction = "";
      if (isHindiVoice || style === "hindi-shudh") {
        phoneticInstruction = `[Phonetic Accuracy Directive: Read the following text with exact letter-by-letter phonetic pronunciation. Do NOT autocorrect, substitute, or mispronounce words. Preserve distinct consonants and sounds precisely as spelled (e.g. pronounce 'zh' strictly as 'zh' with a voiced fricative sound and NOT as 'jh'; pronounce 'z' as 'z', 'kh' as 'kh', 'q' as 'q'). Accent: Authentic Indian Hindi / Hinglish.]\n`;
      }

      const styleDirectives: Record<string, string> = {
        "hindi-shudh": "Deliver with clear, precise Hindi diction and verbatim letter pronunciation: ",
        "hinglish-conversational": "Speak with a natural, modern urban Indian Hinglish conversational flow: ",
        cheerful: "Say cheerfully and with warm positive energy: ",
        storyteller: "Narrate this with captivating storytelling depth and expressive cadence: ",
        meditative: "Speak in a calm, soothing, mindful, relaxing whisper-soft cadence: ",
        dramatic: "Deliver this with dramatic, epic intensity and impactful presence: ",
        newscaster: "Broadcast this with clear, professional, authoritative broadcast tempo: ",
        whisper: "Speak this in a gentle, close-mic, intimate whisper: ",
        energetic: "Deliver this with high excitement, upbeat enthusiasm, and fast dynamism: ",
      };

      const directive = styleDirectives[style] || "";
      if (directive) {
        promptText = `${directive}${promptText}`;
      }

      // Emotional Intensity Modulation
      if (emotion_strength === "subtle") {
        promptText = `[Emotional Intensity: Subtle - speak with mild, nuanced, understated emotional restraint] ${promptText}`;
      } else if (emotion_strength === "expressive") {
        promptText = `[Emotional Intensity: Expressive - speak with dynamic emotion, heightened vocal energy, rich feeling, and dramatic inflection] ${promptText}`;
      } else if (emotion_strength === "neutral") {
        promptText = `[Emotional Intensity: Neutral - speak with balanced, steady, and natural inflection] ${promptText}`;
      }

      if (speed && speed !== 1.0) {
        if (speed > 1.2) {
          promptText = `[Speak at a swift, fast pace] ${promptText}`;
        } else if (speed < 0.85) {
          promptText = `[Speak at a slow, deliberate, relaxed pace] ${promptText}`;
        }
      }

      const personaGuide = (voiceConfig && 'promptGuide' in voiceConfig && voiceConfig.promptGuide) 
        ? `[${voiceConfig.promptGuide}]\n` 
        : '';
      const fullPrompt = `${personaGuide}${phoneticInstruction}${promptText}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: fullPrompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
      });

      const candidate = response.candidates?.[0];
      const audioPart = candidate?.content?.parts?.find((p) => p.inlineData?.data);

      if (!audioPart || !audioPart.inlineData?.data) {
        return res.status(500).json({
          error: "Failed to generate audio stream from speech model.",
          details: response.text || "No audio returned",
        });
      }

      const pcmRawBase64 = audioPart.inlineData.data;
      const pcmBuffer = Buffer.from(pcmRawBase64, "base64");
      const wavBuffer = pcmToWavBuffer(pcmBuffer, 24000, 1);
      const wavBase64 = wavBuffer.toString("base64");
      const fullAudioDataUri = `data:audio/wav;base64,${wavBase64}`;

      // Store in memory cache
      audioCache.set(cacheKey, fullAudioDataUri);

      return res.json({
        success: true,
        voice: voice,
        audioData: fullAudioDataUri,
        format: "wav",
        sampleRate: 24000,
        textLength: text.length,
      });
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const isRateLimit =
        err?.status === "RESOURCE_EXHAUSTED" ||
        err?.status === 429 ||
        err?.code === 429 ||
        errMsg.includes("429") ||
        errMsg.includes("RESOURCE_EXHAUSTED") ||
        errMsg.includes("quota") ||
        errMsg.includes("rate-limits");

      if (isRateLimit) {
        const retrySecs = parseRetryDelay(errMsg);
        console.warn(`[TTS Rate Limited] Free tier quota cooling down. Retry in ~${retrySecs}s.`);
        return res.status(429).json({
          error: `API rate limit reached (Free tier: 3 requests/min).`,
          rateLimited: true,
          retryDelay: retrySecs,
          fallbackAvailable: true,
        });
      }

      console.error("TTS generation error:", err);
      return res.status(500).json({
        error: errMsg || "Failed to generate speech audio.",
      });
    }
  });

  // Multi-Speaker Dialogue Text-to-Speech API
  app.post("/api/tts-dialogue", async (req, res) => {
    try {
      const { lines, speakerAVoice = "Ananya", speakerBVoice = "Aarav" } = req.body;

      if (!Array.isArray(lines) || lines.length === 0) {
        return res.status(400).json({ error: "Lines array is required for dialogue TTS." });
      }

      // 🛡️ Bill Protection & Abuse Safety Check
      const totalChars = lines.reduce((acc: number, l: any) => acc + (l.text?.length || 0), 0);
      const clientIp = req.ip || (req.headers["x-forwarded-for"] as string) || "127.0.0.1";
      const safetyCheck = checkRateLimitAndBudget(clientIp, totalChars);
      if (!safetyCheck.allowed) {
        return res.status(429).json({
          error: safetyCheck.reason,
          rateLimited: true,
          retryDelay: 30,
        });
      }

      const resolvedVoiceA = VOICE_RESOLVER[speakerAVoice]?.geminiVoice || "Kore";
      const resolvedVoiceB = VOICE_RESOLVER[speakerBVoice]?.geminiVoice || "Puck";

      const scriptFormatted = lines
        .map((line: any) => {
          const speakerName = line.speaker === "Speaker A" ? "Alex" : "Jordan";
          return `${speakerName}: ${line.text}`;
        })
        .join("\n");

      const cacheKey = `dialogue:${speakerAVoice}:${speakerBVoice}:${scriptFormatted}`;
      if (audioCache.has(cacheKey)) {
        return res.json({
          success: true,
          speakerAVoice,
          speakerBVoice,
          audioData: audioCache.get(cacheKey)!,
          format: "wav",
          sampleRate: 24000,
          cached: true,
        });
      }

      const ai = getAiClient();
      const prompt = `TTS the following conversational dialogue between Alex and Jordan naturally with realistic conversational timing. Pronounce all words and Hindi/Hinglish terms accurately letter-by-letter exactly as written:\n${scriptFormatted}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              multiSpeakerVoiceConfig: {
                speakerTurns: [
                  {
                    speaker: "Alex",
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: resolvedVoiceA },
                    },
                  },
                  {
                    speaker: "Jordan",
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: resolvedVoiceB },
                    },
                  },
                ],
              },
            } as any,
          },
        },
      });

      const candidate = response.candidates?.[0];
      const audioPart = candidate?.content?.parts?.find((p) => p.inlineData?.data);

      if (!audioPart || !audioPart.inlineData?.data) {
        return res.status(500).json({
          error: "Failed to generate dialogue audio stream from speech model.",
          details: response.text || "No audio returned",
        });
      }

      const pcmRawBase64 = audioPart.inlineData.data;
      const pcmBuffer = Buffer.from(pcmRawBase64, "base64");
      const wavBuffer = pcmToWavBuffer(pcmBuffer, 24000, 1);
      const wavBase64 = wavBuffer.toString("base64");
      const fullAudioDataUri = `data:audio/wav;base64,${wavBase64}`;

      audioCache.set(cacheKey, fullAudioDataUri);

      return res.json({
        success: true,
        speakerAVoice,
        speakerBVoice,
        audioData: fullAudioDataUri,
        format: "wav",
        sampleRate: 24000,
      });
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const isRateLimit =
        err?.status === "RESOURCE_EXHAUSTED" ||
        err?.status === 429 ||
        err?.code === 429 ||
        errMsg.includes("429") ||
        errMsg.includes("RESOURCE_EXHAUSTED") ||
        errMsg.includes("quota") ||
        errMsg.includes("rate-limits");

      if (isRateLimit) {
        const retrySecs = parseRetryDelay(errMsg);
        console.warn(`[TTS Dialogue Rate Limited] Free tier quota cooling down. Retry in ~${retrySecs}s.`);
        return res.status(429).json({
          error: `API rate limit reached (Free tier: 3 requests/min).`,
          rateLimited: true,
          retryDelay: retrySecs,
          fallbackAvailable: true,
        });
      }

      console.error("Dialogue TTS generation error:", err);
      return res.status(500).json({
        error: errMsg || "Failed to generate dialogue audio.",
      });
    }
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`TTS Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
