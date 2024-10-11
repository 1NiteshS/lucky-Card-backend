// routes/adminRoutes.js
import express from 'express';
import {
  create,
  login,
  verifyOTP,
  forgotPassword,
  resetPassword,
  getAllAdmins,
  getAdminProfile,
} from '../controllers/adminController.js';
import {authSuperAdmin} from '../middleware/auth.js';

const router = express.Router();

router.post("/create", authSuperAdmin, create);
router.post("/login", login);
router.post("/verify-otp", verifyOTP);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get('/all-admins', getAllAdmins);
router.get("/profile", authAdmin, getAdminProfile)

export default router;
