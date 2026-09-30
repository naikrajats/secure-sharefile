import React, { useEffect, useState } from 'react';
import { X, ShieldAlert, CheckCircle2, XCircle, Lock, RefreshCw, Smartphone, Laptop, Globe } from 'lucide-react';
import { api } from '../api';

export default function AuditLogModal({ share, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getShareLogs(share.id);
      setLogs(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [share.id]);

  const parseDevice = (ua) => {
    if (!ua) return { icon: Globe, label: "Unknown Client" };
    if (/Mobile|Android|iPhone/i.test(ua)) return { icon: Smartphone, label: "Mobile Device" };
    if (/curl|wget|python|http/i.test(ua)) return { icon: Globe, label: "API / Script Client" };
    return { icon: Laptop, label: "Desktop Browser" };
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "SUCCESS":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            <span>Downloaded</span>
          </span>
        );
      case "WRONG_PASSWORD":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Lock className="w-3 h-3" />
            <span>Bad Password</span>
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <XCircle className="w-3 h-3" />
            <span>Blocked (Expired)</span>
          </span>
        );
      case "EXHAUSTED":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <XCircle className="w-3 h-3" />
            <span>Limit Reached</span>
          </span>
        );
      case "REVOKED":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle className="w-3 h-3" />
            <span>Blocked (Revoked)</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl glass-panel p-6 rounded-2xl border border-slate-700 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Cryptographic Access Audit Trail</h3>
              <p className="text-xs text-slate-400 truncate max-w-md">
                Tracking history for: <span className="text-cyan-300 font-mono">{share.file_name}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Refresh Logs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="mt-4 max-h-96 overflow-y-auto pr-1">
          {loading && logs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
              Loading security audit records...
            </div>
          ) : error ? (
            <div className="py-8 text-center text-rose-400 text-sm">
              Failed to load audit logs: {error}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No download attempts recorded for this burner link yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {logs.map((log) => {
                const device = parseDevice(log.user_agent);
                const DeviceIcon = device.icon;
                const formattedTime = new Date(log.accessed_at).toLocaleString();

                return (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="p-2 rounded-lg bg-slate-800/80 text-slate-300 flex-shrink-0">
                        <DeviceIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono font-medium text-slate-200">
                            {log.ip_address || "Unknown IP"}
                          </span>
                          <span className="text-[10px] text-slate-500">•</span>
                          <span className="text-xs text-slate-400">{device.label}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate max-w-sm mt-0.5">
                          {log.user_agent || "No User-Agent provided"}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="mb-1">{getStatusBadge(log.status)}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{formattedTime}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span>Total Recorded Events: {logs.length}</span>
          <span className="font-mono text-cyan-400/80">Tamper-Evident DB Audit Logging</span>
        </div>
      </div>
    </div>
  );
}
