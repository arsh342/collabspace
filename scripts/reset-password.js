const mongoose = require('mongoose');
const User = require('./src/models/User');

async function resetPassword() {
  try {
    await mongoose.connect('mongodb://localhost:27017/collabspace');
    console.log('Connected to MongoDB');

    // Find the organiser user
    const user = await User.findOne({ email: 'organiser1@gmail.com' });
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }

    // Set a simple password for testing
    user.password = 'Password123';
    await user.save();
    
    console.log('Password reset successfully for user:', user.email);
    console.log('New password: Password123');
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

resetPassword();