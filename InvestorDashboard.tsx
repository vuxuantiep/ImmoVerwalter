
import React, { useState, useMemo } from 'react';
import { Property, Transaction, Loan, TransactionType } from './types.ts';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { generateInvestmentStrategy, generateExitStrategy } from './geminiService.ts';

interface InvestorDashboardProps {
  properties: Property[];
  transactions: Transaction[];
  setProperties: React.Dispatch<React.SetStateAction<Property[]>>;
}

const InvestorDashboard: React.FC<InvestorDashboardProps> = ({ properties, transactions, setProperties }) => {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(properties[0]?.id || '');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  const handleAiAnalysis = async (type: 'performance' | 'exit') => {
    if (!selectedProperty) return;
    setIsAnalyzing(true);
    setAiAnalysis(await (type === 'performance' ? generateInvestmentStrategy(selectedProperty, { grossYield: 4.5, netYield: 3.2, cashflow: 200 }) : generateExitStrategy(selectedProperty, 300000, 3.5)));
    setIsAnalyzing(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border flex justify-between items-center">
        <h2 className="text-xl font-bold">Investor Dashboard</h2>
        <select className="border p-2 rounded-xl" value={selectedPropertyId} onChange={e => setSelectedPropertyId(e.target.value)}>{properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border">
          <button onClick={() => handleAiAnalysis('performance')} className="bg-indigo-600 text-white w-full py-3 rounded-xl font-bold mb-4">Performance Check</button>
          <button onClick={() => handleAiAnalysis('exit')} className="bg-slate-800 text-white w-full py-3 rounded-xl font-bold">Exit Analyse</button>
        </div>
        <div className="bg-slate-900 text-white p-6 rounded-2xl min-h-[300px] whitespace-pre-wrap text-sm leading-relaxed">{isAnalyzing ? 'Berechne...' : aiAnalysis || 'Warten auf Analyse...'}</div>
      </div>
    </div>
  );
};

export default InvestorDashboard;
