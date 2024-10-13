import express from 'express';
import { calculateAmounts, getAllCards, getAllSelectedCards, getCurrentGame, getTimer, placeBet, postCardNumber, startTimer } from '../controllers/cardController.js';
import { authAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get the current timer value
router.get('/get-timer', getTimer);

// Start the timer
router.post('/start-timer', startTimer);

// Route to calculate total, lowest, and perform operations
router.get('/calculate', calculateAmounts);

// Route to place a bet
router.post('/bet/:adminId', authAdmin, placeBet);

// Route to get all cards
router.get('/all-cards', getAllCards);

// Route to post card number
router.post('/card-number', postCardNumber);

// Route to get current game
router.get('/current-game', getCurrentGame);

router.get('/selected-cards', getAllSelectedCards);

// router.post('/createNewGame', createNewGame);


export default router;
