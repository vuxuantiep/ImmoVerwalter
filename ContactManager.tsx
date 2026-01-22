
import React, { useState } from 'react';
import { Handyman, Owner, Stakeholder, Tenant } from './types.ts';

interface ContactManagerProps {
  handymen: Handyman[];
  setHandymen: React.Dispatch<React.SetStateAction<Handyman[]>>;
  owners: Owner[];
  setOwners: React.Dispatch<React.SetStateAction<Owner[]>>;
  stakeholders: Stakeholder[];
  setStakeholders: React.Dispatch<React.SetStateAction<Stakeholder[]>>;
  tenants: Tenant[];
  setTenants: React.Dispatch<React.SetStateAction<Tenant[]>>;
}

type ContactTab = 'handymen' | 'owners' | 'stakeholders' | 'tenants';

const ContactManager: React.FC<ContactManagerProps> = ({ 
  handymen, setHandymen, owners, setOwners, stakeholders, setStakeholders, tenants, setTenants
}) => {
  const [activeTab, setActiveTab] = useState<ContactTab>('handymen');
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const handleAdd = () => {
    const id = Date.now().toString();
    if (activeTab === 'handymen') {
      if (!formData.name) return;
      setHandymen([...handymen, { id, ...formData }]);
    } else if (activeTab === 'owners') {
      if (!formData.name) return;
      setOwners([...owners, { id, ...formData }]);
    } else if (activeTab === 'stakeholders') {
      if (!formData.name) return;
      setStakeholders([...stakeholders, { id, ...formData }]);
    } else if (activeTab === 'tenants') {
      if (!formData.firstName || !formData.lastName) return;
      setTenants([...tenants, { id: 't' + id, ...formData }]);
    }
    setShowAdd(false);
    setFormData({});
  };

  const removeContact = (id: string) => {
    if (activeTab === 'handymen') setHandymen(handymen.filter(h => h.id !== id));
    if (activeTab === 'owners') setOwners(owners.filter(o => o.id !== id));
    if (activeTab === 'stakeholders') setStakeholders(stakeholders.filter(s => s.id !== id));
    if (activeTab === 'tenants') setTenants(tenants.filter(t => t.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100 w-fit overflow-x-auto scrollbar-hide">
          <TabButton active={activeTab === 'handymen'} onClick={() => { setActiveTab('handymen'); setShowAdd(false); }}>
            <i className="fa-solid fa-screwdriver-wrench mr-2"></i> Handwerker
          </TabButton>
          <TabButton active={activeTab === 'tenants'} onClick={() => { setActiveTab('tenants'); setShowAdd(false); }}>
            <i className="fa-solid fa-people-roof mr-2"></i> Mieter
          </TabButton>
          <TabButton active={activeTab === 'owners'} onClick={() => { setActiveTab('owners'); setShowAdd(false); }}>
            <i className="fa-solid fa-user-tie mr-2"></i> Vermieter
          </TabButton>
          <TabButton active={activeTab === 'stakeholders'} onClick={() => { setActiveTab('stakeholders'); setShowAdd(false); }}>
            <i className="fa-solid fa-briefcase mr-2"></i> Stakeholder
          </TabButton>
        </div>
        <button 
          onClick={() => { setShowAdd(true); setFormData({}); }} 
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl flex items-center justify-center font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition"
        >
          <i className="fa-solid fa-plus mr-2"></i> Neu hinzufügen
        </button>
      </div>

      {showAdd && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="font-bold text-lg mb-6 text-slate-800 border-b pb-2">
            {activeTab === 'handymen' ? 'Neuer Handwerker' : activeTab === 'owners' ? 'Neuer Vermieter' : activeTab === 'tenants' ? 'Neuer Mieter' : 'Neuer Stakeholder'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeTab === 'tenants' ? (
              <>
                <InputField label="Vorname" value={formData.firstName || ''} onChange={v => setFormData({...formData, firstName: v})} />
                <InputField label="Nachname" value={formData.lastName || ''} onChange={v => setFormData({...formData, lastName: v})} />
              </>
            ) : (
              <>
                <InputField label="Ansprechpartner / Name" value={formData.name || ''} onChange={v => setFormData({...formData, name: v})} />
                {(activeTab === 'handymen' || activeTab === 'owners') && (
                  <InputField label="Firma" value={formData.company || ''} onChange={v => setFormData({...formData, company: v})} />
                )}
              </>
            )}

            <InputField label="E-Mail" value={formData.email || ''} onChange={v => setFormData({...formData, email: v})} />
            <InputField label="Telefon" value={formData.phone || ''} onChange={v => setFormData({...formData, phone: v})} />

            {activeTab === 'handymen' && <InputField label="Gewerk" value={formData.trade || ''} onChange={v => setFormData({...formData, trade: v})} />}
            {activeTab === 'stakeholders' && <InputField label="Rolle (z.B. Versicherung)" value={formData.role || ''} onChange={v => setFormData({...formData, role: v})} />}
            
            <div className="lg:col-span-2 grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <InputField label="Straße & Nr." value={formData.address || ''} onChange={v => setFormData({...formData, address: v})} />
              </div>
              <InputField label="PLZ" value={formData.zip || ''} onChange={v => setFormData({...formData, zip: v})} />
            </div>
            <InputField label="Ort" value={formData.city || ''} onChange={v => setFormData({...formData, city: v})} />

            {activeTab === 'owners' && (
              <>
                <InputField label="Steuernummer" value={formData.taxId || ''} onChange={v => setFormData({...formData, taxId: v})} />
                <InputField label="Bankname" value={formData.bankName || ''} onChange={v => setFormData({...formData, bankName: v})} />
                <InputField label="IBAN" value={formData.iban || ''} onChange={v => setFormData({...formData, iban: v})} />
                <InputField label="BIC" value={formData.bic || ''} onChange={v => setFormData({...formData, bic: v})} />
              </>
            )}
          </div>
          <div className="mt-8 flex space-x-3">
            <button onClick={handleAdd} className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg transition">Speichern</button>
            <button onClick={() => setShowAdd(false)} className="px-6 py-3 text-slate-500 font-bold hover:text-slate-800">Abbrechen</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeTab === 'handymen' && handymen.map(h => (
          <ContactCard key={h.id} title={h.company || h.name} subtitle={h.trade} phone={h.phone} email={h.email} icon="fa-screwdriver-wrench" onRemove={() => removeContact(h.id)} />
        ))}
        {activeTab === 'tenants' && tenants.map(t => (
          <ContactCard key={t.id} title={`${t.firstName} ${t.lastName}`} subtitle={`Mieter`} phone={t.phone} email={t.email} icon="fa-person-shelter" onRemove={() => removeContact(t.id)} />
        ))}
        {activeTab === 'owners' && owners.map(o => (
          <ContactCard key={o.id} title={o.company || o.name} subtitle="Vermieter" phone={o.phone} email={o.email} icon="fa-user-tie" onRemove={() => removeContact(o.id)} />
        ))}
        {activeTab === 'stakeholders' && stakeholders.map(s => (
          <ContactCard key={s.id} title={s.name} subtitle={s.role} phone={s.phone} email={s.email} icon="fa-briefcase" onRemove={() => removeContact(s.id)} />
        ))}
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, children }: any) => (
  <button onClick={onClick} className={`px-4 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap ${active ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>{children}</button>
);

const InputField: React.FC<{ label: string, value: string, onChange: (v: string) => void, type?: string }> = ({ label, value, onChange, type = "text" }) => (
  <div className="flex flex-col space-y-1">
    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-wider">{label}</label>
    <input 
      type={type}
      className="border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm" 
      value={value} 
      onChange={e => onChange(e.target.value)} 
    />
  </div>
);

const ContactCard = ({ title, subtitle, phone, email, icon, onRemove }: any) => (
  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition group relative overflow-hidden">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center space-x-3">
        <div className="bg-slate-100 p-3 rounded-xl text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition"><i className={`fa-solid ${icon} text-lg`}></i></div>
        <div>
          <h3 className="font-bold text-slate-800 leading-tight">{title}</h3>
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{subtitle}</span>
        </div>
      </div>
      <button onClick={onRemove} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><i className="fa-solid fa-trash-can text-sm"></i></button>
    </div>
    <div className="space-y-2">
      <a href={`tel:${phone}`} className="flex items-center text-xs text-slate-600 hover:text-indigo-600 transition"><i className="fa-solid fa-phone w-6 text-slate-300"></i><span>{phone || 'Keine Nummer'}</span></a>
      <a href={`mailto:${email}`} className="flex items-center text-xs text-slate-600 hover:text-indigo-600 transition"><i className="fa-solid fa-envelope w-6 text-slate-300"></i><span className="truncate">{email || 'Keine Mail'}</span></a>
    </div>
  </div>
);

export default ContactManager;
