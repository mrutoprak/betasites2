
import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* Frosted Glass Header */}
      <header className="sticky top-0 z-[100] bg-white/70 backdrop-blur-xl border-b border-gray-200 supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center shadow-md">
                <span className="text-sm">🧠</span>
             </div>
             <h1 className="text-lg font-semibold tracking-tight text-[#1D1D1F]">Hafıza AI</h1>
          </div>
          
          <nav className="flex gap-1 bg-gray-100/50 p-1 rounded-lg border border-gray-200/50">
            <NavLink 
              to="/" 
              className={({ isActive }) => `px-4 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${isActive ? 'bg-white text-black shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Create
            </NavLink>
            <NavLink 
              to="/library" 
              className={({ isActive }) => `px-4 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${isActive ? 'bg-white text-black shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Library
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="flex-grow w-full max-w-5xl mx-auto px-6 py-10">
        <Outlet />
      </main>

      <footer className="py-8 text-center text-gray-400 text-[11px] border-t border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="font-medium">Designed with an obsession for memory.</p>
            <p>© {new Date().getFullYear()} Hafıza AI</p>
        </div>
      </footer>
    </div>
  );
};
