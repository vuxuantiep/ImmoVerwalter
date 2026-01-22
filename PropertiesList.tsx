
import React, { useState } from 'react';
import { Property, HouseType, PropertyDocument, View } from './types.ts';
import { analyzeContract } from './geminiService.ts';

interface PropertiesListProps {
  properties: Property[];
  setProperties: React.Dispatch<React.SetStateAction<Property[]>>;
  onGenerateExpose?: (propertyId: string) => void;
  setView?: (view: View, params?: any) => void;
  onEditProperty: (id: string) => void;
}

const PropertiesList: React.FC<PropertiesListProps> = ({ properties, setProperties, onGenerateExpose, setView, onEditProperty }) => {
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
              <div 
                className="md:w-1/3 h-48 md:h-auto bg-slate-200 relative cursor-pointer group overflow-hidden"
                onClick={() => onEditProperty(p.id)}
              >
                <img 
                  src={`https://picsum.photos/seed/${p.id}/600/400`} 
                  alt={p.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <i className="fa-solid fa-pen-to-square text-white text-3xl opacity-0 group-hover:opacity-100 transition-opacity"></i>
                </div>
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-indigo-600 uppercase">
                  {p.type}
                </div>
                {p.energyClass && (
                  <div className="absolute top-12 left-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase">
                    Klasse {p.energyClass}
                  </div>
                )}
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
                    <button 
                      onClick={() => onEditProperty(p.id)}
                      className="px-4 py-2 rounded-xl text-sm font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition flex items-center border border-indigo-100"
                    >
                      <i className="fa-solid fa-pen-to-square mr-2"></i> Stammdaten pflegen
                    </button>
                    <button onClick={() => setView && setView('tools', { tab: 'market', propertyId: p.id })} className="px-4 py-2 rounded-xl text-sm font-bold bg-violet-50 text-violet-700 hover:bg-violet-100 transition flex items-center border border-violet-100">
                      <i className="fa-solid fa-earth-europe mr-2"></i> Markt
                    </button>
                    <button onClick={() => onGenerateExpose && onGenerateExpose(p.id)} className="px-4 py-2 rounded-xl text-sm font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition flex items-center border border-emerald-100">
                      <i className="fa-solid fa-file-pdf mr-2"></i> Exposé
                    </button>
                    <button onClick={() => setSelectedPropId(selectedPropId === p.id ? null : p.id)} className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center ${selectedPropId === p.id ? 'bg-slate-200 text-slate-700' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                      <i className="fa-solid fa-file-shield mr-2"></i> Dokumente
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-slate-100 pt-4 mb-4">
                  <PropertyQuickStat label="Einheiten" value={p.units.length} />
                  <PropertyQuickStat label="Gesamtfläche" value={`${p.units.reduce((s, u) => s + u.size, 0)} m²`} />
                  <PropertyQuickStat label="Baujahr" value={p.yearBuilt || '-'} />
                  <PropertyQuickStat label="Heizung" value={p.heatingType || '-'} />
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
                          <div key={doc.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-indigo-200 transition">
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              <div className="bg-indigo-50 p-2 rounded-lg text-indigo-500 shrink-0">
                                {doc.mimeType.includes('pdf') ? <i className="fa-solid fa-file-pdf text-lg"></i> : <i className="fa-solid fa-file-image text-lg"></i>}
                              </div>
                              <div className="truncate">
                                <p className="text-sm font-bold text-slate-800 truncate">{doc.name}</p>
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
                        ))
                      ) : (
                        <div className="text-center py-6 text-slate-400 italic text-xs">Keine Dokumente.</div>
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

const PropertyQuickStat = ({ label, value }: any) => (
  <div className="text-center p-2 bg-slate-50 rounded-xl">
    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{label}</p>
    <p className="text-sm font-bold text-slate-800 truncate">{value}</p>
  </div>
);

export default PropertiesList;
