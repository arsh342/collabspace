const mongoose = require('mongoose');
const User = require('./src/models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/collabspace')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Find a user and check if createdAt is present
    const user = await User.findOne().select('firstName lastName email role createdAt');
    
    if (user) {
      console.log('User found:', {
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        joinDate: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'
      });
    } else {
      console.log('No user found');
    }
    
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });