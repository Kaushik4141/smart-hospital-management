const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Add environment variable validation
const requiredEnvVars = ['MONGODB_URI', 'PORT', 'NODE_ENV'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    console.error('Required environment variables are missing:', missingEnvVars.join(', '));
    process.exit(1);
}

// Create Express app
const app = express();
const httpServer = createServer(app);
const allowedOrigins = '*'; // Update this to your frontend URL in production
// Add Socket.IO connection manager
const socketManager = require('./utils/socketManager');

const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST', 'PATCH', 'DELETE'],
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

// Initialize socket manager
socketManager(io);

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
}));
app.use(express.json());

// Remove static file serving since frontend is now separate
// app.use(express.static('public'));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://kaushik0h0s:Kaushik_98808@kaushik.rwnu7.mongodb.net/hospital_management')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Import routes
const patientRoutes = require('./routes/patient.routes');
const departmentRoutes = require('./routes/department.routes');
const otRoutes = require('./routes/ot.routes').router;
const wardRoutes = require('./routes/ward.routes').router;
const pharmacyRoutes = require('./routes/pharmacy.routes').router;


// Use routes
app.use('/api/patients', patientRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/ot', otRoutes);
app.use('/api/wards', wardRoutes);
app.use('/api/beds', wardRoutes);
app.use('/api/pharmacy', pharmacyRoutes);

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Handle emergency code broadcasts
    socket.on('triggerEmergency', (data) => {
        console.log(`Emergency ${data.type} triggered by ${socket.id}`);
        // Broadcast emergency to all connected clients
        io.emit('emergency', data);
    });
    socket.on('clearEmergency', () => {
        // Broadcast clear emergency to all connected clients
        io.emit('clearEmergency');
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 5002;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});