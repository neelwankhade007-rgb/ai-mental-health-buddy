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

app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

app.post("/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    // STEP 1: Detect mood from latest message
    const moodResponse = await openai.chat.completions.create({
      model: "meta-llama/llama-3-8b-instruct",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `Classify the user's mood into ONE word only: Happy, Sad, Stressed, Anxious, Neutral. Only return the word. No sentence.`,
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    const rawMood = moodResponse.choices[0].message.content.trim();
    const validMoods = ["Happy", "Sad", "Stressed", "Anxious", "Neutral"];
    const mood = validMoods.find((m) => rawMood.toLowerCase().includes(m.toLowerCase())) || "Neutral";

    // STEP 2: Build conversation messages with history
    const systemPrompt = {
      role: "system",
      content: `You are a warm, grounded AI mental health buddy named Vibe Catcher.

The user's current mood is: ${mood}.

Your rules:
- Keep replies SHORT — 2 to 4 sentences max. No long paragraphs.
- Speak like a caring, calm friend. Not a therapist. Not a romantic partner.
- If the mood is Sad or Anxious: be extra gentle, validate their feelings first before anything else.
- If the mood is Stressed: acknowledge it and offer one simple, practical grounding tip.
- If the mood is Happy: match their energy warmly and encourage them to keep going.
- If the mood is Neutral: be friendly and check in gently.
- If the user mentions self-harm, feeling hopeless, or being in crisis, respond with care and gently encourage them to reach out to a trusted person or a helpline (like iCall: 9152987821 for India).
- Use simple, everyday words. No jargon, no overly poetic language.
- Never give medical diagnoses or advice.`,
    };

    // Convert history to OpenAI message format
    const conversationHistory = history.map((msg) => ({
      role: msg.sender === "user" ? "user" : "assistant",
      content: msg.text,
    }));

    const chatResponse = await openai.chat.completions.create({
      model: "meta-llama/llama-3-8b-instruct",
      temperature: 0.7,
      messages: [
        systemPrompt,
        ...conversationHistory,
        { role: "user", content: message },
      ],
    });

    res.json({
      reply: chatResponse.choices[0].message.content,
      mood: mood,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      reply: "Something went wrong on my end. Please try again in a moment.",
      mood: "Neutral",
    });
  }
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
