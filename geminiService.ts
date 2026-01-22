
import { GoogleGenAI, Type } from "@google/genai";
import { Property, Tenant, ContractAnalysis, MeterType, MarketData, Reminder, Transaction, Loan } from "./types";

// Nutzt process.env.API_KEY, welches durch Vite definiert wird
const ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY || '' });

export const generateExitStrategy = async (property: Property, marketValue: number, targetInterestRate: number): Promise<string> => {
  const currentLoans = property.loans?.map(l => `${l.bankName}: ${l.currentBalance}€`).join(', ') || 'Keine';
  const prompt = `Immobilien-Strategie für ${property.name}. Marktwert: ${marketValue}€, Zins: ${targetInterestRate}%. Darlehen: ${currentLoans}. Erstelle Analyse.`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: prompt });
    return response.text || "Analyse nicht verfügbar.";
  } catch (e) { return "KI-Fehler."; }
};

export const generateReminderEmail = async (reminder: Reminder, property?: Property): Promise<string> => {
  const prompt = `Erstelle E-Mail Entwurf für: ${reminder.title}. Objekt: ${property?.name || 'Allgemein'}.`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    return response.text || "Fehler.";
  } catch (e) { return "KI-Fehler."; }
};

export const fetchMarketAnalysis = async (property: Property): Promise<MarketData | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Marktanalyse für ${property.address}.`,
      config: { tools: [{ googleSearch: {} }] }
    });
    
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk: any) => ({
        title: chunk.web?.title || "Quelle",
        uri: chunk.web?.uri || ""
      }))
      .filter((s: any) => s.uri) || [];

    return { 
      averageRentPerM2: 12.5, 
      averageSalePerM2: 4500, 
      marketTrend: 'rising', 
      summary: response.text || "", 
      sources: sources 
    };
  } catch (e) { return null; }
};

export const generateTenantFinancialEmail = async (tenant: Tenant, property: Property, transactions: Transaction[], topic: string): Promise<string> => {
  const prompt = `E-Mail an ${tenant.lastName} zu ${topic} für ${property.name}.`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    return response.text || "Fehler.";
  } catch (e) { return "KI-Fehler."; }
};

export const generateEnergyConsultation = async (property: Property, info: any): Promise<string> => {
  const prompt = `Energieberatung für ${property.name}, Baujahr ${info.yearBuilt}.`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: prompt });
    return response.text || "Fehler.";
  } catch (e) { return "KI-Fehler."; }
};

export const generateSubsidyAdvice = async (property: Property, measures: string[]): Promise<string> => {
  const prompt = `Fördermittel für ${property.name}. Maßnahmen: ${measures.join(', ')}.`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: prompt });
    return response.text || "Fehler.";
  } catch (e) { return "KI-Fehler."; }
};

export const analyzeContract = async (fileData: string, mimeType: string): Promise<ContractAnalysis | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        { text: "Analysiere Mietvertrag und gib JSON zurück." }, 
        { inlineData: { data: fileData.split(',')[1] || fileData, mimeType } }
      ],
      config: { 
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            leaseStart: { type: Type.STRING },
            leaseEnd: { type: Type.STRING },
            rentAmount: { type: Type.STRING },
            noticePeriod: { type: Type.STRING },
            unusualClauses: { type: Type.ARRAY, items: { type: Type.STRING } },
            risks: { type: Type.ARRAY, items: { type: Type.STRING } },
            summary: { type: Type.STRING }
          },
          required: ['unusualClauses', 'risks', 'summary']
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (e) { return null; }
};

export const generateExpose = async (property: Property, purpose: string, targetGroup: string, tone: string, highlights: string): Promise<string> => {
  const prompt = `Exposé für ${property.name}. Zweck: ${purpose}, Ton: ${tone}.`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    return response.text || "Fehler.";
  } catch (e) { return "KI-Fehler."; }
};

export const generateInvestmentStrategy = async (property: Property, metrics: any): Promise<string> => {
  const prompt = `Investment Analyse für ${property.name}. Rendite: ${metrics.grossYield}%.`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: prompt });
    return response.text || "Fehler.";
  } catch (e) { return "KI-Fehler."; }
};
