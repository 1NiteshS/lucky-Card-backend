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