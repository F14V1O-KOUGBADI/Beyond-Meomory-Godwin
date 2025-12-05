import { GoogleGenAI, Type } from "@google/genai";
import { GeminiModel } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Analyzes a memory text to extract emotions and themes.
 */
export const analyzeMemory = async (text: string): Promise<{ emotions: string[], themes: string[] }> => {
  try {
    const response = await ai.models.generateContent({
      model: GeminiModel.TEXT,
      contents: `Analyze the following memory and extract:
      1. Emotions: A list of 1-3 concise emotional keywords (e.g., Nostalgia, Joy, Regret).
      2. Themes: A list of 1-3 concise thematic keywords (e.g., Family, Travel, Childhood).
      
      Memory: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            emotions: { type: Type.ARRAY, items: { type: Type.STRING } },
            themes: { type: Type.ARRAY, items: { type: Type.STRING } },
          }
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return {
      emotions: result.emotions || ['Neutral'],
      themes: result.themes || ['Life']
    };
  } catch (error) {
    console.error("Analysis failed", error);
    return { emotions: ['Unanalyzed'], themes: ['Memory'] };
  }
};

/**
 * Legacy Advisor Chat
 */
export const askLegacyAdvisor = async (history: {role: string, parts: {text: string}[]}[], newMessage: string) => {
  try {
    const chat = ai.chats.create({
      model: GeminiModel.TEXT,
      config: {
        systemInstruction: "You are the 'Legacy Advisor', a wise, philosophical, and empathetic AI dedicated to helping users preserve their digital legacy and memories in the Metaverse. Speak with an elegant, timeless tone. Encourage reflection on life, values, and what they wish to leave behind. Keep responses concise but profound, suitable for a digital manuscript."
      },
      history: history
    });

    const result = await chat.sendMessage({ message: newMessage });
    return result.text;
  } catch (error) {
    console.error("Advisor failed", error);
    return "The mists of time obscure my vision... Please try again.";
  }
};
