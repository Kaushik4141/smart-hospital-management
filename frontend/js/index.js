// Connect to Socket.io server
// Initialize Socket.io connection
const socket = io();

// DOM Elements
const totalPatientsSpan = document.getElementById('totalPatients');
const totalDepartmentsSpan = document.getElementById('totalDepartments');
const availableBedsSpan = document.getElementById('availableBeds');
const totalStaffSpan = document.getElementById('totalStaff');

// Fetch initial statistics
async function fetchStatistics() {
    try {
        // Fetch total patients
        const patientsResponse = await fetch('/api/patients');
        const patients = await patientsResponse.json();
        totalPatientsSpan.textContent = patients.length;

        // Fetch departments
        const departmentsResponse = await fetch('/api/departments');
        const departments = await departmentsResponse.json();
        totalDepartmentsSpan.textContent = departments.length;

        // For now, set default values for beds and staff
        // These will be updated when we implement those features
        availableBedsSpan.textContent = '50';
        totalStaffSpan.textContent = '25';
    } catch (error) {
        console.error('Error fetching statistics:', error);
    }
}

// Socket event listeners for real-time updates
socket.on('newPatient', () => {
    const currentCount = parseInt(totalPatientsSpan.textContent);
    totalPatientsSpan.textContent = currentCount + 1;
});

socket.on('patientDischarge', () => {
    const currentCount = parseInt(totalPatientsSpan.textContent);
    if (currentCount > 0) {
        totalPatientsSpan.textContent = currentCount - 1;
    }
});

socket.on('departmentUpdate', () => {
    fetchStatistics(); // Refresh all statistics
});

// Initialize
fetchStatistics();