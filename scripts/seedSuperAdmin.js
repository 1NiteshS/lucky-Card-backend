// scripts/seedSuperAdmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const SuperAdmin = require('../models/SuperAdmin');

const seedSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const superAdminUsername = 'superadmin';
    const superAdminPassword = 'superadmin123'; // You should change this to a strong password

    const existingSuperAdmin = await SuperAdmin.findOne({ username: superAdminUsername });

    if (existingSuperAdmin) {
      console.log('Super Admin already exists');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(superAdminPassword, 10);

    const superAdmin = new SuperAdmin({
      username: superAdminUsername,
      password: hashedPassword,
    });

    await superAdmin.save();

    console.log('Super Admin created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding Super Admin:', error);
    process.exit(1);
  }
};

seedSuperAdmin();