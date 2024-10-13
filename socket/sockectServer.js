import { Server } from "socket.io";

let socketClient;

async function startSocket  (httpServer) {
    const server = new Server({cors: {
        origin: '*'
    }});

    server.attach(httpServer);

    server.on('connection', (socket) => {
        socketClient = socket;
        console.log('a user connected');
    });
}

export {socketClient, startSocket};