import mongoose from 'mongoose';

// Define the combined game schema
const gameSchema = new mongoose.Schema({
    gameID: {
        type: String,
        required: true,
        unique: true
    },
    gameDetails: [
        {
            adminID: {  // Corrected from "adiminID" to "adminID"
                type: String,
                required: true
            },
            ticketsID: {
                type: String,
                required: true
            },
            card: [
                {
                    cardNo: {
                        type: String,
                        required: true
                    },
                    Amount: {
                        type: Number,
                        required: true
                    }
                }
            ]
        }
    ]
});

// Create model
export default mongoose.model('Game', gameSchema);