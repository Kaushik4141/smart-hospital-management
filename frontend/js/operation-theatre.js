// Connect to Socket.io server using relative URL
const socket = io();

// DOM Elements
const totalScheduledEl = document.getElementById('totalScheduled');
const inProgressEl = document.getElementById('inProgress');
const completedTodayEl = document.getElementById('completedToday');
const nowServingEl = document.getElementById('now-serving');

// OT Elements
const otSections = {
    'OT1': {
        current: document.getElementById('ot1-current'),
        queue: document.getElementById('ot1-queue')
    }
};

// Initialize stats
let stats = {
    totalScheduled: 0,
    inProgress: 0,
    completedToday: 0
};

// Initialize OT data
let otData = {
    OT1: { current: null, queue: [] }
};

// Update stats display
function updateStats() {
    console.log('Updating stats:', stats);
    totalScheduledEl.textContent = stats.totalScheduled;
    inProgressEl.textContent = stats.inProgress;
    completedTodayEl.textContent = stats.completedToday;
}

// Create surgery item HTML
function createSurgeryItemHTML(patient) {
    console.log('Creating surgery item HTML for patient:', patient);
    
    // Determine patient status
    let statusDisplay = patient.otStatus || 'Pending Transfer';
    if (patient.transfer && patient.transfer.type === 'ot' && patient.transfer.status === 'Pending') {
        statusDisplay = 'Transfer Pending';
    }

    return `
        <div class="surgery-details">
            <div class="patient-info">
                <span class="patient-name">${patient.name}</span>
                <span class="patient-id">${patient.tokenNumber || 'No ID'}</span>
                <span class="surgery-stage stage">${patient.surgeryStage ? patient.surgeryStage.toLowerCase() : 'unknown'}</span>
            </div>
            <div class="surgery-info">
                <span class="surgery-type">${patient.surgeryType || 'Not specified'}</span>
                <span class="priority ${patient.priority ? patient.priority.toLowerCase() : 'normal'}">${patient.priority || 'Normal'}</span>
                <span class="status ${statusDisplay.toLowerCase().replace(' ', '-')}">${statusDisplay}</span>
            </div>
            <div class="surgery-time">
                ${patient.scheduledTime ? new Date(patient.scheduledTime).toLocaleTimeString() : 
                 patient.transfer && patient.transfer.requestedAt ? new Date(patient.transfer.requestedAt).toLocaleTimeString() : 
                 'Not scheduled'}
            </div>
        </div>
    `;
}

// Update Now Serving section
function updateNowServing() {
    // Find a patient with any valid surgery stage across all OTs
    let servingPatient = null;
    
    console.log('Updating Now Serving section, current OT data:', otData);
    
    // Check each OT for a patient with a valid surgery stage
    for (const otId in otData) {
        const ot = otData[otId];
        console.log(`Checking ${otId}:`, ot);
        
        if (ot && ot.current && 
            ot.current.surgeryStage && 
            ['Pre-operative', 'Anaesthetic', 'Surgical', 'Recovery'].includes(ot.current.surgeryStage) &&
            ot.current.status !== 'completed') {
            
            console.log(`Found patient with valid surgery stage in ${otId}:`, ot.current);
            servingPatient = ot.current;
            break;
        }
    }
    
    if (servingPatient) {
        const otNumber = servingPatient.currentOT || 'Unknown OT';
        
        nowServingEl.innerHTML = `
            <div class="patient-card">
                <span class="patient-name">${servingPatient.name}</span>
                <span class="patient-id">ID: ${servingPatient.tokenNumber || 'No ID'}</span>
                <span class="surgery-stage stage-${servingPatient.surgeryStage.toLowerCase()}">
                    ${servingPatient.surgeryStage}
                </span>
                <div class="surgery-info">
                    <span class="surgery-type">${servingPatient.surgeryType || 'Not specified'}</span>
                    <span class="ot-number">${otNumber}</span>
                </div>
            </div>
        `;
    } else {
        nowServingEl.innerHTML = '<p class="waiting-message">Waiting for patient...</p>';
    }
}

// Update OT display
// Update OT display
function updateOTDisplay(otId) {
    console.log('Updating OT display for:', otId, 'with data:', otData[otId]);
    const ot = otData[otId];
    const elements = otSections[otId];

    // Update current surgery - don't display if status is completed
    if (ot.current && ot.current.status !== 'completed') {
        elements.current.innerHTML = createSurgeryItemHTML(ot.current);
    } else {
        elements.current.innerHTML = '<p class="no-surgery">No current surgery</p>';
    }

    // Update queue - filter out patients with status completed
    if (ot.queue && ot.queue.length > 0) {
        const filteredQueue = ot.queue.filter(patient => patient.status !== 'completed');
        
        if (filteredQueue.length > 0) {
            elements.queue.innerHTML = filteredQueue
                .map(patient => `<div class="queue-item">${createSurgeryItemHTML(patient)}</div>`)
                .join('');
        } else {
            elements.queue.innerHTML = '<p class="no-surgery">No patients in queue</p>';
        }
    } else {
        elements.queue.innerHTML = '<p class="no-surgery">No patients in queue</p>';
    }
    
    // Update Now Serving section
    updateNowServing();
}

// Initial data load
async function loadInitialData() {
    try {
        // Load OT data
        const response = await fetch('/api/ot/data');
        if (!response.ok) throw new Error('Failed to load OT data');
        
        const data = await response.json();
        console.log('Initial OT data loaded:', data);
        
        // Update OT data
        if (data.otData) {
            otData = data.otData;
            for (const otId in otData) {
                updateOTDisplay(otId);
            }
        }
        
        // Update stats
        if (data.stats) {
            stats = data.stats;
            updateStats();
        }
        
        // Update Now Serving section
        updateNowServing();
        
    } catch (error) {
        console.error('Error loading initial data:', error);
        document.getElementById('error-message').textContent = 'Failed to load OT data. Please refresh the page.';
        document.getElementById('error-message').style.display = 'block';
    }
}

// Socket event listeners
socket.on('connect', () => {
    console.log('Connected to server');
    loadInitialData();
});

socket.on('otStatsUpdate', (newStats) => {
    console.log('Received stats update:', newStats);
    stats = newStats;
    updateStats();
});

socket.on('otDataUpdate', (data) => {
    console.log('Received OT data update:', data);
    
    // Debug the data structure
    if (data && data.otId) {
        console.log(`OT ${data.otId} current surgery:`, data.current ? 
            `Patient: ${data.current.name}, Stage: ${data.current.surgeryStage}` : 'None');
        console.log(`OT ${data.otId} queue:`, data.queue ? 
            `${data.queue.length} patients` : 'Empty');
    }
    
    if (data && data.otId && otData[data.otId]) {
        // The data structure from server is { otId: 'OT1', current: {...}, queue: [...] }
        // We need to update our local otData structure accordingly
        otData[data.otId].current = data.current || null;
        otData[data.otId].queue = data.queue || [];
        
        updateOTDisplay(data.otId);
        // Update Now Serving section when OT data changes
        updateNowServing();
    }
});


// Load initial data
loadInitialData();