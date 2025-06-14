// Connect to Socket.io server using relative URL
const socket = io();

// DOM Elements
const departmentTitle = document.getElementById('departmentTitle');
const currentToken = document.getElementById('currentToken');
const currentPatientName = document.getElementById('currentPatientName');
const currentPatientInfo = document.getElementById('currentPatientInfo');
const queueList = document.getElementById('queueList');

// Get department ID from URL
const urlParams = new URLSearchParams(window.location.search);
const departmentId = urlParams.get('department');

if (!departmentId) {
    window.location.href = 'counter.html';
}

// State
let departmentName = '';
let queuedPatients = [];

// Fetch department details
async function fetchDepartmentDetails() {
    try {
        const response = await fetch('/api/departments');
        const departments = await response.json();
        const department = departments.find(d => d._id === departmentId);
        
        if (!department) {
            showNotification('Department not found', 'error');
            window.location.href = 'counter.html';
            return;
        }

        departmentName = department.name;
        departmentTitle.textContent = `${department.name} Queue`;
        document.title = `${department.name} Queue - Smart Hospital`;
    } catch (error) {
        console.error('Error fetching department details:', error);
        showNotification('Error loading department details', 'error');
    }
}

// Fetch department queue
async function fetchDepartmentQueue() {
    try {
        const response = await fetch('/api/patients');
        const patients = await response.json();
        
        // Filter patients for this department
        queuedPatients = patients.filter(p => 
            p.department._id === departmentId && 
            p.status !== 'Completed'
        ).sort((a, b) => {
            // Sort by priority first
            const priorityOrder = { 'Emergency': 0, 'Urgent': 1, 'Normal': 2 };
            if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            }
            // Then by creation time
            return new Date(a.createdAt) - new Date(b.createdAt);
        });

        updateDisplay();
    } catch (error) {
        console.error('Error fetching department queue:', error);
        showNotification('Error loading queue', 'error');
    }
}

// Update the display
function updateDisplay() {
    // Update current patient display
    if (queuedPatients.length > 0) {
        const current = queuedPatients[0];
        currentToken.textContent = current.tokenNumber;
        currentPatientName.textContent = current.name;
        currentPatientInfo.textContent = `Priority: ${current.priority}`;
    } else {
        currentToken.textContent = '---';
        currentPatientName.textContent = 'Waiting for patient...';
        currentPatientInfo.textContent = 'Priority: ---';
    }

    // Update queue list
    queueList.innerHTML = queuedPatients
        .slice(1) // Skip the current patient
        .map(patient => `
            <div class="queue-item">
                <div class="queue-item-left">
                    <span class="token">${patient.tokenNumber}</span>
                    <div class="patient-details">
                        <h4>${patient.name}</h4>
                        <p>Contact: ${patient.contactNumber}</p>
                    </div>
                </div>
                <span class="priority-tag priority-${patient.priority.toLowerCase()}">
                    ${patient.priority}
                </span>
            </div>
        `)
        .join('');

    // Play notification sound if it's a new update
    if (queuedPatients.length > 0) {
        const current = queuedPatients[0];
        if (current.tokenNumber !== currentToken.dataset.lastToken) {
            playNotificationSound();
            currentToken.dataset.lastToken = current.tokenNumber;
        }
    }
}

// Play notification sound
function playNotificationSound() {
    const audio = new Audio('/audio/notification.mp3');
    audio.play().catch(error => {
        console.log('Error playing notification sound:', error);
    });
}

// Show notification
function showNotification(message, type = 'info') {
    // You can implement your own notification system here
    alert(message);
}

// Socket event listeners
socket.on('newPatient', (patient) => {
    if (patient.department._id === departmentId) {
        fetchDepartmentQueue();
    }
});

socket.on('patientStatusUpdated', (patient) => {
    if (patient.department._id === departmentId) {
        fetchDepartmentQueue();
    }
});

socket.on('departmentUpdated', (department) => {
    if (department._id === departmentId) {
        fetchDepartmentDetails();
    }
});

// Initialize
fetchDepartmentDetails();
fetchDepartmentQueue();