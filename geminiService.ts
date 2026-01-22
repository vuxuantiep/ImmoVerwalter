
import { GoogleGenAI, Type } from "@google/genai";
import { Property, Tenant, ContractAnalysis, MarketData, Reminder, Transaction } from "./types.ts";

// Initialisierung erfolgt erst bei Bedarf, um sicherzustellen, dass der Key geladen ist
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY fehlt! Bitte in den Umgebungsvariablen (z.B. Vercel Settings) hinterlegen.");
  }
  return new GoogleGenAI({ apiKey: apiKey || '' });
};

export const generateExpose = async (property: Property, purpose: string = 'Vermietung', tone: string = 'Modern', highlights: string = ''): Promise<string> => {
  const ai = getAI();
  const prompt = `Erstelle ein Immobilien-Exposé für ${property.name} (${property.address}). Zweck: ${purpose}, Highlights: ${highlights}. Ton: ${tone}. Nutze Markdown.`;
  try {
    const response = await ai.models.generateContent({ 
      model: 'gemini-3-flash-preview', 
      contents: prompt 
    });
    return response.text || "Fehler beim Generieren.";
  } catch (e) { return "KI-Fehler: " + (e instanceof Error ? e.message : "Unbekannt"); }
};

export const fetchMarketAnalysis = async (property: Property): Promise<MarketData | null> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Führe eine Marktanalyse für die Lage ${property.address} durch. Wie hoch sind Mietpreise und Kaufpreise aktuell? Antworte präzise.`,
      config: { tools: [{ googleSearch: {} }] }
    });
    
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => ({
      title: c.web?.title || "Quelle",
      uri: c.web?.uri || ""
    })).filter((s: any) => s.uri) || [];

    return { 
      averageRentPerM2: 12.5, // Platzhalter, da die KI hier Text liefert
      averageSalePerM2: 4500, 
      marketTrend: 'stable', 
      summary: response.text || "Zusammenfassung nicht verfügbar.", 
      sources 
    };
  } catch (e) { return null; }
};

export const analyzeContract = async (fileData: string, mimeType: string): Promise<ContractAnalysis | null> => {
  const ai = getAI();
  try {
    const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        { text: "Analysiere diesen Mietvertrag. Extrahiere Mietbeginn, Kaltmiete, ungewöhnliche Klauseln, Risiken und eine Zusammenfassung als JSON." }, 
        { inlineData: { data: base64Data, mimeType } }
      ],
      config: { 
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            leaseStart: { type: Type.STRING },
            rentAmount: { type: Type.STRING },
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

export const generateReminderEmail = async (reminder: Reminder, property?: Property): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({ 
      model: 'gemini-3-flash-preview', 
      contents: `Erstelle einen E-Mail Entwurf für: ${reminder.title}. Objekt: ${property?.name || 'Allgemein'}.` 
    });
    return response.text || "Fehler.";
  } catch (e) { return "Fehler."; }
};

export const generateInvestmentStrategy = async (property: Property, metrics: any): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({ 
      model: 'gemini-3-pro-preview', 
      contents: `Investitions-Check für das Objekt ${property.name}. Aktuelle Rendite: ${metrics.grossYield}%. Sollte man halten oder verkaufen? Analysiere Marktlage.` 
    });
    return response.text || "Fehler.";
  } catch (e) { return "Fehler."; }
};

export const generateExitStrategy = async (property: Property, marketValue: number, interest: number): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({ 
      model: 'gemini-3-pro-preview', 
      contents: `Exit-Strategie für ${property.name}. Marktwert: ${marketValue}€. Aktueller Zins: ${interest}%. Wann ist der beste Verkaufszeitpunkt?` 
    });
    return response.text || "Fehler.";
  } catch (e) { return "Fehler."; }
};

export const generateTenantFinancialEmail = async (tenant: Tenant, property: Property, transactions: Transaction[], topic: string): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({ 
      model: 'gemini-3-flash-preview', 
      contents: `Schreibe eine professionelle E-Mail an den Mieter ${tenant.lastName} zum Thema ${topic} für das Objekt ${property.name}.` 
    });
    return response.text || "Fehler.";
  } catch (e) { return "Fehler."; }
};

export const generateEnergyConsultation = async (property: Property, info: any): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({ 
      model: 'gemini-3-pro-preview', 
      contents: `Energieberatung für ${property.name}, Baujahr ${info.yearBuilt}. Welche Sanierungen lohnen sich bei Heizungstyp ${info.heatingType}?` 
    });
    return response.text || "Fehler.";
  } catch (e) { return "Fehler."; }
};

export const generateSubsidyAdvice = async (property: Property, measures: string[]): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({ 
      model: 'gemini-3-pro-preview', 
      contents: `Welche Förderprogramme gibt es für folgende Maßnahmen am Objekt ${property.name}: ${measures.join(', ')}?` 
    });
    return response.text || "Fehler.";
  } catch (e) { return "Fehler."; }
};
