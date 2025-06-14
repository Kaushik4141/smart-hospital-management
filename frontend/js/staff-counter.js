// Initialize socket connection
// Connect to Socket.io server using relative URL
const socket = io();

// DOM Elements
const departmentGrid = document.getElementById('departmentGrid');
const totalPatientsElement = document.getElementById('totalPatients');
const activeDepartmentsElement = document.getElementById('activeDepartments');
const pendingTransfersElement = document.getElementById('pendingTransfers');

// Department data structure
let departments = [];
let stats = {
    totalPatients: 0,
    activeDepartments: 0,
    pendingTransfers: 0
};

// Initialize the page
async function init() {
    try {
        showLoadingState();
        // Fetch initial data
        const [deptData] = await Promise.all([
            fetchDepartments().then(res => {
                departments = res;
                renderDepartments();
                return res;
            }),
            fetchStats()
        ]);
        // Set up socket listeners
        setupSocketListeners();
        hideLoadingState();
    } catch (error) {
        console.error('Error initializing page:', error);
        showError('Error loading departments. Please try again.');
    }
}

// Show loading state
function showLoadingState() {
    departmentGrid.innerHTML = '<div class="loading">Loading departments...</div>';
}

// Hide loading state
function hideLoadingState() {
    const loadingElement = departmentGrid.querySelector('.loading');
    if (loadingElement) {
        loadingElement.remove();
    }
}

// Show error message
function showError(message) {
    const errorHtml = `
        <div class="error-message">
            <p>${message}</p>
            <button onclick="retryInitialization()">Retry</button>
        </div>
    `;
    departmentGrid.innerHTML = errorHtml;
}

// Retry initialization
async function retryInitialization() {
    await init();
}

// Fetch departments from API
async function fetchDepartments() {
    try {
        const response = await fetch('/api/departments');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const departments = await response.json();
        console.log('Fetched departments:', departments);
        return departments;
    } catch (error) {
        console.error('Error fetching departments:', error);
        throw error;
    }
}

// Fetch statistics
async function fetchStats() {
    try {
        const response = await fetch('/api/stats');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        stats = await response.json();
        updateStats();
    } catch (error) {
        console.error('Error fetching stats:', error);
        throw new Error('Failed to fetch statistics');
    }
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

    socket.on('departmentUpdate', (updatedDepartment) => {
        const index = departments.findIndex(d => d._id === updatedDepartment._id);
        if (index !== -1) {
            departments[index] = updatedDepartment;
            renderDepartments();
        }
    });

    socket.on('statsUpdate', (updatedStats) => {
        stats = updatedStats;
        updateStats();
    });
}

// Render department cards
function renderDepartments() {
    if (!departments.length) {
        departmentGrid.innerHTML = '<div class="no-departments">No departments found</div>';
        return;
    }

    departmentGrid.innerHTML = departments.map(department => `
        <div class="department-card" onclick="selectDepartment('${department._id}')">
            <h3>${department.name}</h3>
            <div class="department-info">
                <p>Floor: ${department.floor}</p>
                <p>Waiting: <strong>${department.waitingCount || 0}</strong></p>
                <p>In Progress: <strong>${department.inProgressCount || 0}</strong></p>
                <p>Transfers: <strong>${department.pendingTransfers || 0}</strong></p>
            </div>
        </div>
    `).join('');
}

// Update statistics display
function updateStats() {
    totalPatientsElement.textContent = stats.totalPatients || 0;
    activeDepartmentsElement.textContent = stats.activeDepartments || 0;
    pendingTransfersElement.textContent = stats.pendingTransfers || 0;
}

// Handle department selection
function selectDepartment(departmentId) {
    console.log('Selected department:', departmentId);
    window.location.href = `/staff-queue.html?id=${departmentId}`;
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
    
    .no-departments {
        text-align: center;
        padding: 2rem;
        color: #666;
    }
`;
document.head.appendChild(style);

// Initialize when page loads
document.addEventListener('DOMContentLoaded', init);