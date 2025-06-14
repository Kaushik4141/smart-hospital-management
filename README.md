# Smart Hospital Display & Management System

A modern web-based hospital management system that provides real-time updates for patient status, department information, and automated billing.

## 🌟 Features

- 📺 Real-time display screens for different hospital areas
- 🏥 Department-wise patient management
- 💉 Blood and drug inventory tracking
- 🧑‍⚕️ Staff dashboard for patient management
- 💸 Automated billing system
- 🔄 Real-time updates using Socket.io

## 🏗️ Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS
- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Real-time Updates**: Socket.io
- **Authentication**: JWT

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone [repository-url]
cd smart-hospital-system
```

2. Install dependencies
```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

3. Set up environment variables
```bash
# In backend directory
cp .env.example .env
# Edit .env with your MongoDB URI and other configurations
```

4. Start the development servers
```bash
# Start backend (from backend directory)
npm run dev

# Start frontend (from frontend directory)
npm run dev
```

## 📺 Display Screens

1. **Counter Display**
   - Shows new patient tokens
   - Real-time name confirmation

2. **Department Display**
   - Current patient status
   - Queue management
   - Real-time updates

3. **Ward Display**
   - Patient and bed information
   - Blood availability status

4. **Staff Dashboard**
   - Patient management
   - Department assignment
   - Treatment updates
   - Billing

## 🔐 Environment Variables

Backend (.env):
```
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
PORT=5000
```

Frontend (.env):
```
VITE_API_URL=http://localhost:5000
```

## 📝 License

MIT License 