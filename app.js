/* ============================================
   IPO Records Tracker — Application Logic v2
   ============================================ */

(function () {
    'use strict';

    // ── Constants ───────────────────────────────
    const STORAGE_KEY = 'ipo_tracker_records';
    const PROFILES_KEY = 'ipo_tracker_profiles';
    const PREFS_KEY = 'ipo_tracker_prefs';
    const SETTINGS_KEY = 'ipo_tracker_settings';

    const ALL_COLUMNS = [
        { key: 'checkbox', label: 'Checkbox', locked: true },
        { key: 'num', label: '#', locked: true },
        { key: 'ipoName', label: 'IPO Name', defaultVisible: true },
        { key: 'applicantName', label: 'Applicant', defaultVisible: true },
        { key: 'pan', label: 'PAN', defaultVisible: false },
        { key: 'upiId', label: 'UPI ID', defaultVisible: false },
        { key: 'quota', label: 'Quota', defaultVisible: true },
        { key: 'listingDate', label: 'Listing Date', defaultVisible: true },
        { key: 'lotSize', label: 'Lot Size', defaultVisible: false },
        { key: 'shares', label: 'Shares', defaultVisible: true },
        { key: 'price', label: 'Price', defaultVisible: true },
        { key: 'gmp', label: 'GMP', defaultVisible: true },
        { key: 'listingPrice', label: 'Listing Price', defaultVisible: false },
        { key: 'amount', label: 'Amount', defaultVisible: true },
        { key: 'applied', label: 'Applied', defaultVisible: true },
        { key: 'alloted', label: 'Alloted', defaultVisible: true },
        { key: 'allotmentStatus', label: 'Allotment Status', defaultVisible: true },
        { key: 'withdrawal', label: 'Withdrawal', defaultVisible: false },
        { key: 'profit', label: 'Profit', defaultVisible: true },
        { key: 'marginPercent', label: 'Margin %', defaultVisible: true },
        { key: 'margin', label: 'Margin', defaultVisible: false },
        { key: 'notes', label: 'Notes', defaultVisible: false },
        { key: 'actions', label: 'Actions', locked: true },
    ];

    const FORM_FIELDS = [
        'ipoName', 'applicantName', 'pan', 'upiId', 'quota', 'listingDate',
        'lotSize', 'shares', 'price', 'gmp', 'listingPrice', 'amount', 'applied',
        'alloted', 'withdrawal', 'profit', 'marginPercent', 'margin', 'notes'
    ];

    const CSV_HEADERS = [
        'IPO Name', 'Applicant Name', 'PAN', 'UPI ID', 'Quota', 'Listing Date',
        'Lot Size', 'Shares', 'Price', 'GMP', 'Listing Price', 'Amount', 'Applied',
        'Alloted', 'Withdrawal', 'Profit', 'Margin %', 'Margin', 'Notes'
    ];

    const CSV_KEYS = [
        'ipoName', 'applicantName', 'pan', 'upiId', 'quota', 'listingDate',
        'lotSize', 'shares', 'price', 'gmp', 'listingPrice', 'amount', 'applied',
        'alloted', 'withdrawal', 'profit', 'marginPercent', 'margin', 'notes'
    ];

    const CHART_COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#06b6d4', '#8b5cf6', '#ef4444', '#ec4899', '#14b8a6'];

    // ── State ───────────────────────────────────
    let records = [];
    let profiles = [];
    let editingId = null;
    let deleteTargetId = null;
    let deleteMode = 'single'; // 'single' | 'bulk'
    let profileDeleteId = null;
    let currentSort = { key: null, direction: 'asc' };
    let selectedIds = new Set();
    let visibleColumns = new Set();
    let analyticsCollapsed = false;
    let tempSubscriptionData = null;
    let appSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || { googleScriptUrl: '' };

    // ── DOM References ──────────────────────────
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const dom = {
        body: document.body,
        html: document.documentElement,
        addBtn: $('#btn-add-new'),
        exportBtn: $('#btn-export'),
        syncGsheetBtn: $('#btn-sync-gsheet'),
        importBtn: $('#btn-import-csv'),
        csvInput: $('#csv-import-input'),
        printBtn: $('#btn-print'),
        themeBtn: $('#btn-theme'),
        backupMenuBtn: $('#btn-backup-menu'),
        backupMenu: $('#backup-menu'),
        backupJsonBtn: $('#btn-backup-json'),
        restoreJsonBtn: $('#btn-restore-json'),
        jsonRestoreInput: $('#json-restore-input'),
        modalOverlay: $('#modal-overlay'),
        modalTitle: $('#modal-title'),
        modalCloseBtn: $('#btn-modal-close'),
        cancelBtn: $('#btn-cancel'),
        submitBtn: $('#btn-submit'),
        form: $('#ipo-form'),
        tbody: $('#records-body'),
        tfoot: $('#records-footer'),
        summaryRow: $('#summary-row'),
        tableWrapper: $('#table-wrapper'),
        emptyState: $('#empty-state'),
        searchInput: $('#search-input'),
        filterQuota: $('#filter-quota'),
        filterStatus: $('#filter-status'),
        columnsBtn: $('#btn-columns'),
        columnsMenu: $('#columns-menu'),
        selectAll: $('#select-all'),
        bulkBar: $('#bulk-bar'),
        bulkCount: $('#bulk-count'),
        bulkDeleteBtn: $('#btn-bulk-delete'),
        bulkExportBtn: $('#btn-bulk-export'),
        bulkClearBtn: $('#btn-bulk-clear'),
        deleteOverlay: $('#delete-overlay'),
        deleteTitle: $('#delete-modal-title'),
        deleteMessage: $('#delete-message'),
        deleteConfirmBtn: $('#btn-delete-confirm'),
        deleteCancelBtn: $('#btn-delete-cancel'),
        deleteCloseBtn: $('#btn-delete-close'),
        profileSelect: $('#profile-select'),
        saveProfileBtn: $('#btn-save-profile'),
        profileDeleteOverlay: $('#profile-delete-overlay'),
        profileDeleteConfirm: $('#btn-profile-delete-confirm'),
        profileDeleteCancel: $('#btn-profile-delete-cancel'),
        profileDeleteClose: $('#btn-profile-delete-close'),
        profileDeleteMessage: $('#profile-delete-message'),
        settingsBtn: $('#btn-settings'),
        settingsOverlay: $('#settings-overlay'),
        settingsCloseBtn: $('#btn-settings-close'),
        settingsSaveBtn: $('#btn-settings-save'),
        fieldGSheetUrl: $('#field-gsheet-url'),
        fetchIpoBtn: $('#btn-fetch-ipo'),
        toastContainer: $('#toast-container'),
        selectAll: $('#select-all'),
        bulkBar: $('#bulk-bar'),
        bulkCount: $('#bulk-count'),
        bulkDeleteBtn: $('#btn-bulk-delete'),
        bulkExportBtn: $('#btn-bulk-export'),
        bulkClearBtn: $('#btn-bulk-clear'),
        columnsBtn: $('#btn-columns'),
        columnsMenu: $('#columns-menu'),
        profileSelect: $('#profile-select'),
        saveProfileBtn: $('#btn-save-profile'),
        analyticsToggle: $('#btn-toggle-analytics'),
        analyticsBody: $('#analytics-body'),
        analyticsSection: $('#analytics-section'),
        chartQuota: $('#chart-quota'),
        chartProfit: $('#chart-profit'),
        chartStatus: $('#chart-status'),
        // Stats
        valTotal: $('#val-total'),
        valInvested: $('#val-invested'),
        valProfit: $('#val-profit'),
        valAllotment: $('#val-allotment'),
        // Form fields
        fieldShares: $('#field-shares'),
        fieldPrice: $('#field-price'),
        fieldGmp: $('#field-gmp'),
        fieldAmount: $('#field-amount'),
        fieldListingPrice: $('#field-listingPrice'),
        fieldProfit: $('#field-profit'),
        fieldMarginPercent: $('#field-marginPercent'),
        fieldAlloted: $('#field-alloted'),
        // Registrar dropdown
        registrarMenuBtn: $('#btn-registrar-menu'),
        registrarMenu: $('#registrar-menu'),
        // Subscription Modal
        subModalOverlay: $('#sub-modal-overlay'),
        subIpoName: $('#sub-ipo-name'),
        subTableBody: $('#sub-table-body'),
        btnSubClose: $('#btn-sub-close'),
        // Timeline Grid
        timelineGridContent: $('#timeline-grid-content'),
    };

    // ── Helpers ─────────────────────────────────
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
    }

    function formatCurrency(val) {
        if (val == null || isNaN(val)) return '₹0';
        const absVal = Math.abs(val);
        const sign = val < 0 ? '-' : '';
        if (absVal >= 10000000) return sign + '₹' + (absVal / 10000000).toFixed(2) + ' Cr';
        if (absVal >= 100000) return sign + '₹' + (absVal / 100000).toFixed(2) + ' L';
        return '₹' + Number(val).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }

    function formatNumber(val) {
        if (val == null || isNaN(val) || val === '') return '0';
        return Number(val).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }

    function formatDate(dateStr) {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function pf(v) { return parseFloat(v) || 0; }

    // ── Storage ─────────────────────────────────
    function loadRecords() {
        fetch('/api/records')
            .then(res => res.json())
            .then(data => {
                if (data.message === 'success') {
                    records = data.data;
                    refreshAll();
                }
            })
            .catch(err => {
                console.error('Error fetching records:', err);
                records = [];
                refreshAll();
            });
    }
    function saveRecords() { 
        // Not used anymore as we save per record
    }

    function loadProfiles() {
        try { profiles = JSON.parse(localStorage.getItem(PROFILES_KEY)) || []; } catch { profiles = []; }
    }
    function saveProfiles() { localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles)); }

    function loadPrefs() {
        try {
            const prefs = JSON.parse(localStorage.getItem(PREFS_KEY)) || {};
            if (prefs.theme) dom.html.setAttribute('data-theme', prefs.theme);
            if (prefs.visibleColumns) {
                visibleColumns = new Set(prefs.visibleColumns);
            } else {
                initDefaultColumns();
            }
            if (prefs.analyticsCollapsed !== undefined) {
                analyticsCollapsed = prefs.analyticsCollapsed;
            }
        } catch {
            initDefaultColumns();
        }
    }

    function savePrefs() {
        localStorage.setItem(PREFS_KEY, JSON.stringify({
            theme: dom.html.getAttribute('data-theme'),
            visibleColumns: [...visibleColumns],
            analyticsCollapsed: analyticsCollapsed,
        }));
    }

    function initDefaultColumns() {
        visibleColumns = new Set(
            ALL_COLUMNS.filter(c => c.locked || c.defaultVisible).map(c => c.key)
        );
    }

    // ── Dashboard Stats ─────────────────────────
    function updateDashboard() {
        const total = records.length;
        const invested = records.reduce((s, r) => s + pf(r.amount), 0);
        const profit = records.reduce((s, r) => s + pf(r.profit), 0);
        const applied = records.filter(r => r.applied === 'Yes').length;
        const alloted = records.filter(r => pf(r.alloted) > 0).length;
        const allotmentRate = applied > 0 ? ((alloted / applied) * 100).toFixed(1) : 0;

        animateValue(dom.valTotal, total);
        dom.valInvested.textContent = formatCurrency(invested);
        dom.valProfit.textContent = formatCurrency(profit);
        dom.valProfit.style.color = profit >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)';
        dom.valAllotment.textContent = allotmentRate + '%';
    }

    function animateValue(el, target) {
        const current = parseInt(el.textContent) || 0;
        if (current === target) { el.textContent = target; return; }
        const duration = 400;
        const start = performance.now();
        function tick(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(current + (target - current) * eased);
            if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    // ── Charts ──────────────────────────────────
    function renderCharts() {
        renderQuotaChart();
        renderProfitChart();
        renderStatusChart();
    }

    function renderQuotaChart() {
        const canvas = dom.chartQuota;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.clientWidth * dpr;
        canvas.height = canvas.clientHeight * dpr;
        ctx.scale(dpr, dpr);
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        ctx.clearRect(0, 0, w, h);

        const quotaCounts = {};
        records.forEach(r => {
            const q = r.quota || 'Other';
            quotaCounts[q] = (quotaCounts[q] || 0) + 1;
        });

        const labels = Object.keys(quotaCounts);
        const values = Object.values(quotaCounts);
        const total = values.reduce((a, b) => a + b, 0);

        if (total === 0) {
            drawEmptyChart(ctx, w, h, 'No data');
            return;
        }

        const cx = w * 0.4;
        const cy = h * 0.5;
        const radius = Math.min(cx, cy) - 20;
        const innerRadius = radius * 0.55;
        let startAngle = -Math.PI / 2;

        values.forEach((val, i) => {
            const sliceAngle = (val / total) * 2 * Math.PI;
            const endAngle = startAngle + sliceAngle;

            ctx.beginPath();
            ctx.moveTo(cx + innerRadius * Math.cos(startAngle), cy + innerRadius * Math.sin(startAngle));
            ctx.arc(cx, cy, radius, startAngle, endAngle);
            ctx.arc(cx, cy, innerRadius, endAngle, startAngle, true);
            ctx.closePath();
            ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
            ctx.fill();

            startAngle = endAngle;
        });

        // Center text
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim();
        ctx.font = `700 ${Math.max(16, radius * 0.28)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(total, cx, cy - 6);
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim();
        ctx.font = `500 ${Math.max(9, radius * 0.13)}px Inter, sans-serif`;
        ctx.fillText('TOTAL', cx, cy + 14);

        // Legend
        const legendX = w * 0.72;
        let legendY = h * 0.2;
        const lineH = 22;
        labels.forEach((label, i) => {
            ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
            ctx.beginPath();
            ctx.arc(legendX, legendY + 1, 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
            ctx.font = '500 11px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${label} (${values[i]})`, legendX + 12, legendY + 1);
            legendY += lineH;
        });
    }

    function renderProfitChart() {
        const canvas = dom.chartProfit;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.clientWidth * dpr;
        canvas.height = canvas.clientHeight * dpr;
        ctx.scale(dpr, dpr);
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        ctx.clearRect(0, 0, w, h);

        const profitData = records
            .filter(r => pf(r.profit) !== 0)
            .map(r => ({ name: r.ipoName || 'Unknown', profit: pf(r.profit) }))
            .sort((a, b) => Math.abs(b.profit) - Math.abs(a.profit))
            .slice(0, 8);

        if (profitData.length === 0) {
            drawEmptyChart(ctx, w, h, 'No profit data');
            return;
        }

        const padding = { top: 10, right: 20, bottom: 10, left: 120 };
        const chartW = w - padding.left - padding.right;
        const chartH = h - padding.top - padding.bottom;
        const barH = Math.min(24, (chartH / profitData.length) - 6);
        const maxVal = Math.max(...profitData.map(d => Math.abs(d.profit)));

        profitData.forEach((d, i) => {
            const y = padding.top + i * (chartH / profitData.length) + (chartH / profitData.length - barH) / 2;
            const barW = (Math.abs(d.profit) / maxVal) * chartW;
            const isPositive = d.profit >= 0;

            // Bar
            ctx.fillStyle = isPositive ? '#10b981' : '#f43f5e';
            ctx.globalAlpha = 0.85;
            const barRadius = 4;
            drawRoundedRect(ctx, padding.left, y, barW, barH, barRadius);
            ctx.globalAlpha = 1;

            // Label
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
            ctx.font = '500 10px Inter, sans-serif';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            const labelText = d.name.length > 16 ? d.name.substring(0, 15) + '…' : d.name;
            ctx.fillText(labelText, padding.left - 8, y + barH / 2);

            // Value
            ctx.fillStyle = isPositive ? '#10b981' : '#f43f5e';
            ctx.font = '600 10px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText((isPositive ? '+' : '') + formatCurrencyShort(d.profit), padding.left + barW + 6, y + barH / 2);
        });
    }

    function renderStatusChart() {
        const canvas = dom.chartStatus;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.clientWidth * dpr;
        canvas.height = canvas.clientHeight * dpr;
        ctx.scale(dpr, dpr);
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        ctx.clearRect(0, 0, w, h);

        const statusCounts = {
            'Applied': records.filter(r => r.applied === 'Yes').length,
            'Allotted': records.filter(r => pf(r.alloted) > 0).length,
            'Pending': records.filter(r => r.applied === 'Pending').length,
            'Withdrawn': records.filter(r => r.withdrawal === 'Yes').length,
        };

        const colors = { 'Applied': '#3b82f6', 'Allotted': '#10b981', 'Pending': '#f59e0b', 'Withdrawn': '#ef4444' };
        const labels = Object.keys(statusCounts);
        const values = Object.values(statusCounts);
        const total = values.reduce((a, b) => a + b, 0);

        if (total === 0) {
            drawEmptyChart(ctx, w, h, 'No data');
            return;
        }

        const cx = w * 0.4;
        const cy = h * 0.5;
        const radius = Math.min(cx, cy) - 20;
        const innerRadius = radius * 0.55;
        let startAngle = -Math.PI / 2;

        values.forEach((val, i) => {
            if (val === 0) return;
            const sliceAngle = (val / total) * 2 * Math.PI;
            const endAngle = startAngle + sliceAngle;

            ctx.beginPath();
            ctx.moveTo(cx + innerRadius * Math.cos(startAngle), cy + innerRadius * Math.sin(startAngle));
            ctx.arc(cx, cy, radius, startAngle, endAngle);
            ctx.arc(cx, cy, innerRadius, endAngle, startAngle, true);
            ctx.closePath();
            ctx.fillStyle = colors[labels[i]];
            ctx.fill();

            startAngle = endAngle;
        });

        // Center
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim();
        ctx.font = `700 ${Math.max(16, radius * 0.28)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(total, cx, cy - 6);
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim();
        ctx.font = `500 ${Math.max(9, radius * 0.13)}px Inter, sans-serif`;
        ctx.fillText('STATUS', cx, cy + 14);

        // Legend
        const legendX = w * 0.72;
        let legendY = h * 0.22;
        labels.forEach((label, i) => {
            if (values[i] === 0) return;
            ctx.fillStyle = colors[label];
            ctx.beginPath();
            ctx.arc(legendX, legendY + 1, 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
            ctx.font = '500 11px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${label} (${values[i]})`, legendX + 12, legendY + 1);
            legendY += 22;
        });
    }

    function drawEmptyChart(ctx, w, h, text) {
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim();
        ctx.font = '500 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, w / 2, h / 2);
    }

    function drawRoundedRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
    }

    function formatCurrencyShort(val) {
        const absVal = Math.abs(val);
        const sign = val < 0 ? '-' : '';
        if (absVal >= 10000000) return sign + '₹' + (absVal / 10000000).toFixed(1) + 'Cr';
        if (absVal >= 100000) return sign + '₹' + (absVal / 100000).toFixed(1) + 'L';
        if (absVal >= 1000) return sign + '₹' + (absVal / 1000).toFixed(1) + 'K';
        return sign + '₹' + absVal.toFixed(0);
    }

    // ── Column Visibility ───────────────────────
    function applyColumnVisibility() {
        let styleEl = $('#col-visibility-style');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'col-visibility-style';
            document.head.appendChild(styleEl);
        }

        const rules = ALL_COLUMNS
            .filter(c => !visibleColumns.has(c.key))
            .map(c => `[data-col="${c.key}"] { display: none !important; }`)
            .join('\n');

        styleEl.textContent = rules;
    }

    function renderColumnToggles() {
        dom.columnsMenu.innerHTML = '';
        ALL_COLUMNS.filter(c => !c.locked).forEach(col => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = visibleColumns.has(col.key);
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) visibleColumns.add(col.key);
                else visibleColumns.delete(col.key);
                applyColumnVisibility();
                renderTable();
                savePrefs();
            });
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(col.label));
            dom.columnsMenu.appendChild(label);
        });
    }

    // ── Render Table ────────────────────────────
    function getFilteredRecords() {
        let filtered = [...records];
        const query = dom.searchInput.value.toLowerCase().trim();
        const quotaFilter = dom.filterQuota.value;
        const statusFilter = dom.filterStatus.value;

        if (query) {
            filtered = filtered.filter(r =>
                (r.ipoName || '').toLowerCase().includes(query) ||
                (r.applicantName || '').toLowerCase().includes(query) ||
                (r.pan || '').toLowerCase().includes(query) ||
                (r.upiId || '').toLowerCase().includes(query) ||
                (r.notes || '').toLowerCase().includes(query)
            );
        }

        if (quotaFilter) filtered = filtered.filter(r => r.quota === quotaFilter);

        if (statusFilter) {
            filtered = filtered.filter(r => {
                if (statusFilter === 'Applied') return r.applied === 'Yes';
                if (statusFilter === 'Pending') return r.applied === 'Pending';
                if (statusFilter === 'Allotted') return pf(r.alloted) > 0;
                if (statusFilter === 'Not Allotted') return r.applied === 'Yes' && pf(r.alloted) === 0;
                if (statusFilter === 'Withdrawn') return r.withdrawal === 'Yes';
                return true;
            });
        }

        if (currentSort.key) {
            const numericFields = ['shares', 'price', 'amount', 'alloted', 'profit', 'marginPercent', 'margin', 'lotSize', 'listingPrice'];
            filtered.sort((a, b) => {
                let valA = a[currentSort.key];
                let valB = b[currentSort.key];

                if (numericFields.includes(currentSort.key)) {
                    valA = pf(valA); valB = pf(valB);
                } else if (currentSort.key === 'listingDate') {
                    valA = valA ? new Date(valA).getTime() : 0;
                    valB = valB ? new Date(valB).getTime() : 0;
                } else if (currentSort.key === 'allotmentStatus') {
                    valA = getAllotmentStatus(a).toLowerCase();
                    valB = getAllotmentStatus(b).toLowerCase();
                } else {
                    valA = (valA || '').toString().toLowerCase();
                    valB = (valB || '').toString().toLowerCase();
                }

                if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
                if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return filtered;
    }

    function renderTable() {
        const filtered = getFilteredRecords();
        dom.tbody.innerHTML = '';

        if (filtered.length === 0) {
            dom.tableWrapper.style.display = 'none';
            dom.tfoot.style.display = 'none';
            dom.emptyState.classList.add('show');
            return;
        }

        dom.tableWrapper.style.display = 'block';
        dom.emptyState.classList.remove('show');

        filtered.forEach((r, i) => {
            const tr = document.createElement('tr');
            if (selectedIds.has(r.id)) tr.classList.add('selected');
            const profit = pf(r.profit);
            const marginPct = pf(r.marginPercent);
            const profitClass = profit > 0 ? 'positive' : profit < 0 ? 'negative' : '';
            const marginPctClass = marginPct > 0 ? 'positive' : marginPct < 0 ? 'negative' : '';

            const hasSub = r.subscriptionNumbers && typeof r.subscriptionNumbers === 'object';
            const subButton = hasSub
                ? ` <button type="button" class="btn-sub-details" data-id="${r.id}" title="View Subscription Details">📊 Sub</button>`
                : '';

            tr.innerHTML = `
                <td class="td-checkbox" data-col="checkbox">
                    <label class="checkbox-wrap">
                        <input type="checkbox" class="row-checkbox" data-id="${r.id}" ${selectedIds.has(r.id) ? 'checked' : ''}>
                        <span class="checkmark"></span>
                    </label>
                </td>
                <td class="td-num" data-col="num">${i + 1}</td>
                <td class="td-ipo-name" data-col="ipoName">${escapeHtml(r.ipoName || '')}${subButton}</td>
                <td data-col="applicantName">${escapeHtml(r.applicantName || '')}</td>
                <td data-col="pan" style="font-family:monospace;font-size:0.78rem;">${escapeHtml((r.pan || '').toUpperCase())}</td>
                <td data-col="upiId" style="font-size:0.78rem;">${escapeHtml(r.upiId || '')}</td>
                <td data-col="quota">${quotaBadge(r.quota)}</td>
                <td data-col="listingDate">${formatDate(r.listingDate)}</td>
                <td class="td-amount" data-col="lotSize">${r.lotSize || '—'}</td>
                <td class="td-amount" data-col="shares">${formatNumber(r.shares)}</td>
                <td class="td-amount" data-col="price">${r.price ? formatCurrency(r.price) : '—'}</td>
                <td class="td-amount" data-col="gmp">${r.gmp ? formatCurrency(r.gmp) : '—'}</td>
                <td class="td-amount" data-col="listingPrice">${r.listingPrice ? formatCurrency(r.listingPrice) : '—'}</td>
                <td class="td-amount" data-col="amount">${r.amount ? formatCurrency(r.amount) : '—'}</td>
                <td data-col="applied">${appliedBadge(r.applied)}</td>
                <td class="td-amount" data-col="alloted">${formatNumber(r.alloted)}</td>
                <td data-col="allotmentStatus">${allotmentStatusBadge(getAllotmentStatus(r))}</td>
                <td data-col="withdrawal">${withdrawalBadge(r.withdrawal)}</td>
                <td class="td-profit ${profitClass}" data-col="profit">${profit !== 0 ? (profit > 0 ? '+' : '') + formatCurrency(profit) : '—'}</td>
                <td class="td-margin-pct ${marginPctClass}" data-col="marginPercent">${marginPct !== 0 ? marginPct.toFixed(2) + '%' : '—'}</td>
                <td class="td-amount" data-col="margin">${r.margin ? formatCurrency(r.margin) : '—'}</td>
                <td class="td-notes" data-col="notes" title="${escapeHtml(r.notes || '')}">${escapeHtml(r.notes || '') || '—'}</td>
                <td class="td-actions" data-col="actions">
                    <div class="action-group">
                        <button class="btn-icon btn-edit" data-id="${r.id}" title="Edit">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="btn-icon btn-duplicate" data-id="${r.id}" title="Duplicate">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        </button>
                        <button class="btn-icon btn-delete" data-id="${r.id}" title="Delete">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </div>
                </td>
            `;
            dom.tbody.appendChild(tr);
        });

        renderSummaryRow(filtered);
        updateSelectAllState();
    }

    function renderSummaryRow(filtered) {
        if (filtered.length === 0) {
            dom.tfoot.style.display = 'none';
            return;
        }

        dom.tfoot.style.display = '';
        const totals = {
            shares: filtered.reduce((s, r) => s + pf(r.shares), 0),
            amount: filtered.reduce((s, r) => s + pf(r.amount), 0),
            alloted: filtered.reduce((s, r) => s + pf(r.alloted), 0),
            profit: filtered.reduce((s, r) => s + pf(r.profit), 0),
            margin: filtered.reduce((s, r) => s + pf(r.margin), 0),
        };
        const avgMarginPct = totals.amount > 0 ? ((totals.profit / totals.amount) * 100).toFixed(2) : 0;

        dom.summaryRow.innerHTML = `
            <td data-col="checkbox"></td>
            <td data-col="num"></td>
            <td data-col="ipoName" style="font-weight:700;">TOTALS (${filtered.length})</td>
            <td data-col="applicantName"></td>
            <td data-col="pan"></td>
            <td data-col="upiId"></td>
            <td data-col="quota"></td>
            <td data-col="listingDate"></td>
            <td data-col="lotSize"></td>
            <td data-col="shares">${formatNumber(totals.shares)}</td>
            <td data-col="price"></td>
            <td data-col="gmp"></td>
            <td data-col="listingPrice"></td>
            <td data-col="amount">${formatCurrency(totals.amount)}</td>
            <td data-col="applied"></td>
            <td data-col="alloted">${formatNumber(totals.alloted)}</td>
            <td data-col="allotmentStatus"></td>
            <td data-col="withdrawal"></td>
            <td data-col="profit" style="color:${totals.profit >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'}">${(totals.profit > 0 ? '+' : '') + formatCurrency(totals.profit)}</td>
            <td data-col="marginPercent" style="color:${avgMarginPct >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'}">${avgMarginPct}%</td>
            <td data-col="margin">${formatCurrency(totals.margin)}</td>
            <td data-col="notes"></td>
            <td data-col="actions"></td>
        `;
    }

    function quotaBadge(quota) {
        const cls = { 'Retail': 'badge-applied', 'sHNI': 'badge-pending', 'bHNI': 'badge-pending', 'Employee': 'badge-no' };
        return `<span class="badge ${cls[quota] || 'badge-no'}">${escapeHtml(quota || 'N/A')}</span>`;
    }

    function appliedBadge(applied) {
        const cls = { 'Yes': 'badge-yes', 'No': 'badge-no', 'Pending': 'badge-pending' };
        return `<span class="badge ${cls[applied] || 'badge-no'}">${escapeHtml(applied || 'N/A')}</span>`;
    }

    function withdrawalBadge(withdrawal) {
        return withdrawal === 'Yes'
            ? '<span class="badge badge-withdrawn">Yes</span>'
            : '<span class="badge badge-no">No</span>';
    }

    function getAllotmentStatus(r) {
        if (r.withdrawal === 'Yes') return 'Withdrawn';
        if (r.applied === 'No') return 'Not Applied';
        if (r.applied === 'Pending') return 'Awaiting Allotment';
        if (r.applied === 'Yes') {
            if (r.alloted === undefined || r.alloted === '' || r.alloted === null) return 'Awaiting Allotment';
            const allotedVal = pf(r.alloted);
            if (allotedVal > 0) return 'Allotted';
            return 'Not Allotted';
        }
        return 'Pending';
    }

    function allotmentStatusBadge(status) {
        const badges = {
            'Allotted': '<span class="badge badge-yes">🎉 Allotted</span>',
            'Not Allotted': '<span class="badge badge-withdrawn">❌ Not Allotted</span>',
            'Awaiting Allotment': '<span class="badge badge-pending">⏳ Awaiting</span>',
            'Withdrawn': '<span class="badge badge-withdrawn">🚫 Withdrawn</span>',
            'Not Applied': '<span class="badge badge-no">Not Applied</span>',
            'Pending': '<span class="badge badge-pending">Pending</span>'
        };
        return badges[status] || `<span class="badge badge-no">${escapeHtml(status)}</span>`;
    }

    async function loadTimelineData() {
        try {
            const res = await fetch('https://finapi.upvaly.com/api/ipo');
            if (!res.ok) throw new Error();
            const responseData = await res.json();
            if (responseData.status !== 'success' || !Array.isArray(responseData.data)) return;

            const list = responseData.data;
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const activeIpos = list.filter(item => {
                if (!item.schedule) return false;
                const end = item.schedule.endDate ? new Date(item.schedule.endDate) : null;
                const listDate = item.schedule.listingDate ? new Date(item.schedule.listingDate) : null;
                return (end && end >= today) || (listDate && listDate >= today);
            });

            if (activeIpos.length === 0) {
                dom.timelineGridContent.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: var(--text-muted); font-size: 0.8rem;">
                        No active or upcoming IPO schedules for this week.
                    </div>`;
                return;
            }

            activeIpos.sort((a, b) => {
                const dateA = new Date(a.schedule.endDate || a.schedule.listingDate);
                const dateB = new Date(b.schedule.endDate || b.schedule.listingDate);
                return dateA - dateB;
            });

            dom.timelineGridContent.innerHTML = '';
            activeIpos.forEach(item => {
                const card = document.createElement('div');
                card.className = 'timeline-card';

                const start = item.schedule.startDate ? formatDate(item.schedule.startDate) : '—';
                const end = item.schedule.endDate ? formatDate(item.schedule.endDate) : '—';
                const allot = item.schedule.allotmentFinalization ? formatDate(item.schedule.allotmentFinalization) : '—';
                const listDate = item.schedule.listingDate ? formatDate(item.schedule.listingDate) : '—';

                const subText = item.subscriptionNumbers && item.subscriptionNumbers.total
                    ? `<div class="timeline-sub-badge">🔥 ${item.subscriptionNumbers.total.subscription} Sub</div>`
                    : '';

                card.innerHTML = `
                    <div class="timeline-card-header">
                        <span class="timeline-type">${item.type || 'Mainboard'}</span>
                        <span class="timeline-status-badge ${item.status === 'LIVE' ? 'status-live' : 'status-upcoming'}">${item.status || 'UPCOMING'}</span>
                    </div>
                    <h4 class="timeline-ipo-title" title="${escapeHtml(item.name || '')}">${escapeHtml(item.name || '')}</h4>
                    <p class="timeline-price-range">${escapeHtml(item.priceRange || 'Price TBD')}</p>
                    ${subText}
                    <div class="timeline-dates">
                        <div class="timeline-date-row">
                            <span class="date-label">Bidding:</span>
                            <span class="date-val">${start} to ${end}</span>
                        </div>
                        <div class="timeline-date-row">
                            <span class="date-label">Allotment:</span>
                            <span class="date-val">${allot}</span>
                        </div>
                        <div class="timeline-date-row">
                            <span class="date-label">Listing:</span>
                            <span class="date-val">${listDate}</span>
                        </div>
                    </div>
                `;
                dom.timelineGridContent.appendChild(card);
            });
        } catch (err) {
            console.error('Failed to load timeline:', err);
            dom.timelineGridContent.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: var(--text-muted); font-size: 0.8rem;">
                    Could not fetch IPO schedules. Tap refresh or check network.
                </div>`;
        }
    }

    // ── Selection ───────────────────────────────
    function updateSelection() {
        const count = selectedIds.size;
        dom.bulkCount.textContent = count + ' selected';
        dom.bulkBar.classList.toggle('active', count > 0);
        updateSelectAllState();

        // Update row highlights
        $$('#records-body tr').forEach(tr => {
            const cb = tr.querySelector('.row-checkbox');
            if (cb) tr.classList.toggle('selected', selectedIds.has(cb.dataset.id));
        });
    }

    function updateSelectAllState() {
        const checkboxes = $$('.row-checkbox');
        if (checkboxes.length === 0) { dom.selectAll.checked = false; return; }
        const allChecked = [...checkboxes].every(cb => cb.checked);
        const someChecked = [...checkboxes].some(cb => cb.checked);
        dom.selectAll.checked = allChecked;
        dom.selectAll.indeterminate = someChecked && !allChecked;
    }

    // ── Modal ───────────────────────────────────
    function openModal(mode, record) {
        editingId = mode === 'edit' ? record.id : null;
        tempSubscriptionData = null;
        dom.modalTitle.textContent = mode === 'edit' ? 'Edit IPO Record' : 'Add New IPO Record';

        const icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`;
        dom.submitBtn.innerHTML = icon + (mode === 'edit' ? ' Update Record' : ' Save Record');

        if (mode === 'edit' && record) populateForm(record);
        else dom.form.reset();

        dom.modalOverlay.classList.add('active');
        setTimeout(() => $('#field-ipoName').focus(), 200);
    }

    function closeModal() {
        dom.modalOverlay.classList.remove('active');
        editingId = null;
        tempSubscriptionData = null;
        dom.form.reset();
    }

    function populateForm(record) {
        FORM_FIELDS.forEach(f => {
            const el = $(`#field-${f}`);
            if (el) el.value = record[f] || '';
        });
    }

    function getFormData() {
        const data = {};
        FORM_FIELDS.forEach(f => {
            const el = $(`#field-${f}`);
            if (el) data[f] = el.value.trim();
        });
        data.pan = (data.pan || '').toUpperCase();
        return data;
    }

    // ── Auto-Calculations ───────────────────────
    function autoCalculate() {
        const shares = pf(dom.fieldShares.value);
        const price = pf(dom.fieldPrice.value);
        const amount = shares * price;
        const listingPrice = pf(dom.fieldListingPrice.value);
        const alloted = pf(dom.fieldAlloted.value);
        const gmp = pf(dom.fieldGmp.value);

        if (shares && price) {
            dom.fieldAmount.value = amount.toFixed(2);
        }

        // Auto-calculate profit from listing price if available, fallback to GMP expected profit
        if (listingPrice > 0 && price > 0) {
            const calcShares = alloted > 0 ? alloted : shares;
            if (calcShares > 0) {
                const profit = (listingPrice - price) * calcShares;
                dom.fieldProfit.value = profit.toFixed(2);
            }
        } else if (price > 0 && gmp > 0) {
            const calcShares = alloted > 0 ? alloted : shares;
            if (calcShares > 0) {
                const estProfit = gmp * calcShares;
                dom.fieldProfit.value = estProfit.toFixed(2);
            }
        }

        const profit = pf(dom.fieldProfit.value);
        const currentAmount = pf(dom.fieldAmount.value);
        if (currentAmount > 0 && profit !== 0) {
            dom.fieldMarginPercent.value = ((profit / currentAmount) * 100).toFixed(2);
        }
    }

    // ── CRUD ────────────────────────────────────
    function addRecord(data) {
        data.id = generateId();
        data.createdAt = new Date().toISOString();
        if (tempSubscriptionData) {
            data.subscriptionNumbers = tempSubscriptionData;
        }
        
        fetch('/api/records', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(res => res.json())
        .then(result => {
            if (result.message === 'success') {
                records.push(data);
                refreshAll();
                showToast('Record added successfully!', 'success');
            } else {
                showToast('Error adding record.', 'error');
            }
        })
        .catch(err => {
            console.error(err);
            showToast('Network error adding record.', 'error');
        });
    }

    function updateRecord(id, data) {
        const idx = records.findIndex(r => r.id === id);
        if (idx === -1) return;
        data.id = id;
        data.createdAt = records[idx].createdAt;
        data.updatedAt = new Date().toISOString();
        if (tempSubscriptionData) {
            data.subscriptionNumbers = tempSubscriptionData;
        } else if (records[idx].subscriptionNumbers) {
            data.subscriptionNumbers = records[idx].subscriptionNumbers;
        }
        
        fetch(`/api/records/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(res => res.json())
        .then(result => {
            if (result.message === 'success') {
                records[idx] = data;
                refreshAll();
                showToast('Record updated successfully!', 'success');
            } else {
                showToast('Error updating record.', 'error');
            }
        })
        .catch(err => {
            console.error(err);
            showToast('Network error updating record.', 'error');
        });
    }

    function deleteRecord(id) {
        fetch(`/api/records/${id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(result => {
            if (result.message === 'deleted') {
                records = records.filter(r => r.id !== id);
                selectedIds.delete(id);
                refreshAll();
                updateSelection();
                showToast('Record deleted.', 'info');
            } else {
                showToast('Error deleting record.', 'error');
            }
        })
        .catch(err => {
            console.error(err);
            showToast('Network error deleting record.', 'error');
        });
    }

    function duplicateRecord(id) {
        const original = records.find(r => r.id === id);
        if (!original) return;
        const copy = { ...original };
        copy.id = generateId();
        copy.createdAt = new Date().toISOString();
        copy.ipoName = (copy.ipoName || '') + ' (Copy)';
        delete copy.updatedAt;
        
        fetch('/api/records', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(copy)
        })
        .then(res => res.json())
        .then(result => {
            if (result.message === 'success') {
                records.push(copy);
                refreshAll();
                showToast('Record duplicated!', 'success');
            }
        });
    }

    function bulkDelete() {
        if (selectedIds.size === 0) return;
        
        Promise.all([...selectedIds].map(id => 
            fetch(`/api/records/${id}`, { method: 'DELETE' })
        )).then(() => {
            records = records.filter(r => !selectedIds.has(r.id));
            const count = selectedIds.size;
            selectedIds.clear();
            refreshAll();
            updateSelection();
            showToast(`${count} record(s) deleted.`, 'info');
        }).catch(err => {
            console.error(err);
            showToast('Error during bulk delete.', 'error');
        });
    }

    function refreshAll() {
        updateDashboard();
        renderTable();
        renderCharts();
    }

    // ── Profiles ────────────────────────────────
    function renderProfileDropdown() {
        dom.profileSelect.innerHTML = '<option value="">— Saved Profiles —</option>';
        profiles.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `${p.name} (${p.pan || 'No PAN'})`;
            dom.profileSelect.appendChild(opt);
        });

        // Add delete options
        if (profiles.length > 0) {
            const sep = document.createElement('option');
            sep.disabled = true;
            sep.textContent = '────────────';
            dom.profileSelect.appendChild(sep);

            profiles.forEach(p => {
                const opt = document.createElement('option');
                opt.value = 'delete_' + p.id;
                opt.textContent = `🗑️ Delete: ${p.name}`;
                opt.style.color = '#f43f5e';
                dom.profileSelect.appendChild(opt);
            });
        }
    }

    function loadProfile(profileId) {
        const profile = profiles.find(p => p.id === profileId);
        if (!profile) return;
        $('#field-applicantName').value = profile.name || '';
        $('#field-pan').value = profile.pan || '';
        $('#field-upiId').value = profile.upiId || '';
        showToast(`Profile "${profile.name}" loaded.`, 'info');
    }

    function saveProfile() {
        const name = $('#field-applicantName').value.trim();
        const pan = $('#field-pan').value.trim().toUpperCase();
        const upiId = $('#field-upiId').value.trim();

        if (!name) {
            showToast('Enter applicant name first.', 'error');
            return;
        }

        // Check if profile with same PAN exists
        const existing = profiles.findIndex(p => p.pan && p.pan === pan);
        if (existing > -1) {
            profiles[existing] = { ...profiles[existing], name, pan, upiId };
            showToast(`Profile "${name}" updated.`, 'success');
        } else {
            profiles.push({ id: generateId(), name, pan, upiId });
            showToast(`Profile "${name}" saved!`, 'success');
        }

        saveProfiles();
        renderProfileDropdown();
    }

    // ── Import CSV ──────────────────────────────
    function importCSV(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const lines = text.split(/\r?\n/).filter(l => l.trim());
                if (lines.length < 2) {
                    showToast('CSV file is empty or has no data rows.', 'error');
                    return;
                }

                const headers = parseCSVLine(lines[0]);
                const headerMap = buildHeaderMap(headers);
                let imported = 0;

                for (let i = 1; i < lines.length; i++) {
                    const values = parseCSVLine(lines[i]);
                    if (values.length === 0) continue;

                    const record = { id: generateId(), createdAt: new Date().toISOString() };
                    CSV_KEYS.forEach((key, ki) => {
                        const csvIdx = headerMap[CSV_HEADERS[ki]?.toLowerCase()];
                        if (csvIdx !== undefined && values[csvIdx] !== undefined) {
                            record[key] = values[csvIdx].trim();
                        }
                    });

                    // Also try direct key matching
                    FORM_FIELDS.forEach(key => {
                        if (!record[key]) {
                            const idx = headerMap[key.toLowerCase()];
                            if (idx !== undefined && values[idx]) record[key] = values[idx].trim();
                        }
                    });

                    if (record.ipoName || record.applicantName) {
                        records.push(record);
                        imported++;
                    }
                }

                saveRecords();
                refreshAll();
                showToast(`${imported} record(s) imported successfully!`, 'success');
            } catch (err) {
                showToast('Error parsing CSV: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
    }

    function parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQuotes) {
                if (ch === '"') {
                    if (i + 1 < line.length && line[i + 1] === '"') {
                        current += '"';
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    current += ch;
                }
            } else {
                if (ch === '"') {
                    inQuotes = true;
                } else if (ch === ',') {
                    result.push(current);
                    current = '';
                } else {
                    current += ch;
                }
            }
        }
        result.push(current);
        return result;
    }

    function buildHeaderMap(headers) {
        const map = {};
        headers.forEach((h, i) => {
            map[h.trim().toLowerCase()] = i;
        });
        return map;
    }

    // ── Export CSV ───────────────────────────────
    function exportToCSV(recordsToExport) {
        const data = recordsToExport || records;
        if (data.length === 0) {
            showToast('No records to export.', 'error');
            return;
        }

        let csv = CSV_HEADERS.join(',') + '\n';
        data.forEach(r => {
            const row = CSV_KEYS.map(k => {
                let val = r[k] || '';
                if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
                    val = '"' + val.replace(/"/g, '""') + '"';
                }
                return val;
            });
            csv += row.join(',') + '\n';
        });

        downloadBlob(csv, `ipo_records_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
        showToast('CSV exported!', 'success');
    }

    // ── Backup / Restore ────────────────────────
    function backupJSON() {
        const backup = {
            version: 2,
            exportedAt: new Date().toISOString(),
            records: records,
            profiles: profiles,
        };
        const json = JSON.stringify(backup, null, 2);
        downloadBlob(json, `ipo_backup_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
        showToast('Backup exported!', 'success');
    }

    function restoreJSON(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.records && Array.isArray(data.records)) {
                    records = data.records;
                    saveRecords();
                }
                if (data.profiles && Array.isArray(data.profiles)) {
                    profiles = data.profiles;
                    saveProfiles();
                    renderProfileDropdown();
                }
                refreshAll();
                showToast(`Restored ${records.length} records!`, 'success');
            } catch (err) {
                showToast('Invalid backup file: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
    }

    function downloadBlob(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ── Sort ────────────────────────────────────
    function handleSort(key) {
        if (currentSort.key === key) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.key = key;
            currentSort.direction = 'asc';
        }

        $$('#records-table th').forEach(th => {
            th.classList.remove('sort-active');
            const icon = th.querySelector('.sort-icon');
            if (icon) icon.textContent = '↕';
        });

        const activeTh = $(`#records-table th[data-sort="${key}"]`);
        if (activeTh) {
            activeTh.classList.add('sort-active');
            const icon = activeTh.querySelector('.sort-icon');
            if (icon) icon.textContent = currentSort.direction === 'asc' ? '↑' : '↓';
        }

        renderTable();
    }

    // ── Delete Confirmation ─────────────────────
    function openDeleteModal(id, mode) {
        deleteTargetId = id;
        deleteMode = mode || 'single';

        if (mode === 'bulk') {
            dom.deleteModalTitle.textContent = 'Confirm Bulk Delete';
            dom.deleteMessage.textContent = `Are you sure you want to delete ${selectedIds.size} selected record(s)? This action cannot be undone.`;
        } else {
            dom.deleteModalTitle.textContent = 'Confirm Delete';
            dom.deleteMessage.textContent = 'Are you sure you want to delete this IPO record? This action cannot be undone.';
        }

        dom.deleteOverlay.classList.add('active');
    }

    function closeDeleteModal() {
        deleteTargetId = null;
        dom.deleteOverlay.classList.remove('active');
    }

    // ── Theme Toggle ────────────────────────────
    function toggleTheme() {
        const current = dom.html.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        dom.html.setAttribute('data-theme', next);
        savePrefs();
        // Re-render charts for new theme colors
        setTimeout(renderCharts, 50);
    }

    // ── Toast Notifications ─────────────────────
    function showToast(message, type) {
        type = type || 'info';
        const icons = {
            success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
            error: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
            info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${escapeHtml(message)}</span>`;
        dom.toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 3200);
    }

    // ── Dropdown Management ─────────────────────
    function setupDropdown(triggerBtn, menu) {
        triggerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close all other dropdowns
            $$('.dropdown-menu.open').forEach(m => { if (m !== menu) m.classList.remove('open'); });
            menu.classList.toggle('open');
        });
    }

    // Close dropdowns on outside click
    document.addEventListener('click', () => {
        $$('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
    });

    // ── Event Listeners ─────────────────────────
    function init() {
        loadPrefs();
        loadRecords();
        loadProfiles();

        applyColumnVisibility();
        renderColumnToggles();
        renderProfileDropdown();
        updateDashboard();
        renderTable();

        // Defer chart rendering slightly to ensure CSS has applied
        setTimeout(renderCharts, 100);

        // Analytics collapse state
        if (analyticsCollapsed) {
            dom.analyticsBody.classList.add('collapsed');
            dom.analyticsSection.classList.add('analytics-collapsed');
        }

        // ── Header actions ──
        dom.addBtn.addEventListener('click', () => openModal('add'));
        dom.themeBtn.addEventListener('click', toggleTheme);
        dom.printBtn.addEventListener('click', () => window.print());
        dom.exportBtn.addEventListener('click', () => exportToCSV());
        dom.syncGsheetBtn.addEventListener('click', syncToGoogleSheets);

        // Import CSV
        dom.importBtn.addEventListener('click', () => dom.csvInput.click());
        dom.csvInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                importCSV(e.target.files[0]);
                e.target.value = '';
            }
        });

        // Backup dropdown
        setupDropdown(dom.backupMenuBtn, dom.backupMenu);
        dom.backupJsonBtn.addEventListener('click', () => {
            backupJSON();
            dom.backupMenu.classList.remove('open');
        });
        dom.restoreJsonBtn.addEventListener('click', () => {
            dom.jsonRestoreInput.click();
            dom.backupMenu.classList.remove('open');
        });
        dom.jsonRestoreInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                restoreJSON(e.target.files[0]);
                e.target.value = '';
            }
        });

        // Columns dropdown
        setupDropdown(dom.columnsBtn, dom.columnsMenu);
        // Prevent dropdown close when clicking inside
        dom.columnsMenu.addEventListener('click', (e) => e.stopPropagation());

        // Analytics toggle
        dom.analyticsToggle.addEventListener('click', () => {
            analyticsCollapsed = !analyticsCollapsed;
            dom.analyticsBody.classList.toggle('collapsed', analyticsCollapsed);
            dom.analyticsSection.classList.toggle('analytics-collapsed', analyticsCollapsed);
            savePrefs();
            if (!analyticsCollapsed) setTimeout(renderCharts, 100);
        });

        // ── Modal ──
        dom.modalCloseBtn.addEventListener('click', closeModal);
        dom.cancelBtn.addEventListener('click', closeModal);
        dom.modalOverlay.addEventListener('click', (e) => { if (e.target === dom.modalOverlay) closeModal(); });

        // Form submit
        dom.form.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = getFormData();
            if (!data.ipoName) { showToast('IPO Name is required.', 'error'); return; }
            if (!data.applicantName) { showToast('Applicant Name is required.', 'error'); return; }

            if (editingId) updateRecord(editingId, data);
            else addRecord(data);
            closeModal();
        });

        // Auto-calculate
        [dom.fieldShares, dom.fieldPrice, dom.fieldGmp, dom.fieldListingPrice, dom.fieldProfit, dom.fieldAlloted].forEach(el => {
            if (el) el.addEventListener('input', autoCalculate);
        });

        // ── Settings ──
        dom.settingsBtn.addEventListener('click', () => {
            dom.fieldGSheetUrl.value = appSettings.googleScriptUrl || '';
            dom.settingsOverlay.classList.add('active');
        });

        dom.settingsCloseBtn.addEventListener('click', () => dom.settingsOverlay.classList.remove('active'));
        dom.settingsOverlay.addEventListener('click', (e) => {
            if (e.target === dom.settingsOverlay) dom.settingsOverlay.classList.remove('active');
        });

        dom.settingsSaveBtn.addEventListener('click', () => {
            appSettings.googleScriptUrl = dom.fieldGSheetUrl.value.trim();
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(appSettings));
            dom.settingsOverlay.classList.remove('active');
            showToast('Settings saved successfully.', 'success');
        });

        // ── API Fetch (Public FinAPI) ──
        dom.fetchIpoBtn.addEventListener('click', async () => {
            const ipoInput = $('#field-ipoName');
            const ipoName = ipoInput ? ipoInput.value.trim() : '';
            if (!ipoName) {
                showToast('Please enter an IPO name to search.', 'info');
                return;
            }

            dom.fetchIpoBtn.disabled = true;
            dom.fetchIpoBtn.innerHTML = '<span style="opacity: 0.7;">Fetching...</span>';

            try {
                // Fetch public IPO list from Upvaly FinAPI (requires no API key and supports CORS)
                const res = await fetch('https://finapi.upvaly.com/api/ipo');
                if (!res.ok) throw new Error('Failed to fetch IPO list from public API');

                const responseData = await res.json();
                if (responseData.status !== 'success' || !Array.isArray(responseData.data)) {
                    throw new Error('Invalid response structure from public API');
                }

                const list = responseData.data;
                const searchName = ipoName.toLowerCase();

                // Find matching IPO (by name or symbol)
                const result = list.find(item =>
                    (item.name && item.name.toLowerCase().includes(searchName)) ||
                    (item.symbol && item.symbol.toLowerCase().includes(searchName))
                );

                if (result) {
                    const fieldLotSize = $('#field-lotSize');
                    const fieldListingDate = $('#field-listingDate');

                    // Parse lot size
                    if (result.lotSize && fieldLotSize) {
                        fieldLotSize.value = result.lotSize;
                    }

                    // Parse price (extract upper band, e.g. "₹402 – ₹424" -> "424")
                    if (result.priceRange && dom.fieldPrice) {
                        const priceParts = result.priceRange.split('–');
                        const upperCap = priceParts.pop().replace(/[^\d.]/g, '').trim();
                        if (upperCap) dom.fieldPrice.value = upperCap;
                    }

                    // Parse GMP (extract latest value, e.g. "₹18" -> "18")
                    if (result.greyMarketPremium && Array.isArray(result.greyMarketPremium.gmpTrends) && result.greyMarketPremium.gmpTrends.length > 0) {
                        const latestGmp = result.greyMarketPremium.gmpTrends[0].gmp;
                        if (latestGmp && dom.fieldGmp) {
                            dom.fieldGmp.value = latestGmp.replace(/[^\d.]/g, '').trim();
                        }
                    } else if (dom.fieldGmp) {
                        dom.fieldGmp.value = '';
                    }

                    // Parse listing date (e.g. "2026-07-24")
                    if (result.schedule && result.schedule.listingDate && fieldListingDate) {
                        fieldListingDate.value = result.schedule.listingDate;
                    }

                    // Store subscription numbers temporarily to be saved with the record
                    if (result.subscriptionNumbers) {
                        tempSubscriptionData = result.subscriptionNumbers;
                    } else {
                        tempSubscriptionData = null;
                    }

                    autoCalculate();
                    showToast('IPO Details auto-filled from public API!', 'success');
                } else {
                    showToast('No matching IPO found. Try searching with a shorter name.', 'info');
                }
            } catch (err) {
                console.error(err);
                showToast('Failed to fetch data: ' + err.message, 'error');
            } finally {
                dom.fetchIpoBtn.disabled = false;
                dom.fetchIpoBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg> Auto-Fill Data';
            }
        });

        // Profiles
        dom.profileSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val.startsWith('delete_')) {
                const profileId = val.replace('delete_', '');
                const profile = profiles.find(p => p.id === profileId);
                profileDeleteId = profileId;
                dom.profileDeleteMessage.textContent = `Delete profile "${profile?.name || 'Unknown'}"? This cannot be undone.`;
                dom.profileDeleteOverlay.classList.add('active');
                e.target.value = '';
            } else if (val) {
                loadProfile(val);
                e.target.value = '';
            }
        });

        dom.saveProfileBtn.addEventListener('click', saveProfile);

        // Profile delete modal
        dom.profileDeleteClose.addEventListener('click', () => dom.profileDeleteOverlay.classList.remove('active'));
        dom.profileDeleteCancel.addEventListener('click', () => dom.profileDeleteOverlay.classList.remove('active'));
        dom.profileDeleteOverlay.addEventListener('click', (e) => { if (e.target === dom.profileDeleteOverlay) dom.profileDeleteOverlay.classList.remove('active'); });
        dom.profileDeleteConfirm.addEventListener('click', () => {
            if (profileDeleteId) {
                const name = profiles.find(p => p.id === profileDeleteId)?.name;
                profiles = profiles.filter(p => p.id !== profileDeleteId);
                saveProfiles();
                renderProfileDropdown();
                showToast(`Profile "${name}" deleted.`, 'info');
                profileDeleteId = null;
            }
            dom.profileDeleteOverlay.classList.remove('active');
        });

        // ── Search & Filter ──
        dom.searchInput.addEventListener('input', renderTable);
        dom.filterQuota.addEventListener('change', renderTable);
        dom.filterStatus.addEventListener('change', renderTable);

        // ── Column sort ──
        $$('#records-table th[data-sort]').forEach(th => {
            th.addEventListener('click', () => handleSort(th.dataset.sort));
        });

        // ── Table actions (delegation) ──
        dom.tbody.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.btn-edit');
            const deleteBtn = e.target.closest('.btn-delete');
            const duplicateBtn = e.target.closest('.btn-duplicate');
            const subDetailsBtn = e.target.closest('.btn-sub-details');

            if (editBtn) {
                const record = records.find(r => r.id === editBtn.dataset.id);
                if (record) openModal('edit', record);
            }
            if (deleteBtn) openDeleteModal(deleteBtn.dataset.id, 'single');
            if (duplicateBtn) duplicateRecord(duplicateBtn.dataset.id);
            if (subDetailsBtn) showSubscriptionDetails(subDetailsBtn.dataset.id);
        });

        // ── Selection ──
        dom.selectAll.addEventListener('change', (e) => {
            const checkboxes = $$('.row-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = e.target.checked;
                if (e.target.checked) selectedIds.add(cb.dataset.id);
                else selectedIds.delete(cb.dataset.id);
            });
            updateSelection();
        });

        dom.tbody.addEventListener('change', (e) => {
            if (e.target.classList.contains('row-checkbox')) {
                if (e.target.checked) selectedIds.add(e.target.dataset.id);
                else selectedIds.delete(e.target.dataset.id);
                updateSelection();
            }
        });

        // ── Bulk actions ──
        dom.bulkDeleteBtn.addEventListener('click', () => openDeleteModal(null, 'bulk'));
        dom.bulkExportBtn.addEventListener('click', () => {
            const selected = records.filter(r => selectedIds.has(r.id));
            exportToCSV(selected);
        });
        dom.bulkClearBtn.addEventListener('click', () => {
            selectedIds.clear();
            $$('.row-checkbox').forEach(cb => cb.checked = false);
            updateSelection();
        });

        // ── Delete confirm ──
        dom.deleteConfirmBtn.addEventListener('click', () => {
            if (deleteMode === 'bulk') {
                bulkDelete();
            } else if (deleteTargetId) {
                deleteRecord(deleteTargetId);
            }
            closeDeleteModal();
        });

        dom.deleteCloseBtn.addEventListener('click', closeDeleteModal);
        dom.deleteCancelBtn.addEventListener('click', closeDeleteModal);
        dom.deleteOverlay.addEventListener('click', (e) => { if (e.target === dom.deleteOverlay) closeDeleteModal(); });

        // ── Keyboard shortcuts ──
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (dom.profileDeleteOverlay.classList.contains('active')) {
                    dom.profileDeleteOverlay.classList.remove('active');
                } else if (dom.deleteOverlay.classList.contains('active')) {
                    closeDeleteModal();
                } else if (dom.modalOverlay.classList.contains('active')) {
                    closeModal();
                }
            }

            // Ctrl+N → new record
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                openModal('add');
            }

            // Ctrl+K → focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                dom.searchInput.focus();
                dom.searchInput.select();
            }
        });

        // Re-render charts on resize
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (!analyticsCollapsed) renderCharts();
            }, 200);
        });

        // Setup registrar link dropdown
        setupDropdown(dom.registrarMenuBtn, dom.registrarMenu);

        // Subscription modal close
        dom.btnSubClose.addEventListener('click', () => dom.subModalOverlay.classList.remove('active'));
        dom.subModalOverlay.addEventListener('click', (e) => {
            if (e.target === dom.subModalOverlay) dom.subModalOverlay.classList.remove('active');
        });

        // Load timeline calendar dynamically from the API
        loadTimelineData();
    }

    function showSubscriptionDetails(id) {
        const record = records.find(r => r.id === id);
        if (!record || !record.subscriptionNumbers) return;

        const sub = record.subscriptionNumbers;
        dom.subIpoName.textContent = record.ipoName || 'Subscription Details';

        let html = '';
        const categories = [
            { key: 'retail', label: 'Retail (RII)' },
            { key: 'nii', label: 'HNI / NII' },
            { key: 'institutional', label: 'QIB / Institutional' },
            { key: 'total', label: 'Total Subscription' }
        ];

        categories.forEach(cat => {
            const data = sub[cat.key];
            if (data) {
                const demand = data.subscription || (data.applied ? `${data.applied}x` : '—');
                const isTotal = cat.key === 'total';
                const style = isTotal ? 'font-weight: 700; border-top: 1px solid var(--border-default);' : '';
                html += `
                    <tr style="${style}">
                        <td style="padding: 10px 12px; color: ${isTotal ? 'var(--text-primary)' : 'var(--text-secondary)'}; border-bottom: 1px solid var(--border-subtle);">${cat.label}</td>
                        <td style="padding: 10px 12px; font-weight: 600; color: ${isTotal ? 'var(--accent-primary)' : 'var(--text-primary)'}; border-bottom: 1px solid var(--border-subtle);">${demand}</td>
                    </tr>
                `;
            }
        });

        dom.subTableBody.innerHTML = html;
        dom.subModalOverlay.classList.add('active');
    }

    // ── Google Sheets Sync ──
    async function syncToGoogleSheets() {
        if (!appSettings.googleScriptUrl) {
            showToast('Google Apps Script URL is missing. Please configure it in Settings.', 'error');
            return;
        }

        const btn = dom.syncGsheetBtn;
        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span style="opacity:0.7;">Syncing...</span>';

        try {
            await fetch(appSettings.googleScriptUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify(records)
            });

            // With no-cors mode, the response is opaque, so we cannot check response.ok or response.json().
            // We just assume success if the fetch didn't throw a network error.
            showToast('Sync request sent to Google Sheets!', 'success');
        } catch (err) {
            console.error('Google Sheets Sync Error:', err);
            showToast('Failed to sync. Make sure your Apps Script Web App is deployed and URL is correct.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    }

    // ── Initialize ──────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
const endAngle = startAngle + sliceAngle;

ctx.beginPath();
ctx.moveTo(cx + innerRadius * Math.cos(startAngle), cy + innerRadius * Math.sin(startAngle));
ctx.arc(cx, cy, radius, startAngle, endAngle);
ctx.arc(cx, cy, innerRadius, endAngle, startAngle, true);
ctx.closePath();
ctx.fillStyle = colors[labels[i]];
ctx.fill();

startAngle = endAngle;
        });

// Center
ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim();
ctx.font = `700 ${Math.max(16, radius * 0.28)}px Inter, sans-serif`;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText(total, cx, cy - 6);
ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim();
ctx.font = `500 ${Math.max(9, radius * 0.13)}px Inter, sans-serif`;
ctx.fillText('STATUS', cx, cy + 14);

// Legend
const legendX = w * 0.72;
let legendY = h * 0.22;
labels.forEach((label, i) => {
    if (values[i] === 0) return;
    ctx.fillStyle = colors[label];
    ctx.beginPath();
    ctx.arc(legendX, legendY + 1, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
    ctx.font = '500 11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${label} (${values[i]})`, legendX + 12, legendY + 1);
    legendY += 22;
});
    }

function drawEmptyChart(ctx, w, h, text) {
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim();
    ctx.font = '500 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2);
}

function drawRoundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
}

function formatCurrencyShort(val) {
    const absVal = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    if (absVal >= 10000000) return sign + '₹' + (absVal / 10000000).toFixed(1) + 'Cr';
    if (absVal >= 100000) return sign + '₹' + (absVal / 100000).toFixed(1) + 'L';
    if (absVal >= 1000) return sign + '₹' + (absVal / 1000).toFixed(1) + 'K';
    return sign + '₹' + absVal.toFixed(0);
}

// ── Column Visibility ───────────────────────
function applyColumnVisibility() {
    let styleEl = $('#col-visibility-style');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'col-visibility-style';
        document.head.appendChild(styleEl);
    }

    const rules = ALL_COLUMNS
        .filter(c => !visibleColumns.has(c.key))
        .map(c => `[data-col="${c.key}"] { display: none !important; }`)
        .join('\n');

    styleEl.textContent = rules;
}

function renderColumnToggles() {
    dom.columnsMenu.innerHTML = '';
    ALL_COLUMNS.filter(c => !c.locked).forEach(col => {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = visibleColumns.has(col.key);
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) visibleColumns.add(col.key);
            else visibleColumns.delete(col.key);
            applyColumnVisibility();
            renderTable();
            savePrefs();
        });
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(col.label));
        dom.columnsMenu.appendChild(label);
    });
}

// ── Render Table ────────────────────────────
function getFilteredRecords() {
    let filtered = [...records];
    const query = dom.searchInput.value.toLowerCase().trim();
    const quotaFilter = dom.filterQuota.value;
    const statusFilter = dom.filterStatus.value;

    if (query) {
        filtered = filtered.filter(r =>
            (r.ipoName || '').toLowerCase().includes(query) ||
            (r.applicantName || '').toLowerCase().includes(query) ||
            (r.pan || '').toLowerCase().includes(query) ||
            (r.upiId || '').toLowerCase().includes(query) ||
            (r.notes || '').toLowerCase().includes(query)
        );
    }

    if (quotaFilter) filtered = filtered.filter(r => r.quota === quotaFilter);

    if (statusFilter) {
        filtered = filtered.filter(r => {
            if (statusFilter === 'Applied') return r.applied === 'Yes';
            if (statusFilter === 'Pending') return r.applied === 'Pending';
            if (statusFilter === 'Allotted') return pf(r.alloted) > 0;
            if (statusFilter === 'Not Allotted') return r.applied === 'Yes' && pf(r.alloted) === 0;
            if (statusFilter === 'Withdrawn') return r.withdrawal === 'Yes';
            return true;
        });
    }

    if (currentSort.key) {
        const numericFields = ['shares', 'price', 'amount', 'alloted', 'profit', 'marginPercent', 'margin', 'lotSize', 'listingPrice'];
        filtered.sort((a, b) => {
            let valA = a[currentSort.key];
            let valB = b[currentSort.key];

            if (numericFields.includes(currentSort.key)) {
                valA = pf(valA); valB = pf(valB);
            } else if (currentSort.key === 'listingDate') {
                valA = valA ? new Date(valA).getTime() : 0;
                valB = valB ? new Date(valB).getTime() : 0;
            } else {
                valA = (valA || '').toString().toLowerCase();
                valB = (valB || '').toString().toLowerCase();
            }

            if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
            if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    return filtered;
}

function renderTable() {
    const filtered = getFilteredRecords();
    dom.tbody.innerHTML = '';

    if (filtered.length === 0) {
        dom.tableWrapper.style.display = 'none';
        dom.tfoot.style.display = 'none';
        dom.emptyState.classList.add('show');
        return;
    }

    dom.tableWrapper.style.display = 'block';
    dom.emptyState.classList.remove('show');

    filtered.forEach((r, i) => {
        const tr = document.createElement('tr');
        if (selectedIds.has(r.id)) tr.classList.add('selected');
        const profit = pf(r.profit);
        const marginPct = pf(r.marginPercent);
        const profitClass = profit > 0 ? 'positive' : profit < 0 ? 'negative' : '';
        const marginPctClass = marginPct > 0 ? 'positive' : marginPct < 0 ? 'negative' : '';

        tr.innerHTML = `
                <td class="td-checkbox" data-col="checkbox">
                    <label class="checkbox-wrap">
                        <input type="checkbox" class="row-checkbox" data-id="${r.id}" ${selectedIds.has(r.id) ? 'checked' : ''}>
                        <span class="checkmark"></span>
                    </label>
                </td>
                <td class="td-num" data-col="num">${i + 1}</td>
                <td class="td-ipo-name" data-col="ipoName">${escapeHtml(r.ipoName || '')}</td>
                <td data-col="applicantName">${escapeHtml(r.applicantName || '')}</td>
                <td data-col="pan" style="font-family:monospace;font-size:0.78rem;">${escapeHtml((r.pan || '').toUpperCase())}</td>
                <td data-col="upiId" style="font-size:0.78rem;">${escapeHtml(r.upiId || '')}</td>
                <td data-col="quota">${quotaBadge(r.quota)}</td>
                <td data-col="listingDate">${formatDate(r.listingDate)}</td>
                <td class="td-amount" data-col="lotSize">${r.lotSize || '—'}</td>
                <td class="td-amount" data-col="shares">${formatNumber(r.shares)}</td>
                <td class="td-amount" data-col="price">${r.price ? formatCurrency(r.price) : '—'}</td>
                <td class="td-amount" data-col="listingPrice">${r.listingPrice ? formatCurrency(r.listingPrice) : '—'}</td>
                <td class="td-amount" data-col="amount">${r.amount ? formatCurrency(r.amount) : '—'}</td>
                <td data-col="applied">${appliedBadge(r.applied)}</td>
                <td class="td-amount" data-col="alloted">${formatNumber(r.alloted)}</td>
                <td data-col="withdrawal">${withdrawalBadge(r.withdrawal)}</td>
                <td class="td-profit ${profitClass}" data-col="profit">${profit !== 0 ? (profit > 0 ? '+' : '') + formatCurrency(profit) : '—'}</td>
                <td class="td-margin-pct ${marginPctClass}" data-col="marginPercent">${marginPct !== 0 ? marginPct.toFixed(2) + '%' : '—'}</td>
                <td class="td-amount" data-col="margin">${r.margin ? formatCurrency(r.margin) : '—'}</td>
                <td class="td-notes" data-col="notes" title="${escapeHtml(r.notes || '')}">${escapeHtml(r.notes || '') || '—'}</td>
                <td class="td-actions" data-col="actions">
                    <div class="action-group">
                        <button class="btn-icon btn-edit" data-id="${r.id}" title="Edit">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="btn-icon btn-duplicate" data-id="${r.id}" title="Duplicate">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        </button>
                        <button class="btn-icon btn-delete" data-id="${r.id}" title="Delete">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </div>
                </td>
            `;
        dom.tbody.appendChild(tr);
    });

    renderSummaryRow(filtered);
    updateSelectAllState();
}

function renderSummaryRow(filtered) {
    if (filtered.length === 0) {
        dom.tfoot.style.display = 'none';
        return;
    }

    dom.tfoot.style.display = '';
    const totals = {
        shares: filtered.reduce((s, r) => s + pf(r.shares), 0),
        amount: filtered.reduce((s, r) => s + pf(r.amount), 0),
        alloted: filtered.reduce((s, r) => s + pf(r.alloted), 0),
        profit: filtered.reduce((s, r) => s + pf(r.profit), 0),
        margin: filtered.reduce((s, r) => s + pf(r.margin), 0),
    };
    const avgMarginPct = totals.amount > 0 ? ((totals.profit / totals.amount) * 100).toFixed(2) : 0;

    dom.summaryRow.innerHTML = `
            <td data-col="checkbox"></td>
            <td data-col="num"></td>
            <td data-col="ipoName" style="font-weight:700;">TOTALS (${filtered.length})</td>
            <td data-col="applicantName"></td>
            <td data-col="pan"></td>
            <td data-col="upiId"></td>
            <td data-col="quota"></td>
            <td data-col="listingDate"></td>
            <td data-col="lotSize"></td>
            <td data-col="shares">${formatNumber(totals.shares)}</td>
            <td data-col="price"></td>
            <td data-col="listingPrice"></td>
            <td data-col="amount">${formatCurrency(totals.amount)}</td>
            <td data-col="applied"></td>
            <td data-col="alloted">${formatNumber(totals.alloted)}</td>
            <td data-col="withdrawal"></td>
            <td data-col="profit" style="color:${totals.profit >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'}">${(totals.profit > 0 ? '+' : '') + formatCurrency(totals.profit)}</td>
            <td data-col="marginPercent" style="color:${avgMarginPct >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'}">${avgMarginPct}%</td>
            <td data-col="margin">${formatCurrency(totals.margin)}</td>
            <td data-col="notes"></td>
            <td data-col="actions"></td>
        `;
}

function quotaBadge(quota) {
    const cls = { 'Retail': 'badge-applied', 'sHNI': 'badge-pending', 'bHNI': 'badge-pending', 'Employee': 'badge-no' };
    return `<span class="badge ${cls[quota] || 'badge-no'}">${escapeHtml(quota || 'N/A')}</span>`;
}

function appliedBadge(applied) {
    const cls = { 'Yes': 'badge-yes', 'No': 'badge-no', 'Pending': 'badge-pending' };
    return `<span class="badge ${cls[applied] || 'badge-no'}">${escapeHtml(applied || 'N/A')}</span>`;
}

function withdrawalBadge(withdrawal) {
    return withdrawal === 'Yes'
        ? '<span class="badge badge-withdrawn">Yes</span>'
        : '<span class="badge badge-no">No</span>';
}

// ── Selection ───────────────────────────────
function updateSelection() {
    const count = selectedIds.size;
    dom.bulkCount.textContent = count + ' selected';
    dom.bulkBar.classList.toggle('active', count > 0);
    updateSelectAllState();

    // Update row highlights
    $$('#records-body tr').forEach(tr => {
        const cb = tr.querySelector('.row-checkbox');
        if (cb) tr.classList.toggle('selected', selectedIds.has(cb.dataset.id));
    });
}

function updateSelectAllState() {
    const checkboxes = $$('.row-checkbox');
    if (checkboxes.length === 0) { dom.selectAll.checked = false; return; }
    const allChecked = [...checkboxes].every(cb => cb.checked);
    const someChecked = [...checkboxes].some(cb => cb.checked);
    dom.selectAll.checked = allChecked;
    dom.selectAll.indeterminate = someChecked && !allChecked;
}

// ── Modal ───────────────────────────────────
function openModal(mode, record) {
    editingId = mode === 'edit' ? record.id : null;
    dom.modalTitle.textContent = mode === 'edit' ? 'Edit IPO Record' : 'Add New IPO Record';

    const icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`;
    dom.submitBtn.innerHTML = icon + (mode === 'edit' ? ' Update Record' : ' Save Record');

    if (mode === 'edit' && record) populateForm(record);
    else dom.form.reset();

    dom.modalOverlay.classList.add('active');
    setTimeout(() => $('#field-ipoName').focus(), 200);
}

function closeModal() {
    dom.modalOverlay.classList.remove('active');
    editingId = null;
    dom.form.reset();
}

function populateForm(record) {
    FORM_FIELDS.forEach(f => {
        const el = $(`#field-${f}`);
        if (el) el.value = record[f] || '';
    });
}

function getFormData() {
    const data = {};
    FORM_FIELDS.forEach(f => {
        const el = $(`#field-${f}`);
        if (el) data[f] = el.value.trim();
    });
    data.pan = (data.pan || '').toUpperCase();
    return data;
}

// ── Auto-Calculations ───────────────────────
function autoCalculate() {
    const shares = pf(dom.fieldShares.value);
    const price = pf(dom.fieldPrice.value);
    const amount = shares * price;
    const listingPrice = pf(dom.fieldListingPrice.value);
    const alloted = pf(dom.fieldAlloted.value);

    if (shares && price) {
        dom.fieldAmount.value = amount.toFixed(2);
    }

    // Auto-calculate profit from listing price if available
    if (listingPrice > 0 && price > 0 && alloted > 0) {
        const profit = (listingPrice - price) * alloted;
        dom.fieldProfit.value = profit.toFixed(2);
    }

    const profit = pf(dom.fieldProfit.value);
    const currentAmount = pf(dom.fieldAmount.value);
    if (currentAmount > 0 && profit !== 0) {
        dom.fieldMarginPercent.value = ((profit / currentAmount) * 100).toFixed(2);
    }
}

// ── CRUD ────────────────────────────────────
function addRecord(data) {
    data.id = generateId();
    data.createdAt = new Date().toISOString();
    records.push(data);
    saveRecords();
    refreshAll();
    showToast('Record added successfully!', 'success');
}

function updateRecord(id, data) {
    const idx = records.findIndex(r => r.id === id);
    if (idx === -1) return;
    data.id = id;
    data.createdAt = records[idx].createdAt;
    data.updatedAt = new Date().toISOString();
    records[idx] = data;
    saveRecords();
    refreshAll();
    showToast('Record updated successfully!', 'success');
}

function deleteRecord(id) {
    records = records.filter(r => r.id !== id);
    selectedIds.delete(id);
    saveRecords();
    refreshAll();
    updateSelection();
    showToast('Record deleted.', 'info');
}

function duplicateRecord(id) {
    const original = records.find(r => r.id === id);
    if (!original) return;
    const copy = { ...original };
    copy.id = generateId();
    copy.createdAt = new Date().toISOString();
    copy.ipoName = (copy.ipoName || '') + ' (Copy)';
    delete copy.updatedAt;
    records.push(copy);
    saveRecords();
    refreshAll();
    showToast('Record duplicated!', 'success');
}

function bulkDelete() {
    if (selectedIds.size === 0) return;
    records = records.filter(r => !selectedIds.has(r.id));
    const count = selectedIds.size;
    selectedIds.clear();
    saveRecords();
    refreshAll();
    updateSelection();
    showToast(`${count} record(s) deleted.`, 'info');
}

function refreshAll() {
    updateDashboard();
    renderTable();
    renderCharts();
}

// ── Profiles ────────────────────────────────
function renderProfileDropdown() {
    dom.profileSelect.innerHTML = '<option value="">— Saved Profiles —</option>';
    profiles.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} (${p.pan || 'No PAN'})`;
        dom.profileSelect.appendChild(opt);
    });

    // Add delete options
    if (profiles.length > 0) {
        const sep = document.createElement('option');
        sep.disabled = true;
        sep.textContent = '────────────';
        dom.profileSelect.appendChild(sep);

        profiles.forEach(p => {
            const opt = document.createElement('option');
            opt.value = 'delete_' + p.id;
            opt.textContent = `🗑️ Delete: ${p.name}`;
            opt.style.color = '#f43f5e';
            dom.profileSelect.appendChild(opt);
        });
    }
}

function loadProfile(profileId) {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;
    $('#field-applicantName').value = profile.name || '';
    $('#field-pan').value = profile.pan || '';
    $('#field-upiId').value = profile.upiId || '';
    showToast(`Profile "${profile.name}" loaded.`, 'info');
}

function saveProfile() {
    const name = $('#field-applicantName').value.trim();
    const pan = $('#field-pan').value.trim().toUpperCase();
    const upiId = $('#field-upiId').value.trim();

    if (!name) {
        showToast('Enter applicant name first.', 'error');
        return;
    }

    // Check if profile with same PAN exists
    const existing = profiles.findIndex(p => p.pan && p.pan === pan);
    if (existing > -1) {
        profiles[existing] = { ...profiles[existing], name, pan, upiId };
        showToast(`Profile "${name}" updated.`, 'success');
    } else {
        profiles.push({ id: generateId(), name, pan, upiId });
        showToast(`Profile "${name}" saved!`, 'success');
    }

    saveProfiles();
    renderProfileDropdown();
}

// ── Import CSV ──────────────────────────────
function importCSV(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target.result;
            const lines = text.split(/\r?\n/).filter(l => l.trim());
            if (lines.length < 2) {
                showToast('CSV file is empty or has no data rows.', 'error');
                return;
            }

            const headers = parseCSVLine(lines[0]);
            const headerMap = buildHeaderMap(headers);
            let imported = 0;

            for (let i = 1; i < lines.length; i++) {
                const values = parseCSVLine(lines[i]);
                if (values.length === 0) continue;

                const record = { id: generateId(), createdAt: new Date().toISOString() };
                CSV_KEYS.forEach((key, ki) => {
                    const csvIdx = headerMap[CSV_HEADERS[ki]?.toLowerCase()];
                    if (csvIdx !== undefined && values[csvIdx] !== undefined) {
                        record[key] = values[csvIdx].trim();
                    }
                });

                // Also try direct key matching
                FORM_FIELDS.forEach(key => {
                    if (!record[key]) {
                        const idx = headerMap[key.toLowerCase()];
                        if (idx !== undefined && values[idx]) record[key] = values[idx].trim();
                    }
                });

                if (record.ipoName || record.applicantName) {
                    records.push(record);
                    imported++;
                }
            }

            saveRecords();
            refreshAll();
            showToast(`${imported} record(s) imported successfully!`, 'success');
        } catch (err) {
            showToast('Error parsing CSV: ' + err.message, 'error');
        }
    };
    reader.readAsText(file);
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"') {
                if (i + 1 < line.length && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                current += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === ',') {
                result.push(current);
                current = '';
            } else {
                current += ch;
            }
        }
    }
    result.push(current);
    return result;
}

function buildHeaderMap(headers) {
    const map = {};
    headers.forEach((h, i) => {
        map[h.trim().toLowerCase()] = i;
    });
    return map;
}

// ── Export CSV ───────────────────────────────
function exportToCSV(recordsToExport) {
    const data = recordsToExport || records;
    if (data.length === 0) {
        showToast('No records to export.', 'error');
        return;
    }

    let csv = CSV_HEADERS.join(',') + '\n';
    data.forEach(r => {
        const row = CSV_KEYS.map(k => {
            let val = r[k] || '';
            if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
                val = '"' + val.replace(/"/g, '""') + '"';
            }
            return val;
        });
        csv += row.join(',') + '\n';
    });

    downloadBlob(csv, `ipo_records_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
    showToast('CSV exported!', 'success');
}

// ── Backup / Restore ────────────────────────
function backupJSON() {
    const backup = {
        version: 2,
        exportedAt: new Date().toISOString(),
        records: records,
        profiles: profiles,
    };
    const json = JSON.stringify(backup, null, 2);
    downloadBlob(json, `ipo_backup_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
    showToast('Backup exported!', 'success');
}

function restoreJSON(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.records && Array.isArray(data.records)) {
                records = data.records;
                saveRecords();
            }
            if (data.profiles && Array.isArray(data.profiles)) {
                profiles = data.profiles;
                saveProfiles();
                renderProfileDropdown();
            }
            refreshAll();
            showToast(`Restored ${records.length} records!`, 'success');
        } catch (err) {
            showToast('Invalid backup file: ' + err.message, 'error');
        }
    };
    reader.readAsText(file);
}

function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ── Sort ────────────────────────────────────
function handleSort(key) {
    if (currentSort.key === key) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.key = key;
        currentSort.direction = 'asc';
    }

    $$('#records-table th').forEach(th => {
        th.classList.remove('sort-active');
        const icon = th.querySelector('.sort-icon');
        if (icon) icon.textContent = '↕';
    });

    const activeTh = $(`#records-table th[data-sort="${key}"]`);
    if (activeTh) {
        activeTh.classList.add('sort-active');
        const icon = activeTh.querySelector('.sort-icon');
        if (icon) icon.textContent = currentSort.direction === 'asc' ? '↑' : '↓';
    }

    renderTable();
}

// ── Delete Confirmation ─────────────────────
function openDeleteModal(id, mode) {
    deleteTargetId = id;
    deleteMode = mode || 'single';

    if (mode === 'bulk') {
        dom.deleteModalTitle.textContent = 'Confirm Bulk Delete';
        dom.deleteMessage.textContent = `Are you sure you want to delete ${selectedIds.size} selected record(s)? This action cannot be undone.`;
    } else {
        dom.deleteModalTitle.textContent = 'Confirm Delete';
        dom.deleteMessage.textContent = 'Are you sure you want to delete this IPO record? This action cannot be undone.';
    }

    dom.deleteOverlay.classList.add('active');
}

function closeDeleteModal() {
    deleteTargetId = null;
    dom.deleteOverlay.classList.remove('active');
}

// ── Theme Toggle ────────────────────────────
function toggleTheme() {
    const current = dom.html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    dom.html.setAttribute('data-theme', next);
    savePrefs();
    // Re-render charts for new theme colors
    setTimeout(renderCharts, 50);
}

// ── Toast Notifications ─────────────────────
function showToast(message, type) {
    type = type || 'info';
    const icons = {
        success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
        error: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
        info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${escapeHtml(message)}</span>`;
    dom.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
}

// ── Dropdown Management ─────────────────────
function setupDropdown(triggerBtn, menu) {
    triggerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Close all other dropdowns
        $$('.dropdown-menu.open').forEach(m => { if (m !== menu) m.classList.remove('open'); });
        menu.classList.toggle('open');
    });
}

// Close dropdowns on outside click
document.addEventListener('click', () => {
    $$('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
});

// ── Event Listeners ─────────────────────────
function init() {
    loadPrefs();
    loadRecords();
    loadProfiles();

    applyColumnVisibility();
    renderColumnToggles();
    renderProfileDropdown();
    updateDashboard();
    renderTable();

    // Defer chart rendering slightly to ensure CSS has applied
    setTimeout(renderCharts, 100);

    // Analytics collapse state
    if (analyticsCollapsed) {
        dom.analyticsBody.classList.add('collapsed');
        dom.analyticsSection.classList.add('analytics-collapsed');
    }

    // ── Header actions ──
    dom.addBtn.addEventListener('click', () => openModal('add'));
    dom.themeBtn.addEventListener('click', toggleTheme);
    dom.printBtn.addEventListener('click', () => window.print());
    dom.exportBtn.addEventListener('click', () => exportToCSV());

    // Import CSV
    dom.importBtn.addEventListener('click', () => dom.csvInput.click());
    dom.csvInput.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            importCSV(e.target.files[0]);
            e.target.value = '';
        }
    });

    // Backup dropdown
    setupDropdown(dom.backupMenuBtn, dom.backupMenu);
    dom.backupJsonBtn.addEventListener('click', () => {
        backupJSON();
        dom.backupMenu.classList.remove('open');
    });
    dom.restoreJsonBtn.addEventListener('click', () => {
        dom.jsonRestoreInput.click();
        dom.backupMenu.classList.remove('open');
    });
    dom.jsonRestoreInput.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            restoreJSON(e.target.files[0]);
            e.target.value = '';
        }
    });

    // Columns dropdown
    setupDropdown(dom.columnsBtn, dom.columnsMenu);
    // Prevent dropdown close when clicking inside
    dom.columnsMenu.addEventListener('click', (e) => e.stopPropagation());

    // Analytics toggle
    dom.analyticsToggle.addEventListener('click', () => {
        analyticsCollapsed = !analyticsCollapsed;
        dom.analyticsBody.classList.toggle('collapsed', analyticsCollapsed);
        dom.analyticsSection.classList.toggle('analytics-collapsed', analyticsCollapsed);
        savePrefs();
        if (!analyticsCollapsed) setTimeout(renderCharts, 100);
    });

    // ── Modal ──
    dom.modalCloseBtn.addEventListener('click', closeModal);
    dom.cancelBtn.addEventListener('click', closeModal);
    dom.modalOverlay.addEventListener('click', (e) => { if (e.target === dom.modalOverlay) closeModal(); });

    // Form submit
    dom.form.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = getFormData();
        if (!data.ipoName) { showToast('IPO Name is required.', 'error'); return; }
        if (!data.applicantName) { showToast('Applicant Name is required.', 'error'); return; }

        if (editingId) updateRecord(editingId, data);
        else addRecord(data);
        closeModal();
    });

    // Auto-calculate
    [dom.fieldShares, dom.fieldPrice, dom.fieldListingPrice, dom.fieldProfit, dom.fieldAlloted].forEach(el => {
        if (el) el.addEventListener('input', autoCalculate);
    });

    // ── Settings ──
    dom.settingsBtn.addEventListener('click', () => {
        dom.fieldApiKey.value = appSettings.apiKey || '';
        dom.settingsOverlay.classList.add('active');
    });

    dom.settingsCloseBtn.addEventListener('click', () => dom.settingsOverlay.classList.remove('active'));
    dom.settingsOverlay.addEventListener('click', (e) => {
        if (e.target === dom.settingsOverlay) dom.settingsOverlay.classList.remove('active');
    });

    dom.settingsSaveBtn.addEventListener('click', () => {
        appSettings.apiKey = dom.fieldApiKey.value.trim();
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(appSettings));
        dom.settingsOverlay.classList.remove('active');
        showToast('Settings saved successfully.', 'success');
    });

    // ── API Fetch ──
    dom.fetchIpoBtn.addEventListener('click', async () => {
        const ipoInput = $('#field-ipoName');
        const ipoName = ipoInput ? ipoInput.value.trim() : '';
        if (!ipoName) {
            showToast('Please enter an IPO name to search.', 'info');
            return;
        }

        if (!appSettings.apiKey) {
            showToast('API Key missing. Please configure it in Settings (top right).', 'error');
            return;
        }

        dom.fetchIpoBtn.disabled = true;
        dom.fetchIpoBtn.innerHTML = '<span style="opacity: 0.7;">Fetching...</span>';

        try {
            const res = await fetch(`https://indianapi.in/api/v1/ipo?name=${encodeURIComponent(ipoName)}`, {
                headers: { 'Authorization': `Bearer ${appSettings.apiKey}` }
            });

            if (!res.ok) throw new Error('Failed to fetch data or Invalid API Key');

            const data = await res.json();

            const result = Array.isArray(data) ? data[0] : (data.data ? data.data[0] : data);

            if (result) {
                const fieldLotSize = $('#field-lotSize');
                const fieldListingDate = $('#field-listingDate');

                if (result.lot_size && fieldLotSize) fieldLotSize.value = result.lot_size;
                if ((result.price_band_end || result.price) && dom.fieldPrice) dom.fieldPrice.value = result.price_band_end || result.price;
                if (result.listing_date && fieldListingDate) fieldListingDate.value = result.listing_date.split('T')[0];

                autoCalculate();
                showToast('IPO Details auto-filled!', 'success');
            } else {
                showToast('No matching IPO found.', 'info');
            }
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            dom.fetchIpoBtn.disabled = false;
            dom.fetchIpoBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg> Auto-Fill Data';
        }
    });

    // Profiles
    dom.profileSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val.startsWith('delete_')) {
            const profileId = val.replace('delete_', '');
            const profile = profiles.find(p => p.id === profileId);
            profileDeleteId = profileId;
            dom.profileDeleteMessage.textContent = `Delete profile "${profile?.name || 'Unknown'}"? This cannot be undone.`;
            dom.profileDeleteOverlay.classList.add('active');
            e.target.value = '';
        } else if (val) {
            loadProfile(val);
            e.target.value = '';
        }
    });

    dom.saveProfileBtn.addEventListener('click', saveProfile);

    // Profile delete modal
    dom.profileDeleteClose.addEventListener('click', () => dom.profileDeleteOverlay.classList.remove('active'));
    dom.profileDeleteCancel.addEventListener('click', () => dom.profileDeleteOverlay.classList.remove('active'));
    dom.profileDeleteOverlay.addEventListener('click', (e) => { if (e.target === dom.profileDeleteOverlay) dom.profileDeleteOverlay.classList.remove('active'); });
    dom.profileDeleteConfirm.addEventListener('click', () => {
        if (profileDeleteId) {
            const name = profiles.find(p => p.id === profileDeleteId)?.name;
            profiles = profiles.filter(p => p.id !== profileDeleteId);
            saveProfiles();
            renderProfileDropdown();
            showToast(`Profile "${name}" deleted.`, 'info');
            profileDeleteId = null;
        }
        dom.profileDeleteOverlay.classList.remove('active');
    });

    // ── Search & Filter ──
    dom.searchInput.addEventListener('input', renderTable);
    dom.filterQuota.addEventListener('change', renderTable);
    dom.filterStatus.addEventListener('change', renderTable);

    // ── Column sort ──
    $$('#records-table th[data-sort]').forEach(th => {
        th.addEventListener('click', () => handleSort(th.dataset.sort));
    });

    // ── Table actions (delegation) ──
    dom.tbody.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.btn-edit');
        const deleteBtn = e.target.closest('.btn-delete');
        const duplicateBtn = e.target.closest('.btn-duplicate');

        if (editBtn) {
            const record = records.find(r => r.id === editBtn.dataset.id);
            if (record) openModal('edit', record);
        }
        if (deleteBtn) openDeleteModal(deleteBtn.dataset.id, 'single');
        if (duplicateBtn) duplicateRecord(duplicateBtn.dataset.id);
    });

    // ── Selection ──
    dom.selectAll.addEventListener('change', (e) => {
        const checkboxes = $$('.row-checkbox');
        checkboxes.forEach(cb => {
            cb.checked = e.target.checked;
            if (e.target.checked) selectedIds.add(cb.dataset.id);
            else selectedIds.delete(cb.dataset.id);
        });
        updateSelection();
    });

    dom.tbody.addEventListener('change', (e) => {
        if (e.target.classList.contains('row-checkbox')) {
            if (e.target.checked) selectedIds.add(e.target.dataset.id);
            else selectedIds.delete(e.target.dataset.id);
            updateSelection();
        }
    });

    // ── Bulk actions ──
    dom.bulkDeleteBtn.addEventListener('click', () => openDeleteModal(null, 'bulk'));
    dom.bulkExportBtn.addEventListener('click', () => {
        const selected = records.filter(r => selectedIds.has(r.id));
        exportToCSV(selected);
    });
    dom.bulkClearBtn.addEventListener('click', () => {
        selectedIds.clear();
        $$('.row-checkbox').forEach(cb => cb.checked = false);
        updateSelection();
    });

    // ── Delete confirm ──
    dom.deleteConfirmBtn.addEventListener('click', () => {
        if (deleteMode === 'bulk') {
            bulkDelete();
        } else if (deleteTargetId) {
            deleteRecord(deleteTargetId);
        }
        closeDeleteModal();
    });

    dom.deleteCloseBtn.addEventListener('click', closeDeleteModal);
    dom.deleteCancelBtn.addEventListener('click', closeDeleteModal);
    dom.deleteOverlay.addEventListener('click', (e) => { if (e.target === dom.deleteOverlay) closeDeleteModal(); });

    // ── Keyboard shortcuts ──
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (dom.profileDeleteOverlay.classList.contains('active')) {
                dom.profileDeleteOverlay.classList.remove('active');
            } else if (dom.deleteOverlay.classList.contains('active')) {
                closeDeleteModal();
            } else if (dom.modalOverlay.classList.contains('active')) {
                closeModal();
            }
        }

        // Ctrl+N → new record
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            openModal('add');
        }

        // Ctrl+K → focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            dom.searchInput.focus();
            dom.searchInput.select();
        }
    });

    // Re-render charts on resize
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (!analyticsCollapsed) renderCharts();
        }, 200);
    });
}

// ── Initialize ──────────────────────────────
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

/* ============================================
   NEW IPO PREMIUM UI LOGIC
   ============================================ */

const PREMIUM_MOCK_DATA = {
    open: [
        { id: 'p1', name: 'Zomato Ltd', type: 'Mainboard', gmp: '+45%', gmpValue: 45, price: '₹72 - ₹76', minInv: '₹14,820', subs: 12.5, lot: 195 },
        { id: 'p2', name: 'Nykaa Beauty', type: 'Mainboard', gmp: '+60%', gmpValue: 60, price: '₹1,085 - ₹1,125', minInv: '₹13,500', subs: 82.1, lot: 12 },
        { id: 'p3', name: 'Paytm (One97)', type: 'Mainboard', gmp: '-5%', gmpValue: -5, price: '₹2,080 - ₹2,150', minInv: '₹12,900', subs: 1.8, lot: 6 },
    ],
    upcoming: [
        { id: 'p4', name: 'Swiggy', type: 'Mainboard', gmp: '+30%', gmpValue: 30, price: '₹200 - ₹220', minInv: '₹15,000', subs: 0, lot: 68 },
    ],
    closed: [
        { id: 'p5', name: 'LIC India', type: 'Mainboard', gmp: '-2%', gmpValue: -2, price: '₹902 - ₹949', minInv: '₹14,235', subs: 2.9, lot: 15 },
    ]
};

function initPremiumUI() {
    // 1. Navigation Switching
    const navItems = document.querySelectorAll('.nav-item');
    const appViews = document.querySelectorAll('.app-view');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            appViews.forEach(v => v.classList.remove('active'));
            item.classList.add('active');
            const targetView = document.getElementById(item.dataset.view);
            if (targetView) targetView.classList.add('active');
        });
    });

    // 2. IPO Tabs
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const targetId = tab.dataset.target;
            const targetEl = document.getElementById(targetId);
            if (targetEl) targetEl.classList.add('active');
        });
    });

    // 3. Render IPO Cards
    function renderIPOCards(containerId, dataArray, isOpen = false) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';

        dataArray.forEach(ipo => {
            const card = document.createElement('div');
            card.className = 'ipo-card';
            const gmpClass = ipo.gmpValue < 0 ? 'negative' : '';

            card.innerHTML = `
                <div class="ipo-card-header">
                    <div class="ipo-icon-name">
                        <div class="ipo-logo-ph">${ipo.name.charAt(0)}</div>
                        <div>
                            <div class="ipo-name">${ipo.name}</div>
                            <div class="ipo-type">${ipo.type}</div>
                        </div>
                    </div>
                    <div class="gmp-badge ${gmpClass}">${ipo.gmp} GMP</div>
                </div>
                <div class="ipo-metrics">
                    <div class="metric-box">
                        <p>Price Band</p>
                        <strong>${ipo.price}</strong>
                    </div>
                    <div class="metric-box">
                        <p>Min Investment</p>
                        <strong>${ipo.minInv}</strong>
                    </div>
                </div>
                ${isOpen ? `
                <div class="ipo-subs">
                    <span>Subscription</span>
                    <strong>${ipo.subs}x</strong>
                </div>
                <div class="subs-bar">
                    <div class="subs-fill" style="width: ${Math.min(ipo.subs * 10, 100)}%;"></div>
                </div>
                <button class="btn btn-primary btn-block apply-trigger-btn" style="margin-top:16px;" data-id="${ipo.id}">Apply Now</button>
                ` : ''}
            `;
            container.appendChild(card);
        });
    }

    renderIPOCards('open-ipo-list', PREMIUM_MOCK_DATA.open, true);
    renderIPOCards('upcoming-ipo-list', PREMIUM_MOCK_DATA.upcoming, false);
    renderIPOCards('closed-ipo-list', PREMIUM_MOCK_DATA.closed, false);

    // 4. Apply Flow
    const applyModal = document.getElementById('apply-modal');
    const applyCloseBtns = document.querySelectorAll('#apply-modal .close-modal');
    let currentApplyIpo = null;

    document.querySelectorAll('.apply-trigger-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const ipoId = e.target.dataset.id;
            currentApplyIpo = PREMIUM_MOCK_DATA.open.find(i => i.id === ipoId);
            if (currentApplyIpo) {
                document.getElementById('apply-ipo-name').textContent = currentApplyIpo.name;
                document.getElementById('apply-lot-size').textContent = currentApplyIpo.lot + ' Shares';
                document.getElementById('apply-price').textContent = currentApplyIpo.price.split('-')[1].trim();
                document.getElementById('input-lots').value = 1;
                updateApplyAmount();
                applyModal.classList.add('active');
            }
        });
    });

    applyCloseBtns.forEach(btn => btn.addEventListener('click', () => applyModal.classList.remove('active')));

    function updateApplyAmount() {
        if (!currentApplyIpo) return;
        const lots = parseInt(document.getElementById('input-lots').value) || 1;
        const price = parseFloat(currentApplyIpo.price.split('-')[1].replace(/[^0-9.-]+/g, ""));
        const amount = lots * currentApplyIpo.lot * price;
        document.getElementById('apply-total-amt').textContent = '₹' + amount.toLocaleString();
    }

    const lotPlusBtn = document.getElementById('btn-lot-plus');
    const lotMinusBtn = document.getElementById('btn-lot-minus');
    if (lotPlusBtn && lotMinusBtn) {
        lotPlusBtn.addEventListener('click', () => {
            const input = document.getElementById('input-lots');
            if (input.value < 13) { input.value = parseInt(input.value) + 1; updateApplyAmount(); }
        });
        lotMinusBtn.addEventListener('click', () => {
            const input = document.getElementById('input-lots');
            if (input.value > 1) { input.value = parseInt(input.value) - 1; updateApplyAmount(); }
        });
    }

    const applyForm = document.getElementById('apply-flow-form');
    if (applyForm) {
        applyForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const pan = document.getElementById('apply-pan').value;
            const upi = document.getElementById('apply-upi').value;
            const lots = parseInt(document.getElementById('input-lots').value) || 1;
            const price = parseFloat(currentApplyIpo.price.split('-')[1].replace(/[^0-9.-]+/g, ""));

            const newRecord = {
                id: generateId(),
                createdAt: new Date().toISOString(),
                ipoName: currentApplyIpo.name,
                applicantName: 'Applied via Dashboard',
                pan: pan.toUpperCase(),
                upiId: upi,
                quota: 'Retail',
                listingDate: '',
                lotSize: currentApplyIpo.lot,
                shares: currentApplyIpo.lot * lots,
                price: price,
                amount: currentApplyIpo.lot * lots * price,
                applied: 'Yes',
                alloted: 0,
                withdrawal: 'No'
            };

            records.push(newRecord);
            saveRecords();
            refreshAll();

            applyModal.classList.remove('active');

            const trackerTab = document.querySelector('.nav-item[data-view="view-tracker"]');
            if (trackerTab) trackerTab.click();

            showToast('Application submitted via UPI. Added to portfolio!', 'success');
        });
    }

    // 5. Allotment Checker
    const allotSelect = document.getElementById('allotment-ipo-select');
    if (allotSelect) {
        allotSelect.innerHTML = '<option value="">Select IPO...</option>';
        [...PREMIUM_MOCK_DATA.open, ...PREMIUM_MOCK_DATA.closed].forEach(ipo => {
            allotSelect.innerHTML += `<option value="${ipo.id}">${ipo.name}</option>`;
        });
    }

    const btnCheck = document.getElementById('btn-check-allotment');
    if (btnCheck) {
        btnCheck.addEventListener('click', () => {
            const resultDiv = document.getElementById('allotment-result');
            const pan = document.getElementById('allotment-pan').value;

            if (!allotSelect.value || !pan) {
                showToast('Please select IPO and enter PAN', 'error');
                return;
            }

            resultDiv.classList.remove('hidden', 'success', 'fail');
            resultDiv.innerHTML = '<p>Checking allotment status...</p>';

            setTimeout(() => {
                const isAllotted = Math.random() > 0.5;
                if (isAllotted) {
                    resultDiv.classList.add('success');
                    resultDiv.innerHTML = `<h3>Congratulations! 🎉</h3><p>You have been allotted shares for this IPO.</p>`;
                } else {
                    resultDiv.classList.add('fail');
                    resultDiv.innerHTML = `<h3>Not Allotted 😔</h3><p>Better luck next time! Your funds will be unblocked soon.</p>`;
                }
            }, 1500);
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPremiumUI);
} else {
    initPremiumUI();
}

}) ();
