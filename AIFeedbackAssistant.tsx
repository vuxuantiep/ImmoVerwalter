
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";

const AIFeedbackAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
    { role: 'ai', text: 'Hallo! Ich bin dein ImmoTiep Mentor. Wie kann ich die App für dich noch besser machen? Hast du Wünsche oder Kritik?' }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isProcessing) return;

    const currentInput = userInput;
    setUserInput('');
    setMessages(prev => [...prev, { role: 'user', text: currentInput }]);
    setIsProcessing(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const prompt = `Ein Nutzer der Immobilien-App "ImmoTiep" gibt folgendes Feedback oder hat folgenden Verbesserungswunsch: "${currentInput}". 
      Antworte kurz und höflich als KI-Assistent des Entwicklers (Vu Xuan Tiep). Bestätige, dass der Wunsch aufgenommen wurde. 
      Fasse am Ende in einem separaten Block (markiert mit [REPORT]) das Feedback strukturiert zusammen, damit es per E-Mail gesendet werden kann.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      const aiText = response.text || 'Danke für dein Feedback!';
      setMessages(prev => [...prev, { role: 'ai', text: aiText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Entschuldigung, ich konnte das gerade nicht verarbeiten. Aber schreib mir ruhig weiter!' }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const sendFeedbackMail = () => {
    const lastAiMessage = [...messages].reverse().find(m => m.role === 'ai' && m.text.includes('[REPORT]'));
    const content = lastAiMessage ? lastAiMessage.text : messages.map(m => `${m.role}: ${m.text}`).join('\n');
    
    const subject = encodeURIComponent('ImmoTiep Feedback & Vorschläge');
    const body = encodeURIComponent(`Hallo Herr Tiep,\n\nhier ist ein neues Feedback aus der App:\n\n${content}\n\nGesendet via KI-Assistent.`);
    
    window.location.href = `mailto:vuxuantiep@gmail.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="fixed bottom-6 right-6 z-[999] font-sans">
      {isOpen ? (
        <div className="bg-white w-80 sm:w-96 rounded-[2rem] shadow-2xl border border-indigo-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <i className="fa-solid fa-robot"></i>
              </div>
              <span className="font-black text-xs uppercase tracking-widest">ImmoTiep Mentor</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:rotate-90 transition-transform">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div className="flex-1 p-4 space-y-4 max-h-80 overflow-y-auto bg-slate-50 custom-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-[11px] font-medium leading-relaxed ${
                  m.role === 'user' 
                    ? 'bg-indigo-600 text-white shadow-lg' 
                    : 'bg-white border border-slate-100 text-slate-700 shadow-sm'
                }`}>
                  {m.text.split('[REPORT]')[0]}
                </div>
              </div>
            ))}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                  <i className="fa-solid fa-ellipsis fa-bounce text-indigo-400"></i>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-white border-t space-y-3">
            <form onSubmit={handleSubmit} className="flex items-center space-x-2">
              <input 
                className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" 
                placeholder="Deine Idee..."
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
              />
              <button type="submit" className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-black transition">
                <i className="fa-solid fa-paper-plane"></i>
              </button>
            </form>
            <button 
              onClick={sendFeedbackMail}
              className="w-full bg-slate-900 text-white py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center space-x-2 hover:bg-indigo-600 transition"
            >
              <i className="fa-solid fa-envelope"></i>
              <span>Feedback an Tiep senden</span>
            </button>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group relative"
        >
          <i className="fa-solid fa-comment-dots text-xl"></i>
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>
          <div className="absolute right-full mr-4 bg-slate-900 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            Helfe mir, ImmoTiep zu verbessern!
          </div>
        </button>
      )}
    </div>
  );
};

export default AIFeedbackAssistant;
