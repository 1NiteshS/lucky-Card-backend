import SelectedCard from '../models/selectedCardModel.js';
import Timer from '../models/timerModel.js';
import Game from '../models/gameModel.js';
import Admin from '../models/Admin.js';
import AdminGameResult from '../models/AdminGameResult.js';
import {calculateAndStoreAdminWinnings} from './adminController.js'
import AdminChoice from '../models/AdminChoice.js';
import BetPercentage from '../models/BetPercentage.js'
import RecentWinningCard from '../models/recentWinningCard.js';

async function getPercentageFromDatabase() {
    const betPercentage = await BetPercentage.findOne();
    return betPercentage ? betPercentage.percentage : 85;
}

async function processBetsWithDynamicPercentage(bets) {
    try {
        const betPercentage = await getPercentageFromDatabase();
        return betPercentage;
    } catch (error) {
        console.error("Error processing bets:", error);
        throw error;
    }
}

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
    'A010': 'Kspade',
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
export const getCurrentGame = async () => {
    try {
        // Find the most recent game
        const currentGame = await Game.findOne().sort({ createdAt: -1 });
        console.log(currentGame);

        if (!currentGame) {
            return { message: 'No active game found' };
            // return res.status(404).json({ message: 'No active game found' });
        }
        return{
            success: true,
            data: {
                gameId: currentGame.GameId,
                // createdAt: currentGame.createdAt
            }
        };
    } catch (error) {
        console.error('Error fetching current game:', error);
        return{
            success: false,
            message: 'Error fetching current game',
            error: error.message
        };
    }
};

// This function will calculate amounts based on remaining time
export const calculateAmounts = async () => {
    try {
        const latestGame = await Game.findOne().sort({ createdAt: -1 }).lean();
        
        if (!latestGame) {
            return { message: 'No games found' };
        }

        const choiceDoc = await AdminChoice.findOne();
        const chosenAlgorithm = choiceDoc ? choiceDoc.algorithm : 'default';
        let processedData;

        switch (chosenAlgorithm) {
            case 'minAmount':
                processedData = await processGameBetsWithMinAmount(latestGame.Bets);
                break;
            case 'zeroAndRandom':
                processedData = await processGameBetsWithZeroRandomAndMin(latestGame.Bets);
                break;
            default:
                processedData = await processGameBets(latestGame.Bets);
        }
        console.log("processedData", processedData);

        let { multipliedArray, percAmount, adminID, ticketsID, type } = processedData;
        const selectedCard = selectRandomAmount(multipliedArray, percAmount, adminID, ticketsID, type);

        if (!selectedCard || !selectedCard.randomEntry) {
            throw new Error('No valid card selected');
        }

        const { randomEntry } = selectedCard;
        
        // Convert the index to the corresponding card number
        const cardNumbers = ["A001", "A002", "A003", "A004", "A005", "A006", "A007", "A008", "A009", "A010", "A011", "A012"];
        const selectedCardNo = cardNumbers[randomEntry.index];

        if (!selectedCardNo) {
            throw new Error('Invalid card index');
        }

        const WinningCard = {
            cardId: selectedCardNo,
            multiplier: parseInt(randomEntry.key),
            amount: randomEntry.value,
            adminID: selectedCard.adminID,
            ticketsID: selectedCard.ticketsID
        };
        
        await saveSelectedCard(WinningCard, latestGame.GameId);
        const adminResults = await calculateAdminResults(latestGame, WinningCard);
        console.log("adminResults", adminResults);
        
        // await calculateAndStoreAdminWinnings(latestGame.GameId);

        return {
            message: 'Amounts calculated successfully',
            WinningCard,
            adminResults
        };

    } catch (err) {
        console.error(`Error during calculation: ${err}`);
        return { message: 'Error calculating amounts', error: err.message };
    }
};

export const chooseAlgorithm = async (req, res) => {
    try {
        const { algorithm } = req.body;
        if (!['default', 'minAmount', 'zeroAndRandom'].includes(algorithm)) {
            return res.status(400).json({ message: 'Invalid algorithm choice' });
        }

        // Try to find an existing AdminChoice document
        let adminChoice = await AdminChoice.findOne();

        if (!adminChoice) {
            // If no document exists, create a new one
            adminChoice = new AdminChoice({ algorithm });
            await adminChoice.save();
            return res.status(201).json({ message: 'Algorithm choice created successfully' });
        } else {
            // If a document exists, update it
            adminChoice.algorithm = algorithm;
            await adminChoice.save();
            return res.json({ message: 'Algorithm choice updated successfully' });
        }
    } catch (error) {
        console.error('Error in chooseAlgorithm:', error);
        return res.status(500).json({ message: 'Error updating algorithm choice', error: error.message });
    }
};

export const getCurrentAlgorithm = async (req, res) => {
    try {
        const choice = await AdminChoice.findOne();
        res.json({ currentAlgorithm: choice ? choice.algorithm : 'default' });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching current algorithm', error: error.message });
    }
};

// Function to process the bets of each game
const processGameBets = async (bets) => { 
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
        "1":[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
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

    let perc = await processBetsWithDynamicPercentage()

    // const percAmount = totalAmount * 0.85;
    const percAmount = totalAmount * (perc / 100);


    for(let i = 0; i < amounts.length; i++) {
        if(amounts[i]*10 !== 0) {
            multipliedArray["1"][i] = amounts[i]*10;
        }
        if(amounts[i]*20 !== 0) {
            multipliedArray["2"][i] = amounts[i]*20;
        }
        if(amounts[i]*30 !== 0) {
            multipliedArray["3"][i] = amounts[i]*30;
        }
        if(amounts[i]*40 !== 0) {
            multipliedArray["4"][i] = amounts[i]*40;
        }
        if(amounts[i]*50 !== 0) {
            multipliedArray["5"][i] = amounts[i]*50;
        }
        if(amounts[i]*60 !== 0) {
            multipliedArray["6"][i] = amounts[i]*60;
        }
        if(amounts[i]*70 !== 0) {
            multipliedArray["7"][i] = amounts[i]*70;
        }
        if(amounts[i]*80 !== 0) {
            multipliedArray["8"][i] = amounts[i]*80;
        }
        if(amounts[i]*60 !== 0) {
            multipliedArray["9"][i] = amounts[i]*90;
        }
        if(amounts[i]*100 !== 0) {
            multipliedArray["10"][i] = amounts[i]*100;
        }
    }

    const { adminID, ticketsID } = bets[0];
    let type = 'processGameBets';

    return {
        multipliedArray,
        percAmount,
        adminID,
        ticketsID,
        type
    };
};

// Function to process the bets of each game
const processGameBetsWithMinAmount = async (bets) => { 
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
        "1":[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
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

    let perc = await processBetsWithDynamicPercentage()

    // const percAmount = totalAmount * 0.85;
    const percAmount = totalAmount * (perc / 100);

    for(let i = 0; i < amounts.length; i++) {
        if(amounts[i]*10 !== 0) {
            multipliedArray["1"][i] = amounts[i]*10;
        }
        if(amounts[i]*20 !== 0) {
            multipliedArray["2"][i] = amounts[i]*20;
        }
        if(amounts[i]*30 !== 0) {
            multipliedArray["3"][i] = amounts[i]*30;
        }
        if(amounts[i]*40 !== 0) {
            multipliedArray["4"][i] = amounts[i]*40;
        }
        if(amounts[i]*50 !== 0) {
            multipliedArray["5"][i] = amounts[i]*50;
        }
        if(amounts[i]*60 !== 0) {
            multipliedArray["6"][i] = amounts[i]*60;
        }
        if(amounts[i]*70 !== 0) {
            multipliedArray["7"][i] = amounts[i]*70;
        }
        if(amounts[i]*80 !== 0) {
            multipliedArray["8"][i] = amounts[i]*80;
        }
        if(amounts[i]*60 !== 0) {
            multipliedArray["9"][i] = amounts[i]*90;
        }
        if(amounts[i]*100 !== 0) {
            multipliedArray["10"][i] = amounts[i]*100;
        }
    }

    const { adminID, ticketsID } = bets[0];
    let type = 'processGameBetsWithMinAmount';

    return {
        multipliedArray,
        percAmount,
        adminID,
        ticketsID,
        type
    };
};

const processGameBetsWithZeroRandomAndMin = async (bets) => { 
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
        "1":[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
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

    let perc = await processBetsWithDynamicPercentage()

    // const percAmount = totalAmount * 0.85;
    const percAmount = totalAmount * (perc / 100);

    for(let i = 0; i < amounts.length; i++) {
        if(amounts[i]*10 !== 0) {
            multipliedArray["1"][i] = amounts[i]*10;
        }
        if(amounts[i]*20 !== 0) {
            multipliedArray["2"][i] = amounts[i]*20;
        }
        if(amounts[i]*30 !== 0) {
            multipliedArray["3"][i] = amounts[i]*30;
        }
        if(amounts[i]*40 !== 0) {
            multipliedArray["4"][i] = amounts[i]*40;
        }
        if(amounts[i]*50 !== 0) {
            multipliedArray["5"][i] = amounts[i]*50;
        }
        if(amounts[i]*60 !== 0) {
            multipliedArray["6"][i] = amounts[i]*60;
        }
        if(amounts[i]*70 !== 0) {
            multipliedArray["7"][i] = amounts[i]*70;
        }
        if(amounts[i]*80 !== 0) {
            multipliedArray["8"][i] = amounts[i]*80;
        }
        if(amounts[i]*60 !== 0) {
            multipliedArray["9"][i] = amounts[i]*90;
        }
        if(amounts[i]*100 !== 0) {
            multipliedArray["10"][i] = amounts[i]*100;
        }
    }

    const { adminID, ticketsID } = bets[0];
    let type = 'processGameBetsWithZeroRandomAndMin';

    return {
        multipliedArray,
        percAmount,
        adminID,
        ticketsID,
        type
    };
};

function selectRandomAmount(validAmounts, percAmount, adminID, ticketsID, type) {
    console.log("validAmounts in Random", validAmounts);

    if (type === 'processGameBets') {
        // Existing logic for processGameBets
        let eligibleEntries = [];
        let zeroEntries = [];

        for (let key in validAmounts) {
            if (Array.isArray(validAmounts[key])) {
                validAmounts[key].forEach((value, index) => {
                    if (value !== 0 && value <= percAmount) {
                        eligibleEntries.push({ key, index, value });
                    } else if (value === 0) {
                        zeroEntries.push({ key, index, value });
                    }
                });
            }
        }

        console.log("Eligible entries:", eligibleEntries);
        console.log("Zero entries:", zeroEntries);

        let randomEntry;

        if (eligibleEntries.length > 0) {
            randomEntry = eligibleEntries[Math.floor(Math.random() * eligibleEntries.length)];
        } else if (zeroEntries.length > 0) {
            console.log("No eligible entries found within percAmount. Selecting a zero entry.");
            randomEntry = zeroEntries[Math.floor(Math.random() * zeroEntries.length)];
        } else {
            console.log("No eligible entries or zero entries found. Returning null.");
            return null;
        }

        return { randomEntry, adminID, ticketsID };
    } else if (type === 'processGameBetsWithMinAmount') {
        // Logic for always selecting the minimum amount
        let minEntry = null;

        for (let key in validAmounts) {
            if (Array.isArray(validAmounts[key])) {
                validAmounts[key].forEach((value, index) => {
                    if (value !== 0 && (minEntry === null || value < minEntry.value)) {
                        minEntry = { key, index, value };
                    }
                });
            }
        }

        if (minEntry) {
            console.log("Selected minimum entry:", minEntry);
            return { randomEntry: minEntry, adminID, ticketsID };
        } else {
            console.log("No non-zero entries found. Returning null.");
            return null;
        }
    } else if (type === 'processGameBetsWithZeroRandomAndMin') {
        // Logic for prioritizing zero amounts, then minimum if no zero exists
        let zeroEntries = [];
        let minEntry = null;

        for (let key in validAmounts) {
            if (Array.isArray(validAmounts[key])) {
                validAmounts[key].forEach((value, index) => {
                    if (value === 0) {
                        zeroEntries.push({ key, index, value });
                    } else if (minEntry === null || value < minEntry.value) {
                        minEntry = { key, index, value };
                    }
                });
            }
        }

        let selectedEntry;

        if (zeroEntries.length > 0) {
            console.log("Zero entries found. Selecting a random zero entry.");
            selectedEntry = zeroEntries[Math.floor(Math.random() * zeroEntries.length)];
        } else if (minEntry) {
            console.log("No zero entries found. Selecting the minimum entry.");
            selectedEntry = minEntry;
        } else {
            console.log("No entries found. Returning null.");
            return null;
        }

        return { randomEntry: selectedEntry, adminID, ticketsID };
    } else {
        console.log("Invalid type specified. Returning null.");
        return null;
    }
}

// Function to save the selected card data
const saveSelectedCard = async (selectedAmount, gameId) => {
    // Check if selectedAmount is empty
    if (Object.keys(selectedAmount).length === 0) {
        console.log("selected amounts is empty.");
        return {}; // Return an empty object if validAmounts is empty
    }

    const selectedCardData = {
        gameId: gameId,
        cardId: selectedAmount.cardId,
        multiplier: selectedAmount.multiplier,
        amount: selectedAmount.amount,
        adminID: selectedAmount.adminID,
        ticketsID: selectedAmount.ticketsID,
    };

    const selectedCard = new SelectedCard(selectedCardData);
    await selectedCard.save();
};

// Controller function to fetch all selected cards
export const getAllSelectedCards = async (req, res) => {
    try {
        // Retrieve all selected cards from the database
        const selectedCards = await SelectedCard.find();

        // Send the selected cards as a response
        res.status(200).json({
            success: true,
            data: selectedCards,
        });
    } catch (error) {
        console.error('Error fetching selected cards:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching selected cards',
        });
    }
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
export const resetTimer = async () => {
    let timer = await Timer.findOne({ timerId: 'game-timer' });

    if (timer) {
        timer.remainingTime = 100;  // Reset timer to 30 seconds
        await timer.save();

        // Start the timer again after resetting
        startTimer();
        socketClient.emit('timerUpdate', { remainingTime: timer.remainingTime, isRunning: true });
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

const calculateAdminResults = async (game, winningCard) => {
    console.log("game", game);
    console.log("winningCard", winningCard);
    
    
    const winnerMultiplier = {
        "1": 10,
        "2": 20,
        "3": 30,
        "4": 40,
        "5": 50,
        "6": 60,
        "7": 70,
        "8": 80,
        "9": 90,
        "10": 100
    };
    const adminResults = {
        winners: [],
        losers: []
    };
    for (const bet of game.Bets) {
        const admin = await Admin.findOne({ adminId: bet.adminID });
        if (!admin) continue;
        let adminResult = {
            adminId: bet.adminID,
            gameId: game.GameId,
            betAmount: 0,
            winAmount: 0,
            winningCardAmount: 0,
            ticketsID: bet.ticketsID,
            status: 'lose' // Default status
        };
        for (const card of bet.card) {
            adminResult.betAmount += card.Amount;
            if (card.cardNo === winningCard.cardId) {
                adminResult.winningCardAmount = card.Amount;
                const multiplier = winnerMultiplier[winningCard.multiplier] || 1;
                adminResult.winAmount = card.Amount * multiplier;
                adminResult.ticketsID = bet.ticketsID;
                adminResult.status = 'win'; // Update status if it's a winning card
            }
        }
        if (adminResult.status === 'win') {
            adminResults.winners.push(adminResult);
        } else {
            adminResults.losers.push(adminResult);
        }
        // console.log(adminResult);
    }
    console.log("adminResults", adminResults);
    
    return adminResults;
};

// New API endpoint for admin game results
export const getAdminGameResults = async (req, res) => {
    try {
        const { gameId } = req.params;
        const game = await Game.findOne({ GameId: gameId }).lean();
        if (!game) {
            return res.status(404).json({ message: 'Game not found' });
        }
        const selectedCard = await SelectedCard.findOne({ gameId: gameId }).lean();
        if (!selectedCard) {
            return res.status(404).json({ message: 'Selected card not found for this game' });
        }
        const adminResults = await calculateAdminResults(game, selectedCard);
        // console.log(adminResults);
        // Save results to MongoDB
        const newAdminGameResult = new AdminGameResult({
            gameId: game.GameId,
            winningCard: {
                cardId: selectedCard.cardId,
                multiplier: selectedCard.multiplier,
                amount: selectedCard.amount,
            },
            winners: adminResults.winners,
            losers: adminResults.losers
        });
        await newAdminGameResult.save();
        res.status(200).json({
            success: true,
            message: 'Admin game results calculated and saved successfully',
            data: {
                gameId: game.GameId,
                winningCard: selectedCard,
                adminResults: adminResults
            }
        });
    } catch (error) {
        console.error('Error processing and saving admin game results:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing and saving admin game results',
            error: error.message
        });
    }
};

export const getAdminResults = async (req, res) => {
    try {
        const { adminId } = req.params;
        // Verify if the admin exists
        const admin = await Admin.findOne({ adminId });
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }
        // Find all game results where this admin is either a winner or a loser
        const adminGameResults = await AdminGameResult.find({
            $or: [
                { 'winners.adminId': adminId },
                { 'losers.adminId': adminId }
            ]
        }).sort({ createdAt: -1 }); // Sort by most recent games first
        // Process the results to only include this admin's data
        const processedResults = adminGameResults.map(gameResult => {
            const adminData = gameResult.winners.find(winner => winner.adminId === adminId) ||
                gameResult.losers.find(loser => loser.adminId === adminId);
            return {
                gameId: gameResult.gameId,
                adminResult: {
                    // ...adminData,
                    adminData: adminData._doc,
                    status: adminData ? (gameResult.winners.includes(adminData) ? 'win' : 'lose') : null
                },
                playedAt: gameResult.createdAt
            };
        });
        res.status(200).json({
            success: true,
            message: 'Admin game results retrieved successfully',
            data: {
                adminId: adminId,
                gameResults: processedResults
            }
        });
    } catch (error) {
        console.error('Error retrieving admin game results:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving admin game results',
            error: error.message
        });
    }
};

export const claimWinnings = async (req, res) => {
    try {
        const { adminId, gameId, ticketsID } = req.body;
        // Verify if the admin exists
        const admin = await Admin.findOne({ adminId });
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }
        // Find the specific game result
        const gameResult = await AdminGameResult.findOne({ gameId });
        if (!gameResult) {
            return res.status(404).json({
                success: false,
                message: 'Game result not found'
            });
        }
        // Check if the admin is a winner in this game and has the specified ticket
        const winner = gameResult.winners.find(w => w.adminId === adminId && w.ticketsID === ticketsID);
        if (!winner) {
            return res.status(400).json({
                success: false,
                message: 'Admin is not a winner with the specified ticket in this game'
            });
        }
        // Check if the admin has already claimed this ticket
        if (winner.status === 'claimed') {
            return res.status(400).json({
                success: false,
                message: 'You have already claimed this ticket'
            });
        }
        // Update admin's wallet
        admin.wallet += winner.winAmount;
        await admin.save();
        // Mark the ticket as claimed for this admin
        winner.status = 'claimed';
        await gameResult.save();
        res.status(200).json({
            success: true,
            message: 'Winnings claimed successfully',
            data: {
                adminId: admin.adminId,
                gameId: gameResult.gameId,
                ticketId: winner.ticketId,
                claimedAmount: winner.winAmount,
                newWalletBalance: admin.wallet
            }
        });
    } catch (error) {
        console.error('Error claiming winnings:', error);
        res.status(500).json({
            success: false,
            message: 'Error claiming winnings',
            error: error.message
        });
    }
};

export const processAllSelectedCards = async (req, res) => {
    try {
        // Fetch all unique gameIds from SelectedCard collection
        const uniqueGameIds = await SelectedCard.distinct('gameId');
        if (uniqueGameIds.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No games found with selected cards.",
            });
        }
        const processedGames = await Promise.all(uniqueGameIds.map(async (gameId) => {
            // Fetch all selected cards for this game
            const selectedCards = await SelectedCard.find({ gameId });
            // Process each selected card
            const processedCards = await Promise.all(selectedCards.map(async (card) => {
                const newCard = new SelectedCard({
                    gameId: card.gameId,
                    cardId: card.cardId,
                    multiplier: card.multiplier,
                    amount: card.amount,
                });
                await newCard.save();
                return newCard;
            }));
            // Update game status
            const currentGame = await Game.findOne({ GameId: gameId });
            if (currentGame) {
                currentGame.status = 'completed';
                await currentGame.save();
            }
            // Calculate and store admin winnings
            await calculateAndStoreAdminWinnings(gameId);
            // Store recent winning card and keep only latest 10
            const winningCard = processedCards[Math.floor(Math.random() * processedCards.length)];
            await saveLatest10WinningCards(gameId, winningCard);
            // Fetch the saved winning card to return in the response
            const recentWinningCard = await RecentWinningCard.findOne({ gameId }).sort({ createdAt: -1 });
            return {
                gameId,
                winningCard: recentWinningCard
            };
        }));
        // Send the response with all processed games and winning cards
        res.status(200).json({
            success: true,
            message: "All selected cards processed and saved successfully. Only the latest 10 winning cards are kept.",
            processedGames: processedGames,
        });
    } catch (error) {
        console.error('Error in processAllSelectedCards:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing request',
            error: error.message,
        });
    }
};

// Function to save the latest winning card and keep only the latest 10
async function saveLatest10WinningCards(gameId, winningCard) {
    try {
        const newWinningCard = new RecentWinningCard({
            gameId: gameId,
            cardId: winningCard.cardId,
            amount: winningCard.amount,
            multiplier: parseFloat(winningCard.multiplier), // Convert to Number if it's a String
        });
        await newWinningCard.save();
        // Get total count of documents
        const totalCount = await RecentWinningCard.countDocuments();
        // If there are more than 10 documents, remove the oldest one
        if (totalCount > 10) {
            const oldestDocument = await RecentWinningCard.findOne().sort({ createdAt: 1 });
            if (oldestDocument) {
                await RecentWinningCard.deleteOne({ _id: oldestDocument._id });
            }
        }
    } catch (error) {
        console.error('Error in saveLatest10WinningCards:', error);
        throw error;
    }
}