import React, { useEffect, useState } from 'react';
import { 
  X, 
  Download, 
  Share2, 
  FileText, 
  RefreshCw, 
  Eye, 
  Maximize2,
  Lock,
  ExternalLink
} from 'lucide-react';
import { api } from '../api';

export default function FilePreviewModal({ file, onClose, onShare }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    let createdUrl = null;

    const loadContent = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = await api.getFilePreviewBlob(file.id);
        if (active) {
          createdUrl = url;
          setBlobUrl(url);
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadContent();

    return () => {
      active = false;
      if (createdUrl) window.URL.revokeObjectURL(createdUrl);
    };
  }, [file.id]);

  const isImage = file.mime_type?.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.original_name);
  const isPdf = file.mime_type === "application/pdf" || /\.pdf$/i.test(file.original_name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl h-[85vh] glass-panel rounded-3xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0d1424]/90 flex-shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate max-w-md">
                {file.original_name}
              </h3>
              <p className="text-xs text-slate-400">
                {(file.size_bytes / 1024).toFixed(1)} KB • {file.mime_type || "Binary"}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Share Expiring Link */}
            <button
              onClick={() => {
                onClose();
                onShare(file);
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold border border-cyan-500/30 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Expiring Link</span>
            </button>

            {/* Direct Download */}
            <button
              onClick={() => api.downloadDirectFile(file.id, file.original_name)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              title="Download File"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 bg-black/60 flex items-center justify-center p-4 overflow-hidden relative">
          {loading ? (
            <div className="text-center text-slate-400 text-sm">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
              Decrypting and streaming from secure vault...
            </div>
          ) : error ? (
            <div className="text-center p-6 text-rose-400 text-sm max-w-sm">
              <p className="font-semibold mb-2">Preview unavailable</p>
              <p className="text-xs text-slate-400 mb-4">{error}</p>
              <button
                onClick={() => api.downloadDirectFile(file.id, file.original_name)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
              >
                Download to View
              </button>
            </div>
          ) : isImage ? (
            <img 
              src={blobUrl} 
              alt={file.original_name} 
              className="max-h-full max-w-full object-contain rounded-xl shadow-2xl" 
            />
          ) : isPdf ? (
            <iframe 
              src={blobUrl} 
              title={file.original_name} 
              className="w-full h-full rounded-xl bg-white/5 border border-slate-800" 
            />
          ) : (
            <div className="text-center max-w-md p-8 glass-card rounded-2xl border border-slate-800">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-white mb-2">{file.original_name}</h4>
              <p className="text-xs text-slate-400 mb-6">
                This file type (<code>{file.mime_type}</code>) is protected and ready for cryptographic sharing.
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => api.downloadDirectFile(file.id, file.original_name)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium inline-flex items-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download File</span>
                </button>
                <button
                  onClick={() => {
                    onClose();
                    onShare(file);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold inline-flex items-center space-x-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Create Expiring Link</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
