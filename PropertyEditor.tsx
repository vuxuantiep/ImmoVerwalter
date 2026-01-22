
import React, { useState, useEffect } from 'react';
import { Property, Unit, Loan, Tenant, PropertyDocument, Owner, UnitType, Template, Transaction, MeterType, MeterReading, TransactionType } from './types.ts';
import { generateUtilityStatementLetter, generateUnitExpose, generateTenantLetter } from './geminiService.ts';

interface PropertyEditorProps {
  property: Property;
  tenants: Tenant[];
  owners: Owner[];
  templates: Template[];
  transactions: Transaction[];
  onSave: (updatedProperty: Property, updatedTransactions?: Transaction[]) => void;
  onCancel: () => void;
}

interface EditableBreakdownItem {
  id: string;
  category: string;
  total: number;
  key: string;
  share: number;
}

const PropertyEditor: React.FC<PropertyEditorProps> = ({ property, tenants, owners, templates, transactions, onSave, onCancel }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'units' | 'costs' | 'finance'>('general');
  const [editedProperty, setEditedProperty] = useState<Property>({ ...property });
  const [localTransactions, setLocalTransactions] = useState<Transaction[]>([...transactions]);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [unitTab, setUnitTab] = useState<'details' | 'docs' | 'communication' | 'utility'>('details');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id || '');
  const [letterContext, setLetterContext] = useState('');
  
  const [showAddCostForm, setShowAddCostForm] = useState(false);
  const [newCost, setNewCost] = useState({ category: '', amount: '' });
  
  const [showAddLoanForm, setShowAddLoanForm] = useState(false);
  const [newLoan, setNewLoan] = useState<Partial<Loan>>({ bankName: '', currentBalance: 0, interestRate: 0, repaymentRate: 0, monthlyInstallment: 0, fixedUntil: '' });

  const [showAddMeterForm, setShowAddMeterForm] = useState(false);
  const [newMeter, setNewMeter] = useState<Partial<MeterReading>>({ type: MeterType.WATER, value: 0, date: new Date().toISOString().split('T')[0], unit: 'm³', serialNumber: '' });

  const [editableBreakdown, setEditableBreakdown] = useState<EditableBreakdownItem[]>([]);

  const houseCosts = localTransactions.filter(t => t.propertyId === editedProperty.id && t.isUtilityRelevant);
  const totalLivingSpace = editedProperty.units.reduce((sum, u) => sum + u.size, 0);

  const updateField = (field: keyof Property, value: any) => {
    setEditedProperty(prev => ({ ...prev, [field]: value }));
  };

  const updateUnit = (id: string, field: keyof Unit, value: any) => {
    setEditedProperty(prev => ({
      ...prev,
      units: prev.units.map(u => u.id === id ? { ...u, [field]: value } : u)
    }));
  };

  const handleAddUnit = () => {
    const newUnit: Unit = {
      id: 'u' + Math.random().toString(36).substr(2, 9),
      number: `Einheit ${editedProperty.units.length + 1}`,
      type: UnitType.RESIDENTIAL,
      size: 0,
      baseRent: 0,
      utilityPrepayment: 0,
      documents: [],
      meterReadings: []
    };
    setEditedProperty(prev => ({ ...prev, units: [...prev.units, newUnit] }));
  };

  const handleDeleteUnit = (id: string) => {
    if (window.confirm("Einheit wirklich löschen? Alle Daten gehen verloren.")) {
      setEditedProperty(prev => ({ ...prev, units: prev.units.filter(u => u.id !== id) }));
    }
  };

  const handleAddHouseCost = () => {
    if (!newCost.category || !newCost.amount) return;
    const t: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      propertyId: editedProperty.id,
      type: TransactionType.EXPENSE,
      category: newCost.category,
      amount: parseFloat(newCost.amount),
      date: new Date().toISOString().split('T')[0],
      description: `Erfassung: ${newCost.category}`,
      isUtilityRelevant: true
    };
    setLocalTransactions(prev => [...prev, t]);
    setNewCost({ category: '', amount: '' });
    setShowAddCostForm(false);
  };

  const handleAddLoan = () => {
    if (!newLoan.bankName) return;
    const loan: Loan = {
      id: Math.random().toString(36).substr(2, 9),
      bankName: newLoan.bankName || '',
      totalAmount: newLoan.currentBalance || 0,
      currentBalance: newLoan.currentBalance || 0,
      interestRate: newLoan.interestRate || 0,
      repaymentRate: newLoan.repaymentRate || 0,
      fixedUntil: newLoan.fixedUntil || '',
      monthlyInstallment: newLoan.monthlyInstallment || 0
    };
    setEditedProperty(prev => ({ ...prev, loans: [...(prev.loans || []), loan] }));
    setShowAddLoanForm(false);
    setNewLoan({ bankName: '', currentBalance: 0, interestRate: 0, repaymentRate: 0, monthlyInstallment: 0, fixedUntil: '' });
  };

  const handleAddMeterReading = () => {
    const reading: MeterReading = {
      id: Math.random().toString(36).substr(2, 9),
      type: newMeter.type || MeterType.WATER,
      value: newMeter.value || 0,
      unit: newMeter.type === MeterType.ELECTRICITY ? 'kWh' : 'm³',
      date: newMeter.date || new Date().toISOString().split('T')[0],
      serialNumber: newMeter.serialNumber || ''
    };
    setEditedProperty(prev => ({ ...prev, meterReadings: [...(prev.meterReadings || []), reading] }));
    setShowAddMeterForm(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, target: 'property' | 'unit', unitId?: string) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Data = e.target?.result as string;
      const newDoc: PropertyDocument = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        category: file.type.includes('image') ? 'Foto' : 'Dokument',
        uploadDate: new Date().toLocaleDateString('de-DE'),
        fileSize: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        fileData: base64Data,
        mimeType: file.type
      };
      if (target === 'property') {
        setEditedProperty(prev => ({ ...prev, documents: [...(prev.documents || []), newDoc] }));
      } else if (target === 'unit' && unitId) {
        setEditedProperty(prev => ({
          ...prev,
          units: prev.units.map(u => u.id === unitId ? { ...u, documents: [...(u.documents || []), newDoc] } : u)
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const editingUnit = editedProperty.units.find(u => u.id === editingUnitId);
  const assignedTenant = tenants.find(t => t?.id === editingUnit?.tenantId);

  useEffect(() => {
    if (editingUnit && unitTab === 'utility') {
      const items = houseCosts.map(t => ({
        id: t.id,
        category: t.category,
        total: t.amount,
        key: `${editingUnit.size} / ${totalLivingSpace} m²`,
        share: totalLivingSpace > 0 ? (editingUnit.size / totalLivingSpace) * t.amount : 0
      }));
      setEditableBreakdown(items);
    }
  }, [editingUnitId, unitTab, localTransactions]);

  const updateBreakdownItem = (id: string, field: keyof EditableBreakdownItem, value: any) => {
    setEditableBreakdown(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'total' && editingUnit) {
          updated.share = totalLivingSpace > 0 ? (editingUnit.size / totalLivingSpace) * (value as number) : 0;
        }
        return updated;
      }
      return item;
    }));
  };

  const currentUnitShare = editableBreakdown.reduce((sum, item) => sum + item.share, 0);
  const unitPrepaymentYear = editingUnit ? (editingUnit.utilityPrepayment * 12) : 0;
  const balance = currentUnitShare - unitPrepaymentYear;

  const exportToExcelCSV = () => {
    if (!aiResult) return alert("Zuerst Dokument generieren!");
    
    const rows: string[][] = [];
    rows.push(["BETRIEBSKOSTENABRECHNUNG - ANSCHREIBEN"]);
    rows.push([""]);
    const textLines = aiResult.split('\n');
    textLines.forEach(line => {
      rows.push([line.replace(/;/g, ',').trim()]);
    });
    
    rows.push([""]);
    rows.push(["KOSTENAUFSTELLUNG TABELLE"]);
    rows.push(["Kostenart", "Haus Gesamt (€)", "Verteilerschlüssel", "Anteil Einheit (€)"]);
    
    editableBreakdown.forEach(item => {
      rows.push([
        item.category.replace(/;/g, ','),
        item.total.toFixed(2).replace('.', ','),
        item.key.replace(/;/g, ','),
        item.share.toFixed(2).replace('.', ',')
      ]);
    });
    
    rows.push([""]);
    rows.push(["Zusammenfassung", "", "", ""]);
    rows.push(["Gesamtanteil Einheit", "", "", currentUnitShare.toFixed(2).replace('.', ',')]);
    rows.push(["Vorauszahlungen Jahr", "", "", unitPrepaymentYear.toFixed(2).replace('.', ',')]);
    rows.push(["Saldo", "", "", balance.toFixed(2).replace('.', ',')]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + rows.map(r => r.join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Abrechnung_2023_${editingUnit?.number || 'Einheit'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateManualStatement = () => {
    if (!assignedTenant || !editingUnit) return;
    setIsGenerating(true);
    setAiResult(null);
    
    let text = `BETRIEBSKOSTENABRECHNUNG 2023\n\n`;
    text += `Datum: ${new Date().toLocaleDateString('de-DE')}\n`;
    text += `Objekt: ${editedProperty.name}, ${editedProperty.address}\n`;
    text += `Einheit: ${editingUnit.number} (${editingUnit.size} m²)\n\n`;
    text += `Mieter: ${assignedTenant.firstName} ${assignedTenant.lastName}\n\n`;
    text += `Sehr geehrte(r) Herr/Frau ${assignedTenant.lastName},\n\n`;
    text += `hiermit erhalten Sie die Abrechnung der Betriebskosten für das Kalenderjahr 2023.\n\n`;
    text += `AUFSTELLUNG DER KOSTEN:\n`;
    text += `------------------------------------------------------------------\n`;
    editableBreakdown.forEach(item => {
      text += `${item.category.padEnd(25)} | Haus: ${item.total.toFixed(2)}€ | Anteil: ${item.share.toFixed(2)}€\n`;
    });
    text += `------------------------------------------------------------------\n`;
    text += `SUMME ANTEIL:           ${currentUnitShare.toFixed(2)} €\n`;
    text += `VORAUSZAHLUNGEN:        ${unitPrepaymentYear.toFixed(2)} €\n`;
    text += `SALDO:                  ${balance.toFixed(2)} €\n\n`;
    text += `${balance > 0 
      ? `Bitte überweisen Sie die Nachzahlung von ${balance.toFixed(2)} € innerhalb von 30 Tagen.` 
      : `Das Guthaben von ${Math.abs(balance).toFixed(2)} € wird mit der kommenden Miete verrechnet.`}\n\n`;
    text += `Mit freundlichen Grüßen,\nIhr Vermieter`;
    
    setAiResult(text);
    setIsGenerating(false);
  };

  const handleGenerateUtilityStatementAI = async () => {
    if (!assignedTenant || !editingUnit) return;
    setIsGenerating(true);
    setAiResult(null);
    try {
      const result = await generateUtilityStatementLetter(
        assignedTenant, editedProperty, "2023", 
        houseCosts.reduce((sum, i) => sum + i.amount, 0), 
        currentUnitShare, unitPrepaymentYear, balance, editableBreakdown
      );
      setAiResult(result);
    } catch (e) {
      generateManualStatement();
    }
    setIsGenerating(false);
  };

  const propertyPhotos = editedProperty.documents?.filter(d => d.category === 'Foto') || [];
  const propertyDocs = editedProperty.documents?.filter(d => d.category !== 'Foto') || [];

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-indigo-600 p-6 flex justify-between items-center text-white shrink-0">
          <div>
            <h2 className="text-2xl font-black">{editedProperty.name || 'Neues Objekt'}</h2>
            <p className="text-indigo-100 text-sm font-bold opacity-80 uppercase tracking-widest">Objekt-Verwaltung</p>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition"><i className="fa-solid fa-xmark text-xl"></i></button>
        </div>

        {/* Tabs */}
        <div className="bg-slate-50 border-b px-6 py-2 flex space-x-4 shrink-0 overflow-x-auto scrollbar-hide">
          <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')} label="Stammdaten" icon="fa-house-user" />
          <TabButton active={activeTab === 'costs'} onClick={() => setActiveTab('costs')} label="Haus-Kosten" icon="fa-file-invoice-dollar" />
          <TabButton active={activeTab === 'units'} onClick={() => setActiveTab('units')} label="Einheiten" icon="fa-door-open" />
          <TabButton active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} label="Finanzierung" icon="fa-landmark" />
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/20">
          {/* STAMMDATEN: GRUNDDATEN, FOTOS, ZÄHLER */}
          {activeTab === 'general' && (
             <div className="space-y-12 animate-in fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <Section title="Grunddaten & Adresse">
                     <InputField label="Name des Objekts" value={editedProperty.name} onChange={(v: string) => updateField('name', v)} />
                     <InputField label="Adresse" value={editedProperty.address} onChange={(v: string) => updateField('address', v)} />
                     <div className="grid grid-cols-2 gap-4">
                       <InputField label="Kaufpreis (€)" type="number" value={editedProperty.purchasePrice || ''} onChange={(v: string) => updateField('purchasePrice', parseFloat(v))} />
                       <InputField label="Baujahr" type="number" value={editedProperty.yearBuilt || ''} onChange={(v: string) => updateField('yearBuilt', parseInt(v))} />
                     </div>
                  </Section>

                  <Section title="Objekt-Fotos">
                     <div className="grid grid-cols-3 gap-2 mb-4">
                        {propertyPhotos.map(photo => (
                           <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden group shadow-sm">
                              <img src={photo.fileData} className="w-full h-full object-cover" />
                              <button onClick={() => updateField('documents', editedProperty.documents?.filter(d => d.id !== photo.id))} className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><i className="fa-solid fa-times text-[10px]"></i></button>
                           </div>
                        ))}
                        <label className="border-2 border-dashed border-slate-200 rounded-xl aspect-square flex flex-col items-center justify-center text-slate-300 hover:border-indigo-400 cursor-pointer transition bg-white">
                           <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'property')} />
                           <i className="fa-solid fa-camera text-xl"></i>
                        </label>
                     </div>
                  </Section>

                  <Section title="Eigentümer & Dokumente">
                     <select className="w-full border p-3 rounded-xl bg-white font-bold text-slate-700 shadow-sm mb-4" value={editedProperty.ownerId || ''} onChange={e => updateField('ownerId', e.target.value)}>
                        <option value="">Besitzer auswählen...</option>
                        {owners.map(o => <option key={o.id} value={o.id}>{o.company || o.name}</option>)}
                     </select>
                     <div className="space-y-2 mb-4">
                        {propertyDocs.map(doc => (
                           <div key={doc.id} className="flex justify-between items-center p-2 bg-white border rounded-xl text-[10px] font-bold">
                              <span className="truncate max-w-[120px]">{doc.name}</span>
                              <button onClick={() => updateField('documents', editedProperty.documents?.filter(d => d.id !== doc.id))} className="text-red-400 hover:text-red-600"><i className="fa-solid fa-trash-can"></i></button>
                           </div>
                        ))}
                     </div>
                     <label className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-indigo-400 cursor-pointer block relative transition bg-white shadow-sm">
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleFileUpload(e, 'property')} />
                        <i className="fa-solid fa-folder-plus text-xl text-slate-300"></i>
                        <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Dokument hochladen</p>
                     </label>
                  </Section>
                </div>

                <Section title="Hauptzähler (Haus)">
                   <div className="flex justify-between items-center mb-4">
                      <p className="text-xs text-slate-500 font-medium">Verwalten Sie die Zählerstände für das gesamte Gebäude.</p>
                      <button onClick={() => setShowAddMeterForm(!showAddMeterForm)} className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase">Zählerstand erfassen</button>
                   </div>
                   
                   {showAddMeterForm && (
                      <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 animate-in slide-in-from-top-2">
                         <select className="border p-2 rounded-xl text-xs font-bold" value={newMeter.type} onChange={e => setNewMeter({...newMeter, type: e.target.value as MeterType})}>
                            <option value={MeterType.ELECTRICITY}>Strom</option>
                            <option value={MeterType.WATER}>Wasser</option>
                            <option value={MeterType.GAS}>Gas</option>
                         </select>
                         <InputField label="Stand" type="number" value={newMeter.value} onChange={(v: string) => setNewMeter({...newMeter, value: parseFloat(v)})} />
                         <InputField label="Zählernummer" value={newMeter.serialNumber} onChange={(v: string) => setNewMeter({...newMeter, serialNumber: v})} />
                         <div className="flex items-end"><button onClick={handleAddMeterReading} className="w-full bg-indigo-600 text-white py-2 rounded-xl font-black text-[10px] uppercase">Speichern</button></div>
                      </div>
                   )}

                   <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
                      <table className="w-full text-left text-xs">
                         <thead className="bg-slate-50 border-b text-[9px] font-black uppercase text-slate-400">
                            <tr><th className="px-6 py-3">Typ</th><th className="px-6 py-3">Datum</th><th className="px-6 py-3">Zählernummer</th><th className="px-6 py-3">Stand</th><th className="px-6 py-3 text-right">Aktion</th></tr>
                         </thead>
                         <tbody className="divide-y">
                            {editedProperty.meterReadings?.map(reading => (
                               <tr key={reading.id} className="hover:bg-slate-50 transition">
                                  <td className="px-6 py-3 font-bold text-indigo-600">{reading.type}</td>
                                  <td className="px-6 py-3 text-slate-500">{reading.date}</td>
                                  <td className="px-6 py-3 font-medium">{reading.serialNumber || '-'}</td>
                                  <td className="px-6 py-3 font-black">{reading.value} {reading.unit}</td>
                                  <td className="px-6 py-3 text-right"><button onClick={() => updateField('meterReadings', editedProperty.meterReadings?.filter(r => r.id !== reading.id))} className="text-red-300 hover:text-red-500"><i className="fa-solid fa-trash-can"></i></button></td>
                               </tr>
                            ))}
                            {(!editedProperty.meterReadings || editedProperty.meterReadings.length === 0) && (
                               <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">Noch keine Zählerstände erfasst.</td></tr>
                            )}
                         </tbody>
                      </table>
                   </div>
                </Section>

                <Section title="Einheiten-Management">
                   <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
                      <table className="w-full text-left text-sm">
                         <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            <tr>
                               <th className="px-6 py-4">Bezeichnung</th>
                               <th className="px-6 py-4">Größe (m²)</th>
                               <th className="px-6 py-4">Kaltmiete (€)</th>
                               <th className="px-6 py-4 text-right">Aktion</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y">
                            {editedProperty.units.map(unit => (
                               <tr key={unit.id} className="hover:bg-slate-50/50">
                                  <td className="px-6 py-3">
                                     <input className="bg-transparent font-bold text-slate-700 outline-none" value={unit.number} onChange={e => updateUnit(unit.id, 'number', e.target.value)} />
                                  </td>
                                  <td className="px-6 py-3 font-medium text-slate-500">
                                     <input type="number" className="bg-transparent w-16 outline-none" value={unit.size} onChange={e => updateUnit(unit.id, 'size', parseFloat(e.target.value))} />
                                  </td>
                                  <td className="px-6 py-3 font-medium text-slate-500">
                                     <input type="number" className="bg-transparent w-24 outline-none" value={unit.baseRent} onChange={e => updateUnit(unit.id, 'baseRent', parseFloat(e.target.value))} />
                                  </td>
                                  <td className="px-6 py-3 text-right">
                                     <button onClick={() => handleDeleteUnit(unit.id)} className="text-red-300 hover:text-red-500 transition"><i className="fa-solid fa-trash-can"></i></button>
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                      <button onClick={handleAddUnit} className="w-full py-4 bg-slate-50 text-indigo-600 font-black text-xs uppercase hover:bg-indigo-50 transition border-t">
                         <i className="fa-solid fa-plus mr-2"></i> Neue Einheit hinzufügen
                      </button>
                   </div>
                </Section>
             </div>
          )}

          {/* HAUS-KOSTEN */}
          {activeTab === 'costs' && (
             <div className="animate-in fade-in space-y-6">
                <div className="flex justify-between items-center border-b pb-2">
                  <h3 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">Nebenkostenabrechnungs-Posten</h3>
                  <button onClick={() => setShowAddCostForm(!showAddCostForm)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg">Neu erfassen</button>
                </div>
                {showAddCostForm && (
                  <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 flex items-end space-x-4 animate-in slide-in-from-top-2">
                     <div className="flex-1"><InputField label="Kostenart (z.B. Grundsteuer)" value={newCost.category} onChange={(v: string) => setNewCost({...newCost, category: v})} /></div>
                     <div className="w-32"><InputField label="Betrag p.a. (€)" type="number" value={newCost.amount} onChange={(v: string) => setNewCost({...newCost, amount: v})} /></div>
                     <button onClick={handleAddHouseCost} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black text-xs mb-1">Übernehmen</button>
                  </div>
                )}
                <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr><th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Kostenart</th><th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Betrag (€)</th><th className="px-6 py-4 text-right">Optionen</th></tr>
                    </thead>
                    <tbody className="divide-y">
                      {houseCosts.map(cost => (
                        <tr key={cost.id} className="hover:bg-slate-50 transition">
                          <td className="px-6 py-4 font-bold text-slate-700">{cost.category}</td>
                          <td className="px-6 py-4 font-black text-indigo-600">{cost.amount.toFixed(2)} €</td>
                          <td className="px-6 py-4 text-right"><button onClick={() => setLocalTransactions(prev => prev.filter(t => t.id !== cost.id))} className="text-red-300 hover:text-red-500"><i className="fa-solid fa-trash"></i></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </div>
          )}

          {/* EINHEITEN LISTE */}
          {activeTab === 'units' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in">
              {editedProperty.units.map(unit => (
                <div key={unit.id} onClick={() => { setEditingUnitId(unit.id); setUnitTab('details'); setAiResult(null); }} className="bg-white p-6 rounded-3xl border border-slate-100 hover:border-indigo-300 transition cursor-pointer flex justify-between items-center group shadow-sm">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl"><i className="fa-solid fa-door-open"></i></div>
                    <div><p className="font-bold text-slate-800 text-lg">{unit.number}</p><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{unit.size} m² • {unit.baseRent} € Kalt</p></div>
                  </div>
                  <i className="fa-solid fa-chevron-right text-slate-200 group-hover:text-indigo-500"></i>
                </div>
              ))}
            </div>
          )}
          
          {/* FINANZIERUNG */}
          {activeTab === 'finance' && (
            <div className="space-y-6 animate-in fade-in">
               <div className="flex justify-between items-center">
                  <h3 className="font-black text-slate-800 uppercase tracking-widest text-[10px] border-b pb-1">Kredite & Darlehen</h3>
                  <button onClick={() => setShowAddLoanForm(!showAddLoanForm)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg">Neu anlegen</button>
               </div>
               {showAddLoanForm && (
                 <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in zoom-in-95">
                    <InputField label="Bankname" value={newLoan.bankName} onChange={(v: string) => setNewLoan({...newLoan, bankName: v})} />
                    <InputField label="Restschuld (€)" type="number" value={newLoan.currentBalance || ''} onChange={(v: string) => setNewLoan({...newLoan, currentBalance: parseFloat(v)})} />
                    <InputField label="Rate mtl. (€)" type="number" value={newLoan.monthlyInstallment || ''} onChange={(v: string) => setNewLoan({...newLoan, monthlyInstallment: parseFloat(v)})} />
                    <div className="md:col-span-3 flex justify-end"><button onClick={handleAddLoan} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-black text-xs uppercase">Speichern</button></div>
                 </div>
               )}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {editedProperty.loans?.map(loan => (
                     <div key={loan.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative group flex justify-between">
                        <div>
                           <h4 className="font-bold text-slate-800 mb-2">{loan.bankName}</h4>
                           <p className="text-xs text-slate-500">Restschuld: <strong>{loan.currentBalance.toLocaleString()} €</strong></p>
                        </div>
                        <button onClick={() => updateField('loans', editedProperty.loans?.filter(l => l.id !== loan.id))} className="text-red-200 hover:text-red-500"><i className="fa-solid fa-trash"></i></button>
                     </div>
                  ))}
               </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-white flex justify-end space-x-3 shrink-0">
          <button onClick={onCancel} className="px-6 py-2 text-slate-500 font-bold hover:text-slate-800 transition text-sm">Abbrechen</button>
          <button onClick={() => onSave(editedProperty, localTransactions)} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition">Alle Objekt-Änderungen speichern</button>
        </div>
      </div>

      {/* OVERLAY: EINHEIT-DETAILS */}
      {editingUnit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-6xl h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-indigo-700 p-6 flex justify-between items-center text-white shrink-0">
              <h3 className="text-xl font-black">Einheit: {editingUnit.number}</h3>
              <button onClick={() => setEditingUnitId(null)} className="p-2 hover:bg-white/10 rounded-full transition"><i className="fa-solid fa-xmark text-xl"></i></button>
            </div>

            <div className="bg-slate-100 px-6 py-2 flex space-x-6 border-b shrink-0 overflow-x-auto">
              <UnitTabBtn active={unitTab === 'details'} onClick={() => setUnitTab('details')} label="Basisdaten" icon="fa-info-circle" />
              <UnitTabBtn active={unitTab === 'docs'} onClick={() => setUnitTab('docs')} label="Dokumente" icon="fa-file-shield" />
              <UnitTabBtn active={unitTab === 'utility'} onClick={() => setUnitTab('utility')} label="Nebenkosten" icon="fa-calculator" />
            </div>

            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
              {/* EINHEIT: BASISDATEN */}
              {unitTab === 'details' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-in fade-in">
                  <Section title="Eigenschaften der Einheit">
                    <InputField label="Nummer / Bezeichnung" value={editingUnit.number} onChange={(v: string) => updateUnit(editingUnit.id, 'number', v)} />
                    <InputField label="Wohnfläche (m²)" type="number" value={editingUnit.size || 0} onChange={(v: string) => updateUnit(editingUnit.id, 'size', parseFloat(v))} />
                    <InputField label="Kaltmiete monatlich (€)" type="number" value={editingUnit.baseRent || 0} onChange={(v: string) => updateUnit(editingUnit.id, 'baseRent', parseFloat(v))} />
                    <InputField label="Nebenkosten-Vorschuss (€)" type="number" value={editingUnit.utilityPrepayment || 0} onChange={(v: string) => updateUnit(editingUnit.id, 'utilityPrepayment', parseFloat(v))} />
                  </Section>
                  <Section title="Mieter-Zuweisung">
                    <p className="text-xs text-slate-500 mb-4 font-medium">Weisen Sie einen Mieter aus Ihrer Kontaktliste dieser Einheit zu:</p>
                    <select 
                      className="w-full border border-slate-200 p-3 rounded-xl bg-white font-bold text-slate-700 shadow-sm"
                      value={editingUnit.tenantId || ''}
                      onChange={(e) => updateUnit(editingUnit.id, 'tenantId', e.target.value)}
                    >
                      <option value="">Kein Mieter zugewiesen</option>
                      {tenants.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                    </select>
                    {assignedTenant && (
                       <div className="mt-4 p-5 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center space-x-4">
                          <div className="h-10 w-10 bg-indigo-200 text-indigo-700 rounded-full flex items-center justify-center font-black">{assignedTenant.firstName[0]}{assignedTenant.lastName[0]}</div>
                          <div>
                             <p className="text-sm font-bold text-indigo-900">{assignedTenant.firstName} {assignedTenant.lastName}</p>
                             <p className="text-[10px] text-indigo-700 uppercase font-black">{assignedTenant.email}</p>
                          </div>
                       </div>
                    )}
                  </Section>
                </div>
              )}

              {/* EINHEIT: DOKUMENTE */}
              {unitTab === 'docs' && (
                <div className="space-y-6 animate-in fade-in">
                  <Section title="Mietverträge & Fotos">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      {editingUnit.documents?.map(doc => (
                        <div key={doc.id} className="relative group bg-white border rounded-2xl overflow-hidden shadow-sm aspect-square flex flex-col items-center justify-center p-2">
                          {doc.category === 'Foto' ? <img src={doc.fileData} className="w-full h-full object-cover rounded-xl" /> : <div className="text-indigo-500 text-3xl mb-1"><i className="fa-solid fa-file-pdf"></i></div>}
                          <p className="text-[10px] font-bold text-slate-500 truncate w-full text-center mt-1 px-2">{doc.name}</p>
                          <button onClick={() => updateUnit(editingUnit.id, 'documents', editingUnit.documents?.filter(d => d.id !== doc.id))} className="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-lg"><i className="fa-solid fa-times text-xs"></i></button>
                        </div>
                      ))}
                      <label className="border-2 border-dashed border-slate-200 rounded-2xl aspect-square flex flex-col items-center justify-center text-slate-300 hover:border-indigo-400 cursor-pointer transition bg-white shadow-sm">
                         <input type="file" className="hidden" onChange={e => handleFileUpload(e, 'unit', editingUnit.id)} />
                         <i className="fa-solid fa-cloud-arrow-up text-2xl mb-1"></i>
                         <span className="text-[10px] font-bold uppercase tracking-widest">Upload</span>
                      </label>
                    </div>
                  </Section>
                </div>
              )}

              {/* EINHEIT: NEBENKOSTEN */}
              {unitTab === 'utility' && (
                <div className="space-y-8 animate-in fade-in">
                  <div className="flex justify-between items-center bg-emerald-600 p-8 rounded-3xl text-white shadow-xl">
                    <div><p className="text-[10px] font-black uppercase opacity-80 tracking-widest mb-1">Saldo Abrechnung 2023</p><h4 className="text-4xl font-black">{balance.toFixed(2)} €</h4></div>
                    <div className="text-right">
                       <p className="text-[10px] font-black uppercase opacity-80 tracking-widest mb-1">Status</p>
                       <span className={`text-xl font-bold px-5 py-1.5 rounded-full ${balance > 0 ? 'bg-amber-400 text-amber-900' : 'bg-emerald-400 text-emerald-900'}`}>{balance > 0 ? 'Nachzahlung' : 'Guthaben'}</span>
                    </div>
                  </div>

                  <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
                    <div className="bg-slate-50 p-4 border-b flex justify-between items-center">
                       <h3 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">Hauskostenaufteilung (Verteilerschlüssel: m²)</h3>
                    </div>
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase">
                        <tr><th className="px-6 py-4">Kostenart</th><th className="px-6 py-4">Haus Gesamt (€)</th><th className="px-6 py-4">Verteiler</th><th className="px-6 py-4">Anteil Einheit (€)</th></tr>
                      </thead>
                      <tbody className="divide-y">
                        {editableBreakdown.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50 transition group">
                            <td className="px-6 py-4 font-bold text-slate-700">{item.category}</td>
                            <td className="px-6 py-4">
                               <input type="number" className="w-24 border-b border-transparent group-hover:border-indigo-200 bg-transparent p-1 font-bold text-indigo-600" value={item.total} onChange={(e: any) => updateBreakdownItem(item.id, 'total', parseFloat(e.target.value))} />
                            </td>
                            <td className="px-6 py-4 text-slate-400 text-[10px] font-medium">{item.key}</td>
                            <td className="px-6 py-4 font-black text-emerald-600">{item.share.toFixed(2)} €</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col items-center space-y-4">
                    <div className="flex space-x-4">
                       <button onClick={handleGenerateUtilityStatementAI} disabled={isGenerating || !assignedTenant} className="bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black shadow-2xl hover:bg-indigo-700 transition flex items-center space-x-3 text-lg">
                          {isGenerating ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>}
                          <span>Mit KI generieren</span>
                       </button>
                       <button onClick={generateManualStatement} disabled={isGenerating || !assignedTenant} className="bg-emerald-600 text-white px-10 py-5 rounded-2xl font-black shadow-2xl hover:bg-emerald-700 transition flex items-center space-x-3 text-lg">
                          <i className="fa-solid fa-file-pen"></i>
                          <span>Standard-Entwurf (ohne KI)</span>
                       </button>
                    </div>
                    {!assignedTenant && <p className="text-red-500 text-xs font-bold uppercase tracking-widest">Zuerst Mieter zuweisen!</p>}
                  </div>

                  {aiResult && (
                    <div className="bg-slate-900 text-slate-100 p-8 rounded-3xl animate-in zoom-in-95 shadow-2xl">
                       <h3 className="font-black text-indigo-400 uppercase tracking-widest text-[10px] mb-4">Ergebnis der Abrechnung</h3>
                       <div className="whitespace-pre-wrap text-sm leading-relaxed font-medium max-h-[500px] overflow-y-auto custom-scrollbar border border-white/10 p-8 rounded-2xl bg-white/5 mb-8">
                          {aiResult}
                       </div>
                       <div className="flex flex-wrap gap-4 border-t border-white/10 pt-8">
                          <button className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold text-xs shadow-lg hover:bg-indigo-700 flex items-center" onClick={() => window.print()}><i className="fa-solid fa-print mr-2"></i> Drucken</button>
                          <button className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold text-xs shadow-lg hover:bg-emerald-700 flex items-center" onClick={exportToExcelCSV}><i className="fa-solid fa-file-excel mr-2"></i> Excel/CSV Export (Brief + Tabelle)</button>
                          <button className="bg-slate-800 text-slate-400 px-8 py-3 rounded-xl font-bold text-xs ml-auto" onClick={() => setAiResult(null)}>Schließen</button>
                       </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t flex justify-end">
              <button onClick={() => setEditingUnitId(null)} className="bg-indigo-600 text-white px-12 py-3 rounded-2xl font-black shadow-xl">Zurück</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TabButton = ({ active, onClick, label, icon }: any) => (
  <button onClick={onClick} className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center space-x-2 ${active ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500'}`}><i className={`fa-solid ${icon}`}></i><span>{label}</span></button>
);

const UnitTabBtn = ({ active, onClick, label, icon }: any) => (
  <button onClick={onClick} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center space-x-2 border-b-2 border-transparent ${active ? 'text-indigo-600 border-indigo-600 bg-indigo-50/50' : 'text-slate-500'}`}><i className={`fa-solid ${icon}`}></i><span>{label}</span></button>
);

const Section = ({ title, children }: any) => (
  <div className="space-y-4"><h3 className="font-black text-slate-800 uppercase tracking-widest text-[10px] border-b pb-1">{title}</h3><div className="space-y-4">{children}</div></div>
);

const InputField = ({ label, value, onChange, type = "text" }: any) => (
  <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">{label}</label><input type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full border border-slate-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-slate-700 text-sm shadow-sm" /></div>
);

export default PropertyEditor;
