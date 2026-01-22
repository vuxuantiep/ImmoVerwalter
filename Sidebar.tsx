
import React from 'react';
import { View } from './types.ts';

interface SidebarProps {
  currentView: View;
  setView: (view: View) => void;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, onClose }) => {
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
          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
            <i className="fa-solid fa-house-chimney text-white text-xl"></i>
          </div>
          <span className="text-xl font-black text-white tracking-tight">ImmoTiep</span>
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
            className={`w-full flex items-center space-x-4 px-4 py-3.5 rounded-2xl transition-all duration-200 ${
              currentView === item.id 
                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 translate-x-1' 
                : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <i className={`fa-solid ${item.icon} w-5 text-base`}></i>
            <span className="font-bold text-sm tracking-wide">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="bg-slate-800/40 rounded-3xl p-4 border border-slate-700/50">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">Support & Kontakt</p>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-2xl bg-indigo-600/20 flex items-center justify-center text-indigo-400">
                <i className="fa-solid fa-user-check text-sm"></i>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-white truncate">Vu Xuan Tiep</p>
                <p className="text-[9px] text-slate-500 font-bold">Entwickler</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <a href="tel:+491781868683" className="bg-slate-800 p-3 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                <i className="fa-solid fa-phone text-sm"></i>
              </a>
              <a href="mailto:vuxuantiep@gmail.com" className="bg-slate-800 p-3 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                <i className="fa-solid fa-envelope text-sm"></i>
              </a>
            </div>
            
            <a href="https://itiep.de" target="_blank" rel="noopener noreferrer" className="w-full bg-slate-800 py-2.5 rounded-2xl flex items-center justify-center space-x-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-indigo-600 hover:text-white transition-all">
              <i className="fa-solid fa-globe"></i>
              <span>itiep.de</span>
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
