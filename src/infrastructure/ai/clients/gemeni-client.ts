import { GoogleGenAI } from "@google/genai";

export function createGemeniClient({ API_KEY }: { API_KEY: string }) {
  const ai = new GoogleGenAI({
    apiKey: API_KEY,
  });

  return ai;
}
