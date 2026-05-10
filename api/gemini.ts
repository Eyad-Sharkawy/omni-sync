import { config as loadEnv } from "dotenv";
import { GoogleGenAI } from "@google/genai";

loadEnv();

type JsonBody = {
  prompt?: unknown;
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body: JsonBody =
    typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body ?? {});
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt" });
  }

  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    return res.status(500).json({
      error: "Server is missing GEMINI_API_KEY. Set it in your Vercel/local env.",
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return res.status(200).json({ text: response.text ?? "" });
  } catch (error) {
    console.error("Gemini API request failed:", error);
    return res.status(500).json({ error: "Gemini request failed" });
  }
}
