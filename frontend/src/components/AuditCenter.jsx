import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, Smartphone, Laptop, Globe, CheckCircle2, Lock, XCircle } from 'lucide-react';
import { api } from '../api';

export default function AuditCenter({ shares = [] }) {
  const [allLogs, setAllLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAllLogs = async () => {
    setLoading(true);
    try {
      const logPromises = shares.map(async (s) => {
        try {
          const logs = await api.getShareLogs(s.id);
          return logs.map((l) => ({ ...l, fileName: s.file_name, shareId: s.id }));
        } catch {
          return [];
        }
      });
      const results = await Promise.all(logPromises);
      const flattened = results.flat().sort((a, b) => new Date(b.accessed_at) - new Date(a.accessed_at));
      setAllLogs(flattened);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllLogs();
  }, [shares]);

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
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            <span>Downloaded</span>
          </span>
        );
      case "WRONG_PASSWORD":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Lock className="w-3 h-3" />
            <span>Bad Password</span>
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <XCircle className="w-3 h-3" />
            <span>Blocked (Expired)</span>
          </span>
        );
      case "EXHAUSTED":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <XCircle className="w-3 h-3" />
            <span>Limit Reached</span>
          </span>
        );
      case "REVOKED":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle className="w-3 h-3" />
            <span>Blocked (Revoked)</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-cyan-400" />
            <span>Global Security & Access Audit Center</span>
          </h2>
          <p className="text-xs text-slate-400">
            Real-time forensic logs of every download attempt across all Drive files
          </p>
        </div>

        <button
          onClick={fetchAllLogs}
          disabled={loading}
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
          title="Refresh Logs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
        </button>
      </div>

      {loading && allLogs.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mx-auto mb-2" />
          Aggregating tamper-evident audit logs...
        </div>
      ) : allLogs.length === 0 ? (
        <div className="glass-panel p-10 rounded-2xl border border-slate-800 text-center text-slate-400 text-xs">
          No download activity has been recorded yet.
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="py-3 px-4">Event Timestamp</th>
                  <th className="py-3 px-4">Target File</th>
                  <th className="py-3 px-4">Client IP</th>
                  <th className="py-3 px-4">Device & Browser</th>
                  <th className="py-3 px-4">Security Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {allLogs.map((log) => {
                  const device = parseDevice(log.user_agent);
                  const DeviceIcon = device.icon;
                  return (
                    <tr key={log.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {new Date(log.accessed_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-200">
                        {log.fileName}
                      </td>
                      <td className="py-3 px-4 font-mono text-cyan-300">
                        {log.ip_address || "Unknown"}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        <div className="flex items-center space-x-2">
                          <DeviceIcon className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate max-w-xs">{device.label}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(log.status)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
