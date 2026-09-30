  import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Plus, 
  ShieldCheck, 
  FolderLock, 
  Activity, 
  RefreshCw, 
  Lock, 
  Clock, 
  FileText,
  AlertCircle,
  Zap,
  ExternalLink,
  UploadCloud
} from 'lucide-react';
import Navbar from './components/Navbar';
import DriveSidebar from './components/DriveSidebar';
import DriveHeader from './components/DriveHeader';
import DriveFileGrid from './components/DriveFileGrid';
import DriveFileList from './components/DriveFileList';
import FilePreviewModal from './components/FilePreviewModal';
import DriveShareDialog from './components/DriveShareDialog';
import ShareModal from './components/ShareModal';
import ShareList from './components/ShareList';
import AuditCenter from './components/AuditCenter';
import AuditLogModal from './components/AuditLogModal';
import QRCodeModal from './components/QRCodeModal';
import RecipientView from './components/RecipientView';
import AuthModal from './components/AuthModal';
import OpenShareLinkModal from './components/OpenShareLinkModal';
import { api, getAuthToken, removeAuthToken } from './api';

export default function App() {
  const [user, setUser] = useState(null);
  const [shares, setShares] = useState([]);
  const [files, setFiles] = useState([]);
  const [storageStats, setStorageStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Drive Navigation & View Modes
  const [currentTab, setCurrentTab] = useState("drive"); // "drive", "shares", "audit"
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "list"
  const [searchQuery, setSearchQuery] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState("all");

  // Modals state
  const [showShareModal, setShowShareModal] = useState(false);
  const [showOpenShareModal, setShowOpenShareModal] = useState(false);
  const [authModalConfig, setAuthModalConfig] = useState({ open: false, isRegister: false });
  const [shareDialogFile, setShareDialogFile] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [activeQrShare, setActiveQrShare] = useState(null);
  const [activeLogShare, setActiveLogShare] = useState(null);

  // Recipient share token route detector
  const [shareToken, setShareToken] = useState(() => {
    const match = window.location.pathname.match(/\/share\/([a-zA-Z0-9_.-]+)/);
    if (match && match[1]) return match[1];
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("share")) return urlParams.get("share");
    const hashMatch = window.location.hash.match(/share\/([a-zA-Z0-9_.-]+)/);
    if (hashMatch && hashMatch[1]) return hashMatch[1];
    return null;
  });

  useEffect(() => {
    const handlePopState = () => {
      const match = window.location.pathname.match(/\/share\/([a-zA-Z0-9_.-]+)/);
      if (match && match[1]) {
        setShareToken(match[1]);
      } else {
        setShareToken(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const loadData = async () => {
    if (!getAuthToken()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const userData = await api.getMe();
      setUser(userData);
      const [sharesData, filesData, statsData] = await Promise.all([
        api.getShares(),
        api.getFiles(),
        api.getStorageStats(),
      ]);
      setShares(sharesData);
      setFiles(filesData);
      setStorageStats(statsData);
    } catch (err) {
      console.warn("Auth check:", err.message);
      removeAuthToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogout = () => {
    removeAuthToken();
    setUser(null);
    setShares([]);
    setFiles([]);
  };

  const handleRevoke = async (shareId) => {
    if (!window.confirm("Are you sure you want to permanently revoke this link? Anyone with the link will be blocked immediately.")) {
      return;
    }
    try {
      await api.revokeShare(shareId);
      loadData();
    } catch (err) {
      alert("Revoke failed: " + err.message);
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm("Permanently delete this file and all its active burner links from the vault?")) {
      return;
    }
    try {
      await api.deleteFile(fileId);
      loadData();
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  };

  const handleDirectUpload = async (file) => {
    try {
      setLoading(true);
      await api.uploadFile(file);
      await loadData();
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const navigateToDashboard = () => {
    window.history.pushState({}, "", "/");
    setShareToken(null);
  };

  const openSharedDocument = (token) => {
    window.history.pushState({}, "", `/share/${encodeURIComponent(token)}`);
    setShareToken(token);
    setShowOpenShareModal(false);
  };

  // If viewing a recipient share link
  if (shareToken) {
    return (
      <div className="min-h-screen bg-[#080d1a] text-slate-100 flex flex-col">
        <Navbar 
          user={user} 
          onLogout={handleLogout} 
          onOpenAuth={(isReg) => setAuthModalConfig({ open: true, isRegister: isReg })}
          onOpenShareLink={() => setShowOpenShareModal(true)}
          onViewChange={navigateToDashboard}
          currentView="recipient"
        />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
          <RecipientView key={user?.id || "guest"} token={shareToken} onBackToDashboard={navigateToDashboard} />
        </main>
        {showOpenShareModal && (
          <OpenShareLinkModal
            onClose={() => setShowOpenShareModal(false)}
            onOpen={openSharedDocument}
          />
        )}
      </div>
    );
  }

  // Filter Drive Files
  const filteredFiles = files.filter((f) => {
    const matchesSearch = f.original_name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (fileTypeFilter === "pdf") {
      return f.mime_type === "application/pdf" || f.original_name.toLowerCase().endsWith(".pdf");
    }
    if (fileTypeFilter === "sheet") {
      return (
        f.mime_type?.includes("spreadsheet") || 
        /\.(xlsx|xls|csv)$/i.test(f.original_name)
      );
    }
    if (fileTypeFilter === "image") {
      return (
        f.mime_type?.startsWith("image/") || 
        /\.(png|jpg|jpeg|svg|webp)$/i.test(f.original_name)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#080d1a] text-slate-100 flex flex-col">
      <Navbar 
        user={user} 
        onLogout={handleLogout} 
        onOpenAuth={(isReg) => setAuthModalConfig({ open: true, isRegister: isReg })}
        onOpenShareLink={() => setShowOpenShareModal(true)}
        onViewChange={navigateToDashboard}
        currentView="dashboard"
      />

      {/* Main Body */}
      {!user && !loading ? (
        /* Logged out state */
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-16 flex items-center justify-center">
          <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-cyan-500/20 text-center relative overflow-hidden shadow-2xl max-w-2xl">
            <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 mb-4 border border-cyan-500/20">
              <Flame className="w-8 h-8" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              SecureDrive — Google Drive with Expiring Burner Links
            </h1>
            <p className="text-sm sm:text-base text-slate-400 mt-3 leading-relaxed">
              Store confidential files with zero-knowledge encryption, browse files in Google Drive grid or list views, and generate time & download capped burner links.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setAuthModalConfig({ open: true, isRegister: true })}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-xl shadow-cyan-500/25 transition-all flex items-center justify-center space-x-2"
              >
                <span>Get Started — Create Free Account</span>
              </button>
              <button
                onClick={() => setAuthModalConfig({ open: true, isRegister: false })}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-sm border border-slate-700 transition-colors"
              >
                Sign In to Drive
              </button>
            </div>
          </div>
        </main>
      ) : (
        /* Logged in: Full Google Drive Experience */
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar */}
          <DriveSidebar
            currentTab={currentTab}
            onTabChange={setCurrentTab}
            onOpenUpload={() => setShowShareModal(true)}
            onOpenShareModal={() => setShowShareModal(true)}
            storageStats={storageStats}
            onUploadFile={handleDirectUpload}
          />

          {/* Right Main Drive Panel */}
          <main className="flex-1 p-6 sm:p-8 overflow-y-auto space-y-6">
            
            {/* TAB 1: MY DRIVE FILES */}
            {currentTab === "drive" && (
              <div className="space-y-6">
                <DriveHeader
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  fileTypeFilter={fileTypeFilter}
                  onFileTypeFilterChange={setFileTypeFilter}
                  onRefresh={loadData}
                  loading={loading}
                  totalFiles={files.length}
                />

                {loading && files.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 text-xs">
                    <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-3" />
                    Connecting to encrypted Drive vault...
                  </div>
                ) : viewMode === "grid" ? (
                  <DriveFileGrid
                    files={filteredFiles}
                    onShare={(f) => setShareDialogFile(f)}
                    onPreview={(f) => setPreviewFile(f)}
                    onDelete={handleDeleteFile}
                  />
                ) : (
                  <DriveFileList
                    files={filteredFiles}
                    onShare={(f) => setShareDialogFile(f)}
                    onPreview={(f) => setPreviewFile(f)}
                    onDelete={handleDeleteFile}
                  />
                )}
              </div>
            )}

            {/* TAB 2: ACTIVE BURNER LINKS */}
            {currentTab === "shares" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center space-x-2">
                      <Flame className="w-5 h-5 text-cyan-400" />
                      <span>Active & Expired Burner Links</span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      All cryptographic share links with live countdown timers and atomic download caps
                    </p>
                  </div>

                  <button
                    onClick={() => setShowShareModal(true)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Link</span>
                  </button>
                </div>

                <ShareList
                  shares={shares}
                  onRevoke={handleRevoke}
                  onViewLogs={(share) => setActiveLogShare(share)}
                  onShowQr={(share) => setActiveQrShare(share)}
                  onRefresh={loadData}
                />
              </div>
            )}

            {/* TAB 3: AUDIT CENTER */}
            {currentTab === "audit" && (
              <AuditCenter shares={shares} />
            )}

          </main>
        </div>
      )}

      {/* Google Drive Style Share Modal for a specific file */}
      {shareDialogFile && (
        <DriveShareDialog
          file={shareDialogFile}
          shares={shares}
          onClose={() => setShareDialogFile(null)}
          onShareCreated={() => loadData()}
          onRevokeShare={handleRevoke}
          onViewLogs={(share) => {
            setShareDialogFile(null);
            setActiveLogShare(share);
          }}
        />
      )}

      {/* In-Browser File Preview Lightbox */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          onShare={(f) => setShareDialogFile(f)}
        />
      )}

      {/* General Upload & Share Modal */}
      {showShareModal && (
        <ShareModal
          existingFiles={files}
          onClose={() => setShowShareModal(false)}
          onShareCreated={() => loadData()}
        />
      )}

      {/* QR Code Presentation Modal */}
      {activeQrShare && (
        <QRCodeModal
          shareUrl={activeQrShare.share_url}
          fileName={activeQrShare.file_name}
          onClose={() => setActiveQrShare(null)}
        />
      )}

      {/* Specific Share Audit Trail Modal */}
      {activeLogShare && (
        <AuditLogModal
          share={activeLogShare}
          onClose={() => setActiveLogShare(null)}
        />
      )}

      {showOpenShareModal && (
        <OpenShareLinkModal
          onClose={() => setShowOpenShareModal(false)}
          onOpen={openSharedDocument}
        />
      )}

      {/* Auth Modal */}
      {authModalConfig.open && (
        <AuthModal
          initialRegister={authModalConfig.isRegister}
          onClose={() => setAuthModalConfig({ open: false, isRegister: false })}
          onAuthSuccess={(u) => {
            setUser(u);
            loadData();
          }}
        />
      )}
    </div>
  );
}
