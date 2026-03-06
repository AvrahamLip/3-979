import { fetchReport } from './api.js';

const datePicker = document.getElementById('date-picker');
const summarySection = document.getElementById('summary-section');
const detailsSection = document.getElementById('details-section');
const detailsBody = document.getElementById('details-body');
const searchInput = document.getElementById('search-input');
const deptFilter = document.getElementById('dept-filter');
const roleFilter = document.getElementById('role-filter');
const statusFilter = document.getElementById('status-filter');
const loadingOverlay = document.getElementById('loading-overlay');
const themeToggle = document.getElementById('theme-toggle');

// ── Theme (cookie-persisted) ──────────────────────────────
function getCookie(name) {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name, value, days) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function applyTheme(isLight) {
    document.body.classList.toggle('light-mode', isLight);
    themeToggle.textContent = isLight ? '🌙' : '☀️';
}

// Restore saved theme
const savedTheme = getCookie('theme');
applyTheme(savedTheme === 'light');

themeToggle.addEventListener('click', () => {
    const isNowLight = !document.body.classList.contains('light-mode');
    applyTheme(isNowLight);
    setCookie('theme', isNowLight ? 'light' : 'dark', 365);
});
// ──────────────────────────────────────────────────────────

// Initialize with today's date
const today = new Date().toISOString().split('T')[0];
datePicker.value = today;

datePicker.addEventListener('change', (e) => {
    const selectedDate = e.target.value;
    if (selectedDate) {
        loadReport(selectedDate);
    }
});

async function loadReport(date) {
    showLoading(true);
    try {
        const data = await fetchReport(date);
        renderReport(data);
    } catch (error) {
        summarySection.innerHTML = `<div class="placeholder-msg error">שגיאה בטעינת הנתונים: ${error.message}</div>`;
        detailsSection.classList.add('hidden');
    } finally {
        showLoading(false);
    }
}

/**
 * Filter out empty/summary rows from the spreadsheet.
 * A valid row must have a non-empty name.
 */
function filterValidRows(data) {
    return data.filter(item => item.name && String(item.name).trim() !== '');
}

function renderReport(data) {
    if (!data || !Array.isArray(data) || data.length === 0) {
        summarySection.innerHTML = '<div class="placeholder-msg">לא נמצאו נתונים לתאריך זה</div>';
        detailsSection.classList.add('hidden');
        return;
    }

    const validData = filterValidRows(data);

    if (validData.length === 0) {
        summarySection.innerHTML = '<div class="placeholder-msg">לא נמצאו נתונים לתאריך זה</div>';
        detailsSection.classList.add('hidden');
        return;
    }

    // 1. Process Summary Data
    const summary = processSummary(validData);

    // Count totals for all statuses
    const totals = validData.reduce((acc, item) => {
        const val = String(item.todayValue).trim();
        if (['1', '0'].includes(val)) acc[val]++;
        else if (val === '2' || val === 'גימלים') acc['2']++;
        else acc['other']++;
        return acc;
    }, { '1': 0, '0': 0, '2': 0, 'other': 0 });

    const totalPeople = validData.length;

    // Build legend + total card
    let summaryHtml = `
      <div class="legend-strip glass-card">
        <span class="legend-title">מקראה:</span>
        <span class="legend-item s-1">🪖 בבסיס</span>
        <span class="legend-item s-0">🏠 בבית</span>
        <span class="legend-item s-2">🤒 מחלה / גימלים</span>
        <span class="legend-item s-other">❓ אחר</span>
      </div>
      <div class="glass-card summary-card total-card">
        <h3>סה"כ פלוגה</h3>
        <div class="value">${totals['1']} <span class="total-of">/ ${totalPeople}</span></div>
        <div class="role-breakdown">
            <div class="role-item"><span>🪖 בבסיס</span> <span>${totals['1']}</span></div>
            <div class="role-item"><span>🏠 בבית</span> <span>${totals['0']}</span></div>
            <div class="role-item"><span>🤒 מחלה / גימלים</span> <span>${totals['2']}</span></div>
            <div class="role-item"><span>❓ אחר</span> <span>${totals['other']}</span></div>
        </div>
      </div>
      <div class="glass-card summary-card total-card global-roles-card">
        <h3>סה"כ לפי תפקידים</h3>
        <div class="role-breakdown global-role-list">
            ${Object.entries(validData.reduce((acc, item) => {
        const role = item.role || 'אחר';
        const val = String(item.todayValue).trim();
        if (!acc[role]) acc[role] = { '1': 0, '0': 0, '2': 0, 'other': 0 };
        if (['1', '0'].includes(val)) acc[role][val]++;
        else if (val === '2' || val === 'גימלים') acc[role]['2']++;
        else acc[role]['other']++;
        return acc;
    }, {})).map(([role, counts]) => {
        const totalInRole = Object.values(counts).reduce((a, b) => a + b, 0);
        return `
                <div class="role-card-item">
                    <div class="role-header">
                        <span class="role-name">${role}</span>
                        <span class="role-total">${counts['1']} / ${totalInRole}</span>
                    </div>
                    <div class="status-counts">
                        <span class="s-1"><span class="si">🪖</span>${counts['1']}</span>
                        <span class="s-0"><span class="si">🏠</span>${counts['0']}</span>
                        <span class="s-2"><span class="si">🤒</span>${counts['2']}</span>
                        <span class="s-other"><span class="si">❓</span>${counts['other']}</span>
                    </div>
                </div>`;
    }).join('')}
        </div>
      </div>
    `;

    // Department cards
    summaryHtml += Object.entries(summary).map(([dept, roles], index) => {
        // deptTotal is total base attendance for the department
        const deptBaseTotal = Object.values(roles).reduce((sum, s) => sum + s['1'], 0);

        const roleBreakdown = Object.entries(roles)
            .map(([role, statusCounts]) => {
                const totalInRole = Object.values(statusCounts).reduce((a, b) => a + b, 0);
                return `
                <div class="role-card-item">
                    <div class="role-header">
                        <span class="role-name">${role}</span>
                        <span class="role-total">${statusCounts['1']} / ${totalInRole}</span>
                    </div>
                    <div class="status-counts">
                        <span class="s-1"><span class="si">🪖</span>${statusCounts['1']}</span>
                        <span class="s-0"><span class="si">🏠</span>${statusCounts['0']}</span>
                        <span class="s-2"><span class="si">🤒</span>${statusCounts['2']}</span>
                        <span class="s-other"><span class="si">❓</span>${statusCounts['other']}</span>
                    </div>
                </div>
            `}).join('');

        return `
          <div class="glass-card summary-card collapsed" style="animation-delay: ${(index + 1) * 0.1}s">
            <div class="dept-header" onclick="this.parentElement.classList.toggle('collapsed')">
                <h3><span class="toggle-icon">▼</span> ${dept}</h3>
                <div class="dept-value">${deptBaseTotal}</div>
            </div>
            <div class="role-breakdown">
              ${roleBreakdown}
            </div>
          </div>
        `;
    }).join('');

    summarySection.innerHTML = summaryHtml;

    // 2. Process Details Table
    renderDetailsTable(validData);

    detailsSection.classList.remove('hidden');
}

function renderDetailsTable(validData) {
    // Populate filters
    const departments = [...new Set(validData.map(item => item.department || 'כללי'))].sort();
    deptFilter.innerHTML = '<option value="">כל המחלקות</option>' +
        departments.map(dept => `<option value="${dept}">${dept}</option>`).join('');

    const roles = [...new Set(validData.map(item => item.role || 'אחר'))].sort();
    roleFilter.innerHTML = '<option value="">כל התפקידים</option>' +
        roles.map(role => `<option value="${role}">${role}</option>`).join('');

    const statuses = [...new Set(validData.map(item => getStatusLabel(item.todayValue)))].sort();
    statusFilter.innerHTML = '<option value="">כל הסטטוסים</option>' +
        statuses.map(status => `<option value="${status}">${status}</option>`).join('');

    detailsBody.innerHTML = '';

    // Render flat list
    validData.forEach((item, index) => {
        const row = document.createElement('tr');
        row.className = 'fade-in-row details-row';
        row.dataset.name = (item.name || '').toLowerCase();
        row.dataset.role = (item.role || '').toLowerCase();
        row.dataset.dept = item.department || 'כללי';
        row.dataset.status = getStatusLabel(item.todayValue);
        row.style.animationDelay = `${index * 0.03}s`;

        const statusClass = getStatusClass(item.todayValue);
        row.innerHTML = `
          <td data-label="שם">${item.name}</td>
          <td data-label="מחלקה">${item.department || '---'}</td>
          <td data-label="תפקיד">${item.role || '---'}</td>
          <td data-label="סטטוס">
            <span class="status-badge ${statusClass}">
              ${getStatusLabel(item.todayValue)}
            </span>
          </td>
        `;
        detailsBody.appendChild(row);
    });

    // Reset filters
    searchInput.value = '';
    deptFilter.value = '';
    roleFilter.value = '';
    statusFilter.value = '';
}

function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const filterDept = deptFilter.value;
    const filterRole = roleFilter.value;
    const filterStatus = statusFilter.value;

    const rows = document.querySelectorAll('.details-row');

    rows.forEach(row => {
        const matchesDept = filterDept === '' || filterDept === row.dataset.dept;
        const matchesRole = filterRole === '' || filterRole === row.dataset.role;
        const matchesStatus = filterStatus === '' || filterStatus === row.dataset.status;
        const matchesSearch = row.dataset.name.includes(searchTerm) || row.dataset.role.includes(searchTerm);

        if (matchesDept && matchesRole && matchesStatus && matchesSearch) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

searchInput.addEventListener('input', applyFilters);
deptFilter.addEventListener('change', applyFilters);
roleFilter.addEventListener('change', applyFilters);
statusFilter.addEventListener('change', applyFilters);

function processSummary(data) {
    // Group by Department -> Role -> { status0, status1, status2, statusOther }
    return data.reduce((acc, item) => {
        const dept = item.department || 'כללי';
        const role = item.role || 'אחר';
        const strValue = String(item.todayValue).trim();

        if (!acc[dept]) acc[dept] = {};
        if (!acc[dept][role]) {
            acc[dept][role] = { '1': 0, '0': 0, '2': 0, 'other': 0 };
        }

        if (strValue === '0' || strValue === '1') {
            acc[dept][role][strValue]++;
        } else if (strValue === '2' || strValue === 'גימלים') {
            acc[dept][role]['2']++;
        } else {
            acc[dept][role]['other']++;
        }

        return acc;
    }, {});
}

function getStatusLabel(value) {
    const strValue = String(value).trim();
    switch (strValue) {
        case '1': return 'בבסיס';
        case '0': return 'בבית';
        case '2':
        case 'גימלים': return 'מחלה';
        default: return strValue || '---';
    }
}

function getStatusClass(value) {
    const strValue = String(value).trim();
    switch (strValue) {
        case '1': return 'status-1';
        case '0': return 'status-0';
        case '2':
        case 'גימלים': return 'status-2';
        default: return 'status-other';
    }
}

function showLoading(isLoading) {
    if (isLoading) {
        loadingOverlay.classList.remove('hidden');
    } else {
        loadingOverlay.classList.add('hidden');
    }
}

// Initial load
if (datePicker.value) {
    loadReport(datePicker.value);
}
