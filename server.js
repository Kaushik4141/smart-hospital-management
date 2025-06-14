const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

// Create Express app
const app = express();
const server = http.createServer(app);

// Create Socket.io server with CORS enabled
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins in development
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, 'frontend')));

// Proxy API requests to the backend server
app.use('/api', (req, res) => {
  // Forward the request to the backend server
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5002';
  res.redirect(`${backendUrl}${req.originalUrl}`);
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('A user connected');
  
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Start the server
const PORT = process.env.PORT || 5003;
server.listen(PORT, () => {
  console.log(`Frontend server running on port ${PORT}`);
});