
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

  const setView = (v: View, params: any = null) => {
    setCurrentView(v);
    setViewParams(params);
    setIsSidebarOpen(false);
  };

  const handleUpdateProperty = (updated: Property, updatedTransactions?: Transaction[]) => {
    setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
    if (updatedTransactions) {
      setTransactions(updatedTransactions);
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

      <main className="flex-1 p-4 md:p-8 pb-32 lg:pb-8">
        <header className="mb-8 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-600">
              <i className="fa-solid fa-bars-staggered"></i>
            </button>
            <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">ImmoManager-Tiep</h1>
          </div>
        </header>

        <div className="max-w-7xl mx-auto">
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
          {currentView === 'finances' && <FinanceTracker transactions={transactions} addTransaction={addTransaction} properties={properties} />}
          {currentView === 'contacts' && <ContactManager handymen={handymen} setHandymen={setHandymen} owners={owners} setOwners={setOwners} stakeholders={stakeholders} setStakeholders={setStakeholders} tenants={tenants} setTenants={setTenants} />}
          {currentView === 'tools' && <AITools properties={properties} setProperties={setProperties} tenants={tenants} transactions={transactions} initialPropertyId={viewParams?.propertyId} initialTab={viewParams?.tab} />}
          {currentView === 'investor' && <InvestorDashboard properties={properties} transactions={transactions} setProperties={setProperties} />}
        </div>
      </main>

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
