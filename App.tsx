
import React, { useState } from 'react';
import { View, Property, Tenant, Transaction, HouseType, Reminder, Owner, UnitType, TransactionType, SubscriptionTier, User } from './types.ts';
import Sidebar from './Sidebar.tsx';
import Dashboard from './Dashboard.tsx';
import PropertiesList from './PropertiesList.tsx';
import TenantManager from './TenantManager.tsx';
import FinanceTracker from './FinanceTracker.tsx';
import ContactManager from './ContactManager.tsx';
import AITools from './AITools.tsx';
import InvestorDashboard from './InvestorDashboard.tsx';
import PropertyEditor from './PropertyEditor.tsx';
import AIFeedbackAssistant from './AIFeedbackAssistant.tsx';

const initialOwners: Owner[] = [
  { id: 'o1', name: 'Muster Vermieter', email: 'info@vermieter.de', phone: '0123', address: 'Heimweg 1', zip: '10115', city: 'Berlin' }
];

const initialProperties: Property[] = [
  {
    id: 'p1',
    name: 'Mein Erstobjekt',
    type: HouseType.CONDO,
    address: 'Kurfürstendamm 100, 10709 Berlin',
    ownerId: 'o1',
    units: [{ id: 'u1', number: '1A', type: UnitType.RESIDENTIAL, size: 45, baseRent: 500, utilityPrepayment: 120 }]
  }
];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [viewParams, setViewParams] = useState<any>(null);
  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [owners, setOwners] = useState<Owner[]>(initialOwners);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [showImpressum, setShowImpressum] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

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

  const checkLimit = (type: 'property' | 'owner') => {
    if (!currentUser) {
      setShowAuthModal(true);
      return false;
    }
    if (currentUser.tier === SubscriptionTier.FREE) {
      if (type === 'property' && properties.length >= 1) {
        setShowPricing(true);
        return false;
      }
      if (type === 'owner' && owners.length >= 1) {
        setShowPricing(true);
        return false;
      }
    }
    return true;
  };

  const handleAuth = (isLogin: boolean) => {
    setCurrentUser({
      id: 'u' + Date.now(),
      name: 'Max Mustermann',
      email: 'max@mustermann.de',
      tier: SubscriptionTier.FREE
    });
    setShowAuthModal(false);
  };

  const upgradeTier = (tier: SubscriptionTier) => {
    if (!currentUser) return setShowAuthModal(true);
    setCurrentUser(prev => prev ? { ...prev, tier } : null);
    setShowPricing(false);
  };

  const currentEditingProperty = properties.find(p => p.id === editingPropertyId);

  return (
    <div className="flex min-h-screen bg-slate-50 overflow-hidden font-sans">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 z-50 transition-transform duration-300 ease-in-out h-full`}>
        <Sidebar currentView={currentView} setView={setView} userTier={currentUser?.tier || SubscriptionTier.FREE} onUpgrade={() => setShowPricing(true)} onClose={() => setIsSidebarOpen(false)} />
      </div>

      <main className="flex-1 flex flex-col h-screen overflow-y-auto w-full relative">
        <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex justify-between items-center z-30 shrink-0">
          <div className="flex items-center space-x-3">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition">
              <i className="fa-solid fa-bars-staggered text-xl"></i>
            </button>
            <div className="flex items-baseline space-x-2">
              <h1 className="text-xl font-black text-slate-800 tracking-tight">ImmoTiep</h1>
              {currentUser?.tier === SubscriptionTier.ENTERPRISE && (
                <span className="bg-indigo-600 text-white text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest animate-pulse">Hosted Cloud Instance</span>
              )}
            </div>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => currentUser ? setShowUserMenu(!showUserMenu) : setShowAuthModal(true)} 
              className="w-10 h-10 rounded-full bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center text-indigo-600 hover:bg-indigo-100 transition-all shadow-sm group active:scale-90"
            >
               <i className="fa-solid fa-user text-lg"></i>
            </button>
            
            {showUserMenu && currentUser && (
              <div className="absolute right-0 mt-3 w-72 bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xl font-black">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-800 truncate">{currentUser.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 truncate">{currentUser.email}</p>
                  </div>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
                   <div className="flex justify-between items-center mb-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Aktueller Tarif</p>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${currentUser.tier === SubscriptionTier.FREE ? 'bg-slate-200 text-slate-600' : 'bg-indigo-100 text-indigo-600'}`}>{currentUser.tier}</span>
                   </div>
                   <p className="text-[10px] text-slate-500 font-medium">
                      {currentUser.tier === SubscriptionTier.FREE ? 'Upgrade für unbegrenzte Objekte' : 'Voller Zugriff auf alle Pro Features'}
                   </p>
                </div>

                <div className="space-y-1.5">
                  <button onClick={() => {setShowPricing(true); setShowUserMenu(false);}} className="w-full text-left px-4 py-3 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-2xl flex items-center space-x-3 transition">
                    <i className="fa-solid fa-crown"></i><span>Paket wechseln</span>
                  </button>
                  <button onClick={() => {setCurrentUser(null); setShowUserMenu(false);}} className="w-full text-left px-4 py-3 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-2xl flex items-center space-x-3 transition">
                    <i className="fa-solid fa-right-from-bracket"></i><span>Abmelden</span>
                  </button>
                </div>
              </div>
            )}
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
            <PropertiesList properties={properties} setProperties={setProperties} setView={setView} onEditProperty={setEditingPropertyId} onCheckLimit={() => checkLimit('property')} />
          )}
          {currentView === 'tenants' && (
            <TenantManager tenants={tenants} setTenants={setTenants} properties={properties} transactions={transactions} />
          )}
          {currentView === 'finances' && (
            <FinanceTracker transactions={transactions} addTransaction={(t) => setTransactions(prev => [...prev, t])} properties={properties} />
          )}
          {currentView === 'contacts' && (
            <ContactManager handymen={[]} setHandymen={() => {}} owners={owners} setOwners={setOwners} stakeholders={[]} setStakeholders={() => {}} tenants={tenants} setTenants={setTenants} onCheckLimit={() => checkLimit('owner')} />
          )}
          {currentView === 'tools' && (
            <AITools properties={properties} setProperties={setProperties} tenants={tenants} transactions={transactions} initialPropertyId={viewParams?.propertyId} initialTab={viewParams?.tab} />
          )}
          {currentView === 'investor' && (
            <InvestorDashboard properties={properties} transactions={transactions} setProperties={setProperties} />
          )}

          <footer className="mt-16 pt-8 pb-8 border-t border-slate-200 text-slate-400">
            <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:justify-between md:items-center text-[10px] font-bold uppercase tracking-widest text-center md:text-left">
              <div>
                <p>© {new Date().getFullYear()} Vu Xuan Tiep</p>
                <p className="mt-1 text-[8px] opacity-60">ImmoTiep Ecosystem v2.4</p>
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

      <AIFeedbackAssistant />

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[400] flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="bg-indigo-600 p-8 text-center text-white relative">
                 <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition"><i className="fa-solid fa-xmark"></i></button>
                 <div className="w-16 h-16 rounded-3xl bg-white/20 flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                    <i className="fa-solid fa-user-plus text-3xl"></i>
                 </div>
                 <h3 className="text-2xl font-black uppercase tracking-tight">Konto erstellen</h3>
              </div>
              <div className="p-8 space-y-4">
                 <button onClick={() => handleAuth(true)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase hover:bg-black transition flex items-center justify-center space-x-3">
                    <i className="fa-solid fa-arrow-right-to-bracket"></i>
                    <span>Einloggen / Registrieren</span>
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Pricing / Upgrade Modal */}
      {showPricing && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[300] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl h-[90vh] md:h-auto overflow-y-auto rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="bg-indigo-600 p-8 text-white text-center">
               <h3 className="text-3xl font-black mb-2 uppercase tracking-tighter">Wählen Sie Ihr Paket</h3>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className={`p-8 rounded-[2rem] border ${currentUser?.tier === SubscriptionTier.FREE ? 'border-indigo-600 bg-indigo-50/50 ring-4 ring-indigo-50' : 'border-slate-100'} flex flex-col`}>
                  <h4 className="text-xl font-black text-slate-800">Free</h4>
                  <p className="text-3xl font-black mt-4 text-slate-900">0 €</p>
                  <button disabled className="w-full mt-8 bg-slate-200 text-slate-500 py-3.5 rounded-2xl font-black text-[10px] uppercase">Aktuell</button>
               </div>
               <div className="p-8 rounded-[2rem] border-2 border-indigo-100 flex flex-col bg-white shadow-xl transform md:scale-105">
                  <h4 className="text-xl font-black text-slate-800">Standard</h4>
                  <p className="text-3xl font-black mt-4 text-slate-900">10 €</p>
                  <button onClick={() => upgradeTier(SubscriptionTier.STANDARD)} className="w-full mt-8 bg-indigo-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase">Jetzt Upgrade</button>
               </div>
               <div className="p-8 rounded-[2rem] border border-slate-100 flex flex-col">
                  <h4 className="text-xl font-black text-slate-800">Enterprise</h4>
                  <p className="text-3xl font-black mt-4 text-slate-900">50 €</p>
                  <button onClick={() => upgradeTier(SubscriptionTier.ENTERPRISE)} className="w-full mt-8 bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase">Wählen</button>
               </div>
            </div>
          </div>
        </div>
      )}

      {showImpressum && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[500] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="bg-slate-900 p-5 flex justify-between items-center text-white">
                <h3 className="text-lg font-black uppercase">Impressum</h3>
                <button onClick={() => setShowImpressum(false)} className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-full"><i className="fa-solid fa-xmark"></i></button>
             </div>
             <div className="p-8 space-y-6 text-center">
                <div><p className="font-black text-slate-900 text-xl">Vu Xuan Tiep</p></div>
                <div className="bg-slate-50 p-6 rounded-3xl">
                   <a href="mailto:vuxuantiep@gmail.com" className="block font-black text-slate-800 text-lg hover:text-indigo-600">vuxuantiep@gmail.com</a>
                </div>
                <button onClick={() => setShowImpressum(false)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase">Schließen</button>
             </div>
          </div>
        </div>
      )}

      {currentEditingProperty && (
        <PropertyEditor property={currentEditingProperty} tenants={tenants} owners={owners} templates={[]} transactions={transactions} onSave={handleUpdateProperty} onCancel={() => setEditingPropertyId(null)} />
      )}
    </div>
  );
};

export default App;
