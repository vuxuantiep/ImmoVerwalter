
import React from 'react';
import { View } from './types.ts';

interface SidebarProps {
  currentView: View;
  setView: (view: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
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
    <aside className="w-64 bg-slate-900 text-slate-300 h-full flex flex-col shadow-2xl">
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-500 p-2 rounded-lg">
            <i className="fa-solid fa-house-chimney text-white text-xl"></i>
          </div>
          <span className="text-xl font-bold text-white tracking-tight">ImmoManager</span>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id as View)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              currentView === item.id 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <i className={`fa-solid ${item.icon} w-5`}></i>
            <span className="font-bold text-sm tracking-wide">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-slate-800">
        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Pro Plan</p>
          <p className="text-xs text-slate-300 leading-relaxed mb-4">Nutzen Sie alle KI-Funktionen ohne Limit.</p>
          <button className="w-full bg-slate-700 hover:bg-indigo-600 text-white text-xs font-bold py-2 rounded-lg transition-colors">
            Upgrade
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
