import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, ShieldCheck } from 'lucide-react';
import { api } from '../api';

export default function AuthModal({ onClose, onAuthSuccess, initialRegister = false }) {
  const [isRegister, setIsRegister] = useState(initialRegister);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let data;
      if (isRegister) {
        data = await api.register(email, password, fullName);
      } else {
        data = await api.login(email, password);
      }
      onAuthSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm glass-panel p-6 sm:p-8 rounded-3xl border border-cyan-500/25 shadow-2xl">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center mx-auto mb-2 shadow-lg shadow-cyan-500/25">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">
            {isRegister ? "Create Secure Account" : "Sign In to Drive"}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Private zero-knowledge file vault with expiring burner links
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-800 mb-5 text-xs">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
              !isRegister ? "bg-slate-800 text-white shadow" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
              isRegister ? "bg-cyan-500 text-white shadow" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isRegister && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 pl-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 pl-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 pl-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all mt-4"
          >
            {loading ? "Authenticating..." : isRegister ? "Create Account & Enter" : "Sign In to Drive"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-xs text-cyan-400 hover:text-cyan-300"
          >
            {isRegister ? "Already have an account? Sign In" : "New to SecureDrive? Create an Account"}
          </button>
        </div>
      </div>
    </div>
  );
}
