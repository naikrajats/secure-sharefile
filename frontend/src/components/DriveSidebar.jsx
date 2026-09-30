import React, { useRef } from 'react';
import { 
  FolderLock, 
  Flame, 
  ShieldAlert, 
  Cloud, 
  Plus, 
  Upload, 
  Link as LinkIcon,
  HardDrive,
  Trash2
} from 'lucide-react';

export default function DriveSidebar({ 
  currentTab, 
  onTabChange, 
  onOpenUpload, 
  onOpenShareModal,
  storageStats,
  onUploadFile
}) {
  const fileInputRef = useRef(null);

  const formatSize = (bytes) => {
    if (!bytes) return "0 KB";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFilePicked = (e) => {
    if (e.target.files && e.target.files[0]) {
      onUploadFile(e.target.files[0]);
    }
  };

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col justify-between p-4 bg-[#0a0f1d] border-r border-slate-800/80 min-h-[calc(100vh-4rem)]">
      
      {/* Top Part */}
      <div className="space-y-6">
        
        {/* + New Button (Google Drive Style) */}
        <div className="relative">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFilePicked} 
            className="hidden" 
          />
          
          <button
            onClick={() => onOpenUpload()}
            className="w-full flex items-center justify-center space-x-2.5 py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>New Upload & Share</span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          <button
            onClick={() => onTabChange("drive")}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              currentTab === "drive"
                ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>My Drive Files</span>
          </button>

          <button
            onClick={() => onTabChange("shares")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              currentTab === "shares"
                ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
            }`}
          >
            <div className="flex items-center space-x-3">
              <Flame className="w-4 h-4" />
              <span>Expiring Burner Links</span>
            </div>
          </button>

          <button
            onClick={() => onTabChange("audit")}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              currentTab === "audit"
                ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Security & Audit Logs</span>
          </button>
        </nav>
      </div>

      {/* Bottom Part: Storage Usage Indicator (Drive Style) */}
      <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300 mb-2">
          <Cloud className="w-4 h-4 text-cyan-400" />
          <span>Encrypted Storage</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-2">
          <div 
            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(5, Math.min(100, storageStats?.percentage || 0))}%` }}
          />
        </div>

        <div className="flex justify-between text-[11px] text-slate-400 font-mono">
          <span>{formatSize(storageStats?.used_bytes || 0)} used</span>
          <span>{formatSize(storageStats?.quota_bytes || 524288000)}</span>
        </div>

        <p className="text-[10px] text-slate-500 mt-2">
          Stored in zero-knowledge encrypted vault with UUID keys.
        </p>
      </div>
    </aside>
  );
}
