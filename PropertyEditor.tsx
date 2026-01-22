
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
    const share = keyType === 'm2' ? (uSize / tSpace) * total : (1 / (totalUnitsCount || 1)) * total;
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

  const updateLocalTransaction = (id: string, field: keyof Transaction, value: any) => {
    setLocalTransactions(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const currentUnitShare = editableBreakdown.reduce((sum, item) => sum + item.share, 0);
  const unitPrepaymentYear = editingUnit ? (editingUnit.utilityPrepayment * 12) : 0;
  const balance = currentUnitShare - unitPrepaymentYear;

  const handleDownloadWord = () => {
    const element = document.getElementById('printable-area');
    if (!element) return;
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><style>@page { size: 21cm 29.7cm; margin: 2cm; } body { font-family: Arial, sans-serif; font-size: 10pt; color: #000; } table { border-collapse: collapse; width: 100%; border: 1px solid #000; } th, td { border: 1px solid #000; padding: 6px; text-align: left; }</style></head><body>`;
    const clone = element.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.no-print').forEach(el => el.remove());
    clone.querySelectorAll('input, select, textarea').forEach((el: any) => {
      const span = document.createElement('span');
      span.textContent = el.tagName === 'SELECT' ? el.options[el.selectedIndex].text : el.value;
      el.parentNode.replaceChild(span, el);
    });
    const blob = new Blob(['\ufeff', header + clone.innerHTML + "</body></html>"], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `Abrechnung_${assignedTenant?.lastName || 'Mieter'}_${billingYear}.doc`; link.click();
  };

  const exportToExcel = () => {
    let excelXml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>td { border: 0.5pt solid #000; }</style></head><body><table><tr><td colspan="4"><b>Abrechnung ${billingYear}</b></td></tr>${editableBreakdown.map(item => `<tr><td>${item.category}</td><td>${item.total.toFixed(2)}</td><td>${item.keyLabel}</td><td>${item.share.toFixed(2)}</td></tr>`).join('')}</table></body></html>`;
    const blob = new Blob([excelXml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `Abrechnung_${assignedTenant?.lastName}_${billingYear}.xls`; a.click();
  };

  const updateUnitState = (id: string, field: keyof Unit, value: any) => {
    setEditedProperty(prev => ({ ...prev, units: prev.units.map(u => u.id === id ? { ...u, [field]: value } : u) }));
  };

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

  const addMeterReading = (type: MeterType, isHouse: boolean = true) => {
    const newReading: MeterReading = { id: 'm' + Date.now(), type, value: 0, unit: type === MeterType.ELECTRICITY ? 'kWh' : 'm³', date: new Date().toISOString().split('T')[0], serialNumber: '' };
    if (isHouse) { setEditedProperty(prev => ({ ...prev, meterReadings: [...(prev.meterReadings || []), newReading] })); }
    else if (editingUnitId) { setEditedProperty(prev => ({ ...prev, units: prev.units.map(u => u.id === editingUnitId ? { ...u, meterReadings: [...(u.meterReadings || []), newReading] } : u) })); }
  };

  const updateField = (field: keyof Property, value: any) => { setEditedProperty(prev => ({ ...prev, [field]: value })); };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-1 sm:p-2">
      <div className="bg-white w-full max-w-7xl h-[98vh] rounded-xl shadow-2xl overflow-hidden flex flex-col no-print text-slate-800 border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 p-2 sm:p-3 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center space-x-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg"><i className="fa-solid fa-building text-base"></i></div>
            <div><h2 className="text-sm font-black leading-tight">{editedProperty.name || 'Immobilie'}</h2><p className="text-slate-400 text-[8px] uppercase font-bold tracking-wider">Objekt-Verwaltung</p></div>
          </div>
          <button onClick={onCancel} className="p-1.5 hover:bg-white/10 rounded-full transition"><i className="fa-solid fa-xmark text-lg"></i></button>
        </div>

        {/* Tabs */}
        <div className="bg-slate-50 border-b px-2 py-1 flex space-x-1 shrink-0 overflow-x-auto scrollbar-hide">
          <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')} label="Stammdaten" icon="fa-house-chimney" />
          <TabButton active={activeTab === 'units'} onClick={() => setActiveTab('units')} label="Einheiten" icon="fa-door-open" />
          <TabButton active={activeTab === 'costs'} onClick={() => setActiveTab('costs')} label="Ausgaben" icon="fa-file-invoice-dollar" />
          <TabButton active={activeTab === 'meters'} onClick={() => setActiveTab('meters')} label="Haus-Zähler" icon="fa-gauge-high" />
          <TabButton active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} label="Finanzen" icon="fa-landmark" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-slate-50/20 custom-scrollbar">
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
              <Section title="Grunddaten">
                <InputField label="Name des Objekts" value={editedProperty.name} onChange={(v: string) => updateField('name', v)} />
                <InputField label="Anschrift" value={editedProperty.address} onChange={(v: string) => updateField('address', v)} />
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Baujahr" type="number" value={editedProperty.yearBuilt} onChange={(v: string) => updateField('yearBuilt', parseInt(v))} />
                  <InputField label="Heizung" value={editedProperty.heatingType} onChange={(v: string) => updateField('heatingType', v)} />
                </div>
              </Section>
              <Section title="Verwaltung">
                <label className="text-[8px] font-bold text-slate-400 uppercase ml-1 mb-1 block">Eigentümer</label>
                <select className="w-full border border-slate-200 p-2 rounded-lg text-xs font-bold bg-white text-slate-900 outline-none focus:border-indigo-600 shadow-sm" value={editedProperty.ownerId || ''} onChange={e => updateField('ownerId', e.target.value)}>
                  <option value="">-- Wählen --</option>
                  {owners.map(o => <option key={o.id} value={o.id}>{o.company || o.name}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2 mt-2">
                   <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <p className="text-[8px] font-bold text-slate-400 uppercase">Einheiten</p>
                      <p className="text-sm font-black text-slate-900">{totalUnitsCount}</p>
                   </div>
                   <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <p className="text-[8px] font-bold text-slate-400 uppercase">Gesamtfläche</p>
                      <p className="text-sm font-black text-slate-900">{defaultTotalLivingSpace} m²</p>
                   </div>
                </div>
              </Section>
            </div>
          )}

          {activeTab === 'units' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in">
              {editedProperty.units.map(unit => (
                <div key={unit.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-400 transition cursor-pointer" onClick={() => { setEditingUnitId(unit.id); setUnitTab('details'); }}>
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 text-sm"><i className="fa-solid fa-door-open"></i></div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-slate-900 truncate">{unit.number}</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase">{unit.size} m²</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                    <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded ${unit.tenantId ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{unit.tenantId ? 'Mieter' : 'Leer'}</span>
                    <i className="fa-solid fa-chevron-right text-slate-300 text-[9px]"></i>
                  </div>
                </div>
              ))}
              <button onClick={() => updateField('units', [...editedProperty.units, { id: 'u'+Date.now(), number: 'Neu', size: 0, baseRent: 0, utilityPrepayment: 0, type: UnitType.RESIDENTIAL }])} className="border-2 border-dashed border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition">
                <i className="fa-solid fa-plus text-base mb-1"></i><span className="text-[8px] font-bold uppercase">Einheit +</span>
              </button>
            </div>
          )}

          {activeTab === 'costs' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-[10px]">
                  <thead className="bg-slate-50 border-b text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    <tr><th className="px-3 py-2">Position / Kostenart</th><th className="px-3 py-2">Betrag (€)</th><th className="px-3 py-2 text-right">Löschen</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {houseCosts.map(cost => (
                      <tr key={cost.id} className="hover:bg-slate-50 transition">
                        <td className="px-3 py-2">
                          <input className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 font-bold text-slate-900 focus:ring-1 focus:ring-indigo-300 outline-none" placeholder="z.B. Grundsteuer" value={cost.category} onChange={e => updateLocalTransaction(cost.id, 'category', e.target.value)} />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" className="w-24 bg-white border border-slate-200 rounded px-2 py-1.5 font-black text-indigo-700 outline-none focus:ring-1 focus:ring-indigo-300" value={cost.amount} onChange={e => updateLocalTransaction(cost.id, 'amount', parseFloat(e.target.value) || 0)} />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => setLocalTransactions(prev => prev.filter(t => t.id !== cost.id))} className="text-slate-300 hover:text-red-500 p-2 transition"><i className="fa-solid fa-trash-can"></i></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={() => setLocalTransactions([...localTransactions, { id: 't'+Date.now(), propertyId: editedProperty.id, type: TransactionType.EXPENSE, category: '', amount: 0, date: new Date().toISOString().split('T')[0], description: '', isUtilityRelevant: true }])} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-[9px] uppercase hover:bg-black transition shadow-md">Ausgabe hinzufügen +</button>
            </div>
          )}

          {activeTab === 'meters' && (
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in">
                {editedProperty.meterReadings?.map(meter => (
                  <div key={meter.id} className="bg-white p-3 rounded-lg border border-slate-200 relative">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">{meter.type} Hauptzähler</h4>
                      <button onClick={() => updateField('meterReadings', editedProperty.meterReadings?.filter(m => m.id !== meter.id))} className="text-slate-300 hover:text-red-500"><i className="fa-solid fa-trash text-[10px]"></i></button>
                    </div>
                    <div className="space-y-2">
                      <InputField label="Nummer" value={meter.serialNumber} onChange={(v: string) => updateField('meterReadings', editedProperty.meterReadings?.map(m => m.id === meter.id ? {...m, serialNumber: v} : m))} />
                      <InputField label="Stand" type="number" value={meter.value} onChange={(v: string) => updateField('meterReadings', editedProperty.meterReadings?.map(m => m.id === meter.id ? {...m, value: parseFloat(v)} : m))} />
                    </div>
                  </div>
                ))}
                <button onClick={() => addMeterReading(MeterType.WATER, true)} className="border border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center text-slate-300 hover:text-indigo-600 transition shadow-sm">
                  <i className="fa-solid fa-plus mb-1"></i><span className="text-[8px] font-bold uppercase">Zähler</span>
                </button>
             </div>
          )}

          {activeTab === 'finance' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in">
              {editedProperty.loans?.map(loan => (
                <div key={loan.id} className="bg-white p-3 rounded-lg border border-slate-200 space-y-3 shadow-sm">
                  <div className="flex justify-between items-center">
                    <input className="font-bold text-indigo-600 uppercase text-[9px] bg-white border border-slate-100 p-1 rounded outline-none" value={loan.bankName} onChange={e => setEditedProperty(prev => ({ ...prev, loans: prev.loans?.map(l => l.id === loan.id ? { ...l, bankName: e.target.value } : l) }))} />
                    <button onClick={() => updateField('loans', editedProperty.loans?.filter(l => l.id !== loan.id))} className="text-slate-300 hover:text-red-500"><i className="fa-solid fa-trash text-[10px]"></i></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <InputField label="Saldo €" type="number" value={loan.currentBalance} onChange={(v: string) => updateField('loans', editedProperty.loans?.map(l => l.id === loan.id ? {...l, currentBalance: parseFloat(v)} : l))} />
                    <InputField label="Zins %" type="number" value={loan.interestRate} onChange={(v: string) => updateField('loans', editedProperty.loans?.map(l => l.id === loan.id ? {...l, interestRate: parseFloat(v)} : l))} />
                    <InputField label="Rate €" type="number" value={loan.monthlyInstallment} onChange={(v: string) => updateField('loans', editedProperty.loans?.map(l => l.id === loan.id ? {...l, monthlyInstallment: parseFloat(v)} : l))} />
                    <InputField label="Ende" type="date" value={loan.fixedUntil} onChange={(v: string) => updateField('loans', editedProperty.loans?.map(l => l.id === loan.id ? {...l, fixedUntil: v} : l))} />
                  </div>
                </div>
              ))}
              <button onClick={() => updateField('loans', [...(editedProperty.loans || []), { id: 'l'+Date.now(), bankName: 'Neue Bank', totalAmount: 0, currentBalance: 0, interestRate: 0, repaymentRate: 0, fixedUntil: '', monthlyInstallment: 0 }])} className="border border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center text-slate-300 hover:text-indigo-600 transition uppercase font-bold text-[8px] shadow-sm"><i className="fa-solid fa-plus mb-1"></i>Kredit +</button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-3 border-t flex justify-end space-x-2 bg-white shrink-0">
          <button onClick={onCancel} className="px-4 text-[10px] font-bold text-slate-500 hover:text-slate-700">Abbrechen</button>
          <button onClick={() => onSave(editedProperty, localTransactions)} className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-black text-[10px] uppercase shadow-lg hover:bg-indigo-700 transition">Alle Änderungen Speichern</button>
        </div>
      </div>

      {/* UNIT MODAL */}
      {editingUnitId && !showLetterForm && editingUnit && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[110] flex items-center justify-center p-2 no-print">
           <div className="bg-white w-full max-w-4xl h-[94vh] rounded-xl shadow-2xl overflow-hidden flex flex-col">
              <div className="bg-slate-900 p-3 flex justify-between items-center text-white shrink-0">
                 <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white"><i className="fa-solid fa-key text-base"></i></div>
                    <div><h3 className="text-sm font-black">Einheit {editingUnit.number}</h3><p className="text-[8px] text-slate-400 font-bold uppercase">{editingUnit.size} m²</p></div>
                 </div>
                 <button onClick={() => setEditingUnitId(null)} className="p-1.5 hover:bg-white/10 rounded-full transition"><i className="fa-solid fa-xmark text-lg"></i></button>
              </div>

              <div className="bg-slate-50 border-b px-3 py-1 flex space-x-3 shrink-0 overflow-x-auto scrollbar-hide">
                 <UnitTabButton active={unitTab === 'details'} onClick={() => setUnitTab('details')} label="Zuweisung" icon="fa-user-tag" />
                 <UnitTabButton active={unitTab === 'docs'} onClick={() => setUnitTab('docs')} label="Dokumente" icon="fa-images" />
                 <UnitTabButton active={unitTab === 'meters'} onClick={() => setUnitTab('meters')} label="Zähler" icon="fa-gauge" />
                 <UnitTabButton active={unitTab === 'utility'} onClick={() => setUnitTab('utility')} label="Abrechnung" icon="fa-calculator" />
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white custom-scrollbar">
                 {unitTab === 'details' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                       <Section title="Mieter & Bezeichnung">
                          <label className="text-[8px] font-bold text-slate-400 uppercase mb-1 block tracking-widest">Mieter wählen</label>
                          <select 
                            className="w-full border border-slate-200 p-2 rounded-lg bg-white text-xs font-bold text-slate-900 outline-none focus:border-indigo-600 shadow-sm" 
                            value={editingUnit.tenantId || ''} 
                            onChange={(e) => updateUnitState(editingUnit.id, 'tenantId', e.target.value)}
                          >
                             <option value="">-- Leerstand --</option>
                             {tenants.map(t => <option key={t.id} value={t.id} className="text-slate-900">{t.firstName} {t.lastName}</option>)}
                          </select>
                          <div className="mt-3"><InputField label="Interne Bezeichnung" value={editingUnit.number} onChange={(v: string) => updateUnitState(editingUnit.id, 'number', v)} /></div>
                       </Section>
                       <Section title="Mietkonditionen">
                          <div className="grid grid-cols-2 gap-2">
                             <InputField label="Fläche (m²)" type="number" value={editingUnit.size} onChange={(v: string) => updateUnitState(editingUnit.id, 'size', parseFloat(v))} />
                             <InputField label="Kaltmiete (€)" type="number" value={editingUnit.baseRent} onChange={(v: string) => updateUnitState(editingUnit.id, 'baseRent', parseFloat(v))} />
                             <InputField label="BK Vorausz. (€)" type="number" value={editingUnit.utilityPrepayment} onChange={(v: string) => updateUnitState(editingUnit.id, 'utilityPrepayment', parseFloat(v))} />
                             <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-100 flex flex-col justify-center">
                                <p className="text-[7px] font-bold text-indigo-400 uppercase">Monat Soll</p>
                                <p className="text-sm font-black text-indigo-800">{(editingUnit.baseRent + editingUnit.utilityPrepayment).toFixed(2)}€</p>
                             </div>
                          </div>
                       </Section>
                    </div>
                 )}

                 {unitTab === 'docs' && (
                    <div className="space-y-4 animate-in fade-in">
                       <div className="flex justify-between items-center border-b pb-2">
                          <h4 className="text-[9px] font-black text-slate-800 uppercase tracking-widest">Einheiten-Dateien</h4>
                          <label className="cursor-pointer bg-slate-900 text-white px-3 py-1.5 rounded-lg font-bold text-[8px] uppercase hover:bg-black transition flex items-center space-x-2">
                            <i className="fa-solid fa-cloud-arrow-up"></i>
                            <span>Dateien hochladen</span>
                            <input 
                              type="file" 
                              className="hidden" 
                              multiple 
                              onChange={(e) => handleUnitFileUpload(e, editingUnit.id)} 
                              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                            />
                          </label>
                       </div>
                       <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                          {editingUnit.documents?.map(doc => (
                            <div key={doc.id} className="bg-slate-50 border border-slate-200 rounded-xl p-1.5 relative group overflow-hidden shadow-sm hover:border-indigo-300 transition">
                               <div className="h-20 bg-slate-200 rounded-lg mb-1.5 flex items-center justify-center overflow-hidden">
                                 {doc.mimeType.includes('image') ? <img src={doc.fileData} className="w-full h-full object-cover" /> : <i className="fa-solid fa-file-pdf text-2xl text-rose-500"></i>}
                               </div>
                               <p className="text-[7px] font-bold text-slate-800 truncate px-1">{doc.name}</p>
                               <button 
                                 onClick={() => updateUnitState(editingUnit.id, 'documents', editingUnit.documents?.filter(d => d.id !== doc.id))} 
                                 className="absolute top-1.5 right-1.5 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition shadow-lg"
                               >
                                 <i className="fa-solid fa-trash-can text-[8px]"></i>
                               </button>
                            </div>
                          ))}
                          {(!editingUnit.documents || editingUnit.documents.length === 0) && (
                            <div className="col-span-full py-10 text-center text-slate-400 italic text-[10px]">
                              Keine Dokumente für diese Einheit hinterlegt.
                            </div>
                          )}
                       </div>
                    </div>
                 )}

                 {unitTab === 'meters' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in">
                       {editingUnit.meterReadings?.map(meter => (
                          <div key={meter.id} className="bg-white p-3 rounded-lg border border-slate-200 relative group shadow-sm">
                             <h4 className="font-bold text-indigo-600 uppercase text-[8pt] mb-2">{meter.type} Zähler</h4>
                             <div className="grid grid-cols-2 gap-2">
                                <InputField label="Nummer" value={meter.serialNumber} onChange={(v: string) => updateUnitState(editingUnit.id, 'meterReadings', editingUnit.meterReadings?.map(m => m.id === meter.id ? {...m, serialNumber: v} : m))} />
                                <InputField label="Stand" type="number" value={meter.value} onChange={(v: string) => updateUnitState(editingUnit.id, 'meterReadings', editingUnit.meterReadings?.map(m => m.id === meter.id ? {...m, value: parseFloat(v)} : m))} />
                             </div>
                             <button onClick={() => updateUnitState(editingUnit.id, 'meterReadings', editingUnit.meterReadings?.filter(m => m.id !== meter.id))} className="absolute top-3 right-3 text-slate-300 hover:text-red-500 transition"><i className="fa-solid fa-trash text-[8px]"></i></button>
                          </div>
                       ))}
                       <button onClick={() => addMeterReading(MeterType.WATER, false)} className="border-2 border-dashed border-slate-200 rounded-lg p-5 flex flex-col items-center justify-center text-slate-300 hover:text-indigo-600 transition font-bold uppercase text-[8px] shadow-sm"><i className="fa-solid fa-plus mb-1"></i>Zähler +</button>
                    </div>
                 )}

                 {unitTab === 'utility' && (
                    <div className="flex flex-col items-center justify-center min-h-[35vh] space-y-6 animate-in fade-in">
                       <div className="w-full max-w-sm bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col items-center">
                         <label className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Abrechnungsjahr festlegen</label>
                         <input 
                           type="number" 
                           className="w-32 text-center text-xl font-black bg-white border border-slate-200 rounded-xl p-2 outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-600"
                           value={billingYear}
                           onChange={e => setBillingYear(e.target.value)}
                         />
                       </div>

                       <div className="bg-slate-900 p-8 rounded-3xl text-white text-center w-full max-w-md shadow-2xl relative overflow-hidden">
                          <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-indigo-400 mb-2">Vorschau Saldo {billingYear}</p>
                          <h4 className={`text-4xl font-black mb-4 ${balance >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{Math.abs(balance).toFixed(2)} €</h4>
                          <p className="text-[8px] text-slate-400 mb-8 uppercase font-bold tracking-widest">{balance >= 0 ? 'Nachzahlung durch Mieter' : 'Guthaben für Mieter'}</p>
                          <button 
                            onClick={() => setShowLetterForm(true)} 
                            disabled={!assignedTenant}
                            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition flex items-center justify-center space-x-2 text-[10px] uppercase shadow-lg disabled:opacity-50 disabled:hover:bg-indigo-600 active:scale-95"
                          >
                             <i className="fa-solid fa-file-signature text-base"></i>
                             <span>{assignedTenant ? 'Interaktiver Abrechnungs-Designer' : 'Kein Mieter zugewiesen'}</span>
                          </button>
                       </div>
                    </div>
                 )}
              </div>

              <div className="p-4 border-t bg-slate-50 flex justify-end shrink-0">
                  <button onClick={() => setEditingUnitId(null)} className="bg-slate-900 text-white px-6 py-2.5 rounded-lg font-black text-xs uppercase shadow-md hover:bg-black transition active:scale-95">Änderungen Übernehmen</button>
              </div>
           </div>
        </div>
      )}

      {/* INTERAKTIVER BRIEF-DESIGNER (WYSIWYG) */}
      {showLetterForm && editingUnit && assignedTenant && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur z-[300] flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white w-full max-w-5xl rounded-xl shadow-2xl overflow-hidden flex flex-col h-[96vh] animate-in zoom-in-95 no-print">
            <div className="bg-indigo-700 p-3 flex justify-between items-center text-white shrink-0">
               <div><h3 className="font-black text-sm uppercase leading-tight">Interaktiver Abrechnungs-Designer</h3><p className="text-[8px] font-bold text-indigo-100 uppercase tracking-widest">Werte direkt in der Vorschau bearbeiten</p></div>
               <button onClick={() => setShowLetterForm(false)} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition"><i className="fa-solid fa-xmark text-lg"></i></button>
            </div>
            
            <div className="p-2 sm:p-4 bg-slate-200 overflow-y-auto custom-scrollbar flex-1 flex flex-col items-center">
              <div id="printable-area" className="bg-white shadow-2xl mx-auto w-full max-w-[210mm] min-h-[297mm] text-black font-sans p-10 sm:p-[15mm] relative border border-slate-300">
                <div className="text-[8pt] text-slate-600 border-b pb-1 mb-8 italic">{ownerName} • {selectedOwner?.address} • {selectedOwner?.zip} {selectedOwner?.city}</div>
                
                <div className="flex justify-between mb-10">
                   <div className="text-[10pt] space-y-1 text-black">
                      <p className="font-black text-base">{assignedTenant.firstName} {assignedTenant.lastName}</p>
                      <p>{editedProperty.address}</p>
                      <div className="flex items-center space-x-1 text-indigo-700 font-bold mt-4 text-[7.5pt]"><span>Einheit:</span><input className="bg-slate-50 border border-slate-200 no-print font-black p-0.5 rounded w-16 px-2 text-black outline-none" value={editingUnit.number} onChange={e => updateUnitState(editingUnit.id, 'number', e.target.value)} /><span className="hidden print:inline">{editingUnit.number}</span></div>
                   </div>
                   <div className="text-right text-[8pt] text-slate-500 font-bold uppercase">{selectedOwner?.city}, {new Date().toLocaleDateString('de-DE')}</div>
                </div>

                <div className="text-xl font-black mb-8 text-black border-l-4 border-indigo-600 pl-3 py-1 uppercase tracking-tight flex items-center">
                   <span>Betriebskostenabrechnung&nbsp;</span>
                   <input 
                     className="bg-transparent border-none w-16 font-black text-indigo-600 no-print outline-none p-0" 
                     value={billingYear} 
                     onChange={e => setBillingYear(e.target.value)} 
                   />
                   <span className="hidden print:inline">{billingYear}</span>
                </div>
                
                <div className="text-[10pt] mb-8 leading-relaxed text-black">
                   <p className="mb-2 font-black">Sehr geehrte(r) Frau/Herr {assignedTenant.lastName},</p>
                   <textarea className="w-full bg-slate-50 p-3 rounded-lg text-black text-[10pt] no-print border border-slate-300 outline-none focus:ring-1 focus:ring-indigo-300 h-24" value={letterIntro} onChange={e => setLetterIntro(e.target.value)} />
                   <p className="hidden print:block whitespace-pre-wrap">{letterIntro}</p>
                </div>

                <table className="w-full text-[8.5pt] border-collapse border border-black" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead className="bg-slate-100 text-black font-black">
                      <tr>
                        <th className="p-2 border border-black text-left">Kostenart</th>
                        <th className="p-2 border border-black text-right">Haus Summe</th>
                        <th className="p-2 border border-black text-center">Key</th>
                        <th className="p-2 border border-black text-right">Anteil Mieter</th>
                      </tr>
                    </thead>
                    <tbody className="text-black font-medium">
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
                          <td className="p-1.5 border border-black text-center text-[7pt] text-slate-700">
                             <select className="bg-transparent border-none no-print outline-none text-center font-bold text-black p-0" value={item.keyType} onChange={(e) => updateBreakdownItem(item.id, 'keyType', e.target.value as AllocationKey)}>
                                <option value="m2">m²</option><option value="unit">WE</option>
                             </select>
                             <span className="hidden print:inline">{item.keyLabel}</span>
                          </td>
                          <td className="p-1.5 border border-black text-right font-black">{item.share.toFixed(2)} €</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="font-black bg-slate-50 text-black">
                      <tr><td colSpan={3} className="p-2 text-right border border-black text-[8pt] uppercase">Summe Anteil Mieter:</td><td className="p-2 text-right border border-black">{currentUnitShare.toFixed(2)} €</td></tr>
                      <tr className="text-rose-700"><td colSpan={3} className="p-2 text-right border border-black text-[8pt] uppercase">Vorauszahlungen (geleistet):</td><td className="p-2 text-right border border-black">-{unitPrepaymentYear.toFixed(2)} €</td></tr>
                      <tr className={`${balance >= 0 ? 'bg-rose-50' : 'bg-emerald-50'}`}><td colSpan={3} className="p-3 text-right border border-black uppercase text-[9pt] font-black">{balance >= 0 ? 'Nachzahlung:' : 'Guthaben:'}</td><td className={`p-3 text-right border border-black text-base font-black ${balance >= 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{Math.abs(balance).toFixed(2)} €</td></tr>
                    </tfoot>
                </table>

                <div className="mt-10 text-[10pt] text-black">
                   <textarea className="w-full bg-slate-50 p-3 rounded-lg no-print text-[10pt] border border-slate-300 text-black h-24 outline-none" value={letterClosing} onChange={e => setLetterClosing(e.target.value)} />
                   <p className="hidden print:block whitespace-pre-wrap">{letterClosing}</p>
                   <div className="mt-10 font-black">
                      <p className="text-[11pt]">{ownerName}</p>
                      <p className="text-[7pt] text-slate-500 uppercase tracking-widest">Objektverwaltung</p>
                   </div>
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-5 bg-white border-t flex justify-between items-center shrink-0">
               <div className="flex space-x-2">
                  <button onClick={handleDownloadWord} className="px-5 py-2.5 bg-indigo-700 text-white rounded-lg font-bold text-[9px] uppercase hover:bg-indigo-800 transition shadow-lg flex items-center space-x-2"><i className="fa-solid fa-file-word text-base"></i><span>Word (.doc)</span></button>
                  <button onClick={exportToExcel} className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-bold text-[9px] uppercase hover:bg-emerald-700 transition shadow-lg flex items-center space-x-2"><i className="fa-solid fa-file-excel text-base"></i><span>Daten (Excel)</span></button>
               </div>
               <button onClick={() => setShowLetterForm(false)} className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-lg font-bold text-[9px] uppercase hover:bg-slate-200 transition active:scale-95">Zurück zur Einheit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const UnitTabButton = ({ active, onClick, label, icon }: any) => (
  <button onClick={onClick} className={`py-2 px-2 text-[8px] font-bold uppercase tracking-wider border-b-2 transition flex items-center space-x-1.5 shrink-0 ${active ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-indigo-600'}`}>
    <i className={`fa-solid ${icon} text-base`}></i>
    <span>{label}</span>
  </button>
);

const TabButton = ({ active, onClick, label, icon }: any) => (
  <button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition flex items-center space-x-1.5 ${active ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-indigo-600'}`}><i className={`fa-solid ${icon}`}></i><span>{label}</span></button>
);

const Section = ({ title, children }: any) => (
  <div className="space-y-2"><h3 className="font-bold text-slate-900 uppercase tracking-widest text-[8px] border-b pb-1 flex items-center"><i className="fa-solid fa-chevron-right mr-1.5 text-indigo-600"></i>{title}</h3><div className="space-y-2">{children}</div></div>
);

const InputField = ({ label, value, onChange, type = "text" }: any) => (
  <div className="space-y-0.5"><label className="text-[7px] font-bold text-slate-400 uppercase ml-1 tracking-wider">{label}</label><input type={type} value={value || ''} onChange={e => onChange(e.target.value)} className="w-full border border-slate-200 p-2 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none bg-white font-bold text-slate-900 text-[11px] transition-all shadow-sm" /></div>
);

export default PropertyEditor;
