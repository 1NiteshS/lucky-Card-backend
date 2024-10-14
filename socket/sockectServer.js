// import { Server } from "socket.io";

// let socketClient;

// async function startSocket  (httpServer) {
//     const server = new Server({cors: {
//         origin: '*',
//         methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
//         credentials: true
//     }});

//     server.attach(httpServer);

//     server.on('connection', (socket) => {
//         socketClient = socket;
//         console.log('a user connected');
//     });

// }

// export {socketClient, startSocket};

// import { Server } from "socket.io";
// import Game from '../models/gameModel.js';
// let timer = {
//     remainingTime: 30,
//     isRunning: false
// };
// let timerInterval;
// const startTimer = (socket) => {
//     if (!timer.isRunning) {
//         timer.isRunning = true;
//         timer.remainingTime = 30;
//         broadcastTimerUpdate(socket);
//         timerInterval = setInterval(() => {
//             if (timer.remainingTime > 0) {
//                 timer.remainingTime -= 1;
//                 broadcastTimerUpdate(socket);
//             } else {
//                 // Timer hit zero, stop the timer
//                 clearInterval(timerInterval);
//                 timer.isRunning = false;
//                 // Create a new GameId dynamically when the timer hits zero
//                 const newGameNumber = createNewGame();
//                 // Emit timer stop event
//                 broadcastTimerUpdate(socket);
//                 // Reset the timer and start it again
//                 resetTimer(socket);
//             }
//         }, 1000);
//     }
// };
// const resetTimer = (socket) => {
//     timer.remainingTime = 30;
//     timer.isRunning = true;
//     broadcastTimerUpdate(socket);
//     startTimer(socket);
// };
// const broadcastTimerUpdate = (socket) => {
//     socket.emit('timerUpdate', { remainingTime: timer.remainingTime, isRunning: timer.isRunning });
//     socket.broadcast.emit('timerUpdate', { remainingTime: timer.remainingTime, isRunning: timer.isRunning });
// };
// const createNewGame = async() => {
//     const lastGame = await Game.findOne().sort({ createdAt: -1 }); // Get the last game

//     const newGame = new Game({
//         Bets: []  // Initialize an empty array for the bets
//     });
//     await newGame.save();

//     // return lastGame;
//     // This is a placeholder function
//     return Math.floor(Math.random() * 1000) + 1;
// };
// const startSocket = (httpServer) => {
//     const io = new Server(httpServer, {
//         cors: {
//             origin: '*'
//         }
//     });
//     io.on('connection', (socket) => {
//         console.log('A user connected');
//         // Send current timer state to newly connected client
//         socket.emit('timerUpdate', { remainingTime: timer.remainingTime, isRunning: timer.isRunning });
//         socket.on('startTimer', () => {
//             startTimer(socket);
//         });
//         socket.on('disconnect', () => {
//             console.log('User disconnected');
//         });
//     });
// };

// export { startSocket };







// import Game from '../models/gameModel.js';
// import { Server } from "socket.io";
// import { calculateAmounts } from '../controllers/cardController.js';

// let timer = {
//     remainingTime: 100,
//     isRunning: false
// };

// let timerInterval;

// const startTimer = (socket) => {
//     if (!timer.isRunning) {
//         timer.isRunning = true;
//         timer.remainingTime = 100;
//         broadcastTimerUpdate(socket);

//         timerInterval = setInterval(async() => {
//             if (timer.remainingTime > 0) {
                
//                 timer.remainingTime -= 1;

//                 const calculateAmounts = await calculateAmounts(timer.remainingTime);

//                 broadcastTimerUpdate(socket, null, calculateAmounts);
//             } else {
//                 // Timer hit zero, stop the timer
//                 clearInterval(timerInterval);
//                 timer.isRunning = false;
//                 // Create a new GameId dynamically when the timer hits zero
//                 const newGameId = createNewGame();
//                 // Emit timer stop event and new GameId
//                 broadcastTimerUpdate(socket, newGameId);
//                 // Reset and restart the timer automatically
//                 setTimeout(() => {
//                     resetAndRestartTimer(socket);
//                 }, 1000); // Wait for 1 second before restarting
//             }
//         }, 1000);
//     }
// };

// const resetAndRestartTimer = (socket) => {
//     timer.remainingTime = 100;
//     timer.isRunning = false;
//     broadcastTimerUpdate(socket);
//     startTimer(socket);
// };

// const broadcastTimerUpdate = (socket, newGameId = null, calculateAmounts = null) => {
//     const updateData = {
//         remainingTime: timer.remainingTime,
//         isRunning: timer.isRunning
//     };
//     if (newGameId !== null) {
//         updateData.newGameId = newGameId;
//     }
//     if (calculateAmounts !== null) {
//         updateData.calculateAmounts = calculateAmounts;
//     }
//     socket.emit('timerUpdate', updateData);
//     socket.broadcast.emit('timerUpdate', updateData);
// };

// const createNewGame = async () => {
//     // Implement the logic to create a new game ID
//     const lastGame = Game.findOne().sort({ createdAt: -1 }); // Get the last game

//     const newGame = new Game({
//         Bets: []  // Initialize an empty array for the bets
//     });
//     awaitnewGame.save();

//     // This is a placeholder function
//     return newGame._id.toString();
// };

// const startSocket = (httpServer) => {
//     const io = new Server(httpServer, {
//         cors: {
//             origin: '*'
//         }
//     });
//     io.on('connection', (socket) => {
//         console.log('A user connected');
//         // Send current timer state to newly connected client
//         socket.emit('timerUpdate', { remainingTime: timer.remainingTime, isRunning: timer.isRunning });

//         socket.on('startTimer', () => {
//             startTimer(socket);
//         });

//         socket.on('disconnect', () => {
//             console.log('User disconnected');
//         });
//     });
// };
// export { startSocket };








import Game from '../models/gameModel.js';
import { Server } from "socket.io";
import { calculateAmounts as calcAmounts } from '../controllers/cardController.js';

let timer = {
    remainingTime: 15,
    isRunning: false
};

const CALCULATION_START_TIME = 10; 

let timerInterval;
// Start and manage the timer
const startTimer = (socket) => {
    if (!timer.isRunning) {
        timer.isRunning = true;
        timer.remainingTime = 15;
        broadcastTimerUpdate(socket);

        timerInterval = setInterval(async () => {
            try {
                if (timer.remainingTime > 0) {
                    timer.remainingTime -= 1;
                    console.log(timer.remainingTime);
                    
                    
                    // Check if calculations should start
                    if (timer.remainingTime == CALCULATION_START_TIME) {
                        console.log('Calculating amounts...');
                        
                        const calculatedAmounts = await calcAmounts(timer.remainingTime);
                        console.log(calculatedAmounts);
                        
                        
                        broadcastTimerUpdate(socket, null, calculatedAmounts);
                    } else {
                        broadcastTimerUpdate(socket);  // Just update the timer without amounts
                    }

                } else {
                    // Timer hit zero, stop the timer
                    clearInterval(timerInterval);
                    timer.isRunning = false;

                    // Create a new GameId when the timer hits zero
                    const newGameId = await createNewGame();

                    // Emit timer stop event and the new GameId
                    broadcastTimerUpdate(socket, newGameId);

                    // Reset and restart the timer after a short delay
                    setTimeout(() => {
                        resetAndRestartTimer(socket);
                    }, 1000); // Wait 1 second before restarting
                }
            } catch (error) {
                console.error('Error during timer tick:', error);
                clearInterval(timerInterval);
                timer.isRunning = false;
            }
        }, 1000);  // The timer ticks every second
    }
};

// Helper to reset and restart the timer
const resetAndRestartTimer = (socket) => {
    timer.remainingTime = 15;
    timer.isRunning = false;
    broadcastTimerUpdate(socket);
    startTimer(socket);
};

const broadcastTimerUpdate = (socket, newGameId = null, calculatedAmounts = null) => {
    const updateData = {
        remainingTime: timer.remainingTime,
        isRunning: timer.isRunning
    };
    if (newGameId !== null) {
        updateData.newGameId = newGameId;
    }
    if (calculatedAmounts !== null) {
        updateData.calculatedAmounts = calculatedAmounts;
    }
    socket.emit('timerUpdate', updateData);
    socket.broadcast.emit('timerUpdate', updateData);
};

const createNewGame = async () => {
    // Implement the logic to create a new game ID
    const lastGame = await Game.findOne().sort({ createdAt: -1 }); // Get the last game

    const newGame = new Game({
        Bets: []  // Initialize an empty array for the bets
    });
    await newGame.save();

    // This is a placeholder function
    return newGame._id.toString();
};

const startSocket = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: '*'
        }
    });
    io.on('connection', (socket) => {
        console.log('A user connected');
        // Send current timer state to newly connected client
        socket.emit('timerUpdate', { remainingTime: timer.remainingTime, isRunning: timer.isRunning });

        socket.on('startTimer', () => {
            startTimer(socket);
        });

        socket.on('disconnect', () => {
            console.log('User disconnected');
        });
    });
};

export { startSocket };
