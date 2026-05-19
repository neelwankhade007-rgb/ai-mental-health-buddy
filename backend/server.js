import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

// OpenRouter setup
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Valid moods — expanded set
const VALID_MOODS = [
  "Happy", "Sad", "Stressed", "Anxious", "Neutral",
  "Love", "Motivated", "Lonely", "Overwhelmed", "Angry", "Grateful", "Tired",
];

app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

// ── Streaming chat endpoint ──────────────────────────────────────────────────
app.post("/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    // Convert history to OpenAI message format (exclude loading placeholders)
    const conversationHistory = history
      .filter((msg) => !msg.loading)
      .map((msg) => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.text,
      }));

    // Single call: detect mood AND generate reply together.
    // Asking the model to respond in a structured format removes the need
    // for a second round-trip, cutting latency roughly in half.
    const systemPrompt = `You are Vibe Catcher, a warm, grounded AI mental health buddy.

First, silently identify the user's mood from this list ONLY:
Happy, Sad, Stressed, Anxious, Neutral, Love, Motivated, Lonely, Overwhelmed, Angry, Grateful, Tired

Then respond ONLY with a valid JSON object (no markdown, no backticks) in this exact shape:
{"mood":"<MoodFromList>","reply":"<your reply>"}

Tone rules per mood:
- Happy / Motivated / Grateful → match their energy warmly, celebrate with them, keep it upbeat
- Sad / Lonely → be extra gentle, validate feelings first, no quick-fix advice
- Anxious / Overwhelmed / Stressed → acknowledge it fully, offer ONE simple grounding tip max
- Angry → don't dismiss or argue, acknowledge the frustration with empathy
- Love → be warm and caring, celebrate the feeling, ask who or what they're loving
- Tired → be soft and low-energy, validate rest, no "just push through" energy
- Neutral → friendly check-in, curious tone

Reply rules (apply to ALL moods):
- 2–4 sentences max. SHORT. No long paragraphs.
- Speak like a caring, calm friend — not a therapist, not a romantic partner.
- Simple everyday words. No jargon or overly poetic language.
- If user mentions self-harm, hopelessness, or crisis → respond with care and gently suggest iCall: 9152987821 (India).
- Never give medical diagnoses or advice.`;

    // ── Streaming response ──────────────────────────────────────────────────
    // Set SSE headers so the client can receive chunks as they arrive
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await openai.chat.completions.create({
      // 70B gives dramatically better emotional tone than 8B.
      // Still free on OpenRouter. Swap to "anthropic/claude-haiku-4-5"
      // for even better quality if you add a paid key.
      model: "anthropic/claude-haiku-4.5",
      temperature: 0.75,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: message },
      ],
    });

    let fullText = "";

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (delta) {
        fullText += delta;
        // Stream raw delta to client so UI can show typing in real time
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
    }

    // Once stream is complete, parse the JSON and send the final structured event
    let mood = "Neutral";
    let reply = fullText.trim();

    try {
      // Strip possible markdown fences just in case
      const clean = fullText.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      mood = VALID_MOODS.includes(parsed.mood) ? parsed.mood : "Neutral";
      reply = parsed.reply ?? reply;
    } catch {
      // Model didn't return valid JSON — use raw text as reply
      mood = "Neutral";
    }

    // Send a final "done" event with the structured data
    res.write(`data: ${JSON.stringify({ done: true, mood, reply })}\n\n`);
    res.end();
  } catch (error) {
    console.error(error);
    // If headers already sent (streaming started), send error event
    if (!res.headersSent) {
      res.status(500).json({
        reply: "Something went wrong on my end. Please try again in a moment.",
        mood: "Neutral",
      });
    } else {
      res.write(`data: ${JSON.stringify({ done: true, mood: "Neutral", reply: "Something went wrong. Please try again 🥺" })}\n\n`);
      res.end();
    }
  }
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});