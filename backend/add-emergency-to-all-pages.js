/**
 * This script adds the emergency code system to all HTML files in the project
 */

const fs = require('fs');
const path = require('path');

// Directory containing HTML files
const publicDir = path.join(__dirname, 'public');

// Function to add emergency system to an HTML file
function addEmergencySystem(filePath) {
    try {
        // Read the file
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Check if emergency.css is already included
        if (!content.includes('emergency.css')) {
            // Add emergency.css to head
            content = content.replace(
                /<\/head>/,
                '    <link rel="stylesheet" href="css/emergency.css">\n</head>'
            );
        }
        
        // Check if emergency.js is already included
        if (!content.includes('emergency.js')) {
            // Add Socket.io client and emergency.js before closing body tag
            // First check if Socket.io is already included
            if (!content.includes('socket.io.js') && !content.includes('socket.io.min.js')) {
                content = content.replace(
                    /<\/body>/,
                    '    <!-- Socket.io Client Library -->\n    <script src="/socket.io/socket.io.js"></script>\n</body>'
                );
            }
            
            // Add emergency.js
            content = content.replace(
                /<\/body>/,
                '    <!-- Emergency Code System -->\n    <script src="js/emergency.js"></script>\n</body>'
            );
        }
        
        // Write the modified content back to the file
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Added emergency system to ${path.basename(filePath)}`);
    } catch (error) {
        console.error(`Error processing ${filePath}:`, error);
    }
}

// Function to process all HTML files in a directory
function processDirectory(directory) {
    // Get all files in the directory
    const files = fs.readdirSync(directory);
    
    // Process each file
    files.forEach(file => {
        const filePath = path.join(directory, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            // Recursively process subdirectories
            processDirectory(filePath);
        } else if (path.extname(file).toLowerCase() === '.html') {
            // Process HTML files
            addEmergencySystem(filePath);
        }
    });
}

// Start processing
console.log('Adding emergency code system to all HTML files...');
processDirectory(publicDir);
console.log('Done!');