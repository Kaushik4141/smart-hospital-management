// Connect to Socket.io server
const socket = io('http://localhost:5002');

// DOM Elements
const inventoryGrid = document.getElementById('inventoryGrid');
const prescriptionList = document.getElementById('prescriptionList');
const medicineSearch = document.getElementById('medicineSearch');
const addMedicineModal = document.getElementById('addMedicineModal');
const medicineDetailsModal = document.getElementById('medicineDetailsModal');
const totalMedicinesElement = document.getElementById('total-drugs');
const lowStockElement = document.getElementById('low-stock');
const pendingOrdersElement = document.getElementById('pendingOrders');

// Store data
let medicines = [];
let prescriptions = [];
const LOW_STOCK_THRESHOLD = 10;

// Fetch initial data
async function loadMedicines() {
    try {
        const response = await fetch('/api/pharmacy');
        medicines = await response.json();
        updateInventoryGrid();
        updateStats();
    } catch (error) {
        console.error('Error loading medicines:', error);
    }
}

async function loadPrescriptions() {
    try {
        const response = await fetch('/api/prescriptions?status=pending');
        prescriptions = await response.json();
        updatePrescriptionList();
        updateStats();
    } catch (error) {
        console.error('Error loading prescriptions:', error);
    }
}

// Update inventory grid
function updateInventoryGrid() {
    const searchTerm = medicineSearch.value.toLowerCase();
    const filteredMedicines = medicines.filter(medicine => 
        medicine.name.toLowerCase().includes(searchTerm) ||
        medicine.category.toLowerCase().includes(searchTerm)
    );

    inventoryGrid.innerHTML = filteredMedicines
        .map(medicine => {
            const isLowStock = medicine.quantity <= LOW_STOCK_THRESHOLD;
            return `
                <div class="medicine-card" onclick="showMedicineDetails('${medicine._id}')">
                    <h4>${medicine.name}</h4>
                    <div class="medicine-info">
                        <p>Category: ${medicine.category}</p>
                        <p>Quantity: ${medicine.quantity}</p>
                        <p>Price: $${medicine.price.toFixed(2)}</p>
                    </div>
                    <span class="stock-status status-${isLowStock ? 'low' : 'normal'}">
                        ${isLowStock ? 'Low Stock' : 'In Stock'}
                    </span>
                </div>
            `;
        })
        .join('');
}

// Update prescription list
function updatePrescriptionList() {
    prescriptionList.innerHTML = prescriptions
        .map(prescription => `
            <div class="prescription-item">
                <div class="prescription-header">
                    <h4>Patient: ${prescription.patient.name}</h4>
                    <span>Token: ${prescription.patient.tokenNumber}</span>
                </div>
                <div class="prescription-info">
                    <p>Doctor: ${prescription.doctor}</p>
                    <p>Department: ${prescription.department.name}</p>
                    <p>Date: ${new Date(prescription.createdAt).toLocaleDateString()}</p>
                </div>
                <div class="prescription-actions">
                    <button class="action-btn btn-primary" onclick="processPrescription('${prescription._id}')">
                        Process
                    </button>
                    <button class="action-btn btn-secondary" onclick="viewPrescriptionDetails('${prescription._id}')">
                        View Details
                    </button>
                </div>
            </div>
        `)
        .join('');
}

// Update statistics
function updateStats() {
    totalMedicinesElement.textContent = medicines.length;
    lowStockElement.textContent = medicines.filter(m => m.quantity <= LOW_STOCK_THRESHOLD).length;
    pendingOrdersElement.textContent = prescriptions.length;
}

// Show/hide modals
function showAddMedicineModal() {
    addMedicineModal.classList.add('active');
}

function showMedicineDetails(medicineId) {
    const medicine = medicines.find(m => m._id === medicineId);
    if (!medicine) return;

    document.getElementById('modalMedicineName').textContent = medicine.name;
    document.getElementById('medicineDetails').innerHTML = `
        <div class="medicine-info-grid">
            <div class="info-item">
                <label>Category</label>
                <span>${medicine.category}</span>
            </div>
            <div class="info-item">
                <label>Current Stock</label>
                <span>${medicine.quantity}</span>
            </div>
            <div class="info-item">
                <label>Price</label>
                <span>$${medicine.price.toFixed(2)}</span>
            </div>
            <div class="info-item">
                <label>Status</label>
                <span class="stock-status status-${medicine.quantity <= LOW_STOCK_THRESHOLD ? 'low' : 'normal'}">
                    ${medicine.quantity <= LOW_STOCK_THRESHOLD ? 'Low Stock' : 'In Stock'}
                </span>
            </div>
        </div>
        <p class="medicine-description">${medicine.description}</p>
    `;

    // Fetch and display stock history
    fetchStockHistory(medicineId);
    medicineDetailsModal.classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Handle add medicine form submission
async function handleAddMedicine(event) {
    event.preventDefault();

    const formData = {
        name: document.getElementById('medicineName').value,
        description: document.getElementById('medicineDescription').value,
        quantity: parseInt(document.getElementById('medicineQuantity').value),
        price: parseFloat(document.getElementById('medicinePrice').value),
        category: document.getElementById('medicineCategory').value
    };

    try {
        const response = await fetch('/api/pharmacy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            const newMedicine = await response.json();
            medicines.push(newMedicine);
            updateInventoryGrid();
            updateStats();
            closeModal('addMedicineModal');
            event.target.reset();
        }
    } catch (error) {
        console.error('Error adding medicine:', error);
    }
}

// Process prescription
async function processPrescription(prescriptionId) {
    try {
        const response = await fetch(`/api/prescriptions/${prescriptionId}/process`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            prescriptions = prescriptions.filter(p => p._id !== prescriptionId);
            updatePrescriptionList();
            updateStats();
        }
    } catch (error) {
        console.error('Error processing prescription:', error);
    }
}

// View prescription details
async function viewPrescriptionDetails(prescriptionId) {
    try {
        const response = await fetch(`/api/prescriptions/${prescriptionId}`);
        const prescription = await response.json();
        
        // Create a modal to display prescription details
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Prescription Details</h2>
                <div class="prescription-details">
                    <div class="patient-info">
                        <h3>Patient Information</h3>
                        <p><strong>Name:</strong> ${prescription.patient.name}</p>
                        <p><strong>Token:</strong> ${prescription.patient.tokenNumber}</p>
                        <p><strong>Age:</strong> ${prescription.patient.age}</p>
                        <p><strong>Gender:</strong> ${prescription.patient.gender}</p>
                    </div>
                    <div class="prescription-medicines">
                        <h3>Prescribed Medicines</h3>
                        <ul>
                            ${prescription.medicines.map(med => `
                                <li>
                                    <p><strong>${med.name}</strong> - ${med.dosage}</p>
                                    <p>Quantity: ${med.quantity}</p>
                                    <p>Instructions: ${med.instructions}</p>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                    <div class="prescription-notes">
                        <h3>Doctor's Notes</h3>
                        <p>${prescription.notes || 'No notes provided'}</p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close modal functionality
        const closeBtn = modal.querySelector('.close');
        closeBtn.addEventListener('click', () => {
            modal.remove();
        });
        
        // Close when clicking outside the modal content
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    } catch (error) {
        console.error('Error fetching prescription details:', error);
    }
}

// Fetch stock history
async function fetchStockHistory(medicineId) {
    try {
        const response = await fetch(`/api/pharmacy/${medicineId}/history`);
        const history = await response.json();
        
        document.getElementById('stockHistory').innerHTML = history
            .map(item => `
                <div class="history-item">
                    <div class="history-info">
                        ${item.type === 'add' ? '+' : '-'}${item.quantity} units
                        (${item.type === 'add' ? 'Restocked' : 'Dispensed'})
                    </div>
                    <div class="history-date">
                        ${new Date(item.date).toLocaleDateString()}
                    </div>
                </div>
            `)
            .join('');
    } catch (error) {
        console.error('Error fetching stock history:', error);
    }
}

// Search functionality
medicineSearch.addEventListener('input', updateInventoryGrid);

// Socket.io event listeners
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});

socket.on('medicineUpdated', (updatedMedicine) => {
    const index = medicines.findIndex(m => m._id === updatedMedicine._id);
    if (index !== -1) {
        medicines[index] = updatedMedicine;
        updateInventoryGrid();
        updateStats();
    }
});

socket.on('prescriptionAdded', (newPrescription) => {
    if (newPrescription.status === 'pending') {
        prescriptions.push(newPrescription);
        updatePrescriptionList();
        updateStats();
    }
});

socket.on('prescriptionUpdated', (updatedPrescription) => {
    const index = prescriptions.findIndex(p => p._id === updatedPrescription._id);
    if (index !== -1) {
        if (updatedPrescription.status === 'pending') {
            prescriptions[index] = updatedPrescription;
        } else {
            prescriptions.splice(index, 1);
        }
        updatePrescriptionList();
        updateStats();
    }
});

// Initialize
loadMedicines();
loadPrescriptions();

// Add event listeners for the tabs
document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', function() {
        // If the inventory tab is clicked, refresh the prescription list
        if (this.getAttribute('onclick').includes('inventory')) {
            loadPrescriptions();
        }
    });
});