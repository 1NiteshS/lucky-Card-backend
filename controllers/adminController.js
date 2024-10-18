// controllers/adminController.js
import Admin from '../models/Admin.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { sendOTP } from '../utils/emailService.js';
import Game from '../models/gameModel.js';
import SelectedCard from '../models/selectedCardModel.js';
import AdminWinnings from '../models/AdminWinnings.js';

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const create = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingAdmin = await Admin.findOne({ email });
    
    if (existingAdmin) {
      return res.status(400).send({ error: 'Email already in use' });
    }
    
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes

    const hashedPassword = await bcrypt.hash(password, 8);
    const adminId = uuidv4();
    const admin = new Admin({ 
      name, 
      email, 
      password: hashedPassword, 
      adminId,
      otp,
      otpExpiry
    });
    await admin.save();
    
    await sendOTP(email, otp);
    
    res.status(201).send({ message: 'Admin created. Please verify your email with the OTP sent.' });
  } catch (error) {
    res.status(400).send(error);
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(404).send({ error: 'Admin not found' });
    }

    if (admin.otp !== otp || admin.otpExpiry < new Date()) {
      return res.status(400).send({ error: 'Invalid or expired OTP' });
    }

    admin.isVerified = true;
    admin.otp = undefined;
    admin.otpExpiry = undefined;
    await admin.save();

    res.send({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(400).send(error);
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    
    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(401).send({ error: 'Invalid login credentials' });
    }
    
    if (!admin.isVerified) {
      return res.status(401).send({ error: 'Please verify your email first' });
    }
    
    const token = jwt.sign({ _id: admin._id }, process.env.JWT_SECRET);
    res.send({ token, adminId: admin.adminId });
  } catch (error) {
    res.status(400).send(error);
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(404).send({ error: 'Admin not found' });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes

    admin.otp = otp;
    admin.otpExpiry = otpExpiry;
    await admin.save();

    await sendOTP(email, otp);

    res.send({ message: 'OTP sent to your email for password reset' });
  } catch (error) {
    res.status(400).send(error);
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(404).send({ error: 'Admin not found' });
    }

    if (admin.otp !== otp || admin.otpExpiry < new Date()) {
      return res.status(400).send({ error: 'Invalid or expired OTP' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 8);
    admin.password = hashedPassword;
    admin.otp = undefined;
    admin.otpExpiry = undefined;
    await admin.save();

    res.send({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(400).send(error);
  }
};

export const getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find({});
    
    
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

export const getAdminProfile = async (req, res) => {
  try {
    const { adminId } = req.params;  // Get adminId from URL params

    console.log('Requested AdminId:', adminId);
    console.log('Authenticated Admin:', req.admin);
    
    const admin = await Admin.findOne({ adminId })
      .select('name email adminId wallet isVerified createdAt');
    
    if (!admin) {
      return res.status(404).json({ 
        success: false,
        error: 'Admin not found' 
      });
    }
    if (admin.adminId !== req.admin.adminId) {
      return res.status(403).json({
        success: false,
        error: 'You can only view your own profile'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        name: admin.name,
        email: admin.email,
        adminId: admin.adminId,
        wallet: admin.wallet,
        isVerified: admin.isVerified,
        joinedDate: admin.createdAt
      }
    });
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const getCurrentGame = async (req, res) => {
  try {
    // Find the most recent game
    const currentGame = await Game.findOne().sort({ createdAt: -1 });

    if (!currentGame) {
      return res.status(404).json({ message: 'No active game found' });
    }

    // Return the game ID and any other relevant information
    res.status(200).json({
      success: true,
      data: {
        gameId: currentGame._id,
        gameNo: currentGame.GameNo, // Assuming you have a GameNo field
        createdAt: currentGame.createdAt
      }
    });
  } catch (error) {
    console.error('Error fetching current game:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching current game',
      error: error.message
    });
  }
};

export const addAdminWinning = async (req, res) => {
  try {
    const { adminId, gameId, winningAmount } = req.body;
    // Validate input
    if (!adminId || !gameId || !winningAmount) {
      return res.status(400).json({
        success: false,
        error: 'adminId, gameId, and winningAmount are required'
      });
    }
    // Check if the admin exists
    const admin = await Admin.findOne({ adminId });
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }
    // Create new AdminWinnings document
    const newWinning = new AdminWinnings({
      adminId,
      gameId,
      winningAmount
    });
    // Save the new winning record
    await newWinning.save();
    // Update admin's wallet
    await Admin.findOneAndUpdate(
      { adminId },
      { $inc: { wallet: winningAmount } }
    );
    res.status(201).json({
      success: true,
      message: 'Admin winning added successfully',
      data: newWinning
    });
  } catch (error) {
    console.error('Error adding admin winning:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const postAllAdminWinnings = async (adminId) => {
  try {
    // const { adminId } = req.params;
    // Validate input
    if (!adminId) {
      return {
        success: false,
        error: 'adminId is required'
      };
    }
    // Check if the admin exists
    const admin = await Admin.findOne({ adminId });
    if (!admin) {
      return {
        success: false,
        error: 'Admin not found'
      };
    }
    // Find all games where this admin has placed bets
    const games = await Game.find({ 'Bets.adminID': adminId });
    //console.log("games", games)
    let totalWinnings = 0;
    const winningRecords = [];
    for (const game of games) {
      const selectedCard = await SelectedCard.findOne({ gameId: game.GameId });
      //console.log('selected card', selectedCard);
      if (!selectedCard) continue; // Skip if no winning card was selected for this game
      const winningCardId = selectedCard.cardId;
      //console.log('winnig card', winningCardId);
      const winningMultiplier = parseInt(selectedCard.multiplier);
      //console.log('winning all', winningMultiplier);
      let gameWinningAmount = 0;
      // Find this admin's bet in the game
      const adminBet = game.Bets.find(bet => bet.adminID === adminId);
      //console.log('admin bet', adminBet);
      if (adminBet) {
        console.log(adminBet);
        for (const card of adminBet.card) {
          if (card.cardNo === winningCardId) {
            gameWinningAmount += card.Amount * winningMultiplier;
            console.log('game winner amt', gameWinningAmount);
          }
        }
      }
      if (gameWinningAmount > 0) {
        const winningRecord = new AdminWinnings({
          adminId,
          gameId: game.GameId,
          winningAmount: gameWinningAmount,
        });
        await winningRecord.save();
        winningRecords.push(winningRecord);
        totalWinnings += gameWinningAmount;
      }
    }
    // Update admin's wallet with total winnings
    await Admin.findOneAndUpdate(
      { adminId },
      { $inc: { wallet: totalWinnings } }
    );
    return{
      success: true,
      message: 'Admin winnings posted successfully',
      data: {
        totalWinnings,
        winningRecords
      }
    };
  } catch (error) {
    console.error('Error posting admin winnings:', error);
    return{
      success: false,
      error: 'Internal server error'
    };
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { adminId, oldPassword, newPassword } = req.body;
    // Find the admin by adminId
    const admin = await Admin.findOne({ adminId });
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    // Verify the old password
    const isMatch = await bcrypt.compare(oldPassword, admin.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 8);
    // Update the password
    admin.password = hashedPassword;
    await admin.save();
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAdminWinnings = async (req, res) => {
  try {
    const { adminId } = req.params;
    //console.log('admin  id', adminId);
    //const { startDate, endDate } = req.query;
    ///console.log("start date", startDate, 'end date', endDate);
    // Ensure the requesting admin can only access their own data
    if (adminId !== req.admin.adminId) {
      return res.status(403).json({
        success: false,
        error: 'You can only view your own winnings'
      });
    }
    let query = { adminId };
    //console.log('query', query);
    /*if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
  */
    const winnings = await AdminWinnings.find(query).sort({ timestamp: -1 });
    console.log('winning ', winnings);
    res.status(200).json({
      success: true,
      data: winnings,
    });
  } catch (error) {
    console.error('Error fetching admin winnings:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const calculateAndStoreAdminWinnings = async (gameId) => {
  try {
    const game = await Game.findOne({ GameId: gameId });
    const selectedCard = await SelectedCard.findOne({ gameId });
    if (!game || !selectedCard) {
      console.error('Game or SelectedCard not found');
      return;
    }
    const winningCardId = selectedCard.cardId;
    const winningMultiplier = parseInt(selectedCard.multiplier);
    for (const bet of game.Bets) {
      const adminId = bet.adminID;
      let winningAmount = 0;
      for (const card of bet.card) {
        if (card.cardNo === winningCardId) {
          winningAmount += card.Amount * winningMultiplier;
        }
      }
      if (winningAmount > 0) {
        // Update admin's wallet
        await Admin.findOneAndUpdate(
          { adminId },
          { $inc: { wallet: winningAmount } }
        );
      }
    }
  } catch (error) {
    console.error('Error calculating and storing admin winnings:', error);
  }
};
