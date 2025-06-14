// Connect to Socket.io server
const socket = io();

// DOM Elements
const departmentGrid = document.querySelector('.department-grid');
const departmentModal = document.getElementById('departmentModal');
const modalDepartmentName = document.getElementById('modalDepartmentName');
const waitingCount = document.getElementById('waitingCount');
const inProgressCount = document.getElementById('inProgressCount');
const completedCount = document.getElementById('completedCount');
const patientList = document.getElementById('patientList');

// Store departments and patients data
let departments = [];
let departmentPatients = {};

// Fetch initial data
async function fetchDepartments() {
    try {
        const response = await fetch('/api/departments');
        departments = await response.json();
        updateDepartmentGrid();
    } catch (error) {
        console.error('Error fetching departments:', error);
    }
}

async function fetchDepartmentPatients(departmentId) {
    try {
        const response = await fetch(`/api/patients?departmentId=${departmentId}`);
        const patients = await response.json();
        departmentPatients[departmentId] = patients;
        return patients;
    } catch (error) {
        console.error('Error fetching department patients:', error);
        return [];
    }
}

// Update department grid
function updateDepartmentGrid() {
    departmentGrid.innerHTML = departments
        .filter(dept => dept.isActive)
        .map(dept => {
            const patients = departmentPatients[dept._id] || [];
            const waiting = patients.filter(p => p.status === 'Waiting').length;
            const inProgress = patients.filter(p => p.status === 'In Progress').length;
            const completed = patients.filter(p => p.status === 'Completed').length;

            return `
                <div class="department-card" onclick="showDepartmentDetails('${dept._id}')">
                    <h2>${dept.name}</h2>
                    <p>${dept.description}</p>
                    <div class="department-stats">
                        <div class="stat-item">
                            <h4>Waiting</h4>
                            <span>${waiting}</span>
                        </div>
                        <div class="stat-item">
                            <h4>In Progress</h4>
                            <span>${inProgress}</span>
                        </div>
                        <div class="stat-item">
                            <h4>Completed</h4>
                            <span>${completed}</span>
                        </div>
                    </div>
                </div>
            `;
        })
        .join('');
}

// Show department details modal
async function showDepartmentDetails(departmentId) {
    const department = departments.find(d => d._id === departmentId);
    if (!department) return;

    modalDepartmentName.textContent = department.name;
    departmentModal.classList.add('active');

    const patients = await fetchDepartmentPatients(departmentId);
    updateDepartmentStats(patients);
    updatePatientList(patients);
}

// Close modal
function closeModal() {
    departmentModal.classList.remove('active');
}

// Update department statistics
function updateDepartmentStats(patients) {
    waitingCount.textContent = patients.filter(p => p.status === 'Waiting').length;
    inProgressCount.textContent = patients.filter(p => p.status === 'In Progress').length;
    completedCount.textContent = patients.filter(p => p.status === 'Completed').length;
}

// Update patient list
function updatePatientList(patients) {
    patientList.innerHTML = patients
        .sort((a, b) => {
            const order = { 'Waiting': 0, 'In Progress': 1, 'Completed': 2 };
            return order[a.status] - order[b.status] || new Date(a.createdAt) - new Date(b.createdAt);
        })
        .map(patient => `
            <div class="patient-item">
                <div class="patient-info">
                    <h4>${patient.name}</h4>
                    <p>Token: ${patient.tokenNumber}</p>
                </div>
                <span class="patient-status status-${patient.status.toLowerCase().replace(' ', '-')}">
                    ${patient.status}
                </span>
            </div>
        `)
        .join('');
}

// Socket.io event listeners
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});

socket.on('newPatient', (patient) => {
    if (!departmentPatients[patient.department._id]) {
        departmentPatients[patient.department._id] = [];
    }
    departmentPatients[patient.department._id].push(patient);
    updateDepartmentGrid();
    
    // Update modal if open and showing the same department
    if (departmentModal.classList.contains('active') && 
        modalDepartmentName.textContent === patient.department.name) {
        updateDepartmentStats(departmentPatients[patient.department._id]);
        updatePatientList(departmentPatients[patient.department._id]);
    }
});

socket.on('patientUpdated', (patient) => {
    if (departmentPatients[patient.department._id]) {
        const index = departmentPatients[patient.department._id]
            .findIndex(p => p._id === patient._id);
        if (index !== -1) {
            departmentPatients[patient.department._id][index] = patient;
            updateDepartmentGrid();
            
            // Update modal if open and showing the same department
            if (departmentModal.classList.contains('active') && 
                modalDepartmentName.textContent === patient.department.name) {
                updateDepartmentStats(departmentPatients[patient.department._id]);
                updatePatientList(departmentPatients[patient.department._id]);
            }
        }
    }
});

// Initialize
fetchDepartments();