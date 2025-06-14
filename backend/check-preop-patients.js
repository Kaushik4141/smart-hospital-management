const mongoose = require('mongoose');
const Patient = require('./src/models/Patient');

mongoose.connect('mongodb+srv://kaushik0h0s:Kaushik_98808@kaushik.rwnu7.mongodb.net/hospital_management').then(async () => {
    try {
        // Find all patients with Pre-operative stage
        const patients = await Patient.find({ surgeryStage: 'Pre-operative' });
        console.log('Patients with Pre-operative stage:', patients.length);
        if (patients.length > 0) {
            patients.forEach(p => {
                console.log(`Patient: ${p.name}, Token: ${p.tokenNumber}, Stage: ${p.surgeryStage}, OT: ${p.currentOT}, Status: ${p.otStatus}`);
            });
            
            // Update the patient status to 'In Progress'
            const patient = patients[0]; // Update the first pre-operative patient
            patient.otStatus = 'In Progress';
            await patient.save();
            console.log(`\nUpdated patient ${patient.name} status to 'In Progress'`);
        } else {
            console.log('No patients found with Pre-operative stage');
        }

        // Find all patients in OT with In Progress status
        const inProgressPatients = await Patient.find({ otStatus: 'In Progress' });
        console.log('\nPatients with In Progress status:', inProgressPatients.length);
        if (inProgressPatients.length > 0) {
            inProgressPatients.forEach(p => {
                console.log(`Patient: ${p.name}, Token: ${p.tokenNumber}, Stage: ${p.surgeryStage}, OT: ${p.currentOT}, Status: ${p.otStatus}`);
            });
        } else {
            console.log('No patients found with In Progress status');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        mongoose.disconnect();
    }
});