
import React, { useState } from 'react';
import { Property, Tenant, Transaction, TransactionType, Reminder, ReminderCategory, View } from './types.ts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { generateReminderEmail } from './geminiService.ts';

interface DashboardProps {
  properties: Property[];
  tenants: Tenant[];
  transactions: Transaction[];
  reminders: Reminder[];
  setReminders: React.Dispatch<React.SetStateAction<Reminder[]>>;
  setView: (view: View, params?: any) => void;
  onEditProperty: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ properties, tenants, transactions, reminders, setReminders, setView, onEditProperty }) => {
  const [isGeneratingMail, setIsGeneratingMail] = useState<string | null>(null);
  const [mailDraft, setMailDraft] = useState<string | null>(null);

  const totalUnits = properties.reduce((sum, p) => sum + p.units.length, 0);
  const occupiedUnits = properties.reduce((sum, p) => sum + p.units.filter(u => u.tenantId).length, 0);
  const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;
  const income = transactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
  const expenses = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);

  const chartData = [
    { name: 'In', value: income, color: '#10b981' },
    { name: 'Out', value: expenses, color: '#ef4444' },
    { name: 'Net', value: income - expenses, color: '#6366f1' }
  ];

  const handleCreateEmail = async (reminder: Reminder) => {
    setIsGeneratingMail(reminder.id);
    const property = properties.find(p => p.id === reminder.propertyId);
    const draft = await generateReminderEmail(reminder, property);
    setMailDraft(draft);
    setIsGeneratingMail(null);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Objekte" value={properties.length.toString()} icon="fa-building" color="text-blue-600" bgColor="bg-blue-100" />
        <StatCard title="Mieter" value={tenants.length.toString()} icon="fa-users" color="text-purple-600" bgColor="bg-purple-100" />
        <StatCard title="Belegung" value={`${occupancyRate.toFixed(0)}%`} icon="fa-door-open" color="text-emerald-600" bgColor="bg-emerald-100" />
        <StatCard title="Cashflow" value={`${(income - expenses).toFixed(0)}€`} icon="fa-euro-sign" color="text-indigo-600" bgColor="bg-indigo-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-around">
            <QuickActionButton onClick={() => setView('tools', { tab: 'meters' })} icon="fa-gauge-high" label="Scan" color="text-cyan-600" bgColor="bg-cyan-50" />
            <QuickActionButton onClick={() => setView('finances')} icon="fa-plus" label="Buchung" color="text-emerald-600" bgColor="bg-emerald-50" />
            <QuickActionButton onClick={() => setView('tools', { tab: 'letter' })} icon="fa-envelope" label="Brief" color="text-indigo-600" bgColor="bg-indigo-50" />
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Finanzen</h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 10, left: -30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: '#f8fafc'}} />
                  <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={40}>
                    {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Aktivitäten</h3>
          <div className="space-y-3">
            {transactions.slice(-6).reverse().map(t => (
              <div key={t.id} className="flex items-center space-x-3 p-2 hover:bg-slate-50 rounded-xl transition">
                <div className={`p-1.5 rounded-lg ${t.type === TransactionType.INCOME ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                  <i className={`fa-solid ${t.type === TransactionType.INCOME ? 'fa-plus' : 'fa-minus'} text-[8px]`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold truncate text-slate-700">{t.description}</p>
                  <p className="text-[8px] text-slate-400 font-bold uppercase">{t.date}</p>
                </div>
                <span className={`text-[11px] font-black ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-red-600'}`}>
                  {t.amount.toFixed(0)}€
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {mailDraft && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 overflow-hidden">
             <div className="flex justify-between items-center mb-4"><h3 className="font-bold">KI Brief Entwurf</h3><button onClick={() => setMailDraft(null)}><i className="fa-solid fa-xmark"></i></button></div>
             <div className="bg-slate-50 p-4 rounded-xl text-xs whitespace-pre-wrap max-h-96 overflow-y-auto">{mailDraft}</div>
             <button onClick={() => setMailDraft(null)} className="w-full mt-4 bg-indigo-600 text-white py-3 rounded-xl text-xs font-bold uppercase">Schließen</button>
          </div>
        </div>
      )}
    </div>
  );
};

const QuickActionButton = ({ onClick, icon, label, color, bgColor }: any) => (
  <button onClick={onClick} className="flex flex-col items-center space-y-1 group">
    <div className={`w-10 h-10 rounded-xl ${bgColor} ${color} flex items-center justify-center group-hover:scale-105 transition-all shadow-sm`}>
      <i className={`fa-solid ${icon} text-sm`}></i>
    </div>
    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{label}</span>
  </button>
);

const StatCard = ({ title, value, icon, color, bgColor }: any) => (
  <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
    <div>
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{title}</p>
      <h3 className="text-base sm:text-lg font-black text-slate-800">{value}</h3>
    </div>
    <div className={`${bgColor} ${color} w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center`}>
      <i className={`fa-solid ${icon} text-xs sm:text-sm`}></i>
    </div>
  </div>
);

export default Dashboard;
