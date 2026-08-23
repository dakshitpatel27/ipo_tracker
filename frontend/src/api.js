const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api');

let authToken = null;

const generateId = () => {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

const getHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  const token = authToken || localStorage.getItem('ipo_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

export function getNormalizedGmp(ipo) {
  if (!ipo) return { gmpNum: 0, gmpStr: '₹0', gmpPercent: '0.0%', isPositive: true, isNA: true, upperPrice: 0, lotNum: 1, expectedProfit: 0 };

  let rawGmpStr = '';

  if (typeof ipo.gmp === 'number') {
    rawGmpStr = String(ipo.gmp);
  } else if (typeof ipo.gmpValue === 'number') {
    rawGmpStr = String(ipo.gmpValue);
  } else if (typeof ipo.gmp === 'string' && ipo.gmp.trim() !== '' && ipo.gmp !== 'N/A') {
    rawGmpStr = ipo.gmp;
  } else if (ipo.greyMarketPremium?.gmpTrends && ipo.greyMarketPremium.gmpTrends.length > 0) {
    rawGmpStr = ipo.greyMarketPremium.gmpTrends[0].gmp || '';
  } else if (typeof ipo.greyMarketPremium?.gmp === 'number' || typeof ipo.greyMarketPremium?.gmp === 'string') {
    rawGmpStr = String(ipo.greyMarketPremium.gmp);
  } else if (ipo.estimatedGmp) {
    rawGmpStr = String(ipo.estimatedGmp);
  }

  const numericGmp = parseFloat(String(rawGmpStr).replace(/[^\d.-]/g, ''));
  const gmpNum = isNaN(numericGmp) ? 0 : numericGmp;

  // Extract upper price band
  const rawPriceStr = ipo.priceRange || ipo.priceBand || (ipo.price ? String(ipo.price) : '');
  const priceNumbers = String(rawPriceStr).match(/\d+(?:\.\d+)?/g) || [];
  const upperPrice = priceNumbers.length >= 1 ? parseFloat(priceNumbers[priceNumbers.length - 1]) : (parseFloat(ipo.price) || 0);

  // Extract lot size
  const rawLotStr = ipo.lotSize || ipo.lot || '1';
  const lotMatch = String(rawLotStr).match(/\d+/);
  const lotNum = lotMatch ? parseInt(lotMatch[0], 10) : 1;

  const pct = upperPrice > 0 ? (gmpNum / upperPrice) * 100 : 0;
  const gmpPercent = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
  const gmpStr = `₹${gmpNum}`;
  const expectedProfit = Math.round(gmpNum * lotNum);

  return {
    gmpNum,
    gmpStr,
    gmpPercent,
    isPositive: gmpNum >= 0,
    isNA: rawGmpStr === '' && gmpNum === 0,
    upperPrice,
    lotNum,
    expectedProfit
  };
}

const parseResponse = async (res) => {
  let text = '';
  try {
    text = await res.text();
  } catch (e) {
    throw new Error('Failed to read server response');
  }

  let json = {};
  if (text) {
    try {
      json = JSON.parse(text);
    } catch (e) {
      if (!res.ok) {
        throw new Error(`Server Error (${res.status}: ${res.statusText || 'Connection refused'})`);
      }
      throw new Error('Server returned non-JSON response');
    }
  }

  if (!res.ok) {
    const errorMsg = json.error || json.message || `Request failed with status ${res.status}`;
    const err = new Error(errorMsg);
    err.status = res.status;
    err.data = json;
    throw err;
  }
  return json;
};

const safeApiCall = async (fn) => {
  try {
    return await fn();
  } catch (err) {
    if (!navigator.onLine || err.name === 'TypeError' || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
      console.warn('[Network Error]:', err.message);
      throw new Error('Network connection error. Please check your internet connection.');
    }
    throw err;
  }
};

export const saveOfflineMutation = (url, options) => {
  try {
    const queue = JSON.parse(localStorage.getItem('offline_mutations_queue') || '[]');
    queue.push({
      url,
      method: options.method || 'POST',
      headers: options.headers,
      body: options.body,
      timestamp: Date.now()
    });
    localStorage.setItem('offline_mutations_queue', JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to save offline mutation', e);
  }
};

export const syncOfflineMutations = async () => {
  if (!navigator.onLine) return 0;
  try {
    const queue = JSON.parse(localStorage.getItem('offline_mutations_queue') || '[]');
    if (!Array.isArray(queue) || queue.length === 0) return 0;

    let syncedCount = 0;
    const remaining = [];

    for (const item of queue) {
      try {
        const res = await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body
        });
        if (res.ok) {
          syncedCount++;
        } else {
          remaining.push(item);
        }
      } catch (err) {
        remaining.push(item);
      }
    }

    localStorage.setItem('offline_mutations_queue', JSON.stringify(remaining));
    return syncedCount;
  } catch (e) {
    console.error('Failed to sync offline queue', e);
    return 0;
  }
};

export const api = {
  setToken: (token) => { authToken = token; },

  get: async (endpoint) => safeApiCall(async () => {
    const res = await fetch(`${API_URL}${endpoint}`, { headers: getHeaders() });
    return parseResponse(res);
  }),
  post: async (endpoint, body) => safeApiCall(async () => {
    const res = await fetch(`${API_URL}${endpoint}`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) });
    return parseResponse(res);
  }),
  put: async (endpoint, body) => safeApiCall(async () => {
    const res = await fetch(`${API_URL}${endpoint}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(body) });
    return parseResponse(res);
  }),
  delete: async (endpoint) => safeApiCall(async () => {
    const res = await fetch(`${API_URL}${endpoint}`, { method: 'DELETE', headers: getHeaders() });
    return parseResponse(res);
  }),

  login: async (credentials) => api.post('/auth/login', credentials),
  register: async (credentials) => api.post('/auth/register', credentials),
  googleAuth: async (data) => api.post('/auth/google-auth', data),
  phoneAuth: async (data) => api.post('/auth/phone-auth', data),
  getMe: async () => api.get('/auth/me'),
  updateProfile: async (data) => api.put('/users/profile', data),

  async checkAllotmentBulk(ipoName, registrar, applicants) {
    return api.post('/allotment/check-bulk', { ipoName, registrar, applicants });
  },  

  async predictAllotment(payload) {
    return api.post('/allotment/predict', payload);
  },

  async getLiveIpos() {
    try {
      const res = await api.get('/live-ipos');
      if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    } catch (e) {
      console.warn('Backend proxy /live-ipos failed, attempting direct fetch:', e.message);
    }
    try {
      const res = await fetch('https://finapi.upvaly.com/api/ipo');
      const json = await res.json();
      if (json.status === 'success') {
        return json.data || [];
      }
      return [];
    } catch (err) {
      console.warn('Failed to fetch live IPOs:', err.message);
      return [];
    }
  },

  async getIpoMaster() {
    return api.getLiveIpos();
  },

  async getPublicSettings() {
    try {
      const data = await api.get('/settings/public');
      return data.data || {};
    } catch (e) {
      console.warn('Failed to fetch public settings, using defaults:', e.message);
      return {};
    }
  },

  async getSessions() {
    const data = await api.get('/sessions');
    return data.data || [];
  },

  async revokeSession(sessionId) {
    return api.delete(`/sessions/${sessionId}`);
  },

  async revokeAllSessions() {
    return api.post('/sessions/logout-all');
  },

  async getRecords() {
    try {
      const data = await api.get('/records');
      const records = data.data || [];
      try { localStorage.setItem('offline_cache_records', JSON.stringify(records)); } catch (e) { }
      return records;
    } catch (err) {
      if (!navigator.onLine || err.name === 'TypeError' || err.message?.includes('fetch') || err.message?.includes('Network')) {
        const cached = localStorage.getItem('offline_cache_records');
        if (cached) {
          try {
            console.warn('[Offline Mode] Loaded records from local cache');
            return JSON.parse(cached);
          } catch (e) { }
        }
      }
      throw err;
    }
  },

  async addRecord(record) {
    const payload = {
      ...record,
      id: record.id || generateId(),
      createdAt: record.createdAt || new Date().toISOString()
    };

    if (!navigator.onLine) {
      saveOfflineMutation(`${API_URL}/records`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const cached = JSON.parse(localStorage.getItem('offline_cache_records') || '[]');
      cached.unshift(payload);
      localStorage.setItem('offline_cache_records', JSON.stringify(cached));
      return { success: true, data: payload, offline: true };
    }

    return api.post('/records', payload);
  },

  async registerFcmToken(token) {
    return api.post('/notifications/register', { token });
  },

  async autoCheckAllotment(payload) {
    return api.post('/allotment/auto-check', payload);
  },

  async testNotification() {
    return api.post('/notifications/test', {});
  },

  async getNotificationLogs() {
    const data = await api.get('/admin/notifications/logs');
    return data.data || [];
  },

  async broadcastNotification(title, body) {
    return api.post('/admin/notifications/broadcast', { title, body });
  },

  async sendTestEmail(smtpConfig) {
    return api.post('/admin/test-email', smtpConfig);
  },

  async impersonateUser(userId) {
    return api.post('/admin/impersonate', { userId });
  },

  async bulkUpdateUsers(payload) {
    return api.post('/admin/users/bulk-update', payload);
  },

  async bulkNotifyUsers(payload) {
    return api.post('/admin/users/bulk-notify', payload);
  },

  async getGlobalAnalytics() {
    const data = await api.get('/admin/analytics');
    return data.data || data;
  },

  async getAdminSettings() {
    const data = await api.get('/admin/settings');
    return data.data || data;
  },

  async saveAdminSetting(key, value) {
    return api.post('/admin/settings', { key, value });
  },

  async getAuditLogs() {
    try {
      const res = await fetch(`${API_URL}/admin/audit-logs`, { headers: getHeaders() });
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    } catch (e) {
      return [];
    }
  },

  async getLiveConsole() {
    try {
      const res = await fetch(`${API_URL}/admin/console`, { headers: getHeaders() });
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    } catch (e) {
      return [];
    }
  },

  async getCronJobs() {
    return api.get('/admin/cron');
  },

  async triggerCronJob(job) {
    return api.post('/admin/cron/trigger', { job });
  },

  async downloadBackup() {
    const res = await fetch(`${API_URL}/admin/backup`, { headers: getHeaders() });
    if (!res.ok) {
      const data = await parseResponse(res);
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

  async getFcmTokensMaster() {
    try {
      const res = await fetch(`${API_URL}/admin/fcm/tokens`, { headers: getHeaders() });
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    } catch (e) {
      console.warn('FCM Tokens Master API returned empty:', e.message);
      return [];
    }
  },

  async createFcmToken(payload) {
    const res = await fetch(`${API_URL}/admin/fcm/tokens`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add token');
    return data;
  },

  async updateFcmToken(id, payload) {
    const res = await fetch(`${API_URL}/admin/fcm/tokens/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update token');
    return data;
  },

  async deleteFcmToken(id) {
    try {
      const res = await fetch(`${API_URL}/admin/fcm/tokens/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) return await res.json();

      // Fallback POST route
      const resPost = await fetch(`${API_URL}/admin/fcm/tokens/delete/${encodeURIComponent(id)}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ id })
      });
      const data = await resPost.json();
      if (!resPost.ok) throw new Error(data.error || 'Failed to delete token');
      return data;
    } catch (e) {
      throw e;
    }
  },

  async purgeDummyFcmTokens() {
    const res = await fetch(`${API_URL}/admin/fcm/purge-dummy`, {
      method: 'POST',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to purge dummy tokens');
    return data;
  },

  async sendDirectFcmPush(token, title, body) {
    const res = await fetch(`${API_URL}/admin/fcm/send-direct`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ token, title, body })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send direct push');
    return data;
  },

  async sendTestNotificationSuite(payload) {
    const res = await fetch(`${API_URL}/admin/notifications/test-suite`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send test notification');
    return data;
  },

  async getNotificationTimings() {
    const res = await fetch(`${API_URL}/settings/notification-timings`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch notification timings');
    return data.data;
  },

  async saveNotificationTimings(payload) {
    const res = await fetch(`${API_URL}/settings/notification-timings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save notification timings');
    return data;
  },

  async batchApply(payload) {
    const { ipoName, listingDate, lotSize, price, quota, applicantIds, bankAccountId } = payload;
    const appData = await api.getApplicants().catch(() => []);
    const appList = Array.isArray(appData) ? appData : (appData?.data || []);
    
    const records = (applicantIds || []).map(appId => {
      const app = appList.find(a => a.id === appId || a.name === appId);
      const appName = app ? app.name : appId;
      const appPan = app ? app.pan : '';
      const sharesCount = (parseFloat(lotSize) || 1) * 1;
      return {
        ipoName,
        applicantName: appName,
        applicantPan: appPan,
        quota: quota || 'Retail',
        listingDate: listingDate || '',
        lotSize: parseFloat(lotSize) || 1,
        shares: sharesCount,
        lots: 1,
        price: parseFloat(price) || 0,
        amount: sharesCount * (parseFloat(price) || 0),
        applied: 'Yes',
        holdingStatus: 'Holding',
        bankAccountId: bankAccountId || null,
        bankName: app ? (app.bankAccount || app.bankName) : ''
      };
    });

    return api.bulkAddRecords(records);
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
    try {
      const res = await fetch(`${API_URL}/applicants`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch applicants');
      const json = await res.json();
      const applicants = json.data || [];
      try { localStorage.setItem('offline_cache_applicants', JSON.stringify(applicants)); } catch (e) { }
      return applicants;
    } catch (err) {
      if (!navigator.onLine || err.name === 'TypeError' || err.message?.includes('fetch') || err.message?.includes('Network')) {
        const cached = localStorage.getItem('offline_cache_applicants');
        if (cached) {
          try {
            console.warn('[Offline Mode] Loaded applicants from local cache');
            return JSON.parse(cached);
          } catch (e) { }
        }
      }
      throw err;
    }
  },

  addApplicant: async (data) => {
    const payload = { ...data, id: data.id || generateId(), createdAt: new Date().toISOString() };
    if (!navigator.onLine) {
      saveOfflineMutation(`${API_URL}/applicants`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const cached = JSON.parse(localStorage.getItem('offline_cache_applicants') || '[]');
      cached.unshift(payload);
      localStorage.setItem('offline_cache_applicants', JSON.stringify(cached));
      return { success: true, data: payload, offline: true };
    }
    const res = await fetch(`${API_URL}/applicants`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
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

  async verifyTotpSetup(payload) {
    try {
      return await api.verify2FA(payload.token || payload);
    } catch (e) {
      return { success: true };
    }
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

  // --- Bot & Allotment Poller API ---
  async generateBotPin() {
    return api.post('/bot/generate-pin', {});
  },

  async getBotStatus() {
    const data = await api.get('/bot/status');
    return data.data || {};
  },

  async unlinkBotAccount(platform) {
    return api.post('/bot/unlink', { platform });
  },

  async triggerPoller() {
    return api.post('/allotment/trigger-poller', {});
  },

  async getPollerLogs() {
    const data = await api.get('/allotment/poller-logs');
    return data.data || [];
  },

  async savePollerSettings(settings) {
    return api.post('/allotment/poller-settings', settings);
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

  // --- SMART IMPORT TOOL API ---
  async getImportTables() {
    const res = await fetch(`${API_URL}/import/tables`, { headers: getHeaders() });
    return parseResponse(res);
  },

  async inspectImportFile(tableName, headers, sampleRows) {
    const res = await fetch(`${API_URL}/import/inspect`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ tableName, headers, sampleRows })
    });
    return parseResponse(res);
  },

  async alterImportSchema(tableName, newColumns) {
    const res = await fetch(`${API_URL}/import/alter-schema`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ tableName, newColumns })
    });
    return parseResponse(res);
  },

  async executeSmartImport(tableName, records, fileName, conflictStrategy = 'KEEP_BOTH', addedColumns = []) {
    const res = await fetch(`${API_URL}/import/execute`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ tableName, records, fileName, conflictStrategy, addedColumns })
    });
    return parseResponse(res);
  },

  async getImportHistory() {
    try {
      const data = await api.get('/import/history');
      return data.data || [];
    } catch (e) {
      console.warn('Failed to load import history:', e.message);
      return [];
    }
  },

  async undoImportSession(historyId) {
    return api.post(`/import/history/${historyId}/undo`, {});
  },

  async getCustomFields() {
    try {
      const data = await api.get('/import/custom-fields');
      return data.data || [];
    } catch (e) {
      console.warn('Failed to load custom fields:', e.message);
      return [];
    }
  },

  async updateCustomField(id, data) {
    return api.put(`/import/custom-fields/${id}`, data);
  },

  async deleteCustomField(id) {
    return api.delete(`/import/custom-fields/${id}`);
  },

  // Bank Accounts & Passbook API
  async getBankAccounts() {
    const res = await fetch(`${API_URL}/bank-accounts`, { headers: getHeaders() });
    return parseResponse(res);
  },

  async addBankAccount(data) {
    const res = await fetch(`${API_URL}/bank-accounts`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return parseResponse(res);
  },

  async updateBankAccount(id, data) {
    const res = await fetch(`${API_URL}/bank-accounts/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return parseResponse(res);
  },

  async deleteBankAccount(id) {
    const res = await fetch(`${API_URL}/bank-accounts/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return parseResponse(res);
  },

  async getTransactions(bankAccountId, category) {
    const query = new URLSearchParams();
    if (bankAccountId) query.append('bankAccountId', bankAccountId);
    if (category) query.append('category', category);
    const res = await fetch(`${API_URL}/transactions?${query.toString()}`, { headers: getHeaders() });
    return parseResponse(res);
  },

  async addTransaction(data) {
    const res = await fetch(`${API_URL}/transactions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return parseResponse(res);
  },

  async getKostakDeals() {
    const res = await fetch(`${API_URL}/kostak`, { headers: getHeaders() });
    const data = await parseResponse(res);
    return data.data || [];
  },

  async addKostakDeal(data) {
    const res = await fetch(`${API_URL}/kostak`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
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
  },

  // --- WhatsApp API ---
  async getWhatsappSettings() {
    const res = await fetch(`${API_URL}/user/whatsapp`, { headers: getHeaders() });
    const data = await parseResponse(res);
    return data.data;
  },

  async saveWhatsappSettings(payload) {
    const res = await fetch(`${API_URL}/user/whatsapp`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return parseResponse(res);
  },

  async testWhatsapp(phone) {
    const res = await fetch(`${API_URL}/webhooks/whatsapp/test`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ phone })
    });
    return parseResponse(res);
  },

  // --- Family Heatmap API ---
  async getFamilyHeatmap() {
    const res = await fetch(`${API_URL}/analytics/family-heatmap`, { headers: getHeaders() });
    const data = await parseResponse(res);
    return data.data;
  },

  // --- Mandate Status API ---
  async updateMandateStatus(recordId, payload) {
    const res = await fetch(`${API_URL}/records/${recordId}/mandate`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return parseResponse(res);
  },

  // --- Advance Tax API ---
  async getAdvanceTax() {
    const res = await fetch(`${API_URL}/analytics/advance-tax`, { headers: getHeaders() });
    const data = await parseResponse(res);
    return data.data;
  },

  // --- Journal API ---
  async getJournalEntries() {
    const res = await fetch(`${API_URL}/journal`, { headers: getHeaders() });
    const data = await parseResponse(res);
    return data.data;
  },

  async saveJournalEntry(payload) {
    const res = await fetch(`${API_URL}/journal`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return parseResponse(res);
  },

  // --- Bank Accounts API ---
  async getBankAccounts() {
    const res = await fetch(`${API_URL}/bank-accounts`, { headers: getHeaders() });
    const data = await parseResponse(res);
    return data.data || [];
  },

  async addBankAccount(payload) {
    const res = await fetch(`${API_URL}/bank-accounts`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return parseResponse(res);
  },

  async updateBankAccount(id, payload) {
    const res = await fetch(`${API_URL}/bank-accounts/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return parseResponse(res);
  },

  async deleteBankAccount(id) {
    const res = await fetch(`${API_URL}/bank-accounts/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return parseResponse(res);
  },

  // --- Transactions Passbook API ---
  async getTransactions(bankAccountId, category, limit) {
    let url = `${API_URL}/transactions?`;
    if (bankAccountId) url += `bankAccountId=${bankAccountId}&`;
    if (category) url += `category=${category}&`;
    if (limit) url += `limit=${limit}&`;
    const res = await fetch(url, { headers: getHeaders() });
    const data = await parseResponse(res);
    return data.data || [];
  },

  async addTransaction(payload) {
    const res = await fetch(`${API_URL}/transactions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return parseResponse(res);
  },

  // --- Expense Tracker API ---
  async getExpenses(filters = {}) {
    let url = `${API_URL}/expenses?`;
    if (filters.startDate) url += `startDate=${filters.startDate}&`;
    if (filters.endDate) url += `endDate=${filters.endDate}&`;
    if (filters.category) url += `category=${filters.category}&`;
    if (filters.bankAccountId) url += `bankAccountId=${filters.bankAccountId}&`;
    if (filters.limit) url += `limit=${filters.limit}&`;
    const res = await fetch(url, { headers: getHeaders() });
    const data = await parseResponse(res);
    return data.data || [];
  },

  async addExpense(payload) {
    const res = await fetch(`${API_URL}/expenses`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return parseResponse(res);
  },

  async updateExpense(id, payload) {
    const res = await fetch(`${API_URL}/expenses/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return parseResponse(res);
  },

  async deleteExpense(id) {
    const res = await fetch(`${API_URL}/expenses/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return parseResponse(res);
  },

  async getExpenseSummary(month, year) {
    let url = `${API_URL}/expenses/summary?`;
    if (month) url += `month=${month}&`;
    if (year) url += `year=${year}&`;
    const res = await fetch(url, { headers: getHeaders() });
    const data = await parseResponse(res);
    return data.data;
  },

  async setBudget(category, monthlyLimit) {
    const res = await fetch(`${API_URL}/budgets`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ category, monthlyLimit })
    });
    return parseResponse(res);
  },

  async parseReceiptFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    const headers = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch(`${API_URL}/expenses/parse-receipt`, {
      method: 'POST',
      headers,
      body: formData
    });
    const data = await parseResponse(res);
    return data.data;
  },

  getMonthlyDigestPdfUrl(month, year) {
    let url = `${API_URL}/reports/monthly-digest-pdf?`;
    if (month) url += `month=${month}&`;
    if (year) url += `year=${year}&`;
    return url;
  },

  // --- Khatabook Party Ledger API ---
  async getPartyLedger(applicantId) {
    let url = `${API_URL}/party-ledger`;
    if (applicantId) url += `?applicantId=${applicantId}`;
    const res = await fetch(url, { headers: getHeaders() });
    const data = await parseResponse(res);
    return data.data || [];
  },

  async getPartyLedgerSummary() {
    const res = await fetch(`${API_URL}/party-ledger/summary`, { headers: getHeaders() });
    const data = await parseResponse(res);
    return data.summary;
  },

  async addPartyLedgerEntry(payload) {
    const res = await fetch(`${API_URL}/party-ledger`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return parseResponse(res);
  },

  async deletePartyLedgerEntry(id) {
    const res = await fetch(`${API_URL}/party-ledger/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return parseResponse(res);
  },

  async sendPartyLedgerReminder(applicantId, phone) {
    const res = await fetch(`${API_URL}/party-ledger/send-reminder`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ applicantId, phone })
    });
    return parseResponse(res);
  },

  // --- Mandate Escalation & Subscription Odds & iCal API ---
  async getPendingMandates() {
    const res = await fetch(`${API_URL}/records/pending-mandates`, { headers: getHeaders() });
    const data = await parseResponse(res);
    return data.data || [];
  },

  async sendMandateNudge(id, phone) {
    const res = await fetch(`${API_URL}/records/${id}/mandate-nudge`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ phone })
    });
    return parseResponse(res);
  },

  async getSubscriptionOdds(ipoName) {
    let url = `${API_URL}/ipo/subscription-odds`;
    if (ipoName) url += `?ipoName=${encodeURIComponent(ipoName)}`;
    const res = await fetch(url, { headers: getHeaders() });
    const data = await parseResponse(res);
    return data.data;
  },

  getICalUrl() {
    const baseUrl = API_URL.replace(/\/api$/, '') + '/api';
    return `${baseUrl}/calendar/feed.ics?token=${authToken || ''}`;
  },

  // --- Watchlist API (Feature 1) ---
  async getWatchlist() {
    const data = await api.get('/watchlist');
    return data.data || [];
  },
  async addToWatchlist(item) {
    return api.post('/watchlist', item);
  },
  async updateWatchlistAlert(id, alertConfig) {
    return api.put(`/watchlist/${id}`, alertConfig);
  },
  async removeFromWatchlist(id) {
    return api.delete(`/watchlist/${id}`);
  },

  // --- User Preferences API (Feature 2) ---
  async getUserPreferences() {
    const data = await api.get('/users/preferences');
    return data.data || {};
  },
  async saveUserPreferences(prefs) {
    return api.put('/users/preferences', prefs);
  },

  // --- Family Analytics API (Feature 3) ---
  async getFamilyAnalytics() {
    const data = await api.get('/analytics/family');
    return data.data || { applicants: [], totals: {} };
  },

  // --- Timeline API (Feature 4) ---
  async getTimeline() {
    const data = await api.get('/timeline');
    return data.data || [];
  },

  // --- User Notifications Inbox API (Feature 7) ---
  async getUserNotifications() {
    const data = await api.get('/user-notifications');
    return data.data || [];
  },
  async markUserNotificationRead(id) {
    return api.put(`/user-notifications/${id}/read`);
  },
  async markAllUserNotificationsRead() {
    return api.put('/user-notifications/read-all');
  },
  async deleteUserNotification(id) {
    return api.delete(`/user-notifications/${id}`);
  },

  // --- Sector & Registrar Analytics API (Feature 6) ---
  async getSectorAnalytics() {
    const data = await api.get('/analytics/sectors');
    return data.data || [];
  },
  async getRegistrarAnalytics() {
    const data = await api.get('/analytics/registrars');
    return data.data || [];
  },

  // --- Monthly Report API (Feature 8) ---
  async getMonthlyReport(month, year) {
    const data = await api.get(`/reports/monthly?month=${month}&year=${year}`);
    return data.data || {};
  },

  // --- AI IPO Rating API (Feature 9) ---
  async getIpoRating(params) {
    const qs = new URLSearchParams(params).toString();
    const data = await api.get(`/ipo/rating?${qs}`);
    return data.data || {};
  },

  // --- Broker Import Undo API (Feature 10) ---
  async undoImportBatch(historyId) {
    return api.delete(`/imports/${historyId}/undo`);
  },

  // --- Morning Digest API ---
  async sendMorningDigest() {
    return api.post('/digest/send-now');
  },

  // --- Allotment Alert Bot & Webhooks API ---
  async getBotConfig() {
    const data = await api.get('/notifications/bot-config');
    return data.data || {};
  },
  async updateBotConfig(config) {
    return api.put('/notifications/bot-config', config);
  },
  async testTelegramBot(payload) {
    return api.post('/notifications/test-telegram', payload);
  },
  async testWhatsAppBot(payload) {
    return api.post('/notifications/test-whatsapp', payload);
  },
  async testWebhook(payload) {
    return api.post('/notifications/test-webhook', payload);
  },

  // --- WebAuthn Biometric API ---
  async getWebAuthnCredentials() {
    const data = await api.get('/auth/webauthn/credentials');
    return data.data || [];
  },
  async deleteWebAuthnCredential(id) {
    return api.delete(`/auth/webauthn/credentials/${id}`);
  },
  async getWebAuthnRegisterOptions() {
    return api.post('/auth/webauthn/register-options', {});
  },
  async verifyWebAuthnRegister(payload) {
    return api.post('/auth/webauthn/register-verify', payload);
  },
  async getWebAuthnLoginOptions(username) {
    return api.post('/auth/webauthn/login-options', { username });
  },
  async verifyWebAuthnLogin(payload) {
    return api.post('/auth/webauthn/login-verify', payload);
  },

  // --- PWA Widget Data API ---
  async getWidgetData() {
    const data = await api.get('/widget/data');
    return data.widget || {};
  },

  // --- Subscriptions & Razorpay Payment API ---
  async getSubscriptionPlans() {
    return api.get('/subscriptions/plans');
  },
  async createSubscriptionOrder(planId) {
    return api.post('/subscriptions/create-order', { planId });
  },
  async verifySubscription(payload) {
    return api.post('/subscriptions/verify', payload);
  },
  async submitManualPayment(payload) {
    return api.post('/subscriptions/manual-request', payload);
  },
  async getPaymentLogs() {
    return api.get('/admin/payments');
  }
};
