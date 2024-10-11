import express from 'express';
import { initializeCards, calculateAmounts, startTimer, getTimer } from '../controllers/cardController.js';

const router = express.Router();

// Route to initialize cards
router.post('/initialize', initializeCards);

// Get the current timer value
router.get('/get-timer', getTimer);

// Start the timer
router.post('/start-timer', startTimer);

// Route to calculate total, lowest, and perform operations
router.get('/calculate', calculateAmounts);

export default router;
