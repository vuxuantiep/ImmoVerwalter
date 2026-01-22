
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
          <span className="text-xl font-bold text-white tracking-tight">ImmoTiep</span>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
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

      {/* Developer & Contact Section */}
      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/50">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Entwickler & Kontakt</p>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                <i className="fa-solid fa-user-check text-xs"></i>
              </div>
              <p className="text-xs font-black text-white truncate">Vu Xuan Tiep</p>
            </div>
            
            <a href="tel:+491781868683" className="flex items-center space-x-3 group hover:text-indigo-400 transition-colors">
              <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-slate-400 group-hover:bg-indigo-500/10 group-hover:text-indigo-400 transition-all">
                <i className="fa-solid fa-phone text-[10px]"></i>
              </div>
              <p className="text-[10px] font-bold">+49 178 1868683</p>
            </a>

            <a href="mailto:vuxuantiep@gmail.com" className="flex items-center space-x-3 group hover:text-indigo-400 transition-colors">
              <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-slate-400 group-hover:bg-indigo-500/10 group-hover:text-indigo-400 transition-all">
                <i className="fa-solid fa-envelope text-[10px]"></i>
              </div>
              <p className="text-[10px] font-bold truncate">vuxuantiep@gmail.com</p>
            </a>

            <a href="https://itiep.de" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-3 group hover:text-indigo-400 transition-colors">
              <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-slate-400 group-hover:bg-indigo-500/10 group-hover:text-indigo-400 transition-all">
                <i className="fa-solid fa-globe text-[10px]"></i>
              </div>
              <p className="text-[10px] font-bold">itiep.de</p>
            </a>
          </div>
        </div>
      </div>

      <div className="p-4 pt-0">
        <button className="w-full bg-slate-800 hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl transition-all shadow-sm active:scale-95">
          Pro Plan Upgrade
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
