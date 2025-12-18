#!/usr/bin/env node

/**
 * Create Test Users Script
 * Creates or updates test users in MongoDB for integration testing
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// Import User model
const User = require("../src/models/User");

// Test user data
const testUsers = [
  {
    username: "test-organizer",
    email: "test-organizer@example.com",
    password: "TestPassword123!",
    firstName: "Test",
    lastName: "Organizer",
    role: "Organiser",
  },
  {
    username: "test-member",
    email: "test-member@example.com",
    password: "TestPassword123!",
    firstName: "Test",
    lastName: "Member",
    role: "Team Member",
  },
];

async function createTestUsers() {
  try {
    console.log("🔗 Connecting to MongoDB...");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || process.env.DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Connected to MongoDB");

    for (const userData of testUsers) {
      console.log(`\n👤 Processing user: ${userData.email}`);

      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });

      if (existingUser) {
        console.log(`   📝 Updating existing user...`);

        // Update password and other fields
        const hashedPassword = await bcrypt.hash(userData.password, 12);
        existingUser.password = hashedPassword;
        existingUser.username = userData.username;
        existingUser.firstName = userData.firstName;
        existingUser.lastName = userData.lastName;
        existingUser.role = userData.role;
        existingUser.isActive = true;
        existingUser.emailVerified = true;

        await existingUser.save();
        console.log(
          `   ✅ User updated successfully (ID: ${existingUser._id})`
        );
      } else {
        console.log(`   🆕 Creating new user...`);

        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 12);

        // Create new user
        const newUser = new User({
          username: userData.username,
          email: userData.email,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          emailVerified: true, // Pre-verify test users
          isActive: true, // Make sure account is active
        });

        await newUser.save();
        console.log(`   ✅ User created successfully (ID: ${newUser._id})`);
      }
    }

    console.log("\n🎉 All test users processed successfully!");
    console.log("\nTest Credentials:");
    console.log("Organizer: test-organizer@example.com / TestPassword123!");
    console.log("Member: test-member@example.com / TestPassword123!");
  } catch (error) {
    console.error("❌ Error creating test users:", error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔗 MongoDB connection closed");
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  createTestUsers();
}

module.exports = { createTestUsers, testUsers };
