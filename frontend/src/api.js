const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api');

let authToken = null;

const generateId = () => {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

const getHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  return headers;
};

const parseResponse = async (res) => {
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    if (!res.ok) {
      throw new Error(`Server error (${res.status}: ${res.statusText || 'Connection refused'})`);
    }
    throw new Error('Invalid JSON response');
  }
  if (!res.ok) {
    throw new Error(json.error || json.message || `Request failed (${res.status})`);
  }
  return json;
};

export const api = {
  setToken: (token) => { authToken = token; },
  
  get: async (endpoint) => {
    const res = await fetch(`${API_URL}${endpoint}`, { headers: getHeaders() });
    return parseResponse(res);
  },
  post: async (endpoint, body) => {
    const res = await fetch(`${API_URL}${endpoint}`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) });
    return parseResponse(res);
  },
  put: async (endpoint, body) => {
    const res = await fetch(`${API_URL}${endpoint}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(body) });
    return parseResponse(res);
  },
  delete: async (endpoint) => {
    const res = await fetch(`${API_URL}${endpoint}`, { method: 'DELETE', headers: getHeaders() });
    return parseResponse(res);
  },

  login: async (credentials) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials)
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
    return res.json();
  },
  
  register: async (credentials) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials)
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
    return res.json();
  },

  getMe: async () => {
    const res = await fetch(`${API_URL}/auth/me`, { headers: getHeaders() });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
    return res.json();
  },

  async getSessions() {
    const res = await fetch(`${API_URL}/sessions`, { headers: getHeaders() });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to fetch active sessions'); }
    const data = await res.json();
    return data.data || [];
  },

  async revokeSession(sessionId) {
    const res = await fetch(`${API_URL}/sessions/${sessionId}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to revoke session'); }
    return res.json();
  },

  async revokeAllSessions() {
    const res = await fetch(`${API_URL}/sessions/logout-all`, { method: 'POST', headers: getHeaders() });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to revoke sessions'); }
    return res.json();
  },

  async getRecords() {
    const res = await fetch(`${API_URL}/records`, { headers: getHeaders() });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to fetch records'); }
    const data = await res.json();
    return data.data || [];
  },

  async addRecord(record) {
    const payload = { 
      ...record, 
      id: record.id || generateId(), 
      createdAt: record.createdAt || new Date().toISOString() 
    };
    const res = await fetch(`${API_URL}/records`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    return data;
  },

  async registerFcmToken(token) {
    const res = await fetch(`${API_URL}/notifications/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ token })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to register token');
    return data;
  },

  async autoCheckAllotment(payload) {
    const res = await fetch(`${API_URL}/allotment/auto-check`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to auto check allotment');
    return data;
  },

  async testNotification() {
    const res = await fetch(`${API_URL}/notifications/test`, {
      method: 'POST',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to trigger notification');
    return data;
  },

  async getNotificationLogs() {
    const res = await fetch(`${API_URL}/admin/notifications/logs`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch logs');
    return data.data || [];
  },

  async broadcastNotification(title, body) {
    const res = await fetch(`${API_URL}/admin/notifications/broadcast`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ title, body })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to broadcast notification');
    return data;
  },

  async sendTestEmail(smtpConfig) {
    const res = await fetch(`${API_URL}/admin/test-email`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(smtpConfig)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send test email');
    return data;
  },

  async impersonateUser(userId) {
    const res = await fetch(`${API_URL}/admin/impersonate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ userId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to impersonate user');
    return data;
  },

  async bulkUpdateUsers(payload) {
    const res = await fetch(`${API_URL}/admin/users/bulk-update`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to bulk update users');
    return data;
  },

  async bulkNotifyUsers(payload) {
    const res = await fetch(`${API_URL}/admin/users/bulk-notify`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to bulk notify users');
    return data;
  },

  async getGlobalAnalytics() {
    const res = await fetch(`${API_URL}/admin/analytics`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch global analytics');
    return data.data || data;
  },

  async getAdminSettings() {
    const res = await fetch(`${API_URL}/admin/settings`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch admin settings');
    return data.data || data;
  },

  async saveAdminSetting(key, value) {
    const res = await fetch(`${API_URL}/admin/settings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ key, value })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save admin setting');
    return data;
  },

  async getAuditLogs() {
    const res = await fetch(`${API_URL}/admin/audit-logs`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch audit logs');
    return data.data || [];
  },

  async getLiveConsole() {
    const res = await fetch(`${API_URL}/admin/console`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch console logs');
    return data.data || [];
  },

  async getCronJobs() {
    const res = await fetch(`${API_URL}/admin/cron`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch cron status');
    return data;
  },

  async triggerCronJob(job) {
    const res = await fetch(`${API_URL}/admin/cron/trigger`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ job })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to trigger cron job');
    return data;
  },

  async saveAdminSetting(key, value) {
    const res = await fetch(`${API_URL}/admin/settings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ key, value })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save setting');
    return data;
  },

  async getAuditLogs() {
    const res = await fetch(`${API_URL}/admin/audit_logs`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch audit logs');
    return data.data;
  },

  async getCronJobs() {
    const res = await fetch(`${API_URL}/admin/cron`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch cron status');
    return data;
  },

  async triggerCronJob(job) {
    const res = await fetch(`${API_URL}/admin/cron/trigger`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ job })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to trigger job');
    return data;
  },

  async bulkNotifyUsers(payload) {
    const res = await fetch(`${API_URL}/admin/users/bulk-notify`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to bulk notify');
    return data;
  },

  async bulkUpdateUsers(payload) {
    const res = await fetch(`${API_URL}/admin/users/bulk-update`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to bulk update users');
    return data;
  },

  async downloadBackup() {
    const res = await fetch(`${API_URL}/admin/backup`, { headers: getHeaders() });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to download backup');
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `database_backup_${new Date().toISOString().split('T')[0]}.sqlite`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  },

  async getLiveConsole() {
    const res = await fetch(`${API_URL}/admin/console`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch logs');
    return data.data;
  },

  async downloadExport() {
    const res = await fetch(`${API_URL}/admin/export`, { headers: getHeaders() });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to export data');
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `platform_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  async impersonateUser(id) {
    const res = await fetch(`${API_URL}/admin/impersonate/${id}`, { method: 'POST', headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to impersonate');
    return data;
  },

  async getFcmConfig() {
    const res = await fetch(`${API_URL}/settings/fcm-web`);
    return res.json();
  },

  async saveFcmConfig(webConfig, serviceAccount) {
    const res = await fetch(`${API_URL}/settings/fcm`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ webConfig, serviceAccount })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save config');
    return data;
  },

  async bulkAddRecords(records) {
    const res = await fetch(`${API_URL}/records/bulk`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ records })
    });
    if (!res.ok) {
      let errorMsg = 'Failed to bulk import';
      try {
        const err = await res.json();
        errorMsg = err.error || errorMsg;
      } catch (e) {
        errorMsg = `Server error (${res.status} ${res.statusText})`;
      }
      throw new Error(errorMsg);
    }
    return res.json();
  },

  async updateRecord(id, record) {
    const res = await fetch(`${API_URL}/records/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(record)
    });
    return res.json();
  },

  async deleteRecord(id) {
    const res = await fetch(`${API_URL}/records/${id}`, {
      method: 'DELETE', headers: getHeaders()
    });
    return res.json();
  },
  // --- Applicants API ---
  getApplicants: async () => {
    const res = await fetch(`${API_URL}/applicants`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch applicants');
    const json = await res.json();
    return json.data;
  },

  addApplicant: async (data) => {
    const res = await fetch(`${API_URL}/applicants`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ ...data, id: generateId(), createdAt: new Date().toISOString() })
    });
    if (!res.ok) throw new Error('Failed to add applicant');
    return res.json();
  },

  updateApplicant: async (id, data) => {
    const res = await fetch(`${API_URL}/applicants/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update applicant');
    return res.json();
  },

  deleteApplicant: async (id) => {
    const res = await fetch(`${API_URL}/applicants/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to delete applicant');
    return res.json();
  },

  // --- Phase 2 API ---
  async getPublicSettings() {
    const res = await fetch(`${API_URL}/settings/public`);
    const data = await res.json();
    return data.data;
  },

  async getEmailTemplates() {
    const res = await fetch(`${API_URL}/admin/templates`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch templates');
    return data.data;
  },

  async createEmailTemplate(payload) {
    const res = await fetch(`${API_URL}/admin/templates`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create template');
    return data.template;
  },

  async updateEmailTemplate(id, payload) {
    const res = await fetch(`${API_URL}/admin/templates/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update template');
    return data;
  },

  async deleteEmailTemplate(id) {
    const res = await fetch(`${API_URL}/admin/templates/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete template');
    return data;
  },

  // --- 2FA API ---
  async login2FA(username, token) {
    const res = await fetch(`${API_URL}/auth/login/2fa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, token })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Invalid 2FA token');
    return data;
  },

  async setup2FA() {
    const res = await fetch(`${API_URL}/auth/2fa/setup`, {
      method: 'POST',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to setup 2FA');
    return data;
  },

  async verify2FA(token) {
    const res = await fetch(`${API_URL}/auth/2fa/verify`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ token })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to verify 2FA');
    return data;
  },

  async disable2FA(token) {
    const res = await fetch(`${API_URL}/auth/2fa/disable`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ token })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to disable 2FA');
    return data;
  },

  // --- Notification Preferences API ---
  async getNotificationPreferences() {
    const res = await fetch(`${API_URL}/users/notification-preferences`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to get notification preferences');
    return data.data;
  },

  async updateNotificationPreferences(prefs) {
    const res = await fetch(`${API_URL}/users/notification-preferences`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(prefs)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update preferences');
    return data;
  },

  // --- Notifications Inbox API ---
  async getNotifications() {
    const res = await fetch(`${API_URL}/notifications`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch notifications');
    return data.data || [];
  },

  async markNotificationRead(id) {
    const res = await fetch(`${API_URL}/notifications/${id}/read`, {
      method: 'PUT',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to mark notification read');
    return data;
  },

  async markAllNotificationsRead() {
    const res = await fetch(`${API_URL}/notifications/read-all`, {
      method: 'PUT',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to mark all read');
    return data;
  },

  async deleteNotification(id) {
    const res = await fetch(`${API_URL}/notifications/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete notification');
    return data;
  },

  // --- PDF Parser API ---
  async parseAllotmentPdf(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const headers = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    
    const res = await fetch(`${API_URL}/records/parse-allotment-pdf`, {
      method: 'POST',
      headers,
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to parse PDF');
    return data.matches || [];
  },

  // --- Sessions API ---
  async getSessions() {
    const res = await fetch(`${API_URL}/sessions`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch sessions');
    return data.data || [];
  },

  async revokeSession(id) {
    const res = await fetch(`${API_URL}/sessions/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to revoke session');
    return data;
  },

  async revokeAllSessions() {
    const res = await fetch(`${API_URL}/sessions/logout-all`, {
      method: 'POST',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to revoke all sessions');
    return data;
  },

  // --- Self-Service API ---
  async exportAllUserData() {
    const res = await fetch(`${API_URL}/users/export-all`, { headers: getHeaders() });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to export data');
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ipo_tracker_profile_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  async deleteUserAccount() {
    const res = await fetch(`${API_URL}/users/delete-account`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete account');
    return data;
  },

  // --- Tax Report API ---
  async downloadItrTaxReport() {
    const res = await fetch(`${API_URL}/reports/itr-tax-export`, { headers: getHeaders() });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to export tax report');
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `itr2_schedule_cg_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  // --- GMP Alerts API ---
  async getGmpAlerts() {
    const res = await fetch(`${API_URL}/gmp-alerts`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch GMP alerts');
    return data.data || [];
  },

  async addGmpAlert(payload) {
    const res = await fetch(`${API_URL}/gmp-alerts`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add alert');
    return data;
  },

  async deleteGmpAlert(id) {
    const res = await fetch(`${API_URL}/gmp-alerts/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete alert');
    return data;
  },

  // --- Batch Apply API (Feature 5) ---
  async batchApply(payload) {
    const res = await fetch(`${API_URL}/records/batch-apply`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to batch apply');
    return data;
  },

  // --- Telegram API ---
  async getTelegramSettings() {
    const res = await fetch(`${API_URL}/user/telegram`, { headers: getHeaders() });
    const data = await parseResponse(res);
    return data.data;
  },

  async saveTelegramSettings(payload) {
    const res = await fetch(`${API_URL}/user/telegram`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return parseResponse(res);
  },

  async testTelegramBot(chatId, botToken) {
    const res = await fetch(`${API_URL}/webhooks/telegram/test`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ chatId, botToken })
    });
    return parseResponse(res);
  },

  // --- Passcode PIN API ---
  async getPinStatus() {
    const res = await fetch(`${API_URL}/user/pin/status`, { headers: getHeaders() });
    const data = await parseResponse(res);
    return data.enabled;
  },

  async setPin(pin) {
    const res = await fetch(`${API_URL}/user/pin`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ action: 'set', pin })
    });
    return parseResponse(res);
  },

  async verifyPin(pin) {
    const res = await fetch(`${API_URL}/user/pin`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ action: 'verify', pin })
    });
    return parseResponse(res);
  },

  async disablePin() {
    const res = await fetch(`${API_URL}/user/pin`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ action: 'disable' })
    });
    return parseResponse(res);
  },

  // --- PAN & Batch ASBA API ---
  async checkDuplicatePan(pan, ipoName) {
    const res = await fetch(`${API_URL}/records/check-duplicate-pan`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ pan, ipoName })
    });
    return parseResponse(res);
  },

  async generateBatchAsba(payload) {
    const res = await fetch(`${API_URL}/records/batch-asba`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return parseResponse(res);
  }
};
