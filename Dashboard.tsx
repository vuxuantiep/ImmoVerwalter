
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
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [newReminder, setNewReminder] = useState<Partial<Reminder>>({
    category: ReminderCategory.METER,
    date: new Date().toISOString().split('T')[0],
    isDone: false
  });
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

  const handleAddReminder = () => {
    if (!newReminder.title || !newReminder.date) return;
    const r: Reminder = {
      id: Math.random().toString(36).substr(2, 9),
      title: newReminder.title!,
      date: newReminder.date!,
      category: newReminder.category as ReminderCategory,
      isDone: false,
      propertyId: newReminder.propertyId
    };
    setReminders([...reminders, r]);
    setShowAddReminder(false);
    setNewReminder({ category: ReminderCategory.METER, date: new Date().toISOString().split('T')[0], isDone: false });
  };

  const toggleReminder = (id: string) => {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, isDone: !r.isDone } : r));
  };

  const handleCreateEmail = async (reminder: Reminder) => {
    setIsGeneratingMail(reminder.id);
    const property = properties.find(p => p.id === reminder.propertyId);
    const draft = await generateReminderEmail(reminder, property);
    setMailDraft(draft);
    setIsGeneratingMail(null);
  };

  const openInMailClient = () => {
    if (!mailDraft) return;
    const subject = mailDraft.split('\n')[0].replace('Betreff:', '').trim();
    const body = mailDraft.split('\n').slice(1).join('\n').trim();
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard title="Objekte" value={properties.length.toString()} icon="fa-building" color="text-blue-600" bgColor="bg-blue-100" />
        <StatCard title="Mieter" value={tenants.length.toString()} icon="fa-users" color="text-purple-600" bgColor="bg-purple-100" />
        <StatCard title="Belegung" value={`${occupancyRate.toFixed(0)}%`} icon="fa-door-open" color="text-emerald-600" bgColor="bg-emerald-100" />
        <StatCard title="Cashflow" value={`${(income - expenses).toFixed(0)}€`} icon="fa-euro-sign" color="text-indigo-600" bgColor="bg-indigo-100" />
      </div>

      {/* Immobilien-Schnellzugriff */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-800">Meine Immobilien</h3>
          <button onClick={() => setView('properties')} className="text-xs font-bold text-indigo-600 hover:underline">Alle ansehen</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.slice(0, 3).map(p => (
            <div 
              key={p.id} 
              onClick={() => onEditProperty(p.id)}
              className="group cursor-pointer bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 hover:shadow-lg transition-all"
            >
              <div className="h-32 overflow-hidden relative">
                <img 
                  src={`https://picsum.photos/seed/${p.id}/400/300`} 
                  alt={p.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <i className="fa-solid fa-pen text-white opacity-0 group-hover:opacity-100 transition-opacity"></i>
                </div>
              </div>
              <div className="p-4">
                <p className="font-bold text-slate-800 truncate">{p.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{p.address}</p>
              </div>
            </div>
          ))}
          {properties.length === 0 && (
            <button onClick={() => setView('properties')} className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition">
               <i className="fa-solid fa-plus text-2xl mb-2"></i>
               <span className="text-xs font-bold">Objekt hinzufügen</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-around">
            <button onClick={() => setView('tools', { tab: 'meters' })} className="flex flex-col items-center space-y-2 group">
              <div className="w-12 h-12 rounded-full bg-cyan-50 text-cyan-600 flex items-center justify-center group-hover:bg-cyan-600 group-hover:text-white transition-all">
                <i className="fa-solid fa-gauge-high"></i>
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Zähler scannen</span>
            </button>
            <button onClick={() => setView('finances')} className="flex flex-col items-center space-y-2 group">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
                <i className="fa-solid fa-plus"></i>
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Neue Buchung</span>
            </button>
            <button onClick={() => setView('tools', { tab: 'letter' })} className="flex flex-col items-center space-y-2 group">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <i className="fa-solid fa-envelope"></i>
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Brief erstellen</span>
            </button>
          </div>

          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Finanzübersicht</h3>
            <div className="h-64 md:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Letzte Aktivitäten</h3>
          <div className="space-y-3">
            {transactions.length > 0 ? (
              transactions.slice(-5).reverse().map(t => (
                <div key={t.id} className="flex items-center space-x-3 p-3 hover:bg-slate-50 rounded-lg transition border border-transparent hover:border-slate-100">
                  <div className={`p-2 rounded-full ${t.type === TransactionType.INCOME ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    <i className={`fa-solid ${t.type === TransactionType.INCOME ? 'fa-arrow-up' : 'fa-arrow-down'} text-[10px]`}></i>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-semibold truncate">{t.description}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">{t.date}</p>
                  </div>
                  <span className={`text-sm font-bold ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-red-600'}`}>
                    {t.type === TransactionType.INCOME ? '+' : '-'}{t.amount.toFixed(0)}€
                  </span>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-sm text-center py-8 italic">Keine Transaktionen erfasst.</p>
            )}
          </div>
        </div>
      </div>

      {mailDraft && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 p-6 flex justify-between items-center text-white">
              <div>
                <h3 className="font-bold text-xl">KI E-Mail Entwurf</h3>
                <p className="text-xs text-indigo-100 opacity-80 uppercase tracking-widest font-bold mt-1">Automatisch generiert</p>
              </div>
              <button onClick={() => setMailDraft(null)} className="p-2 hover:bg-white/10 rounded-full transition">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            <div className="p-8">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-medium text-slate-700 max-h-[400px] overflow-y-auto">
                {mailDraft}
              </div>
              <div className="mt-8 flex space-x-3">
                <button 
                  onClick={openInMailClient}
                  className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition"
                >
                  <i className="fa-solid fa-paper-plane mr-2"></i> In Mail-Client öffnen
                </button>
                <button 
                  onClick={() => setMailDraft(null)}
                  className="px-6 py-4 text-slate-500 font-bold hover:text-slate-800 transition"
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string; icon: string; color: string; bgColor: string; }> = ({ title, value, icon, color, bgColor }) => (
  <div className="bg-white p-3 md:p-6 rounded-2xl shadow-sm border border-slate-100">
    <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center">
      <div className={`${bgColor} ${color} p-2 md:p-3 rounded-xl mb-2 md:mb-0 md:order-last`}>
        <i className={`fa-solid ${icon} text-sm md:text-lg`}></i>
      </div>
      <div>
        <p className="text-[10px] md:text-sm font-bold text-slate-400 uppercase tracking-wider mb-0.5 md:mb-1">{title}</p>
        <h3 className="text-lg md:text-2xl font-black text-slate-800">{value}</h3>
      </div>
    </div>
  </div>
);

export default Dashboard;
