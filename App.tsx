
import React, { useState } from 'react';
import { View, Property, Tenant, Transaction, HouseType, Reminder, ReminderCategory, Owner, Template, UnitType, TransactionType } from './types.ts';
import Sidebar from './Sidebar.tsx';
import Dashboard from './Dashboard.tsx';
import PropertiesList from './PropertiesList.tsx';
import TenantManager from './TenantManager.tsx';
import FinanceTracker from './FinanceTracker.tsx';
import ContactManager from './ContactManager.tsx';
import AITools from './AITools.tsx';
import InvestorDashboard from './InvestorDashboard.tsx';
import PropertyEditor from './PropertyEditor.tsx';

const initialTemplates: Template[] = [
  { id: 'v1', name: 'Mieterhöhung', subject: 'Ankündigung einer Mietanpassung', content: 'Vorlage für eine Mieterhöhung gemäß Mietspiegel oder Modernisierung.' },
  { id: 'v2', name: 'Mahnung', subject: 'Zahlungserinnerung Mietrückstand', content: 'Höfliche aber bestimmte Erinnerung an ausstehende Mietzahlungen.' },
  { id: 'v3', name: 'Übergabeprotokoll', subject: 'Bestätigung Wohnungsübergabe', content: 'Zusammenfassung des Zustands bei Ein- oder Auszug.' },
  { id: 'v4', name: 'Individuell', subject: 'Mitteilung an den Mieter', content: 'Ein allgemeiner Brief für verschiedene Anlässe.' }
];

const initialProperties: Property[] = [
  {
    id: 'p1',
    name: 'Sonnenresidenz',
    type: HouseType.APARTMENT_BLOCK,
    address: 'Sonnenallee 15, 12047 Berlin',
    ownerId: 'o1',
    purchasePrice: 245000,
    purchaseDate: '2021-05-15',
    yearBuilt: 1994,
    heatingType: 'Gas-Zentral',
    energyClass: 'C',
    units: [
      { id: 'u1', number: 'EG links', type: UnitType.RESIDENTIAL, size: 65, baseRent: 850, utilityPrepayment: 150, tenantId: 't1' },
      { id: 'u2', number: '1. OG rechts (Büro)', type: UnitType.COMMERCIAL, size: 45, baseRent: 600, utilityPrepayment: 110, isVatSubject: true }
    ],
    loans: [
      { id: 'l1', bankName: 'DKB Bank', totalAmount: 200000, currentBalance: 185000, interestRate: 1.25, repaymentRate: 2.5, fixedUntil: '2031-05-15', monthlyInstallment: 625 }
    ]
  }
];

const initialOwners: Owner[] = [
  { id: 'o1', name: 'Dr. Klaus Vermieter', company: 'Klaus Immo GmbH', email: 'klaus@immo-tiep.de', phone: '030-555123', address: 'Schloßstr. 1', zip: '12163', city: 'Berlin', iban: 'DE12 3456 7890 1234 5678 90', bankName: 'Berliner Sparkasse', taxId: '13/123/45678' }
];

const initialTenants: Tenant[] = [
  { id: 't1', firstName: 'Max', lastName: 'Mustermann', email: 'max@example.com', phone: '0170-1234567', startDate: '2022-01-01' }
];

const initialTransactions: Transaction[] = [
  { id: 'tr1', propertyId: 'p1', type: TransactionType.EXPENSE, category: 'Versicherung', amount: 450, date: '2023-01-10', description: 'Gebäudeversicherung Allianz', isUtilityRelevant: true },
  { id: 'tr2', propertyId: 'p1', type: TransactionType.EXPENSE, category: 'Wasser/Abwasser', amount: 820, date: '2023-03-15', description: 'Berliner Wasserbetriebe', isUtilityRelevant: true },
  { id: 'tr3', propertyId: 'p1', type: TransactionType.EXPENSE, category: 'Müllabfuhr', amount: 310, date: '2023-02-20', description: 'BSR Abfallentsorgung', isUtilityRelevant: true }
];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [viewParams, setViewParams] = useState<any>(null);
  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);
  const [owners, setOwners] = useState<Owner[]>(initialOwners);
  const [templates] = useState<Template[]>(initialTemplates);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [handymen, setHandymen] = useState<any[]>([]);
  const [stakeholders, setStakeholders] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [showImpressum, setShowImpressum] = useState(false);

  const setView = (v: View, params: any = null) => {
    setCurrentView(v);
    setViewParams(params);
    setIsSidebarOpen(false);
  };

  const handleUpdateProperty = (updated: Property, updatedTransactions?: Transaction[]) => {
    setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
    if (updatedTransactions) {
      setTransactions(prev => {
        const otherTransactions = prev.filter(t => t.propertyId !== updated.id);
        const objectTransactions = updatedTransactions.filter(t => t.propertyId === updated.id);
        return [...otherTransactions, ...objectTransactions];
      });
    }
    setEditingPropertyId(null);
  };

  const addTransaction = (t: Transaction) => setTransactions(prev => [...prev, t]);
  const currentEditingProperty = properties.find(p => p.id === editingPropertyId);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static z-50 transition-transform duration-300 h-full`}>
        <Sidebar currentView={currentView} setView={setView} />
      </div>

      <main className="flex-1 flex flex-col p-4 md:p-8 pb-32 lg:pb-8 h-screen overflow-y-auto">
        <header className="mb-8 flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-600">
              <i className="fa-solid fa-bars-staggered"></i>
            </button>
            <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">ImmoManager-Tiep</h1>
          </div>
        </header>

        <div className="max-w-7xl mx-auto flex-1 w-full">
          {currentView === 'dashboard' && (
            <Dashboard 
              properties={properties} tenants={tenants} transactions={transactions} 
              reminders={reminders} setReminders={setReminders} setView={setView} 
              onEditProperty={setEditingPropertyId}
            />
          )}
          {currentView === 'properties' && (
            <PropertiesList properties={properties} setProperties={setProperties} setView={setView} onEditProperty={setEditingPropertyId} />
          )}
          {currentView === 'tenants' && (
            <TenantManager tenants={tenants} setTenants={setTenants} properties={properties} transactions={transactions} />
          )}
          {currentView === 'finances' && <FinanceTracker transactions={transactions} addTransaction={addTransaction} properties={properties} />}
          {currentView === 'contacts' && <ContactManager handymen={handymen} setHandymen={setHandymen} owners={owners} setOwners={setOwners} stakeholders={stakeholders} setStakeholders={setStakeholders} tenants={tenants} setTenants={setTenants} />}
          {currentView === 'tools' && <AITools properties={properties} setProperties={setProperties} tenants={tenants} transactions={transactions} initialPropertyId={viewParams?.propertyId} initialTab={viewParams?.tab} />}
          {currentView === 'investor' && <InvestorDashboard properties={properties} transactions={transactions} setProperties={setProperties} />}
        </div>

        {/* Global Footer */}
        <footer className="mt-12 pt-8 border-t border-slate-200 text-slate-400 shrink-0">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
              <span>© {new Date().getFullYear()} Vu Xuan Tiep</span>
              <span className="hidden md:inline text-slate-200">|</span>
              <span>Alle Rechte vorbehalten</span>
            </div>
            <div className="flex items-center space-x-6">
              <button onClick={() => setShowImpressum(true)} className="hover:text-indigo-600 transition">Impressum</button>
              <a href="https://itiep.de" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 transition">itiep.de</a>
              <a href="mailto:vuxuantiep@gmail.com" className="hover:text-indigo-600 transition">Kontakt</a>
            </div>
          </div>
        </footer>
      </main>

      {/* Impressum Modal */}
      {showImpressum && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
                <h3 className="text-xl font-black uppercase tracking-tight">Impressum</h3>
                <button onClick={() => setShowImpressum(false)} className="p-2 hover:bg-white/10 rounded-full transition">
                   <i className="fa-solid fa-xmark text-xl"></i>
                </button>
             </div>
             <div className="p-8 space-y-6 text-slate-700">
                <section>
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Angaben gemäß § 5 TMG</h4>
                   <p className="font-bold text-lg">Vu Xuan Tiep</p>
                   <p className="text-sm">Informatik-Dienstleistungen & Immobilien-Technologien</p>
                </section>
                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Kontakt</h4>
                      <p className="text-sm font-medium">Telefon: +49 178 1868683</p>
                      <p className="text-sm font-medium">E-Mail: vuxuantiep@gmail.com</p>
                   </div>
                   <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Webseite</h4>
                      <a href="https://itiep.de" target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-indigo-600 hover:underline">https://itiep.de</a>
                   </div>
                </section>
                <div className="pt-6 border-t border-slate-100">
                   <p className="text-[9px] text-slate-400 leading-relaxed italic">
                      Haftungsausschluss: Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.
                   </p>
                </div>
                <button onClick={() => setShowImpressum(false)} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-black transition">Schließen</button>
             </div>
          </div>
        </div>
      )}

      {currentEditingProperty && (
        <PropertyEditor 
          property={currentEditingProperty}
          tenants={tenants}
          owners={owners}
          templates={templates}
          transactions={transactions}
          onSave={handleUpdateProperty}
          onCancel={() => setEditingPropertyId(null)}
        />
      )}
    </div>
  );
};

export default App;
