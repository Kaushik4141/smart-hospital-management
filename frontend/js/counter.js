// Connect to Socket.io server using relative URL
const socket = io();

// DOM Elements
const departmentGrid = document.getElementById('departmentGrid');
const totalDepartmentsSpan = document.getElementById('totalDepartments');
const activeQueuesSpan = document.getElementById('activeQueues');
const totalWaitingSpan = document.getElementById('totalWaiting');

// State
let departments = [];
let queueStats = {};

// Fetch departments and their queue statistics
async function fetchDepartments() {
    try {
        const response = await fetch('/api/departments');
        const departments = await response.json();
        totalDepartmentsSpan.textContent = departments.length;
        
        // Fetch queue statistics for each department
        await updateQueueStats();
        
        // Render department cards
        renderDepartments();
    } catch (error) {
        console.error('Error fetching departments:', error);
        showNotification('Error loading departments', 'error');
    }
}

// Update queue statistics for all departments
async function updateQueueStats() {
    try {
        const response = await fetch('/api/patients');
        const patients = await response.json();
        
        // Reset queue stats
        queueStats = {};
        let activeQueues = 0;
        let totalWaiting = 0;
        
        // Calculate stats for each department
        departments.forEach(dept => {
            const departmentPatients = patients.filter(p => 
                p.department._id === dept._id && 
                p.status !== 'Completed'
            );
            
            queueStats[dept._id] = {
                waiting: departmentPatients.length,
                status: getQueueStatus(departmentPatients.length)
            };
            
            if (departmentPatients.length > 0) {
                activeQueues++;
                totalWaiting += departmentPatients.length;
            }
        });
        
        // Update stats display
        activeQueuesSpan.textContent = activeQueues;
        totalWaitingSpan.textContent = totalWaiting;
        
    } catch (error) {
        console.error('Error updating queue stats:', error);
    }
}

// Determine queue status based on waiting count
function getQueueStatus(waitingCount) {
    if (waitingCount === 0) return 'active';
    if (waitingCount < 5) return 'active';
    if (waitingCount < 10) return 'busy';
    return 'full';
}

// Create and render department cards
function renderDepartments() {
    departmentGrid.innerHTML = '';
    
    departments.forEach(dept => {
        const stats = queueStats[dept._id] || { waiting: 0, status: 'active' };
        const card = document.createElement('div');
        card.className = 'department-card';
        card.onclick = () => navigateToQueue(dept._id);
        
        card.innerHTML = `
            <h3>${dept.name}</h3>
            <div class="department-info">
                <p>Floor: ${dept.floor}</p>
                <p>Waiting: ${stats.waiting}</p>
            </div>
            <span class="queue-status status-${stats.status}">
                ${stats.status.charAt(0).toUpperCase() + stats.status.slice(1)}
            </span>
        `;
        
        departmentGrid.appendChild(card);
    });
}

// Navigate to department queue page
function navigateToQueue(departmentId) {
    window.location.href = `queue.html?department=${departmentId}`;
}

// Show notification
function showNotification(message, type = 'info') {
    // You can implement your own notification system here
    alert(message);
}

// Socket event listeners
socket.on('newPatient', () => {
    updateQueueStats().then(() => renderDepartments());
});

socket.on('patientStatusUpdated', () => {
    updateQueueStats().then(() => renderDepartments());
});

socket.on('departmentUpdated', () => {
    fetchDepartments();
});

// Initialize
fetchDepartments();