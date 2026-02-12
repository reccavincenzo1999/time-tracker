// Configuration - REPLACE WITH YOUR VALUES
const CONFIG = {
    apiKey: 'AIzaSyAzOowlr95IQNwC3RSEH6nZH5fZObgRD_E',
    spreadsheetId: '1DAgMwHbxGp-8OMtCrk6JlB6MFSdjzxlL05oW2wV-a50',
    sheetName: 'TimeTracking',
    appsScriptUrl: 'https://script.google.com/macros/s/AKfycbxQ4MVJL3441JiMUgp8w_2NqWz_RFvW0sgkbeNtc6Gsp47rNXhSNBcMR6-tAgkp_2DQ9Q/exec'
};

// State Management
let workEntries = [];
let currentEditingEntry = null;

// DOM Elements
const elements = {
    addBtn: document.getElementById('addBtn'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    errorMessage: document.getElementById('errorMessage'),
    entriesList: document.getElementById('entriesList'),
    
    // Add Modal
    addModal: document.getElementById('addModal'),
    closeAddModal: document.getElementById('closeAddModal'),
    cancelAddBtn: document.getElementById('cancelAddBtn'),
    saveEntryBtn: document.getElementById('saveEntryBtn'),
    clockInDate: document.getElementById('clockInDate'),
    clockInTime: document.getElementById('clockInTime'),
    hasClockOut: document.getElementById('hasClockOut'),
    clockOutGroup: document.getElementById('clockOutGroup'),
    clockOutDate: document.getElementById('clockOutDate'),
    clockOutTime: document.getElementById('clockOutTime'),
    expectedClockOut: document.getElementById('expectedClockOut'),
    
    // Edit Modal
    editModal: document.getElementById('editModal'),
    closeEditModal: document.getElementById('closeEditModal'),
    cancelEditBtn: document.getElementById('cancelEditBtn'),
    saveClockOutBtn: document.getElementById('saveClockOutBtn'),
    editClockIn: document.getElementById('editClockIn'),
    editClockOutDate: document.getElementById('editClockOutDate'),
    editClockOutTime: document.getElementById('editClockOutTime'),
    calculatedHours: document.getElementById('calculatedHours')
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
    
    elements.editClockOutDate.addEventListener('change', updateCalculatedHours);
    elements.editClockOutTime.addEventListener('change', updateCalculatedHours);
    
    // Close modals on background click
    elements.addModal.addEventListener('click', (e) => {
        if (e.target === elements.addModal) closeAddModal();
    });
    elements.editModal.addEventListener('click', (e) => {
        if (e.target === elements.editModal) closeEditModal();
    });
}

// Date/Time Utilities
function setDefaultDateTime() {
    const now = new Date();
    elements.clockInDate.valueAsDate = now;
    elements.clockInTime.value = formatTime(now);
    elements.clockOutDate.valueAsDate = now;
    elements.clockOutTime.value = formatTime(now);
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

function calculateHoursWorked(clockIn, clockOut) {
    return (clockOut - clockIn) / (1000 * 60 * 60);
}

// UI Updates
function updateExpectedClockOut() {
    const clockIn = parseDateTime(elements.clockInDate.value, elements.clockInTime.value);
    if (!isNaN(clockIn)) {
        const expected = calculateExpectedClockOut(clockIn);
        elements.expectedClockOut.textContent = formatDate(expected);
    }
}

function updateCalculatedHours() {
    if (currentEditingEntry) {
        const clockOut = parseDateTime(elements.editClockOutDate.value, elements.editClockOutTime.value);
        const clockIn = new Date(currentEditingEntry.clockInTime);
        if (!isNaN(clockOut)) {
            const hours = calculateHoursWorked(clockIn, clockOut);
            elements.calculatedHours.textContent = `${hours.toFixed(2)} ore`;
        }
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
    setDefaultDateTime();
    elements.hasClockOut.checked = false;
    toggleClockOutFields();
    elements.addModal.classList.remove('hidden');
}

function closeAddModal() {
    elements.addModal.classList.add('hidden');
}

function openEditModal(entry) {
    currentEditingEntry = entry;
    elements.editClockIn.textContent = formatDate(entry.clockInTime);
    
    const expected = new Date(entry.expectedClockOutTime);
    elements.editClockOutDate.valueAsDate = expected;
    elements.editClockOutTime.value = formatTime(expected);
    
    updateCalculatedHours();
    elements.editModal.classList.remove('hidden');
}

function closeEditModal() {
    currentEditingEntry = null;
    elements.editModal.classList.add('hidden');
}

// Entry Management
function saveEntry() {
    const clockIn = parseDateTime(elements.clockInDate.value, elements.clockInTime.value);
    
    let clockOut = null;
    if (elements.hasClockOut.checked) {
        clockOut = parseDateTime(elements.clockOutDate.value, elements.clockOutTime.value);
    }
    
    const entry = {
        id: generateId(),
        clockInTime: clockIn.toISOString(),
        expectedClockOutTime: calculateExpectedClockOut(clockIn).toISOString(),
        clockOutTime: clockOut ? clockOut.toISOString() : null
    };
    
    workEntries.unshift(entry);
    saveLocalEntries();
    renderEntries();
    closeAddModal();
    
    syncToGoogleSheets(entry);
}

function saveClockOut() {
    if (!currentEditingEntry) return;
    
    const clockOut = parseDateTime(elements.editClockOutDate.value, elements.editClockOutTime.value);
    
    const index = workEntries.findIndex(e => e.id === currentEditingEntry.id);
    if (index !== -1) {
        workEntries[index].clockOutTime = clockOut.toISOString();
        saveLocalEntries();
        renderEntries();
        closeEditModal();
        
        syncToGoogleSheets(workEntries[index]);
    }
}

function deleteEntryById(id) {
    const entryIndex = workEntries.findIndex(e => e.id === id);
    if (entryIndex === -1) return;

    const confirmDelete = window.confirm(
        'Eliminare questo ingresso? Verra rimosso solo dal dispositivo.'
    );
    if (!confirmDelete) return;

    if (currentEditingEntry && currentEditingEntry.id === id) {
        closeEditModal();
    }

    workEntries.splice(entryIndex, 1);
    saveLocalEntries();
    renderEntries();
}

function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Rendering
function renderEntries() {
    if (workEntries.length === 0) {
        elements.entriesList.innerHTML = '<p class="empty-state">Nessun ingresso registrato</p>';
        return;
    }
    
    elements.entriesList.innerHTML = workEntries.map(entry => {
        const clockIn = new Date(entry.clockInTime);
        const expected = new Date(entry.expectedClockOutTime);
        const clockOut = entry.clockOutTime ? new Date(entry.clockOutTime) : null;
        const hoursWorked = clockOut ? calculateHoursWorked(clockIn, clockOut) : null;
        
        return `
            <div class="entry-card">
                <div class="entry-row">
                    <span class="entry-label">Entrata:</span>
                    <span class="entry-value">${formatDate(clockIn)}</span>
                </div>
                <div class="entry-row">
                    <span class="entry-label">Uscita Prevista:</span>
                    <span class="entry-value primary">${formatDate(expected)}</span>
                </div>
                <div class="entry-row">
                    <span class="entry-label">Uscita Effettiva:</span>
                    ${clockOut 
                        ? `<span class="entry-value success">${formatDate(clockOut)}</span>`
                        : `<button class="btn-add-clockout" onclick="editClockOut('${entry.id}')">Aggiungi</button>`
                    }
                </div>
                ${hoursWorked !== null ? `
                    <div class="entry-row">
                        <span class="entry-label">Ore Lavorate:</span>
                        <span class="entry-value">${hoursWorked.toFixed(2)} ore</span>
                    </div>
                ` : ''}
                <div class="entry-actions">
                    <button class="btn-delete" onclick="deleteEntry('${entry.id}')">Elimina</button>
                </div>
            </div>
        `;
    }).join('');
}

window.editClockOut = function(id) {
    const entry = workEntries.find(e => e.id === id);
    if (entry) {
        openEditModal(entry);
    }
};

window.deleteEntry = function(id) {
    deleteEntryById(id);
};

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
        } catch (parseError) {
            // Keep default errorDetails when response is not JSON.
        }
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

async function syncToGoogleSheets(entry) {
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
        const hours = clockOut ? calculateHoursWorked(clockIn, clockOut) : '';

        const payload = {
            sheetName: CONFIG.sheetName,
            clockIn: formatDate(clockIn),
            expectedClockOut: formatDate(expected),
            clockOut: clockOut ? formatDate(clockOut) : '',
            hours: hours ? hours.toFixed(2) : '',
            id: entry.id
        };

        try {
            await postToAppsScript(payload);
        } catch (error) {
            const message = String(error && error.message ? error.message : error);
            if (message.toLowerCase().includes('load failed')) {
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

async function loadEntriesFromGoogleSheets() {
    if (CONFIG.apiKey === 'YOUR_API_KEY_HERE' || CONFIG.spreadsheetId === 'YOUR_SPREADSHEET_ID_HERE') {
        showError('Configura prima Google Sheets in app.js');
        return;
    }
    
    showLoading();
    hideError();
    
    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.spreadsheetId}/values/${CONFIG.sheetName}!A:E?key=${CONFIG.apiKey}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            let errorDetails = `Errore API: ${response.status}`;
            try {
                const errorData = await response.json();
                if (errorData && errorData.error && errorData.error.message) {
                    errorDetails = `Errore API ${response.status}: ${errorData.error.message}`;
                }
            } catch (parseError) {
                // Keep default errorDetails when response is not JSON.
            }
            throw new Error(errorDetails);
        }
        
        const data = await response.json();
        
        if (data.values && data.values.length > 1) {
            const entries = data.values.slice(1).map(row => {
                if (row.length < 5) return null;
                
                const [clockInStr, expectedStr, clockOutStr, , id] = row;
                
                return {
                    id: id,
                    clockInTime: parseDateString(clockInStr),
                    expectedClockOutTime: parseDateString(expectedStr),
                    clockOutTime: clockOutStr ? parseDateString(clockOutStr) : null
                };
            }).filter(e => e !== null);
            
            workEntries = entries;
            saveLocalEntries();
            renderEntries();
        }
        
        console.log('Caricato da Google Sheets');
    } catch (error) {
        console.error('Errore caricamento:', error);
        showError(`Errore caricamento: ${error.message}`);
    } finally {
        hideLoading();
    }
}

function parseDateString(str) {
    // Format: DD/MM/YYYY HH:MM
    const [datePart, timePart] = str.split(' ');
    const [day, month, year] = datePart.split('/');
    const [hours, minutes] = timePart.split(':');
    return new Date(year, month - 1, day, hours, minutes).toISOString();
}

// Start App
init();
