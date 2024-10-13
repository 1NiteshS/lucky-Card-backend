import mongoose from 'mongoose';

const SelectedCardSchema = new mongoose.Schema({
    gameId: { type: String, required: true },
    cardId: { type: String, required: true },
    multiplier: { type: String, required: true },
    amount: { type: Number, required: true },
    // createdAt: { type: Date, default: Date.now }
}, {timestamps: true});

export default mongoose.model('SelectedCard', SelectedCardSchema);