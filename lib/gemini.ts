import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not set.');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function getChatResponse(history: any[], message: string, systemInstruction: string): Promise<string> {
  try {
    const chat = model.startChat({
      history,
      generationConfig: {
        maxOutputTokens: 2000,
      },
      systemInstruction: {
        role: "system",
        parts: [{ text: systemInstruction }]
      }
    });

    const result = await chat.sendMessage(message);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error("Error getting chat response from Gemini:", error);
    return "Sorry, I encountered an error while processing your request.";
  }
}

export async function getTitleForConversation(firstMessage: string): Promise<string> {
    try {
        const prompt = `Generate a short, concise title (4 words max) for a conversation that starts with this message: "${firstMessage}"`;
        const result = await model.generateContent(prompt);
        const response = result.response;
        let title = response.text().trim().replace(/"/g, '');
        if (title.length > 50) {
            title = title.substring(0, 47) + '...';
        }
        return title;
    } catch (error) {
        console.error("Error generating title with Gemini:", error);
        return "New Chat";
    }
}