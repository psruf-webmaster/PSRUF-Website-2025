const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User'); 

async function resetPassword() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB...');

        const user = await User.findOne({ personalEmail: '' }); 
        if (!user) {
            console.log('User not found!');
            process.exit(1);
        }

        user.personalPassword = bcrypt.hashSync('password123', 10);
        
        await user.save();
        console.log('Password successfully updated for:', user.personalEmail);
        
        process.exit(0);
    } catch (err) {
        console.error('Error resetting password:', err);
        process.exit(1);
    }
}

resetPassword();