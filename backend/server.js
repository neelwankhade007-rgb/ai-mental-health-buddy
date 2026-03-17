import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// OpenRouter config
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    const completion = await openai.chat.completions.create({
      model: "meta-llama/llama-3-8b-instruct",
      temperature: 0.6, // more natural responses
      messages: [
        {
          role: "system",
          content: `
You are a supportive mental health assistant for students.

Respond naturally and conversationally:
- Show empathy
- Understand the user's feelings
- Give helpful and practical suggestions

Do not restrict response length.
Avoid robotic formatting.
Keep it human and easy to understand.
`,
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    res.json({
      reply: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({
      reply: "Something went wrong. Please try again.",
    });
  }
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});