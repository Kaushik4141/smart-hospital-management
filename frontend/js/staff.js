// Connect to Socket.io server
const socket = io();

// DOM Elements
const staffGrid = document.getElementById('staffGrid');
const scheduleList = document.getElementById('scheduleList');
const staffSearch = document.getElementById('staffSearch');
const departmentFilter = document.getElementById('departmentFilter');
const roleFilter = document.getElementById('roleFilter');
const addStaffModal = document.getElementById('addStaffModal');
const staffDetailsModal = document.getElementById('staffDetailsModal');
const totalStaffElement = document.getElementById('totalStaff');
const onDutyStaffElement = document.getElementById('onDutyStaff');
const totalDepartmentsElement = document.getElementById('totalDepartments');

// Store data
let staff = [];
let departments = [];
let schedules = [];

// Fetch initial data
async function fetchStaff() {
    try {
        const response = await fetch('/api/staff');
        staff = await response.json();
        updateStaffGrid();
        updateStats();
    } catch (error) {
        console.error('Error fetching staff:', error);
    }
}

async function fetchDepartments() {
    try {
        const response = await fetch('/api/departments');
        departments = await response.json();
        updateDepartmentFilter();
        updateStats();
    } catch (error) {
        console.error('Error fetching departments:', error);
    }
}

async function fetchSchedules() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`/api/schedules?date=${today}`);
        schedules = await response.json();
        updateScheduleList();
    } catch (error) {
        console.error('Error fetching schedules:', error);
    }
}

// Update staff grid
function updateStaffGrid() {
    const searchTerm = staffSearch.value.toLowerCase();
    const selectedDepartment = departmentFilter.value;
    const selectedRole = roleFilter.value;

    const filteredStaff = staff.filter(member => {
        const matchesSearch = member.name.toLowerCase().includes(searchTerm) ||
            member.email.toLowerCase().includes(searchTerm);
        const matchesDepartment = !selectedDepartment || member.department._id === selectedDepartment;
        const matchesRole = !selectedRole || member.role === selectedRole;
        return matchesSearch && matchesDepartment && matchesRole;
    });

    staffGrid.innerHTML = filteredStaff
        .map(member => `
            <div class="staff-card" onclick="showStaffDetails('${member._id}')">
                <h4>${member.name}</h4>
                <div class="staff-info">
                    <p>Department: ${member.department.name}</p>
                    <p>Email: ${member.email}</p>
                    ${member.specialization ? `<p>Specialization: ${member.specialization}</p>` : ''}
                </div>
                <span class="staff-role role-${member.role.toLowerCase()}">${
                    member.role.charAt(0).toUpperCase() + member.role.slice(1)
                }</span>
            </div>
        `)
        .join('');
}

// Update schedule list
function updateScheduleList() {
    const today = new Date();
    const currentHour = today.getHours();

    scheduleList.innerHTML = schedules
        .sort((a, b) => {
            const timeA = parseInt(a.startTime.split(':')[0]);
            const timeB = parseInt(b.startTime.split(':')[0]);
            return timeA - timeB;
        })
        .map(schedule => {
            const startHour = parseInt(schedule.startTime.split(':')[0]);
            const isActive = startHour === currentHour;
            
            return `
                <div class="schedule-item ${isActive ? 'active' : ''}">
                    <div class="schedule-header">
                        <h4>${schedule.staff.name}</h4>
                        <span class="schedule-time">${schedule.startTime} - ${schedule.endTime}</span>
                    </div>
                    <div class="schedule-info">
                        <p>Department: ${schedule.department.name}</p>
                        <p>Role: ${schedule.staff.role}</p>
                    </div>
                </div>
            `;
        })
        .join('');
}

// Update department filter
function updateDepartmentFilter() {
    departmentFilter.innerHTML = `
        <option value="">All Departments</option>
        ${departments
            .map(dept => `<option value="${dept._id}">${dept.name}</option>`)
            .join('')}
    `;

    // Also update the department select in the add staff form
    const staffDepartmentSelect = document.getElementById('staffDepartment');
    staffDepartmentSelect.innerHTML = `
        <option value="">Select Department</option>
        ${departments
            .map(dept => `<option value="${dept._id}">${dept.name}</option>`)
            .join('')}
    `;
}

// Update statistics
function updateStats() {
    totalStaffElement.textContent = staff.length;
    onDutyStaffElement.textContent = schedules.filter(s => {
        const now = new Date();
        const currentHour = now.getHours();
        const startHour = parseInt(s.startTime.split(':')[0]);
        const endHour = parseInt(s.endTime.split(':')[0]);
        return currentHour >= startHour && currentHour < endHour;
    }).length;
    totalDepartmentsElement.textContent = departments.length;
}

// Show/hide modals
function showAddStaffModal() {
    addStaffModal.classList.add('active');
}

function showStaffDetails(staffId) {
    const member = staff.find(s => s._id === staffId);
    if (!member) return;

    document.getElementById('modalStaffName').textContent = member.name;
    document.getElementById('staffDetails').innerHTML = `
        <div class="staff-info-grid">
            <div class="info-item">
                <label>Role</label>
                <span>${member.role.charAt(0).toUpperCase() + member.role.slice(1)}</span>
            </div>
            <div class="info-item">
                <label>Department</label>
                <span>${member.department.name}</span>
            </div>
            <div class="info-item">
                <label>Email</label>
                <span>${member.email}</span>
            </div>
            <div class="info-item">
                <label>Phone</label>
                <span>${member.phone}</span>
            </div>
            ${member.specialization ? `
                <div class="info-item">
                    <label>Specialization</label>
                    <span>${member.specialization}</span>
                </div>
            ` : ''}
        </div>
    `;

    // Fetch and display staff schedule
    fetchStaffSchedule(staffId);
    staffDetailsModal.classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Handle add staff form submission
async function handleAddStaff(event) {
    event.preventDefault();

    const formData = {
        name: document.getElementById('staffName').value,
        role: document.getElementById('staffRole').value,
        department: document.getElementById('staffDepartment').value,
        email: document.getElementById('staffEmail').value,
        phone: document.getElementById('staffPhone').value,
        specialization: document.getElementById('staffSpecialization').value || undefined
    };

    try {
        const response = await fetch('/api/staff', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            const newStaff = await response.json();
            staff.push(newStaff);
            updateStaffGrid();
            updateStats();
            closeModal('addStaffModal');
            event.target.reset();
        }
    } catch (error) {
        console.error('Error adding staff:', error);
    }
}

// Fetch staff schedule
async function fetchStaffSchedule(staffId) {
    try {
        const response = await fetch(`/api/schedules/staff/${staffId}`);
        const staffSchedules = await response.json();
        
        const scheduleManagement = document.getElementById('scheduleManagement');
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        
        scheduleManagement.innerHTML = `
            <div class="shift-grid">
                ${days.map(day => {
                    const schedule = staffSchedules.find(s => s.day === day);
                    return `
                        <div class="shift-cell ${schedule ? 'active' : ''}" 
                             onclick="toggleShift('${staffId}', '${day}')">
                            ${day}<br>
                            ${schedule ? `${schedule.startTime} - ${schedule.endTime}` : '-'}
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="form-actions">
                <button class="action-btn btn-primary" onclick="updateSchedule('${staffId}')">
                    Update Schedule
                </button>
            </div>
        `;
    } catch (error) {
        console.error('Error fetching staff schedule:', error);
    }
}

// Toggle shift selection
function toggleShift(staffId, day) {
    const cell = event.target.closest('.shift-cell');
    cell.classList.toggle('active');
}

// Update staff schedule
async function updateSchedule(staffId) {
    const shifts = Array.from(document.querySelectorAll('.shift-cell'))
        .map((cell, index) => ({
            day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index],
            active: cell.classList.contains('active'),
            startTime: '09:00',
            endTime: '17:00'
        }))
        .filter(shift => shift.active);

    try {
        const response = await fetch(`/api/schedules/staff/${staffId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ shifts })
        });

        if (response.ok) {
            await fetchSchedules();
            closeModal('staffDetailsModal');
        }
    } catch (error) {
        console.error('Error updating schedule:', error);
    }
}

// Search and filter functionality
staffSearch.addEventListener('input', updateStaffGrid);
departmentFilter.addEventListener('change', updateStaffGrid);
roleFilter.addEventListener('change', updateStaffGrid);

// Socket.io event listeners
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});

socket.on('staffUpdated', (updatedStaff) => {
    const index = staff.findIndex(s => s._id === updatedStaff._id);
    if (index !== -1) {
        staff[index] = updatedStaff;
        updateStaffGrid();
        updateStats();
    }
});

socket.on('scheduleUpdated', () => {
    fetchSchedules();
});

// Initialize
fetchStaff();
fetchDepartments();
fetchSchedules();