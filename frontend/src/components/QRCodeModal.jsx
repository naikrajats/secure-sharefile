import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, ExternalLink, ShieldCheck } from 'lucide-react';

export default function QRCodeModal({ shareUrl, fileName, onClose }) {
  const [copied, setCopied] = useState(false);
  const fullUrl = `${window.location.origin}${shareUrl}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm glass-panel p-6 rounded-2xl border border-cyan-500/20 shadow-2xl text-center">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="mb-4">
          <div className="inline-flex p-2 rounded-xl bg-cyan-500/10 text-cyan-400 mb-2">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Scan to Burn & Download</h3>
          <p className="text-xs text-slate-400 truncate max-w-xs mx-auto mt-0.5">
            {fileName}
          </p>
        </div>

        {/* QR Code Canvas */}
        <div className="p-4 bg-white rounded-xl inline-block shadow-inner mx-auto mb-4">
          <QRCodeSVG 
            value={fullUrl} 
            size={180}
            level="M"
            includeMargin={true}
          />
        </div>

        <p className="text-[11px] text-slate-400 mb-3">
          Point any smartphone camera to test self-destructing download in real-time.
        </p>

        {/* Copy Link Input */}
        <div className="flex items-center space-x-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 mb-4">
          <input 
            type="text" 
            readOnly 
            value={fullUrl}
            className="bg-transparent text-xs text-slate-300 px-2 flex-1 focus:outline-none truncate font-mono"
          />
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold border border-cyan-500/30 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>

        {/* Open in New Tab */}
        <a
          href={shareUrl}
          target="_blank"
          rel="noreferrer"
          className="w-full inline-flex items-center justify-center space-x-2 py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Open Recipient Page</span>
        </a>
      </div>
    </div>
  );
}
