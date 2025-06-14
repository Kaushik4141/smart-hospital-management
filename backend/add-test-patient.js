const mongoose = require('mongoose');
const Department = require('./src/models/department.model');

// Import the Patient model with the correct path
const Patient = require('./src/models/patient.model');

// Connect to MongoDB
mongoose.connect('mongodb+srv://kaushik0h0s:Kaushik_98808@kaushik.rwnu7.mongodb.net/hospital_management', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  try {
    console.log('Connected to MongoDB');
    
    // Find the Cardiology department
    const cardiology = await Department.findOne({ name: 'Cardiology' });
    if (!cardiology) {
      console.log('Cardiology department not found');
      return;
    }
    
    console.log('Found Cardiology department:', cardiology._id);
    
    // Create a new test patient
    const newPatient = new Patient({
      name: 'Test Patient',
      age: 45,
      gender: 'Male',
      department: cardiology._id,
      priority: 'Normal',
      contactNumber: '1234567890',
      status: 'Waiting'
    });
    
    // Save the patient to the database
    const savedPatient = await newPatient.save();
    console.log('Created test patient:', savedPatient);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close the connection
    mongoose.disconnect();
    console.log('Database connection closed');
  }
}).catch(err => {
  console.error('MongoDB connection error:', err);
});