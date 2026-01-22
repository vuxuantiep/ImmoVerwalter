
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

const PropertyEditor: React.FC<PropertyEditorProps> = ({ property, tenants, owners, templates, transactions, onSave, onCancel }) => {
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
  }, [editingUnitId, defaultTotalLivingSpace]);

  const calculateItemShare = (total: number, keyType: AllocationKey, uSize: number, tSpace: number) => {
    if (tSpace === 0) return 0;
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
  }, [editingUnitId, unitTab, localTransactions, formTotalSpace, formUnitSize, showLetterForm]);

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

  const currentUnitShare = editableBreakdown.reduce((sum, item) => sum + item.share, 0);
  const unitPrepaymentYear = editingUnit ? (editingUnit.utilityPrepayment * 12) : 0;
  const balance = currentUnitShare - unitPrepaymentYear;

  const handleDownloadWord = () => {
    const element = document.getElementById('printable-area');
    if (!element) return;

    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Abrechnung</title>
      <style>
        @page { size: 21cm 29.7cm; margin: 2.5cm; }
        body { font-family: 'Arial', sans-serif; font-size: 11pt; color: #000; line-height: 1.3; }
        table { border-collapse: collapse; width: 85%; margin: 20px auto; border: 0.5pt solid #cccccc; }
        th, td { border: 0.5pt solid #cccccc; padding: 5pt; text-align: left; font-size: 9.5pt; }
        th { background-color: #f3f4f6; font-weight: bold; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
      </style>
      </head><body>`;
    
    const footer = "</body></html>";
    const clone = element.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.no-print').forEach(el => el.remove());
    
    clone.querySelectorAll('input, select, textarea').forEach((el: any) => {
      const span = document.createElement('span');
      span.textContent = el.tagName === 'SELECT' ? el.options[el.selectedIndex].text : el.value;
      el.parentNode.replaceChild(span, el);
    });

    const htmlContent = header + clone.innerHTML + footer;
    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Abrechnung_${assignedTenant?.lastName || 'Mieter'}_${billingYear}.doc`;
    link.click();
  };

  const exportToExcel = () => {
    let excelXml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><style>.num { mso-number-format: "#,##0.00"; text-align: right; }</style></head>
      <body><table>
        <tr><td colspan="4"><b>Betriebskostenabrechnung ${billingYear}</b></td></tr>
        <tr><td><b>Kostenart</b></td><td><b>Haus Gesamt</b></td><td><b>Schlüssel</b></td><td><b>Anteil</b></td></tr>
        ${editableBreakdown.map(item => `<tr><td>${item.category}</td><td class="num">${item.total.toFixed(2)}</td><td>${item.keyLabel}</td><td class="num">${item.share.toFixed(2)}</td></tr>`).join('')}
        <tr><td colspan="3"><b>Summe:</b></td><td class="num"><b>${currentUnitShare.toFixed(2)}</b></td></tr>
      </table></body></html>`;
    const blob = new Blob([excelXml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Excel_Abrechnung_${assignedTenant?.lastName}.xls`;
    a.click();
  };

  const updateUnitState = (id: string, field: keyof Unit, value: any) => {
    setEditedProperty(prev => ({
      ...prev,
      units: prev.units.map(u => u.id === id ? { ...u, [field]: value } : u)
    }));
  };

  const addMeterReading = (type: MeterType, isHouse: boolean = true) => {
    const newReading: MeterReading = {
      id: 'm' + Date.now(),
      type,
      value: 0,
      unit: type === MeterType.ELECTRICITY ? 'kWh' : 'm³',
      date: new Date().toISOString().split('T')[0],
      serialNumber: ''
    };
    if (isHouse) {
      setEditedProperty(prev => ({ ...prev, meterReadings: [...(prev.meterReadings || []), newReading] }));
    } else if (editingUnitId) {
       setEditedProperty(prev => ({
         ...prev,
         units: prev.units.map(u => u.id === editingUnitId ? { ...u, meterReadings: [...(u.meterReadings || []), newReading] } : u)
       }));
    }
  };

  const updateField = (field: keyof Property, value: any) => {
    setEditedProperty(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-7xl h-[95vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col no-print text-slate-800 border border-slate-200">
        {/* Haupt-Header */}
        <div className="bg-slate-900 p-6 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center space-x-4">
            <div className="bg-indigo-600 p-3 rounded-2xl shadow-xl shadow-indigo-500/20"><i className="fa-solid fa-building text-xl"></i></div>
            <div><h2 className="text-2xl font-black">{editedProperty.name || 'Immobilie'}</h2><p className="text-slate-400 text-[10px] font-black uppercase tracking-widest tracking-tighter">Zentrale Objektverwaltung</p></div>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition"><i className="fa-solid fa-xmark text-xl"></i></button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-50 border-b px-6 py-2 flex space-x-2 shrink-0 overflow-x-auto">
          <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')} label="Stammdaten" icon="fa-house-chimney" />
          <TabButton active={activeTab === 'units'} onClick={() => setActiveTab('units')} label="Einheiten" icon="fa-door-open" />
          <TabButton active={activeTab === 'costs'} onClick={() => setActiveTab('costs')} label="Ausgaben" icon="fa-file-invoice-dollar" />
          <TabButton active={activeTab === 'meters'} onClick={() => setActiveTab('meters')} label="Haus-Zähler" icon="fa-gauge-high" />
          <TabButton active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} label="Finanzierung" icon="fa-landmark" />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/20 custom-scrollbar">
          {activeTab === 'general' && (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in">
                <Section title="Basis-Informationen">
                   <InputField label="Name" value={editedProperty.name} onChange={(v: string) => updateField('name', v)} />
                   <InputField label="Anschrift" value={editedProperty.address} onChange={(v: string) => updateField('address', v)} />
                   <div className="grid grid-cols-2 gap-4">
                      <InputField label="Baujahr" type="number" value={editedProperty.yearBuilt} onChange={(v: string) => updateField('yearBuilt', parseInt(v))} />
                      <InputField label="Heizung" value={editedProperty.heatingType} onChange={(v: string) => updateField('heatingType', v)} />
                   </div>
                </Section>
                <Section title="Eigentümer & Summary">
                  <select className="w-full border-2 border-slate-200 p-4 rounded-2xl font-bold bg-white mb-6 outline-none focus:border-indigo-500" value={editedProperty.ownerId || ''} onChange={e => updateField('ownerId', e.target.value)}>
                    <option value="">-- Eigentümer wählen --</option>
                    {owners.map(o => <option key={o.id} value={o.id}>{o.company || o.name}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-white p-5 rounded-3xl border shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Einheiten</p>
                        <p className="text-2xl font-black">{totalUnitsCount}</p>
                     </div>
                     <div className="bg-white p-5 rounded-3xl border shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fläche gesamt</p>
                        <p className="text-2xl font-black">{defaultTotalLivingSpace} m²</p>
                     </div>
                  </div>
                </Section>
             </div>
          )}

          {activeTab === 'units' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in">
               {editedProperty.units.map(unit => (
                 <div key={unit.id} className="bg-white p-6 rounded-[2.5rem] border shadow-sm group hover:border-indigo-400 transition cursor-pointer" onClick={() => { setEditingUnitId(unit.id); setUnitTab('details'); }}>
                    <div className="flex items-center space-x-4 mb-4">
                       <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 text-xl shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all"><i className="fa-solid fa-door-open"></i></div>
                       <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-900 truncate">{unit.number}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-black">{unit.size} m² • {unit.baseRent} €</p>
                       </div>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                       <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${unit.tenantId ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{unit.tenantId ? 'Vermietet' : 'Leerstand'}</span>
                       <i className="fa-solid fa-arrow-right-long text-slate-300 group-hover:text-indigo-600 transition"></i>
                    </div>
                 </div>
               ))}
               <button onClick={() => updateField('units', [...editedProperty.units, { id: 'u'+Date.now(), number: 'Neu', size: 0, baseRent: 0, utilityPrepayment: 0, type: UnitType.RESIDENTIAL }])} className="border-2 border-dashed border-slate-200 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-slate-300 hover:text-indigo-600 hover:border-indigo-300 transition">
                  <i className="fa-solid fa-plus text-2xl mb-2"></i><span className="text-[10px] font-black uppercase tracking-widest">Neue Einheit</span>
               </button>
            </div>
          )}

          {activeTab === 'meters' && (
            <div className="space-y-6 animate-in fade-in">
               <Section title="Hauptzähler Hausanschluss">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {editedProperty.meterReadings?.map(meter => (
                        <div key={meter.id} className="bg-white p-8 rounded-[2rem] border shadow-sm relative group">
                           <div className="flex justify-between items-center mb-6">
                              <h4 className="font-black text-indigo-600 uppercase text-[10px] tracking-widest"><i className="fa-solid fa-gauge mr-2"></i>{meter.type} (Haupt)</h4>
                              <button onClick={() => updateField('meterReadings', editedProperty.meterReadings?.filter(m => m.id !== meter.id))} className="text-slate-300 hover:text-red-500 transition"><i className="fa-solid fa-trash"></i></button>
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                              <InputField label="Seriennummer" value={meter.serialNumber} onChange={(v: string) => updateField('meterReadings', editedProperty.meterReadings?.map(m => m.id === meter.id ? {...m, serialNumber: v} : m))} />
                              <InputField label="Zählerstand" type="number" value={meter.value} onChange={(v: string) => updateField('meterReadings', editedProperty.meterReadings?.map(m => m.id === meter.id ? {...m, value: parseFloat(v)} : m))} />
                           </div>
                        </div>
                     ))}
                  </div>
                  <div className="flex space-x-3 mt-4">
                     <button onClick={() => addMeterReading(MeterType.WATER)} className="bg-slate-900 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-black transition shadow-lg">Haupt-Wasser +</button>
                     <button onClick={() => addMeterReading(MeterType.GAS)} className="bg-slate-900 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-black transition shadow-lg">Haupt-Gas +</button>
                     <button onClick={() => addMeterReading(MeterType.ELECTRICITY)} className="bg-slate-900 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-black transition shadow-lg">Haupt-Strom +</button>
                  </div>
               </Section>
            </div>
          )}

          {activeTab === 'finance' && (
             <div className="space-y-6 animate-in fade-in">
                <Section title="Objekt-Finanzierung (Loans)">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {editedProperty.loans?.map(loan => (
                        <div key={loan.id} className="bg-white p-8 rounded-[2rem] border shadow-sm space-y-4">
                           <div className="flex justify-between items-center"><h4 className="font-black text-indigo-600 uppercase text-[10px] tracking-widest">{loan.bankName}</h4><button onClick={() => updateField('loans', editedProperty.loans?.filter(l => l.id !== loan.id))} className="text-red-300 hover:text-red-500"><i className="fa-solid fa-trash text-sm"></i></button></div>
                           <div className="grid grid-cols-2 gap-6">
                              <InputField label="Restschuld (€)" type="number" value={loan.currentBalance} onChange={(v: string) => updateField('loans', editedProperty.loans?.map(l => l.id === loan.id ? {...l, currentBalance: parseFloat(v)} : l))} />
                              <InputField label="Soll-Zins (%)" type="number" value={loan.interestRate} onChange={(v: string) => updateField('loans', editedProperty.loans?.map(l => l.id === loan.id ? {...l, interestRate: parseFloat(v)} : l))} />
                              <InputField label="Zinsbindung bis" type="date" value={loan.fixedUntil} onChange={(v: string) => updateField('loans', editedProperty.loans?.map(l => l.id === loan.id ? {...l, fixedUntil: v} : l))} />
                              <InputField label="Annuität (€/Mt)" type="number" value={loan.monthlyInstallment} onChange={(v: string) => updateField('loans', editedProperty.loans?.map(l => l.id === loan.id ? {...l, monthlyInstallment: parseFloat(v)} : l))} />
                           </div>
                        </div>
                      ))}
                      <button onClick={() => updateField('loans', [...(editedProperty.loans || []), { id: 'l'+Date.now(), bankName: 'Neue Bank', currentBalance: 0, interestRate: 1.5, fixedUntil: '', monthlyInstallment: 0, repaymentRate: 2, totalAmount: 0 }])} className="border-2 border-dashed border-slate-200 rounded-[2rem] p-12 text-slate-300 hover:text-indigo-600 transition flex flex-col items-center justify-center"><i className="fa-solid fa-plus text-2xl mb-2"></i><span className="text-[10px] font-black uppercase tracking-widest">Kredit hinzufügen</span></button>
                   </div>
                </Section>
             </div>
          )}

          {activeTab === 'costs' && (
            <div className="space-y-6 animate-in fade-in">
               <div className="bg-white border rounded-[2.5rem] overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
                       <tr><th className="px-8 py-5">Kostenart</th><th className="px-8 py-5">Haus Gesamt (€)</th><th className="px-8 py-5 text-right">Option</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {houseCosts.map(cost => (
                        <tr key={cost.id} className="hover:bg-slate-50 transition">
                           <td className="px-8 py-5 font-bold text-slate-900">{cost.category}</td>
                           <td className="px-8 py-5 font-black text-indigo-700">{cost.amount.toFixed(2)} €</td>
                           <td className="px-8 py-5 text-right"><button onClick={() => setLocalTransactions(prev => prev.filter(t => t.id !== cost.id))} className="text-slate-300 hover:text-red-500 transition"><i className="fa-solid fa-trash-can"></i></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
               <button onClick={() => setLocalTransactions([...localTransactions, { id: 't'+Date.now(), propertyId: editedProperty.id, type: TransactionType.EXPENSE, category: 'Neue Position', amount: 0, date: new Date().toISOString().split('T')[0], description: 'Hauskosten', isUtilityRelevant: true }])} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase hover:bg-black transition shadow-xl shadow-slate-200">Neue Position erfassen</button>
            </div>
          )}
        </div>

        <div className="p-6 border-t flex justify-end space-x-4 bg-white shrink-0">
          <button onClick={onCancel} className="px-6 text-slate-500 font-bold">Verwerfen</button>
          <button onClick={() => onSave(editedProperty, localTransactions)} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition active:scale-95">Alles speichern</button>
        </div>
      </div>

      {/* BREITES OPTIMIERTES EINHEITEN-FENSTER */}
      {editingUnitId && !showLetterForm && editingUnit && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur z-[110] flex items-center justify-center p-4 no-print">
           <div className="bg-white w-full max-w-6xl h-[95vh] rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col border border-white/20">
              <div className="bg-slate-900 p-8 flex justify-between items-center text-white shrink-0">
                 <div className="flex items-center space-x-6">
                    <div className="w-16 h-16 bg-indigo-600 rounded-[1.8rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-500/30"><i className="fa-solid fa-key text-2xl"></i></div>
                    <div><h3 className="text-3xl font-black tracking-tight">Einheit {editingUnit.number}</h3><p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">{editingUnit.type} • {editingUnit.size} m²</p></div>
                 </div>
                 <div className="flex items-center space-x-4">
                    <button onClick={() => setEditingUnitId(null)} className="px-10 py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-black uppercase text-[10px] tracking-widest transition">Schließen</button>
                 </div>
              </div>

              <div className="bg-slate-100 px-10 py-2 flex space-x-12 border-b shrink-0 overflow-x-auto scrollbar-hide">
                 <UnitTabButton active={unitTab === 'details'} onClick={() => setUnitTab('details')} label="Daten & Mieter" icon="fa-user-tag" />
                 <UnitTabButton active={unitTab === 'docs'} onClick={() => setUnitTab('docs')} label="Fotos & Dokumente" icon="fa-images" />
                 <UnitTabButton active={unitTab === 'meters'} onClick={() => setUnitTab('meters')} label="Ablesung / Zähler" icon="fa-gauge" />
                 <UnitTabButton active={unitTab === 'utility'} onClick={() => setUnitTab('utility')} label="Abrechnung" icon="fa-calculator" />
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
                 {unitTab === 'details' && (
                    <div className="p-12 animate-in fade-in space-y-12">
                       <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                          <div className="space-y-10">
                             <Section title="Mieter-Zuweisung">
                                <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Aktueller Mieter</label>
                                   <select className="w-full border-2 border-slate-200 p-5 rounded-[1.5rem] bg-white font-black text-slate-900 text-lg outline-none focus:border-indigo-500 shadow-sm transition" value={editingUnit.tenantId || ''} onChange={(e) => updateUnitState(editingUnit.id, 'tenantId', e.target.value)}>
                                      <option value="">-- Leerstand (Wählen...) --</option>
                                      {tenants.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                                   </select>
                                   {assignedTenant && (
                                      <div className="mt-4 flex items-center space-x-3 text-emerald-600 font-bold text-sm">
                                         <i className="fa-solid fa-check-circle"></i>
                                         <span>Zugeordneter Mieter aktiv</span>
                                      </div>
                                   )}
                                </div>
                             </Section>
                             <InputField label="Nummer / Lage" value={editingUnit.number} onChange={(v: string) => updateUnitState(editingUnit.id, 'number', v)} />
                          </div>

                          <div className="space-y-10">
                             <Section title="Mietkonditionen">
                                <div className="grid grid-cols-2 gap-6">
                                   <InputField label="Fläche (m²)" type="number" value={editingUnit.size} onChange={(v: string) => updateUnitState(editingUnit.id, 'size', parseFloat(v))} />
                                   <InputField label="Netto-Kaltmiete (€)" type="number" value={editingUnit.baseRent} onChange={(v: string) => updateUnitState(editingUnit.id, 'baseRent', parseFloat(v))} />
                                   <InputField label="Vorauszahlung BK (€)" type="number" value={editingUnit.utilityPrepayment} onChange={(v: string) => updateUnitState(editingUnit.id, 'utilityPrepayment', parseFloat(v))} />
                                   <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 flex flex-col justify-center">
                                      <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Gesamtmiete (Warm)</p>
                                      <p className="text-2xl font-black text-indigo-800">{(editingUnit.baseRent + editingUnit.utilityPrepayment).toFixed(2)} €</p>
                                   </div>
                                </div>
                             </Section>
                          </div>
                       </div>
                    </div>
                 )}

                 {unitTab === 'docs' && (
                    <div className="p-12 animate-in fade-in space-y-10">
                       <div className="flex justify-between items-center border-b pb-6">
                          <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Dateimanagement für Einheit</h4>
                          <label className="cursor-pointer bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase hover:bg-black transition flex items-center space-x-3 shadow-xl shadow-slate-200">
                             <i className="fa-solid fa-cloud-arrow-up text-lg"></i><span>Dateien hinzufügen</span>
                             <input type="file" className="hidden" multiple onChange={(e) => {
                                Array.from(e.target.files || []).forEach(file => {
                                   const reader = new FileReader(); reader.onload = (re) => {
                                      const base64Data = re.target?.result as string; 
                                      const newDoc = { id: 'd'+Date.now()+Math.random(), name: file.name, category: 'Einheit', uploadDate: new Date().toLocaleDateString('de-DE'), fileSize: (file.size/1024).toFixed(0)+' KB', fileData: base64Data, mimeType: file.type };
                                      updateUnitState(editingUnit.id, 'documents', [...(editingUnit.documents || []), newDoc]);
                                   }; reader.readAsDataURL(file);
                                });
                             }} />
                          </label>
                       </div>
                       <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                          {editingUnit.documents?.map(doc => (
                            <div key={doc.id} className="bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] p-5 shadow-sm relative group hover:border-indigo-400 transition-all">
                               <div className="h-48 bg-slate-200 rounded-[2rem] mb-4 flex items-center justify-center overflow-hidden">
                                 {doc.mimeType.includes('image') ? <img src={doc.fileData} className="w-full h-full object-cover" /> : <i className="fa-solid fa-file-pdf text-5xl text-red-400"></i>}
                               </div>
                               <p className="text-[10px] font-black text-slate-800 truncate uppercase tracking-widest px-2">{doc.name}</p>
                               <button onClick={() => updateUnitState(editingUnit.id, 'documents', editingUnit.documents?.filter(d => d.id !== doc.id))} className="absolute top-4 right-4 p-3 bg-red-500 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition shadow-xl"><i className="fa-solid fa-trash-can"></i></button>
                            </div>
                          ))}
                       </div>
                    </div>
                 )}

                 {unitTab === 'meters' && (
                    <div className="p-12 space-y-12">
                       <Section title="Zählerstände der Wohnung">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             {editingUnit.meterReadings?.map(meter => (
                                <div key={meter.id} className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 relative group">
                                   <h4 className="font-black text-indigo-600 uppercase text-[9pt] mb-6 tracking-widest">{meter.type} Zähler</h4>
                                   <div className="grid grid-cols-2 gap-6">
                                      <InputField label="Nummer" value={meter.serialNumber} onChange={(v: string) => updateUnitState(editingUnit.id, 'meterReadings', editingUnit.meterReadings?.map(m => m.id === meter.id ? {...m, serialNumber: v} : m))} />
                                      <InputField label="Ablesestand" type="number" value={meter.value} onChange={(v: string) => updateUnitState(editingUnit.id, 'meterReadings', editingUnit.meterReadings?.map(m => m.id === meter.id ? {...m, value: parseFloat(v)} : m))} />
                                   </div>
                                   <button onClick={() => updateUnitState(editingUnit.id, 'meterReadings', editingUnit.meterReadings?.filter(m => m.id !== meter.id))} className="absolute top-8 right-8 text-slate-300 hover:text-red-500 transition"><i className="fa-solid fa-trash"></i></button>
                                </div>
                             ))}
                             <button onClick={() => addMeterReading(MeterType.WATER, false)} className="border-2 border-dashed border-slate-200 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-slate-300 hover:text-indigo-600 hover:border-indigo-300 transition font-black uppercase text-[10px] tracking-widest"><i className="fa-solid fa-plus text-xl mb-2"></i>Wohnungszähler +</button>
                          </div>
                       </Section>
                    </div>
                 )}

                 {unitTab === 'utility' && (
                    <div className="p-12 flex flex-col items-center justify-center min-h-[50vh] space-y-12">
                       <div className="bg-slate-950 p-16 rounded-[4.5rem] text-white text-center w-full max-w-2xl shadow-2xl relative overflow-hidden group">
                          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-6">Abrechnungsvorschau {billingYear}</p>
                          <h4 className={`text-8xl font-black mb-12 tracking-tighter ${balance >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{Math.abs(balance).toFixed(2)} <span className="text-2xl font-bold">€</span></h4>
                          <p className="text-[10px] text-slate-400 mb-12 uppercase font-black tracking-[0.2em]">{balance >= 0 ? 'Zuzahlung durch Mieter' : 'Guthaben für Mieter'}</p>
                          <button onClick={() => setShowLetterForm(true)} className="w-full bg-indigo-600 text-white py-8 rounded-[2.5rem] font-black hover:bg-indigo-700 transition flex items-center justify-center space-x-6 active:scale-95 shadow-2xl shadow-indigo-500/20"><i className="fa-solid fa-file-signature text-2xl"></i><span className="text-xl uppercase">Abrechnungs-Editor öffnen</span></button>
                          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl opacity-20"></div>
                       </div>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* INTERAKTIVER BRIEF-DESIGNER (DIN-A4) */}
      {showLetterForm && editingUnit && assignedTenant && (
        <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-xl z-[300] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-6xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-[95vh] animate-in zoom-in-95 no-print">
            <div className="bg-indigo-700 p-8 flex justify-between items-center text-white shrink-0">
               <div><h3 className="font-black text-2xl uppercase tracking-tighter">Brief- & Dokument-Designer</h3><p className="text-[10px] font-black text-indigo-100 uppercase tracking-[0.2em]">Interaktives Formular zur Endkontrolle</p></div>
               <button onClick={() => setShowLetterForm(false)} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition"><i className="fa-solid fa-xmark text-2xl"></i></button>
            </div>
            
            <div className="p-10 bg-slate-200 overflow-y-auto custom-scrollbar flex-1 flex flex-col items-center">
              <div id="printable-area" className="bg-white shadow-2xl mx-auto w-[210mm] min-h-[297mm] text-black font-sans p-[25mm] relative border border-slate-300">
                {/* Briefkopf */}
                <div className="text-[9pt] text-slate-500 border-b pb-1 mb-16 italic font-medium">
                   {ownerName} • {selectedOwner?.address} • {selectedOwner?.zip} {selectedOwner?.city}
                </div>

                <div className="flex justify-between mb-20">
                   <div className="text-[11pt] space-y-1">
                      <p className="font-black text-xl text-black">{assignedTenant.firstName} {assignedTenant.lastName}</p>
                      <p className="text-slate-800 font-medium">{editedProperty.address}</p>
                      <div className="flex items-center space-x-2 text-indigo-700 font-black mt-8 text-xs uppercase tracking-widest opacity-80">
                        <span>Einheit:</span>
                        <input className="bg-slate-50 border-none no-print font-black p-1 rounded" value={editingUnit.number} onChange={e => updateUnitState(editingUnit.id, 'number', e.target.value)} />
                        <span className="hidden print:inline">{editingUnit.number}</span>
                      </div>
                   </div>
                   <div className="text-right text-[10pt] text-slate-500 font-black uppercase tracking-tight">
                      <p>{selectedOwner?.city}, den {new Date().toLocaleDateString('de-DE')}</p>
                   </div>
                </div>

                <div className="text-2xl font-black mb-10 text-black border-l-8 border-indigo-600 pl-6 py-2 uppercase tracking-tighter flex items-center">
                   Betriebskostenabrechnung&nbsp;
                   <input className="w-20 bg-transparent border-none font-black text-indigo-700 no-print" value={billingYear} onChange={e => setBillingYear(e.target.value)} />
                   <span className="hidden print:inline">{billingYear}</span>
                </div>

                <div className="text-[11pt] mb-12 leading-relaxed text-slate-900">
                   <p className="mb-6 font-black text-lg">Sehr geehrte(r) Frau/Herr {assignedTenant.lastName},</p>
                   <textarea className="w-full bg-slate-50 p-5 rounded-2xl text-slate-800 min-h-[80px] no-print border border-slate-100 font-medium" value={letterIntro} onChange={e => setLetterIntro(e.target.value)} />
                   <p className="hidden print:block whitespace-pre-wrap">{letterIntro}</p>
                </div>

                {/* Kompakte Tabelle für Post-Format */}
                <div className="border border-slate-300 rounded-sm mx-auto" style={{ width: '100%' }}>
                  <table className="w-full text-[9.5pt] border-collapse" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="p-3 text-left border border-slate-300 font-black text-slate-600 uppercase text-[8pt]">Position</th>
                        <th className="p-3 text-right border border-slate-300 font-black text-slate-600 uppercase text-[8pt]">Gesamt Haus</th>
                        <th className="p-3 text-center border border-slate-300 font-black text-slate-600 uppercase text-[8pt]">Schlüssel</th>
                        <th className="p-3 text-right border border-slate-300 font-black text-slate-600 uppercase text-[8pt]">Ihr Anteil</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {editableBreakdown.map((item) => (
                        <tr key={item.id}>
                          <td className="p-3 border border-slate-300 text-slate-900 font-bold">
                            <input className="w-full bg-transparent no-print outline-none focus:bg-slate-50" value={item.category} onChange={(e) => updateBreakdownItem(item.id, 'category', e.target.value)} />
                            <span className="hidden print:inline">{item.category}</span>
                          </td>
                          <td className="p-3 text-right border border-slate-300 text-slate-600 font-medium">
                            <input type="number" className="w-24 text-right bg-transparent outline-none no-print focus:bg-slate-50" value={item.total} onChange={(e) => updateBreakdownItem(item.id, 'total', parseFloat(e.target.value) || 0)} />
                            <span className="hidden print:inline">{item.total.toFixed(2)} €</span>
                          </td>
                          <td className="p-3 text-center border border-slate-300 text-slate-500 font-black text-[8pt]">
                            {item.keyLabel}
                          </td>
                          <td className="p-3 text-right border border-slate-300 font-black text-indigo-900">
                            {item.share.toFixed(2)} €
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="font-black border-t-2 border-slate-500 bg-slate-50">
                      <tr>
                        <td colSpan={3} className="p-3 text-right border border-slate-300 text-[9pt] text-slate-500 uppercase">Anteil Mietobjekt Summe:</td>
                        <td className="p-3 text-right border border-slate-300 text-black">{currentUnitShare.toFixed(2)} €</td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="p-3 text-right border border-slate-300 text-[9pt] text-slate-500 uppercase">Vorausgezahlte Nebenkosten:</td>
                        <td className="p-3 text-right border border-slate-300 text-rose-700">-{unitPrepaymentYear.toFixed(2)} €</td>
                      </tr>
                      <tr className={`${balance >= 0 ? 'bg-rose-100/50' : 'bg-emerald-100/50'}`}>
                        <td colSpan={3} className="p-4 text-right border border-slate-300 font-black uppercase text-[10pt] text-slate-700">
                          {balance >= 0 ? 'Nachforderungsbetrag:' : 'Erstattungsbetrag:'}
                        </td>
                        <td className={`p-4 text-right border border-slate-300 text-xl font-black ${balance >= 0 ? 'text-rose-700' : 'text-emerald-800'}`}>
                          {Math.abs(balance).toFixed(2)} €
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="mt-20 text-[11pt]">
                   <textarea className="w-full bg-slate-50 p-6 rounded-3xl no-print min-h-[80px] border border-slate-100 outline-none transition text-slate-800 font-medium" value={letterClosing} onChange={e => setLetterClosing(e.target.value)} />
                   <p className="hidden print:block whitespace-pre-wrap leading-relaxed font-medium">{letterClosing}</p><br/>
                   <div className="mt-12">
                      <p className="font-black text-2xl text-black">{ownerName}</p>
                      <p className="text-[10pt] font-black text-slate-500 uppercase tracking-widest">Immobilienverwaltung</p>
                   </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-10 bg-white border-t flex justify-between items-center shadow-2xl shrink-0">
               <div className="flex space-x-6">
                  <button onClick={handleDownloadWord} className="px-12 py-6 bg-indigo-700 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-800 transition flex items-center space-x-5 active:scale-95 shadow-2xl shadow-indigo-100">
                    <i className="fa-solid fa-file-word text-2xl"></i><span>Word Dokument (.doc) laden</span>
                  </button>
                  <button onClick={exportToExcel} className="px-10 py-6 bg-emerald-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-700 transition flex items-center space-x-5 active:scale-95 shadow-2xl shadow-emerald-100">
                    <i className="fa-solid fa-file-excel text-2xl"></i><span>Daten als Excel</span>
                  </button>
               </div>
               <button onClick={() => setShowLetterForm(false)} className="px-10 py-6 bg-slate-100 text-slate-600 rounded-[1.5rem] font-black text-xs uppercase hover:bg-slate-200 transition">Zurück zum Editor</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const UnitTabButton = ({ active, onClick, label, icon }: any) => (
  <button onClick={onClick} className={`py-6 text-[11px] font-black uppercase tracking-[0.3em] border-b-4 transition flex items-center space-x-4 shrink-0 ${active ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-indigo-600'}`}>
    <i className={`fa-solid ${icon} text-xl`}></i>
    <span>{label}</span>
  </button>
);

const TabButton = ({ active, onClick, label, icon }: any) => (
  <button onClick={onClick} className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition flex items-center space-x-3 ${active ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-indigo-600'}`}><i className={`fa-solid ${icon}`}></i><span>{label}</span></button>
);

const Section = ({ title, children }: any) => (
  <div className="space-y-6"><h3 className="font-black text-slate-900 uppercase tracking-[0.2em] text-[11px] border-b pb-3 flex items-center"><i className="fa-solid fa-chevron-right mr-4 text-indigo-600"></i>{title}</h3><div className="space-y-4">{children}</div></div>
);

const InputField = ({ label, value, onChange, type = "text" }: any) => (
  <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">{label}</label><input type={type} value={value || ''} onChange={e => onChange(e.target.value)} className="w-full border-2 border-slate-100 p-5 rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none bg-slate-50 font-black text-slate-900 text-lg transition-all shadow-inner" /></div>
);

export default PropertyEditor;
