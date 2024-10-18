import mongoose from 'mongoose';

// const SelectedCardSchema = new mongoose.Schema({
//     gameId: { type: String, required: true },
//     cardId: { type: String, required: true },
//     multiplier: { type: String, required: true },
//     amount: { type: Number, required: true },
//     adminID: { type: Number, required: true },
//     ticketsID: { type: Number, required: true },
//     // createdAt: { type: Date, default: Date.now }
// }, {timestamps: true});

// export default mongoose.model('SelectedCard', SelectedCardSchema);

const SelectedCardSchema = new mongoose.Schema({
    gameId: { type: String },
    cardId: { type: String },
    multiplier: { type: Number}, // Use Number for multiplier
    amount: { type: Number},
    adminID: { type: String}, // Change to String
    ticketsID: { type: String }, // Change to String
}, { timestamps: true });

export default mongoose.model('SelectedCard', SelectedCardSchema);