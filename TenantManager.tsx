
import React, { useState } from 'react';
import { Tenant, Property, Transaction } from './types.ts';
import { generateTenantFinancialEmail } from './geminiService.ts';

interface TenantManagerProps {
  tenants: Tenant[];
  setTenants: React.Dispatch<React.SetStateAction<Tenant[]>>;
  properties: Property[];
  transactions: Transaction[];
}

const TenantManager: React.FC<TenantManagerProps> = ({ tenants, setTenants, properties, transactions }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newTenant, setNewTenant] = useState({ firstName: '', lastName: '', email: '', phone: '', startDate: '' });
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [mailDraft, setMailDraft] = useState<{ text: string, tenant: Tenant } | null>(null);

  const handleAddTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenant.firstName || !newTenant.lastName) return;
    
    const tenant: Tenant = {
      id: 't' + Date.now(),
      ...newTenant
    };
    
    setTenants(prev => [...prev, tenant]);
    setShowAdd(false);
    setNewTenant({ firstName: '', lastName: '', email: '', phone: '', startDate: '' });
  };

  const handleDeleteTenant = (id: string) => {
    if (window.confirm('Möchten Sie diesen Mieter wirklich unwiderruflich löschen?')) {
      setTenants(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleGenerateFinancialEmail = async (tenant: Tenant, topic: 'rent_adjustment' | 'utility_payment') => {
    const property = properties.find(p => p.units.some(u => u.tenantId === tenant.id));
    if (!property) return alert("Mieter ist aktuell keinem Objekt zugewiesen.");
    
    setIsGenerating(tenant.id);
    const draft = await generateTenantFinancialEmail(tenant, property, transactions.filter(t => t.propertyId === property.id), topic);
    setMailDraft({ text: draft, tenant });
    setIsGenerating(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Mieter-Verwaltung</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tenants.length} Mieter insgesamt</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)} 
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-2xl flex items-center font-black text-xs uppercase tracking-widest hover:bg-black transition shadow-xl shadow-indigo-100 active:scale-95"
        >
          <i className="fa-solid fa-user-plus mr-2"></i> Neuer Mieter
        </button>
      </div>

      {showAdd && (
        <div className="bg-white p-6 rounded-[2rem] shadow-2xl border border-indigo-50 animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-slate-800 uppercase text-sm">Mieter registrieren</h3>
            <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600"><i className="fa-solid fa-xmark"></i></button>
          </div>
          <form onSubmit={handleAddTenant} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Vorname</label>
              <input required className="w-full border border-slate-200 p-3 rounded-xl bg-slate-50 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={newTenant.firstName} onChange={e => setNewTenant({...newTenant, firstName: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nachname</label>
              <input required className="w-full border border-slate-200 p-3 rounded-xl bg-slate-50 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={newTenant.lastName} onChange={e => setNewTenant({...newTenant, lastName: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">E-Mail</label>
              <input type="email" className="w-full border border-slate-200 p-3 rounded-xl bg-slate-50 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={newTenant.email} onChange={e => setNewTenant({...newTenant, email: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Telefon</label>
              <input className="w-full border border-slate-200 p-3 rounded-xl bg-slate-50 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={newTenant.phone} onChange={e => setNewTenant({...newTenant, phone: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Mietbeginn</label>
              <input type="date" className="w-full border border-slate-200 p-3 rounded-xl bg-slate-50 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={newTenant.startDate} onChange={e => setNewTenant({...newTenant, startDate: e.target.value})} />
            </div>
            <div className="lg:col-span-1 flex items-end">
              <button type="submit" className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition shadow-lg">Speichern</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] border-b">
              <tr>
                <th className="px-6 py-5">Mieter</th>
                <th className="px-6 py-5">Wohnung / Objekt</th>
                <th className="px-6 py-5">Kontakt</th>
                <th className="px-6 py-5 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenants.length > 0 ? (
                tenants.map(t => {
                  const assignedProperty = properties.find(p => p.units.some(u => u.tenantId === t.id));
                  const assignedUnit = assignedProperty?.units.find(u => u.tenantId === t.id);
                  
                  return (
                    <tr key={t.id} className="hover:bg-slate-50 transition group">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs">
                            {t.firstName.charAt(0)}{t.lastName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-black text-slate-800 text-sm">{t.firstName} {t.lastName}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Seit {t.startDate || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {assignedProperty ? (
                          <div>
                            <p className="text-xs font-black text-slate-700">{assignedProperty.name}</p>
                            <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-tighter">Einheit {assignedUnit?.number}</p>
                          </div>
                        ) : (
                          <span className="text-[9px] font-black bg-amber-50 text-amber-600 px-2 py-1 rounded-full uppercase">Nicht zugewiesen</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-slate-600">{t.email || '-'}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{t.phone || '-'}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center space-x-2">
                           <button 
                             onClick={() => handleGenerateFinancialEmail(t, 'rent_adjustment')} 
                             disabled={isGenerating === t.id} 
                             className="text-[9px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition disabled:opacity-50"
                           >
                             {isGenerating === t.id ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-euro-sign mr-1"></i>}
                             <span className="hidden sm:inline">Miete</span>
                           </button>
                           <button 
                             onClick={() => handleDeleteTenant(t.id)} 
                             className="p-2 text-slate-300 hover:text-rose-600 transition"
                             title="Mieter löschen"
                           >
                             <i className="fa-solid fa-trash-can text-sm"></i>
                           </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center text-slate-400 italic font-medium">
                    <i className="fa-solid fa-users-slash text-4xl mb-4 opacity-20 block"></i>
                    Keine Mieter erfasst. Klicken Sie oben auf "Neuer Mieter".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {mailDraft && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-[200] animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-[2.5rem] max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-slate-800 uppercase text-sm">Brief-Entwurf</h3>
                <button onClick={() => setMailDraft(null)} className="text-slate-400 hover:text-slate-600"><i className="fa-solid fa-xmark"></i></button>
             </div>
             <div className="bg-slate-50 p-6 rounded-2xl text-[11px] leading-relaxed whitespace-pre-wrap font-medium text-slate-700 max-h-[50vh] overflow-y-auto custom-scrollbar border border-slate-100 mb-6">
               {mailDraft.text}
             </div>
             <div className="flex space-x-3">
                <button 
                  onClick={() => {
                    const subject = mailDraft.text.split('\n')[0].replace(/Betreff:/i, '').trim() || 'Mietangelegenheit';
                    window.location.href = `mailto:${mailDraft.tenant.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailDraft.text)}`;
                  }} 
                  className="flex-1 bg-indigo-600 text-white py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition shadow-xl shadow-indigo-100"
                >
                  <i className="fa-solid fa-paper-plane mr-2"></i> Per Mail senden
                </button>
                <button onClick={() => setMailDraft(null)} className="px-6 py-3.5 text-slate-500 font-black text-[10px] uppercase">Schließen</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantManager;
