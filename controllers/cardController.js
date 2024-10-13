import { v4 as uuidv4 } from 'uuid';
import SelectedCard from '../models/selectedCardModel.js';
import Timer from '../models/timerModel.js';
import Game from '../models/gameModel.js';
import Admin from '../models/Admin.js';

const cardNumbers = {
    'A001': 'Jheart',
    'A002': 'Jspade',
    'A003': 'Jdiamond',
    'A004': 'Jclub',
    'A005': 'Qheart',
    'A006': 'Qspade',
    'A007': 'Qdiamond',
    'A008': 'Qclub',
    'A009': 'Kheart',
    'A020': 'Kspade',
    'A011': 'Kdiamond',
    'A012': 'Kclub'
};

// Get all cards on frontend
  export const getAllCards = async (req, res) => {
    try {
      const allCards = Object.entries(cardNumbers).map(([cardNo, cardName]) => ({
        cardNo: cardNo,
        cardName
      }));
  
      res.status(200).json({
        success: true,
        data: allCards
      });
    } catch (error) {
      console.error('Error fetching all cards:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching all cards',
        error: error.message
      });
    }
  };

  // Post card number one by one
export const postCardNumber = async (req, res) => {
    try {
      const { cardNo } = req.body;
  
      if (cardNo === undefined || cardNo === null) {
        return res.status(400).json({
          success: false,
          message: 'Card number is required'
        });
      }
  
      const cardName = cardNumbers[cardNo];
  
      if (!cardName) {
        return res.status(400).json({
          success: false,
          message: 'Invalid card number'
        });
      }
  
      res.status(200).json({
        success: true,
        data: {
          cardNo: cardNo,
          cardName: cardName
        }
      });
    } catch (error) {
      console.error('Error processing card number:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing card number',
        error: error.message
      });
    }
};

// Function to get the current gameID
export const getCurrentGame = async (req, res) => {
    try {
      // Find the most recent game
      const currentGame = await Game.findOne().sort({ createdAt: -1 });
      console.log(currentGame);
      
  
      if (!currentGame) {
        return res.status(404).json({ message: 'No active game found' });
      }
  
      // Return the game ID and any other relevant information
      res.status(200).json({
        success: true,
        data: {
          gameId: currentGame.GameId,
          createdAt: currentGame.createdAt
        }
      });
    } catch (error) {
      console.error('Error fetching current game:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching current game',
        error: error.message
      });
    }
  };


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

        const validAmounts = processGameBets(latestGame.Bets);

        const WinningCard = selectRandomAmount(validAmounts);
       
        await saveSelectedCard(WinningCard, latestGame.GameId);

        // Emit timer update
        req.io.emit('timerUpdate', { remainingTime: timer.remainingTime, isRunning: timer.isRunning });

        await resetTimer(req.io);

        res.status(200).json({
            message: 'Amounts calculated successfully',
            WinningCard,            // Return the winning card
        });

    } catch (err) {
        console.error(`Error during calculation: ${err}`);
        res.status(500).json({ message: 'Error calculating amounts', error: err.message });
    }
};

// Function to process the bets of each game
const processGameBets = (bets) => { 
    // Check if bets array is empty
    if (!bets || bets.length === 0) {
        console.log("No bets placed. Skipping bet processing...");
        return {}; // Returning an empty object or any default value to avoid errors
    }

    let totalAmount = 0;
    const amounts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    for(const bet of bets) {
        // Access cards in the bet            
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

    const percAmount = totalAmount * 0.85;

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

    if (Object.keys(validAmounts).length === 0) {
        console.log("Valid amounts is empty.");
        return { key: "0", index: 0, value: 0 }; // Return the default structure
    }
    
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
   
    if (Object.keys(selectedAmount).length === 0) {
        console.log("selected amounts is empty.");
        return {}; // Return an empty object if validAmounts is empty
    }

    let cardId;
    if(selectedAmount.index === 0) {
        cardId = "A001";
    } else if(selectedAmount.index === 1) {
        cardId = "A002";
    } else if(selectedAmount.index === 2) {
        cardId = "A003";
    } else if(selectedAmount.index === 3) {
        cardId = "A004";
    } else if(selectedAmount.index === 4) {
        cardId = "A005";
    } else if(selectedAmount.index === 5) {
        cardId = "A006";
    } else if(selectedAmount.index === 6) {
        cardId = "A007";
    } else if(selectedAmount.index === 7) {
        cardId = "A008";
    } else if(selectedAmount.index === 8) {
        cardId = "A009";
    } else if(selectedAmount.index === 9) {
        cardId = "A010";
    } else if(selectedAmount.index === 10) {
        cardId = "A011";
    } else if(selectedAmount.index === 11) {
        cardId = "A012";
    } else {
        throw new Error('Invalid index');
    }

    const selectedCardData = {
        gameId: gameId,
        cardId,
        multiplier: selectedAmount.key,
        amount: selectedAmount.value,
    };

    const selectedCard = new SelectedCard(selectedCardData);
    await selectedCard.save();
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

            // Emit timer stop event
            io.emit('timerUpdate', { remainingTime: 0, isRunning: false });

            // Reset the timer and start it again
            resetTimer(io);
        }
    }, 1000);
};

// export const startTimer = async (res, io) => {
//     let timer = await Timer.findOne({ timerId: 'game-timer' });

//     if (!timer) {
//         timer = new Timer({ timerId: 'game-timer', remainingTime: 5, isRunning: true });
//         await timer.save();
//     }

//     timer.isRunning = true;
//     await timer.save();
//     // io.emit('timerUpdate', { remainingTime: timer.remainingTime, isRunning: timer.isRunning });

//     let timerInterval = setInterval(async () => {
//         if (timer.remainingTime > 0) {
//             timer.remainingTime -= 1;
//             await timer.save();

//             // Emit real-time update to all clients
//             // io.emit('timerUpdate', { remainingTime: timer.remainingTime, isRunning: timer.isRunning });
//         } else {
//             // Timer hit zero, stop the timer
//             clearInterval(timerInterval);
//             timer.isRunning = false;
//             await timer.save();

//             // Create a new GameId dynamically when the timer hits zero
//             const newGameNumber = await createNewGame();

//             // Emit timer stop event
//             // io.emit('timerUpdate', { remainingTime: 0, isRunning: false });

//             // Delete the timer object after the countdown finishes
//             await Timer.deleteOne({ timerId: 'game-timer' });

//             // Optionally notify the frontend that the timer object is deleted
//             // io.emit('timerDeleted', { message: 'Timer deleted, waiting for reset.' });

//             // Return an empty response
//             // res.status(200).json({ message: 'Timer completed and deleted', newGameNumber });
//             return; // Or you could return a specific response like `return null;` if needed
//         }
//         return;
//     }, 1000);
//     return;
// };


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

        // Calculate the total bet amount from all the cards
        let totalAmount = 0;
        if (Array.isArray(cards)) {
            cards.forEach(card => {
                if (card.Amount) {
                    totalAmount += card.Amount;  // Accumulate the amount from each card
                }
            });
        }

        // Check if admin has sufficient balance
        if (admin.wallet < totalAmount) {
            return res
            .status(400)
            .json({ message: "Insufficient balance in wallet!" });
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

        // Deduct the total bet amount from admin's wallet
        admin.wallet -= totalAmount;

        // Save the updated game and admin wallet
        await Promise.all([activeGame.save(), admin.save()]);

        return res.status(200).json({ 
            message: 'Game data successfully uploaded and bet placed successfully!', 
            game: activeGame,
            updatedWalletBalance: admin.wallet,
        });
    } catch (error) {
        console.error('Error uploading game data:', error);
        return res.status(500).json({ message: 'Failed to upload game data.', error: error.message });
    }
};
