
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
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [mailDraft, setMailDraft] = useState<{ text: string, tenant: Tenant } | null>(null);

  const handleGenerateFinancialEmail = async (tenant: Tenant, topic: 'rent_adjustment' | 'utility_payment') => {
    const property = properties.find(p => p.units.some(u => u.tenantId === tenant.id));
    if (!property) return alert("Mieter keinem Objekt zugewiesen.");
    setIsGenerating(tenant.id);
    const draft = await generateTenantFinancialEmail(tenant, property, transactions.filter(t => t.propertyId === property.id), topic);
    setMailDraft({ text: draft, tenant });
    setIsGenerating(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b">
            <tr><th className="px-6 py-5">Name</th><th className="px-6 py-5">Wohnung</th><th className="px-6 py-5 text-right">Aktion</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tenants.map(t => (
              <tr key={t.id} className="hover:bg-slate-50 transition">
                <td className="px-6 py-4 font-bold text-slate-800">{t.firstName} {t.lastName}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{properties.find(p => p.units.some(u => u.tenantId === t.id))?.name || 'N/A'}</td>
                <td className="px-6 py-4 text-right">
                   <button onClick={() => handleGenerateFinancialEmail(t, 'rent_adjustment')} disabled={isGenerating === t.id} className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg font-bold">Mietanpassung</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {mailDraft && <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white p-6 rounded-2xl max-w-lg w-full"><p className="text-sm whitespace-pre-wrap mb-4">{mailDraft.text}</p><button onClick={() => setMailDraft(null)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg">Schließen</button></div></div>}
    </div>
  );
};

export default TenantManager;
