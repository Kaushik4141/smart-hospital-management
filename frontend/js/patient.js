// Connect to Socket.io server
const socket = io('http://localhost:5002');

// DOM Elements
const patientRegistrationForm = document.getElementById('patientRegistrationForm');
const patientDepartmentSelect = document.getElementById('patientDepartment');
const patientList = document.getElementById('patientList');
const patientSearch = document.getElementById('patientSearch');
const statusFilter = document.getElementById('statusFilter');
const patientDetailsModal = document.getElementById('patientDetailsModal');
const totalPatientsSpan = document.getElementById('totalPatients');
const waitingPatientsSpan = document.getElementById('waitingPatients');
const inProgressPatientsSpan = document.getElementById('inProgressPatients');

let currentPatients = [];
let selectedPatientId = null;
let departments = []; // Added departments array

// Fetch departments on page load
async function fetchDepartments() {
    try {
        const response = await fetch('/api/departments');
        const data = await response.json();
        departments = await response.json(); // Store departments in the global variable
        
        patientDepartmentSelect.innerHTML = '<option value="">Select Department</option>';
        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept._id;
            option.textContent = dept.name;
            patientDepartmentSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching departments:', error);
        showNotification('Error loading departments', 'error');
    }
}

// Fetch patients on page load
async function fetchPatients() {
    try {
        const response = await fetch('/api/patients');
        const data = await response.json();
        currentPatients = await response.json();
        updatePatientList();
        updateStats();
    } catch (error) {
        console.error('Error fetching patients:', error);
        showNotification('Error loading patients', 'error');
    }
}

// Update patient statistics
function updateStats() {
    const total = currentPatients.length;
    const waiting = currentPatients.filter(p => p.status === 'Waiting').length;
    const inProgress = currentPatients.filter(p => p.status === 'In Progress').length;

    totalPatientsSpan.textContent = total;
    waitingPatientsSpan.textContent = waiting;
    inProgressPatientsSpan.textContent = inProgress;
}

// Handle patient registration
patientRegistrationForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        name: document.getElementById('patientName').value,
        age: parseInt(document.getElementById('patientAge').value),
        gender: document.getElementById('patientGender').value,
        departmentId: document.getElementById('patientDepartment').value,
        priority: document.getElementById('patientPriority').value,
        contactNumber: document.getElementById('patientContact').value
    };

    try {
                 const response = await fetch('/api/patients', {
             method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error('Failed to register patient');
        }

        const newPatient = await response.json();
        showNotification('Patient registered successfully', 'success');
        patientRegistrationForm.reset();
        
        // Update will come through socket
    } catch (error) {
        console.error('Error registering patient:', error);
        showNotification('Error registering patient', 'error');
    }
});

// Update patient list based on search and filter
function updatePatientList() {
    const searchTerm = patientSearch.value.toLowerCase();
    const statusValue = statusFilter.value;

    console.log('Updating patient list with', currentPatients.length, 'patients');
    
    const filteredPatients = currentPatients.filter(patient => {
        const matchesSearch = patient.name.toLowerCase().includes(searchTerm) ||
                            patient.tokenNumber.toLowerCase().includes(searchTerm);
        const matchesStatus = !statusValue || patient.status === statusValue;
        return matchesSearch && matchesStatus;
    });
    
    console.log('Filtered to', filteredPatients.length, 'patients');
    
    patientList.innerHTML = '';
    
    if (filteredPatients.length === 0) {
        patientList.innerHTML = '<div class="no-patients">No patients found</div>';
        return;
    }

    filteredPatients.forEach(patient => {
        // Ensure patient has department information
        if (!patient.department || !patient.department._id) {
            console.warn('Patient missing department information:', patient);
            return;
        }
        
        const card = createPatientCard(patient);
        patientList.appendChild(card);
    });
}

// Create patient card element
function createPatientCard(patient) {
    const card = document.createElement('div');
    card.className = 'patient-card';
    card.onclick = () => showPatientDetails(patient);

    const statusClass = `status-${patient.status.toLowerCase().replace(' ', '-')}`;
    
    card.innerHTML = `
        <h4>${patient.name}</h4>
        <div class="patient-info">
            <p>Token: ${patient.tokenNumber}</p>
            <p>Department: ${patient.department.name}</p>
            <p>Priority: ${patient.priority}</p>
        </div>
        <span class="patient-status ${statusClass}">${patient.status}</span>
    `;

    return card;
}

// Show patient details modal
function showPatientDetails(patient) {
    selectedPatientId = patient._id;
    document.getElementById('modalPatientName').textContent = patient.name;
    
    const details = document.getElementById('patientDetails');
    details.innerHTML = `
        <p><strong>Token Number:</strong> ${patient.tokenNumber}</p>
        <p><strong>Age:</strong> ${patient.age}</p>
        <p><strong>Gender:</strong> ${patient.gender}</p>
        <p><strong>Department:</strong> ${patient.department.name}</p>
        <p><strong>Priority:</strong> ${patient.priority}</p>
        <p><strong>Contact:</strong> ${patient.contactNumber}</p>
        <p><strong>Status:</strong> ${patient.status}</p>
        <p><strong>Registered:</strong> ${new Date(patient.createdAt).toLocaleString()}</p>
    `;

    patientDetailsModal.classList.add('active');
}

// Close patient details modal
function closeModal() {
    patientDetailsModal.classList.remove('active');
    selectedPatientId = null;
}

// Update patient status
async function updateStatus(newStatus) {
    if (!selectedPatientId) return;

    try {
                 const response = await fetch(`/api/patients/${selectedPatientId}/status`, {
             method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) {
            throw new Error('Failed to update patient status');
        }

        const updatedPatient = await response.json();
        showNotification('Patient status updated successfully', 'success');
        closeModal();
        
        // Update will come through socket
    } catch (error) {
        console.error('Error updating patient status:', error);
        showNotification('Error updating patient status', 'error');
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // You can implement your own notification system here
    alert(message);
}

// Search and filter event listeners
patientSearch.addEventListener('input', updatePatientList);
statusFilter.addEventListener('change', updatePatientList);

// Socket event listeners
socket.on('newPatient', (patient) => {
    currentPatients.unshift(patient);
    updatePatientList();
    updateStats();
});

socket.on('patientUpdated', (updatedPatient) => {
    console.log('Received patientUpdated event:', updatedPatient);
    
    const index = currentPatients.findIndex(p => p._id === updatedPatient._id);
    if (index !== -1) {
        // Log the department change if it happened
        if (currentPatients[index].department._id !== updatedPatient.department._id) {
            console.log('Department changed from', 
                currentPatients[index].department.name, 
                'to', updatedPatient.department.name);
        }
        
        currentPatients[index] = updatedPatient;
        console.log('Updated patient in currentPatients array');
        updatePatientList();
        updateStats();
    } else {
        console.warn('Patient not found in currentPatients array:', updatedPatient._id);
    }
});

socket.on('patientStatusUpdated', (updatedPatient) => {
    const index = currentPatients.findIndex(p => p._id === updatedPatient._id);
    if (index !== -1) {
        currentPatients[index] = updatedPatient;
        updatePatientList();
        updateStats();
    }
});

// Close modal when clicking outside
patientDetailsModal.addEventListener('click', (e) => {
    if (e.target === patientDetailsModal) {
        closeModal();
    }
});

// Initialize
fetchDepartments();
fetchPatients(); 

// DOM Elements for transfer functionality
const transferType = document.getElementById('transferType');
const transferDepartmentGroup = document.getElementById('transferDepartmentGroup');
const transferDepartment = document.getElementById('transferDepartment');
const transferDescription = document.getElementById('transferDescription');

// Event listener for transfer type change
transferType.addEventListener('change', () => {
    transferDepartmentGroup.style.display = 'none';
    
    if (transferType.value === 'department') {
        transferDepartmentGroup.style.display = 'block';
        populateTransferDepartments();
    }
});

// Populate transfer departments dropdown
function populateTransferDepartments() {
    // Get the current patient's department ID
    const currentPatient = currentPatients.find(p => p._id === selectedPatientId);
    if (!currentPatient) return;
    
    const currentDepartmentId = currentPatient.department._id;
    
    transferDepartment.innerHTML = '<option value="">Select Department</option>';
    
    // Filter out the current department
    const filteredDepartments = departments.filter(dept => dept._id !== currentDepartmentId);
    
    // Add departments to dropdown
    filteredDepartments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept._id;
        option.textContent = dept.name;
        transferDepartment.appendChild(option);
    });
}

// Handle patient transfer
async function transferPatient() {
    if (!selectedPatientId) return;
    
    // Validate transfer selection
    if (transferType.value === 'department' && !transferDepartment.value) {
        showNotification('Please select a department', 'error');
        return;
    }
    
    // Get current patient info for logging
    const currentPatient = currentPatients.find(p => p._id === selectedPatientId);
    const currentDeptId = currentPatient?.department?._id;
    const targetDeptId = transferDepartment.value;
    
    console.log('Current department:', currentDeptId);
    console.log('Target department:', targetDeptId);
    
    // Create transfer details
    const transferDetails = {
        type: transferType.value,
        targetId: targetDeptId
    };
    
    console.log('Transfer details:', transferDetails);
    
    try {
        console.log('Sending transfer request for patient:', selectedPatientId);
        
        const response = await fetch(`http://localhost:5002/api/patients/${selectedPatientId}/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'Waiting', // Reset status for the new department
                description: transferDescription.value,
                transfer: transferDetails
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to transfer patient');
        }
        
        const updatedPatient = await response.json();
        console.log('Transfer successful, updated patient:', updatedPatient);
        
        // Verify department changed
        if (updatedPatient.department._id === targetDeptId) {
            console.log('Department successfully changed to:', updatedPatient.department.name);
        } else {
            console.warn('Department may not have changed. Expected:', targetDeptId, 'Got:', updatedPatient.department._id);
        }
        
        showNotification('Patient transferred successfully', 'success');
        closeModal();
        
        // Update will come through socket
    } catch (error) {
        console.error('Error transferring patient:', error);
        showNotification('Error transferring patient: ' + error.message, 'error');
    }
}

async function updatePatient(patientId, updatedData) {
    try {
        const response = await fetch(`/api/patients/${patientId}/update`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedData)
        });

        if (!response.ok) {
            throw new Error('Failed to update patient');
        }

        const updatedPatient = await response.json();
        showNotification('Patient updated successfully', 'success');
        
        // Update will come through socket
    } catch (error) {
        console.error('Error updating patient:', error);
        showNotification('Error updating patient', 'error');
    }
}