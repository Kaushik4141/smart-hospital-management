// Connect to Socket.io server using relative URL
const socket = io();

// DOM Elements
const wardGrid = document.getElementById('wardGrid');
const wardModal = document.getElementById('wardModal');
const modalBedInfo = document.getElementById('modalBedInfo');
const patientDetails = document.getElementById('patientDetails');
const bedActions = document.getElementById('bedActions');
const totalBedsElement = document.getElementById('totalBeds');
const occupiedBedsElement = document.getElementById('occupiedBeds');
const availableBedsElement = document.getElementById('availableBeds');

// Store ward data
let wards = [];
let beds = [];

// Fetch initial data
async function fetchWards() {
    try {
        const response = await fetch('/api/wards');
        const data = await response.json();
        wards = await response.json();
        updateWardGrid();
    } catch (error) {
        console.error('Error fetching wards:', error);
    }
}

async function fetchBeds() {
    try {
        const response = await fetch('/api/beds');
        const data = await response.json();
        beds = await response.json();
        updateBedStats();
        updateWardGrid();
    } catch (error) {
        console.error('Error fetching beds:', error);
    }
}

// Update ward grid
function updateWardGrid() {
    wardGrid.innerHTML = wards
        .map(ward => {
            const wardBeds = beds.filter(bed => bed.ward === ward._id);
            return `
                <div class="ward-section">
                    <h3>${ward.name}</h3>
                    <div class="bed-grid">
                        ${wardBeds.map(bed => createBedCard(bed)).join('')}
                    </div>
                </div>
            `;
        })
        .join('');
}

// Create bed card HTML
function createBedCard(bed) {
    const statusClass = bed.isOccupied ? 'occupied' : 'available';
    const statusText = bed.isOccupied ? 'Occupied' : 'Available';
    
    return `
        <div class="bed-card ${statusClass}" onclick="showBedDetails('${bed._id}')">
            <h4>Bed ${bed.number}</h4>
            <div class="bed-info">
                ${bed.isOccupied ? `<p>Patient: ${bed.patient.name}</p>` : ''}
                <span class="bed-status status-${statusClass.toLowerCase()}">${statusText}</span>
            </div>
        </div>
    `;
}

// Update bed statistics
function updateBedStats() {
    const totalBeds = beds.length;
    const occupiedBeds = beds.filter(bed => bed.isOccupied).length;
    const availableBeds = totalBeds - occupiedBeds;

    totalBedsElement.textContent = totalBeds;
    occupiedBedsElement.textContent = occupiedBeds;
    availableBedsElement.textContent = availableBeds;
}

// Show bed details modal
async function showBedDetails(bedId) {
    const bed = beds.find(b => b._id === bedId);
    if (!bed) return;

    modalBedInfo.textContent = `Bed ${bed.number} Details`;
    wardModal.classList.add('active');

    if (bed.isOccupied && bed.patient) {
        patientDetails.innerHTML = `
            <h3>Patient Information</h3>
            <div class="patient-info-grid">
                <div class="info-item">
                    <label>Name</label>
                    <span>${bed.patient.name}</span>
                </div>
                <div class="info-item">
                    <label>Age</label>
                    <span>${bed.patient.age}</span>
                </div>
                <div class="info-item">
                    <label>Gender</label>
                    <span>${bed.patient.gender}</span>
                </div>
                <div class="info-item">
                    <label>Admission Date</label>
                    <span>${new Date(bed.patient.admissionDate).toLocaleDateString()}</span>
                </div>
                <div class="info-item">
                    <label>Department</label>
                    <span>${bed.patient.department.name}</span>
                </div>
                <div class="info-item">
                    <label>Doctor</label>
                    <span>${bed.patient.doctor}</span>
                </div>
            </div>
        `;

        bedActions.innerHTML = `
            <button class="action-btn btn-secondary" onclick="dischargeBed('${bedId}')">
                Discharge Patient
            </button>
        `;
    } else {
        patientDetails.innerHTML = '<h3>Bed is currently available</h3>';
        bedActions.innerHTML = `
            <button class="action-btn btn-primary" onclick="admitPatient('${bedId}')">
                Admit Patient
            </button>
        `;
    }
}

// Close modal
function closeModal() {
    wardModal.classList.remove('active');
}

// Admit patient
async function admitPatient(bedId, patientId) {
    try {
        const response = await fetch(`/api/beds/${bedId}/admit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ patientId })
        });
        
        if (response.ok) {
            closeModal();
            await fetchBeds();
        }
    } catch (error) {
        console.error('Error admitting patient:', error);
    }
}

// Discharge patient
async function dischargeBed(bedId) {
    try {
        const response = await fetch(`/api/beds/${bedId}/discharge`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            closeModal();
            await fetchBeds();
        }
    } catch (error) {
        console.error('Error discharging patient:', error);
    }
}

// Socket.io event listeners
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});

socket.on('bedUpdated', (updatedBed) => {
    const index = beds.findIndex(b => b._id === updatedBed._id);
    if (index !== -1) {
        beds[index] = updatedBed;
        updateBedStats();
        updateWardGrid();
    }
});

socket.on('wardUpdated', (updatedWard) => {
    const index = wards.findIndex(w => w._id === updatedWard._id);
    if (index !== -1) {
        wards[index] = updatedWard;
        updateWardGrid();
    }
});

// Listen for patient updates to detect transfers
socket.on('patientUpdated', (patient) => {
    console.log('Patient updated:', patient);
    
    // Check if this patient has a pending or completed transfer to ward
    if (patient.transfer && 
        patient.transfer.type === 'ward') {
        
        console.log('Patient transfer detected:', patient.transfer.status);
        
        // Refresh beds data to show the updated status
        fetchBeds();
    }
});

// Initialize
fetchWards();
fetchBeds();