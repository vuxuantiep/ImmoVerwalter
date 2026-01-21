
import { GoogleGenAI, Type } from "@google/genai";
import { Property, Tenant, ContractAnalysis, MeterType, MarketData, Reminder, Transaction } from "./types.ts";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateExitStrategy = async (
  property: Property,
  marketValue: number,
  targetInterestRate: number
): Promise<string> => {
  const currentLoans = property.loans?.map(l => 
    `${l.bankName}: Restschuld ${l.currentBalance}€, Zins ${l.interestRate}%, Ende Bindung ${l.fixedUntil}`
  ).join('\n') || 'Keine Darlehen erfasst.';

  const prompt = `Du bist ein hochspezialisierter Immobilien-Stratege. Analysiere die Exit- und Finanzierungsstrategie für:
  Objekt: ${property.name}
  Marktwert: ${marketValue}€
  Zins: ${targetInterestRate}%
  ${currentLoans}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    });
    return response.text || "Analyse fehlgeschlagen.";
  } catch (error) {
    console.error("Gemini Exit Error:", error);
    return "Fehler.";
  }
};

export const generateSubsidyAdvice = async (
  property: Property,
  measures: string[]
): Promise<string> => {
  const prompt = `Förderberatung für ${property.name}. Maßnahmen: ${measures.join(', ')}.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    });
    return response.text || "Analyse fehlgeschlagen.";
  } catch (error) {
    return "Fehler.";
  }
};

export const generateEnergyConsultation = async (
  property: Property,
  additionalInfo: any
): Promise<string> => {
  const prompt = `Energieberatung für ${property.name}, Baujahr ${additionalInfo.yearBuilt}.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    });
    return response.text || "Analyse fehlgeschlagen.";
  } catch (error) {
    return "Fehler.";
  }
};

export const generateReminderEmail = async (
  reminder: Reminder,
  property?: Property
): Promise<string> => {
  const prompt = `E-Mail Entwurf für: ${reminder.title}. Objekt: ${property?.name || 'Allgemein'}.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Fehler.";
  } catch (error) {
    return "Fehler.";
  }
};

export const generateInvestmentStrategy = async (
  property: Property,
  metrics: any
): Promise<string> => {
  const prompt = `Investmentanalyse für ${property.name}. Rendite: ${metrics.netYield}%.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    });
    return response.text || "Fehler.";
  } catch (error) {
    return "Fehler.";
  }
};

export const generateTenantFinancialEmail = async (
  tenant: Tenant,
  property: Property,
  transactions: Transaction[],
  topic: string
): Promise<string> => {
  const prompt = `Mieter E-Mail an ${tenant.lastName} zu Thema ${topic} für Objekt ${property.name}.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Fehler.";
  } catch (error) {
    return "Fehler.";
  }
};

export const fetchMarketAnalysis = async (property: Property): Promise<MarketData | null> => {
  const prompt = `Marktanalyse für ${property.address}.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] }
    });
    return {
      averageRentPerM2: 12.5,
      averageSalePerM2: 4500,
      marketTrend: 'rising',
      summary: response.text || "Analyse verfügbar.",
      sources: []
    };
  } catch (error) {
    return null;
  }
};

export const extractMeterData = async (
  base64Image: string,
  mimeType: string
): Promise<any> => {
  const prompt = `Analysiere Zählerbild.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ text: prompt }, { inlineData: { data: base64Image.split(',')[1], mimeType } }],
      config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    return null;
  }
};

export const generateTenantLetter = async (
  tenant: Tenant,
  property: Property,
  subject: string,
  context: string
): Promise<string> => {
  const prompt = `Formeller Brief an ${tenant.lastName} zu ${subject}. Kontext: ${context}.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Fehler.";
  } catch (error) {
    return "Fehler.";
  }
};

export const generateExpose = async (
  property: Property,
  purpose: string,
  target: string,
  tone: string,
  highlights: string
): Promise<string> => {
  const prompt = `Exposé für ${property.name} (${purpose}). Highlights: ${highlights}.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Fehler.";
  } catch (error) {
    return "Fehler.";
  }
};

export const analyzeContract = async (
  fileData: string,
  mimeType: string
): Promise<ContractAnalysis | null> => {
  const prompt = `Analysiere Mietvertrag.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ text: prompt }, { inlineData: { data: fileData.split(',')[1], mimeType } }],
      config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    return null;
  }
};
