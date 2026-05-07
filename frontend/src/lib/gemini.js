import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn('Missing Gemini API Key. Ensure VITE_GEMINI_API_KEY is set in .env.local.')
}

const genAI = new GoogleGenerativeAI(apiKey || 'placeholder-api-key');
export const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
