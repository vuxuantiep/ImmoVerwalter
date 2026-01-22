
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
        // Recalculate share if total or keyType changes
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
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><style>@page { size: 21cm 29.7cm; margin: 2cm; } body { font-family: Arial, sans-serif; font-size: 11pt; color: #000; } table { border-collapse: collapse; width: 100%; border: 1px solid #000; } th, td { border: 1px solid #000; padding: 6px; text-align: left; }</style></head><body>`;
    const clone = element.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.no-print').forEach(el => el.remove());
    clone.querySelectorAll('input, select, textarea').forEach((el: any) => {
      const span = document.createElement('span');
      span.textContent = el.tagName === 'SELECT' ? el.options[el.selectedIndex].text : el.value;
      el.parentNode.replaceChild(span, el);
    });
    const blob = new Blob(['\ufeff', header + clone.innerHTML + "</body></html>"], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `Abrechnung_${assignedTenant?.lastName || 'Mieter'}.doc`; link.click();
  };

  const exportToExcel = () => {
    let excelXml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>td { border: 0.5pt solid #000; }</style></head><body><table><tr><td colspan="4"><b>Abrechnung ${billingYear}</b></td></tr><tr><td><b>Position</b></td><td><b>Gesamt Haus</b></td><td><b>Schlüssel</b></td><td><b>Anteil Mieter</b></td></tr>${editableBreakdown.map(item => `<tr><td>${item.category}</td><td>${item.total.toFixed(2)}</td><td>${item.keyLabel}</td><td>${item.share.toFixed(2)}</td></tr>`).join('')}<tr><td colspan="3"><b>Summe Anteil:</b></td><td><b>${currentUnitShare.toFixed(2)}</b></td></tr></table></body></html>`;
    const blob = new Blob([excelXml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `Export_${assignedTenant?.lastName}.xls`; a.click();
  };

  const updateUnitState = (id: string, field: keyof Unit, value: any) => {
    setEditedProperty(prev => ({ ...prev, units: prev.units.map(u => u.id === id ? { ...u, [field]: value } : u) }));
  };

  const addMeterReading = (type: MeterType, isHouse: boolean = true) => {
    const newReading: MeterReading = { id: 'm' + Date.now(), type, value: 0, unit: type === MeterType.ELECTRICITY ? 'kWh' : 'm³', date: new Date().toISOString().split('T')[0], serialNumber: '' };
    if (isHouse) { 
      setEditedProperty(prev => ({ ...prev, meterReadings: [...(prev.meterReadings || []), newReading] })); 
    }
    else if (editingUnitId) { 
      setEditedProperty(prev => ({ ...prev, units: prev.units.map(u => u.id === editingUnitId ? { ...u, meterReadings: [...(u.meterReadings || []), newReading] } : u) })); 
    }
  };

  const removeMeterReading = (id: string, isHouse: boolean = true) => {
    if (isHouse) {
      setEditedProperty(prev => ({ ...prev, meterReadings: prev.meterReadings?.filter(m => m.id !== id) }));
    } else if (editingUnitId) {
      setEditedProperty(prev => ({ ...prev, units: prev.units.map(u => u.id === editingUnitId ? { ...u, meterReadings: u.meterReadings?.filter(m => m.id !== id) } : u) }));
    }
  };

  const addLoan = () => {
    const newLoan: Loan = { id: 'l' + Date.now(), bankName: 'Neue Bank', totalAmount: 0, currentBalance: 0, interestRate: 0, repaymentRate: 0, fixedUntil: '', monthlyInstallment: 0 };
    setEditedProperty(prev => ({ ...prev, loans: [...(prev.loans || []), newLoan] }));
  };

  const updateLoan = (id: string, field: keyof Loan, value: any) => {
    setEditedProperty(prev => ({ ...prev, loans: prev.loans?.map(l => l.id === id ? { ...l, [field]: value } : l) }));
  };

  const updateField = (field: keyof Property, value: any) => { setEditedProperty(prev => ({ ...prev, [field]: value })); };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-1 sm:p-4">
      <div className="bg-white w-full max-w-7xl h-[98vh] sm:h-[95vh] rounded-xl shadow-2xl overflow-hidden flex flex-col no-print text-slate-800 border border-slate-200">
        {/* Haupt-Header */}
        <div className="bg-slate-900 p-3 sm:p-4 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg"><i className="fa-solid fa-building text-lg"></i></div>
            <div><h2 className="text-lg font-black leading-tight">{editedProperty.name || 'Immobilie'}</h2><p className="text-slate-400 text-[9px] uppercase font-bold tracking-wider">Verwaltung & Buchhaltung</p></div>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition"><i className="fa-solid fa-xmark text-lg"></i></button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-50 border-b px-2 sm:px-4 py-1 flex space-x-1 shrink-0 overflow-x-auto scrollbar-hide">
          <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')} label="Daten" icon="fa-house-chimney" />
          <TabButton active={activeTab === 'units'} onClick={() => setActiveTab('units')} label="Einheiten" icon="fa-door-open" />
          <TabButton active={activeTab === 'costs'} onClick={() => setActiveTab('costs')} label="Ausgaben" icon="fa-file-invoice-dollar" />
          <TabButton active={activeTab === 'meters'} onClick={() => setActiveTab('meters')} label="Haus-Zähler" icon="fa-gauge-high" />
          <TabButton active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} label="Finanzen" icon="fa-landmark" />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/20 custom-scrollbar">
          {activeTab === 'general' && (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
                <Section title="Stammdaten">
                   <InputField label="Name" value={editedProperty.name} onChange={(v: string) => updateField('name', v)} />
                   <InputField label="Adresse" value={editedProperty.address} onChange={(v: string) => updateField('address', v)} />
                   <div className="grid grid-cols-2 gap-3">
                      <InputField label="Baujahr" type="number" value={editedProperty.yearBuilt} onChange={(v: string) => updateField('yearBuilt', parseInt(v))} />
                      <InputField label="Heizung" value={editedProperty.heatingType} onChange={(v: string) => updateField('heatingType', v)} />
                   </div>
                </Section>
                <Section title="Eigentümer & Übersicht">
                  <select className="w-full border border-slate-200 p-2.5 rounded-xl font-bold bg-white text-sm" value={editedProperty.ownerId || ''} onChange={e => updateField('ownerId', e.target.value)}>
                    <option value="">-- Eigentümer wählen --</option>
                    {owners.map(o => <option key={o.id} value={o.id}>{o.company || o.name}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                     <div className="bg-white p-3 rounded-xl border border-slate-100">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Einheiten</p>
                        <p className="text-lg font-black">{totalUnitsCount}</p>
                     </div>
                     <div className="bg-white p-3 rounded-xl border border-slate-100">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Fläche</p>
                        <p className="text-lg font-black">{defaultTotalLivingSpace} m²</p>
                     </div>
                  </div>
                </Section>
             </div>
          )}

          {activeTab === 'units' && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 animate-in fade-in">
               {editedProperty.units.map(unit => (
                 <div key={unit.id} className="bg-white p-3 sm:p-4 rounded-2xl border shadow-sm group hover:border-indigo-400 transition cursor-pointer flex flex-col justify-between" onClick={() => { setEditingUnitId(unit.id); setUnitTab('details'); }}>
                    <div className="flex items-center space-x-3 mb-2">
                       <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 text-lg group-hover:bg-indigo-600 group-hover:text-white transition-all"><i className="fa-solid fa-door-open"></i></div>
                       <div className="min-w-0">
                          <p className="font-bold text-sm text-slate-900 truncate">{unit.number}</p>
                          <p className="text-[9px] text-slate-400 uppercase font-bold">{unit.size} m² • {unit.baseRent}€</p>
                       </div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                       <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${unit.tenantId ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{unit.tenantId ? 'Mieter' : 'Leer'}</span>
                       <i className="fa-solid fa-chevron-right text-slate-300 text-[10px]"></i>
                    </div>
                 </div>
               ))}
               <button onClick={() => updateField('units', [...editedProperty.units, { id: 'u'+Date.now(), number: 'Neu', size: 0, baseRent: 0, utilityPrepayment: 0, type: UnitType.RESIDENTIAL }])} className="border-2 border-dashed border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center text-slate-300 hover:text-indigo-600 hover:border-indigo-200 transition">
                  <i className="fa-solid fa-plus text-lg mb-1"></i><span className="text-[9px] font-bold uppercase">Einheit +</span>
               </button>
            </div>
          )}

          {activeTab === 'costs' && (
            <div className="space-y-4 animate-in fade-in">
               <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b text-[9px] font-black text-slate-400 uppercase tracking-widest">
                       <tr><th className="px-4 py-3">Kostenart</th><th className="px-4 py-3">Summe (€)</th><th className="px-4 py-3 text-right">Option</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {houseCosts.map(cost => (
                        <tr key={cost.id} className="hover:bg-slate-50 transition">
                           <td className="px-4 py-3 font-bold">{cost.category}</td>
                           <td className="px-4 py-3 font-black text-indigo-700">{cost.amount.toFixed(2)} €</td>
                           <td className="px-4 py-3 text-right"><button onClick={() => setLocalTransactions(prev => prev.filter(t => t.id !== cost.id))} className="text-slate-300 hover:text-red-500 transition"><i className="fa-solid fa-trash-can"></i></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
               <button onClick={() => setLocalTransactions([...localTransactions, { id: 't'+Date.now(), propertyId: editedProperty.id, type: TransactionType.EXPENSE, category: 'Neu', amount: 0, date: new Date().toISOString().split('T')[0], description: '', isUtilityRelevant: true }])} className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-[10px] uppercase hover:bg-black transition">Neue Position +</button>
            </div>
          )}

          {activeTab === 'meters' && (
            <div className="space-y-6 animate-in fade-in">
               <Section title="Hauptzähler (Hausanschluss)">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {editedProperty.meterReadings?.map(meter => (
                        <div key={meter.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative group">
                           <div className="flex justify-between items-center mb-4">
                              <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{meter.type} Zähler</h4>
                              <button onClick={() => removeMeterReading(meter.id, true)} className="text-slate-300 hover:text-red-500 transition"><i className="fa-solid fa-trash text-[10px]"></i></button>
                           </div>
                           <div className="space-y-3">
                              <InputField label="Zählernummer" value={meter.serialNumber} onChange={(v: string) => updateField('meterReadings', editedProperty.meterReadings?.map(m => m.id === meter.id ? {...m, serialNumber: v} : m))} />
                              <InputField label="Zählerstand" type="number" value={meter.value} onChange={(v: string) => updateField('meterReadings', editedProperty.meterReadings?.map(m => m.id === meter.id ? {...m, value: parseFloat(v)} : m))} />
                           </div>
                        </div>
                     ))}
                     <button onClick={() => addMeterReading(MeterType.WATER, true)} className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-slate-300 hover:text-indigo-600 hover:border-indigo-200 transition">
                        <i className="fa-solid fa-plus text-lg mb-1"></i><span className="text-[9px] font-bold uppercase">Neuer Zähler</span>
                     </button>
                  </div>
               </Section>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="space-y-6 animate-in fade-in">
               <Section title="Finanzierung (Darlehen)">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {editedProperty.loans?.map(loan => (
                        <div key={loan.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                           <div className="flex justify-between items-center">
                              <input className="font-bold text-indigo-600 uppercase text-[10px] bg-transparent border-none outline-none focus:ring-0" value={loan.bankName} onChange={e => updateLoan(loan.id, 'bankName', e.target.value)} />
                              <button onClick={() => updateField('loans', editedProperty.loans?.filter(l => l.id !== loan.id))} className="text-slate-300 hover:text-red-500"><i className="fa-solid fa-trash text-[10px]"></i></button>
                           </div>
                           <div className="grid grid-cols-2 gap-3">
                              <InputField label="Restschuld (€)" type="number" value={loan.currentBalance} onChange={(v: string) => updateLoan(loan.id, 'currentBalance', parseFloat(v))} />
                              <InputField label="Zinssatz (%)" type="number" value={loan.interestRate} onChange={(v: string) => updateLoan(loan.id, 'interestRate', parseFloat(v))} />
                              <InputField label="Rate (€/Monat)" type="number" value={loan.monthlyInstallment} onChange={(v: string) => updateLoan(loan.id, 'monthlyInstallment', parseFloat(v))} />
                              <InputField label="Zinsbindung bis" type="date" value={loan.fixedUntil} onChange={(v: string) => updateLoan(loan.id, 'fixedUntil', v)} />
                           </div>
                        </div>
                     ))}
                     <button onClick={addLoan} className="border-2 border-dashed border-slate-200 rounded-xl p-10 flex flex-col items-center justify-center text-slate-300 hover:text-indigo-600 hover:border-indigo-200 transition">
                        <i className="fa-solid fa-plus text-lg mb-1"></i><span className="text-[9px] font-bold uppercase">Kredit hinzufügen</span>
                     </button>
                  </div>
               </Section>
            </div>
          )}
        </div>

        <div className="p-4 border-t flex justify-end space-x-3 bg-white shrink-0">
          <button onClick={onCancel} className="px-4 text-xs font-bold text-slate-500">Abbrechen</button>
          <button onClick={() => onSave(editedProperty, localTransactions)} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase shadow-lg hover:bg-indigo-700 transition">Alles Speichern</button>
        </div>
      </div>

      {/* EINHEITEN-MODAL */}
      {editingUnitId && !showLetterForm && editingUnit && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur z-[110] flex items-center justify-center p-1 sm:p-4 no-print">
           <div className="bg-white w-full max-w-5xl h-[98vh] sm:h-[92vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-white/10">
              <div className="bg-slate-900 p-3 sm:p-5 flex justify-between items-center text-white shrink-0">
                 <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white"><i className="fa-solid fa-key text-lg"></i></div>
                    <div><h3 className="text-base font-black">Einheit {editingUnit.number}</h3><p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{editingUnit.size} m²</p></div>
                 </div>
                 <button onClick={() => setEditingUnitId(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition"><i className="fa-solid fa-xmark text-lg"></i></button>
              </div>

              <div className="bg-slate-100 px-2 sm:px-6 flex space-x-4 border-b shrink-0 overflow-x-auto scrollbar-hide">
                 <UnitTabButton active={unitTab === 'details'} onClick={() => setUnitTab('details')} label="Basis" icon="fa-user-tag" />
                 <UnitTabButton active={unitTab === 'docs'} onClick={() => setUnitTab('docs')} label="Files" icon="fa-images" />
                 <UnitTabButton active={unitTab === 'meters'} onClick={() => setUnitTab('meters')} label="Zähler" icon="fa-gauge" />
                 <UnitTabButton active={unitTab === 'utility'} onClick={() => setUnitTab('utility')} label="Abrechnung" icon="fa-calculator" />
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar bg-white p-4 sm:p-8">
                 {unitTab === 'details' && (
                    <div className="animate-in fade-in space-y-6">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                             <Section title="Mieter">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                   <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block tracking-wider">Mieter wählen</label>
                                   <select className="w-full border border-slate-200 p-2.5 rounded-lg bg-white font-bold text-slate-800 text-sm outline-none focus:border-indigo-500 shadow-sm" value={editingUnit.tenantId || ''} onChange={(e) => updateUnitState(editingUnit.id, 'tenantId', e.target.value)}>
                                      <option value="">-- Leerstand --</option>
                                      {tenants.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                                   </select>
                                </div>
                             </Section>
                             <InputField label="Bezeichnung" value={editingUnit.number} onChange={(v: string) => updateUnitState(editingUnit.id, 'number', v)} />
                          </div>
                          <div className="space-y-4">
                             <Section title="Miete">
                                <div className="grid grid-cols-2 gap-3">
                                   <InputField label="Größe (m²)" type="number" value={editingUnit.size} onChange={(v: string) => updateUnitState(editingUnit.id, 'size', parseFloat(v))} />
                                   <InputField label="Kaltmiete" type="number" value={editingUnit.baseRent} onChange={(v: string) => updateUnitState(editingUnit.id, 'baseRent', parseFloat(v))} />
                                   <InputField label="Vorausz." type="number" value={editingUnit.utilityPrepayment} onChange={(v: string) => updateUnitState(editingUnit.id, 'utilityPrepayment', parseFloat(v))} />
                                   <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 flex flex-col justify-center">
                                      <p className="text-[8px] font-bold text-indigo-400 uppercase tracking-wider">Soll Warm</p>
                                      <p className="text-lg font-black text-indigo-800">{(editingUnit.baseRent + editingUnit.utilityPrepayment).toFixed(2)}€</p>
                                   </div>
                                </div>
                             </Section>
                          </div>
                       </div>
                    </div>
                 )}

                 {unitTab === 'docs' && (
                    <div className="animate-in fade-in space-y-4">
                       <div className="flex justify-between items-center border-b pb-2">
                          <h4 className="text-xs font-black text-slate-800 uppercase">Dokumente</h4>
                          <label className="cursor-pointer bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-[9px] uppercase hover:bg-black transition flex items-center space-x-2">
                             <i className="fa-solid fa-plus"></i><span>Upload</span>
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
                       <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {editingUnit.documents?.map(doc => (
                            <div key={doc.id} className="bg-slate-50 border border-slate-200 rounded-xl p-2 relative group overflow-hidden">
                               <div className="h-24 bg-slate-200 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                                 {doc.mimeType.includes('image') ? <img src={doc.fileData} className="w-full h-full object-cover" /> : <i className="fa-solid fa-file-pdf text-2xl text-red-400"></i>}
                               </div>
                               <p className="text-[8px] font-bold text-slate-800 truncate px-1">{doc.name}</p>
                               <button onClick={() => updateUnitState(editingUnit.id, 'documents', editingUnit.documents?.filter(d => d.id !== doc.id))} className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition shadow-lg"><i className="fa-solid fa-trash-can text-[10px]"></i></button>
                            </div>
                          ))}
                       </div>
                    </div>
                 )}

                 {unitTab === 'meters' && (
                    <div className="space-y-6">
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {editingUnit.meterReadings?.map(meter => (
                             <div key={meter.id} className="bg-white p-4 rounded-xl border border-slate-200 relative group">
                                <h4 className="font-bold text-indigo-600 uppercase text-[8pt] mb-3">{meter.type} Zähler</h4>
                                <div className="grid grid-cols-2 gap-3">
                                   <InputField label="Nr." value={meter.serialNumber} onChange={(v: string) => updateUnitState(editingUnit.id, 'meterReadings', editingUnit.meterReadings?.map(m => m.id === meter.id ? {...m, serialNumber: v} : m))} />
                                   <InputField label="Stand" type="number" value={meter.value} onChange={(v: string) => updateUnitState(editingUnit.id, 'meterReadings', editingUnit.meterReadings?.map(m => m.id === meter.id ? {...m, value: parseFloat(v)} : m))} />
                                </div>
                                <button onClick={() => removeMeterReading(meter.id, false)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition"><i className="fa-solid fa-trash text-xs"></i></button>
                             </div>
                          ))}
                          <button onClick={() => addMeterReading(MeterType.WATER, false)} className="border border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-slate-300 hover:text-indigo-600 transition font-bold uppercase text-[9px]"><i className="fa-solid fa-plus mb-1"></i>Zähler +</button>
                       </div>
                    </div>
                 )}

                 {unitTab === 'utility' && (
                    <div className="flex flex-col items-center justify-center min-h-[30vh] space-y-8">
                       <div className="bg-slate-950 p-8 rounded-[2.5rem] text-white text-center w-full max-w-lg shadow-2xl relative overflow-hidden group">
                          <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-indigo-400 mb-4">Abrechnungsvorschau {billingYear}</p>
                          <h4 className={`text-5xl font-black mb-6 tracking-tighter ${balance >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{Math.abs(balance).toFixed(2)} <span className="text-xl">€</span></h4>
                          <p className="text-[8px] text-slate-400 mb-8 uppercase font-bold tracking-widest">{balance >= 0 ? 'Nachzahlung Mieter' : 'Guthaben Mieter'}</p>
                          <button onClick={() => setShowLetterForm(true)} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition flex items-center justify-center space-x-3 active:scale-95 shadow-xl shadow-indigo-500/20 uppercase text-xs">
                             <i className="fa-solid fa-file-signature text-lg"></i><span>Interaktiver Designer</span>
                          </button>
                       </div>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* INTERAKTIVER BRIEF-DESIGNER (WYSIWYG) */}
      {showLetterForm && editingUnit && assignedTenant && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur z-[300] flex items-center justify-center p-1 sm:p-4">
          <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[98vh] sm:h-[95vh] animate-in zoom-in-95 no-print">
            <div className="bg-indigo-700 p-4 flex justify-between items-center text-white shrink-0">
               <div><h3 className="font-black text-lg uppercase leading-tight">Interaktiver Dokumenten-Designer</h3><p className="text-[8px] font-bold text-indigo-100 uppercase tracking-widest">Werte & Texte direkt bearbeiten</p></div>
               <button onClick={() => setShowLetterForm(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition"><i className="fa-solid fa-xmark text-lg"></i></button>
            </div>
            
            <div className="p-2 sm:p-8 bg-slate-200 overflow-y-auto custom-scrollbar flex-1 flex flex-col items-center">
              <div id="printable-area" className="bg-white shadow-2xl mx-auto w-full max-w-[210mm] min-h-[297mm] text-black font-sans p-6 sm:p-[20mm] relative border border-slate-300">
                {/* Header Info */}
                <div className="text-[8pt] text-slate-500 border-b pb-1 mb-10 italic">
                   {ownerName} • {selectedOwner?.address} • {selectedOwner?.zip} {selectedOwner?.city}
                </div>

                <div className="flex justify-between mb-12">
                   <div className="text-[10pt] space-y-1 text-black font-medium">
                      <p className="font-black text-base">{assignedTenant.firstName} {assignedTenant.lastName}</p>
                      <p>{editedProperty.address}</p>
                      <div className="flex items-center space-x-2 text-indigo-700 font-bold mt-4 text-[8pt]">
                        <span>Einheit:</span>
                        <input className="bg-slate-50 border-none no-print font-black p-0.5 rounded w-16" value={editingUnit.number} onChange={e => updateUnitState(editingUnit.id, 'number', e.target.value)} />
                        <span className="hidden print:inline">{editingUnit.number}</span>
                      </div>
                   </div>
                   <div className="text-right text-[9pt] text-slate-500 font-bold uppercase">
                      {selectedOwner?.city}, den {new Date().toLocaleDateString('de-DE')}
                   </div>
                </div>

                <div className="text-xl font-black mb-8 text-black border-l-4 border-indigo-600 pl-4 py-1 uppercase tracking-tight flex items-center">
                   Betriebskostenabrechnung&nbsp;
                   <input className="bg-transparent border-none w-16 font-black text-indigo-600 no-print" value={billingYear} onChange={e => setBillingYear(e.target.value)} />
                   <span className="hidden print:inline">{billingYear}</span>
                </div>

                <div className="text-[10pt] mb-8 leading-relaxed text-black">
                   <p className="mb-4 font-black">Sehr geehrte(r) Frau/Herr {assignedTenant.lastName},</p>
                   <textarea className="w-full bg-slate-50 p-4 rounded-xl text-black text-sm no-print border border-slate-200 outline-none focus:ring-1 focus:ring-indigo-300 transition" value={letterIntro} onChange={e => setLetterIntro(e.target.value)} />
                   <p className="hidden print:block whitespace-pre-wrap">{letterIntro}</p>
                </div>
                
                {/* Dynamische Kostentabelle */}
                <table className="w-full text-[8.5pt] border-collapse border border-slate-300" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead className="bg-slate-50 text-black font-bold">
                      <tr>
                        <th className="p-2 border border-slate-300 text-left">Kostenart</th>
                        <th className="p-2 border border-slate-300 text-right">Haus Gesamt</th>
                        <th className="p-2 border border-slate-300 text-center">Verteiler</th>
                        <th className="p-2 border border-slate-300 text-right">Anteil Mieter</th>
                      </tr>
                    </thead>
                    <tbody className="text-black">
                      {editableBreakdown.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition">
                          <td className="p-2 border border-slate-300">
                             <input className="w-full bg-transparent border-none no-print font-medium text-black" value={item.category} onChange={(e) => updateBreakdownItem(item.id, 'category', e.target.value)} />
                             <span className="hidden print:inline">{item.category}</span>
                          </td>
                          <td className="p-2 border border-slate-300 text-right">
                             <input type="number" className="w-20 text-right bg-transparent border-none no-print text-black" value={item.total} onChange={(e) => updateBreakdownItem(item.id, 'total', parseFloat(e.target.value) || 0)} />
                             <span className="hidden print:inline">{item.total.toFixed(2)}€</span>
                          </td>
                          <td className="p-2 border border-slate-300 text-center text-slate-500 text-[7.5pt]">
                             <select className="bg-transparent border-none no-print outline-none text-center" value={item.keyType} onChange={(e) => updateBreakdownItem(item.id, 'keyType', e.target.value)}>
                               <option value="m2">m²</option>
                               <option value="unit">WE</option>
                             </select>
                             <span className="hidden print:inline">{item.keyLabel}</span>
                          </td>
                          <td className="p-2 border border-slate-300 text-right font-black">
                             {item.share.toFixed(2)}€
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="font-black bg-slate-50 text-black">
                      <tr>
                        <td colSpan={3} className="p-2 text-right border border-slate-300 text-[8pt] uppercase">Summe Anteil Mieter:</td>
                        <td className="p-2 text-right border border-slate-300">{currentUnitShare.toFixed(2)}€</td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="p-2 text-right border border-slate-300 text-[8pt] uppercase text-rose-600">Bereits geleistete Vorauszahlungen:</td>
                        <td className="p-2 text-right border border-slate-300 text-rose-600">-{unitPrepaymentYear.toFixed(2)}€</td>
                      </tr>
                      <tr className={`${balance >= 0 ? 'bg-rose-50' : 'bg-emerald-50'}`}>
                        <td colSpan={3} className="p-3 text-right border border-slate-300 uppercase text-[9pt] font-black">
                           {balance >= 0 ? 'Nachzahlung zu Ihren Lasten:' : 'Guthaben zu Ihren Gunsten:'}
                        </td>
                        <td className={`p-3 text-right border border-slate-300 text-base font-black ${balance >= 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                           {Math.abs(balance).toFixed(2)}€
                        </td>
                      </tr>
                    </tfoot>
                </table>

                <div className="mt-12 text-[10pt] text-black">
                   <textarea className="w-full bg-slate-50 p-4 rounded-xl no-print text-sm border border-slate-200 outline-none focus:ring-1 focus:ring-indigo-300 transition" value={letterClosing} onChange={e => setLetterClosing(e.target.value)} />
                   <p className="hidden print:block whitespace-pre-wrap leading-relaxed">{letterClosing}</p>
                   <div className="mt-12 font-black">
                      <p className="text-base">{ownerName}</p>
                      <p className="text-[8pt] text-slate-500 uppercase tracking-widest">Immobilienverwaltung</p>
                   </div>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 bg-white border-t flex justify-between items-center shrink-0">
               <div className="flex space-x-3">
                  <button onClick={handleDownloadWord} className="px-6 py-3 bg-indigo-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-indigo-800 transition shadow-lg flex items-center space-x-2">
                    <i className="fa-solid fa-file-word text-lg"></i><span>Word (.doc)</span>
                  </button>
                  <button onClick={exportToExcel} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-[10px] uppercase hover:bg-emerald-700 transition shadow-lg flex items-center space-x-2">
                    <i className="fa-solid fa-file-excel text-lg"></i><span>Daten (Excel)</span>
                  </button>
               </div>
               <button onClick={() => setShowLetterForm(false)} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-[10px] uppercase hover:bg-slate-200 transition">Abbrechen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const UnitTabButton = ({ active, onClick, label, icon }: any) => (
  <button onClick={onClick} className={`py-3 px-2 text-[9px] font-bold uppercase tracking-wider border-b-2 transition flex items-center space-x-2 shrink-0 ${active ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-indigo-600'}`}>
    <i className={`fa-solid ${icon} text-base`}></i>
    <span>{label}</span>
  </button>
);

const TabButton = ({ active, onClick, label, icon }: any) => (
  <button onClick={onClick} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition flex items-center space-x-2 ${active ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-600'}`}><i className={`fa-solid ${icon}`}></i><span>{label}</span></button>
);

const Section = ({ title, children }: any) => (
  <div className="space-y-3"><h3 className="font-bold text-slate-900 uppercase tracking-widest text-[10px] border-b pb-1.5 flex items-center"><i className="fa-solid fa-chevron-right mr-2 text-indigo-600"></i>{title}</h3><div className="space-y-3">{children}</div></div>
);

const InputField = ({ label, value, onChange, type = "text" }: any) => (
  <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase ml-1 tracking-wider">{label}</label><input type={type} value={value || ''} onChange={e => onChange(e.target.value)} className="w-full border border-slate-200 p-2 rounded-xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-600 outline-none bg-slate-50 font-bold text-slate-900 text-sm transition-all" /></div>
);

export default PropertyEditor;
