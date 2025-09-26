import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Content } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not set in .env file");
}

const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

export async function getChatResponse(history: Content[], newMessage: string): Promise<string> {
  try {
    const contents: Content[] = [
        ...history, 
        { role: 'user', parts: [{ text: newMessage }] }
    ];

    const result = await model.generateContent({
        contents,
        generationConfig,
        safetySettings,
    });
    
    return result.response.text();
  } catch (error) {
    console.error("Error getting response from Gemini:", error);
    throw new Error("Failed to get response from AI model.");
  }
}

export async function getTitleForConversation(firstMessage: string): Promise<string> {
    try {
        const prompt = `Generate a short, concise title (4-5 words max) for a conversation that starts with this message: "${firstMessage}". Just return the title, nothing else.`;
        const result = await model.generateContent(prompt);
        return result.response.text().replace(/"/g, '').trim();
    } catch (error) {
        console.error("Error generating title:", error);
        return "New Chat";
    }
}