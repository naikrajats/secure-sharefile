import React, { useState } from 'react';
import { 
  X, 
  Link as LinkIcon, 
  ShieldCheck, 
  Clock, 
  Flame, 
  Lock, 
  Copy, 
  Check, 
  QrCode, 
  Eye, 
  EyeOff, 
  Ban, 
  ExternalLink,
  ShieldAlert,
  FileText
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import CountdownTimer from './CountdownTimer';
import { api } from '../api';
import ShareDeliveryOptions from './ShareDeliveryOptions';

export default function DriveShareDialog({ file, shares = [], onClose, onShareCreated, onRevokeShare, onViewLogs }) {
  const [activeTab, setActiveTab] = useState("create"); // "create" or "manage"
  
  // Link settings
  const [expiryValue, setExpiryValue] = useState(1);
  const [expiryUnit, setExpiryUnit] = useState("hours");
  const expiryUnitMinutes = { minutes: 1, hours: 60, days: 1440 };
  const expiresInMins = Number(expiryValue) * expiryUnitMinutes[expiryUnit];
  const isValidExpiry = Number.isInteger(Number(expiryValue)) && Number(expiryValue) >= 1 && expiresInMins <= 10080;
  const [maxDownloads, setMaxDownloads] = useState(1);
  const [burnAfterReading, setBurnAfterReading] = useState(false);
  const [allowDownload, setAllowDownload] = useState(true);
  const [password, setPassword] = useState("");
  const [recipientEmails, setRecipientEmails] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Creation state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [newShare, setNewShare] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  // Filter existing shares for this file
  const fileShares = shares.filter((s) => s.file_id === file.id);

  const handleCreateLink = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const share = await api.createShare(
        file.id,
        Number(expiresInMins),
        burnAfterReading ? 1 : Number(maxDownloads),
        password,
        burnAfterReading,
        recipientEmails.split(/[,;\n]/).map((email) => email.trim()).filter(Boolean),
        allowDownload
      );
      setNewShare(share);
      if (onShareCreated) onShareCreated(share);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fullShareUrl = newShare ? `${window.location.origin}${newShare.share_url}` : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(fullShareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative my-auto w-full max-w-xl max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain glass-panel p-6 sm:p-7 rounded-3xl border border-cyan-500/25 shadow-2xl">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header (Google Drive Style) */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <LinkIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <span>Share</span>
              <span className="text-cyan-300 font-mono truncate max-w-xs sm:max-w-sm">
                "{file.original_name}"
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              General access: HMAC signed self-destructing links
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 border-b border-slate-800 mb-5 pb-2 text-xs">
          <button
            onClick={() => setActiveTab("create")}
            className={`py-1.5 px-3 rounded-lg font-semibold transition-all ${
              activeTab === "create"
                ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Create Burner Link
          </button>
          <button
            onClick={() => setActiveTab("manage")}
            className={`py-1.5 px-3 rounded-lg font-semibold transition-all ${
              activeTab === "manage"
                ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Active Links ({fileShares.filter((s) => s.status === "ACTIVE").length})
          </button>
        </div>

        {/* TAB 1: CREATE NEW LINK */}
        {activeTab === "create" && (
          <div>
            {!newShare ? (
              <form onSubmit={handleCreateLink} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                    {error}
                  </div>
                )}

                {/* Expiry selection */}
                <div>
                  <label className="flex items-center space-x-1.5 text-xs font-medium text-slate-300 mb-2">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Time-Based Expiration</span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "5 Mins", value: 5, unit: "minutes", minutes: 5 },
                      { label: "15 Mins", value: 15, unit: "minutes", minutes: 15 },
                      { label: "1 Hour", value: 1, unit: "hours", minutes: 60 },
                      { label: "24 Hours", value: 1, unit: "days", minutes: 1440 },
                    ].map((preset) => (
                      <button
                        type="button"
                        key={preset.minutes}
                        onClick={() => {
                          setExpiryValue(preset.value);
                          setExpiryUnit(preset.unit);
                        }}
                        className={`py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          expiresInMins === preset.minutes
                            ? "bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-sm"
                            : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Custom duration</label>
                    <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-2">
                      <input
                        type="number"
                        min="1"
                        max={Math.floor(10080 / expiryUnitMinutes[expiryUnit])}
                        step="1"
                        value={expiryValue}
                        onChange={(event) => setExpiryValue(event.target.value)}
                        className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                      <select
                        value={expiryUnit}
                        onChange={(event) => setExpiryUnit(event.target.value)}
                        aria-label="Custom duration unit"
                        className="bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                      </select>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Choose from 1 minute up to 7 days.</p>
                  </div>
                </div>

                {/* Download Cap */}
                <div>
                  <label className="flex items-center space-x-1.5 text-xs font-medium text-slate-300 mb-2">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>Download Limit (Kill Switch)</span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "1 Download", value: 1 },
                      { label: "3 Downloads", value: 3 },
                      { label: "5 Downloads", value: 5 },
                      { label: "Unlimited", value: 0 },
                    ].map((preset) => (
                      <button
                        type="button"
                        key={preset.value}
                        disabled={burnAfterReading}
                        onClick={() => setMaxDownloads(preset.value)}
                        className={`py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          maxDownloads === preset.value && !burnAfterReading
                            ? "bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-sm"
                            : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 disabled:opacity-40"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Burn after reading */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
                  <div className="flex items-center space-x-2.5">
                    <Flame className="w-4 h-4 text-rose-400" />
                    <div>
                      <p className="text-xs font-semibold text-rose-300">Burn After Reading</p>
                      <p className="text-[10px] text-slate-400">File is permanently shredded from disk after 1st download</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={burnAfterReading}
                    disabled={!allowDownload}
                    onChange={(e) => {
                      setBurnAfterReading(e.target.checked);
                      if (e.target.checked) setMaxDownloads(1);
                    }}
                    className="w-4 h-4 text-rose-600 rounded bg-slate-800 border-slate-700 focus:ring-rose-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label htmlFor="drive-share-recipients" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Invite SecureDrive users
                  </label>
                  <textarea
                    id="drive-share-recipients"
                    rows="2"
                    value={recipientEmails}
                    onChange={(event) => setRecipientEmails(event.target.value)}
                    placeholder="name@example.com, another@example.com"
                    className="w-full resize-y bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Leave blank for anyone with the link. Invited accounts must sign in.</p>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <label htmlFor="drive-share-allow-download" className="block text-xs font-medium text-slate-200">Allow downloading</label>
                    <p className="text-[10px] text-slate-500 mt-0.5">PDF, images, and text preview only; downloads are blocked.</p>
                  </div>
                  <input
                    id="drive-share-allow-download"
                    type="checkbox"
                    checked={allowDownload}
                    onChange={(event) => {
                      setAllowDownload(event.target.checked);
                      if (!event.target.checked) setBurnAfterReading(false);
                    }}
                    className="w-4 h-4 accent-cyan-500"
                  />
                </div>

                {/* Passphrase */}
                <div>
                  <label className="flex items-center space-x-1.5 text-xs font-medium text-slate-300 mb-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Optional Secret Passphrase</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Leave blank for open access"
                      className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Action button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !isValidExpiry}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center space-x-2 mt-4"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isSubmitting ? "Signing Token..." : "Generate Signed Expiring Link"}</span>
                </button>
              </form>
            ) : (
              /* Success Link Generated */
              <div className="text-center py-2 animate-fade-in">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl mb-4 text-emerald-400 text-xs font-semibold flex items-center justify-center space-x-2">
                  <Check className="w-4 h-4" />
                  <span>Burner Link Created & Cryptographically Signed!</span>
                </div>

                {showQr ? (
                  <div className="p-4 bg-white rounded-2xl inline-block shadow-xl mb-4">
                    <QRCodeSVG value={fullShareUrl} size={150} level="M" />
                  </div>
                ) : null}

                {/* Copy Link Input (Google Drive Style) */}
                <div className="flex items-center space-x-2 bg-slate-900 p-2 rounded-xl border border-slate-800 mb-4">
                  <input
                    type="text"
                    readOnly
                    value={fullShareUrl}
                    className="bg-transparent text-xs text-cyan-300 px-2 flex-1 focus:outline-none font-mono truncate"
                  />
                  <button
                    onClick={handleCopy}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold border border-cyan-500/30 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copied" : "Copy link"}</span>
                  </button>
                </div>

                <ShareDeliveryOptions
                  fileName={newShare.file_name}
                  shareUrl={fullShareUrl}
                  passphrase={password}
                />

                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowQr(!showQr)}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center justify-center space-x-1.5"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>{showQr ? "Hide QR" : "Show QR Code"}</span>
                  </button>

                  <a
                    href={newShare.share_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold border border-cyan-500/30 flex items-center justify-center space-x-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Link</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MANAGE ACTIVE LINKS ON THIS FILE */}
        {activeTab === "manage" && (
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {fileShares.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No share links have been generated for this file yet.
              </div>
            ) : (
              fileShares.map((s) => (
                <div 
                  key={s.id}
                  className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.status === "ACTIVE" 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-slate-800 text-slate-400"
                      }`}>
                        {s.status}
                      </span>
                      {!s.allow_download && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                          View only
                        </span>
                      )}

                      {s.status === "ACTIVE" ? (
                        <CountdownTimer expiresAt={s.expires_at} />
                      ) : (
                        <span className="text-slate-500 font-mono text-[10px]">
                          Expired
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 mt-1">
                      Downloads: <span className="font-mono text-cyan-300">{s.download_count}</span>
                      {s.max_downloads > 0 ? ` / ${s.max_downloads}` : ' (unlimited)'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {s.viewers_count || 0} unique viewer{s.viewers_count === 1 ? "" : "s"}
                      {s.recipient_emails?.length > 0 && ` · Shared with ${s.recipient_emails.join(", ")}`}
                    </p>
                    {s.viewers?.length > 0 && (
                      <details className="mt-1 text-[11px] text-slate-400">
                        <summary className="cursor-pointer text-cyan-300 hover:text-cyan-200">See who viewed</summary>
                        <ul className="mt-1 space-y-1 pl-3">
                          {s.viewers.map((viewer) => (
                            <li key={`${viewer.email || viewer.ip_address}-${viewer.viewed_at}`}>
                              {viewer.full_name || viewer.email || (viewer.ip_address ? `Guest (${viewer.ip_address})` : "Anonymous visitor")}
                              <span className="text-slate-500"> · {new Date(viewer.viewed_at).toLocaleString()}</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                    <button
                      onClick={() => onViewLogs(s)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                      title="View Access Logs"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                    </button>

                    {s.status === "ACTIVE" && (
                      <button
                        onClick={() => onRevokeShare(s.id)}
                        className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-500/10"
                        title="Revoke Link Now"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}
