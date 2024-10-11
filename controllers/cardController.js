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






// Controller function to place a bet
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
//         const { AdminId, ticket } = req.body;

//         if (!ticket || !AdminId) {
//             return res.status(400).json({ message: 'Invalid bet data.' });
//         }

//         // Push the bet to the current game
//         currentGame.Bets.push({
//             AdminId,
//             Bet: ticket
//         });

//         await currentGame.save();

//         return res.json({
//             message: 'Bet placed successfully',
//             gameNo: currentGame.GameNo,
//             bet: {
//                 AdminId,
//                 ticket
//             }
//         });
//     } catch (err) {
//         return res.status(500).json({ message: 'Error placing the bet', error: err.message });
//     }
// };

// export const placeBet = async (req, res) => {
//     try {
//         let timer = await Timer.findOne({ timerId: 'game-timer' });

//         if (!timer || !timer.isRunning) {
//             return res.status(400).json({ message: 'No active game. Betting is closed.' });
//         }

//         const currentGame = await Game.findOne().sort({ GameNo: -1 });

//         if (!currentGame) {
//             return res.status(400).json({ message: 'No game in progress.' });
//         }

//         const { AdminId, ticket } = req.body;

//         if (!ticket || !AdminId) {
//             return res.status(400).json({ message: 'Invalid bet data.' });
//         }

//         // Log the incoming bet to debug
//         console.log('Incoming Bet:', { AdminId, ticket });

//         // Create a new bet entry
//         const newBet = {
//             AdminId,
//             Bet: ticket // This should directly map to the betSchema structure
//         };

//         // Push the new bet to the current game
//         currentGame.Bets.push(newBet);

//         // Save the updated game document
//         await currentGame.save();

//         return res.json({
//             message: 'Bet placed successfully',
//             gameNo: currentGame.GameNo,
//             bet: newBet // Return the newly created bet for confirmation
//         });
//     } catch (err) {
//         console.error('Error placing bet:', err);
//         return res.status(500).json({ message: 'Error placing the bet', error: err.message });
//     }
// };

// export const placeBet = async (req, res) => {
//     try {
//         // Fetch the game timer
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

//         // Extract AdminId and ticket data from the request body
//         const { AdminId, ticket } = req.body;

//         // Validate input data
//         if (!ticket || !AdminId) {
//             return res.status(400).json({ message: 'Invalid bet data.' });
//         }

//         // Log the incoming bet for debugging
//         console.log('Incoming Bet:', { AdminId, ticket });

//         // Create a new ticket entry with dynamic ticketId
//         const ticketWithId = {
//             ...ticket,
//             ticketId: uuidv4()  // Assign a unique ID to each ticket
//         };

//         // Find or create an Admin bet entry
//         let adminBet = currentGame.Bets.find(bet => bet.AdminId === AdminId);
        
//         if (adminBet) {
//             // If the Admin already has a bet, add the new ticket
//             adminBet.Bet.tickets.push(ticketWithId);
//         } else {
//             // If the Admin does not have a bet, create a new bet with this ticket
//             const newBet = {
//                 AdminId,
//                 Bet: {
//                     tickets: [ticketWithId]  // Add the new ticket in an array
//                 }
//             };
//             currentGame.Bets.push(newBet);
//         }

//         // Save the updated game document
//         await currentGame.save();

//         return res.json({
//             message: 'Bet placed successfully',
//             gameNo: currentGame.GameNo,
//             bet: ticketWithId  // Return the newly created ticket for confirmation
//         });
//     } catch (err) {
//         console.error('Error placing bet:', err);
//         return res.status(500).json({ message: 'Error placing the bet', error: err.message });
//     }
// };

export const placeBet = async (req, res) => {
    try {
        // Fetch the game timer
        let timer = await Timer.findOne({ timerId: 'game-timer' });

        // Check if the timer is running
        if (!timer || !timer.isRunning) {
            return res.status(400).json({ message: 'No active game. Betting is closed.' });
        }

        // Find the current game
        const currentGame = await Game.findOne().sort({ GameNo: -1 });

        if (!currentGame) {
            return res.status(400).json({ message: 'No game in progress.' });
        }

        // Extract AdminId and card data from the request body
        const { AdminId, card } = req.body;

        // Validate input data
        if (!card || !AdminId) {
            return res.status(400).json({ message: 'Invalid bet data.' });
        }

        // Log the incoming bet for debugging
        console.log('Incoming Bet:', { AdminId, card });

        // Find or create an Admin bet entry
        let adminBet = currentGame.Bets.find(bet => bet.AdminId === AdminId);
        
        // If the Admin does not have a bet, create a new bet with this card
        if (!adminBet) {
            adminBet = {
                AdminId,
                Bet: {
                    tickets: [{
                        ticketId: uuidv4(),
                        cards: [card]
                    }]
                }
            };
            currentGame.Bets.push(adminBet);
        } else {
            // If the Admin already has a bet
            let lastTicket = adminBet.Bet.tickets[adminBet.Bet.tickets.length - 1];

            if (lastTicket && lastTicket.cards.length < 12) {
                // Add card to the last ticket if it has less than 12 cards
                lastTicket.cards.push(card);
            } else {
                // Create a new ticket if the last ticket has 12 cards
                const newTicket = {
                    ticketId: uuidv4(),
                    cards: [card]
                };
                adminBet.Bet.tickets.push(newTicket);
            }
        }

        // Save the updated game document
        await currentGame.save();

        return res.json({
            message: 'Bet placed successfully',
            gameNo: currentGame.GameNo,
            card  // Return the newly created card for confirmation
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
