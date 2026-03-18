import { fetchReportById } from './api.js';

// ── Department definitions ──────────────────────────────────
const DEPARTMENTS = [
  { id: 'המושבה - פ"ת', label: 'המושבה - פ"ת' },
  { id: 'צרעה', label: 'צרעה' },
  { id: 'מכון ויצמן - רחובות', label: 'מכון ויצמן - רחובות' },
  { id: 'מפל"ג', label: 'מפל"ג' },
];

// ── DOM refs ────────────────────────────────────────────────
const datePicker = document.getElementById('date-picker');
const container = document.getElementById('departments-container');
const loadingOverlay = document.getElementById('loading-overlay');
const themeToggle = document.getElementById('theme-toggle');

// ── Theme (cookie-persisted, same as main.js) ──────────────
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

const savedTheme = getCookie('theme');
applyTheme(savedTheme === 'light');

themeToggle.addEventListener('click', () => {
  const isNowLight = !document.body.classList.contains('light-mode');
  applyTheme(isNowLight);
  setCookie('theme', isNowLight ? 'light' : 'dark', 365);
});

// ── Date picker ─────────────────────────────────────────────
const today = new Date().toISOString().split('T')[0];
datePicker.value = today;

// ── PWA Install Logic ─────────────────────────────────────────
let deferredPrompt;
const pwaBtn = document.getElementById('pwa-install-btn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (pwaBtn) pwaBtn.classList.remove('hidden');
});

if (pwaBtn) {
  pwaBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        pwaBtn.classList.add('hidden');
      }
      deferredPrompt = null;
    } else {
      alert('כדי להתקין: לחץ על 3 הנקודות בדפדפן ובחר "התקן אפליקציה"');
    }
  });
}

datePicker.addEventListener('change', (e) => {
  if (e.target.value) loadAllDepartments(e.target.value);
});


// ── Load all departments in parallel ────────────────────────
async function loadAllDepartments(date) {
  showLoading(true);

  const results = await Promise.allSettled(
    DEPARTMENTS.map(dept => fetchReportById(dept.id, date).then(data => ({ dept, data })))
  );

  let html = '';

  // Legend (shared, once at top)
  html += `
      <div class="legend-strip glass-card">
        <span class="legend-title">מקראה:</span>
        <span class="legend-item s-1">🪖 בבסיס</span>
        <span class="legend-item s-0">🏠 בבית</span>
        <span class="legend-item s-2">🤒 מחלה / גימלים</span>
        <span class="legend-item s-4">⚖️ פיצול</span>
        <span class="legend-item s-5">🚪 שוחרר</span>
        <span class="legend-item s-other">❓ אחר</span>
      </div>
    `;

  for (const result of results) {
    if (result.status === 'rejected') {
      const deptLabel = result.reason?.dept?.label || 'לא ידוע';
      html += `<div class="glass-card dept-section"><h2>${deptLabel}</h2><div class="placeholder-msg error">שגיאה בטעינת הנתונים</div></div>`;
      continue;
    }

    const { dept, data } = result.value;
    html += renderDepartmentSection(dept, data);
  }

  container.innerHTML = html;
  showLoading(false);
}

// ── Render one department section ───────────────────────────
function renderDepartmentSection(dept, data) {
  const validData = filterValidRows(data);

  if (validData.length === 0) {
    return `
          <div class="glass-card dept-section">
            <h2>${dept.label}</h2>
            <div class="placeholder-msg">לא נמצאו נתונים</div>
          </div>`;
  }

  // Totals
  const totals = validData.reduce((acc, item) => {
    const val = normalizeStatus(item.todayValue);
    acc[val]++;
    return acc;
  }, { '1': 0, '0': 0, '2': 0, '4': 0, '5': 0, 'other': 0 });

  const totalPeople = validData.length;

  // Roles summary
  const roleGroups = validData.reduce((acc, item) => {
    const role = item.role || 'אחר';
    const val = normalizeStatus(item.todayValue);
    if (!acc[role]) acc[role] = { '1': 0, '0': 0, '2': 0, '4': 0, '5': 0, 'other': 0 };
    acc[role][val]++;
    return acc;
  }, {});

  const roleCards = Object.entries(roleGroups).map(([role, counts]) => {
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
              <span class="s-4"><span class="si">⚖️</span>${counts['4']}</span>
              <span class="s-5"><span class="si">🚪</span>${counts['5']}</span>
              <span class="s-other"><span class="si">❓</span>${counts['other']}</span>
            </div>
          </div>`;
  }).join('');

  // Detail rows
  const detailRows = validData.map((item, index) => `
      <tr class="fade-in-row" style="animation-delay: ${index * 0.03}s">
        <td data-label="שם">${item.name}</td>
        <td data-label="מחלקה">${item.department || '---'}</td>
        <td data-label="תפקיד">${item.role || '---'}</td>
        <td data-label="סטטוס">
          <span class="status-badge ${getStatusClass(item.todayValue)}">
            ${getStatusLabel(item.todayValue)}
          </span>
        </td>
      </tr>
    `).join('');

  return `
      <div class="glass-card dept-section">
        <div class="dept-section-header" onclick="this.parentElement.classList.toggle('section-collapsed')">
          <h2><span class="toggle-icon">▼</span> ${dept.label}</h2>
          <div class="dept-summary-badge">${totals['1']} / ${totalPeople}</div>
        </div>
        <div class="dept-section-body">
          <div class="dept-totals">
            <div class="role-item"><span>🪖 בבסיס</span> <span>${totals['1']}</span></div>
            <div class="role-item"><span>🏠 בבית</span> <span>${totals['0']}</span></div>
            <div class="role-item"><span>🤒 מחלה</span> <span>${totals['2']}</span></div>
            <div class="role-item"><span>⚖️ פיצול</span> <span>${totals['4']}</span></div>
            <div class="role-item"><span>🚪 שוחרר</span> <span>${totals['5']}</span></div>
            <div class="role-item"><span>❓ אחר</span> <span>${totals['other']}</span></div>
          </div>
          <div class="role-breakdown">
            ${roleCards}
          </div>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>שם</th>
                  <th>מחלקה</th>
                  <th>תפקיד</th>
                  <th>סטטוס</th>
                </tr>
              </thead>
              <tbody>${detailRows}</tbody>
            </table>
          </div>
        </div>
      </div>`;
}

// ── Helpers ─────────────────────────────────────────────────
function filterValidRows(data) {
  if (!data || !Array.isArray(data)) return [];
  return data.filter(item => item.name && String(item.name).trim() !== '');
}

/**
 * Normalize Zama API status values to internal keys:
 *   "V" or "1" → '1' (בבסיס)
 *   "" or "0"  → '0' (בבית)
 *   "2" / "גימלים" → '2' (מחלה)
 *   anything else → 'other'
 */
function normalizeStatus(value) {
  const v = String(value ?? '').trim().toUpperCase();
  if (v === 'V' || v === '1') return '1';
  if (v === '0') return '0';
  if (v === '2' || v === 'גימלים') return '2';
  if (v === '4' || v === 'פיצול') return '4';
  if (v === '5' || v === 'שוחרר') return '5';
  if (v === '') return '0'; // Default empty to 'at home' if appropriate, or 'other'
  return 'other';
}

function getStatusLabel(value) {
  switch (normalizeStatus(value)) {
    case '1': return 'בבסיס';
    case '0': return 'בבית';
    case '2': return 'מחלה';
    case '4': return 'פיצול';
    case '5': return 'שוחרר';
    default: return String(value).trim() || '---';
  }
}

function getStatusClass(value) {
  switch (normalizeStatus(value)) {
    case '1': return 'status-1';
    case '0': return 'status-0';
    case '2': return 'status-2';
    case '4': return 'status-4';
    case '5': return 'status-5';
    default: return 'status-other';
  }
}

function showLoading(isLoading) {
  loadingOverlay.classList.toggle('hidden', !isLoading);
}

// ── Initial load ────────────────────────────────────────────
if (datePicker.value) {
  loadAllDepartments(datePicker.value);
}
