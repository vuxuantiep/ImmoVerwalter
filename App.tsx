
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

const initialOwners: Owner[] = [
  { id: 'o1', name: 'Dr. Klaus Vermieter', company: 'Klaus Immo GmbH', email: 'klaus@immo-tiep.de', phone: '030-555123', address: 'Schloßstr. 1', zip: '12163', city: 'Berlin', iban: 'DE12 3456 7890 1234 5678 90', bankName: 'Berliner Sparkasse', taxId: '13/123/45678' }
];

const initialTenants: Tenant[] = [
  { id: 't1', firstName: 'Max', lastName: 'Mustermann', email: 'max@example.com', phone: '0170-1234567', startDate: '2022-01-01' }
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
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [reminders, setReminders] = useState<Reminder[]>([]);
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
        return [...otherTransactions, ...updatedTransactions.filter(t => t.propertyId === updated.id)];
      });
    }
    setEditingPropertyId(null);
  };

  const currentEditingProperty = properties.find(p => p.id === editingPropertyId);

  return (
    <div className="flex min-h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 z-50 transition-transform duration-300 ease-in-out h-full`}>
        <Sidebar currentView={currentView} setView={setView} onClose={() => setIsSidebarOpen(false)} />
      </div>

      <main className="flex-1 flex flex-col h-screen overflow-y-auto w-full relative">
        <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex justify-between items-center z-30 shrink-0">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              <i className="fa-solid fa-bars-staggered text-xl"></i>
            </button>
            <h1 className="text-lg font-black text-slate-800 tracking-tight lg:text-xl">ImmoTiep <span className="text-indigo-600">Pro</span></h1>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
               <i className="fa-solid fa-user text-xs"></i>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8 w-full max-w-7xl mx-auto">
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
          {currentView === 'finances' && (
            <FinanceTracker transactions={transactions} addTransaction={(t) => setTransactions(prev => [...prev, t])} properties={properties} />
          )}
          {currentView === 'contacts' && (
            <ContactManager handymen={[]} setHandymen={() => {}} owners={owners} setOwners={setOwners} stakeholders={[]} setStakeholders={() => {}} tenants={tenants} setTenants={setTenants} />
          )}
          {currentView === 'tools' && (
            <AITools properties={properties} setProperties={setProperties} tenants={tenants} transactions={transactions} initialPropertyId={viewParams?.propertyId} initialTab={viewParams?.tab} />
          )}
          {currentView === 'investor' && (
            <InvestorDashboard properties={properties} transactions={transactions} setProperties={setProperties} />
          )}

          {/* Optimized Footer */}
          <footer className="mt-16 pt-8 pb-8 border-t border-slate-200 text-slate-400">
            <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:justify-between md:items-center text-[10px] font-bold uppercase tracking-widest text-center md:text-left">
              <div>
                <p>© {new Date().getFullYear()} Vu Xuan Tiep</p>
                <p className="mt-1 text-[8px] opacity-60">Immobilien-Software-Lösungen</p>
              </div>
              <div className="flex flex-wrap justify-center gap-4 md:gap-8">
                <button onClick={() => setShowImpressum(true)} className="hover:text-indigo-600 transition">Impressum</button>
                <a href="https://itiep.de" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 transition">Website</a>
                <a href="mailto:vuxuantiep@gmail.com" className="hover:text-indigo-600 transition">Support</a>
              </div>
            </div>
          </footer>
        </div>
      </main>

      {/* Impressum Modal - Mobile Optimized */}
      {showImpressum && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
             <div className="bg-slate-900 p-5 flex justify-between items-center text-white">
                <h3 className="text-lg font-black uppercase">Impressum</h3>
                <button onClick={() => setShowImpressum(false)} className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-full">
                   <i className="fa-solid fa-xmark"></i>
                </button>
             </div>
             <div className="p-6 md:p-8 space-y-6">
                <div className="space-y-1">
                   <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Herausgeber</p>
                   <p className="font-black text-slate-900 text-lg">Vu Xuan Tiep</p>
                   <p className="text-sm text-slate-500">Full-Stack Software Engineer</p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                   <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Direkt-Kontakt</p>
                      <a href="tel:+491781868683" className="block font-bold text-slate-800 hover:text-indigo-600 mb-1">+49 178 1868683</a>
                      <a href="mailto:vuxuantiep@gmail.com" className="block font-bold text-slate-800 hover:text-indigo-600">vuxuantiep@gmail.com</a>
                   </div>
                   <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Web-Präsenz</p>
                      <a href="https://itiep.de" target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600">https://itiep.de</a>
                   </div>
                </div>
                <button onClick={() => setShowImpressum(false)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition active:scale-95 shadow-lg shadow-slate-200">Fenster schließen</button>
             </div>
          </div>
        </div>
      )}

      {currentEditingProperty && (
        <PropertyEditor 
          property={currentEditingProperty}
          tenants={tenants}
          owners={owners}
          templates={[]}
          transactions={transactions}
          onSave={handleUpdateProperty}
          onCancel={() => setEditingPropertyId(null)}
        />
      )}
    </div>
  );
};

export default App;
