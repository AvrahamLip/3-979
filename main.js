import { fetchReport } from './api.js';

const datePicker = document.getElementById('date-picker');
const summarySection = document.getElementById('summary-section');
const detailsSection = document.getElementById('details-section');
const detailsBody = document.getElementById('details-body');
const loadingOverlay = document.getElementById('loading-overlay');

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

    // 1. Process Summary Data — count present (todayValue == 1) by department & role
    const summary = processSummary(validData);

    // Count total present
    const totalPresent = validData.filter(item => String(item.todayValue) === '1').length;
    const totalPeople = validData.length;

    // Build total card + department cards
    let summaryHtml = `
      <div class="glass-card summary-card total-card">
        <h3>סה"כ נוכחים</h3>
        <div class="value">${totalPresent} <span class="total-of">/ ${totalPeople}</span></div>
      </div>
    `;

    summaryHtml += Object.entries(summary).map(([dept, roles], index) => {
        const deptTotal = Object.values(roles).reduce((sum, count) => sum + count, 0);
        const roleBreakdown = Object.entries(roles)
            .map(([role, count]) => `
                <div class="role-item">
                    <span>${role}</span>
                    <span>${count}</span>
                </div>
            `).join('');

        return `
          <div class="glass-card summary-card" style="animation-delay: ${(index + 1) * 0.1}s">
            <h3>${dept}</h3>
            <div class="value">${deptTotal}</div>
            <div class="role-breakdown">
              ${roleBreakdown}
            </div>
          </div>
        `;
    }).join('');

    summarySection.innerHTML = summaryHtml;

    // 2. Process Details Table
    detailsBody.innerHTML = '';
    validData.forEach((item, index) => {
        const row = document.createElement('tr');
        row.style.animationDelay = `${index * 0.03}s`;
        row.classList.add('fade-in-row');
        const statusClass = getStatusClass(item.todayValue);
        row.innerHTML = `
          <td>${item.name}</td>
          <td>${item.department || '---'}</td>
          <td>${item.role || '---'}</td>
          <td>
            <span class="status-badge ${statusClass}">
              ${getStatusLabel(item.todayValue)}
            </span>
          </td>
        `;
        detailsBody.appendChild(row);
    });

    detailsSection.classList.remove('hidden');
}

function processSummary(data) {
    // Group by Department -> Role -> Count where todayValue == 1
    return data.reduce((acc, item) => {
        if (String(item.todayValue) === '1') {
            const dept = item.department || 'כללי';
            const role = item.role || 'אחר';

            if (!acc[dept]) acc[dept] = {};
            if (!acc[dept][role]) acc[dept][role] = 0;

            acc[dept][role]++;
        }
        return acc;
    }, {});
}

function getStatusLabel(value) {
    const strValue = String(value);
    switch (strValue) {
        case '1': return 'בבסיס';
        case '0': return 'בבית';
        case '2': return 'מחלה';
        default: return strValue || '---';
    }
}

function getStatusClass(value) {
    const strValue = String(value);
    switch (strValue) {
        case '1': return 'status-1';
        case '0': return 'status-0';
        case '2': return 'status-2';
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
