import { v4 as uuidv4 } from 'uuid';
import SelectedCard from '../models/selectedCardModel.js';
import Timer from '../models/timerModel.js';
import Game from '../models/gameModel.js';
import Admin from '../models/Admin.js';
import crypto from 'crypto';

// Function to get the current timer state
export const calculateAmounts = async (req, res) => {
    try {

        // Fetch the timer from the database
        const timer = await Timer.findOne({ timerId: 'game-timer' });

        // Check if the timer is running and the remaining time is <= 10 seconds
        if (!timer.isRunning || timer.remainingTime > 10) {
            console.log(`Waiting for the timer to reach 10 seconds... Current time: ${timer.remainingTime}`);
            return res.status(200).json({ message: `Waiting for the timer to reach 10 seconds... Current time: ${timer.remainingTime}` });
        }

        // Stop the timer
        timer.isRunning = false;
        await timer.save();

        // Fetch the latest game from the database with lean() to avoid Mongoose document wrapper
        const latestGame = await Game.findOne().sort({ createdAt: -1 }).lean(); // Adjust sort based on your schema
        if (!latestGame) {
            return res.status(404).json({ message: 'No games found' });
        }

        // Initialize a variable to hold the winning card
        let winningCard = null;

        const validAmounts = processGameBets(latestGame.Bets);
        console.log(`Processing bet for validAmounts: ${JSON.stringify(validAmounts)}`);

        const selectedAmount = selectRandomAmount(validAmounts);
        console.log(`Processing bet for selectedAmount: ${JSON.stringify(selectedAmount)}`);
        

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
        console.error(`Error during calculation: ${err}`);
        res.status(500).json({ message: 'Error calculating amounts', error: err.message });
    }
};

// Function to process the bets of each game
const processGameBets = (bets) => {
    let totalAmount = 0;
    const amounts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    console.log(JSON.stringify(bets));
    

    for(const bet of bets) {
        // Access cards in the bet
            console.log(bet.card);
            
            bet.card.forEach(card => {
                if(card.cardNo == "A001") {
                    totalAmount += card.Amount;
                    amounts[0] += card.Amount;
                } else if(card.cardNo == "A002") {
                    totalAmount += card.Amount;
                    amounts[1] += card.Amount;
                } else if(card.cardNo == "A003") {
                    totalAmount += card.Amount;
                    amounts[2] += card.Amount;
                } else if(card.cardNo == "A004") {
                    totalAmount += card.Amount;
                    amounts[3] += card.Amount;
                } else if(card.cardNo == "A005") {
                    totalAmount += card.Amount;
                    amounts[4] += card.Amount;
                } else if(card.cardNo == "A006") {
                    totalAmount += card.Amount;
                    amounts[5] += card.Amount;
                } else if(card.cardNo == "A007") {
                    totalAmount += card.Amount;
                    amounts[6] += card.Amount;
                } else if(card.cardNo == "A008") {
                    totalAmount += card.Amount;
                    amounts[7] += card.Amount;
                } else if(card.cardNo == "A009") {
                    totalAmount += card.Amount;
                    amounts[8] += card.Amount;
                } else if(card.cardNo == "A010") {
                    totalAmount += card.Amount;
                    amounts[9] += card.Amount;
                } else if(card.cardNo == "A011") {
                    totalAmount += card.Amount;
                    amounts[10] += card.Amount;
                } else if(card.cardNo == "A012") {
                    totalAmount += card.Amount;
                    amounts[11] += card.Amount;
                }
            });
    }

    let multipliedArray = {
        "N":[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        "2":[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        "3":[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        "4":[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        "5":[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        "6":[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        "7":[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        "8":[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        "9":[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        "10":[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    }

    console.log(`Total amount for all bets: ${totalAmount}`);

    const percAmount = totalAmount * 0.85;
    console.log(`85% of totalAmount: ${percAmount}`);

    for(let i = 0; i < amounts.length; i++) {
        if(amounts[i]*10 < percAmount) {
            multipliedArray["N"][i] = amounts[i]*10;
        }
        if(amounts[i]*20 < percAmount) {
            multipliedArray["2"][i] = amounts[i]*20;
        }
        if(amounts[i]*30 < percAmount) {
            multipliedArray["3"][i] = amounts[i]*30;
        }
        if(amounts[i]*40 < percAmount) {
            multipliedArray["4"][i] = amounts[i]*40;
        }
        if(amounts[i]*50 < percAmount) {
            multipliedArray["5"][i] = amounts[i]*50;
        }
        if(amounts[i]*60 < percAmount) {
            multipliedArray["6"][i] = amounts[i]*60;
        }
        if(amounts[i]*70 < percAmount) {
            multipliedArray["7"][i] = amounts[i]*70;
        }
        if(amounts[i]*80 < percAmount) {
            multipliedArray["8"][i] = amounts[i]*80;
        }
        if(amounts[i]*60 < percAmount) {
            multipliedArray["9"][i] = amounts[i]*90;
        }
        if(amounts[i]*100 < percAmount) {
            multipliedArray["10"][i] = amounts[i]*100;
        }
    }
    
    return multipliedArray;
};

// Function to find random non-zero value and its index
function selectRandomAmount(validAmounts) {
    let nonZeroEntries = [];
  
    // Iterate through validAmounts to find non-zero values
    for (let key in validAmounts) {
      validAmounts[key].forEach((value, index) => {
        if (value !== 0) {
          nonZeroEntries.push({ key, index, value });
        }
      });
    }
  
    // Check if we have any non-zero entries
    if (nonZeroEntries.length === 0) {
      return null; // Return null if no non-zero values
    }
  
    // Pick a random entry from the non-zero values
    const randomEntry = nonZeroEntries[Math.floor(Math.random() * nonZeroEntries.length)];
  
    return randomEntry;
}

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
    const lastGame = await Game.findOne().sort({ createdAt: -1 }); // Get the last game

    const newGame = new Game({
        Bets: []  // Initialize an empty array for the bets
    });
    await newGame.save();

    return lastGame;
};

// Function to start the timer
export const startTimer = async (io) => {
    let timer = await Timer.findOne({ timerId: 'game-timer' });

    if (!timer) {
        timer = new Timer({ timerId: 'game-timer', remainingTime: 15, isRunning: true });
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
        timer.remainingTime = 20;  // Reset timer to 30 seconds
        await timer.save();

        // Start the timer again after resetting
        startTimer(io);
        io.emit('timerUpdate', { remainingTime: timer.remainingTime, isRunning: true });
    }
};

// Assuming this is in your cardController.js file
export const placeBet = async (req, res) => {
    const { ticketsID, cards, GameId } = req.body; // Accept cards as an array in the request body
    const { adminId } = req.params; // Get adminId from URL params

    try {
        // Fetch the admin details using admin ID
        const admin = await Admin.findOne({ adminId: adminId });
        
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found!' });
        }

        // Check if there is an active game with the given GameId
        const activeGame = await Game.findOne({ GameId: GameId });
        
        if (!activeGame) {
            return res.status(404).json({ message: 'Game not found!' });
        }

        // Create a new bet entry (gameDetails) to be pushed into the Bets array
        const newBet = {
            adminID: admin.adminId,  // Use adminId from Admin model
            ticketsID: ticketsID,
            card: []  // Initialize an empty array for cards
        };

        // Loop through the cards array and add each card to the newBet
        if (Array.isArray(cards)) {
            cards.forEach(card => {
                if (card.cardNo && card.Amount) { // Ensure cardNo and Amount are provided
                    newBet.card.push({
                        cardNo: card.cardNo,
                        Amount: card.Amount
                    });
                }
            });
        }
        
        // Add the new bet to the Bets array of the game
        activeGame.Bets.push(newBet);

        // Save the updated game
        await activeGame.save();

        return res.status(200).json({ message: 'Game data successfully uploaded!', game: activeGame });
    } catch (error) {
        console.error('Error uploading game data:', error);
        return res.status(500).json({ message: 'Failed to upload game data.', error: error.message });
    }
};
