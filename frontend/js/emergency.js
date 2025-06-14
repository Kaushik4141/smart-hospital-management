// Emergency Code System
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Socket.io connection
    const socket = io('http://localhost:5003');
    
    // Create emergency UI elements
    createEmergencyElements();
    
    // Get emergency elements
    const codeRedBtn = document.getElementById('codeRedBtn');
    const codeBlueBtn = document.getElementById('codeBlueBtn');
    const emergencyOverlay = document.getElementById('emergencyOverlay');
    const emergencyAlert = document.getElementById('emergencyAlert');
    const clearEmergencyBtn = document.getElementById('clearEmergencyBtn');
    
    // Add event listeners for emergency buttons
    codeRedBtn.addEventListener('click', function() {
        triggerEmergency('red');
    });
    
    codeBlueBtn.addEventListener('click', function() {
        triggerEmergency('blue');
    });
    
    // Add event listener for clear emergency button
    clearEmergencyBtn.addEventListener('click', function() {
        clearEmergency();
    });
    
    // Listen for emergency broadcasts from server
    socket.on('emergency', function(data) {
        showEmergencyAlert(data.type, data.message, data.department || 'Unknown Department');
    });
    
    // Listen for clear emergency broadcasts from server
    socket.on('clearEmergency', function() {
        hideEmergencyAlert();
    });
    
    // Function to trigger emergency
    // Function to trigger emergency
    function triggerEmergency(type) {
        let message = '';
        
        if (type === 'red') {
            message = 'CODE RED: Fire emergency. Please follow evacuation procedures immediately.';
        } else if (type === 'blue') {
            message = 'CODE BLUE: Medical emergency. Medical team required immediately.';
        }
        
        // Get current department/location information
        const department = getCurrentDepartment();
        
        // Emit emergency event to server
        socket.emit('triggerEmergency', { type, message, department });
        
        // Show emergency alert locally
        showEmergencyAlert(type, message, department);
    }
    
    // Function to get current department based on page URL or title
    function getCurrentDepartment() {
        // Default department name
        let department = 'Unknown Department';
        
        // Try to get department from URL path
        const currentPath = window.location.pathname;
        const pageName = currentPath.split('/').pop().replace('.html', '');
        
        // Map page names to department names
        const departmentMap = {
            'index': 'Main Reception',
            'patient': 'Patient Registration',
            'counter': 'Counter Display',
            'staff-counter': 'Staff Counter',
            'department': 'Department Display',
            'ward': 'Ward Display',
            'operation-theatre': 'Operation Theatre',
            'staff-ot': 'Staff OT',
            'pharmacy': 'Pharmacy',
            'staff': 'Staff Dashboard',
            'queue': 'Queue Management'
        };
        
        // Get department name from map or use page name if not found
        if (departmentMap[pageName]) {
            department = departmentMap[pageName];
        } else if (pageName) {
            // Capitalize and format page name if not in map
            department = pageName.split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
        }
        
        return department;
    }
    
    // Function to clear emergency
    function clearEmergency() {
        // Emit clear emergency event to server
        socket.emit('clearEmergency');
        
        // Hide emergency alert locally
        hideEmergencyAlert();
    }
    
    // Function to show emergency alert
    // Function to show emergency alert
    function showEmergencyAlert(type, message, department = 'Unknown Department') {
        // Set alert content
        emergencyAlert.innerHTML = `
            <h2>EMERGENCY: CODE ${type.toUpperCase()}</h2>
            <p class="emergency-location">Location: ${department}</p>
            <p>${message}</p>
            <button id="clearEmergencyBtn" class="clear-emergency">Clear Emergency</button>
        `;
        
        // Set alert class
        emergencyAlert.className = 'emergency-alert ' + type;
        
        // Show overlay
        emergencyOverlay.classList.add('active');
        
        // Add event listener to new clear button
        document.getElementById('clearEmergencyBtn').addEventListener('click', function() {
            clearEmergency();
        });
        
        // Play alert sound
        playAlertSound(type);
    }
    
    // Function to hide emergency alert
    function hideEmergencyAlert() {
        emergencyOverlay.classList.remove('active');
    }
    
    // Function to play alert sound
    function playAlertSound(type) {
        // Create audio element
        const audio = new Audio();
        
        // Set audio source based on emergency type
        if (type === 'red') {
            audio.src = '/sounds/code-red-alert.mp3';
        } else if (type === 'blue') {
            audio.src = '/sounds/code-blue-alert.mp3';
        }
        
        // Play audio
        audio.play().catch(error => {
            console.warn('Could not play alert sound:', error);
        });
    }
    
    // Function to create emergency UI elements
    function createEmergencyElements() {
        // Create emergency container
        const emergencyContainer = document.createElement('div');
        emergencyContainer.className = 'emergency-container';
        emergencyContainer.innerHTML = `
            <button id="codeRedBtn" class="emergency-btn code-red" title="Code Red - Fire Emergency">RED</button>
            <button id="codeBlueBtn" class="emergency-btn code-blue" title="Code Blue - Medical Emergency">BLUE</button>
        `;
        
        // Create emergency overlay
        const emergencyOverlay = document.createElement('div');
        emergencyOverlay.id = 'emergencyOverlay';
        emergencyOverlay.className = 'emergency-overlay';
        
        // Create emergency alert
        const emergencyAlert = document.createElement('div');
        emergencyAlert.id = 'emergencyAlert';
        emergencyAlert.className = 'emergency-alert';
        
        // Append elements to DOM
        emergencyOverlay.appendChild(emergencyAlert);
        document.body.appendChild(emergencyContainer);
        document.body.appendChild(emergencyOverlay);
    }
});