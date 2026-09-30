import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Clock, 
  Lock, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  ShieldCheck, 
  ShieldAlert, 
  RefreshCw,
  Eye,
  EyeOff,
  ArrowLeft
} from 'lucide-react';
import CountdownTimer from './CountdownTimer';
import { api } from '../api';

export default function RecipientView({ token, onBackToDashboard }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Download states
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloadError, setDownloadError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewText, setPreviewText] = useState(null);

  const fetchInfo = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const data = await api.getPublicShareInfo(token);
      setInfo(data);
    } catch (err) {
      setError(err.message || "Failed to load link preview");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchInfo();
  }, [token]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleDownload = async (e) => {
    if (e) e.preventDefault();
    setDownloadError(null);
    setDownloading(true);

    try {
      await api.downloadPublicShare(token, password);
      setDownloadSuccess(true);
      // Refresh info to reflect new download count or burn state
      setTimeout(fetchInfo, 1000);
    } catch (err) {
      setDownloadError(err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handlePreview = async (e) => {
    if (e) e.preventDefault();
    setDownloadError(null);
    setDownloading(true);

    try {
      const blob = await api.previewPublicShare(token, password);
      if (info.mime_type?.startsWith("text/")) {
        setPreviewUrl(null);
        setPreviewText(await blob.text());
      } else {
        setPreviewText(null);
        setPreviewUrl(URL.createObjectURL(blob));
      }
    } catch (err) {
      setDownloadError(err.message);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-4">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-300">Verifying HMAC Cryptographic Signature...</p>
        <p className="text-xs text-slate-500 mt-1">Ensuring link integrity and checking server-side expiration</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 max-w-md mx-auto text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4 border border-rose-500/20">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-white mb-1">Cryptographic Link Error</h2>
        <p className="text-xs text-slate-400 mb-6">{error}</p>
        <div className="flex justify-center gap-2">
          <button
            onClick={() => fetchInfo()}
            className="px-4 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-xs font-medium transition-colors"
          >
            Retry
          </button>
          <button
            onClick={onBackToDashboard}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go to Vault Dashboard</span>
          </button>
        </div>
      </div>
    );
  }

  // Handle Invalid, Expired, Exhausted, Revoked states
  if (!info.valid) {
    let title = "Link Unavailable";
    let desc = info.error_message || "This secure link can no longer be accessed.";
    let icon = AlertTriangle;
    let colorClass = "text-amber-400 bg-amber-500/10 border-amber-500/20";

    if (info.status === "EXPIRED") {
      title = "Burner Link Expired";
      desc = "The time limit set by the sender has elapsed. Access to this file is permanently disabled.";
      colorClass = "text-amber-400 bg-amber-500/10 border-amber-500/20";
    } else if (info.status === "EXHAUSTED") {
      title = "Download Limit Exceeded";
      desc = `This link was capped at ${info.max_downloads} download(s) and has now self-destructed.`;
      colorClass = "text-purple-400 bg-purple-500/10 border-purple-500/20";
    } else if (info.status === "REVOKED") {
      title = "Access Revoked";
      desc = "The file owner has revoked this link from their dashboard. It is no longer accessible.";
      colorClass = "text-rose-400 bg-rose-500/10 border-rose-500/20";
    } else if (info.status === "INVALID_SIGNATURE") {
      title = "Tampered / Invalid Token";
      desc = "The cryptographic HMAC signature does not match. The URL has been modified or corrupted.";
      colorClass = "text-rose-500 bg-rose-500/10 border-rose-500/30";
      icon = ShieldAlert;
    } else if (info.status === "AUTH_REQUIRED") {
      title = "Sign-in required";
      desc = info.error_message || "Sign in with an invited SecureDrive account to view this document.";
      colorClass = "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
    }

    const IconComponent = icon;

    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-slate-800 text-center shadow-2xl animate-fade-in">
          <div className={`w-14 h-14 rounded-2xl ${colorClass} border flex items-center justify-center mx-auto mb-4`}>
            <IconComponent className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">{desc}</p>
          
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-400 mb-6">
            Status: <span className="text-rose-400 uppercase font-bold">{info.status}</span>
          </div>

          <button
            onClick={onBackToDashboard}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to SecureBurn Dashboard</span>
          </button>
        </div>
      </div>
    );
  }

  // ACTIVE LINK STATE
  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="w-full max-w-lg glass-panel p-6 sm:p-8 rounded-3xl border border-cyan-500/30 shadow-2xl shadow-cyan-500/10 animate-fade-in">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-6">
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Cryptographically Verified Link</span>
          </div>
          <button
            onClick={onBackToDashboard}
            className="text-slate-400 hover:text-slate-200 text-xs flex items-center space-x-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
        </div>

        {/* File Card */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 mb-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-cyan-500/25">
            <FileText className="w-7 h-7" />
          </div>

          <h3 className="text-base font-bold text-white break-words mb-1">
            {info.file_name}
          </h3>
          <p className="text-xs text-slate-400">
            {(info.size_bytes / 1024).toFixed(1)} KB • {info.mime_type || "Generic Binary"}
          </p>
          {!info.allow_download && (
            <span className="inline-flex mt-2 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[11px] font-semibold text-cyan-300">
              View only
            </span>
          )}

          {/* Badges / Kill Switches info */}
          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            {/* Live Expiry Countdown */}
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300">
              <Clock className="w-3.5 h-3.5" />
              <span>Expires in:</span>
              <CountdownTimer expiresAt={info.expires_at} onExpire={() => fetchInfo(false)} />
            </div>

            {/* Downloads left */}
            {info.downloads_left !== null && (
              <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
                <Flame className="w-3.5 h-3.5" />
                <span>
                  {info.downloads_left} {info.downloads_left === 1 ? 'download' : 'downloads'} left
                </span>
              </div>
            )}

            {info.burn_after_reading && (
              <span className="px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-[11px] font-semibold text-rose-300">
                🔥 Self-Destructs On Download
              </span>
            )}
          </div>
        </div>

        {/* Success Alert if downloaded */}
        {downloadSuccess && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-emerald-300">
              File Download Completed Successfully!
            </p>
            {info.burn_after_reading && (
              <p className="text-[11px] text-rose-300 mt-1">
                Notice: Burn-after-reading was active. The source file has been permanently purged from the server vault.
              </p>
            )}
          </div>
        )}

        {/* Error Alert */}
        {downloadError && (
          <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center">
            {downloadError}
          </div>
        )}

        {previewText !== null && (
          <pre className="mb-6 max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-200">
            {previewText}
          </pre>
        )}

        {previewUrl && (
          info.mime_type === "application/pdf" ? (
            <iframe
              title={`Preview of ${info.file_name}`}
              src={previewUrl}
              className="mb-6 h-[65vh] w-full rounded-xl border border-slate-800 bg-white"
            />
          ) : (
            <img
              src={previewUrl}
              alt={`Preview of ${info.file_name}`}
              className="mb-6 max-h-[65vh] w-full rounded-xl border border-slate-800 bg-slate-950 object-contain"
            />
          )
        )}

        {/* Download Form */}
        <form onSubmit={info.allow_download ? handleDownload : handlePreview} className="space-y-4">
          {info.requires_password && (
            <div>
              <label className="flex items-center space-x-1.5 text-xs font-medium text-slate-300 mb-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Enter Passphrase to Unlock</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter secret passphrase provided by sender"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={downloading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {downloading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{info.allow_download ? "Streaming Secure File..." : "Opening Preview..."}</span>
              </>
            ) : (
              <>
                {info.allow_download ? <Download className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{info.allow_download ? "Download File Securely" : previewUrl || previewText !== null ? "Refresh Preview" : "View Document"}</span>
              </>
            )}
          </button>
        </form>

        <p className="text-[10px] text-slate-500 text-center mt-4">
          {info.allow_download
            ? "Enforced by server-side access controls, download limits, and HMAC signature."
            : "View-only link. Download requests are blocked by the sender's sharing policy."}
          {" "}Access logged for audit.
        </p>
      </div>
    </div>
  );
}
