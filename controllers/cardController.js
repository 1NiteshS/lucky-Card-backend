import { v4 as uuidv4 } from 'uuid';
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
            },
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
// export const startTimer = async (io) => {
//     let timer = await Timer.findOne({ timerId: 'game-timer' });

//     if (!timer) {
//         timer = new Timer({ timerId: 'game-timer', remainingTime: 30, isRunning: true });
//         await timer.save();
//     }

//     timer.isRunning = true;
//     await timer.save();
//     io.emit('timerUpdate', { remainingTime: timer.remainingTime, isRunning: timer.isRunning });

//     const timerInterval = setInterval(async () => {
//         if (timer.remainingTime > 0) {
//             timer.remainingTime -= 1;
//             await timer.save();

//             // Emit real-time update to all clients
//             io.emit('timerUpdate', { remainingTime: timer.remainingTime, isRunning: timer.isRunning });
//         } else {
//             clearInterval(timerInterval);
//             timer.isRunning = false;
//             await timer.save();

//             // Emit timer stop event
//             io.emit('timerUpdate', { remainingTime: 0, isRunning: false });
//         }
//     }, 1000);
// };

// Function to reset the timer
// export const resetTimer = async (io) => {
//     let timer = await Timer.findOne({ timerId: 'game-timer' });

//     if (timer) {
//         timer.remainingTime = 30;
//         await timer.save();

//         // Restart the timer after resetting
//         startTimer(io);
//         io.emit('timerUpdate', { remainingTime: timer.remainingTime, isRunning: true });
//     }
// };


// // Function to change the timer duration
// export const changeTimerDuration = async (req, res) => {
//     const { newDuration } = req.body;

//     if (typeof newDuration !== 'number' || newDuration <= 0) {
//         return res.status(400).json({ message: 'Invalid duration' });
//     }

//     let timer = await Timer.findOne({ timerId: 'game-timer' });

//     if (timer) {
//         timer.remainingTime = newDuration;  // Change to the new duration
//         await timer.save();

//         // Emit the updated timer state without stopping the current timer
//         io.emit('timerUpdate', { remainingTime: timer.remainingTime, isRunning: timer.isRunning });

//         res.status(200).json({ message: 'Timer duration updated', newDuration });
//     } else {
//         res.status(404).json({ message: 'Timer not found' });
//     }
// };

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


export const placeBet = async (req, res) => {
    try {
        const { gameId, adminId, cards } = req.body;

        if (!gameId || !adminId || !cards) {
            return res.status(400).json({ message: 'Invalid input data.' });
        }

        // Ensure all 12 cards are provided
        const requiredCards = ['card1', 'card2', 'card3', 'card4', 'card5', 'card6', 'card7', 'card8', 'card9', 'card10', 'card11', 'card12'];
        const missingCards = requiredCards.filter(card => !(card in cards));
        if (missingCards.length > 0) {
            return res.status(400).json({ message: `Missing cards: ${missingCards.join(', ')}` });
        }

        // Find or create the games entry
        let games = await Games.findOne();
        if (!games) {
            games = new Games({ games: {} });
        }

        // Find or create the game
        if (!games.games.has(gameId)) {
            games.games.set(gameId, { gameId, admins: {} });
        }

        const currentGame = games.games.get(gameId);

        // Find or create the admin under the current game
        if (!currentGame.admins.has(adminId)) {
            currentGame.admins.set(adminId, { adminId, tickets: {} });
        }

        const currentAdmin = currentGame.admins.get(adminId);

        // Generate a unique ticket ID
        const ticketId = uuidv4();

        // Find the next ticket number (ticket1, ticket2, etc.)
        const ticketCount = currentAdmin.tickets.size;
        const nextTicketKey = `ticket${ticketCount + 1}`;

        // Add the new ticket
        currentAdmin.tickets.set(nextTicketKey, {
            ticketId,
            cards: {
                card1: cards.card1 || 0,
                card2: cards.card2 || 0,
                card3: cards.card3 || 0,
                card4: cards.card4 || 0,
                card5: cards.card5 || 0,
                card6: cards.card6 || 0,
                card7: cards.card7 || 0,
                card8: cards.card8 || 0,
                card9: cards.card9 || 0,
                card10: cards.card10 || 0,
                card11: cards.card11 || 0,
                card12: cards.card12 || 0
            }
        });

        // Save the updated game
        await games.save();

        return res.json({
            message: 'Bet placed successfully',
            ticket: currentAdmin.tickets.get(nextTicketKey)
        });
    } catch (err) {
        console.error('Error placing bet:', err);
        return res.status(500).json({ message: 'Error placing the bet', error: err.message });
    }
};


// export const placeBet = async (req, res) => {
//     try {
//         // Find the game timer
//         let timer = await Timer.findOne({ timerId: 'game-timer' });

//         // Check if the timer is running
//         if (!timer || !timer.isRunning) {
//             return res.status(400).json({ message: 'No active game. Betting is closed.' });
//         }

//         // Find the current game
//         const currentGame = await Game.findOne().sort({ GameNo: -1 });

//         if (!currentGame) {
//             return res.status(400).json({ message: 'No game in progress.' });
//         }

//         // Extract bet details from request body
//         const { AdminId, cards } = req.body;

//         if (!cards || !AdminId || cards.length === 0) {
//             return res.status(400).json({ message: 'Invalid bet data. Cards are required.' });
//         }

//         // Generate a unique ticket ID
//         const ticketId = uuidv4();

//         // Create a new ticket with its associated bets (cards)
//         const newTicket = {
//             ticketId,
//             AdminId,
//             cards // The cards placed in this ticket
//         };

//         // Push the new ticket into the current game's bets
//         currentGame.Tickets.push(newTicket);

//         await currentGame.save();

//         // Return the response with the new structure
//         return res.json({
//             message: 'Bet placed successfully',
//             gameNo: currentGame.GameNo,
//             bets: {
//                 AdminId,
//                 ticketId: {
//                     uniqueTicketId: ticketId,
//                     cards // Return the cards placed in the ticket
//                 }
//             }
//         });
//     } catch (err) {
//         return res.status(500).json({ message: 'Error placing the bet', error: err.message });
//     }
// };



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
