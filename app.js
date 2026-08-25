// Configuration - REPLACE WITH YOUR VALUES
const CONFIG = {
    apiKey: 'AIzaSyAzOowlr95IQNwC3RSEH6nZH5fZObgRD_E',
    spreadsheetId: '1DAgMwHbxGp-8OMtCrk6JlB6MFSdjzxlL05oW2wV-a50',
    sheetName: 'TimeTracking',
    appsScriptUrl: 'https://script.google.com/macros/s/AKfycbzWJ41h6zxfLUsKSY5GF9lOgaxUKCSc4MxQgqFAqzN6F4gdLJL6Rx_PSVJdudmWEAWRoQ/exec'
};

// State Management
let workEntries = [];
let currentEditingEntry = null;
let currentEntryEditId = null;
let expectedEdited = false;
let currentLunchBreakEntryId = null;
let lunchBreakExpectedEdited = false;

// DOM Elements
const elements = {
    addBtn: document.getElementById('addBtn'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    errorMessage: document.getElementById('errorMessage'),
    entriesList: document.getElementById('entriesList'),
    
    // Add Modal
    addModal: document.getElementById('addModal'),
    addModalTitle: document.getElementById('addModalTitle'),
    closeAddModal: document.getElementById('closeAddModal'),
    cancelAddBtn: document.getElementById('cancelAddBtn'),
    saveEntryBtn: document.getElementById('saveEntryBtn'),
    clockInDate: document.getElementById('clockInDate'),
    clockInTime: document.getElementById('clockInTime'),
    hasClockOut: document.getElementById('hasClockOut'),
    clockOutGroup: document.getElementById('clockOutGroup'),
    clockOutTime: document.getElementById('clockOutTime'),
    expectedTime: document.getElementById('expectedTime'),
    
    // Edit Modal
    editModal: document.getElementById('editModal'),
    closeEditModal: document.getElementById('closeEditModal'),
    cancelEditBtn: document.getElementById('cancelEditBtn'),
    saveClockOutBtn: document.getElementById('saveClockOutBtn'),
    editClockIn: document.getElementById('editClockIn'),
    editClockOutTime: document.getElementById('editClockOutTime'),
    calculatedHours: document.getElementById('calculatedHours'),

    // Lunch Actual End Modal
    lunchActualEndModal: document.getElementById('lunchActualEndModal'),
    closeLunchActualEndModalBtn: document.getElementById('closeLunchActualEndModalBtn'),
    cancelLunchActualEndBtn: document.getElementById('cancelLunchActualEndBtn'),
    saveLunchActualEndBtn: document.getElementById('saveLunchActualEndBtn'),
    lunchActualEndStartDisplay: document.getElementById('lunchActualEndStartDisplay'),
    lunchActualEndTimeInput: document.getElementById('lunchActualEndTimeInput'),

    // Lunch Break Modal
    lunchBreakModal: document.getElementById('lunchBreakModal'),
    closeLunchBreakModalBtn: document.getElementById('closeLunchBreakModalBtn'),
    cancelLunchBreakBtn: document.getElementById('cancelLunchBreakBtn'),
    saveLunchBreakBtn: document.getElementById('saveLunchBreakBtn'),
    lunchBreakStartInput: document.getElementById('lunchBreakStartInput'),
    lunchBreakExpectedEndInput: document.getElementById('lunchBreakExpectedEndInput'),
    hasLunchBreakActualEnd: document.getElementById('hasLunchBreakActualEnd'),
    lunchBreakActualEndGroup: document.getElementById('lunchBreakActualEndGroup'),
    lunchBreakActualEndInput: document.getElementById('lunchBreakActualEndInput')
};

// Initialize App
function init() {
    loadLocalEntries();
    renderEntries();
    setupEventListeners();
    setDefaultDateTime();
}

// Event Listeners
function setupEventListeners() {
    elements.addBtn.addEventListener('click', openAddModal);
    elements.closeAddModal.addEventListener('click', closeAddModal);
    elements.cancelAddBtn.addEventListener('click', closeAddModal);
    elements.saveEntryBtn.addEventListener('click', saveEntry);
    
    elements.closeEditModal.addEventListener('click', closeEditModal);
    elements.cancelEditBtn.addEventListener('click', closeEditModal);
    elements.saveClockOutBtn.addEventListener('click', saveClockOut);
    
    elements.hasClockOut.addEventListener('change', toggleClockOutFields);
    elements.clockInDate.addEventListener('change', updateExpectedClockOut);
    elements.clockInTime.addEventListener('change', updateExpectedClockOut);
    elements.expectedTime.addEventListener('change', () => { expectedEdited = true; });
    
    elements.editClockOutTime.addEventListener('change', updateCalculatedHours);

    elements.closeLunchBreakModalBtn.addEventListener('click', closeLunchBreakModal);
    elements.cancelLunchBreakBtn.addEventListener('click', closeLunchBreakModal);
    elements.saveLunchBreakBtn.addEventListener('click', saveLunchBreak);
    elements.lunchBreakStartInput.addEventListener('change', updateLunchBreakExpectedEnd);
    elements.lunchBreakExpectedEndInput.addEventListener('change', () => { lunchBreakExpectedEdited = true; });
    elements.hasLunchBreakActualEnd.addEventListener('change', toggleLunchBreakActualEnd);

    elements.closeLunchActualEndModalBtn.addEventListener('click', closeLunchActualEndModal);
    elements.cancelLunchActualEndBtn.addEventListener('click', closeLunchActualEndModal);
    elements.saveLunchActualEndBtn.addEventListener('click', saveLunchActualEnd);
    elements.lunchActualEndModal.addEventListener('click', (e) => {
        if (e.target === elements.lunchActualEndModal) closeLunchActualEndModal();
    });

    // Close modals on background click
    elements.addModal.addEventListener('click', (e) => {
        if (e.target === elements.addModal) closeAddModal();
    });
    elements.editModal.addEventListener('click', (e) => {
        if (e.target === elements.editModal) closeEditModal();
    });
    elements.lunchBreakModal.addEventListener('click', (e) => {
        if (e.target === elements.lunchBreakModal) closeLunchBreakModal();
    });

    // Delegato unico per la gestione dei click dinamici nella lista ingressi
    elements.entriesList.addEventListener('click', function(e) {
        // Gestione Aggiunta Uscita Effettiva
        const addClockOutBtn = e.target.closest('.btn-add-clockout');
        if (addClockOutBtn) {
            e.stopPropagation();
            e.preventDefault();
            const entryId = addClockOutBtn.getAttribute('data-id');
            window.editClockOut(entryId);
        }
    });
}

// Date/Time Utilities
function setDefaultDateTime() {
    const now = new Date();
    elements.clockInDate.valueAsDate = now;
    elements.clockInTime.value = formatTime(now);
    elements.clockOutTime.value = formatTime(now);
    expectedEdited = false;
    updateExpectedClockOut();
}

function formatDate(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

function parseDateTime(dateStr, timeStr) {
    return new Date(`${dateStr}T${timeStr}`);
}

function calculateExpectedClockOut(clockIn) {
    const expected = new Date(clockIn);
    expected.setHours(expected.getHours() + 8);
    return expected;
}

function buildExpectedClockOut(clockIn, expectedTimeStr) {
    if (!expectedTimeStr) return null;

    const [hoursStr, minutesStr] = expectedTimeStr.split(':');
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

    const expected = new Date(clockIn);
    expected.setHours(hours, minutes, 0, 0);

    if (expected < clockIn) {
        expected.setDate(expected.getDate() + 1);
    }

    return expected;
}

function formatMinutesToHoursAndMinutes(totalMinutes) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h > 0) return `${h} h ${m} min`;
    return `${m} min`;
}

function getLunchBreakMinutes(entry) {
    if (entry.lunchBreakStart) {
        const start = new Date(entry.lunchBreakStart);
        const end = entry.lunchBreakActualEnd
            ? new Date(entry.lunchBreakActualEnd)
            : entry.lunchBreakExpectedEnd
                ? new Date(entry.lunchBreakExpectedEnd)
                : null;
        if (end) return Math.max(0, Math.round((end - start) / (1000 * 60)));
    }
    if (entry.lunchBreakMinutes != null) return entry.lunchBreakMinutes;
    return 0;
}

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// UI Updates
function updateExpectedClockOut() {
    if (expectedEdited) return;
    const clockIn = parseDateTime(elements.clockInDate.value, elements.clockInTime.value);
    if (!isNaN(clockIn)) {
        const expected = calculateExpectedClockOut(clockIn);
        elements.expectedTime.value = formatTime(expected);
    }
}

function updateCalculatedHours() {
    if (currentEditingEntry) {
        const clockIn = new Date(currentEditingEntry.clockInTime);
        const clockOut = buildExpectedClockOut(clockIn, elements.editClockOutTime.value);
        if (clockOut && !isNaN(clockOut)) {
            elements.calculatedHours.textContent = formatMinutesToHoursAndMinutes(
                Math.max(0, Math.round((clockOut - clockIn) / (1000 * 60)))
            );
        }
    }
}

function updateLunchBreakExpectedEnd() {
    if (lunchBreakExpectedEdited) return;
    const entry = workEntries.find(e => String(e.id) === String(currentLunchBreakEntryId));
    if (!entry) return;
    const clockIn = new Date(entry.clockInTime);
    const start = buildExpectedClockOut(clockIn, elements.lunchBreakStartInput.value);
    if (start && !isNaN(start)) {
        const expectedEnd = new Date(start.getTime() + 30 * 60 * 1000);
        elements.lunchBreakExpectedEndInput.value = formatTime(expectedEnd);
    }
}

function toggleLunchBreakActualEnd() {
    if (elements.hasLunchBreakActualEnd.checked) {
        elements.lunchBreakActualEndGroup.classList.remove('hidden');
    } else {
        elements.lunchBreakActualEndGroup.classList.add('hidden');
    }
}

function toggleClockOutFields() {
    if (elements.hasClockOut.checked) {
        elements.clockOutGroup.classList.remove('hidden');
    } else {
        elements.clockOutGroup.classList.add('hidden');
    }
}

function showLoading() {
    elements.loadingIndicator.classList.remove('hidden');
}

function hideLoading() {
    elements.loadingIndicator.classList.add('hidden');
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
    setTimeout(() => {
        elements.errorMessage.classList.add('hidden');
    }, 5000);
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
}

// Modal Management
function openAddModal() {
    currentEntryEditId = null;
    expectedEdited = false;
    setDefaultDateTime();
    elements.hasClockOut.checked = false;
    toggleClockOutFields();
    elements.addModalTitle.textContent = 'Nuovo Ingresso';
    elements.saveEntryBtn.textContent = 'Salva';
    elements.addModal.classList.remove('hidden');
}

function openEditEntryModal(entry) {
    currentEntryEditId = entry.id;
    expectedEdited = false;
    const clockIn = new Date(entry.clockInTime);
    elements.clockInDate.valueAsDate = clockIn;
    elements.clockInTime.value = formatTime(clockIn);

    const expected = entry.expectedClockOutTime
        ? new Date(entry.expectedClockOutTime)
        : calculateExpectedClockOut(clockIn);
    elements.expectedTime.value = formatTime(expected);

    if (entry.clockOutTime) {
        const clockOut = new Date(entry.clockOutTime);
        elements.hasClockOut.checked = true;
        elements.clockOutTime.value = formatTime(clockOut);
    } else {
        elements.hasClockOut.checked = false;
    }

    toggleClockOutFields();
    updateExpectedClockOut();
    elements.addModalTitle.textContent = 'Modifica Ingresso';
    elements.saveEntryBtn.textContent = 'Aggiorna';
    elements.addModal.classList.remove('hidden');
}

function closeAddModal() {
    currentEntryEditId = null;
    expectedEdited = false;
    elements.addModal.classList.add('hidden');
}

function openEditModal(entry) {
    if (!entry) return;
    currentEditingEntry = entry;
    
    if (elements.editClockIn) {
        elements.editClockIn.textContent = formatDate(entry.clockInTime);
    }

    const defaultClockOut = entry.clockOutTime
        ? new Date(entry.clockOutTime)
        : entry.expectedClockOutTime 
            ? new Date(entry.expectedClockOutTime)
            : new Date();

    if (elements.editClockOutTime) {
        elements.editClockOutTime.value = formatTime(defaultClockOut);
    }

    updateCalculatedHours();
    elements.editModal.classList.remove('hidden');
}

function closeEditModal() {
    currentEditingEntry = null;
    elements.editModal.classList.add('hidden');
}

function openLunchBreakModal(entry, preCheckActualEnd = false) {
    currentLunchBreakEntryId = entry.id;
    lunchBreakExpectedEdited = false;
    if (entry.lunchBreakStart) {
        elements.lunchBreakStartInput.value = formatTime(new Date(entry.lunchBreakStart));
        const expectedEnd = entry.lunchBreakExpectedEnd
            ? new Date(entry.lunchBreakExpectedEnd)
            : new Date(new Date(entry.lunchBreakStart).getTime() + 30 * 60 * 1000);
        elements.lunchBreakExpectedEndInput.value = formatTime(expectedEnd);
        if (entry.lunchBreakActualEnd || preCheckActualEnd) {
            elements.hasLunchBreakActualEnd.checked = true;
            elements.lunchBreakActualEndGroup.classList.remove('hidden');
            elements.lunchBreakActualEndInput.value = entry.lunchBreakActualEnd
                ? formatTime(new Date(entry.lunchBreakActualEnd))
                : elements.lunchBreakExpectedEndInput.value;
        } else {
            elements.hasLunchBreakActualEnd.checked = false;
            elements.lunchBreakActualEndGroup.classList.add('hidden');
        }
    } else {
        const now = new Date();
        elements.lunchBreakStartInput.value = formatTime(now);
        const expectedEnd = new Date(now.getTime() + 30 * 60 * 1000);
        elements.lunchBreakExpectedEndInput.value = formatTime(expectedEnd);
        elements.hasLunchBreakActualEnd.checked = false;
        elements.lunchBreakActualEndGroup.classList.add('hidden');
    }
    elements.lunchBreakModal.classList.remove('hidden');
}

function closeLunchBreakModal() {
    currentLunchBreakEntryId = null;
    lunchBreakExpectedEdited = false;
    elements.lunchBreakModal.classList.add('hidden');
}

function openLunchActualEndModal(entry) {
    currentLunchBreakEntryId = entry.id;
    elements.lunchActualEndStartDisplay.textContent = formatDate(new Date(entry.lunchBreakStart));
    const defaultEnd = entry.lunchBreakExpectedEnd
        ? new Date(entry.lunchBreakExpectedEnd)
        : new Date(new Date(entry.lunchBreakStart).getTime() + 30 * 60 * 1000);
    elements.lunchActualEndTimeInput.value = formatTime(defaultEnd);
    elements.lunchActualEndModal.classList.remove('hidden');
}

function closeLunchActualEndModal() {
    currentLunchBreakEntryId = null;
    elements.lunchActualEndModal.classList.add('hidden');
}

function saveLunchActualEnd() {
    if (!currentLunchBreakEntryId) return;
    const index = workEntries.findIndex(e => String(e.id) === String(currentLunchBreakEntryId));
    if (index === -1) return;
    const entry = workEntries[index];
    const clockIn = new Date(entry.clockInTime);
    const actualEnd = buildExpectedClockOut(clockIn, elements.lunchActualEndTimeInput.value);
    if (!actualEnd || isNaN(actualEnd)) return;
    workEntries[index].lunchBreakActualEnd = actualEnd.toISOString();
    saveLocalEntries();
    renderEntries();
    closeLunchActualEndModal();
    syncToGoogleSheets(workEntries[index], 'update');
}

function saveLunchBreak() {
    if (!currentLunchBreakEntryId) return;
    const index = workEntries.findIndex(e => String(e.id) === String(currentLunchBreakEntryId));
    if (index === -1) return;
    const entry = workEntries[index];
    const clockIn = new Date(entry.clockInTime);
    const lunchStart = buildExpectedClockOut(clockIn, elements.lunchBreakStartInput.value);
    if (!lunchStart || isNaN(lunchStart)) return;
    const lunchExpectedEnd = buildExpectedClockOut(clockIn, elements.lunchBreakExpectedEndInput.value)
        || new Date(lunchStart.getTime() + 30 * 60 * 1000);
    let lunchActualEnd = null;
    if (elements.hasLunchBreakActualEnd.checked && elements.lunchBreakActualEndInput.value) {
        lunchActualEnd = buildExpectedClockOut(clockIn, elements.lunchBreakActualEndInput.value);
    }
    workEntries[index] = {
        ...workEntries[index],
        lunchBreakStart: lunchStart.toISOString(),
        lunchBreakExpectedEnd: lunchExpectedEnd.toISOString(),
        lunchBreakActualEnd: lunchActualEnd ? lunchActualEnd.toISOString() : null,
        lunchBreakMinutes: null
    };
    saveLocalEntries();
    renderEntries();
    closeLunchBreakModal();
    syncToGoogleSheets(workEntries[index], 'update');
}

// Entry Management
function saveEntry() {
    const clockIn = parseDateTime(elements.clockInDate.value, elements.clockInTime.value);
    const expectedClockOut = buildExpectedClockOut(clockIn, elements.expectedTime.value);
    
    let clockOut = null;
    if (elements.hasClockOut.checked) {
        clockOut = buildExpectedClockOut(clockIn, elements.clockOutTime.value);
    }
    
    const expectedValue = expectedClockOut && !isNaN(expectedClockOut)
        ? expectedClockOut
        : calculateExpectedClockOut(clockIn);

    if (currentEntryEditId) {
        const index = workEntries.findIndex(e => String(e.id) === String(currentEntryEditId));
        if (index !== -1) {
            workEntries[index] = {
                ...workEntries[index],
                clockInTime: clockIn.toISOString(),
                expectedClockOutTime: expectedValue.toISOString(),
                clockOutTime: clockOut ? clockOut.toISOString() : null
            };
        }
        saveLocalEntries();
        renderEntries();
        closeAddModal();
        syncToGoogleSheets(workEntries[index], 'update');
        return;
    }

    const entry = {
        id: generateId(),
        clockInTime: clockIn.toISOString(),
        expectedClockOutTime: expectedValue.toISOString(),
        clockOutTime: clockOut ? clockOut.toISOString() : null,
        lunchBreakMinutes: null
    };

    workEntries.unshift(entry);
    saveLocalEntries();
    renderEntries();
    closeAddModal();

    syncToGoogleSheets(entry, 'append');
}

function saveClockOut() {
    if (!currentEditingEntry) return;

    const clockIn = new Date(currentEditingEntry.clockInTime);
    const clockOut = buildExpectedClockOut(clockIn, elements.editClockOutTime.value);
    
    const index = workEntries.findIndex(e => String(e.id) === String(currentEditingEntry.id));
    if (index !== -1 && clockOut && !isNaN(clockOut)) {
        workEntries[index].clockOutTime = clockOut.toISOString();
        saveLocalEntries();
        renderEntries();
        closeEditModal();
        
        syncToGoogleSheets(workEntries[index], 'update');
    }
}

function deleteEntryById(id) {
    const entryIndex = workEntries.findIndex(e => String(e.id) === String(id));
    if (entryIndex === -1) return;

    const confirmDelete = window.confirm(
        'Eliminare questo ingresso? Verrà rimosso anche dal foglio Google.'
    );
    if (!confirmDelete) return;

    if (currentEditingEntry && String(currentEditingEntry.id) === String(id)) {
        closeEditModal();
    }

    const entryToDelete = workEntries[entryIndex];
    workEntries.splice(entryIndex, 1);
    saveLocalEntries();
    renderEntries();
    syncToGoogleSheets(entryToDelete, 'delete');
}

function deleteWeekGroup(weekKey) {
    const entriesToDelete = workEntries.filter(entry => {
        const date = new Date(entry.clockInTime);
        const year = date.getFullYear();
        const week = getWeekNumber(date);
        return `${year}-W${week}` === weekKey;
    });

    if (entriesToDelete.length === 0) return;

    const confirmDelete = window.confirm(
        `Eliminare tutti i ${entriesToDelete.length} ingressi della settimana (${weekKey})? Verranno rimossi anche dal foglio Google.`
    );
    if (!confirmDelete) return;

    // Filtra mantenendo solo gli ingressi delle altre settimane
    workEntries = workEntries.filter(entry => {
        const date = new Date(entry.clockInTime);
        const year = date.getFullYear();
        const week = getWeekNumber(date);
        return `${year}-W${week}` !== weekKey;
    });

    saveLocalEntries();
    renderEntries();

    // Sincronizza ciascuna eliminazione con Google Sheets
    entriesToDelete.forEach(entry => {
        syncToGoogleSheets(entry, 'delete');
    });
}

function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Global functions per interazioni inline
window.toggleCard = function(headerElement) {
    const card = headerElement.closest('.entry-card');
    card.classList.toggle('collapsed');
};

window.toggleWeekGroup = function(headerElement) {
    const group = headerElement.closest('.week-group');
    group.classList.toggle('collapsed');
};

window.editClockOut = function(id) {
    const targetId = String(id);
    const entry = workEntries.find(e => String(e.id) === targetId);
    if (entry) {
        openEditModal(entry);
    } else {
        console.error("Ingresso non trovato per ID:", id);
    }
};

window.deleteEntry = function(id) {
    deleteEntryById(id);
};

window.deleteWeek = function(weekKey) {
    deleteWeekGroup(weekKey);
};

window.editEntry = function(id) {
    const entry = workEntries.find(e => String(e.id) === String(id));
    if (entry) openEditEntryModal(entry);
};

window.addLunchBreak = function(id) {
    const entry = workEntries.find(e => String(e.id) === String(id));
    if (entry) openLunchBreakModal(entry);
};

window.editLunchBreak = function(id) {
    const entry = workEntries.find(e => String(e.id) === String(id));
    if (entry) openLunchBreakModal(entry);
};

window.addLunchBreakActualEnd = function(id) {
    const entry = workEntries.find(e => String(e.id) === String(id));
    if (entry) openLunchActualEndModal(entry);
};

window.deleteLunchBreak = function(id) {
    const index = workEntries.findIndex(e => String(e.id) === String(id));
    if (index !== -1) {
        workEntries[index].lunchBreakStart = null;
        workEntries[index].lunchBreakExpectedEnd = null;
        workEntries[index].lunchBreakActualEnd = null;
        workEntries[index].lunchBreakMinutes = null;
        saveLocalEntries();
        renderEntries();
        syncToGoogleSheets(workEntries[index], 'update');
    }
};

// Rendering
function renderEntries() {
    // 0. Salva lo stato espanso/compresso di gruppi e card per non perdere lo stato durante la riscrittura dell'HTML
    const collapsedWeeks = new Set();
    const collapsedCards = new Set();
    document.querySelectorAll('.week-group.collapsed').forEach(el => {
        const key = el.getAttribute('data-week-key');
        if (key) collapsedWeeks.add(key);
    });
    document.querySelectorAll('.entry-card.collapsed').forEach(el => {
        const id = el.getAttribute('data-entry-id');
        if (id) collapsedCards.add(id);
    });

    if (workEntries.length === 0) {
        elements.entriesList.innerHTML = '<p class="empty-state">Nessun ingresso registrato</p>';
        return;
    }

    // 1. Group by Year and Week
    const grouped = {};
    workEntries.forEach(entry => {
        const date = new Date(entry.clockInTime);
        const year = date.getFullYear();
        const week = getWeekNumber(date);
        const key = `${year}-W${week}`;
        if (!grouped[key]) {
            grouped[key] = { year, week, entries: [] };
        }
        grouped[key].entries.push(entry);
    });

    // 2. Build HTML
    elements.entriesList.innerHTML = Object.keys(grouped).map(key => {
        const group = grouped[key];
        
        // Ordina gli ingressi della settimana dal più recente (in alto) al più vecchio (in basso)
        group.entries.sort((a, b) => new Date(b.clockInTime) - new Date(a.clockInTime));

        const isWeekCollapsed = collapsedWeeks.has(key);

        const cardsHTML = group.entries.map(entry => {
            const clockIn = new Date(entry.clockInTime);
            const expected = new Date(entry.expectedClockOutTime);
            const clockOut = entry.clockOutTime ? new Date(entry.clockOutTime) : null;
            const isCardCollapsed = collapsedCards.has(String(entry.id));

            let formattedWorked = null;
            if (clockOut) {
                const rawMinutes = Math.max(0, Math.round((clockOut - clockIn) / (1000 * 60)));
                const lunchMins = getLunchBreakMinutes(entry);
                const excessMins = lunchMins > 30 ? lunchMins - 30 : 0;
                const effectiveMinutes = Math.max(0, rawMinutes - excessMins);
                formattedWorked = formatMinutesToHoursAndMinutes(effectiveMinutes);
            }

            const hasLunchBreak = entry.lunchBreakStart != null;
            let lunchBreakSection = '';
            if (hasLunchBreak) {
                const lunchStart = new Date(entry.lunchBreakStart);
                const lunchExpectedEnd = entry.lunchBreakExpectedEnd ? new Date(entry.lunchBreakExpectedEnd) : null;
                const lunchActualEnd = entry.lunchBreakActualEnd ? new Date(entry.lunchBreakActualEnd) : null;
                const lunchMins = getLunchBreakMinutes(entry);
                const durationStr = lunchMins > 0 ? formatMinutesToHoursAndMinutes(lunchMins) : '—';
                lunchBreakSection = `
                    <div class="lunch-break-table">
                        <div class="lunch-break-table-header">Pausa Pranzo</div>
                        <div class="lunch-break-table-row">
                            <span class="lunch-label">Inizio:</span>
                            <span class="lunch-value">${formatDate(lunchStart)}</span>
                        </div>
                        ${lunchExpectedEnd ? `
                        <div class="lunch-break-table-row">
                            <span class="lunch-label">Fine Prevista:</span>
                            <span class="lunch-value primary">${formatDate(lunchExpectedEnd)}</span>
                        </div>` : ''}
                        <div class="lunch-break-table-row">
                            <span class="lunch-label">Fine Effettiva:</span>
                            ${lunchActualEnd
                                ? `<span class="lunch-value success">${formatDate(lunchActualEnd)}</span>`
                                : `<button type="button" class="btn-add-lunch-actual" onclick="event.stopPropagation(); addLunchBreakActualEnd('${entry.id}')">Aggiungi</button>`
                            }
                        </div>
                        <div class="lunch-break-table-row">
                            <span class="lunch-label">Durata:</span>
                            <span class="lunch-value">${durationStr}</span>
                        </div>
                        <div class="lunch-break-table-actions">
                            <button type="button" class="btn-edit-small" onclick="event.stopPropagation(); editLunchBreak('${entry.id}')">Modifica</button>
                            <button type="button" class="btn-delete-small" onclick="event.stopPropagation(); deleteLunchBreak('${entry.id}')">Elimina</button>
                        </div>
                    </div>`;
            }

            const lunchBreakBtn = !hasLunchBreak
                ? `<button type="button" class="btn-add-lunch" onclick="event.stopPropagation(); addLunchBreak('${entry.id}')">Pausa Pranzo</button>`
                : '';

            return `
                <div class="entry-card ${isCardCollapsed ? 'collapsed' : ''}" data-entry-id="${entry.id}">
                    <div class="entry-card-header" onclick="toggleCard(this)">
                        <div class="entry-header-left">
                            <span class="entry-label">Entrata:</span>
                            <strong class="entry-value">${formatDate(clockIn)}</strong>
                        </div>
                        <button type="button" class="btn-toggle-card" aria-label="Comprimi o espandi" onclick="event.stopPropagation(); toggleCard(this.parentElement)">
                            <span class="chevron">▼</span>
                        </button>
                    </div>

                    <div class="entry-card-body">
                        <div class="entry-row">
                            <span class="entry-label">Uscita Prevista:</span>
                            <span class="entry-value primary">${formatDate(expected)}</span>
                        </div>
                        <div class="entry-row">
                            <span class="entry-label">Uscita Effettiva:</span>
                            ${clockOut 
                                ? `<span class="entry-value success">${formatDate(clockOut)}</span>`
                                : `<button type="button" class="btn-add-clockout" data-id="${entry.id}">Aggiungi</button>`
                            }
                        </div>
                        ${formattedWorked !== null ? `
                            <div class="entry-row">
                                <span class="entry-label">Ore Lavorate:</span>
                                <span class="entry-value">${formattedWorked}</span>
                            </div>
                        ` : ''}
                        ${lunchBreakSection}
                        <div class="entry-actions">
                            ${lunchBreakBtn}
                            <button type="button" class="btn-edit" onclick="event.stopPropagation(); editEntry('${entry.id}')">Modifica</button>
                            <button type="button" class="btn-delete" onclick="event.stopPropagation(); deleteEntry('${entry.id}')">Elimina</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <section class="week-group ${isWeekCollapsed ? 'collapsed' : ''}" data-week-key="${key}">
                <div class="week-header" onclick="toggleWeekGroup(this)">
                    <div>
                        <span class="week-title">Settimana ${group.week} (${group.year})</span>
                        <span class="week-count">${group.entries.length} ingressi</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <button type="button" class="btn-delete-week" title="Elimina intera settimana" onclick="event.stopPropagation(); deleteWeek('${key}')" style="background:none; border:none; color:#dc3545; cursor:pointer; font-size:1.1rem; padding:2px 6px;">🗑️</button>
                        <span class="week-toggle-icon">▼</span>
                    </div>
                </div>
                <div class="week-content">
                    ${cardsHTML}
                </div>
            </section>
        `;
    }).join('');
}

// Local Storage
function saveLocalEntries() {
    localStorage.setItem('workEntries', JSON.stringify(workEntries));
}

function loadLocalEntries() {
    const stored = localStorage.getItem('workEntries');
    if (stored) {
        workEntries = JSON.parse(stored);
    }
}

// Google Sheets Integration
async function postToAppsScript(payload) {
    let response = await fetch(CONFIG.appsScriptUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        mode: 'cors',
        redirect: 'follow',
        cache: 'no-store'
    });

    if (response.type === 'opaque') {
        return;
    }

    if (!response.ok) {
        let errorDetails = `Errore API: ${response.status}`;
        try {
            const errorData = await response.json();
            if (errorData && errorData.error && errorData.error.message) {
                errorDetails = `Errore API ${response.status}: ${errorData.error.message}`;
            }
        } catch (parseError) {}
        throw new Error(errorDetails);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        const data = await response.json();
        if (data && data.success === false) {
            throw new Error(data.error || 'Errore Apps Script');
        }
    }
}

async function postToAppsScriptNoCors(payload) {
    await fetch(CONFIG.appsScriptUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        mode: 'no-cors',
        redirect: 'follow',
        cache: 'no-store'
    });
}

async function syncToGoogleSheets(entry, action) {
    if (!CONFIG.appsScriptUrl || CONFIG.appsScriptUrl === 'PASTE_APPS_SCRIPT_WEB_APP_URL_HERE') {
        showError('Configura appsScriptUrl in app.js');
        return;
    }
    
    showLoading();
    hideError();
    
    try {
        const clockIn = new Date(entry.clockInTime);
        const expected = new Date(entry.expectedClockOutTime);
        const clockOut = entry.clockOutTime ? new Date(entry.clockOutTime) : null;

        const lunchStartSync = entry.lunchBreakStart ? new Date(entry.lunchBreakStart) : null;
        const lunchExpectedEndSync = entry.lunchBreakExpectedEnd ? new Date(entry.lunchBreakExpectedEnd) : null;
        const lunchActualEndSync = entry.lunchBreakActualEnd ? new Date(entry.lunchBreakActualEnd) : null;
        const lunchMins = getLunchBreakMinutes(entry);

        let hoursFormatted = '';
        if (clockOut) {
            const rawMinutes = Math.max(0, Math.round((clockOut - clockIn) / (1000 * 60)));
            const excessMins = lunchMins > 30 ? lunchMins - 30 : 0;
            const effectiveMinutes = Math.max(0, rawMinutes - excessMins);
            hoursFormatted = formatMinutesToHoursAndMinutes(effectiveMinutes);
        }

        const payload = {
            action: action || 'append',
            sheetName: CONFIG.sheetName,
            clockIn: formatDate(clockIn),
            expectedClockOut: formatDate(expected),
            clockOut: clockOut ? formatDate(clockOut) : '',
            hours: hoursFormatted,
            lunchBreakStart: lunchStartSync ? formatDate(lunchStartSync) : '',
            lunchBreakExpectedEnd: lunchExpectedEndSync ? formatDate(lunchExpectedEndSync) : '',
            lunchBreakActualEnd: lunchActualEndSync ? formatDate(lunchActualEndSync) : '',
            lunchBreakDuration: lunchMins > 0 ? formatMinutesToHoursAndMinutes(lunchMins) : '',
            id: entry.id
        };

        try {
            await postToAppsScript(payload);
        } catch (error) {
            const message = String(error && error.message ? error.message : error);
            if (message.toLowerCase().includes('load failed') || message.toLowerCase().includes('failed to fetch')) {
                await postToAppsScriptNoCors(payload);
            } else {
                throw error;
            }
        }
        
        console.log('Sincronizzato con Google Sheets (Apps Script)');
    } catch (error) {
        console.error('Errore sincronizzazione:', error);
        const message = String(error && error.message ? error.message : error);
        showError(`Errore sincronizzazione: ${message}`);
    } finally {
        hideLoading();
    }
}

// Start App
init();