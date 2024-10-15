// controllers/superAdminController.js
import SuperAdmin from '../models/SuperAdmin.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import Game from '../models/gameModel.js'

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const superAdmin = await SuperAdmin.findOne({ username });
    
    // if (!superAdmin || !(await bcrypt.compare(password, superAdmin.password))) {
    //   return res.status(401).send({ error: 'Invalid login credentials' });
    // }

    if (!superAdmin) {
      return res.status(401).send({ error: 'Super admin not found' });
    }
    
    const passwordMatch = await bcrypt.compare(password, superAdmin.password);
    if (!passwordMatch) {
      return res.status(401).send({ error: 'Password is incorrect' });
    }
    
    const token = jwt.sign({ _id: superAdmin._id }, process.env.JWT_SECRET);
    return res.send({ token });
  } catch (error) {
    return res.status(400).send(error);
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

    return res.status(200).json(adminData);
  } catch (error) {
    console.error('Error fetching admins:', error);
    return res.status(500).json({ error: 'Internal server error' });
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

    return res.status(200).json({
      message: "Amount added to wallet successfully",
      adminId: admin.adminId,
      newBalance: admin.wallet,
    });
  } catch (error) {
    console.error("Error adding to wallet:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};


export const getGameHistory = async (req, res) => {
  try {
      // Get pagination parameters from query string with defaults
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      // Get total count of games for pagination info
      const totalGames = await Game.countDocuments();

      // Fetch games with pagination, sorting by GameNo in descending order
      const games = await Game.find()
          .sort({ GameNo: -1 })
          .skip(skip)
          .limit(limit)
          .select('GameNo Bets createdAt') // Select specific fields you want to return
          .lean(); // Convert to plain JavaScript objects for better performance

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalGames / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      // Return response with games and pagination info
      return res.status(200).json({
          success: true,
          data: {
              games,
              pagination: {
                  currentPage: page,
                  totalPages,
                  totalGames,
                  limit,
                  hasNextPage,
                  hasPrevPage
              }
          }
      });

  } catch (error) {
      console.error('Error fetching game history:', error);
      return res.status(500).json({
          success: false,
          error: "Internal server error"
      });
  }
};