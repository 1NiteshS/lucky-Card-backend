// import mongoose from 'mongoose';

// // Bet schema to define tickets and cards
// const betSchema = new mongoose.Schema({
//     Ticket: {
//         card1: [Number],
//         card2: [Number],
//         card3: [Number]
//     }
// });

// // Game schema to define AdminId, GameId, and Bet structure
// const gameSchema = new mongoose.Schema({
//     AdminId: Number,
//     GameId: Number,
//     Bet: {
//         Ticket1: betSchema,
//         Ticket2: betSchema,
//         Ticket3: betSchema
//     }
// });

// // Export the Game model
// export default mongoose.model('Game', gameSchema);

import mongoose from 'mongoose';

// Bet schema to define a ticket with card sets
const ticketSchema = new mongoose.Schema({
    card1: [Number],
    card2: [Number],
    card3: [Number]
});

// Bet schema to define tickets under a bet
const betSchema = new mongoose.Schema({
    Ticket1: ticketSchema,
    Ticket2: ticketSchema,
    Ticket3: ticketSchema
});

// GameBet schema to define the bets placed by admins for a specific game
const gameBetSchema = new mongoose.Schema({
    AdminId: Number,
    Bet: betSchema
});

// Game schema to define AdminId, GameId, and multiple bets for a game
const gameSchema = new mongoose.Schema({
    GameId: Number,
    Bets: [gameBetSchema]  // An array of game bets
});

// Export the Game model
export default mongoose.model('Game', gameSchema);
