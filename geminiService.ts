
import { GoogleGenAI, Type } from "@google/genai";
import { Property, Tenant, ContractAnalysis, MarketData, Reminder, Transaction, Unit } from "./types.ts";

const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
};

export const generateExpose = async (property: Property, purpose: string = 'Vermietung', tone: string = 'Modern', highlights: string = ''): Promise<string> => {
  const ai = getAI();
  const prompt = `Erstelle ein Immobilien-Exposé für ${property.name} (${property.address}). Zweck: ${purpose}, Highlights: ${highlights}. Ton: ${tone}. Nutze Markdown.`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    return response.text || "Fehler beim Generieren.";
  } catch (e) { return "KI-Fehler"; }
};

export const generateUnitExpose = async (unit: Unit, property: Property): Promise<string> => {
  const ai = getAI();
  const prompt = `Erstelle ein kurzes, begeisterndes Vermarktungs-Exposé für eine spezifische Wohneinheit.
  Objekt: ${property.name}, ${property.address}
  Einheit-Nr: ${unit.number}
  Fläche: ${unit.size} m²
  Kaltmiete: ${unit.baseRent} €
  Zweck: Neuvermietung
  Stil: Modern, einladend.
  Struktur: Headline, Objektbeschreibung, Ausstattungs-Highlights, Kontakt-Aufforderung. Nutze Markdown.`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    return response.text || "Fehler beim Generieren.";
  } catch (e) { return "KI-Fehler"; }
};

export const generateTenantLetter = async (tenant: Tenant, property: Property, subject: string, context: string): Promise<string> => {
  const ai = getAI();
  const prompt = `Erstelle einen formellen Brief an einen Mieter auf Deutsch.
  Empfänger: ${tenant.firstName} ${tenant.lastName}, ${property.address}
  Betreff: ${subject}
  Kontext/Anweisung: ${context}
  Schreibe im Namen des Vermieters. Professionell, höflich. Nutze das heutige Datum.`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    return response.text || "Fehler.";
  } catch (e) { return "KI-Fehler."; }
};

export const generateUtilityStatementLetter = async (
  tenant: Tenant, 
  property: Property, 
  year: string, 
  totalCosts: number, 
  tenantShare: number, 
  prepaid: number, 
  balance: number, 
  breakdown: any[]
): Promise<string> => {
  const ai = getAI();
  
  const breakdownTable = breakdown.map(item => 
    `| ${item.category} | ${item.total.toFixed(2)}€ | ${item.key} | ${item.share.toFixed(2)}€ |`
  ).join('\n');

  const prompt = `Du bist ein Experte für deutsches Mietrecht. Erstelle eine professionelle und rechtssichere Betriebskostenabrechnung gemäß § 556 BGB.
  
  ABRECHNUNGSDATEN:
  Abrechnungszeitraum: 01.01.${year} bis 31.12.${year}
  Objekt: ${property.name}, ${property.address}
  Mieter: ${tenant.firstName} ${tenant.lastName}
  
  KOSTENAUFSTELLUNG (HAUS GESAMT vs. ANTEIL):
  | Kostenart | Gesamtkosten Haus | Verteilerschlüssel | Anteil Mieter |
  |-----------|-------------------|-------------------|---------------|
  ${breakdownTable}
  
  ZUSAMMENFASSUNG:
  Gesamtanteil Mieter: ${tenantShare.toFixed(2)}€
  Geleistete Vorauszahlungen: ${prepaid.toFixed(2)}€
  Differenz: ${balance >= 0 ? 'NACHZAHLUNG' : 'GUTHABEN'} von ${Math.abs(balance).toFixed(2)}€
  
  WICHTIGE ANFORDERUNGEN:
  1. Formuliere ein höfliches Anschreiben.
  2. Erstelle eine übersichtliche Markdown-Tabelle der Kosten.
  3. Erläutere kurz den Verteilungsschlüssel (Wohnfläche).
  4. Füge einen Hinweis zu haushaltsnahen Dienstleistungen (§ 35a EStG) hinzu (Schätze Lohnanteil bei Reinigung/Garten auf ca. 20%).
  5. Nenne eine Zahlungsfrist von 30 Tagen.
  6. Layout: Nutze sauberes Markdown.`;

  try {
    const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: prompt });
    return response.text || "Fehler bei der Erstellung.";
  } catch (e) { return "KI-Fehler."; }
};

export const analyzeContract = async (fileData: string, mimeType: string): Promise<ContractAnalysis | null> => {
  const ai = getAI();
  try {
    const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { text: "Analysiere diesen Mietvertrag. Extrahiere Mietbeginn, Kaltmiete, ungewöhnliche Klauseln, Risiken und eine Zusammenfassung als JSON." }, 
          { inlineData: { data: base64Data, mimeType } }
        ]
      },
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

export const fetchMarketAnalysis = async (property: Property): Promise<MarketData | null> => {
  const ai = getAI();
  const prompt = `Führe eine Marktanalyse für folgende Immobilie durch:
  Adresse: ${property.address}
  Typ: ${property.type}
  Antworte in einem validen JSON-Format mit folgenden Feldern:
  averageRentPerM2 (Zahl), averageSalePerM2 (Zahl), marketTrend ('rising', 'stable', 'falling'), summary (Text).`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const data = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    
    // Extract grounding sources as required by Gemini API guidelines
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk: any) => ({
        title: chunk.web?.title || "Quelle",
        uri: chunk.web?.uri || ""
      }))
      .filter((s: any) => s.uri) || [];

    return {
      averageRentPerM2: data.averageRentPerM2 || 0,
      averageSalePerM2: data.averageSalePerM2 || 0,
      marketTrend: data.marketTrend || 'stable',
      summary: data.summary || text,
      sources: sources
    };
  } catch (error) {
    console.error("Market analysis error:", error);
    return null;
  }
};

export const generateEnergyConsultation = async (
  property: Property,
  additionalInfo: { yearBuilt: string, heatingType: string, insulation: string }
): Promise<string> => {
  const ai = getAI();
  const prompt = `Energieberatung für: ${property.name}. Baujahr: ${additionalInfo.yearBuilt}, Heizung: ${additionalInfo.heatingType}. Nutze Markdown.`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: prompt });
    return response.text || "Fehler.";
  } catch (e) { return "Fehler."; }
};

export const generateSubsidyAdvice = async (property: Property, measures: string[]): Promise<string> => {
  const ai = getAI();
  const prompt = `Fördermittelberatung für: ${property.name}. Maßnahmen: ${measures.join(', ')}. KfW/BAFA Fokus. Nutze Markdown.`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: prompt });
    return response.text || "Fehler.";
  } catch (e) { return "Fehler."; }
};

export const generateInvestmentStrategy = async (property: Property, metrics: any): Promise<string> => {
  const ai = getAI();
  const prompt = `Investmentanalyse für: ${property.name}. Rendite: ${metrics.grossYield.toFixed(2)}%. Nutze Markdown.`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: prompt });
    return response.text || "Fehler.";
  } catch (e) { return "Fehler."; }
};

export const generateExitStrategy = async (property: Property, marketValue: number, targetInterestRate: number): Promise<string> => {
  const ai = getAI();
  const prompt = `Exit-Strategie für: ${property.name}. Marktwert: ${marketValue}€. Zinsziel: ${targetInterestRate}%. Nutze Markdown.`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: prompt });
    return response.text || "Fehler.";
  } catch (e) { return "Fehler."; }
};

export const generateReminderEmail = async (reminder: Reminder, property?: Property): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Erstelle einen E-Mail Entwurf für: ${reminder.title}. Objekt: ${property?.name || 'Allgemein'}.` });
    return response.text || "Fehler.";
  } catch (e) { return "Fehler."; }
};

export const generateTenantFinancialEmail = async (tenant: Tenant, property: Property, transactions: Transaction[], topic: string): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Schreibe eine professionelle E-Mail an den Mieter ${tenant.lastName} zum Thema ${topic} für das Objekt ${property.name}.` });
    return response.text || "Fehler.";
  } catch (e) { return "Fehler."; }
};
