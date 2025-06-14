// DOM Elements
const totalScheduledEl = document.getElementById('totalScheduled');
const inProgressEl = document.getElementById('inProgress');
const completedTodayEl = document.getElementById('completedToday');
const modal = document.getElementById('surgery-modal');
const closeModal = document.querySelector('.close');
const stageButtons = document.querySelectorAll('.stage-btn');
const stageNotes = document.getElementById('stage-notes');
const saveStageBtn = document.getElementById('save-stage');
const completeSurgeryBtn = document.getElementById('complete-surgery');
const transferBtn = document.getElementById('transfer-patient');
const wardSelect = document.getElementById('ward-select');
const nowServingEl = document.getElementById('now-serving');
// We'll initialize these in DOMContentLoaded to ensure they're available
let transferToWardBtn = null;
let transferControls = null;

// State
let currentPatient = null;
let otData = {
    OT1: { current: null, preOperative: null, queue: [] }
};


// Create surgery item HTML
function createSurgeryItemHTML(patient) {
    const stageClass = patient.surgeryStage ? 
        `stage-${patient.surgeryStage.toLowerCase()}` : '';
    const stageText = patient.surgeryStage || 'Not Started';
    
    return `
        <div class="surgery-details" data-patient-id="${patient._id}">
            <div class="patient-info">
                <span class="patient-name">${patient.name}</span>
                <span class="patient-id">${patient.tokenNumber}</span>
                <span class="stage-indicator ${stageClass}">${stageText}</span>
            </div>
            <div class="surgery-info">
                <span class="surgery-type">${patient.surgeryType || 'Not specified'}</span>
                <span class="priority ${patient.priority.toLowerCase()}">${patient.priority}</span>
                <span class="status ${patient.otStatus.toLowerCase()}">${patient.otStatus}</span>
            </div>
            <div class="surgery-time">
                ${patient.scheduledTime ? new Date(patient.scheduledTime).toLocaleTimeString() : 'Not scheduled'}
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
        const currentStage = servingPatient.surgeryStage;
        
        // Create HTML for all stages, marking the current one
        const stagesHTML = ['Pre-operative', 'Anaesthetic', 'Surgical', 'Recovery']
            .map(stage => {
                const isCurrentStage = stage === currentStage;
                const currentClass = isCurrentStage ? 'current' : '';
                return `<span class="surgery-stage stage-${stage.toLowerCase()} ${currentClass}">${stage}</span>`;
            })
            .join('');
        
        nowServingEl.innerHTML = `
            <div class="patient-card">
                <span class="patient-name">${servingPatient.name}</span>
                <span class="patient-id">ID: ${servingPatient.tokenNumber || 'No ID'}</span>
                <div class="surgery-stages">
                    ${stagesHTML}
                </div>
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
    const ot = otData[otId];
    const currentEl = document.getElementById(`${otId.toLowerCase()}-current`);
    const queueEl = document.getElementById(`${otId.toLowerCase()}-queue`);
    const preOpEl = document.getElementById(`${otId.toLowerCase()}-preop`) || createPreOpSection(otId);

    // Don't display current patient if status is completed
    if (ot.current && ot.current.status !== 'completed') {
        currentEl.innerHTML = createSurgeryItemHTML(ot.current);
        currentEl.querySelector('.surgery-details').addEventListener('click', () => openModal(ot.current));
    } else {
        currentEl.innerHTML = '<p class="no-surgery">No current surgery</p>';
    }

    // Don't display pre-operative patient if status is completed
    if (ot.preOperative && ot.preOperative.status !== 'completed') {
        preOpEl.innerHTML = createSurgeryItemHTML(ot.preOperative);
        preOpEl.querySelector('.surgery-details').addEventListener('click', () => openModal(ot.preOperative));
    } else {
        preOpEl.innerHTML = '<p class="no-surgery"></p>';
    }

    // Filter out patients with status completed from queue
    if (ot.queue && ot.queue.length > 0) {
        const filteredQueue = ot.queue.filter(patient => patient.status !== 'completed');
        
        if (filteredQueue.length > 0) {
            queueEl.innerHTML = filteredQueue
                .map(patient => {
                    const html = createSurgeryItemHTML(patient);
                    return `<div class="queue-item">${html}</div>`;
                })
                .join('');
            
            queueEl.querySelectorAll('.surgery-details').forEach(el => {
                const patientId = el.dataset.patientId;
                const patient = filteredQueue.find(p => p._id === patientId);
                if (patient) {
                    el.addEventListener('click', () => openModal(patient));
                }
            });
        } else {
            queueEl.innerHTML = '<p class="no-surgery">No patients in queue</p>';
        }
    } else {
        queueEl.innerHTML = '<p class="no-surgery">No patients in queue</p>';
    }
    
    // Update Now Serving section after updating OT display
    updateNowServing();
}

// Create pre-operative section if it doesn't exist
function createPreOpSection(otId) {
    const otSection = document.getElementById(`${otId.toLowerCase()}-section`);
    const queueSection = document.getElementById(`${otId.toLowerCase()}-queue-section`);
    
    const preOpSection = document.createElement('div');
    preOpSection.className = 'ot-section';
    preOpSection.innerHTML = `
        <h3>Pre-Operative Patient</h3>
        <div id="${otId.toLowerCase()}-preop" class="ot-preop"></div>
    `;
    
    otSection.insertBefore(preOpSection, queueSection);
    return document.getElementById(`${otId.toLowerCase()}-preop`);
}

// Update stats display
function updateStats() {
    totalScheduledEl.textContent = stats.totalScheduled;
    inProgressEl.textContent = stats.inProgress;
    completedTodayEl.textContent = stats.completedToday;
}

// Modal functions
function openModal(patient) {
    currentPatient = patient;
    
    // Set patient info
    document.getElementById('modal-patient-name').textContent = `Patient: ${patient.name}`;
    document.getElementById('modal-patient-id').textContent = `ID: ${patient.tokenNumber}`;
    
    // Set active stage button
    stageButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.stage === patient.surgeryStage) {
            btn.classList.add('active');
        }
    });
    
    // Set notes if available
    stageNotes.value = patient.stageNotes || '';
    
    // Always hide transfer controls when modal is opened
    const transferControlsEl = document.querySelector('.transfer-controls');
    if (transferControlsEl) {
        transferControlsEl.style.display = 'none';
        console.log('Transfer controls hidden when modal opened');
    }
    
    // Show the modal
    modal.style.display = 'block';
    
    // After modal is displayed, reinitialize the transfer button click handler
    setTimeout(() => {
        const transferBtn = document.getElementById('transfer-to-ward');
        if (transferBtn) {
            console.log('Reinitializing transfer button after modal open');
            
            // Add a direct click handler
            transferBtn.onclick = function(e) {
                console.log('Transfer button clicked after modal open');
                e.preventDefault();
                e.stopPropagation();
                
                // Get the transfer controls element directly
                const transferControls = document.querySelector('.transfer-controls');
                if (transferControls) {
                    transferControls.style.display = 'block';
                    transferControls.setAttribute('style', 'display: block !important; visibility: visible !important; opacity: 1 !important;');
                    console.log('Transfer controls shown with direct style');
                } else {
                    console.error('Transfer controls not found after modal open');
                }
                
                return false;
            };
        }
    }, 100); // Short delay to ensure modal is fully displayed
}

// Initialize elements and set up event handlers when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');
    
    // Re-initialize elements to ensure they're available
    transferToWardBtn = document.getElementById('transfer-to-ward');
    transferControls = document.querySelector('.transfer-controls');
    
    // Debug element selection
    console.log('Transfer to ward button found (after DOM load):', transferToWardBtn !== null);
    console.log('Transfer controls found (after DOM load):', transferControls !== null);
    
    // Direct function to show transfer controls - define globally
    window.showTransferControls = function() {
        console.log('showTransferControls function called');
        // Get the transfer controls element directly each time to ensure we have the latest reference
        const transferControlsEl = document.querySelector('.transfer-controls');
        console.log('Transfer controls element found directly:', transferControlsEl !== null);
        
        if (transferControlsEl) {
            transferControlsEl.style.display = 'block';
            console.log('Transfer controls display set to:', transferControlsEl.style.display);
            
            // Force visibility with important flag
            transferControlsEl.setAttribute('style', 'display: block !important; visibility: visible !important; opacity: 1 !important;');
            console.log('Applied forced style attributes to transfer controls');
            return false; // Prevent default
        } else {
            console.error('Transfer controls element not found when trying to show it');
        }
    };
    
    // Try to find the button by multiple selectors
    const transferBtn = document.querySelector('.transfer-btn[data-action="show-transfer"]');
    const transferBtnById = document.getElementById('transfer-to-ward');
    
    console.log('Transfer button found by class/data:', transferBtn !== null);
    console.log('Transfer button found by ID:', transferBtnById !== null);
    
    // Add event listener using class/data selector
    if (transferBtn) {
        transferBtn.addEventListener('click', function(event) {
            console.log('Transfer button clicked via class/data selector');
            event.preventDefault();
            event.stopPropagation();
            window.showTransferControls();
        });
    }
    
    // Add event listener using ID selector
    if (transferBtnById) {
        transferBtnById.addEventListener('click', function(event) {
            console.log('Transfer button clicked via ID selector');
            event.preventDefault();
            event.stopPropagation();
            window.showTransferControls();
        });
        
        // Also try direct onclick assignment
        transferBtnById.onclick = function(event) {
            console.log('Transfer button onclick triggered');
            event.preventDefault();
            event.stopPropagation();
            window.showTransferControls();
            return false;
        };
    }
    
    // Add a click handler to the document to check if clicks are being captured
    document.addEventListener('click', function(event) {
        console.log('Document click detected on element:', event.target.tagName, event.target.id, event.target.className);
    });
});


function closeModalHandler() {
    modal.style.display = 'none';
    currentPatient = null;
    
    // Reset transfer controls
    transferControls.style.display = 'none';
    wardSelect.value = '';
}

// Event Listeners
closeModal.addEventListener('click', closeModalHandler);
window.addEventListener('click', (e) => {
    if (e.target === modal) closeModalHandler();
});

stageButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        stageButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

saveStageBtn.addEventListener('click', async () => {
    if (!currentPatient) return;

    const activeStageBtn = document.querySelector('.stage-btn.active');
    if (!activeStageBtn) return;

    const stage = activeStageBtn.dataset.stage;
    const notes = stageNotes.value.trim();

    try {
        const response = await fetch(`/api/ot/patient/${currentPatient._id}/stage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ stage, notes })
        });

        if (!response.ok) throw new Error('Failed to update surgery stage');

        // Modal will be updated via socket event
    } catch (error) {
        console.error('Error updating surgery stage:', error);
        document.getElementById('error-message').textContent = error.message;
    }
});

completeSurgeryBtn.addEventListener('click', async () => {
    if (!currentPatient) return;

    try {
        const response = await fetch(`/api/ot/patient/${currentPatient._id}/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to complete surgery');

        closeModalHandler();
        // UI will be updated via socket event
    } catch (error) {
        console.error('Error completing surgery:', error);
        document.getElementById('error-message').textContent = error.message;
    }
});

transferBtn.addEventListener('click', async () => {
    console.log('Transfer button clicked');
    console.log('Current patient:', currentPatient);
    console.log('Selected ward:', wardSelect.value);
    
    if (!currentPatient) {
        console.error('No patient selected for transfer');
        document.getElementById('error-message').textContent = 'No patient selected for transfer';
        document.getElementById('error-message').style.color = 'red';
        setTimeout(() => {
            document.getElementById('error-message').textContent = '';
        }, 5000);
        return;
    }
    
    if (!wardSelect.value) {
        console.error('No ward selected for transfer');
        document.getElementById('error-message').textContent = 'Please select a ward for transfer';
        document.getElementById('error-message').style.color = 'red';
        setTimeout(() => {
            document.getElementById('error-message').textContent = '';
        }, 5000);
        return;
    }

    try {
        console.log('Sending transfer request to:', `/api/ot/patient/${currentPatient._id}/transfer`);
        const response = await fetch(`/api/ot/patient/${currentPatient._id}/transfer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ wardId })
        });

        console.log('Transfer response status:', response.status);
        if (!response.ok) throw new Error('Failed to transfer patient');

        // Show success message
        document.getElementById('error-message').textContent = `Patient successfully transferred to ${wardSelect.value} ward`;
        document.getElementById('error-message').style.color = 'green';
        setTimeout(() => {
            document.getElementById('error-message').textContent = '';
        }, 5000);

        // Immediately update the UI to remove the patient from OT display
        if (currentPatient.currentOT) {
            // Remove patient from current OT data
            const otId = currentPatient.currentOT;
            if (otData[otId]) {
                // If patient is the current surgery
                if (otData[otId].current && otData[otId].current._id === currentPatient._id) {
                    otData[otId].current = null;
                }
                // If patient is pre-operative
                if (otData[otId].preOperative && otData[otId].preOperative._id === currentPatient._id) {
                    otData[otId].preOperative = null;
                }
                // If patient is in queue
                if (otData[otId].queue) {
                    otData[otId].queue = otData[otId].queue.filter(p => p._id !== currentPatient._id);
                }
                // Update the display
                updateOTDisplay(otId);
            }
        }

        closeModalHandler();
        // Full UI update will come via socket event
    } catch (error) {
        console.error('Error transferring patient:', error);
        document.getElementById('error-message').textContent = error.message;
        document.getElementById('error-message').style.color = 'red';
        setTimeout(() => {
            document.getElementById('error-message').textContent = '';
        }, 5000);
    }
});

// Initialize Socket.io
let socket;
document.addEventListener('DOMContentLoaded', () => {
    // Connect to Socket.io server using relative URL
    socket = io();
    
    // Socket.io event listeners
    socket.on('connect', () => {
        console.log('Connected to server');
        loadInitialData();
    });
    
    socket.on('otStatsUpdate', (newStats) => {
        stats = newStats;
        updateStats();
    });
    
    socket.on('otDataUpdate', (data) => {
        const { otId, otData: newOtData } = data;
        otData[otId] = newOtData;
        updateOTDisplay(otId);
        updateNowServing();
    });
    
    socket.on('otAllDataUpdate', (newOtData) => {
        otData = newOtData;
        for (const otId in otData) {
            updateOTDisplay(otId);
        }
        updateNowServing();
    });
});

socket.on('otDataUpdate', (data) => {
    const { otId, current, preOperative, queue } = data;
    otData[otId] = { current, preOperative, queue };
    updateOTDisplay(otId);
    // Update Now Serving section when OT data changes
    updateNowServing();
});

socket.on('otAllDataUpdate', (allData) => {
    otData = allData;
    for (const otId in otData) {
        updateOTDisplay(otId);
    }
    // Update Now Serving section when all OT data changes
    updateNowServing();
});

// Initial data load
async function loadInitialData() {
    try {
        const response = await fetch('/api/ot/data');
        if (!response.ok) {
            throw new Error('Failed to fetch OT data');
        }
        const data = await response.json();
        
        if (data.stats) {
            stats = data.stats;
            updateStats();
        }
        
        if (data.otData) {
            otData = data.otData;
            for (const otId in otData) {
                updateOTDisplay(otId);
            }
            // Update Now Serving section after initial data load
            updateNowServing();
        }
    } catch (error) {
        console.error('Error loading initial OT data:', error);
        document.getElementById('error-message').textContent = error.message;
    }
}

// Load initial data
loadInitialData();