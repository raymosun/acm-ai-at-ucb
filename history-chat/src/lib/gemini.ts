import { GenerativeModel, GoogleGenerativeAI } from "@google/generative-ai";
import { DIALOGUE_SYSTEM_INSTRUCTION, SETTING_SYSTEM_INSTRUCTION } from "./prompts";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_API_KEY);


const settingModel = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
        responseMimeType: "application/json"
    },
    systemInstruction: SETTING_SYSTEM_INSTRUCTION
});

const dialogueModel = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig: {
      responseMimeType: "application/json"
  },
  systemInstruction: DIALOGUE_SYSTEM_INSTRUCTION
});

// Send a prompt
export const promptModel = async (model: GenerativeModel, prompt: string) => {
  try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = await response.text();
      return text;
  } catch (error) {
      console.error("Error prompting Gemini:", error);
  }
};

export const getSetting = (prompt: string) => {
  return promptModel(settingModel, prompt);
}

export const getDialogue = (prompt: string) => {
  return promptModel(dialogueModel, prompt);
}