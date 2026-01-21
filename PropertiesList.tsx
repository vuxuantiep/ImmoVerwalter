
import React, { useState } from 'react';
import { Property, HouseType, PropertyDocument, ContractAnalysis, View } from './types.ts';
import { analyzeContract } from './geminiService.ts';

interface PropertiesListProps {
  properties: Property[];
  setProperties: React.Dispatch<React.SetStateAction<Property[]>>;
  onGenerateExpose?: (propertyId: string) => void;
  setView?: (view: View, params?: any) => void;
}

const PropertiesList: React.FC<PropertiesListProps> = ({ properties, setProperties, onGenerateExpose, setView }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [selectedPropId, setSelectedPropId] = useState<string | null>(null);
  const [newProp, setNewProp] = useState({ name: '', address: '', type: HouseType.APARTMENT_BLOCK });
  const [analyzingDocId, setAnalyzingDocId] = useState<string | null>(null);
  const [showAnalysisId, setShowAnalysisId] = useState<string | null>(null);

  const addProperty = () => {
    if (!newProp.name || !newProp.address) return;
    const p: Property = {
      id: Math.random().toString(36).substr(2, 9),
      ...newProp,
      units: [],
      documents: [],
      meterReadings: []
    };
    setProperties([...properties, p]);
    setShowAdd(false);
    setNewProp({ name: '', address: '', type: HouseType.APARTMENT_BLOCK });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, propertyId: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Data = e.target?.result as string;
      const newDoc: PropertyDocument = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        category: 'Dokument',
        uploadDate: new Date().toLocaleDateString('de-DE'),
        fileSize: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        fileData: base64Data,
        mimeType: file.type
      };

      setProperties(prev => prev.map(p => 
        p.id === propertyId 
          ? { ...p, documents: [...(p.documents || []), newDoc] } 
          : p
      ));
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeDocument = async (propertyId: string, doc: PropertyDocument) => {
    if (doc.analysis) {
      setShowAnalysisId(doc.id);
      return;
    }

    setAnalyzingDocId(doc.id);
    const analysis = await analyzeContract(doc.fileData, doc.mimeType);
    
    if (analysis) {
      setProperties(prev => prev.map(p => 
        p.id === propertyId 
          ? { 
              ...p, 
              documents: p.documents?.map(d => 
                d.id === doc.id ? { ...d, analysis } : d
              ) 
            } 
          : p
      ));
      setShowAnalysisId(doc.id);
    } else {
      alert("Analyse fehlgeschlagen. Bitte versuchen Sie es erneut.");
    }
    setAnalyzingDocId(null);
  };

  const downloadDocument = (doc: PropertyDocument) => {
    const link = document.createElement('a');
    link.href = doc.fileData;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deleteDocument = (propertyId: string, docId: string) => {
    setProperties(prev => prev.map(p => 
      p.id === propertyId 
        ? { ...p, documents: (p.documents || []).filter(d => d.id !== docId) } 
        : p
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">Ihre Immobilien ({properties.length})</h2>
        <button 
          onClick={() => setShowAdd(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center transition"
        >
          <i className="fa-solid fa-plus mr-2"></i> Neues Objekt
        </button>
      </div>

      {showAdd && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="font-bold text-lg mb-4 text-slate-800">Immobilie hinzufügen</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input 
              className="border border-slate-200 p-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
              placeholder="Name des Objekts"
              value={newProp.name}
              onChange={e => setNewProp({...newProp, name: e.target.value})}
            />
            <input 
              className="border border-slate-200 p-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
              placeholder="Adresse"
              value={newProp.address}
              onChange={e => setNewProp({...newProp, address: e.target.value})}
            />
            <select 
              className="border border-slate-200 p-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              value={newProp.type}
              onChange={e => setNewProp({...newProp, type: e.target.value as HouseType})}
            >
              {Object.values(HouseType).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="mt-4 flex space-x-3">
            <button onClick={addProperty} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-medium shadow-lg shadow-indigo-200">Speichern</button>
            <button onClick={() => setShowAdd(false)} className="text-slate-500 hover:text-slate-700 px-4 py-2">Abbrechen</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {properties.map(p => (
          <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition">
            <div className="flex flex-col md:flex-row">
              <div className="md:w-1/3 h-48 md:h-auto bg-slate-200 relative">
                <img src={`https://picsum.photos/seed/${p.id}/600/400`} alt={p.name} className="w-full h-full object-cover opacity-90" />
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-indigo-600 uppercase">
                  {p.type}
                </div>
              </div>
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-1">{p.name}</h3>
                    <p className="text-slate-500 flex items-center text-sm mb-4">
                      <i className="fa-solid fa-location-dot mr-2 text-slate-400"></i> {p.address}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setView && setView('tools', { tab: 'market', propertyId: p.id })} className="px-4 py-2 rounded-xl text-sm font-bold bg-violet-50 text-violet-700 hover:bg-violet-100 transition flex items-center border border-violet-100">
                      <i className="fa-solid fa-earth-europe mr-2"></i> Markt
                    </button>
                    <button onClick={() => setView && setView('tools', { tab: 'meters', propertyId: p.id })} className="px-4 py-2 rounded-xl text-sm font-bold bg-cyan-50 text-cyan-700 hover:bg-cyan-100 transition flex items-center border border-cyan-100">
                      <i className="fa-solid fa-gauge-high mr-2"></i> Scan
                    </button>
                    <button onClick={() => onGenerateExpose && onGenerateExpose(p.id)} className="px-4 py-2 rounded-xl text-sm font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition flex items-center border border-emerald-100">
                      <i className="fa-solid fa-file-pdf mr-2"></i> Exposé
                    </button>
                    <button onClick={() => setSelectedPropId(selectedPropId === p.id ? null : p.id)} className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center ${selectedPropId === p.id ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                      <i className="fa-solid fa-file-shield mr-2"></i> Dokumente
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-4 mb-4">
                  <div className="text-center p-2 bg-slate-50 rounded-xl">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Einheiten</p>
                    <p className="text-lg font-bold text-slate-800">{p.units.length}</p>
                  </div>
                  <div className="text-center p-2 bg-slate-50 rounded-xl">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Gesamtfläche</p>
                    <p className="text-lg font-bold text-slate-800">{p.units.reduce((s, u) => s + u.size, 0)} m²</p>
                  </div>
                  <div className="text-center p-2 bg-slate-50 rounded-xl">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Zählerstände</p>
                    <p className="text-lg font-bold text-slate-800">{p.meterReadings?.length || 0}</p>
                  </div>
                </div>

                {selectedPropId === p.id && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-slate-800 text-sm">Dokumentenarchiv</h4>
                      <label className="cursor-pointer bg-white border border-indigo-200 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-50 transition">
                        <i className="fa-solid fa-upload mr-2"></i> Datei hochladen
                        <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, p.id)} accept=".pdf,.doc,.docx,.jpg,.png" />
                      </label>
                    </div>

                    <div className="space-y-3">
                      {p.documents && p.documents.length > 0 ? (
                        p.documents.map(doc => (
                          <div key={doc.id} className="flex flex-col space-y-2">
                            <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-indigo-200 transition">
                              <div className="flex items-center space-x-3 min-w-0 flex-1">
                                <div className="bg-indigo-50 p-2 rounded-lg text-indigo-500 shrink-0">
                                  {doc.mimeType.includes('pdf') ? <i className="fa-solid fa-file-pdf text-lg"></i> : <i className="fa-solid fa-file-image text-lg"></i>}
                                </div>
                                <div className="truncate">
                                  <p className="text-sm font-bold text-slate-800 truncate" title={doc.name}>{doc.name}</p>
                                  <p className="text-[10px] text-slate-400 font-medium">{doc.uploadDate} • {doc.fileSize}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-1 shrink-0">
                                <button onClick={() => handleAnalyzeDocument(p.id, doc)} className={`p-2 text-xs font-bold rounded-lg transition ${doc.analysis ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`} disabled={analyzingDocId === doc.id}>
                                  {analyzingDocId === doc.id ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-wand-sparkles"></i>}
                                </button>
                                <button onClick={() => downloadDocument(doc)} className="p-2 text-slate-400 hover:text-indigo-600 transition">
                                  <i className="fa-solid fa-download"></i>
                                </button>
                                <button onClick={() => deleteDocument(p.id, doc.id)} className="p-2 text-slate-400 hover:text-red-500 transition">
                                  <i className="fa-solid fa-trash-can"></i>
                                </button>
                              </div>
                            </div>
                            
                            {showAnalysisId === doc.id && doc.analysis && (
                              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 animate-in slide-in-from-top-1">
                                <div className="flex justify-between items-start mb-3">
                                  <h5 className="text-xs font-black text-indigo-900 uppercase tracking-wider">KI-Vertragsanalyse</h5>
                                  <button onClick={() => setShowAnalysisId(null)} className="text-indigo-400 hover:text-indigo-600">
                                    <i className="fa-solid fa-xmark"></i>
                                  </button>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                  <AnalysisItem label="Mietbeginn" value={doc.analysis.leaseStart} />
                                  <AnalysisItem label="Kaltmiete" value={doc.analysis.rentAmount} />
                                  <AnalysisItem label="Kündigungsfrist" value={doc.analysis.noticePeriod} />
                                  <AnalysisItem label="Befristung bis" value={doc.analysis.leaseEnd || 'Unbefristet'} />
                                </div>

                                <div className="space-y-3">
                                  <AnalysisList label="Auffällige Klauseln" items={doc.analysis.unusualClauses} icon="fa-circle-exclamation" color="text-amber-600" />
                                  <AnalysisList label="Risiken für Vermieter" items={doc.analysis.risks} icon="fa-triangle-exclamation" color="text-red-600" />
                                </div>
                                <div className="mt-4 pt-3 border-t border-indigo-100">
                                  <p className="text-[10px] font-bold text-indigo-900 uppercase mb-1">Zusammenfassung</p>
                                  <p className="text-xs text-slate-700 leading-relaxed italic">{doc.analysis.summary}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-slate-400">
                          <i className="fa-solid fa-folder-open text-2xl mb-2 opacity-30"></i>
                          <p className="text-xs">Noch keine Dokumente hinterlegt.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AnalysisItem: React.FC<{ label: string, value?: string }> = ({ label, value }) => (
  <div className="bg-white p-2 rounded-lg border border-indigo-100">
    <p className="text-[9px] font-bold text-slate-400 uppercase">{label}</p>
    <p className="text-xs font-bold text-slate-800">{value || '-'}</p>
  </div>
);

const AnalysisList: React.FC<{ label: string, items: string[], icon: string, color: string }> = ({ label, items, icon, color }) => (
  <div>
    <p className="text-[10px] font-bold text-indigo-900 uppercase mb-1.5">{label}</p>
    {items && items.length > 0 ? (
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start space-x-2 text-[11px] text-slate-700">
            <i className={`fa-solid ${icon} ${color} mt-0.5 shrink-0`}></i>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-[11px] text-slate-400 italic">Keine Einträge gefunden.</p>
    )}
  </div>
);

export default PropertiesList;
