// routes/superAdminRoutes.js
import express from 'express';
import {addToWallet, getAllAdmins, login} from '../controllers/superAdminController.js';
import {authSuperAdmin} from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.get('/all-admins', authSuperAdmin, getAllAdmins);
router.post('/add-to-wallet', authSuperAdmin, addToWallet);

export default router;