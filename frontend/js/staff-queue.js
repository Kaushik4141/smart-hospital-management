// Initialize socket connection
const socket = io();

// DOM Elements
const departmentTitle = document.getElementById('departmentTitle');
const waitingCountElement = document.getElementById('waitingCount');
const inProgressCountElement = document.getElementById('inProgressCount');
const currentPatientElement = document.getElementById('currentPatient');
const currentPatientActions = document.getElementById('currentPatientActions');
const queueList = document.getElementById('queueList');
const priorityFilter = document.getElementById('priorityFilter');
const searchPatient = document.getElementById('searchPatient');
const patientModal = document.getElementById('patientModal');
const historyModal = document.getElementById('historyModal');
const patientManagementForm = document.getElementById('patientManagementForm');
const transferType = document.getElementById('transferType');
const transferDepartmentGroup = document.getElementById('transferDepartmentGroup');
const transferWardGroup = document.getElementById('transferWardGroup');
const transferOTGroup = document.getElementById('transferOTGroup');
const transferDepartment = document.getElementById('transferDepartment');

// State management
let selectedDepartment = null;
let departmentData = null;
let currentPatient = null;
let queueData = [];
let departments = [];

// Initialize the page
async function init() {
    try {
        showLoadingState();
        // Get department ID from URL parameters
        const departmentId = getDepartmentId();
        
        if (!departmentId) {
            window.location.href = 'staff-counter.html';
            return;
        }

        // Fetch all departments for transfer dropdown
        await fetchAllDepartments();
        
        // Fetch department details
        const data = await fetchDepartmentDetails(departmentId);
        
        // Set up event listeners
        setupEventListeners();
        setupSocketListeners();
        
        hideLoadingState();
    } catch (error) {
        console.error('Error initializing queue:', error);
        showError('Error loading department details. Please try again.');
    }
}

// Fetch all departments for transfer dropdown
async function fetchAllDepartments() {
    try {
        const response = await fetch('/api/departments');
        if (!response.ok) {
            throw new Error('Failed to fetch departments');
        }
        departments = await response.json();
        populateTransferDepartments();
    } catch (error) {
        console.error('Error fetching departments:', error);
        showError('Error loading departments. Please try again.');
    }
}

// Populate transfer departments dropdown
function populateTransferDepartments() {
    console.log('Populating transfer departments dropdown');
    console.log('Available departments:', departments);
    console.log('Selected department:', selectedDepartment);
    
    if (!departments.length) {
        console.warn('No departments available to populate dropdown');
        return;
    }
    
    if (!selectedDepartment || !selectedDepartment._id) {
        console.warn('No department selected, cannot filter departments');
        // Still populate with all departments if none selected
        transferDepartment.innerHTML = `
            <option value="">Select Department</option>
            ${departments.map(dept => `<option value="${dept._id}">${dept.name}</option>`).join('')}
        `;
        return;
    }
    
    const filteredDepts = departments.filter(dept => dept._id !== selectedDepartment._id);
    console.log('Filtered departments:', filteredDepts);
    
    transferDepartment.innerHTML = `
        <option value="">Select Department</option>
        ${filteredDepts.map(dept => `<option value="${dept._id}">${dept.name}</option>`).join('')}
    `;
    
    console.log('Transfer department dropdown populated with options:', 
        Array.from(transferDepartment.options).map(o => ({ value: o.value, text: o.text })));
}

// Show loading state
function showLoadingState() {
    queueList.innerHTML = '<div class="loading">Loading queue...</div>';
    currentPatientElement.innerHTML = '<div class="loading">Loading...</div>';
}

// Hide loading state
function hideLoadingState() {
    const loadingElements = document.querySelectorAll('.loading');
    loadingElements.forEach(el => el.remove());
}

// Show error message
function showError(message) {
    const errorHtml = `
        <div class="error-message">
            <p>${message}</p>
            <button onclick="retryInitialization()">Retry</button>
        </div>
    `;
    queueList.innerHTML = errorHtml;
    currentPatientElement.innerHTML = errorHtml;
}

// Retry initialization
async function retryInitialization() {
    await init();
}

// Get department ID from URL
function getDepartmentId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Fetch department details
async function fetchDepartmentDetails(departmentId) {
    try {
        console.log('Fetching department details for ID:', departmentId);
        const response = await fetch(`/api/departments/${departmentId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Received department data:', data);

        departmentData = data;
        selectedDepartment = data.department;

        updateDepartmentDisplay();
        renderQueue();

        return data;
    } catch (error) {
        console.error('Error fetching department details:', error);
        throw error;
    }
}

// Set up event listeners
function setupEventListeners() {
    priorityFilter.addEventListener('change', filterQueue);
    searchPatient.addEventListener('input', filterQueue);
    
    transferType.addEventListener('change', () => {
        transferDepartmentGroup.style.display = 'none';
        transferWardGroup.style.display = 'none';
        transferOTGroup.style.display = 'none';

        switch(transferType.value) {
            case 'department':
                transferDepartmentGroup.style.display = 'block';
                populateTransferDepartments();
                break;
            case 'ward':
                transferWardGroup.style.display = 'block';
                break;
            case 'ot':
                transferOTGroup.style.display = 'block';
                break;
        }
    });

    patientManagementForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handlePatientUpdate();
    });
}

// Set up socket event listeners
function setupSocketListeners() {
    socket.on('connect', () => {
        console.log('Connected to server');
    });

    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        showNotification('Lost connection to server. Retrying...', 'error');
    });

    socket.on('patientUpdated', (updatedPatient) => {
        console.log('Staff-queue received patientUpdated:', updatedPatient);
        console.log('Current department:', selectedDepartment._id);
        console.log('Patient department:', updatedPatient.department._id);
        
        if (updatedPatient.department._id === selectedDepartment._id) {
            console.log('Patient belongs to current department, refreshing list');
            fetchDepartmentDetails(selectedDepartment._id);
        } else {
            console.log('Patient transferred to another department');
            // If the patient was in this department before, refresh to remove them
            fetchDepartmentDetails(selectedDepartment._id);
        }
    });
    
    socket.on('patientStatusUpdated', (updatedPatient) => {
        console.log('Staff-queue received patientStatusUpdated:', updatedPatient);
        console.log('Current department:', selectedDepartment._id);
        console.log('Patient department:', updatedPatient.department._id);
        
        if (updatedPatient.department._id === selectedDepartment._id) {
            console.log('Patient status updated in current department, refreshing list');
            fetchDepartmentDetails(selectedDepartment._id);
        }
    });
}

// Update department display
function updateDepartmentDisplay() {
    if (!selectedDepartment) {
        console.error('No department selected');
        return;
    }

    departmentTitle.textContent = selectedDepartment.name;
    waitingCountElement.textContent = departmentData.waitingCount || 0;
    inProgressCountElement.textContent = departmentData.inProgressCount || 0;
    
    if (departmentData.currentPatient) {
        renderCurrentPatient(departmentData.currentPatient);
    } else {
        currentPatient = null;
        currentPatientElement.innerHTML = '<p class="no-patient">No patient currently being served</p>';
        currentPatientActions.innerHTML = '';
    }
}

// Render current patient card
function renderCurrentPatient(patient) {
    currentPatient = patient;
    currentPatientElement.innerHTML = `
        <div class="patient-info">
            <h4>${patient.name}</h4>
            <p>ID: ${patient.patientId}</p>
            <p>Age: ${patient.age}</p>
            <p>Priority: <span class="priority-${patient.priority.toLowerCase()}">${patient.priority}</span></p>
            <p>Status: ${patient.status}</p>
        </div>
    `;

    currentPatientActions.innerHTML = `
        <button class="btn-manage" onclick="openManageModal('${patient._id}')">Manage</button>
        <button class="btn-history" onclick="openHistoryModal('${patient._id}')">History</button>
    `;
}

// Render queue list
function renderQueue() {
    queueData = departmentData.queue || [];
    filterQueue();
}

// Filter and display queue
function filterQueue() {
    const priority = priorityFilter.value;
    const searchTerm = searchPatient.value.toLowerCase();

    const filteredQueue = queueData.filter(patient => {
        const matchesPriority = !priority || patient.priority === priority;
        const matchesSearch = !searchTerm || 
            patient.name.toLowerCase().includes(searchTerm) ||
            patient.patientId.toLowerCase().includes(searchTerm);
        return matchesPriority && matchesSearch;
    });

    if (filteredQueue.length === 0) {
        queueList.innerHTML = '<div class="no-patients">No patients in queue</div>';
        return;
    }

    queueList.innerHTML = filteredQueue.map(patient => `
        <div class="queue-item">
            <div class="patient-info">
                <h4>${patient.name}</h4>
                <p>ID: ${patient.patientId}</p>
                <p>Priority: <span class="priority-${patient.priority.toLowerCase()}">${patient.priority}</span></p>
            </div>
            <div class="queue-actions">
                <button class="btn-manage" onclick="openManageModal('${patient._id}')">Manage</button>
                <button class="btn-history" onclick="openHistoryModal('${patient._id}')">History</button>
            </div>
        </div>
    `).join('');
}

// Open patient management modal
function openManageModal(patientId) {
    const patient = findPatient(patientId);
    if (!patient) return;

    currentPatient = patient;
    document.getElementById('patientStatus').value = patient.status;
    document.getElementById('description').value = '';
    transferType.value = '';
    
    transferDepartmentGroup.style.display = 'none';
    transferWardGroup.style.display = 'none';
    transferOTGroup.style.display = 'none';
    
    patientModal.style.display = 'block';
}

// Open patient history modal
function openHistoryModal(patientId) {
    const patient = findPatient(patientId);
    if (!patient) return;

    const timeline = document.getElementById('patientTimeline');
    timeline.innerHTML = (patient.history || []).map(entry => `
        <div class="timeline-item">
            <div class="timeline-content">
                <div class="timeline-date">${new Date(entry.timestamp).toLocaleString()}</div>
                <div class="timeline-description">${entry.description}</div>
                ${entry.transfer ? `<div class="timeline-transfer">Transferred to: ${entry.transfer}</div>` : ''}
            </div>
        </div>
    `).join('');

    historyModal.style.display = 'block';
}

// Close modals
function closeModal() {
    patientModal.style.display = 'none';
    historyModal.style.display = 'none';
}

function closeHistoryModal() {
    historyModal.style.display = 'none';
}

// Handle patient update
async function handlePatientUpdate() {
    if (!currentPatient) return;

    const status = document.getElementById('patientStatus').value;
    const description = document.getElementById('description').value;
    let transferDetails = null;

    if (transferType.value) {
        transferDetails = {
            type: transferType.value,
            targetId: null
        };

        console.log('Transfer type selected:', transferType.value);
        
        switch(transferType.value) {
            case 'department':
                transferDetails.targetId = transferDepartment.value;
                console.log('Department transfer target ID:', transferDetails.targetId);
                console.log('Selected department element:', transferDepartment);
                console.log('Available options:', Array.from(transferDepartment.options).map(o => ({ value: o.value, text: o.text })));
                break;
            case 'ward':
                transferDetails.targetId = document.getElementById('transferWard').value;
                console.log('Ward transfer target ID:', transferDetails.targetId);
                break;
            case 'ot':
                transferDetails.targetId = document.getElementById('transferOT').value;
                console.log('OT transfer target ID:', transferDetails.targetId);
                break;
        }
    }

    try {
        console.log('Sending update request:', {
            status,
            description,
            transfer: transferDetails
        });

        const response = await fetch(`/api/patients/${currentPatient._id}/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status,
                description,
                transfer: transferDetails
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update patient');
        }
        
        const updatedPatient = await response.json();
        console.log('Update successful, response:', updatedPatient);

        closeModal();
        showNotification('Patient updated successfully', 'success');
        await fetchDepartmentDetails(selectedDepartment._id);
    } catch (error) {
        console.error('Error updating patient:', error);
        showNotification(error.message || 'Failed to update patient', 'error');
    }
}

// Helper function to find patient by ID
function findPatient(patientId) {
    if (currentPatient && currentPatient._id === patientId) return currentPatient;
    return queueData.find(p => p._id === patientId);
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Add some CSS for notifications and loading state
const style = document.createElement('style');
style.textContent = `
    .loading {
        text-align: center;
        padding: 2rem;
        color: #666;
    }
    
    .error-message {
        text-align: center;
        padding: 2rem;
        color: #dc3545;
    }
    
    .error-message button {
        margin-top: 1rem;
        padding: 0.5rem 1rem;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }
    
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem;
        border-radius: 4px;
        color: white;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    }
    
    .notification.info {
        background: #007bff;
    }
    
    .notification.error {
        background: #dc3545;
    }
    
    .notification.success {
        background: #28a745;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .no-patients {
        text-align: center;
        padding: 2rem;
        color: #666;
    }
`;
document.head.appendChild(style);

// Initialize the page when loaded
document.addEventListener('DOMContentLoaded', init);

// Close modal when clicking outside
window.onclick = (event) => {
    if (event.target === patientModal || event.target === historyModal) {
        closeModal();
    }
};