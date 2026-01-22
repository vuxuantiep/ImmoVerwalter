
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
  
  // State für "Neue Haus-Kosten" Formular
  const [showAddCostForm, setShowAddCostForm] = useState(false);
  const [newCost, setNewCost] = useState({ category: '', amount: '' });

  // State für Zählerstände in der Einheit
  const [newMeter, setNewMeter] = useState({ type: MeterType.ELECTRICITY, value: '', date: new Date().toISOString().split('T')[0] });

  // State für die editierbare Abrechnungstabelle (Einheit)
  const [editableBreakdown, setEditableBreakdown] = useState<EditableBreakdownItem[]>([]);

  // Hilfsfunktion: Berechnet alle für das Objekt relevanten Hauskosten
  const houseCosts = localTransactions.filter(t => t.propertyId === editedProperty.id && t.isUtilityRelevant);

  const updateField = (field: keyof Property, value: any) => {
    setEditedProperty(prev => ({ ...prev, [field]: value }));
  };

  const updateUnit = (id: string, field: keyof Unit, value: any) => {
    setEditedProperty(prev => ({
      ...prev,
      units: prev.units.map(u => u.id === id ? { ...u, [field]: value } : u)
    }));
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
      description: `Manuelle Erfassung: ${newCost.category}`,
      isUtilityRelevant: true
    };
    setLocalTransactions(prev => [...prev, t]);
    setNewCost({ category: '', amount: '' });
    setShowAddCostForm(false);
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

  const handleAddMeterReading = (unitId: string) => {
    if (!newMeter.value) return;
    const reading: MeterReading = {
      id: Math.random().toString(36).substr(2, 9),
      type: newMeter.type,
      value: parseFloat(newMeter.value),
      unit: newMeter.type === MeterType.ELECTRICITY ? 'kWh' : 'm³',
      date: newMeter.date
    };
    setEditedProperty(prev => ({
      ...prev,
      units: prev.units.map(u => u.id === unitId ? { ...u, meterReadings: [...(u.meterReadings || []), reading] } : u)
    }));
    setNewMeter({ ...newMeter, value: '' });
  };

  const handleGenerateUnitExpose = async (unit: Unit) => {
    setIsGenerating(true);
    setAiResult(null);
    const result = await generateUnitExpose(unit, editedProperty);
    setAiResult(result);
    setIsGenerating(false);
  };

  const editingUnit = editedProperty.units.find(u => u.id === editingUnitId);
  const assignedTenant = tenants.find(t => t?.id === editingUnit?.tenantId);
  const totalLivingSpace = editedProperty.units.reduce((sum, u) => sum + u.size, 0);

  // Initialisierung der Abrechnungs-Tabelle für eine Einheit
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

  const handleGenerateUtilityStatement = async () => {
    if (!assignedTenant || !editingUnit) return;
    setIsGenerating(true);
    setAiResult(null);
    const result = await generateUtilityStatementLetter(
      assignedTenant, 
      editedProperty, 
      "2023", 
      editableBreakdown.reduce((sum, i) => sum + i.total, 0), 
      currentUnitShare, 
      unitPrepaymentYear, 
      balance, 
      editableBreakdown
    );
    setAiResult(result);
    setIsGenerating(false);
  };

  const handleGenerateLetter = async () => {
    if (!assignedTenant) return alert('Kein Mieter zugewiesen.');
    setIsGenerating(true);
    setAiResult(null);
    const template = templates.find(t => t.id === selectedTemplateId);
    const result = await generateTenantLetter(assignedTenant, editedProperty, template?.name || 'Mitteilung', letterContext);
    setAiResult(result);
    setIsGenerating(false);
  };

  const exportToExcelCSV = () => {
    if (editableBreakdown.length === 0) return;
    
    const headers = ['Kostenart', 'Haus Gesamt (€)', 'Verteiler (m²)', 'Anteil Einheit (€)'];
    const rows = editableBreakdown.map(item => [
      item.category,
      item.total.toFixed(2),
      item.key,
      item.share.toFixed(2)
    ]);
    
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Abrechnung_${editingUnit?.number || 'Einheit'}_2023.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-indigo-600 p-6 flex justify-between items-center text-white shrink-0">
          <div>
            <h2 className="text-2xl font-black">{editedProperty.name || 'Neues Objekt'}</h2>
            <p className="text-indigo-100 text-sm opacity-80 uppercase tracking-widest font-bold">Objekt-Verwaltung</p>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition"><i className="fa-solid fa-xmark text-xl"></i></button>
        </div>

        {/* Main Tabs */}
        <div className="bg-slate-50 border-b px-6 py-2 flex space-x-4 shrink-0 overflow-x-auto scrollbar-hide">
          <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')} label="Stammdaten" icon="fa-house-user" />
          <TabButton active={activeTab === 'costs'} onClick={() => setActiveTab('costs')} label="Haus-Kosten" icon="fa-file-invoice-dollar" />
          <TabButton active={activeTab === 'units'} onClick={() => setActiveTab('units')} label="Einheiten" icon="fa-door-open" />
          <TabButton active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} label="Finanzierung" icon="fa-sack-dollar" />
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {/* TAB: STAMMDATEN */}
          {activeTab === 'general' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in">
                <Section title="Basis-Daten">
                   <InputField label="Name" value={editedProperty.name} onChange={(v: string) => updateField('name', v)} />
                   <InputField label="Adresse" value={editedProperty.address} onChange={(v: string) => updateField('address', v)} />
                   <div className="grid grid-cols-2 gap-4">
                     <InputField label="Kaufpreis" type="number" value={editedProperty.purchasePrice || ''} onChange={(v: string) => updateField('purchasePrice', parseFloat(v))} />
                     <InputField label="Baujahr" type="number" value={editedProperty.yearBuilt || ''} onChange={(v: string) => updateField('yearBuilt', parseInt(v))} />
                   </div>
                </Section>
                <Section title="Eigentümer & Dokumente">
                   <select className="w-full border p-3 rounded-xl bg-white font-bold mb-4" value={editedProperty.ownerId || ''} onChange={e => updateField('ownerId', e.target.value)}>
                      <option value="">Kein Eigentümer</option>
                      {owners.map(o => <option key={o.id} value={o.id}>{o.company || o.name}</option>)}
                   </select>
                   <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-indigo-400 cursor-pointer relative">
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleFileUpload(e, 'property')} />
                      <i className="fa-solid fa-folder-plus text-2xl text-slate-300"></i>
                      <p className="text-[10px] font-bold text-slate-500 uppercase mt-2">Zentrales Dokument hochladen</p>
                   </div>
                </Section>
             </div>
          )}

          {/* TAB: HAUS-KOSTEN (Zentrale Pflege) */}
          {activeTab === 'costs' && (
             <div className="animate-in fade-in space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Abrechnungsrelevante Hauskosten</h3>
                  <button onClick={() => setShowAddCostForm(!showAddCostForm)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg hover:bg-indigo-700 transition">
                    <i className="fa-solid fa-plus mr-2"></i> Kostenposition hinzufügen
                  </button>
                </div>

                {showAddCostForm && (
                  <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 flex items-end space-x-4 animate-in slide-in-from-top-2">
                     <div className="flex-1"><InputField label="Bezeichnung (z.B. Grundsteuer)" value={newCost.category} onChange={(v: string) => setNewCost({...newCost, category: v})} /></div>
                     <div className="w-32"><InputField label="Betrag (€)" type="number" value={newCost.amount} onChange={(v: string) => setNewCost({...newCost, amount: v})} /></div>
                     <button onClick={handleAddHouseCost} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black text-sm mb-1 shadow-lg">Hinzufügen</button>
                     <button onClick={() => setShowAddCostForm(false)} className="text-slate-400 font-bold px-2 py-2.5 mb-1">Abbrechen</button>
                  </div>
                )}
                
                <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Bezeichnung</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Betrag (p.a.)</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Umlegbar</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-right">Aktion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {houseCosts.map(cost => (
                        <tr key={cost.id} className="hover:bg-slate-50 transition">
                          <td className="px-6 py-4 font-bold text-slate-700">{cost.category}</td>
                          <td className="px-6 py-4 font-black text-indigo-600">{cost.amount.toFixed(2)} €</td>
                          <td className="px-6 py-4">
                             <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-[10px] font-black uppercase">Ja</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <button onClick={() => setLocalTransactions(prev => prev.filter(t => t.id !== cost.id))} className="text-slate-300 hover:text-red-500 transition"><i className="fa-solid fa-trash"></i></button>
                          </td>
                        </tr>
                      ))}
                      {houseCosts.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-10 text-center text-slate-400 italic">Noch keine Nebenkosten für dieses Haus erfasst.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
             </div>
          )}

          {/* TAB: EINHEITEN (Liste) */}
          {activeTab === 'units' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in">
              {editedProperty.units.map(unit => (
                <div key={unit.id} onClick={() => { setEditingUnitId(unit.id); setUnitTab('details'); setAiResult(null); }} className="bg-white p-4 rounded-2xl border border-slate-100 hover:border-indigo-300 transition cursor-pointer flex justify-between items-center group shadow-sm">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><i className="fa-solid fa-door-open"></i></div>
                    <div><p className="font-bold text-slate-800">{unit.number}</p><p className="text-[10px] text-slate-400 font-bold uppercase">{unit.size} m²</p></div>
                  </div>
                  <i className="fa-solid fa-chevron-right text-slate-200 group-hover:text-indigo-500 transition"></i>
                </div>
              ))}
            </div>
          )}

          {/* TAB: FINANZEN */}
          {activeTab === 'finance' && (
             <div className="space-y-6 animate-in fade-in">
                <Section title="Darlehen & Finanzierung">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {editedProperty.loans?.map(loan => (
                        <div key={loan.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative">
                           <p className="font-bold text-slate-800">{loan.bankName}</p>
                           <p className="text-[10px] text-slate-400 font-bold uppercase">Restschuld: {loan.currentBalance.toLocaleString()} €</p>
                        </div>
                      ))}
                   </div>
                </Section>
             </div>
          )}
        </div>

        <div className="p-6 border-t bg-slate-50 flex justify-end space-x-3 shrink-0">
          <button onClick={onCancel} className="px-6 py-2 text-slate-500 font-bold">Abbrechen</button>
          <button onClick={() => onSave(editedProperty, localTransactions)} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black shadow-xl">Speichern</button>
        </div>
      </div>

      {/* OVERLAY: EINHEITEN-DETAILS (WIEDERHERGESTELLTE VOLLVERSION) */}
      {editingUnit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-6xl h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-indigo-700 p-6 flex justify-between items-center text-white shrink-0">
              <h3 className="text-xl font-black">Einheit: {editingUnit.number}</h3>
              <button onClick={() => setEditingUnitId(null)} className="p-2 hover:bg-white/10 rounded-full transition"><i className="fa-solid fa-xmark text-xl"></i></button>
            </div>

            <div className="bg-slate-100 px-6 py-2 flex space-x-6 border-b shrink-0 overflow-x-auto">
              <UnitTabBtn active={unitTab === 'details'} onClick={() => setUnitTab('details')} label="Daten" icon="fa-info-circle" />
              <UnitTabBtn active={unitTab === 'docs'} onClick={() => setUnitTab('docs')} label="Dokumente" icon="fa-file-shield" />
              <UnitTabBtn active={unitTab === 'communication'} onClick={() => setUnitTab('communication')} label="Kommunikation" icon="fa-envelope" />
              <UnitTabBtn active={unitTab === 'utility'} onClick={() => setUnitTab('utility')} label="Nebenkosten" icon="fa-calculator" />
            </div>

            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
              {/* EINHEIT: DATEN REITER */}
              {unitTab === 'details' && (
                <div className="space-y-8 animate-in fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Spalte 1: Konditionen */}
                    <Section title="Grundkonditionen">
                       <InputField label="Bezeichnung" value={editingUnit.number} onChange={(v: string) => updateUnit(editingUnit.id, 'number', v)} />
                       <InputField label="Größe (m²)" type="number" value={editingUnit.size} onChange={(v: string) => updateUnit(editingUnit.id, 'size', parseFloat(v))} />
                       <InputField label="Kaltmiete (€)" type="number" value={editingUnit.baseRent} onChange={(v: string) => updateUnit(editingUnit.id, 'baseRent', parseFloat(v))} />
                       <InputField label="NK-Vorauszahlung (€)" type="number" value={editingUnit.utilityPrepayment} onChange={(v: string) => updateUnit(editingUnit.id, 'utilityPrepayment', parseFloat(v))} />
                    </Section>

                    {/* Spalte 2: Mieter & KI-Exposé */}
                    <Section title="Vermarktung & Mieter">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Aktueller Mieter</label>
                        <select className="w-full border p-3 rounded-xl bg-white font-bold mb-6" value={editingUnit.tenantId || ''} onChange={(e: any) => updateUnit(editingUnit.id, 'tenantId', e.target.value)}>
                          <option value="">-- Leerstand --</option>
                          {tenants.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                        </select>

                        <div className="bg-violet-50 p-6 rounded-3xl border border-violet-100">
                           <h4 className="text-xs font-black text-violet-800 uppercase tracking-widest mb-2 flex items-center">
                              <i className="fa-solid fa-wand-magic-sparkles mr-2"></i> Einheiten-Exposé
                           </h4>
                           <p className="text-[10px] text-violet-600 font-medium mb-4">Generiere automatisch ein Inserat für diese Einheit.</p>
                           <button 
                             onClick={() => handleGenerateUnitExpose(editingUnit)} 
                             disabled={isGenerating}
                             className="w-full bg-violet-600 text-white py-3 rounded-2xl font-black shadow-lg hover:bg-violet-700 transition"
                           >
                             {isGenerating ? <i className="fa-solid fa-spinner fa-spin"></i> : "KI Exposé erstellen"}
                           </button>
                        </div>
                    </Section>

                    {/* Spalte 3: Fotos */}
                    <Section title="Wohnungs-Fotos">
                       <div className="grid grid-cols-2 gap-2 mb-4">
                          {editingUnit.documents?.filter(d => d.category === 'Foto').map(img => (
                            <div key={img.id} className="aspect-square rounded-xl overflow-hidden border relative group">
                               <img src={img.fileData} className="w-full h-full object-cover" />
                               <button 
                                 onClick={() => updateUnit(editingUnit.id, 'documents', editingUnit.documents?.filter(d => d.id !== img.id))}
                                 className="absolute inset-0 bg-red-600/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                               >
                                 <i className="fa-solid fa-trash"></i>
                               </button>
                            </div>
                          ))}
                          <label className="aspect-square border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-300 hover:border-indigo-400 cursor-pointer transition">
                             <input type="file" className="hidden" accept="image/*" onChange={(e: any) => handleFileUpload(e, 'unit', editingUnit.id)} />
                             <i className="fa-solid fa-camera text-xl"></i>
                          </label>
                       </div>
                    </Section>
                  </div>
                </div>
              )}

              {/* EINHEIT: KOMMUNIKATION REITER (WIEDERHERGESTELLT) */}
              {unitTab === 'communication' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Section title="Brief-Entwurf erstellen">
                       <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Vorlage wählen</label>
                       <div className="grid grid-cols-2 gap-2 mb-4">
                          {templates.map(t => (
                            <button 
                              key={t.id} 
                              onClick={() => setSelectedTemplateId(t.id)}
                              className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center ${selectedTemplateId === t.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                            >
                              <i className="fa-solid fa-file-lines mb-1 text-lg"></i>
                              <span>{t.name}</span>
                            </button>
                          ))}
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Zusätzlicher Kontext / Notizen für die KI</label>
                          <textarea 
                            className="w-full border rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none min-h-[120px]"
                            placeholder="z.B. Mieterhöhung um 15€ wegen neuem Mietspiegel ab 01.10..."
                            value={letterContext}
                            onChange={(e) => setLetterContext(e.target.value)}
                          />
                       </div>
                       <button 
                         onClick={handleGenerateLetter}
                         disabled={isGenerating || !assignedTenant}
                         className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition flex items-center justify-center space-x-2"
                       >
                         {isGenerating ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>}
                         <span>KI-Entwurf generieren</span>
                       </button>
                    </Section>

                    <Section title="Vorschau & Aktionen">
                       {aiResult ? (
                         <div className="space-y-4 animate-in zoom-in-95">
                            <div className="bg-slate-900 text-slate-100 p-6 rounded-3xl border shadow-inner max-h-[400px] overflow-y-auto custom-scrollbar whitespace-pre-wrap text-xs leading-relaxed font-medium">
                               {aiResult}
                            </div>
                            <button 
                              onClick={() => {
                                const subject = aiResult.split('\n')[0].replace('Betreff:', '').trim();
                                const body = aiResult;
                                window.location.href = `mailto:${assignedTenant?.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                              }}
                              className="w-full bg-slate-100 text-slate-700 py-3 rounded-2xl font-black hover:bg-slate-200 transition flex items-center justify-center space-x-2"
                            >
                               <i className="fa-solid fa-paper-plane"></i>
                               <span>In Mail-Client öffnen</span>
                            </button>
                         </div>
                       ) : (
                         <div className="h-full min-h-[300px] border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center text-slate-300">
                            <i className="fa-solid fa-envelope-open-text text-4xl mb-4 opacity-20"></i>
                            <p className="text-xs font-bold uppercase tracking-widest">Noch kein Entwurf erstellt</p>
                         </div>
                       )}
                    </Section>
                  </div>
                </div>
              )}

              {/* NEBENKOSTEN REITER (FUNKTIONALE ABRECHNUNG) */}
              {unitTab === 'utility' && (
                <div className="space-y-8 animate-in fade-in">
                  <div className="flex justify-between items-center bg-emerald-600 p-6 rounded-3xl text-white shadow-xl">
                    <div><p className="text-[10px] font-black uppercase tracking-widest opacity-80">Saldo Abrechnung 2023</p><h4 className="text-3xl font-black">{balance.toFixed(2)} €</h4></div>
                    <div className="text-right">
                       <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Status</p>
                       <span className={`text-lg font-bold px-4 py-1 rounded-full ${balance > 0 ? 'bg-amber-400' : 'bg-emerald-400'}`}>{balance > 0 ? 'Nachzahlung' : 'Guthaben'}</span>
                    </div>
                  </div>

                  <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
                    <div className="bg-slate-50 p-4 border-b flex justify-between items-center">
                       <h3 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">Interaktive Abrechnungs-Tabelle</h3>
                       <button onClick={exportToExcelCSV} className="bg-white border px-4 py-1.5 rounded-xl text-[10px] font-black uppercase text-indigo-600 hover:bg-indigo-50 flex items-center space-x-2">
                          <i className="fa-solid fa-file-excel"></i><span>Excel/CSV Export</span>
                       </button>
                    </div>
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase">
                        <tr>
                          <th className="px-6 py-4">Kostenart</th>
                          <th className="px-6 py-4">Haus Gesamt (€)</th>
                          <th className="px-6 py-4">Verteiler (m²)</th>
                          <th className="px-6 py-4">Anteil Einheit (€)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {editableBreakdown.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50 transition group">
                            <td className="px-6 py-3 font-bold text-slate-700">{item.category}</td>
                            <td className="px-6 py-3">
                               <input type="number" className="w-24 border-b border-transparent group-hover:border-indigo-200 bg-transparent p-1 font-bold text-indigo-600" value={item.total} onChange={(e: any) => updateBreakdownItem(item.id, 'total', parseFloat(e.target.value))} />
                            </td>
                            <td className="px-6 py-3 text-slate-500 text-xs italic">{item.key}</td>
                            <td className="px-6 py-3">
                               <input type="number" className="w-24 border-b border-transparent group-hover:border-emerald-200 bg-transparent p-1 font-black text-emerald-600" value={item.share} onChange={(e: any) => updateBreakdownItem(item.id, 'share', parseFloat(e.target.value))} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-3xl border flex flex-col items-center">
                     <button 
                       onClick={handleGenerateUtilityStatement} 
                       disabled={isGenerating || !assignedTenant} 
                       className="bg-emerald-600 text-white px-12 py-5 rounded-2xl font-black shadow-2xl hover:bg-emerald-700 transition flex items-center space-x-3 text-lg"
                     >
                       {isGenerating ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>}
                       <span>Komplette Abrechnung inkl. KI-Brief generieren</span>
                     </button>
                  </div>

                  {aiResult && (
                    <div className="bg-slate-900 text-slate-100 p-8 rounded-3xl animate-in zoom-in-95">
                       <h3 className="font-black text-indigo-400 uppercase tracking-widest text-xs mb-4">Vorschau Betriebskostenabrechnung</h3>
                       <div className="whitespace-pre-wrap text-sm leading-relaxed font-medium max-h-[500px] overflow-y-auto custom-scrollbar">
                          {aiResult}
                       </div>
                       <div className="mt-6 flex space-x-3">
                          <button className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-xs" onClick={() => window.print()}>Abrechnung drucken / PDF</button>
                          <button className="bg-slate-800 text-slate-400 px-6 py-3 rounded-xl font-bold text-xs" onClick={() => setAiResult(null)}>Schließen</button>
                       </div>
                    </div>
                  )}
                </div>
              )}

              {/* ZÄHLERSTÄNDE BEREICH (innerhalb Details) */}
              {unitTab === 'details' && (
                <div className="mt-12 bg-white border rounded-3xl overflow-hidden shadow-sm">
                   <div className="bg-slate-50 p-4 border-b">
                      <h3 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">Zählerstände & Ablesungen</h3>
                   </div>
                   <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                         <select className="border p-2.5 rounded-xl font-bold" value={newMeter.type} onChange={(e: any) => setNewMeter({...newMeter, type: e.target.value as MeterType})}>
                            {Object.values(MeterType).map(t => <option key={t} value={t}>{t}</option>)}
                         </select>
                         <input type="number" className="border p-2.5 rounded-xl font-black" placeholder="Zählerstand" value={newMeter.value} onChange={(e: any) => setNewMeter({...newMeter, value: e.target.value})} />
                         <input type="date" className="border p-2.5 rounded-xl font-bold" value={newMeter.date} onChange={(e: any) => setNewMeter({...newMeter, date: e.target.value})} />
                         <button onClick={() => handleAddMeterReading(editingUnit.id)} className="bg-indigo-600 text-white rounded-xl font-black px-4 hover:bg-indigo-700 transition shadow-md">Eintragen</button>
                      </div>

                      <div className="space-y-2">
                         {editingUnit.meterReadings?.slice().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(r => (
                           <div key={r.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <div className="flex items-center space-x-3">
                                 <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black text-white ${r.type === MeterType.ELECTRICITY ? 'bg-amber-400' : r.type === MeterType.GAS ? 'bg-orange-500' : 'bg-blue-500'}`}>
                                    {r.type[0]}
                                 </span>
                                 <div>
                                    <p className="text-xs font-black text-slate-700">{r.value} {r.unit}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">{r.date}</p>
                                 </div>
                              </div>
                              <button onClick={() => updateUnit(editingUnit.id, 'meterReadings', editingUnit.meterReadings?.filter(mr => mr.id !== r.id))} className="text-red-300 hover:text-red-500"><i className="fa-solid fa-trash-can"></i></button>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t flex justify-end">
              <button onClick={() => setEditingUnitId(null)} className="bg-indigo-600 text-white px-12 py-3 rounded-2xl font-black shadow-xl">Schließen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TabButton = ({ active, onClick, label, icon }: any) => (
  <button onClick={onClick} className={`px-4 py-3 rounded-xl text-sm font-bold transition flex items-center space-x-2 whitespace-nowrap ${active ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}>
    <i className={`fa-solid ${icon}`}></i>
    <span>{label}</span>
  </button>
);

const UnitTabBtn = ({ active, onClick, label, icon }: any) => (
  <button onClick={onClick} className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 border-b-2 border-transparent ${active ? 'text-indigo-600 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:text-slate-700'}`}>
    <i className={`fa-solid ${icon}`}></i>
    <span>{label}</span>
  </button>
);

const Section = ({ title, children }: any) => (
  <div className="space-y-4">
    <h3 className="font-black text-slate-800 uppercase tracking-widest text-[10px] border-b pb-1">{title}</h3>
    <div className="space-y-4">{children}</div>
  </div>
);

const InputField = ({ label, value, onChange, type = "text" }: any) => (
  <div className="space-y-1">
    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-wider">{label}</label>
    <input 
      type={type} 
      value={value} 
      onChange={e => onChange(e.target.value)}
      className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-slate-700 transition"
    />
  </div>
);

export default PropertyEditor;
