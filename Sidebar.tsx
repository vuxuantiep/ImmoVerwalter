
import React from 'react';
import { View, SubscriptionTier } from './types.ts';

interface SidebarProps {
  currentView: View;
  setView: (view: View) => void;
  userTier: SubscriptionTier;
  onUpgrade: () => void;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, userTier, onUpgrade, onClose }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-pie' },
    { id: 'properties', label: 'Immobilien', icon: 'fa-building' },
    { id: 'tenants', label: 'Mieter', icon: 'fa-users' },
    { id: 'finances', label: 'Finanzen', icon: 'fa-wallet' },
    { id: 'investor', label: 'Investor-Tools', icon: 'fa-sack-dollar' },
    { id: 'contacts', label: 'Kontakte', icon: 'fa-address-book' },
    { id: 'tools', label: 'KI Tools', icon: 'fa-wand-magic-sparkles' },
  ];

  return (
    <aside className="w-72 bg-slate-900 text-slate-300 h-full flex flex-col shadow-2xl overflow-hidden">
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-500/20">
            <i className="fa-solid fa-house-chimney text-white text-xl"></i>
          </div>
          <span className="text-xl font-black text-white tracking-tighter">ImmoTiep</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-2 text-slate-500 hover:bg-slate-800 rounded-lg">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        )}
      </div>
      
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id as View)}
            className={`w-full flex items-center space-x-4 px-5 py-4 rounded-2xl transition-all duration-200 ${
              currentView === item.id 
                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 translate-x-1' 
                : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <i className={`fa-solid ${item.icon} w-5 text-lg`}></i>
            <span className="font-black text-[11px] uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="bg-slate-800/40 rounded-[2rem] p-5 border border-slate-700/50">
          <div className="flex justify-between items-start mb-4">
             <div>
               <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Ihr Plan</p>
               <p className="text-sm font-black text-indigo-400 tracking-tight">{userTier}</p>
             </div>
             {userTier === SubscriptionTier.FREE && (
               <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 animate-bounce">
                 <i className="fa-solid fa-crown text-sm"></i>
               </div>
             )}
          </div>
          
          <button 
            onClick={onUpgrade}
            className={`w-full py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
              userTier === SubscriptionTier.FREE 
                ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-xl shadow-indigo-600/20' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {userTier === SubscriptionTier.FREE ? 'Plan Upgraden' : 'Paket verwalten'}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
