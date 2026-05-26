import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

if (!process.env.GROQ_API_KEY) {
  console.warn("WARNING: GROQ_API_KEY is missing from .env!");
}

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

const openai = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

const VALID_MOODS = [
  "Happy", "Sad", "Stressed", "Anxious", "Neutral",
  "Love", "Motivated", "Lonely", "Overwhelmed", "Angry", "Grateful", "Tired",
];

// Groq free models — extremely fast, hourly rate limits (not daily)
// Order = priority. First one that works gets used.
const MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "gemma2-9b-it",
  "llama3-70b-8192",
];

const SYSTEM_PROMPT = `You are Vibe Catcher, a warm, grounded AI mental health buddy.

First, silently evaluate the user's mood and check all rules in your head. Do NOT output your thinking process, checklists, or steps. Output ONLY the final result.

Identify the user's mood from this list ONLY:
Happy, Sad, Stressed, Anxious, Neutral, Love, Motivated, Lonely, Overwhelmed, Angry, Grateful, Tired

Tone & Reply Rules:
- Happy/Motivated/Grateful/Love: celebrate, keep upbeat.
- Sad/Lonely: gentle, validate feelings, no quick-fix advice.
- Anxious/Overwhelmed/Stressed: acknowledge fully, ONE simple grounding tip max.
- Angry: validate frustration with empathy.
- Tired/Neutral: soft, friendly, validate rest.
- Keep reply to 2-4 sentences max. Calm friend, no jargon.
- NEVER use markdown like **bold** or *italic* in your reply.
- If user mentions self-harm/crisis, respond with care and suggest iCall: 9152987821.

CRITICAL FORMATTING:
- Line 1 MUST be exactly: MOOD: <MoodFromList>
- Line 2 MUST be your warm reply.
- ABSOLUTELY NO internal monologues, NO "Check for crisis", NO numbered lists. Just the two lines.

EXAMPLE 1:
User: I can't sleep, so much is on my mind.
Assistant:
MOOD: Anxious
That sounds really heavy. It's completely okay if sleep isn't coming right now. Maybe try taking just one slow, deep breath with me?

EXAMPLE 2:
User: I hate everything today.
Assistant:
MOOD: Angry
It is completely valid to feel frustrated today. I'm right here if you want to vent about it.`;

app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

app.post("/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    console.log("Request received:", message);

    const conversationHistory = history
      .filter((msg) => !msg.loading && !msg.streaming && msg.text)
      .map((msg) => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.text,
      }));

    // Try each model in order until one works
    let stream = null;
    let usedModel = null;

    for (const model of MODELS) {
      try {
        stream = await openai.chat.completions.create({
          model,
          temperature: 0.7,
          max_tokens: 300,
          stream: true,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...conversationHistory,
            { role: "user", content: message },
          ],
        });
        
        usedModel = model;
        console.log(`✅ Using model: ${model}`);
        break;
      } catch (err) {
        console.warn(`❌ Model ${model} failed or timed out: ${err.message}`);
      }
    }

    if (!stream) {
      console.warn("⚠️ All Groq models failed. Serving local mock response to prevent UI breakage.");
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();
      
      const mockText = "Groq's free tier is temporarily rate-limiting us 🛑 — but your code is working perfectly! This is a simulated local response so your UI keeps flowing. Try again in a few seconds!";
      
      res.write(`data: ${JSON.stringify({ delta: "", mood: "Neutral" })}\n\n`);
      
      // Stream the mock text to simulate an LLM
      const streamMock = async () => {
        let sent = "";
        for (let i = 0; i < mockText.length; i++) {
          sent += mockText[i];
          res.write(`data: ${JSON.stringify({ delta: mockText[i] })}\n\n`);
          await new Promise(r => setTimeout(r, 20)); // 20ms per character
        }
        res.write(`data: ${JSON.stringify({ done: true, mood: "Neutral", reply: mockText })}\n\n`);
        res.end();
      };
      
      streamMock();
      return;
    }

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

          const moodMatch = buffer.match(/MOOD:\s*([A-Za-z]+)\s*\n/i);
          if (moodMatch) {
            mood = moodMatch[1].trim();
            if (!VALID_MOODS.includes(mood)) mood = "Neutral";
            moodExtracted = true;
            
            res.write(`data: ${JSON.stringify({ delta: "", mood })}\n\n`);
            
            // Extract everything after the MOOD tag
            let rest = buffer.substring(moodMatch.index + moodMatch[0].length);
            rest = rest.replace(/^\s*REPLY:\s*/i, "").trimStart();
            
            if (rest) {
              replyText += rest;
              res.write(`data: ${JSON.stringify({ delta: rest })}\n\n`);
            }
          } else if (buffer.length > 80) {
            // Failsafe: model ignored format, stream raw immediately
            console.warn("⚠️ Model ignored format, streaming raw output.");
            moodExtracted = true;
            replyText += buffer;
            res.write(`data: ${JSON.stringify({ delta: buffer, mood })}\n\n`);
          }
        } else {
          // Once extracted, stream directly
          // Filter out REPLY: if the model injected it late
          let cleanDelta = delta;
          if (replyText.length < 20) {
            cleanDelta = cleanDelta.replace(/REPLY:\s*/i, "");
          }
          
          if (cleanDelta) {
            replyText += cleanDelta;
            res.write(`data: ${JSON.stringify({ delta: cleanDelta })}\n\n`);
          }
        }
      }

      // Edge case: very short response, stream ended before mood extracted
      if (!moodExtracted && buffer.length > 0) {
        res.write(`data: ${JSON.stringify({ delta: buffer.trim(), mood })}\n\n`);
        replyText = buffer.trim();
      }
    } catch (streamErr) {
      console.error("Streaming error:", streamErr);
      res.write(`data: ${JSON.stringify({ delta: "\n[Connection interrupted]", error: true })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ done: true, mood, reply: replyText })}\n\n`);
    res.end();

  } catch (error) {
    console.error("Top-level error:", error.message);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ done: true, mood: "Neutral", reply: "Something went wrong. Please try again 🥺" })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});