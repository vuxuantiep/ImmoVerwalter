
import React, { useState } from 'react';
import { View, Property, Tenant, Transaction, Handyman, Owner, Stakeholder, HouseType, Reminder, ReminderCategory } from './types';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import PropertiesList from './PropertiesList';
import TenantManager from './TenantManager';
import FinanceTracker from './FinanceTracker';
import ContactManager from './ContactManager';
import AITools from './AITools';
import InvestorDashboard from './InvestorDashboard';

const initialProperties: Property[] = [
  {
    id: 'p1',
    name: 'Sonnenresidenz',
    type: HouseType.APARTMENT_BLOCK,
    address: 'Sonnenallee 15, 12047 Berlin',
    purchasePrice: 245000,
    purchaseDate: '2021-05-15',
    units: [
      { id: 'u1', number: 'EG links', size: 65, baseRent: 850, utilityPrepayment: 150, tenantId: 't1' },
      { id: 'u2', number: '1. OG rechts', size: 45, baseRent: 600, utilityPrepayment: 110 }
    ],
    loans: [
      {
        id: 'l1',
        bankName: 'DKB Bank',
        totalAmount: 200000,
        currentBalance: 185000,
        interestRate: 1.25,
        repaymentRate: 2.5,
        fixedUntil: '2031-05-15',
        monthlyInstallment: 625
      }
    ],
    meterReadings: []
  }
];

const initialTenants: Tenant[] = [
  { id: 't1', firstName: 'Max', lastName: 'Mustermann', email: 'max@example.com', phone: '0170-1234567', startDate: '2022-01-01' }
];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [viewParams, setViewParams] = useState<any>(null);
  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [handymen, setHandymen] = useState<Handyman[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const setView = (v: View, params: any = null) => {
    setCurrentView(v);
    setViewParams(params);
    setIsSidebarOpen(false);
    window.scrollTo(0, 0);
  };

  const addTransaction = (t: Transaction) => setTransactions(prev => [...prev, t]);

  const viewLabels: Record<View, string> = {
    dashboard: 'Home',
    properties: 'Objekte',
    tenants: 'Mieter',
    finances: 'Finanzen',
    contacts: 'Kontakte',
    tools: 'KI-Assistenz',
    investor: 'Investor'
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static z-50 transition-transform duration-300 h-full`}>
        <Sidebar currentView={currentView} setView={setView} />
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}
      
      <main className="flex-1 p-4 md:p-8 pb-32 lg:pb-8">
        <header className="mb-8 flex justify-between items-center bg-white/80 backdrop-blur shadow-sm lg:shadow-none p-4 rounded-2xl lg:p-0 lg:bg-transparent sticky top-4 z-30 lg:static">
          <div className="flex items-center space-x-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-600 active:scale-90 transition-transform">
              <i className="fa-solid fa-bars-staggered text-xl"></i>
            </button>
            <div>
              <h1 className="text-xl md:text-3xl font-black text-slate-800 tracking-tight">{viewLabels[currentView]}</h1>
              <p className="hidden md:block text-slate-500 font-medium text-sm">Willkommen bei ImmoManager Pro.</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
             <button onClick={() => setView('tools')} className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl hover:bg-indigo-100 transition active:scale-95">
                <i className="fa-solid fa-wand-magic-sparkles"></i>
             </button>
             <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-indigo-200">
               VM
             </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto">
          {currentView === 'dashboard' && (
            <Dashboard 
              properties={properties} 
              tenants={tenants} 
              transactions={transactions} 
              reminders={reminders}
              setReminders={setReminders}
              setView={setView}
            />
          )}
          {currentView === 'properties' && (
            <PropertiesList 
              properties={properties} 
              setProperties={setProperties} 
              onGenerateExpose={(id) => setView('tools', { tab: 'expose', propertyId: id })}
              setView={setView}
            />
          )}
          {currentView === 'tenants' && (
            <TenantManager tenants={tenants} setTenants={setTenants} properties={properties} transactions={transactions} />
          )}
          {currentView === 'finances' && (
            <FinanceTracker transactions={transactions} addTransaction={addTransaction} properties={properties} />
          )}
          {currentView === 'investor' && (
            <InvestorDashboard properties={properties} transactions={transactions} setProperties={setProperties} />
          )}
          {currentView === 'contacts' && (
            <ContactManager 
              handymen={handymen} setHandymen={setHandymen} 
              owners={owners} setOwners={setOwners} 
              stakeholders={stakeholders} setStakeholders={setStakeholders}
              tenants={tenants} setTenants={setTenants}
            />
          )}
          {currentView === 'tools' && (
            <AITools 
              properties={properties} 
              setProperties={setProperties}
              tenants={tenants} 
              transactions={transactions} 
              initialPropertyId={viewParams?.propertyId}
              initialTab={viewParams?.tab}
            />
          )}
        </div>
      </main>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-100 px-6 pt-3 pb-8 flex justify-between items-center z-40 shadow-[0_-8px_20px_rgba(0,0,0,0.05)]">
        <NavIconButton active={currentView === 'dashboard'} onClick={() => setView('dashboard')} icon="fa-house" label="Home" />
        <NavIconButton active={currentView === 'properties'} onClick={() => setView('properties')} icon="fa-building" label="Objekte" />
        <NavIconButton active={currentView === 'finances'} onClick={() => setView('finances')} icon="fa-wallet" label="Finanzen" />
        <NavIconButton active={currentView === 'contacts'} onClick={() => setView('contacts')} icon="fa-address-book" label="Kontakte" />
        <NavIconButton active={currentView === 'tools'} onClick={() => setView('tools')} icon="fa-robot" label="KI" />
      </nav>
    </div>
  );
};

const NavIconButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: string, label: string }) => (
  <button onClick={onClick} className={`flex flex-col items-center space-y-1 transition-all ${active ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}>
    <i className={`fa-solid ${icon} text-xl`}></i>
    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

export default App;
