import dotenv from 'dotenv';
import express from 'express';
import connectDB from './config/database.js';
import cardRoutes from './routes/cardRoutes.js';
import http from 'http';
import { Server } from 'socket.io';
import { startTimer, resetTimer } from './controllers/cardController.js';
import Timer from './models/timerModel.js';

import cors from 'cors';

// import Timer from './models/Timer';
import superAdminRoutes from './routes/superAdminRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);


// Connect to the database
connectDB();

app.use(cors({
    origin: '*',  // Allows all origins; for production, specify allowed origins
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
    req.io = io; // Attach io instance to the request object
    next();
});

// // Define routes
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/admin", adminRoutes);
app.use('/api/cards', cardRoutes);

// Socket.io integration
io.on('connection', (socket) => {
    console.log('A user connected');

    // Client requests the current timer state
    socket.on('getTimer', async () => {
        const timer = await Timer.findOne({ timerId: 'game-timer' });
        if (timer) {
            socket.emit('timerUpdate', {
                remainingTime: timer.remainingTime,
                isRunning: timer.isRunning
            });
        } else {
            socket.emit('error', { message: 'No active timer found' });
        }
    });

    // Start timer when a client connects (if needed)
    socket.on('startTimer', () => {
        startTimer(io);  // Pass io instance to broadcast changes
    });

    // Reset timer on client request
    socket.on('resetTimer', () => {
        resetTimer(io);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
