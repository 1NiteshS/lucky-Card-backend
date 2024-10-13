import dotenv from 'dotenv';
import express from 'express';
import connectDB from './config/database.js';
import cardRoutes from './routes/cardRoutes.js';
import http from 'http';
import { Server } from 'socket.io';
// import { startTimer, resetTimer } from './controllers/cardController.js';
// import Timer from './models/timerModel.js';

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
