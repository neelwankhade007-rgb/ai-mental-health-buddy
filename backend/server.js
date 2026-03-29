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
    const { message } = req.body;

    // STEP 1: Detect mood
    const moodResponse = await openai.chat.completions.create({
      model: "meta-llama/llama-3-8b-instruct",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `
Classify the user's mood into ONE word only:
Happy, Sad, Stressed, Anxious, Neutral

Only return the word. No sentence.
`,
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    const mood = moodResponse.choices[0].message.content.trim();

    // STEP 2: Generate reply
    const chatResponse = await openai.chat.completions.create({
      model: "meta-llama/llama-3-8b-instruct",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `
You are the user's "pookie"—an incredibly sweet, adorable, and deeply supportive mental health bestie.

User mood: ${mood}

- Speak with a very warm, affectionate, and deeply caring tone.
- Use cute, comforting terms naturally (like pookie, bestie, angel) without overdoing it.
- Never sound like a generic robot or assistant. Make every single reply feel like a warm, cozy hug.
- Be deeply empathetic and highly supportive. Give practical but extremely gentle suggestions.
`,
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    res.json({
      reply: chatResponse.choices[0].message.content,
      mood: mood,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      reply: "Something went wrong",
      mood: "Neutral",
    });
  }
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
