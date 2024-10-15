// routes/superAdminRoutes.js
import express from 'express';
import {addToWallet, getAllAdmins, login, getGameHistory} from '../controllers/superAdminController.js';
import {authSuperAdmin} from '../middleware/auth.js';
import { calculateAmounts, chooseAlgorithm, getCurrentAlgorithm } from '../controllers/cardController.js';

const router = express.Router();

router.post('/login', login);
router.get('/all-admins', authSuperAdmin, getAllAdmins);
router.post('/add-to-wallet', authSuperAdmin, addToWallet);
router.get('/game-history', authSuperAdmin, getGameHistory)

router.post('/choose-algorithm', chooseAlgorithm);
router.get('/current-algorithm', getCurrentAlgorithm);
router.get('/calculate-amounts', calculateAmounts);

export default router;