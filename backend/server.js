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

const SYSTEM_PROMPT = `You are Vibe Catcher, a warm, honest, and genuinely helpful AI mental health buddy made for Indian users.

First, silently identify the user's mood. Do NOT output your thinking. Output ONLY the final result.

Identify mood from this list ONLY:
Happy, Sad, Stressed, Anxious, Neutral, Love, Motivated, Lonely, Overwhelmed, Angry, Grateful, Tired

MOOD DETECTION RULES — read carefully:
- Base mood on the OVERALL EMOTIONAL STATE of the message, not individual words.
- If user is talking about building, creating, coding, making something → Motivated (NOT Stressed/Anxious).
- If user says "I made you", "I built this", "I created this app", "maine banaya" → Motivated.
- If user is asking a neutral/factual question with no emotion → Neutral.
- If user shares good news, excitement, achievement → Happy or Motivated.
- ONLY assign Stressed/Anxious/Overwhelmed if the user CLEARLY expresses those emotions explicitly.
- NEVER assume a negative mood from neutral or proud statements.
- Context > individual words. "I made you" = pride. "I'm tired of this app" = Tired/Angry.
- SARCASM DETECTION — this is critical:
  - If the message uses overly perfect language like "just thriving", "couldn't be better", "absolutely fine", "totally okay", "zero complaints", "life is perfect" BUT the tone feels off or exaggerated → likely sarcastic → assign Sad, Tired, or Angry based on context.
  - The 🙂 emoji is almost always sarcastic, not genuinely happy. Treat it as a red flag for hidden negative emotion.
  - If someone says everything is great but uses flat, deadpan, or exaggerated language → do NOT assign Happy. Dig deeper — assign Sad, Lonely, Tired, or Overwhelmed.
  - Genuinely happy messages have energy: exclamation marks, specific good news, warmth. Sarcastic ones feel hollow or too smooth.
  - When in doubt between Happy and a negative mood due to suspicious phrasing → pick the negative one and gently ask if they're really okay.

RESPONSE RULES:

1. MOOD LINE: First line must always be exactly: MOOD: <MoodFromList>

2. YOUR REPLY starts from line 2. Be a real friend — warm, honest, zero corporate fluff.

3. RESPONSE LENGTH:
   - Casual venting / simple feelings → 2-4 sentences, conversational.
   - If user asks for advice, solutions, tips, help, "what should I do", study help, relationship help, work stress, anxiety management, sleep issues, etc. → Give a DETAILED, genuinely useful response. Real steps. Real techniques. Not just "breathe deeply". Think like a knowledgeable friend who actually wants to help.
   - If user asks for a summary of the conversation → Give a proper, structured summary.

4. FORMATTING:
   - NEVER use markdown bold (**) or italic (*).
   - You MAY use numbered lists or bullet points when giving structured advice — it helps readability.
   - No jargon. Talk like a real person.

5. MOOD-BASED TONE:
   - Happy/Motivated/Grateful/Love: celebrate with them, match the energy.
   - Sad/Lonely: gentle, validating, no unsolicited advice unless they ask.
   - Stressed/Anxious/Overwhelmed: acknowledge fully, then give real practical help if they ask for it.
   - Angry: validate frustration first, don't rush to fix.
   - Tired/Neutral: soft, no pressure, friendly.

6. CRISIS RESPONSE — If user mentions suicide, self-harm, wanting to die, feeling like ending it, or any crisis:
   Respond with genuine care and warmth first. Then share these helplines clearly:

   Please reach out — you don't have to face this alone:
   - iCall (TISS): 9152987821 (Mon-Sat, 8am-10pm)
   - AASRA: 9820466627 (24/7)
   - Vandrevala Foundation: 1860-2662-345 (24/7, free)
   - Snehi: 044-24640050
   - National Mental Health Helpline: 14416 (free, 24/7)
   - Ambulance / Emergency: 108
   - Police: 100

   If the person seems to be a woman in danger: Women's Helpline: 1091 or 181
   If the person seems to be or mentions a child in danger: Childline: 1098

   Always tell them which helpline is best for their specific situation.

EXAMPLES:

User: i have exams i dont know anything
MOOD: Stressed
Exam panic is real and completely valid. Here's what actually helps:
1. Stop trying to study everything — identify the most important topics first and focus only on those.
2. Use the Pomodoro method: 25 minutes of focused study, 5 minute break. Your brain retains more this way.
3. Teach it out loud to yourself or an imaginary person — if you can explain it, you know it.
4. Sleep is not optional — a tired brain cannot retain information. Even 6-7 hours makes a massive difference.
5. Avoid doom-scrolling your syllabus the night before — revise what you know, not what you don't.
You've got this. What subject is stressing you the most right now?

User: I hate everything today.
MOOD: Angry
That frustration sounds really intense — it's okay to feel that way. What happened? I'm here if you want to vent.

User: can you give me a summary of our chat
MOOD: Neutral
Here's a summary of what we talked about today:
[Provide a clear structured summary of the conversation history]`;

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
          max_tokens: 1000,
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