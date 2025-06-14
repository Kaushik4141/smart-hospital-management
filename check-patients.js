const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb+srv://kaushik0h0s:Kaushik_98808@kaushik.rwnu7.mongodb.net/hospital_management', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  try {
    // Import the Patient model
    const Patient = require('./backend/src/models/patient.model');
    
    // Count patients
    const patientCount = await Patient.countDocuments();
    console.log('Total patients in database:', patientCount);
    
    // Get patients in the Cardiology department
    // First, get the department ID
    const Department = require('./backend/src/models/department.model');
    const cardiology = await Department.findOne({ name: 'Cardiology' });
    
    if (cardiology) {
      console.log('Cardiology department ID:', cardiology._id);
      
      // Find patients in this department
      const cardiologyPatients = await Patient.find({ department: cardiology._id });
      console.log('Patients in Cardiology department:', cardiologyPatients.length);
      
      if (cardiologyPatients.length > 0) {
        console.log('Sample patient:', JSON.stringify(cardiologyPatients[0], null, 2));
      } else {
        console.log('No patients found in Cardiology department');
      }
    } else {
      console.log('Cardiology department not found');
    }
    
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