import React from 'react';
import { Flame, LogOut, Link2 } from 'lucide-react';

export default function Navbar({ user, onLogout, onOpenAuth, onOpenShareLink, onViewChange }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#080d1a]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div 
          onClick={() => onViewChange("dashboard")}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                SecureDrive
              </span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Encrypted Vault
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Google Drive with self-destructing signed links</p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onOpenShareLink}
            aria-label="Open shared link"
            title="Open a shared document"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-cyan-400 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 rounded-lg transition-colors"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open Link</span>
          </button>

          {user ? (
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900/70 border border-slate-800">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 text-xs font-bold">
                  {user.full_name ? user.full_name[0] : "U"}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-semibold text-slate-200 leading-tight">{user.full_name}</p>
                  <p className="text-[10px] text-slate-400 leading-tight">{user.email}</p>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onOpenAuth && onOpenAuth(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs border border-slate-800 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuth && onOpenAuth(true)}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-xs shadow-md shadow-cyan-500/25 transition-all"
              >
                Create Account
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
