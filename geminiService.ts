
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Property, Tenant, ContractAnalysis, MeterType, MarketData, Reminder, Transaction, Loan } from "./types.ts";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateExitStrategy = async (property: Property, marketValue: number, targetInterestRate: number): Promise<string> => {
  const prompt = `Analysiere Exit-Strategie für ${property.name}. Marktwert ${marketValue}€, Zins ${targetInterestRate}%.`;
  const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: prompt });
  return response.text || "Fehler";
};

export const generateSubsidyAdvice = async (property: Property, measures: string[]): Promise<string> => {
  const prompt = `Förderberatung für ${property.name}: ${measures.join(', ')}.`;
  const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: prompt });
  return response.text || "Fehler";
};

export const generateEnergyConsultation = async (property: Property, info: any): Promise<string> => {
  const prompt = `Energieberatung für ${property.name}, Baujahr ${info.yearBuilt}.`;
  const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: prompt });
  return response.text || "Fehler";
};

export const generateReminderEmail = async (reminder: Reminder, property?: Property): Promise<string> => {
  const prompt = `E-Mail Entwurf für: ${reminder.title}.`;
  const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
  return response.text || "Fehler";
};

export const generateInvestmentStrategy = async (property: Property, metrics: any): Promise<string> => {
  const prompt = `Investitionsstrategie für ${property.name}, Rendite ${metrics.netYield}%.`;
  const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: prompt });
  return response.text || "Fehler";
};

export const generateTenantFinancialEmail = async (tenant: Tenant, property: Property, transactions: Transaction[], topic: string): Promise<string> => {
  const prompt = `E-Mail an ${tenant.lastName} zu ${topic} für ${property.name}.`;
  const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
  return response.text || "Fehler";
};

export const fetchMarketAnalysis = async (property: Property): Promise<MarketData | null> => {
  const prompt = `Marktanalyse für ${property.address}.`;
  const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: prompt, config: { tools: [{ googleSearch: {} }] } });
  return { averageRentPerM2: 12.5, averageSalePerM2: 4500, marketTrend: 'rising', summary: response.text || "", sources: [] };
};

export const analyzeContract = async (fileData: string, mimeType: string): Promise<ContractAnalysis | null> => {
  const prompt = `Analysiere Mietvertrag.`;
  const response = await ai.models.generateContent({ 
    model: 'gemini-3-flash-preview', 
    contents: [{ text: prompt }, { inlineData: { data: fileData.split(',')[1] || fileData, mimeType } }],
    config: { responseMimeType: 'application/json' }
  });
  return JSON.parse(response.text || '{}');
};

export const generateExpose = async (property: Property, purpose: string, target: string, tone: string, highlights: string): Promise<string> => {
  const prompt = `Exposé für ${property.name} (${purpose}). Highlights: ${highlights}.`;
  const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
  return response.text || "Fehler";
};
