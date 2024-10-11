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

// Schema for each ticket (12 cards allowed per ticket)
const ticketSchema = new mongoose.Schema({
    ticketId: { type: String, required: true },
    cards: {
        card1: { type: Number, default: 0 },
        card2: { type: Number, default: 0 },
        card3: { type: Number, default: 0 },
        card4: { type: Number, default: 0 },
        card5: { type: Number, default: 0 },
        card6: { type: Number, default: 0 },
        card7: { type: Number, default: 0 },
        card8: { type: Number, default: 0 },
        card9: { type: Number, default: 0 },
        card10: { type: Number, default: 0 },
        card11: { type: Number, default: 0 },
        card12: { type: Number, default: 0 }
    }
});

// Schema for each admin (can have N tickets, stored as a map)
const adminSchema = new mongoose.Schema({
    adminId: { type: String, required: true },
    tickets: [ticketSchema]  // Use Map for tickets, dynamically keyed by ticketId
});

// Schema for each game (can have N admins, stored as a map)
const gameSchema = new mongoose.Schema({
    gameId: { type: String, required: true },
    admins: [adminSchema ]  // Use Map for admins, dynamically keyed by adminId
});

// Main schema for all games (stored as a map)
const gamesSchema = new mongoose.Schema({
    games: [gameSchema]  // Use Map for games, dynamically keyed by gameId
});

// Export the main model
export default mongoose.model('Games', gamesSchema);








// import mongoose from 'mongoose';

// // Bet schema to define a ticket with card sets
// const ticketSchema = new mongoose.Schema({
//     card1: Number,
//     card2: Number,
//     card3: Number
// });

// // Bet schema to define tickets under a bet
// const betSchema = new mongoose.Schema({
//     Ticket1: [ticketSchema],
//     Ticket2: [ticketSchema],
//     Ticket3: [ticketSchema]
// });

// // GameBet schema to define the bets placed by admins for a specific game
// const gameBetSchema = new mongoose.Schema({
//     AdminId: Number,
//     Bet: [betSchema]
// });

// // Game schema to define AdminId, GameId, and multiple bets for a game
// const gameSchema = new mongoose.Schema({
//     GameNo: Number,
//     Bets: [gameBetSchema]  // An array of game bets
// });

// // Export the Game model
// export default mongoose.model('Game', gameSchema);


// import mongoose from 'mongoose';

// // Schema for a single ticket with card sets
// const ticketSchema = new mongoose.Schema({
//     ticketId: String,  // Add a ticketId for unique identification
//     card1: Number,
//     card2: Number,
//     card3: Number
// });

// // Bet schema to define dynamic tickets under a bet
// const betSchema = new mongoose.Schema({
//     tickets: [ticketSchema]  // An array of tickets (dynamic)
// });

// // GameBet schema to define the bets placed by admins for a specific game
// const gameBetSchema = new mongoose.Schema({
//     AdminId: Number,
//     Bet: betSchema  // A single bet object that holds dynamic tickets
// });

// // Game schema to define AdminId, GameId, and multiple bets for a game
// const gameSchema = new mongoose.Schema({
//     GameNo: Number,
//     Bets: [gameBetSchema]  // An array of game bets
// });

// // Export the Game model
// export default mongoose.model('Game', gameSchema);










// import mongoose from 'mongoose';

// // Bet schema to define a ticket with card sets
// const ticketSchema = new mongoose.Schema({
//     card1: [Number],
//     card2: [Number],
//     card3: [Number]
// });

// // Bet schema to define tickets under a bet
// const betSchema = new mongoose.Schema({
//     AdminId: Number,
//     Bet: ticketSchema
// });

// // Game schema to define AdminId, GameNo, and multiple bets for a game
// const gameSchema = new mongoose.Schema({
//     GameNo: Number,   // Incrementing game number
//     Bets: [betSchema]  // An array of bets per game
// });

// Export the Game model
// export default mongoose.model('Game', gameSchema);




// const gameSchema = new mongoose.Schema({
//     gameId: {
//         type: String,
//         required: true,
//         unique: true
//     },
//     status: {
//         type: String,
//         enum: ['active', 'completed'],
//         default: 'active'
//     },
//     startTime: {
//         type: Date,
//         required: true
//     },
//     endTime: {
//         type: Date
//     },
//     bets: [{
//         adminId: {
//             type: String,
//             required: true
//         },
//         betTime: {
//             type: Date,
//             required: true
//         },
//         tickets: [{
//             ticketId: {
//                 type: String,
//                 required: true
//             },
//             cards: {
//                 card1: [Number],
//                 card2: [Number],
//                 card3: [Number]
//             },
//             status: {
//                 type: String,
//                 enum: ['active', 'won', 'lost'],
//                 default: 'active'
//             }
//         }]
//     }]
// });

// export default mongoose.model('Game', gameSchema);