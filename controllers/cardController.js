import { v4 as uuidv4 } from 'uuid';
import Card from '../models/cardModel.js';
import SelectedCard from '../models/selectedCardModel.js';
import Timer from '../models/timerModel.js';
import Game from '../models/gameModel.js';

// Initialize the cards with IDs and amounts
export const initializeCards = async (req, res) => {
    try {
        // Define the game data
        const gamesData = [
            {
                GameId: 1,
                Bets: [
                    {
                        AdminId: 1,
                        Bet: {
                            Ticket1: {
                                card1: [2],
                                card2: [5],
                                card3: [3]
                            },
                            Ticket2: {
                                card1: [5],
                                card2: [4],
                                card3: [2]
                            },
                            Ticket3: {
                                card1: [10],
                                card2: [5],
                                card3: [2]
                            }
                        }
                    },
                    {
                        AdminId: 2,
                        Bet: {
                            Ticket1: {
                                card1: [5],
                                card2: [4],
                                card3: [10]
                            },
                            Ticket2: {
                                card1: [5],
                                card2: [6],
                                card3: [8]
                            },
                            Ticket3: {
                                card1: [10],
                                card2: [5],
                                card3: [2]
                            }
                        }
                    },
                    {
                        AdminId: 3,
                        Bet: {
                            Ticket1: {
                                card1: [5],
                                card2: [4],
                                card3: [10]
                            },
                            Ticket2: {
                                card1: [5],
                                card2: [6],
                                card3: [8]
                            },
                            Ticket3: {
                                card1: [10],
                                card2: [5],
                                card3: [2]
                            }
                        }
                    }
                ]
            }
        ];

        // Insert game data into the database
        await Game.insertMany(gamesData);
        res.status(201).json({ message: 'Games initialized', games: gamesData });
    } catch (err) {
        res.status(500).json({ message: 'Error initializing games', error: err.message });
    }
};

let timerInterval;  // Store the interval globally
// Function to start the timer
export const startTimer = async (io) => {
    let timer = await Timer.findOne({ timerId: 'game-timer' });

    if (!timer) {
        timer = new Timer({ timerId: 'game-timer', remainingTime: 30, isRunning: true });
        await timer.save();
    }

    timer.isRunning = true;
    await timer.save();
    io.emit('timerUpdate', { remainingTime: timer.remainingTime, isRunning: timer.isRunning });

    const timerInterval = setInterval(async () => {
        if (timer.remainingTime > 0) {
            timer.remainingTime -= 1;
            await timer.save();

            // Emit real-time update to all clients
            io.emit('timerUpdate', { remainingTime: timer.remainingTime, isRunning: timer.isRunning });
        } else {
            clearInterval(timerInterval);
            timer.isRunning = false;
            await timer.save();

            // Emit timer stop event
            io.emit('timerUpdate', { remainingTime: 0, isRunning: false });
        }
    }, 1000);
};

// Function to reset the timer
export const resetTimer = async (io) => {
    let timer = await Timer.findOne({ timerId: 'game-timer' });

    if (timer) {
        timer.remainingTime = 30;
        await timer.save();

        // Restart the timer after resetting
        startTimer(io);
        io.emit('timerUpdate', { remainingTime: timer.remainingTime, isRunning: true });
    }
};

// Function to get the current timer state
export const getTimer = async (req, res) => {
    try {
        const timer = await Timer.findOne({ timerId: 'game-timer' });

        if (!timer) {
            return res.status(404).json({ message: 'No active timer found' });
        }

        res.status(200).json({
            remainingTime: timer.remainingTime,
            isRunning: timer.isRunning
        });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching timer', error: err.message });
    }
};

export const calculateAmounts = async (req, res) => {
    try {
        console.log("Starting the calculation process...");

        // Fetch the timer from the database
        const timer = await Timer.findOne({ timerId: 'game-timer' });
        console.log(`Fetched timer: ${JSON.stringify(timer)}`);

        // Check if the timer is running and the remaining time is <= 10 seconds
        if (!timer.isRunning || timer.remainingTime > 10) {
            console.log(`Waiting for the timer to reach 10 seconds... Current time: ${timer.remainingTime}`);
            return res.status(200).json({ message: `Waiting for the timer to reach 10 seconds... Current time: ${timer.remainingTime}` });
        }

        // Stop the timer
        clearInterval(timerInterval);  // Assumes there's a running interval
        timer.isRunning = false;
        await timer.save();
        console.log(`Timer stopped at ${timer.remainingTime}`);

        // Fetch games from the database with lean() to avoid Mongoose document wrapper
        const games = await Game.find().lean();
        console.log(`Fetched games: ${JSON.stringify(games)}`);

        for (const game of games) {
            console.log(`Processing game: ${game.GameId}`);

            // Iterate over each bet within the game
            for (const bet of game.Bets) {
                console.log(`Processing bet for AdminId: ${bet.AdminId}`);
                const validAmounts = processGameBets(bet.Bet);
                
                const selectedAmount = selectRandomAmount(validAmounts);

                if (selectedAmount) {
                    await saveSelectedCard(selectedAmount, game.GameId);
                }
            }
        }

        const previousSelectedCards = await SelectedCard.find();
        console.log(`Retrieved previous selected cards: ${JSON.stringify(previousSelectedCards)}`);

        // Emit timer update
        req.io.emit('timerUpdate', { remainingTime: timer.remainingTime, isRunning: timer.isRunning });
        console.log("Emitted timer update");

        await resetTimer(req.io);
        console.log("Timer reset");

        res.status(200).json({
            message: 'Amounts calculated successfully',
            previousSelectedCards,  // Return all previously selected cards
        });

    } catch (err) {
        console.error(`Error during calculation: ${err.message}`);
        res.status(500).json({ message: 'Error calculating amounts', error: err.message });
    }
};

// Function to process the bets of each game
const processGameBets = (bet) => {
    let totalAmount = 0;
    const amounts = [];

    // Process tickets in the bet
    for (const ticketKey in bet) {
        const ticket = bet[ticketKey];
        console.log(`Processing ${ticketKey}`);

        // Access cards in the ticket
        for (const cardKey in ticket) {
            if (Array.isArray(ticket[cardKey])) {
                // Ensure the card amount is a number and process it
                const cardAmount = Number(ticket[cardKey][0]);  // Convert to number
                if (!isNaN(cardAmount)) {
                    totalAmount += cardAmount;
                    console.log(`Card: ${cardKey}, Amount: ${cardAmount}`);

                    // Apply multipliers
                    amounts.push({
                        cardKey,
                        originalAmount: cardAmount,
                        '2X': cardAmount * 20,
                        '3X': cardAmount * 30,
                        '5X': cardAmount * 50,
                    });
                }
            }
        }
    }

    console.log(`Total amount for bet: ${totalAmount}`);

    const percAmount = totalAmount * 0.85;
    console.log(`85% of totalAmount: ${percAmount}`);

    // Filter valid amounts based on the 85% threshold
    const validAmounts = {};
    amounts.forEach(item => {
        if (item['2X'] < percAmount) addValidAmount(validAmounts, item, '2X');
        if (item['3X'] < percAmount) addValidAmount(validAmounts, item, '3X');
        if (item['5X'] < percAmount) addValidAmount(validAmounts, item, '5X');
    });

    console.log(`Valid amounts: ${JSON.stringify(validAmounts)}`);
    return validAmounts;
};


// Helper function to add valid amounts
const addValidAmount = (validAmounts, item, multiplier) => {
    if (!validAmounts[item[multiplier]]) validAmounts[item[multiplier]] = [];
    validAmounts[item[multiplier]].push({ ...item, multiplier, amount: item[multiplier] });
};

// Function to flatten valid amounts and select a random one
const selectRandomAmount = (validAmounts) => {
    const flatValidAmounts = Object.values(validAmounts).flat();
    console.log(`Flat valid amounts: ${JSON.stringify(flatValidAmounts)}`);

    if (flatValidAmounts.length > 0) {
        const randomIndex = Math.floor(Math.random() * flatValidAmounts.length);
        return flatValidAmounts[randomIndex];
    }
    return null;
};

// Function to save the selected card data
const saveSelectedCard = async (selectedAmount, gameId) => {
    const uniqueId = uuidv4(); // Generate a unique ID
    const selectedCardData = {
        id: uniqueId,
        cardId: selectedAmount.cardKey,
        multiplier: selectedAmount.multiplier,
        amount: selectedAmount.amount,
        originalAmount: selectedAmount.originalAmount,
    };

    const selectedCard = new SelectedCard(selectedCardData);
    await selectedCard.save();
    console.log(`Selected card saved for game ${gameId}: ${JSON.stringify(selectedCardData)}`);
};
