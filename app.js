// Configuration - REPLACE WITH YOUR VALUES
const CONFIG = {
    spreadsheetId: '1DAgMwHbxGp-8OMtCrk6JlB6MFSdjzxlL05oW2wV-a50',
    sheetName: 'TimeTracking',
    appsScriptUrl: 'https://script.google.com/macros/s/AKfycbzWJ41h6zxfLUsKSY5GF9lOgaxUKCSc4MxQgqFAqzN6F4gdLJL6Rx_PSVJdudmWEAWRoQ/exec'
};

// State Management
let workEntries = [];
let vacationEntries = [];
let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth();
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
    loadLocalVacations();
    renderEntries();
    setupEventListeners();
    setDefaultDateTime();
    updateHeaderDate();
    updateWeekRange();
    initTabNavigation();
    updateHeaderAvatar();
    // Mostra i FAB della Home al caricamento iniziale
    document.getElementById('addSmartBtn')?.classList.remove('hidden');
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

    // Smart working modal
    document.getElementById('addSmartBtn').addEventListener('click', openSmartWorkingModal);
    document.getElementById('closeSmartModal').addEventListener('click', closeSmartWorkingModal);
    document.getElementById('cancelSmartBtn').addEventListener('click', closeSmartWorkingModal);
    document.getElementById('saveSmartBtn').addEventListener('click', saveSmartWorkingEntry);
    document.getElementById('smartWorkingModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('smartWorkingModal')) closeSmartWorkingModal();
    });
    document.getElementById('smartDate').addEventListener('change', updateSmartHoursPreview);

    // Ferie modal
    document.getElementById('addFerieBtn').addEventListener('click', openFerieModal);
    document.getElementById('closeFerieModal').addEventListener('click', closeFerieModal);
    document.getElementById('cancelFerieBtn').addEventListener('click', closeFerieModal);
    document.getElementById('saveFerieBtn').addEventListener('click', saveFerieEntry);
    document.getElementById('ferieModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('ferieModal')) closeFerieModal();
    });
    document.getElementById('calPrevMonth').addEventListener('click', () => {
        calendarMonth--;
        if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
        renderCalendarGrid(calendarYear, calendarMonth);
    });
    document.getElementById('calNextMonth').addEventListener('click', () => {
        calendarMonth++;
        if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
        renderCalendarGrid(calendarYear, calendarMonth);
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

    // 2. Ordina le settimane in ordine decrescente (dalla più recente in alto alla più remota in basso)
    const sortedWeekKeys = Object.keys(grouped).sort((a, b) => {
        if (grouped[b].year !== grouped[a].year) {
            return grouped[b].year - grouped[a].year;
        }
        return grouped[b].week - grouped[a].week;
    });

    // 3. Build HTML
    elements.entriesList.innerHTML = sortedWeekKeys.map(key => {
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

            const lunchBreakBtn = !hasLunchBreak && entry.type !== 'smartWorking'
                ? `<button type="button" class="btn-add-lunch" onclick="event.stopPropagation(); addLunchBreak('${entry.id}')">Pausa Pranzo</button>`
                : '';

            const _days = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
            const _dayName = _days[clockIn.getDay()];
            const _dayNum  = clockIn.getDate();
            const _ciStr = `${String(clockIn.getHours()).padStart(2,'0')}:${String(clockIn.getMinutes()).padStart(2,'0')}`;
            const _coStr = clockOut
                ? `${String(clockOut.getHours()).padStart(2,'0')}:${String(clockOut.getMinutes()).padStart(2,'0')}`
                : entry.expectedClockOutTime
                    ? `${String(new Date(entry.expectedClockOutTime).getHours()).padStart(2,'0')}:${String(new Date(entry.expectedClockOutTime).getMinutes()).padStart(2,'0')}*`
                    : '--';
            const _timeRange  = `${_ciStr} – ${_coStr}`;
            const _hoursDisp  = formattedWorked !== null ? formattedWorked : '-- h';
            const _isComplete = clockOut !== null;

            return `
                <div class="entry-card ${isCardCollapsed ? 'collapsed' : ''}" data-entry-id="${entry.id}">
                    <div class="entry-card-header" onclick="toggleCard(this)">
                        <div class="entry-day-box${entry.type === 'smartWorking' ? ' smart' : ''}">
                            <span class="entry-day-abbr">${_dayName}</span>
                            <span class="entry-day-num">${_dayNum}</span>
                        </div>
                        <div class="entry-card-info">
                            <div class="entry-card-top">
                                <span class="entry-hours-worked">${_hoursDisp}</span>
                                <svg class="entry-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </div>
                            <div class="entry-card-mid${entry.type === 'smartWorking' ? ' smart-working' : ''}">${entry.type === 'smartWorking' ? '&#127968; Smart Working' : 'Poste Italiane'}</div>
                            <div class="entry-card-bottom">
                                <span class="entry-time-range">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                    ${_timeRange}
                                </span>
                                <span class="entry-status-badge ${_isComplete ? '' : 'pending'}">${_isComplete ? '&#10003; Completato' : '&#8987; In corso'}</span>
                            </div>
                        </div>
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
                    <div class="week-header-left">
                        <span class="week-title">Sett. ${group.week} &middot; ${group.year}</span>
                        <span class="week-count">${group.entries.length} ${group.entries.length === 1 ? 'giorno' : 'giorni'}</span>
                    </div>
                    <div class="week-header-right">
                        <span class="week-date-range">${getWeekDateRange(group.year, group.week)}</span>
                        <button type="button" class="btn-delete-week" title="Elimina intera settimana" onclick="event.stopPropagation(); deleteWeek('${key}')"><svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='3 6 5 6 21 6'/><path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2'/></svg></button>
                        <span class="week-toggle-icon">&#9660;</span>
                    </div>
                </div>
                <div class="week-content">
                    ${cardsHTML}
                </div>
            </section>
        `;
    }).join('');
    updateTodaySummary();
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

// ── UI helpers ──
function getWeekDateRange(year, week) {
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const dow = jan4.getUTCDay() || 7;
    const ws = new Date(jan4);
    ws.setUTCDate(jan4.getUTCDate() - (dow - 1) + (week - 1) * 7);
    const we = new Date(ws);
    we.setUTCDate(ws.getUTCDate() + 6);
    const M = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
    return ws.getUTCMonth() === we.getUTCMonth()
        ? `${ws.getUTCDate()} - ${we.getUTCDate()} ${M[we.getUTCMonth()]}`
        : `${ws.getUTCDate()} ${M[ws.getUTCMonth()]} - ${we.getUTCDate()} ${M[we.getUTCMonth()]}`;
}

function updateHeaderDate() {
    const el = document.getElementById('headerDate');
    if (!el) return;
    const now = new Date();
    const D = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
    const M = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
    el.textContent = `${D[now.getDay()]}, ${now.getDate()} ${M[now.getMonth()]} ${now.getFullYear()}`;
}

function updateWeekRange() {
    const el = document.getElementById('weekRange');
    if (!el) return;
    const now = new Date();
    el.textContent = getWeekDateRange(now.getFullYear(), getWeekNumber(now));
}

function updateTodaySummary() {
    const el = document.getElementById('todayHours');
    if (!el) return;
    const now = new Date();
    const ts = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const todays = workEntries.filter(e => {
        const d = new Date(e.clockInTime);
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` === ts;
    });
    if (todays.length === 0) { el.textContent = '-- h --'; return; }
    let total = 0;
    todays.forEach(e => {
        const ci = new Date(e.clockInTime);
        const co = e.clockOutTime ? new Date(e.clockOutTime) : new Date();
        const raw = Math.max(0, Math.round((co - ci) / 60000));
        const lm = getLunchBreakMinutes(e);
        total += Math.max(0, raw - (lm > 30 ? lm - 30 : 0));
    });
    el.textContent = `${Math.floor(total/60)}h ${String(total%60).padStart(2,'0')}m`;
}

function initTabNavigation() {
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', function() { switchView(this.getAttribute('data-view')); });
    });
}

function switchView(viewName) {
    document.querySelectorAll('.nav-item').forEach(b =>
        b.classList.toggle('active', b.getAttribute('data-view') === viewName)
    );
    document.querySelectorAll('.main-view').forEach(v => v.classList.add('hidden'));
    const target = document.getElementById(`view${viewName}`);
    if (target) target.classList.remove('hidden');
    // Toggle FABs based on active view
    const mainFab = document.getElementById('addBtn');
    const ferieFab = document.getElementById('addFerieBtn');
    const smartFab = document.getElementById('addSmartBtn');
    if (mainFab) mainFab.classList.toggle('hidden', viewName !== 'Home');
    if (ferieFab) ferieFab.classList.toggle('hidden', viewName !== 'Calendario');
    if (smartFab) smartFab.classList.toggle('hidden', viewName !== 'Home');
    if (viewName === 'Profilo') renderProfile();
    if (viewName === 'Calendario') renderCalendar();
}

function loadUserProfile() {
    const s = localStorage.getItem('userProfile');
    return s ? JSON.parse(s) : {};
}

function saveUserProfile(data) {
    localStorage.setItem('userProfile', JSON.stringify(data));
}

function updateHeaderAvatar() {
    const p = loadUserProfile();
    const avatar = document.querySelector('.user-avatar');
    if (!avatar) return;
    if (p.photo) {
        avatar.innerHTML = '<img src="' + p.photo + '" alt="Profilo" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
    } else if (p.nome || p.cognome) {
        const initials = ((p.nome || '').charAt(0) + (p.cognome || '').charAt(0)).toUpperCase();
        avatar.innerHTML = '<span style="font-size:.85rem;font-weight:800;color:white;letter-spacing:.02em;">' + initials + '</span>';
    } else {
        avatar.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>';
    }
}

window.handleProfilePhoto = function(input) {
    if (!input.files || !input.files[0]) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const p = loadUserProfile();
        p.photo = e.target.result;
        saveUserProfile(p);
        updateHeaderAvatar();
        renderProfile();
    };
    reader.readAsDataURL(input.files[0]);
};

window.saveProfileData = function() {
    const p = loadUserProfile();
    p.nome      = (document.getElementById('pNome')?.value      || '').trim();
    p.cognome   = (document.getElementById('pCognome')?.value   || '').trim();
    p.email     = (document.getElementById('pEmail')?.value     || '').trim();
    p.matricola = (document.getElementById('pMatricola')?.value || '').trim();
    saveUserProfile(p);
    updateHeaderAvatar();
    renderProfile();
    const btn = document.querySelector('.btn-save-profile');
    if (btn) { btn.textContent = '\u2713 Salvato!'; setTimeout(() => { btn.textContent = 'Salva Dati'; }, 1500); }
};

function renderProfile() {
    const el = document.getElementById('profileStats');
    if (!el) return;
    const now = new Date();
    const tm = now.getMonth(), ty = now.getFullYear();
    const MN = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
    const mEntries = workEntries.filter(e => { const d = new Date(e.clockInTime); return d.getMonth()===tm && d.getFullYear()===ty; });
    let totalMins = 0, completedDays = 0;
    mEntries.forEach(e => {
        if (!e.clockOutTime) return;
        completedDays++;
        const ci = new Date(e.clockInTime), co = new Date(e.clockOutTime);
        const raw = Math.max(0, Math.round((co-ci)/60000));
        const lm = getLunchBreakMinutes(e);
        totalMins += Math.max(0, raw - (lm > 30 ? lm-30 : 0));
    });
    const tH = Math.floor(totalMins/60), tM = totalMins%60;
    const avgM = completedDays > 0 ? Math.round(totalMins/completedDays) : 0;
    const aH = Math.floor(avgM/60), aM = avgM%60;
    const p = loadUserProfile();
    const photoHTML = p.photo
        ? '<img src="' + p.photo + '" alt="Foto profilo">'
        : '<svg width="38" height="38" viewBox="0 0 24 24" fill="white"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>';
    const displayName = [p.nome, p.cognome].filter(Boolean).join(' ') || 'Il tuo nome';
    const displaySub  = p.email || 'Poste Italiane';
    el.innerHTML = `
        <div class="profile-header-card">
            <div class="profile-photo-wrap" onclick="document.getElementById('profilePhotoInput').click()">
                ${photoHTML}
                <div class="photo-overlay-icon">&#128247;</div>
            </div>
            <input type="file" id="profilePhotoInput" accept="image/*" style="display:none" onchange="handleProfilePhoto(this)">
            <div class="profile-name-display">${displayName}</div>
            <p class="profile-role-text">${displaySub}</p>
        </div>
        <div class="profile-info-card">
            <h3>Dati Personali</h3>
            <div class="form-group">
                <label for="pNome">Nome</label>
                <input type="text" id="pNome" placeholder="Mario" value="${p.nome || ''}">
            </div>
            <div class="form-group">
                <label for="pCognome">Cognome</label>
                <input type="text" id="pCognome" placeholder="Rossi" value="${p.cognome || ''}">
            </div>
            <div class="form-group">
                <label for="pEmail">Email Aziendale</label>
                <input type="text" id="pEmail" placeholder="m.rossi@poste.it" value="${p.email || ''}">
            </div>
            <div class="form-group">
                <label for="pMatricola">Matricola</label>
                <input type="text" id="pMatricola" placeholder="ES1234567" value="${p.matricola || ''}">
            </div>
            <button class="btn btn-primary btn-save-profile" onclick="saveProfileData()">Salva Dati</button>
        </div>
        <p class="profile-stats-section-title">Statistiche</p>
        <div class="profile-stats-grid">
            <div class="stat-card"><p class="stat-value">${workEntries.length}</p><p class="stat-label">Ingressi Totali</p></div>
            <div class="stat-card"><p class="stat-value">${tH}h ${String(tM).padStart(2,'0')}m</p><p class="stat-label">Ore ${MN[tm]}</p></div>
            <div class="stat-card"><p class="stat-value">${completedDays}</p><p class="stat-label">Giorni Completati</p></div>
            <div class="stat-card"><p class="stat-value">${aH}h ${String(aM).padStart(2,'0')}m</p><p class="stat-label">Media Giornaliera</p></div>
        </div>`;
}

function loadVacationBudget() {
    return parseInt(localStorage.getItem('vacationBudget') || '32', 10);
}

function saveVacationBudget(n) {
    localStorage.setItem('vacationBudget', String(n));
}

window.openBudgetEdit = function() {
    const edit = document.getElementById('calBudgetEdit');
    if (!edit) return;
    document.getElementById('calBudgetInput').value = loadVacationBudget();
    edit.classList.remove('hidden');
    document.getElementById('calBudgetInput').focus();
};

window.closeBudgetEdit = function() {
    document.getElementById('calBudgetEdit')?.classList.add('hidden');
};

window.saveBudgetEdit = function() {
    const v = parseInt(document.getElementById('calBudgetInput').value, 10);
    if (isNaN(v) || v < 1) return;
    saveVacationBudget(v);
    closeBudgetEdit();
    renderCalendarSummary();
};

// ── VACATION DATA ──
function loadLocalVacations() {
    const s = localStorage.getItem('vacationEntries');
    vacationEntries = s ? JSON.parse(s) : [];
}

function saveLocalVacations() {
    localStorage.setItem('vacationEntries', JSON.stringify(vacationEntries));
}

function openFerieModal() {
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('ferieStartDate').value = today;
    document.getElementById('ferieEndDate').value = today;
    document.getElementById('ferieNote').value = '';
    document.getElementById('ferieModal').classList.remove('hidden');
}

function closeFerieModal() {
    document.getElementById('ferieModal').classList.add('hidden');
}

function saveFerieEntry() {
    const start = document.getElementById('ferieStartDate').value;
    const end   = document.getElementById('ferieEndDate').value;
    const note  = document.getElementById('ferieNote').value.trim();
    if (!start || !end || start > end) {
        alert('Seleziona un intervallo di date valido.');
        return;
    }
    vacationEntries.push({ id: Date.now().toString(), startDate: start, endDate: end, note });
    saveLocalVacations();
    closeFerieModal();
    renderCalendar();
}

window.deleteFerieEntry = function(id) {
    vacationEntries = vacationEntries.filter(v => v.id !== id);
    saveLocalVacations();
    renderCalendar();
};

// ── CALENDAR RENDERING ──
function renderCalendar() {
    renderCalendarSummary();
    renderCalendarGrid(calendarYear, calendarMonth);
    renderVacationList();
}

function renderCalendarSummary() {
    const budget = loadVacationBudget();
    const year = new Date().getFullYear();
    let vacDays = 0;
    vacationEntries.forEach(v => {
        const cur = new Date(v.startDate);
        const end = new Date(v.endDate);
        while (cur <= end) {
            if (cur.getFullYear() === year) vacDays++;
            cur.setDate(cur.getDate() + 1);
        }
    });
    const remaining = budget - vacDays;
    const elB = document.getElementById('calVacBudget');
    const elU = document.getElementById('calVacUsed');
    const elR = document.getElementById('calVacRemaining');
    if (elB) elB.textContent = budget;
    if (elU) elU.textContent = vacDays;
    if (elR) {
        elR.textContent = remaining;
        elR.style.color = remaining < 0 ? 'var(--danger-color)' : '';
    }
}

function renderCalendarGrid(year, month) {
    const MN = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
    const titleEl = document.getElementById('calMonthTitle');
    if (titleEl) titleEl.textContent = `${MN[month]} ${year}`;
    const grid = document.getElementById('calGrid');
    if (!grid) return;
    // Set of days with work entries
    const workedSet = new Set();
    workEntries.forEach(e => {
        const d = new Date(e.clockInTime);
        if (d.getFullYear() === year && d.getMonth() === month) workedSet.add(d.getDate());
    });
    // Set of vacation days
    const vacSet = new Set();
    vacationEntries.forEach(v => {
        const cur = new Date(v.startDate);
        const end = new Date(v.endDate);
        while (cur <= end) {
            if (cur.getFullYear() === year && cur.getMonth() === month) vacSet.add(cur.getDate());
            cur.setDate(cur.getDate() + 1);
        }
    });
    // Set of smart working days
    const smartSet = new Set();
    workEntries.forEach(e => {
        if (e.type === 'smartWorking') {
            const d = new Date(e.clockInTime);
            if (d.getFullYear() === year && d.getMonth() === month) smartSet.add(d.getDate());
        }
    });
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday-first
    let html = '';
    for (let i = 0; i < startOffset; i++) html += '<div class="cal-day cal-day-empty"></div>';
    for (let d = 1; d <= daysInMonth; d++) {
        const dow = (startOffset + d - 1) % 7;
        const isWeekend = dow >= 5;
        const isToday = isCurrentMonth && today.getDate() === d;
        const isVacation = vacSet.has(d);
        const isWorked = workedSet.has(d);
        let cls = 'cal-day';
        if (isWeekend) cls += ' cal-day-weekend';
        if (isToday) cls += ' cal-day-today';
        if (isVacation) cls += ' cal-day-vacation';
        else if (smartSet.has(d)) cls += ' cal-day-smart';
        else if (isWorked) cls += ' cal-day-work';
        html += `<div class="${cls}">${d}</div>`;
    }
    grid.innerHTML = html;
}

function renderVacationList() {
    const el = document.getElementById('calVacationList');
    if (!el) return;
    if (vacationEntries.length === 0) {
        el.innerHTML = '';
        return;
    }
    const MN = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
    const fmt = iso => { const d = new Date(iso); return `${d.getDate()} ${MN[d.getMonth()]} ${d.getFullYear()}`; };
    const rows = vacationEntries.slice().reverse().map(v => {
        const range = v.startDate === v.endDate ? fmt(v.startDate) : `${fmt(v.startDate)} – ${fmt(v.endDate)}`;
        return `<div class="cal-vacation-item">
            <div class="cal-vacation-info">
                <span class="cal-vacation-range">${range}</span>
                ${v.note ? `<span class="cal-vacation-note">${v.note}</span>` : ''}
            </div>
            <button class="btn-delete-week" onclick="deleteFerieEntry('${v.id}')" aria-label="Elimina ferie" title="Elimina">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
            </button>
        </div>`;
    }).join('');
    el.innerHTML = `<p class="profile-stats-section-title" style="margin-top:1rem">Ferie Registrate</p>${rows}`;
}

// ── SMART WORKING ──
function getSmartHours(dateStr) {
    const d = new Date(dateStr);
    const dow = d.getDay(); // 0=Dom, 5=Ven
    return dow === 5
        ? { start: '08:00', end: '14:00', hours: 6 }
        : { start: '08:00', end: '16:00', hours: 8 };
}

function openSmartWorkingModal() {
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('smartDate').value = today;
    updateSmartHoursPreview();
    document.getElementById('smartWorkingModal').classList.remove('hidden');
}

function closeSmartWorkingModal() {
    document.getElementById('smartWorkingModal').classList.add('hidden');
}

function updateSmartHoursPreview() {
    const dateStr = document.getElementById('smartDate').value;
    if (!dateStr) return;
    const h = getSmartHours(dateStr);
    const el = document.getElementById('smartHoursPreview');
    if (el) el.textContent = `${h.start} – ${h.end} (${h.hours}h)`;
}

function saveSmartWorkingEntry() {
    const dateStr = document.getElementById('smartDate').value;
    if (!dateStr) return;
    const h = getSmartHours(dateStr);
    const clockIn  = new Date(`${dateStr}T${h.start}:00`);
    const clockOut = new Date(`${dateStr}T${h.end}:00`);
    const entry = {
        id: Date.now().toString(),
        type: 'smartWorking',
        clockInTime: clockIn.toISOString(),
        expectedClockOutTime: clockOut.toISOString(),
        clockOutTime: clockOut.toISOString(),
        lunchBreakStart: null,
        lunchBreakExpectedEnd: null,
        lunchBreakActualEnd: null,
        lunchBreakMinutes: null
    };
    workEntries.push(entry);
    saveLocalEntries();
    renderEntries();
    updateTodaySummary();
    closeSmartWorkingModal();
}

// Start App
init();
