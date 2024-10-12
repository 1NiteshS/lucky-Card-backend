import express from 'express';
import { calculateAmounts, getTimer, placeBet, startTimer } from '../controllers/cardController.js';

const router = express.Router();

// Get the current timer value
router.get('/get-timer', getTimer);

// Start the timer
router.post('/start-timer', startTimer);

// Route to calculate total, lowest, and perform operations
router.get('/calculate', calculateAmounts);

router.post('/place-bet', placeBet);


export default router;
