import React, { useState, useEffect } from 'react';
import { Property, Unit, Loan, Tenant, PropertyDocument, Owner, UnitType, Template, Transaction, MeterType, MeterReading, TransactionType } from './types.ts';

interface PropertyEditorProps {
  property: Property;
  tenants: Tenant[];
  owners: Owner[];
  templates: Template[];
  transactions: Transaction[];
  onSave: (updatedProperty: Property, updatedTransactions?: Transaction[]) => void;
  onCancel: () => void;
}

type AllocationKey = 'm2' | 'unit';

interface EditableBreakdownItem {
  id: string;
  category: string;
  total: number;
  keyType: AllocationKey;
  keyLabel: string;
  share: number;
}

const PropertyEditor: React.FC<PropertyEditorProps> = ({ property, tenants, owners, transactions, onSave, onCancel }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'units' | 'costs' | 'meters' | 'finance'>('general');
  const [editedProperty, setEditedProperty] = useState<Property>({ ...property });
  const [localTransactions, setLocalTransactions] = useState<Transaction[]>([...transactions]);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [unitTab, setUnitTab] = useState<'details' | 'docs' | 'meters' | 'utility'>('details');
  
  const [showLetterForm, setShowLetterForm] = useState(false);
  const [billingYear, setBillingYear] = useState('2024');
  const [letterIntro, setLetterIntro] = useState('anbei erhalten Sie die Abrechnung Ihrer anteiligen Betriebskosten für das Kalenderjahr.');
  const [letterClosing, setLetterClosing] = useState('Mit freundlichen Grüßen,\n' + (owners.find(o => o.id === property.ownerId)?.company || "Ihre Hausverwaltung"));
  const [formTotalSpace, setFormTotalSpace] = useState(0);
  const [formUnitSize, setFormUnitSize] = useState(0);
  const [editableBreakdown, setEditableBreakdown] = useState<EditableBreakdownItem[]>([]);

  // Added missing export functions referenced in the UI
  const handleDownloadWord = () => {
    window.print();
  };

  // Added missing export functions referenced in the UI
  const exportToExcel = () => {
    alert("Export zu Excel wird in der Vollversion unterstützt.");
  };

  const defaultTotalLivingSpace = editedProperty.units.reduce((sum, u) => sum + u.size, 0);
  const totalUnitsCount = editedProperty.units.length;
  const houseCosts = localTransactions.filter(t => t.propertyId === editedProperty.id && t.isUtilityRelevant);
  const selectedOwner = owners.find(o => o.id === editedProperty.ownerId);
  const ownerName = selectedOwner?.company || selectedOwner?.name || "Hausverwaltung";

  const editingUnit = editedProperty.units.find(u => u.id === editingUnitId);
  const assignedTenant = tenants.find(t => t.id === editingUnit?.tenantId);

  useEffect(() => {
    if (editingUnit) {
      setFormTotalSpace(defaultTotalLivingSpace || 100);
      setFormUnitSize(editingUnit.size || 50);
    }
  }, [editingUnitId, defaultTotalLivingSpace, editingUnit]);

  const calculateItemShare = (total: number, keyType: AllocationKey, uSize: number, tSpace: number) => {
    if (tSpace === 0 || totalUnitsCount === 0) return 0;
    const share = keyType === 'm2' ? (uSize / tSpace) * total : (1 / totalUnitsCount) * total;
    return Math.round(share * 100) / 100;
  };

  useEffect(() => {
    if (editingUnit && (unitTab === 'utility' || showLetterForm)) {
      const items = houseCosts.map(t => ({
        id: t.id,
        category: t.category,
        total: t.amount,
        keyType: 'm2' as AllocationKey,
        keyLabel: `${formUnitSize} / ${formTotalSpace} m²`,
        share: calculateItemShare(t.amount, 'm2', formUnitSize, formTotalSpace)
      }));
      setEditableBreakdown(items);
    }
  }, [editingUnitId, unitTab, localTransactions, formTotalSpace, formUnitSize, showLetterForm, editingUnit, totalUnitsCount, houseCosts]);

  const updateBreakdownItem = (id: string, field: keyof EditableBreakdownItem, value: any) => {
    setEditableBreakdown(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        updated.share = calculateItemShare(updated.total, updated.keyType, formUnitSize, formTotalSpace);
        updated.keyLabel = updated.keyType === 'm2' ? `${formUnitSize} / ${formTotalSpace} m²` : `1 / ${totalUnitsCount} WE`;
        return updated;
      }
      return item;
    }));
  };

  const updateLocalTransaction = (id: string, field: keyof Transaction, value: any) => {
    setLocalTransactions(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const currentUnitShare = editableBreakdown.reduce((sum, item) => sum + item.share, 0);
  const unitPrepaymentYear = editingUnit ? (editingUnit.utilityPrepayment * 12) : 0;
  const balance = currentUnitShare - unitPrepaymentYear;

  const handleUnitFileUpload = (e: React.ChangeEvent<HTMLInputElement>, unitId: string) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (re) => {
        const base64Data = re.target?.result as string;
        const newDoc: PropertyDocument = {
          id: 'd' + Date.now() + Math.random(),
          name: file.name,
          category: 'Einheit',
          uploadDate: new Date().toLocaleDateString('de-DE'),
          fileSize: (file.size / 1024).toFixed(0) + ' KB',
          fileData: base64Data,
          mimeType: file.type
        };
        setEditedProperty(prev => ({
          ...prev,
          units: prev.units.map(u => u.id === unitId ? { ...u, documents: [...(u.documents || []), newDoc] } : u)
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const updateUnitState = (id: string, field: keyof Unit, value: any) => {
    setEditedProperty(prev => ({ ...prev, units: prev.units.map(u => u.id === id ? { ...u, [field]: value } : u) }));
  };

  const updateField = (field: keyof Property, value: any) => { setEditedProperty(prev => ({ ...prev, [field]: value })); };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center lg:p-4">
      <div className="bg-white w-full max-w-7xl h-full lg:h-[95vh] lg:rounded-3xl shadow-2xl overflow-hidden flex flex-col no-print border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 p-4 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-xl"><i className="fa-solid fa-building text-sm"></i></div>
            <div className="min-w-0">
              <h2 className="text-sm font-black truncate">{editedProperty.name || 'Objekt bearbeiten'}</h2>
              <p className="text-slate-400 text-[9px] uppercase font-bold tracking-widest">Property Editor</p>
            </div>
          </div>
          <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/20 transition">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Scrollable Tabs */}
        <div className="bg-slate-50 border-b p-2 flex space-x-2 shrink-0 overflow-x-auto scrollbar-hide">
          <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')} label="Stamm" icon="fa-house-chimney" />
          <TabButton active={activeTab === 'units'} onClick={() => setActiveTab('units')} label="Einheiten" icon="fa-door-open" />
          <TabButton active={activeTab === 'costs'} onClick={() => setActiveTab('costs')} label="Ausgaben" icon="fa-file-invoice-dollar" />
          <TabButton active={activeTab === 'meters'} onClick={() => setActiveTab('meters')} label="Zähler" icon="fa-gauge-high" />
          <TabButton active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} label="Finanzen" icon="fa-landmark" />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white custom-scrollbar">
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
              <Section title="Grunddaten">
                <InputField label="Name des Objekts" value={editedProperty.name} onChange={(v: string) => updateField('name', v)} />
                <InputField label="Anschrift" value={editedProperty.address} onChange={(v: string) => updateField('address', v)} />
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="Baujahr" type="number" value={editedProperty.yearBuilt} onChange={(v: string) => updateField('yearBuilt', parseInt(v))} />
                  <InputField label="Heizung" value={editedProperty.heatingType} onChange={(v: string) => updateField('heatingType', v)} />
                </div>
              </Section>
              <Section title="Verwaltung">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Eigentümer festlegen</label>
                <select className="w-full border border-slate-200 p-3 rounded-2xl text-xs font-black bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-sm" value={editedProperty.ownerId || ''} onChange={e => updateField('ownerId', e.target.value)}>
                  <option value="">-- Nicht zugewiesen --</option>
                  {owners.map(o => <option key={o.id} value={o.id}>{o.company || o.name}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-4 mt-4">
                   <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                      <p className="text-[9px] font-black text-indigo-400 uppercase">Wohneinheiten</p>
                      <p className="text-xl font-black text-indigo-900">{totalUnitsCount}</p>
                   </div>
                   <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase">Gesamtfläche</p>
                      <p className="text-xl font-black text-slate-900">{defaultTotalLivingSpace} m²</p>
                   </div>
                </div>
              </Section>
            </div>
          )}

          {activeTab === 'units' && (
            <div className="space-y-4 animate-in fade-in">
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {editedProperty.units.map(unit => (
                  <div key={unit.id} className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm hover:border-indigo-400 transition cursor-pointer flex flex-col" onClick={() => { setEditingUnitId(unit.id); setUnitTab('details'); }}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600"><i className="fa-solid fa-door-open"></i></div>
                      <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${unit.tenantId ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{unit.tenantId ? 'Vermietet' : 'Leerstand'}</span>
                    </div>
                    <p className="font-black text-slate-900">{unit.number}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">{unit.size} m² • {(unit.baseRent + unit.utilityPrepayment).toFixed(2)}€/Mo</p>
                  </div>
                ))}
                <button onClick={() => updateField('units', [...editedProperty.units, { id: 'u'+Date.now(), number: 'Neue WE', size: 0, baseRent: 0, utilityPrepayment: 0, type: UnitType.RESIDENTIAL }])} className="border-2 border-dashed border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition group">
                  <i className="fa-solid fa-plus text-xl mb-2 group-hover:scale-110 transition-transform"></i>
                  <span className="text-[10px] font-black uppercase tracking-widest">Einheit hinzufügen</span>
                </button>
              </div>
              <div className="flex justify-center pt-4">
                 <button onClick={() => setActiveTab('general')} className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-emerald-200">Bereich Einheiten übernehmen</button>
              </div>
            </div>
          )}

          {activeTab === 'costs' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 border-b text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      <tr><th className="px-4 py-4">Kostenart</th><th className="px-4 py-4">Betrag (€)</th><th className="px-4 py-4 text-right">Aktion</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {houseCosts.map(cost => (
                        <tr key={cost.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3">
                            <input className="w-full bg-transparent font-bold text-slate-900 focus:ring-1 focus:ring-indigo-300 outline-none p-1 rounded" value={cost.category} onChange={e => updateLocalTransaction(cost.id, 'category', e.target.value)} />
                          </td>
                          <td className="px-4 py-3">
                            <input type="number" className="w-24 bg-transparent font-black text-indigo-700 outline-none p-1 rounded" value={cost.amount} onChange={e => updateLocalTransaction(cost.id, 'amount', parseFloat(e.target.value) || 0)} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => setLocalTransactions(prev => prev.filter(t => t.id !== cost.id))} className="text-slate-300 hover:text-red-500 p-2"><i className="fa-solid fa-trash-can"></i></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                 <button onClick={() => setLocalTransactions([...localTransactions, { id: 't'+Date.now(), propertyId: editedProperty.id, type: TransactionType.EXPENSE, category: 'Neue Position', amount: 0, date: new Date().toISOString().split('T')[0], description: '', isUtilityRelevant: true }])} className="w-full sm:w-auto bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg">Neue Ausgabe +</button>
                 <button onClick={() => setActiveTab('general')} className="w-full sm:w-auto bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg">Änderungen Ausgaben übernehmen</button>
              </div>
            </div>
          )}

          {activeTab === 'meters' && (
             <div className="space-y-6 animate-in fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                   {editedProperty.meterReadings?.map(meter => (
                     <div key={meter.id} className="bg-slate-50 p-4 rounded-3xl border border-slate-200 relative">
                       <h4 className="text-[10px] font-black text-indigo-600 uppercase mb-4 tracking-widest">{meter.type} Hauptzähler</h4>
                       <div className="space-y-3">
                         <InputField label="Nummer" value={meter.serialNumber} onChange={(v: string) => updateField('meterReadings', editedProperty.meterReadings?.map(m => m.id === meter.id ? {...m, serialNumber: v} : m))} />
                         <InputField label="Stand" type="number" value={meter.value} onChange={(v: string) => updateField('meterReadings', editedProperty.meterReadings?.map(m => m.id === meter.id ? {...m, value: parseFloat(v)} : m))} />
                       </div>
                       <button onClick={() => updateField('meterReadings', editedProperty.meterReadings?.filter(m => m.id !== meter.id))} className="absolute top-4 right-4 text-slate-300 hover:text-red-500"><i className="fa-solid fa-trash-can"></i></button>
                     </div>
                   ))}
                   <button onClick={() => updateField('meterReadings', [...(editedProperty.meterReadings || []), { id: 'm'+Date.now(), type: MeterType.WATER, value: 0, unit: 'm³', date: new Date().toISOString().split('T')[0], serialNumber: '' }])} className="border-2 border-dashed border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 transition shadow-sm font-black uppercase text-[10px]"><i className="fa-solid fa-plus mb-2"></i>Zähler hinzufügen</button>
                </div>
                <div className="flex justify-end">
                   <button onClick={() => setActiveTab('general')} className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg">Änderungen Zähler übernehmen</button>
                </div>
             </div>
          )}

          {activeTab === 'finance' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {editedProperty.loans?.map(loan => (
                  <div key={loan.id} className="bg-slate-50 p-5 rounded-3xl border border-slate-200 relative">
                    <div className="flex justify-between items-center mb-4">
                      <input className="font-black text-indigo-600 uppercase text-sm bg-transparent border-none outline-none focus:ring-0 p-0" value={loan.bankName} onChange={e => setEditedProperty(prev => ({ ...prev, loans: prev.loans?.map(l => l.id === loan.id ? { ...l, bankName: e.target.value } : l) }))} />
                      <button onClick={() => updateField('loans', editedProperty.loans?.filter(l => l.id !== loan.id))} className="text-slate-300 hover:text-red-500"><i className="fa-solid fa-trash-can"></i></button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InputField label="Restschuld €" type="number" value={loan.currentBalance} onChange={(v: string) => updateField('loans', editedProperty.loans?.map(l => l.id === loan.id ? {...l, currentBalance: parseFloat(v)} : l))} />
                      <InputField label="Zins %" type="number" value={loan.interestRate} onChange={(v: string) => updateField('loans', editedProperty.loans?.map(l => l.id === loan.id ? {...l, interestRate: parseFloat(v)} : l))} />
                      <InputField label="Monatsrate €" type="number" value={loan.monthlyInstallment} onChange={(v: string) => updateField('loans', editedProperty.loans?.map(l => l.id === loan.id ? {...l, monthlyInstallment: parseFloat(v)} : l))} />
                      <InputField label="Zinsbindung bis" type="date" value={loan.fixedUntil} onChange={(v: string) => updateField('loans', editedProperty.loans?.map(l => l.id === loan.id ? {...l, fixedUntil: v} : l))} />
                    </div>
                  </div>
                ))}
                <button onClick={() => updateField('loans', [...(editedProperty.loans || []), { id: 'l'+Date.now(), bankName: 'Hausbank', totalAmount: 0, currentBalance: 0, interestRate: 0, repaymentRate: 0, fixedUntil: '', monthlyInstallment: 0 }])} className="border-2 border-dashed border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 transition uppercase font-black text-[10px]"><i className="fa-solid fa-plus mb-2"></i>Kredit hinzufügen</button>
              </div>
              <div className="flex justify-end">
                 <button onClick={() => setActiveTab('general')} className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg">Änderungen Finanzen übernehmen</button>
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-4 border-t bg-slate-50 flex justify-end space-x-3 shrink-0">
          <button onClick={onCancel} className="px-6 py-3 text-xs font-black text-slate-500 uppercase">Verwerfen</button>
          <button onClick={() => onSave(editedProperty, localTransactions)} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase shadow-xl shadow-indigo-100 active:scale-95 transition-all">Alles speichern</button>
        </div>
      </div>

      {/* UNIT MODAL - MOBILE FULLSCREEN */}
      {editingUnitId && !showLetterForm && editingUnit && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[110] flex items-center justify-center lg:p-4 no-print">
           <div className="bg-white w-full max-w-4xl h-full lg:h-[92vh] lg:rounded-3xl shadow-2xl overflow-hidden flex flex-col">
              <div className="bg-slate-900 p-4 flex justify-between items-center text-white shrink-0">
                 <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg"><i className="fa-solid fa-key"></i></div>
                    <div>
                       <h3 className="text-sm font-black uppercase">Einheit {editingUnit.number}</h3>
                       <p className="text-[10px] text-slate-400 font-bold uppercase">{editingUnit.size} m² Wohnfläche</p>
                    </div>
                 </div>
                 <button onClick={() => setEditingUnitId(null)} className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-full">
                    <i className="fa-solid fa-xmark"></i>
                 </button>
              </div>

              <div className="bg-slate-50 border-b p-2 flex space-x-2 shrink-0 overflow-x-auto scrollbar-hide">
                 <UnitTabButton active={unitTab === 'details'} onClick={() => setUnitTab('details')} label="Miete" icon="fa-user-tag" />
                 <UnitTabButton active={unitTab === 'docs'} onClick={() => setUnitTab('docs')} label="Files" icon="fa-folder-open" />
                 <UnitTabButton active={unitTab === 'meters'} onClick={() => setUnitTab('meters')} label="Meter" icon="fa-gauge" />
                 <UnitTabButton active={unitTab === 'utility'} onClick={() => setUnitTab('utility')} label="Abrechnung" icon="fa-calculator" />
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-white custom-scrollbar">
                 {unitTab === 'details' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in">
                       <Section title="Zuweisung & Mieter">
                          <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Mieter auswählen</label>
                          <select 
                            className="w-full border border-slate-200 p-4 rounded-2xl bg-slate-50 text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" 
                            value={editingUnit.tenantId || ''} 
                            onChange={(e) => updateUnitState(editingUnit.id, 'tenantId', e.target.value)}
                          >
                             <option value="" className="text-slate-900">-- Aktuell Leerstehend --</option>
                             {tenants.map(t => <option key={t.id} value={t.id} className="text-slate-900">{t.firstName} {t.lastName}</option>)}
                          </select>
                          <div className="mt-4"><InputField label="Nummer / Etage" value={editingUnit.number} onChange={(v: string) => updateUnitState(editingUnit.id, 'number', v)} /></div>
                       </Section>
                       <Section title="Konditionen (Soll)">
                          <div className="grid grid-cols-2 gap-4">
                             <InputField label="Fläche m²" type="number" value={editingUnit.size} onChange={(v: string) => updateUnitState(editingUnit.id, 'size', parseFloat(v))} />
                             <InputField label="Kaltmiete €" type="number" value={editingUnit.baseRent} onChange={(v: string) => updateUnitState(editingUnit.id, 'baseRent', parseFloat(v))} />
                             <InputField label="Vorausz. BK €" type="number" value={editingUnit.utilityPrepayment} onChange={(v: string) => updateUnitState(editingUnit.id, 'utilityPrepayment', parseFloat(v))} />
                             <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex flex-col justify-center">
                                <p className="text-[9px] font-black text-indigo-400 uppercase">Warmmiete</p>
                                <p className="text-lg font-black text-indigo-900">{(editingUnit.baseRent + editingUnit.utilityPrepayment).toFixed(2)}€</p>
                             </div>
                          </div>
                       </Section>
                    </div>
                 )}

                 {unitTab === 'docs' && (
                    <div className="space-y-6 animate-in fade-in">
                       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 gap-4">
                          <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Einheiten-Dateien (PDF/Bilder)</h4>
                          <label className="cursor-pointer w-full sm:w-auto bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg flex items-center justify-center space-x-2 active:scale-95 transition-transform">
                            <i className="fa-solid fa-cloud-arrow-up"></i>
                            <span>Dokument hochladen</span>
                            <input type="file" className="hidden" multiple onChange={(e) => handleUnitFileUpload(e, editingUnit.id)} />
                          </label>
                       </div>
                       <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                          {editingUnit.documents?.map(doc => (
                            <div key={doc.id} className="bg-slate-50 border border-slate-200 rounded-3xl p-3 relative group overflow-hidden shadow-sm">
                               <div className="h-24 bg-slate-200 rounded-2xl mb-3 flex items-center justify-center overflow-hidden">
                                 {doc.mimeType.includes('image') ? <img src={doc.fileData} className="w-full h-full object-cover" alt="Vorschau" /> : <i className="fa-solid fa-file-pdf text-3xl text-rose-500"></i>}
                               </div>
                               <p className="text-[10px] font-black text-slate-800 truncate">{doc.name}</p>
                               <button onClick={() => updateUnitState(editingUnit.id, 'documents', editingUnit.documents?.filter(d => d.id !== doc.id))} className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded-xl opacity-0 group-hover:opacity-100 transition shadow-lg"><i className="fa-solid fa-trash text-[10px]"></i></button>
                            </div>
                          ))}
                       </div>
                    </div>
                 )}

                 {unitTab === 'meters' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in">
                       {editingUnit.meterReadings?.map(meter => (
                          <div key={meter.id} className="bg-white p-5 rounded-3xl border border-slate-200 relative shadow-sm">
                             <h4 className="font-black text-indigo-600 uppercase text-[10px] mb-4 tracking-widest">{meter.type} Zähler</h4>
                             <div className="grid grid-cols-1 gap-3">
                                <InputField label="Zählernummer" value={meter.serialNumber} onChange={(v: string) => updateUnitState(editingUnit.id, 'meterReadings', editingUnit.meterReadings?.map(m => m.id === meter.id ? {...m, serialNumber: v} : m))} />
                                <InputField label="Zählerstand" type="number" value={meter.value} onChange={(v: string) => updateUnitState(editingUnit.id, 'meterReadings', editingUnit.meterReadings?.map(m => m.id === meter.id ? {...m, value: parseFloat(v)} : m))} />
                             </div>
                             <button onClick={() => updateUnitState(editingUnit.id, 'meterReadings', editingUnit.meterReadings?.filter(m => m.id !== meter.id))} className="absolute top-5 right-5 text-slate-300 hover:text-red-500"><i className="fa-solid fa-trash-can"></i></button>
                          </div>
                       ))}
                       <button onClick={() => updateUnitState(editingUnit.id, 'meterReadings', [...(editingUnit.meterReadings || []), { id: 'm'+Date.now(), type: MeterType.WATER, value: 0, unit: 'm³', date: new Date().toISOString().split('T')[0], serialNumber: '' }])} className="border-2 border-dashed border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 transition font-black uppercase text-[10px]"><i className="fa-solid fa-plus mb-2"></i>Unit-Zähler +</button>
                    </div>
                 )}

                 {unitTab === 'utility' && (
                    <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-8 animate-in fade-in">
                       <div className="w-full max-w-sm bg-slate-50 border border-slate-200 p-6 rounded-3xl flex flex-col items-center shadow-inner">
                         <label className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Abrechnungszeitraum (Jahr)</label>
                         <input type="number" className="w-32 text-center text-3xl font-black bg-white border border-slate-200 rounded-2xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-600" value={billingYear} onChange={e => setBillingYear(e.target.value)} />
                       </div>
                       <div className="bg-slate-900 p-8 rounded-[3rem] text-white text-center w-full max-w-md shadow-2xl relative overflow-hidden group">
                          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-2">Vorschau Saldo</p>
                          <h4 className={`text-5xl font-black mb-4 ${balance >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{Math.abs(balance).toFixed(2)} €</h4>
                          <p className="text-[10px] text-slate-400 mb-8 uppercase font-bold tracking-widest">{balance >= 0 ? 'Nachzahlung durch Mieter' : 'Guthaben für Mieter'}</p>
                          <button onClick={() => setShowLetterForm(true)} disabled={!assignedTenant} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black hover:bg-indigo-700 transition flex items-center justify-center space-x-3 text-xs uppercase shadow-xl disabled:opacity-50 active:scale-95">
                             <i className="fa-solid fa-file-signature text-lg"></i>
                             <span>Designer öffnen</span>
                          </button>
                       </div>
                    </div>
                 )}
              </div>

              <div className="p-4 border-t bg-slate-50 flex justify-end shrink-0">
                  <button onClick={() => setEditingUnitId(null)} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all">Änderungen fixieren</button>
              </div>
           </div>
        </div>
      )}

      {/* INTERAKTIVER BRIEF-DESIGNER - FULLSCREEN MOBILE */}
      {showLetterForm && editingUnit && assignedTenant && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[300] flex items-center justify-center no-print">
          <div className="bg-white w-full h-full lg:max-w-6xl lg:h-[96vh] lg:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="bg-indigo-700 p-4 flex justify-between items-center text-white shrink-0">
               <div>
                  <h3 className="font-black text-sm uppercase">Abrechnungs-Designer</h3>
                  <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest">Echtzeit-Dokumenteneditor</p>
               </div>
               <button onClick={() => setShowLetterForm(false)} className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-full">
                  <i className="fa-solid fa-xmark"></i>
               </button>
            </div>
            
            <div className="p-2 sm:p-4 bg-slate-200 overflow-y-auto custom-scrollbar flex-1 flex flex-col items-center">
              <div id="printable-area" className="bg-white shadow-2xl mx-auto w-full max-w-[210mm] min-h-[297mm] text-black font-sans p-6 md:p-16 relative border border-slate-300">
                <div className="text-[8pt] text-slate-600 border-b pb-1 mb-8 italic">{ownerName} • {selectedOwner?.address}</div>
                <div className="flex justify-between mb-10">
                   <div className="text-[10pt] space-y-1">
                      <p className="font-black text-base">{assignedTenant.firstName} {assignedTenant.lastName}</p>
                      <p>{editedProperty.address}</p>
                      <div className="flex items-center space-x-1 text-indigo-700 font-bold mt-4 text-[7.5pt]">
                        <span>Einheit:</span>
                        <input className="bg-slate-100 border border-slate-200 no-print font-black px-2 rounded w-16 text-black outline-none" value={editingUnit.number} onChange={e => updateUnitState(editingUnit.id, 'number', e.target.value)} />
                        <span className="hidden print:inline">{editingUnit.number}</span>
                      </div>
                   </div>
                   <div className="text-right text-[8pt] text-slate-500 font-bold uppercase">{selectedOwner?.city}, {new Date().toLocaleDateString('de-DE')}</div>
                </div>

                <div className="text-xl font-black mb-8 text-black border-l-4 border-indigo-600 pl-3 py-1 uppercase flex items-center">
                   <span>BK-Abrechnung&nbsp;</span>
                   <input className="bg-transparent border-none w-16 font-black text-indigo-600 no-print outline-none p-0" value={billingYear} onChange={e => setBillingYear(e.target.value)} />
                   <span className="hidden print:inline">{billingYear}</span>
                </div>
                
                <div className="text-[10pt] mb-8 leading-relaxed">
                   <p className="mb-2 font-black">Sehr geehrte(r) Frau/Herr {assignedTenant.lastName},</p>
                   <textarea className="w-full bg-slate-50 p-4 rounded-2xl text-[10pt] no-print border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-300 h-24 mb-2" value={letterIntro} onChange={e => setLetterIntro(e.target.value)} />
                   <p className="hidden print:block whitespace-pre-wrap">{letterIntro}</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-[8.5pt] border-collapse border border-black">
                      <thead className="bg-slate-100 font-black">
                        <tr>
                          <th className="p-2 border border-black text-left">Kostenart</th>
                          <th className="p-2 border border-black text-right">Haus Summe</th>
                          <th className="p-2 border border-black text-center">Verteiler</th>
                          <th className="p-2 border border-black text-right">Anteil</th>
                        </tr>
                      </thead>
                      <tbody className="font-medium">
                        {editableBreakdown.map((item) => (
                          <tr key={item.id}>
                            <td className="p-1.5 border border-black">
                              <input className="w-full bg-transparent border-none no-print font-bold text-black text-[8.5pt] outline-none" value={item.category} onChange={(e) => updateBreakdownItem(item.id, 'category', e.target.value)} />
                              <span className="hidden print:inline">{item.category}</span>
                            </td>
                            <td className="p-1.5 border border-black text-right">
                              <input type="number" className="w-16 text-right bg-transparent border-none no-print font-bold text-black text-[8.5pt] outline-none" value={item.total} onChange={(e) => updateBreakdownItem(item.id, 'total', parseFloat(e.target.value) || 0)} />
                              <span className="hidden print:inline">{item.total.toFixed(2)} €</span>
                            </td>
                            <td className="p-1.5 border border-black text-center text-[7pt]">
                               <select className="bg-slate-100 border border-slate-300 rounded px-1 no-print font-black text-indigo-700 outline-none" value={item.keyType} onChange={(e) => updateBreakdownItem(item.id, 'keyType', e.target.value as AllocationKey)}>
                                  <option value="m2">m²</option><option value="unit">WE</option>
                               </select>
                               <span className="hidden print:inline">{item.keyLabel}</span>
                            </td>
                            <td className="p-1.5 border border-black text-right font-black">{item.share.toFixed(2)} €</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="font-black bg-slate-50">
                        <tr><td colSpan={3} className="p-2 text-right border border-black text-[8pt] uppercase">Summe Anteil Mieter:</td><td className="p-2 text-right border border-black">{currentUnitShare.toFixed(2)} €</td></tr>
                        <tr className="text-rose-700"><td colSpan={3} className="p-2 text-right border border-black text-[8pt] uppercase">Vorauszahlungen:</td><td className="p-2 text-right border border-black">-{unitPrepaymentYear.toFixed(2)} €</td></tr>
                        <tr className={`${balance >= 0 ? 'bg-rose-50' : 'bg-emerald-50'}`}><td colSpan={3} className="p-3 text-right border border-black uppercase text-[9pt] font-black">{balance >= 0 ? 'Nachzahlung:' : 'Guthaben:'}</td><td className={`p-3 text-right border border-black text-base font-black ${balance >= 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{Math.abs(balance).toFixed(2)} €</td></tr>
                      </tfoot>
                  </table>
                </div>

                <div className="mt-10 text-[10pt]">
                   <textarea className="w-full bg-slate-50 p-4 rounded-2xl no-print border border-slate-200 h-24 outline-none" value={letterClosing} onChange={e => setLetterClosing(e.target.value)} />
                   <p className="hidden print:block whitespace-pre-wrap">{letterClosing}</p>
                   <div className="mt-10 font-black">
                      <p className="text-[11pt]">{ownerName}</p>
                      <p className="text-[7pt] text-slate-500 uppercase tracking-widest">Objektverwaltung</p>
                   </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border-t flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
               <div className="flex space-x-2 w-full md:w-auto">
                  <button onClick={handleDownloadWord} className="flex-1 px-6 py-3.5 bg-indigo-700 text-white rounded-2xl font-black text-[9px] uppercase shadow-lg flex items-center justify-center space-x-2"><i className="fa-solid fa-file-word text-base"></i><span>Word</span></button>
                  <button onClick={exportToExcel} className="flex-1 px-6 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-[9px] uppercase shadow-lg flex items-center justify-center space-x-2"><i className="fa-solid fa-file-excel text-base"></i><span>Excel</span></button>
               </div>
               <button onClick={() => setShowLetterForm(false)} className="w-full md:w-auto px-8 py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-black text-[9px] uppercase hover:bg-slate-200 transition">Schließen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const UnitTabButton = ({ active, onClick, label, icon }: any) => (
  <button onClick={onClick} className={`py-3 px-4 text-[9px] font-black uppercase tracking-widest border-b-2 transition flex items-center space-x-2 shrink-0 ${active ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-400'}`}>
    <i className={`fa-solid ${icon} text-sm`}></i>
    <span>{label}</span>
  </button>
);

const TabButton = ({ active, onClick, label, icon }: any) => (
  <button onClick={onClick} className={`px-5 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition flex items-center space-x-2 shrink-0 ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-500 hover:text-indigo-600'}`}><i className={`fa-solid ${icon}`}></i><span>{label}</span></button>
);

const Section = ({ title, children }: any) => (
  <div className="space-y-4"><h3 className="font-black text-slate-900 uppercase tracking-[0.2em] text-[10px] border-b pb-2 flex items-center"><i className="fa-solid fa-chevron-right mr-2 text-indigo-600"></i>{title}</h3><div className="space-y-4">{children}</div></div>
);

const InputField = ({ label, value, onChange, type = "text" }: any) => (
  <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">{label}</label><input type={type} value={value || ''} onChange={e => onChange(e.target.value)} className="w-full border border-slate-200 p-3.5 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none bg-slate-50 font-black text-slate-900 text-xs transition-all shadow-sm" /></div>
);

export default PropertyEditor;