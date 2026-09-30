import React, { useState } from 'react';
import { 
  Flame, 
  Clock, 
  Lock, 
  Copy, 
  Check, 
  QrCode, 
  ShieldAlert, 
  Ban, 
  FileText, 
  ExternalLink,
  ChevronRight,
  Eye
} from 'lucide-react';
import CountdownTimer from './CountdownTimer';

export default function ShareList({ shares, onRevoke, onViewLogs, onShowQr, onRefresh }) {
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = (share) => {
    const fullUrl = `${window.location.origin}${share.share_url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(share.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (status, share) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Active</span>
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span>Expired (Time)</span>
          </span>
        );
      case "EXHAUSTED":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <span>Exhausted (Cap)</span>
          </span>
        );
      case "REVOKED":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span>Revoked</span>
          </span>
        );
      default:
        return null;
    }
  };

  if (!shares || shares.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-10 text-center border border-slate-800">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto mb-3">
          <Flame className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-200">No Burner Links Yet</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
          Upload a file to create your first cryptographic expiring share link with automatic self-destruction.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {shares.map((share) => {
        const isCopied = copiedId === share.id;
        const isActive = share.status === "ACTIVE";

        return (
          <div
            key={share.id}
            className={`glass-panel p-4 sm:p-5 rounded-2xl border transition-all ${
              isActive 
                ? "border-slate-800 hover:border-cyan-500/40 shadow-lg shadow-black/20" 
                : "border-slate-800/60 opacity-80"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              
              {/* Left: File info + Badges */}
              <div className="flex items-start space-x-3.5 min-w-0">
                <div className={`p-3 rounded-xl flex-shrink-0 ${
                  share.burn_after_reading 
                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                    : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                }`}>
                  {share.burn_after_reading ? <Flame className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <h4 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                      {share.file_name}
                    </h4>
                    {getStatusBadge(share.status, share)}
                    {share.burn_after_reading && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                        Burn on 1st Read
                      </span>
                    )}
                    {!share.allow_download && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                        View only
                      </span>
                    )}
                    {share.is_password_protected && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Passphrase Locked</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 mt-2 text-xs text-slate-400 flex-wrap gap-y-1">
                    <span>{(share.file_size_bytes / 1024).toFixed(1)} KB</span>
                    <span>•</span>
                    
                    {/* Downloads count */}
                    <span className="font-medium text-slate-300">
                      Downloads: <span className="font-mono text-cyan-300">{share.download_count}</span>
                      {share.max_downloads > 0 ? ` / ${share.max_downloads}` : ' (unlimited)'}
                    </span>

                    <span>•</span>

                    {/* Expiry countdown */}
                    <div className="flex items-center space-x-1">
                      <span>Expires:</span>
                      {isActive ? (
                        <CountdownTimer expiresAt={share.expires_at} onExpire={onRefresh} />
                      ) : (
                        <span className="text-slate-500 font-mono text-[11px]">
                          {new Date(share.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 text-[11px] text-slate-400">
                    <p>
                      {share.viewers_count || 0} unique viewer{share.viewers_count === 1 ? "" : "s"}
                      {share.recipient_emails?.length > 0 && ` · Shared with ${share.recipient_emails.join(", ")}`}
                    </p>
                    {share.viewers?.length > 0 && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-cyan-300 hover:text-cyan-200">
                          See who viewed
                        </summary>
                        <ul className="mt-1 space-y-1 pl-3">
                          {share.viewers.map((viewer) => (
                            <li key={`${viewer.email || viewer.ip_address}-${viewer.viewed_at}`}>
                              {viewer.full_name || viewer.email || (viewer.ip_address ? `Guest (${viewer.ip_address})` : "Anonymous visitor")}
                              <span className="text-slate-500"> · {new Date(viewer.viewed_at).toLocaleString()}</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center space-x-2 self-end sm:self-center flex-shrink-0">
                {/* Copy Link */}
                <button
                  onClick={() => handleCopy(share)}
                  className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 border border-slate-800 transition-colors"
                  title="Copy Share Link"
                >
                  {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>

                {/* QR Code */}
                <button
                  onClick={() => onShowQr(share)}
                  className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 border border-slate-800 transition-colors"
                  title="Display QR Code for Phone Scanning"
                >
                  <QrCode className="w-4 h-4" />
                </button>

                {/* Open preview in new tab */}
                <a
                  href={share.share_url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 border border-slate-800 transition-colors"
                  title="Open Recipient View"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>

                {/* View Audit Trail */}
                <button
                  onClick={() => onViewLogs(share)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                  title="View Access Audit Log"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Audit Logs ({share.audit_logs_count})</span>
                </button>

                {/* Revoke Button */}
                {isActive && (
                  <button
                    onClick={() => onRevoke(share.id)}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition-colors"
                    title="Revoke Link Immediately"
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
