const API_BASE = window.location.origin.includes(":5173") ? "http://localhost:8000" : "";

export const getAuthToken = () => localStorage.getItem("secureshare_token");
export const setAuthToken = (token) => localStorage.setItem("secureshare_token", token);
export const removeAuthToken = () => localStorage.removeItem("secureshare_token");

const getHeaders = (isMultipart = false) => {
  const headers = {};
  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (!isMultipart) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
};

export const api = {
  // Authentication
  async login(email, password) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Login failed");
    const data = await res.json();
    setAuthToken(data.access_token);
    return data;
  },

  async register(email, password, fullName) {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Registration failed");
    const data = await res.json();
    setAuthToken(data.access_token);
    return data;
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Unauthorized");
    return res.json();
  },

  // Files
  async uploadFile(file) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/api/files/upload`, {
      method: "POST",
      headers: getHeaders(true),
      body: formData,
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Upload failed");
    return res.json();
  },

  async getFiles() {
    const res = await fetch(`${API_BASE}/api/files`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch files");
    return res.json();
  },

  async getStorageStats() {
    const res = await fetch(`${API_BASE}/api/files/storage/stats`, {
      headers: getHeaders(),
    });
    if (!res.ok) return { used_bytes: 0, quota_bytes: 524288000, percentage: 0, file_count: 0 };
    return res.json();
  },

  async downloadDirectFile(fileId, fileName) {
    const res = await fetch(`${API_BASE}/api/files/${fileId}/content?download=true`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to download file");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  async getFilePreviewBlob(fileId) {
    const res = await fetch(`${API_BASE}/api/files/${fileId}/content`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to load file preview");
    const blob = await res.blob();
    return window.URL.createObjectURL(blob);
  },

  async deleteFile(fileId) {
    const res = await fetch(`${API_BASE}/api/files/${fileId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete file");
    return res.json();
  },

  // Shares
  async createShare(fileId, expiresInMinutes, maxDownloads, password, burnAfterReading, recipientEmails = [], allowDownload = true) {
    const res = await fetch(`${API_BASE}/api/shares`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        file_id: fileId,
        expires_in_minutes: expiresInMinutes,
        max_downloads: maxDownloads,
        password: password || null,
        burn_after_reading: burnAfterReading,
        recipient_emails: recipientEmails,
        allow_download: allowDownload,
      }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Failed to create share link");
    return res.json();
  },

  async getShares() {
    const res = await fetch(`${API_BASE}/api/shares`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch shares");
    return res.json();
  },

  async revokeShare(shareId) {
    const res = await fetch(`${API_BASE}/api/shares/${shareId}/revoke`, {
      method: "POST",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to revoke share link");
    return res.json();
  },

  async getShareLogs(shareId) {
    const res = await fetch(`${API_BASE}/api/shares/${shareId}/logs`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch audit logs");
    return res.json();
  },

  // Public Recipient
  async getPublicShareInfo(token) {
    const res = await fetch(`${API_BASE}/api/public/shares/${token}/info`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Network error loading share preview");
    return res.json();
  },

  async downloadPublicShare(token, password = null) {
    const res = await fetch(`${API_BASE}/api/public/shares/${token}/download`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ password: password || null }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Download failed" }));
      throw new Error(err.detail || `Download failed with status ${res.status}`);
    }

    // Extract filename from Content-Disposition header
    let filename = "downloaded_file";
    const disposition = res.headers.get("Content-Disposition");
    if (disposition && disposition.indexOf("filename=") !== -1) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) filename = match[1];
    }

    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
    return { success: true, filename };
  },

  async previewPublicShare(token, password = null) {
    const res = await fetch(`${API_BASE}/api/public/shares/${token}/preview`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ password: password || null }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "Preview failed" }));
      throw new Error(error.detail || `Preview failed with status ${res.status}`);
    }
    return res.blob();
  },
};
