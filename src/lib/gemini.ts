import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const getJournalPrompt = async (mood?: string) => {
  const model = "gemini-3-flash-preview";
  const prompt = mood 
    ? `Generate a gentle, supportive journaling prompt for someone feeling ${mood}. Keep it short and comforting.`
    : "Generate a daily self-care journaling prompt for a woman. Focus on gratitude, self-love, or mindfulness.";
  
  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: "You are LittleBabli, a warm and supportive emotional companion for women. Your tone is soft, non-judgmental, and comforting.",
      }
    });
    return response.text || "What's on your mind today, dear?";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "How are you feeling today?";
  }
};

export const analyzeEmotionalTone = async (content: string) => {
  const model = "gemini-3-flash-preview";
  const prompt = `Analyze the emotional tone of this journal entry: "${content}". Provide a short, supportive summary and suggest a self-care action. Return as JSON with keys: "tone", "summary", "suggestion".`;
  
  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are a supportive emotional companion. Analyze the tone and provide gentle feedback.",
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
};
