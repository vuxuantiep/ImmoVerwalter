
import React, { useState } from 'react';
import { View, Property, Tenant, Transaction, HouseType, Reminder, ReminderCategory } from './types.ts';
import Sidebar from './Sidebar.tsx';
import Dashboard from './Dashboard.tsx';
import PropertiesList from './PropertiesList.tsx';
import TenantManager from './TenantManager.tsx';
import FinanceTracker from './FinanceTracker.tsx';
import ContactManager from './ContactManager.tsx';
import AITools from './AITools.tsx';
import InvestorDashboard from './InvestorDashboard.tsx';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const setView = (v: View, params: any = null) => {
    setCurrentView(v);
    setViewParams(params);
    setIsSidebarOpen(false);
  };

  const addTransaction = (t: Transaction) => setTransactions(prev => [...prev, t]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static z-50 transition-transform duration-300 h-full`}>
        <Sidebar currentView={currentView} setView={setView} />
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}
      
      <main className="flex-1 p-4 md:p-8 pb-32 lg:pb-8">
        <header className="mb-8 flex justify-between items-center bg-white/80 backdrop-blur shadow-sm p-4 rounded-2xl lg:bg-transparent lg:shadow-none">
          <div className="flex items-center space-x-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-600">
              <i className="fa-solid fa-bars-staggered"></i>
            </button>
            <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">ImmoManager-Tiep</h1>
          </div>
          <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">VM</div>
        </header>

        <div className="max-w-7xl mx-auto">
          {currentView === 'dashboard' && <Dashboard properties={properties} tenants={tenants} transactions={transactions} reminders={reminders} setReminders={setReminders} setView={setView} />}
          {currentView === 'properties' && <PropertiesList properties={properties} setProperties={setProperties} setView={setView} />}
          {currentView === 'tenants' && <TenantManager tenants={tenants} setTenants={setTenants} properties={properties} transactions={transactions} />}
          {currentView === 'finances' && <FinanceTracker transactions={transactions} addTransaction={addTransaction} properties={properties} />}
          {currentView === 'investor' && <InvestorDashboard properties={properties} transactions={transactions} setProperties={setProperties} />}
          {currentView === 'contacts' && <ContactManager handymen={[]} setHandymen={() => {}} owners={[]} setOwners={() => {}} stakeholders={[]} setStakeholders={() => {}} tenants={tenants} setTenants={setTenants} />}
          {currentView === 'tools' && <AITools properties={properties} setProperties={setProperties} tenants={tenants} transactions={transactions} initialPropertyId={viewParams?.propertyId} initialTab={viewParams?.tab} />}
        </div>
      </main>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t px-6 py-3 flex justify-between items-center z-40 shadow-lg">
        <NavIconButton active={currentView === 'dashboard'} onClick={() => setView('dashboard')} icon="fa-house" />
        <NavIconButton active={currentView === 'properties'} onClick={() => setView('properties')} icon="fa-building" />
        <NavIconButton active={currentView === 'finances'} onClick={() => setView('finances')} icon="fa-wallet" />
        <NavIconButton active={currentView === 'tools'} onClick={() => setView('tools')} icon="fa-robot" />
      </nav>
    </div>
  );
};

const NavIconButton = ({ active, onClick, icon }: any) => (
  <button onClick={onClick} className={`p-2 transition-all ${active ? 'text-indigo-600' : 'text-slate-400'}`}>
    <i className={`fa-solid ${icon} text-xl`}></i>
  </button>
);

export default App;
