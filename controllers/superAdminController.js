// controllers/superAdminController.js
import SuperAdmin from '../models/SuperAdmin.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const superAdmin = await SuperAdmin.findOne({ username });
    
    if (!superAdmin || !(await bcrypt.compare(password, superAdmin.password))) {
      return res.status(401).send({ error: 'Invalid login credentials' });
    }
    
    const token = jwt.sign({ _id: superAdmin._id }, process.env.JWT_SECRET);
    res.send({ token });
  } catch (error) {
    res.status(400).send(error);
  }
};

export const getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find({}, 'name email createdAt password wallet');
    
    const adminData = admins.map(admin => ({
      name: admin.name,
      email: admin.email,
      creationDate: admin.createdAt,
      password: admin.password.replace(/./g, '*').slice(0, 10) + '...',
      walletBalance: admin.wallet
    }));

    res.status(200).json(adminData);
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addToWallet = async (req, res) => {
  try {
    const { adminId, amount } = req.body;

    if (!adminId || !amount || amount <= 0) {
      return res
        .status(400)
        .json({
          error:
            "Invalid input. Please provide a valid adminId and a positive amount.",
        });
    }

    const admin = await Admin.findOne({ adminId });

    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    admin.wallet += Number(amount);
    await admin.save();

    res.status(200).json({
      message: "Amount added to wallet successfully",
      adminId: admin.adminId,
      newBalance: admin.wallet,
    });
  } catch (error) {
    console.error("Error adding to wallet:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};