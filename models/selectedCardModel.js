import mongoose from 'mongoose';

const SelectedCardSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    cardId: { type: String, required: true },
    multiplier: { type: String, required: true },
    amount: { type: Number, required: true },
    originalAmount: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('SelectedCard', SelectedCardSchema);3