import React, { useState } from 'react';
import { X, Upload, Flame, Lock, Clock, ShieldCheck, Copy, Check, Eye, EyeOff, FileText, CheckCircle2, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../api';
import ShareDeliveryOptions from './ShareDeliveryOptions';

export default function ShareModal({ onClose, onShareCreated, existingFiles = [] }) {
  const [file, setFile] = useState(null);
  const [selectedFileId, setSelectedFileId] = useState("");
  const [mode, setMode] = useState("upload"); // "upload" or "existing"
  
  // Share options
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
  
  // Status states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [createdShare, setCreatedShare] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      let targetFileId = selectedFileId;

      if (mode === "upload") {
        if (!file) {
          throw new Error("Please select a file to upload");
        }
        const uploadedFile = await api.uploadFile(file);
        targetFileId = uploadedFile.id;
      }

      if (!targetFileId) {
        throw new Error("No file selected");
      }

      const share = await api.createShare(
        targetFileId,
        Number(expiresInMins),
        burnAfterReading ? 1 : Number(maxDownloads),
        password,
        burnAfterReading,
        recipientEmails.split(/[,;\n]/).map((email) => email.trim()).filter(Boolean),
        allowDownload
      );

      setCreatedShare(share);
      if (onShareCreated) onShareCreated(share);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fullShareUrl = createdShare ? `${window.location.origin}${createdShare.share_url}` : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(fullShareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative my-auto w-full max-w-xl max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain glass-panel p-6 sm:p-8 rounded-2xl border border-cyan-500/20 shadow-2xl">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!createdShare ? (
          <div>
            {/* Header */}
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Create Self-Destructing Share Link</h2>
                <p className="text-xs text-slate-400">Generate a tamper-proof link with dual time and count expiry</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* File Selection Tabs if existing files exist */}
              {existingFiles.length > 0 && (
                <div className="flex space-x-2 p-1 bg-slate-900/60 rounded-xl border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setMode("upload")}
                    className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                      mode === "upload" ? "bg-cyan-500 text-white shadow" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Upload New File
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("existing");
                      if (!selectedFileId && existingFiles.length > 0) setSelectedFileId(existingFiles[0].id);
                    }}
                    className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                      mode === "existing" ? "bg-cyan-500 text-white shadow" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Pick Existing Vault File ({existingFiles.length})
                  </button>
                </div>
              )}

              {/* File Input Area */}
              {mode === "upload" ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-2xl p-5 text-center transition-colors bg-slate-900/40 cursor-pointer relative"
                >
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center pointer-events-none">
                    <div className="p-3 rounded-full bg-slate-800/80 text-cyan-400 mb-2">
                      <Upload className="w-5 h-5" />
                    </div>
                    {file ? (
                      <div>
                        <p className="text-xs font-semibold text-cyan-300 truncate max-w-xs">{file.name}</p>
                        <p className="text-[11px] text-slate-400">{(file.size / 1024).toFixed(1)} KB • Ready for encryption</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-medium text-slate-300">
                          Click to browse or drag file here
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          PDF, XLSX, ZIP, Images, Docs up to 50MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Select File from Vault</label>
                  <select
                    value={selectedFileId}
                    onChange={(e) => setSelectedFileId(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    {existingFiles.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.original_name} ({(f.size_bytes / 1024).toFixed(1)} KB)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Expiry Selector */}
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
                      className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
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

              {/* Download Limit Selector */}
              <div>
                <label className="flex items-center space-x-1.5 text-xs font-medium text-slate-300 mb-2">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>Download Cap Expiration</span>
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

              {/* Burn After Reading Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
                <div className="flex items-center space-x-2.5">
                  <Flame className="w-4 h-4 text-rose-400" />
                  <div>
                    <p className="text-xs font-semibold text-rose-300">Burn After Reading</p>
                    <p className="text-[10px] text-slate-400">File is permanently shredded from storage after 1st download</p>
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
                <label htmlFor="share-recipients" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Invite SecureDrive users
                </label>
                <textarea
                  id="share-recipients"
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
                  <label htmlFor="share-allow-download" className="block text-xs font-medium text-slate-200">Allow downloading</label>
                  <p className="text-[10px] text-slate-500 mt-0.5">PDF, images, and text preview only; downloads are blocked.</p>
                </div>
                <input
                  id="share-allow-download"
                  type="checkbox"
                  checked={allowDownload}
                  onChange={(event) => {
                    setAllowDownload(event.target.checked);
                    if (!event.target.checked) setBurnAfterReading(false);
                  }}
                  className="w-4 h-4 accent-cyan-500"
                />
              </div>

              {/* Optional Passphrase */}
              <div>
                <label className="flex items-center space-x-1.5 text-xs font-medium text-slate-300 mb-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Optional Passphrase Protection</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave blank for open link access"
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 pr-10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !isValidExpiry || (mode === "upload" && !file) || (mode === "existing" && !selectedFileId)}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 mt-4"
              >
                {isSubmitting ? (
                  <span>Generating Cryptographic Token...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Generate Expiring Link</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* SUCCESS STATE */
          <div className="text-center py-2 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-white mb-1">Signed Burner Link Ready!</h3>
            <p className="text-xs text-slate-400 mb-4 truncate max-w-sm mx-auto">
              File: <span className="text-slate-200 font-medium">{createdShare.file_name}</span>
            </p>
            {!createdShare.allow_download && (
              <p className="text-xs text-cyan-300 mb-4">View-only link. Download requests are blocked.</p>
            )}

            {/* QR Code */}
            <div className="p-3 bg-white rounded-xl inline-block shadow-lg mb-4">
              <QRCodeSVG value={fullShareUrl} size={150} level="M" />
            </div>

            <p className="text-[11px] text-slate-400 mb-3">
              Scan with phone camera or copy signed URL below:
            </p>

            {/* Copy Link Input */}
            <div className="flex items-center space-x-2 bg-slate-900/90 p-2 rounded-xl border border-slate-800 mb-4 text-left">
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
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>

            <ShareDeliveryOptions
              fileName={createdShare.file_name}
              shareUrl={fullShareUrl}
              passphrase={password}
            />

            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Back to Vault
              </button>
              <a
                href={createdShare.share_url}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold shadow hover:opacity-95 transition-opacity inline-flex items-center justify-center space-x-1.5"
              >
                <span>Test Recipient View</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
