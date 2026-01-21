
import React, { useState, useEffect } from 'react';
import { Property, Tenant, Transaction, MeterType, MarketData } from './types.ts';
import { generateExpose, fetchMarketAnalysis, generateEnergyConsultation, generateSubsidyAdvice } from './geminiService.ts';

interface AIToolsProps {
  properties: Property[];
  setProperties: React.Dispatch<React.SetStateAction<Property[]>>;
  tenants: Tenant[];
  transactions: Transaction[];
  initialPropertyId?: string;
  initialTab?: string;
}

const AITools: React.FC<AIToolsProps> = ({ properties, setProperties, tenants, transactions, initialPropertyId, initialTab }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [activeTab, setActiveTab] = useState<'letter' | 'expose' | 'utility' | 'meters' | 'market' | 'energy'>('letter');
  const [marketAnalysis, setMarketAnalysis] = useState<MarketData | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');

  const [energyInfo, setEnergyInfo] = useState({ yearBuilt: '', heatingType: 'Gasheizung', insulation: 'Standard' });
  const [measures, setMeasures] = useState<string[]>([]);

  useEffect(() => {
    if (initialPropertyId) setSelectedPropertyId(initialPropertyId);
    if (initialTab) setActiveTab(initialTab as any);
  }, [initialPropertyId, initialTab]);

  const handleEnergyConsult = async () => {
    const property = properties.find(p => p.id === selectedPropertyId);
    if (!property) return;
    setLoading(true);
    setResult(await generateEnergyConsultation(property, energyInfo));
    setLoading(false);
  };

  const handleMarketCheck = async () => {
    const property = properties.find(p => p.id === selectedPropertyId);
    if (!property) return;
    setLoading(true);
    setMarketAnalysis(await fetchMarketAnalysis(property));
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100 overflow-x-auto">
          {['letter', 'expose', 'market', 'energy', 'meters'].map(id => (
            <button key={id} onClick={() => { setActiveTab(id as any); setResult(''); }} className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition ${activeTab === id ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>{id.toUpperCase()}</button>
          ))}
        </div>
        {activeTab === 'market' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
             <select className="w-full border p-3 rounded-xl font-bold mb-4" value={selectedPropertyId} onChange={e => setSelectedPropertyId(e.target.value)}><option value="">Objekt wählen...</option>{properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
             <button onClick={handleMarketCheck} disabled={loading || !selectedPropertyId} className="w-full bg-violet-600 text-white py-4 rounded-2xl font-black shadow-lg">Analyse starten</button>
          </div>
        )}
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 min-h-[500px]">
        {loading ? <div className="text-center py-20 animate-pulse">KI erstellt Bericht...</div> : marketAnalysis ? <div>{marketAnalysis.summary}</div> : <div className="whitespace-pre-wrap text-sm">{result || 'Warten auf Eingabe...'}</div>}
      </div>
    </div>
  );
};

export default AITools;
