const mongoose = require('mongoose');
const Department = require('../models/department.model');
const Patient = require('../models/patient.model');

// MongoDB connection
mongoose.connect('mongodb+srv://kaushik0h0s:Kaushik_98808@kaushik.rwnu7.mongodb.net/hospital_management')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Sample departments
const departments = [
    {
        name: 'General Medicine',
        description: 'Primary healthcare and general medical services',
        floor: 1
    },
    {
        name: 'Cardiology',
        description: 'Heart and cardiovascular care',
        floor: 2
    },
    {
        name: 'Orthopedics',
        description: 'Bone and joint care',
        floor: 3
    },
    {
        name: 'Pediatrics',
        description: 'Child healthcare services',
        floor: 1
    }
];

// Sample patients
const generatePatients = (departmentIds) => {
    const patients = [];
    const names = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Wilson', 'Robert Brown'];
    const genders = ['Male', 'Female'];
    const priorities = ['Normal', 'Urgent', 'Emergency'];

    for (let i = 0; i < 10; i++) {
        patients.push({
            name: names[Math.floor(Math.random() * names.length)],
            age: Math.floor(Math.random() * 70) + 10,
            gender: genders[Math.floor(Math.random() * genders.length)],
            department: departmentIds[Math.floor(Math.random() * departmentIds.length)],
            priority: priorities[Math.floor(Math.random() * priorities.length)],
            contactNumber: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`
        });
    }
    return patients;
};

// Seed data
async function seedData() {
    try {
        // Drop collections
        await mongoose.connection.dropCollection('departments').catch(() => console.log('Departments collection not found'));
        await mongoose.connection.dropCollection('patients').catch(() => console.log('Patients collection not found'));

        // Add departments
        const createdDepartments = await Department.insertMany(departments);
        console.log('Departments created successfully');

        // Get department IDs
        const departmentIds = createdDepartments.map(dept => dept._id);

        // Add patients
        const patients = generatePatients(departmentIds);
        await Patient.insertMany(patients);
        console.log('Patients created successfully');

        console.log('Data seeding completed');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
}

// Run seeder
seedData(); 