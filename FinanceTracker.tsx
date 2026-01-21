
import React, { useState, useRef } from 'react';
import { Transaction, TransactionType, Property } from './types.ts';

interface FinanceTrackerProps {
  transactions: Transaction[];
  addTransaction: (t: Transaction) => void;
  properties: Property[];
}

interface CSVRow {
  [key: string]: string;
}

const FinanceTracker: React.FC<FinanceTrackerProps> = ({ transactions, addTransaction, properties }) => {
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importData, setImportData] = useState<{ headers: string[], rows: CSVRow[] } | null>(null);
  const [mapping, setMapping] = useState({ date: '', amount: '', description: '' });
  const [pendingTransactions, setPendingTransactions] = useState<Partial<Transaction>[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<Partial<Transaction>>({
    type: TransactionType.INCOME,
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    description: '',
    category: 'Kaltmiete'
  });

  const categories = {
    [TransactionType.INCOME]: ['Kaltmiete', 'Nebenkostenvorauszahlung', 'Kaution', 'Nachzahlung Abrechnung', 'Stellplatz', 'Sonstiges'],
    [TransactionType.EXPENSE]: ['Grundsteuer', 'Versicherung', 'Wasser/Abwasser', 'Müllabfuhr', 'Heizung/Warmwasser', 'Gebäudereinigung', 'Schornsteinfeger', 'Strom (Allgemein)', 'Hauswart', 'Gartenpflege', 'Instandhaltung / Reparatur', 'Verwaltungskosten', 'Zinsen / Darlehen', 'Sonstige Betriebskosten']
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.propertyId || !form.amount || !form.description) return;
    addTransaction({ id: Math.random().toString(36).substr(2, 9), ...(form as Transaction) });
    setShowForm(false);
    setForm({ type: form.type, date: new Date().toISOString().split('T')[0], amount: 0, description: '', category: form.type === TransactionType.INCOME ? 'Kaltmiete' : 'Instandhaltung / Reparatur' });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) return alert('Die Datei enthält keine Daten.');
      const firstLine = lines[0];
      const separator = firstLine.includes(';') ? ';' : ',';
      const headers = firstLine.split(separator).map(h => h.trim().replace(/^"|"$/g, ''));
      const rows = lines.slice(1).map(line => {
        const values = line.split(separator).map(v => v.trim().replace(/^"|"$/g, ''));
        const row: CSVRow = {};
        headers.forEach((h, i) => { row[h] = values[i] || ''; });
        return row;
      });
      setImportData({ headers, rows });
      const dateH = headers.find(h => h.toLowerCase().includes('datum') || h.toLowerCase().includes('tag')) || '';
      const amountH = headers.find(h => h.toLowerCase().includes('betrag') || h.toLowerCase().includes('umsatz') || h.toLowerCase().includes('wert')) || '';
      const descH = headers.find(h => h.toLowerCase().includes('zweck') || h.toLowerCase().includes('text') || h.toLowerCase().includes('beschreibung')) || '';
      setMapping({ date: dateH, amount: amountH, description: descH });
    };
    reader.readAsText(file);
  };

  const processImport = () => {
    if (!importData || !mapping.date || !mapping.amount || !mapping.description) return alert('Bitte ordnen Sie alle erforderlichen Spalten zu.');
    const processed = importData.rows.map(row => {
      let amtStr = row[mapping.amount].replace(/\./g, '').replace(',', '.');
      let amount = parseFloat(amtStr);
      return { id: Math.random().toString(36).substr(2, 9), date: row[mapping.date] || new Date().toISOString().split('T')[0], amount: Math.abs(amount), type: amount >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE, description: row[mapping.description], category: amount >= 0 ? 'Kaltmiete' : 'Instandhaltung / Reparatur', propertyId: '' };
    });
    setPendingTransactions(processed);
    setImportData(null);
  };

  const saveBatch = () => {
    const valid = pendingTransactions.filter(t => t.propertyId !== '');
    if (valid.length === 0) return alert('Bitte weisen Sie mindestens einer Buchung ein Objekt zu.');
    valid.forEach(t => addTransaction(t as Transaction));
    setPendingTransactions([]);
    setShowImport(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">Transaktionen & Buchhaltung</h2>
        <div className="flex space-x-2">
          <button onClick={() => setShowImport(true)} className="bg-white text-indigo-600 border border-indigo-200 px-4 py-2 rounded-xl hover:bg-indigo-50 transition font-bold text-sm">
            <i className="fa-solid fa-file-import mr-2"></i> Bank-Import
          </button>
          <button onClick={() => { setShowForm(true); setShowImport(false); }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 text-sm font-bold">
            <i className="fa-solid fa-plus mr-2"></i> Neue Buchung
          </button>
        </div>
      </div>

      {showImport && (
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-indigo-100 animate-in slide-in-from-top-2 duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg">CSV Bankdaten Import</h3>
            <button onClick={() => {setShowImport(false); setPendingTransactions([]); setImportData(null);}} className="text-slate-400 hover:text-slate-600">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          {!importData && pendingTransactions.length === 0 && (
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center hover:border-indigo-400 transition cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <i className="fa-solid fa-cloud-arrow-up text-4xl text-slate-300 mb-4"></i>
              <p className="font-bold text-slate-600">Bank-Export hierher ziehen oder klicken</p>
              <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileUpload} />
            </div>
          )}
          {importData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl">
                <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Spalte: Datum</label><select className="w-full border p-2 rounded-lg text-sm" value={mapping.date} onChange={e => setMapping({...mapping, date: e.target.value})}>{importData.headers.map(h => <option key={h} value={h}>{h}</option>)}</select></div>
                <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Spalte: Betrag</label><select className="w-full border p-2 rounded-lg text-sm" value={mapping.amount} onChange={e => setMapping({...mapping, amount: e.target.value})}>{importData.headers.map(h => <option key={h} value={h}>{h}</option>)}</select></div>
                <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Spalte: Verwendungszweck</label><select className="w-full border p-2 rounded-lg text-sm" value={mapping.description} onChange={e => setMapping({...mapping, description: e.target.value})}>{importData.headers.map(h => <option key={h} value={h}>{h}</option>)}</select></div>
              </div>
              <button onClick={processImport} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition">Daten verarbeiten</button>
            </div>
          )}
          {pendingTransactions.length > 0 && (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {pendingTransactions.map((t, idx) => (
                <div key={t.id} className="flex flex-col md:flex-row md:items-center p-3 border border-slate-100 rounded-xl bg-slate-50 gap-3">
                  <div className="w-24 shrink-0"><span className="text-[10px] font-bold text-slate-400 block uppercase">Datum</span><span className="text-xs font-bold">{t.date}</span></div>
                  <div className="flex-1 min-w-0"><span className="text-[10px] font-bold text-slate-400 block uppercase">Zweck</span><p className="text-xs truncate font-medium">{t.description}</p></div>
                  <div className="w-24 shrink-0"><span className="text-[10px] font-bold text-slate-400 block uppercase">Betrag</span><span className={`text-xs font-black ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-red-600'}`}>{t.amount?.toFixed(2)}€</span></div>
                  <div className="w-48"><span className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Objekt</span><select className="w-full border p-1.5 rounded-lg text-xs" value={t.propertyId} onChange={e => { const updated = [...pendingTransactions]; updated[idx].propertyId = e.target.value; setPendingTransactions(updated); }}><option value="">Wählen...</option>{properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                </div>
              ))}
              <div className="pt-4 flex space-x-3 sticky bottom-0 bg-white"><button onClick={saveBatch} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg">Buchungen speichern</button></div>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-indigo-100 animate-in slide-in-from-top-2 duration-300">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Art</label><div className="flex bg-slate-100 p-1 rounded-xl"><button type="button" onClick={() => setForm({...form, type: TransactionType.INCOME, category: categories[TransactionType.INCOME][0]})} className={`flex-1 py-2 rounded-lg text-xs font-bold ${form.type === TransactionType.INCOME ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>Einnahme</button><button type="button" onClick={() => setForm({...form, type: TransactionType.EXPENSE, category: categories[TransactionType.EXPENSE][10]})} className={`flex-1 py-2 rounded-lg text-xs font-bold ${form.type === TransactionType.EXPENSE ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`}>Ausgabe</button></div></div>
            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Immobilie</label><select className="w-full border border-slate-200 p-2.5 rounded-xl bg-white font-medium" value={form.propertyId} onChange={e => setForm({...form, propertyId: e.target.value})} required><option value="">Wählen...</option>{properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Betrag (€)</label><input type="number" step="0.01" className="w-full border border-slate-200 p-2.5 rounded-xl font-black" value={form.amount || ''} onChange={e => setForm({...form, amount: parseFloat(e.target.value)})} required /></div>
            <div className="md:col-span-full pt-4 flex space-x-3"><button type="submit" className="flex-1 bg-indigo-600 text-white py-3.5 rounded-2xl font-bold">Speichern</button></div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest">
            <tr><th className="px-6 py-5">Datum</th><th className="px-6 py-5">Immobilie</th><th className="px-6 py-5">Kategorie</th><th className="px-6 py-5">Bezeichnung</th><th className="px-6 py-5 text-right">Betrag</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.slice().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
              <tr key={t.id} className="hover:bg-slate-50/50 transition">
                <td className="px-6 py-4 text-xs font-bold text-slate-400">{t.date}</td>
                <td className="px-6 py-4 text-sm font-bold text-slate-800">{properties.find(p => p.id === t.propertyId)?.name || 'Unbekannt'}</td>
                <td className="px-6 py-4"><span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-600">{t.category}</span></td>
                <td className="px-6 py-4 text-sm text-slate-600 italic">{t.description}</td>
                <td className={`px-6 py-4 text-right font-black ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-red-600'}`}>{t.type === TransactionType.INCOME ? '+' : '-'}{t.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FinanceTracker;
