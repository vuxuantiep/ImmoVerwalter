
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
      if (!formData.name || !formData.trade) return;
      setHandymen([...handymen, { id, ...formData }]);
    } else if (activeTab === 'owners') {
      if (!formData.name || !formData.email) return;
      setOwners([...owners, { id, ...formData }]);
    } else if (activeTab === 'stakeholders') {
      if (!formData.name || !formData.role) return;
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
      <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100 w-fit overflow-x-auto">
        <TabButton active={activeTab === 'handymen'} onClick={() => setActiveTab('handymen')}>Handwerker</TabButton>
        <TabButton active={activeTab === 'tenants'} onClick={() => setActiveTab('tenants')}>Mieter</TabButton>
        <TabButton active={activeTab === 'owners'} onClick={() => setActiveTab('owners')}>Vermieter</TabButton>
        <TabButton active={activeTab === 'stakeholders'} onClick={() => setActiveTab('stakeholders')}>Stakeholder</TabButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {activeTab === 'handymen' && handymen.map(h => (
          <ContactCard key={h.id} title={h.name} subtitle={h.trade} phone={h.phone} email={h.email} icon="fa-hammer" onRemove={() => removeContact(h.id)} />
        ))}
        {activeTab === 'tenants' && tenants.map(t => (
          <ContactCard key={t.id} title={`${t.firstName} ${t.lastName}`} subtitle={`Mieter seit ${t.startDate}`} phone={t.phone} email={t.email} icon="fa-person-shelter" onRemove={() => removeContact(t.id)} />
        ))}
        {/* ... (Wiederholung für andere Kategorien) */}
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, children }: any) => (
  <button onClick={onClick} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${active ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>{children}</button>
);

const ContactCard = ({ title, subtitle, phone, email, icon, onRemove }: any) => (
  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition group overflow-hidden">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center space-x-3">
        <div className="bg-slate-100 p-3 rounded-xl text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600"><i className={`fa-solid ${icon} text-lg`}></i></div>
        <div><h3 className="font-bold text-slate-800">{title}</h3><span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{subtitle}</span></div>
      </div>
      <button onClick={onRemove} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><i className="fa-solid fa-trash-can text-sm"></i></button>
    </div>
    <div className="space-y-2"><a href={`tel:${phone}`} className="flex items-center text-sm text-slate-600 hover:text-indigo-600 transition"><i className="fa-solid fa-phone w-6 text-slate-300"></i><span>{phone || 'N/A'}</span></a></div>
  </div>
);

export default ContactManager;
