import { GoogleGenAI } from "@google/genai";
import { Attendee } from "../types";

export const generateMusicalReflection = async (attendees: Attendee[]): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

  if (!apiKey) {
    console.warn("Gemini API Key não configurada. Usando mensagem padrão.");
    return "Que a música deste evento traga paz e harmonia a todos os corações.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const musiciansCount = attendees.filter(a => a.role === 'Músico (Irmão)').length;
    const organistsCount = attendees.filter(a => a.role === 'Organista (Irmã)').length;

    const prompt = `
            Você é um assistente especializado em eventos musicais sacros. 
            Temos atualmente ${musiciansCount} músicos (irmãos) e ${organistsCount} organistas (irmãs) registrados no evento.
            
            Por favor, gere uma breve mensagem de encorajamento (máximo 3 parágrafos) para este grupo de músicos e organistas. 
            Use um tom respeitoso, solene e inspirador. Mencione a importância da harmonia e do louvor.
            A mensagem deve ser em Português do Brasil.
        `;

    const response = await (ai as any).models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
    });

    return response.text || "Desejamos a todos um excelente ensaio e louvor!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Que a música deste evento traga paz e harmonia a todos os corações.";
  }
};
