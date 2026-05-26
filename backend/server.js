import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

if (!process.env.OPENROUTER_API_KEY) {
  console.warn("WARNING: OPENROUTER_API_KEY is missing from the environment variables (.env file)!");
}

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const VALID_MOODS = [
  "Happy", "Sad", "Stressed", "Anxious", "Neutral",
  "Love", "Motivated", "Lonely", "Overwhelmed", "Angry", "Grateful", "Tired",
];

app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

app.post("/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    console.log("Request received: message =", message);

    const conversationHistory = history
      .filter((msg) => !msg.loading)
      .map((msg) => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.text,
      }));

    const systemPrompt = `You are Vibe Catcher, a warm, grounded AI mental health buddy.

First, silently identify the user's mood from this list ONLY:
Happy, Sad, Stressed, Anxious, Neutral, Love, Motivated, Lonely, Overwhelmed, Angry, Grateful, Tired

IMPORTANT: Your ENTIRE response must start with "MOOD:" on the very first line. No preamble, no intro text before it.

You MUST respond in this EXACT plain-text format:
MOOD: <MoodFromList>
REPLY: <your reply>

Example:
MOOD: Anxious
REPLY: That sounds really overwhelming. Take one slow breath — you don't have to figure it all out right now.

Tone rules per mood:
- Happy / Motivated / Grateful → match energy warmly, celebrate, keep upbeat
- Sad / Lonely → extra gentle, validate feelings first, no quick-fix advice
- Anxious / Overwhelmed / Stressed → acknowledge fully, ONE simple grounding tip max
- Angry → don't dismiss, acknowledge frustration with empathy
- Love → warm and caring, celebrate the feeling
- Tired → soft and low-energy, validate rest, no "just push through" energy
- Neutral → friendly check-in, curious tone

Reply rules (apply to ALL moods):
- 2-4 sentences max. Speak like a caring calm friend, no jargon.
- If user mentions self-harm, hopelessness or crisis → respond with care and gently suggest iCall: 9152987821.
- Never give medical diagnoses or advice.
- NEVER use markdown like **bold** or *italic* in your reply.`;

    let stream;
    try {
      stream = await openai.chat.completions.create({
        model: "google/gemini-2.0-flash-exp:free",
        temperature: 0.7,
        max_tokens: 300,
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory,
          { role: "user", content: message },
        ],
      });
      console.log("Stream started with model: google/gemini-2.0-flash-exp:free");
    } catch (error) {
      console.error("Gemini model failed:", error.message);
      throw new Error("AI model failed to respond. Check your OPENROUTER_API_KEY.");
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let buffer = "";
    let moodExtracted = false;
    let mood = "Neutral";
    let replyText = "";

    try {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? "";
        if (!delta) continue;

        if (!moodExtracted) {
          buffer += delta;

          const match = buffer.match(/MOOD:\s*([A-Za-z]+)\s*\n?\s*REPLY:\s*([\s\S]*)/i);
          if (match) {
            mood = match[1].trim();
            if (!VALID_MOODS.includes(mood)) mood = "Neutral";
            moodExtracted = true;

            const initialReplyText = match[2];
            if (initialReplyText) {
              replyText += initialReplyText;
              res.write(`data: ${JSON.stringify({ delta: initialReplyText, mood })}\n\n`);
            } else {
              res.write(`data: ${JSON.stringify({ delta: "", mood })}\n\n`);
            }
          } else if (buffer.length > 80) {
            // Failsafe: Gemini ignored the format — strip labels and stream raw
            console.warn("Gemini ignored format instructions, falling back to raw output.");
            const moodOnlyMatch = buffer.match(/MOOD:\s*([A-Za-z]+)/i);
            if (moodOnlyMatch) {
              mood = moodOnlyMatch[1].trim();
              if (!VALID_MOODS.includes(mood)) mood = "Neutral";
            }
            replyText = buffer
              .replace(/MOOD:\s*[A-Za-z]+\s*/i, "")
              .replace(/REPLY:\s*/i, "")
              .trim();
            moodExtracted = true;
            res.write(`data: ${JSON.stringify({ delta: replyText, mood })}\n\n`);
          }
        } else {
          replyText += delta;
          res.write(`data: ${JSON.stringify({ delta })}\n\n`);
        }
      }

      // Edge case: stream ended before mood was extracted (very short response)
      if (!moodExtracted && buffer.length > 0) {
        const fallbackMatch = buffer.match(/MOOD:\s*([A-Za-z]+)/i);
        if (fallbackMatch) {
          mood = fallbackMatch[1].trim();
          if (!VALID_MOODS.includes(mood)) mood = "Neutral";
          replyText = buffer
            .replace(/MOOD:\s*[A-Za-z]+\s*/i, "")
            .replace(/REPLY:\s*/i, "")
            .trim();
        } else {
          replyText = buffer.trim();
        }
        res.write(`data: ${JSON.stringify({ delta: replyText, mood })}\n\n`);
      }
    } catch (streamError) {
      console.error("Error during streaming:", streamError);
      res.write(`data: ${JSON.stringify({ delta: "\n[Connection interrupted]", error: true })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ done: true, mood, reply: replyText })}\n\n`);
    res.end();
  } catch (error) {
    console.error("Top-level endpoint error:", error);

    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ done: true, mood: "Neutral", reply: "Something went wrong. Please try again 🥺" })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});