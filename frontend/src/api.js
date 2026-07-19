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

export const api = {
  setToken: (token) => { authToken = token; },
  
  get: async (endpoint) => {
    const res = await fetch(`${API_URL}${endpoint}`, { headers: getHeaders() });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
    return res.json();
  },
  put: async (endpoint, body) => {
    const res = await fetch(`${API_URL}${endpoint}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(body) });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
    return res.json();
  },
  delete: async (endpoint) => {
    const res = await fetch(`${API_URL}${endpoint}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
    return res.json();
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

  async getRecords() {
    const res = await fetch(`${API_URL}/records`, { headers: getHeaders() });
    const data = await res.json();
    return data.data || [];
  },

  async addRecord(record) {
    const res = await fetch(`${API_URL}/records`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(record)
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

  async getGlobalAnalytics() {
    const res = await fetch(`${API_URL}/admin/analytics`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch analytics');
    return data.data;
  },

  async getAdminSettings() {
    const res = await fetch(`${API_URL}/admin/settings`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch settings');
    return data.data;
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

  downloadExport() {
    window.open(`${API_URL}/admin/export?token=${localStorage.getItem('ipo_token')}`, '_blank');
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
        const err = await res.json();
        throw new Error(err.error || 'Failed to bulk import');
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
  }
};
