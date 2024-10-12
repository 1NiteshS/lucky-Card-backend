import { v4 as uuidv4 } from 'uuid';
import SelectedCard from '../models/selectedCardModel.js';
import Timer from '../models/timerModel.js';
import Game from '../models/gameModel.js';

// Function to get the current timer state
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

        // Fetch the latest game from the database with lean() to avoid Mongoose document wrapper
        const latestGame = await Game.findOne().sort({ createdAt: -1 }).lean(); // Adjust sort based on your schema
        if (!latestGame) {
            return res.status(404).json({ message: 'No games found' });
        }
        console.log(`Fetched latest game: ${JSON.stringify(latestGame)}`);

        // Initialize a variable to hold the winning card
        let winningCard = null;

        // Changed from GameId to GameNo
        console.log(`Processing game: ${latestGame.GameNo}`); 

        // Iterate over each bet within the latest game
        for (const bet of latestGame.Bets) {
            console.log(`Processing bet for AdminId: ${bet.AdminId}`);
            const validAmounts = processGameBets(bet.Bet);
            
            const selectedAmount = selectRandomAmount(validAmounts);
            if (selectedAmount) {
                await saveSelectedCard(selectedAmount, latestGame.GameNo); // Also changed here
                winningCard = selectedAmount; // Store the winning card
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
            winningCard,            // Return the winning card
        });

    } catch (err) {
        console.error(`Error during calculation: ${err.message}`);
        res.status(500).json({ message: 'Error calculating amounts', error: err.message });
    }
};

// Function to process the bets of each game
const processGameBets = (bets) => {
    let totalAmount = 0;
    const amounts = [];

    // Process each bet
    for (const bet of bets) {
        console.log(`Processing bet with ID: ${bet._id}`);

        // Process tickets in the bet
        for (const ticket of bet.tickets) {
            console.log(`Processing ticket with ID: ${ticket._id}`);

            // Access cards in the ticket
            for (const ticketKey in ticket) {
                const cards = ticket[ticketKey];
                if (Array.isArray(cards)) {
                    cards.forEach(card => {
                        // Ensure each card amount is a number and process it
                        const cardAmounts = Object.values(card).flat(); // Flatten card amounts
                        cardAmounts.forEach(cardAmount => {
                            const amount = Number(cardAmount[0]);  // Convert to number
                            if (!isNaN(amount)) {
                                totalAmount += amount;
                                console.log(`Card: ${ticketKey}, Amount: ${amount}`);

                                // Apply multipliers
                                amounts.push({
                                    cardKey: ticketKey,
                                    originalAmount: amount,
                                    '2X': amount * 20,
                                    '3X': amount * 30,
                                    '5X': amount * 50,
                                });
                            }
                        });
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










// Function to create a new GameId and store it in the database
export const createNewGame = async () => {
    const lastGame = await Game.findOne().sort({ GameNo: -1 }); // Get the last game
    const newGameNumber = lastGame ? lastGame.GameNo + 1 : 1; // Increment GameId or set to 1 if no game exists

    const newGame = new Game({
        GameNo: newGameNumber,
        Bets: []  // Initialize an empty array for the bets
    });
    await newGame.save();

    return newGameNumber;
};


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
            // Timer hit zero, stop the timer
            clearInterval(timerInterval);
            timer.isRunning = false;
            await timer.save();

            // Create a new GameId dynamically when the timer hits zero
            const newGameNumber = await createNewGame();
            console.log(`New Game Created with GameNumber: ${newGameNumber}`);

            // Emit timer stop event
            io.emit('timerUpdate', { remainingTime: 0, isRunning: false });

            // Reset the timer and start it again
            resetTimer(io);
        }
    }, 1000);
};

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

// Function to reset the timer
export const resetTimer = async (io) => {
    let timer = await Timer.findOne({ timerId: 'game-timer' });

    if (timer) {
        timer.remainingTime = 30;  // Reset timer to 30 seconds
        await timer.save();

        // Start the timer again after resetting
        startTimer(io);
        io.emit('timerUpdate', { remainingTime: timer.remainingTime, isRunning: true });
    }
};



export const placeBet = async (req, res) => {
    try {
        // Check the game timer
        let timer = await Timer.findOne({ timerId: 'game-timer' });

        if (!timer || !timer.isRunning) {
            return res.status(400).json({ message: 'No active game. Betting is closed.' });
        }

        // Extract bet details from request body
        const { gameId, adminId, ticketsID, cardNo, Amount } = req.body;

        if (!gameId || !adminId || !ticketsID || !cardNo || Amount == null) {
            return res.status(400).json({ message: 'Invalid bet data. All fields are required.' });
        }

        // Find the current game by gameId
        const currentGame = await Game.findOne({ gameID: gameId });

        if (!currentGame) {
            return res.status(400).json({ message: 'Game not found.' });
        }

        // Find the admin within the current game
        const admin = currentGame.gameDetails.find(detail => detail.adminID === adminId);

        if (!admin) {
            return res.status(400).json({ message: 'Admin not found for this game.' });
        }

        // Ensure the cards array exists
        if (!Array.isArray(admin.card)) {
            admin.card = [];
        }

        // Check if the card already exists in the admin's bets
        const existingCard = admin.card.find(card => card.cardNo === cardNo);
        if (existingCard) {
            // Update the amount if the card already exists
            existingCard.Amount += Amount;
        } else {
            // Create a new card entry
            const newCard = {
                cardNo,
                Amount
            };
            admin.card.push(newCard);
        }

        // Ensure tickets array exists
        if (!Array.isArray(admin.tickets)) {
            admin.tickets = [];
        }

        // Create a new ticket if it does not exist
        let ticket = admin.tickets.find(ticket => ticket.ticketsID === ticketsID);
        if (!ticket) {
            ticket = {
                ticketsID,
                card: [] // Initialize cards in the ticket
            };
            admin.tickets.push(ticket);
        }

        // Push the new card into the ticket's card array
        ticket.card.push({
            cardNo,
            Amount
        });

        // Save the updated game with the new ticket and card
        await currentGame.save();

        return res.json({
            message: 'Bet placed successfully',
            gameId: currentGame.gameID,
            bets: {
                adminId,
                ticketsID,
                cardNo,
                Amount
            }
        });
    } catch (err) {
        console.error('Error placing bet:', err);
        return res.status(500).json({ message: 'Error placing the bet', error: err.message });
    }
};