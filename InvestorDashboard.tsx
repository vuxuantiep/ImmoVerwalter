
import React, { useState, useMemo } from 'react';
import { Property, Transaction, Loan, TransactionType } from './types.ts';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
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
  const [activeSubTab, setActiveSubTab] = useState<'yield' | 'exit' | 'loans'>('yield');
  
  // Strategy States
  const [targetMarketValue, setTargetMarketValue] = useState<number>(300000);
  const [targetInterest, setTargetInterest] = useState<number>(3.2); // Aktueller Marktzins Vorgabe

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  const calcMetrics = (prop: Property) => {
    const annualRent = prop.units.reduce((sum, u) => sum + (u.baseRent * 12), 0);
    const price = prop.purchasePrice || 0;
    const grossYield = price > 0 ? (annualRent / price) * 100 : 0;
    
    const propTransactions = transactions.filter(t => t.propertyId === prop.id);
    const annualExpenses = propTransactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const monthlyLoanService = prop.loans?.reduce((sum, l) => sum + l.monthlyInstallment, 0) || 0;
    const annualLoanService = monthlyLoanService * 12;
    
    const cashflow = (annualRent - annualExpenses - annualLoanService) / 12;
    const netYield = price > 0 ? ((annualRent - annualExpenses) / price) * 100 : 0;

    return { grossYield, netYield, cashflow, annualRent, annualExpenses, annualLoanService };
  };

  const metrics = selectedProperty ? calcMetrics(selectedProperty) : null;

  const handleAiAnalysis = async (type: 'performance' | 'exit') => {
    if (!selectedProperty || !metrics) return;
    setIsAnalyzing(true);
    let analysis = "";
    if (type === 'performance') {
      analysis = await generateInvestmentStrategy(selectedProperty, metrics);
    } else {
      analysis = await generateExitStrategy(selectedProperty, targetMarketValue, targetInterest);
    }
    setAiAnalysis(analysis);
    setIsAnalyzing(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
           <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-200">
              <i className="fa-solid fa-sack-dollar text-xl"></i>
           </div>
           <div>
              <h2 className="text-xl font-bold text-slate-800">Investoren-Zentrale</h2>
              <p className="text-xs text-slate-500 font-medium">Strategische Analyse & Vermögensaufbau</p>
           </div>
        </div>
        <div className="flex items-center space-x-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Objekt:</span>
            <select 
              className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
              value={selectedPropertyId}
              onChange={e => { setSelectedPropertyId(e.target.value); setAiAnalysis(null); }}
            >
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
        </div>
      </div>

      {selectedProperty && metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
              <SubTabButton active={activeSubTab === 'yield'} onClick={() => setActiveSubTab('yield')} label="Performance" icon="fa-chart-pie" />
              <SubTabButton active={activeSubTab === 'loans'} onClick={() => setActiveSubTab('loans')} label="Finanzierungs-Check" icon="fa-landmark" />
            </div>

            {activeSubTab === 'loans' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-800">Umschuldungs- & Zins-Check</h3>
                    <div className="flex items-center space-x-4 bg-slate-50 px-4 py-2 rounded-2xl border">
                      <span className="text-xs font-bold text-slate-500">Marktzins:</span>
                      <input 
                        type="number" step="0.1" 
                        className="w-16 border-none bg-transparent p-1 text-xs font-black text-indigo-600 focus:ring-0" 
                        value={targetInterest} 
                        onChange={e => setTargetInterest(Number(e.target.value))} 
                      />
                      <span className="text-xs font-bold text-slate-400">%</span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {selectedProperty.loans?.map(loan => {
                      const diff = loan.interestRate - targetInterest;
                      
                      // Berechnung verbleibende Monate
                      const now = new Date();
                      const end = new Date(loan.fixedUntil);
                      const diffMonths = Math.max(0, (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth()));
                      
                      const monthlySaving = (loan.currentBalance * (diff/100)) / 12;
                      const totalSaving = monthlySaving * diffMonths;
                      
                      // Schätzung Vorfälligkeitsentschädigung (Sehr grob: 50% der Zinsersparnis als Daumenwert)
                      const estPenalty = diffMonths > 0 ? (totalSaving * 0.4) : 0;
                      const netProfit = totalSaving - estPenalty;

                      return (
                        <div key={loan.id} className="p-6 border border-slate-100 rounded-3xl bg-slate-50 flex flex-col gap-6 relative overflow-hidden group">
                          {diff > 0.5 && (
                             <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest shadow-lg">
                               Optimierung möglich
                             </div>
                          )}
                          
                          <div className="flex flex-col md:flex-row justify-between gap-6">
                            <div className="flex items-center space-x-4">
                               <div className="h-12 w-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-indigo-600 shadow-sm">
                                  <i className="fa-solid fa-building-columns"></i>
                               </div>
                               <div>
                                  <p className="font-bold text-slate-800">{loan.bankName}</p>
                                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">Zinsbindung endet in {diffMonths} Monaten ({loan.fixedUntil})</p>
                               </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 flex-1">
                               <LoanDetail label="Ist-Zins" value={`${loan.interestRate}%`} />
                               <LoanDetail label="Zins-Vorteil" value={diff > 0 ? `${diff.toFixed(2)}%` : 'Kein Vorteil'} color={diff > 0 ? 'text-emerald-600' : 'text-slate-400'} />
                               <LoanDetail label="Ersparnis/Mo" value={diff > 0 ? `~${monthlySaving.toFixed(0)}€` : '0€'} />
                               <LoanDetail label="Gesamt-Potential" value={diff > 0 ? `${totalSaving.toFixed(0)}€` : '0€'} />
                            </div>
                          </div>

                          {diff > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                               <div className="bg-white p-4 rounded-2xl border border-slate-100">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Refinanzierungs-Szenario</p>
                                  <div className="space-y-1">
                                     <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">Zinsersparnis (Restlaufzeit):</span>
                                        <span className="font-bold text-emerald-600">+{totalSaving.toFixed(0)} €</span>
                                     </div>
                                     <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">Est. Vorfälligkeitsentschädigung:</span>
                                        <span className="font-bold text-red-500">-{estPenalty.toFixed(0)} €</span>
                                     </div>
                                     <div className="flex justify-between text-xs pt-2 border-t mt-2">
                                        <span className="text-slate-700 font-black uppercase tracking-tighter">Netto-Vorteil:</span>
                                        <span className="font-black text-indigo-600">{netProfit.toFixed(0)} €</span>
                                     </div>
                                  </div>
                               </div>
                               <div className="flex items-center space-x-3">
                                  {diffMonths > 36 ? (
                                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center space-x-3">
                                       <i className="fa-solid fa-clock-rotate-left text-amber-500"></i>
                                       <p className="text-[10px] text-amber-800 font-medium leading-tight">Lange Restlaufzeit. Prüfen Sie ein <strong>Forward-Darlehen</strong> zur Zinssicherung für die Zukunft.</p>
                                    </div>
                                  ) : (
                                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center space-x-3">
                                       <i className="fa-solid fa-bolt text-emerald-500"></i>
                                       <p className="text-[10px] text-emerald-800 font-medium leading-tight">Kurze Restlaufzeit. Jetzt Angebote für die <strong>Anschlussfinanzierung</strong> einholen!</p>
                                    </div>
                                  )}
                               </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {(!selectedProperty.loans || selectedProperty.loans.length === 0) && (
                      <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100">
                         <i className="fa-solid fa-calculator text-4xl mb-4 text-slate-200"></i>
                         <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Keine Darlehensdaten zur Analyse vorhanden.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {activeSubTab === 'yield' && (
              <div className="space-y-6 animate-in fade-in">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatCard title="Bruttorendite" value={`${metrics.grossYield.toFixed(2)}%`} icon="fa-chart-line" color="text-indigo-600" />
                  <StatCard title="Nettorendite" value={`${metrics.netYield.toFixed(2)}%`} icon="fa-chart-area" color="text-emerald-600" />
                  <StatCard title="Cashflow/Mo" value={`${metrics.cashflow.toFixed(2)}€`} icon="fa-money-bill-trend-up" color={metrics.cashflow >= 0 ? 'text-emerald-600' : 'text-red-600'} />
                </div>
                {/* Weitere Performance Ansichten ... */}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden min-h-[500px]">
              <div className="relative z-10">
                <h3 className="font-bold text-lg mb-6 flex items-center">
                  <i className="fa-solid fa-wand-magic-sparkles mr-3 text-indigo-400"></i> KI-Investment-Berater
                </h3>
                
                {isAnalyzing ? (
                  <div className="py-20 flex flex-col items-center justify-center text-indigo-300">
                    <i className="fa-solid fa-microchip fa-spin text-4xl mb-6"></i>
                    <p className="text-xs font-black uppercase tracking-widest animate-pulse">Analysiere Finanzmarkt & Cashflow...</p>
                  </div>
                ) : aiAnalysis ? (
                  <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 text-sm leading-relaxed whitespace-pre-wrap border border-white/10 animate-in zoom-in-95 max-h-[600px] overflow-y-auto custom-scrollbar font-medium">
                    {aiAnalysis}
                    <button onClick={() => setAiAnalysis(null)} className="mt-8 block text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-white underline transition">Bericht schließen</button>
                  </div>
                ) : (
                  <div className="text-center py-20 opacity-30 flex flex-col items-center">
                     <i className="fa-solid fa-rocket text-6xl mb-6 text-indigo-500"></i>
                     <p className="text-xs font-bold uppercase tracking-widest leading-loose">Bereit für die Strategie-Analyse.<br/>Wählen Sie eine Aktion oben.</p>
                     <div className="mt-8 space-y-2 w-full">
                        <button onClick={() => handleAiAnalysis('performance')} className="w-full bg-indigo-600 hover:bg-indigo-700 py-3 rounded-xl text-xs font-bold transition">Performance Check</button>
                        <button onClick={() => handleAiAnalysis('exit')} className="w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-xl text-xs font-bold transition">Exit Strategie</button>
                     </div>
                  </div>
                )}
              </div>
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-10"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon, color }: any) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-lg transition">
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
    </div>
    <div className={`h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center ${color} group-hover:scale-110 transition duration-300`}>
      <i className={`fa-solid ${icon} text-lg`}></i>
    </div>
  </div>
);

const SubTabButton = ({ active, onClick, label, icon }: any) => (
  <button 
    onClick={onClick}
    className={`px-6 py-2.5 rounded-2xl text-xs font-bold transition flex items-center space-x-2 ${active ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
  >
    <i className={`fa-solid ${icon}`}></i>
    <span>{label}</span>
  </button>
);

const LoanDetail = ({ label, value, color = 'text-slate-800' }: any) => (
  <div>
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <p className={`text-sm font-black ${color}`}>{value}</p>
  </div>
);

export default InvestorDashboard;
