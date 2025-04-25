const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'https://ilucas64.github.io', // Substitua pelo URL do seu GitHub Pages
        methods: ['GET', 'POST']
    }
});

const rooms = {};

io.on('connection', (socket) => {
    console.log('Usuário conectado:', socket.id);

    socket.on('createRoom', () => {
        const roomId = Math.random().toString(36).substr(2, 9);
        rooms[roomId] = { 
            players: [socket.id], 
            colors: { [socket.id]: 'white' },
            board: [
                ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
                ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
                ['', '', '', '', '', '', '', ''],
                ['', '', '', '', '', '', '', ''],
                ['', '', '', '', '', '', '', ''],
                ['', '', '', '', '', '', '', ''],
                ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
                ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
            ],
            currentPlayer: 'white'
        };
        socket.join(roomId);
        socket.emit('roomCreated', { roomId });
        console.log(`Sala criada: ${roomId}`);
    });

    socket.on('joinRoom', ({ roomId }) => {
        if (rooms[roomId] && rooms[roomId].players.length < 2) {
            rooms[roomId].players.push(socket.id);
            rooms[roomId].colors[socket.id] = 'black';
            socket.join(roomId);
            socket.emit('roomJoined', { roomId, color: 'black' });
            io.to(roomId).emit('playerJoined');
            console.log(`Usuário ${socket.id} entrou na sala ${roomId}`);
        } else {
            socket.emit('roomFull');
            console.log(`Tentativa de entrar em sala cheia/inexistente: ${roomId}`);
        }
    });

    socket.on('move', ({ roomId, move }) => {
        if (rooms[roomId]) {
            const { from, to } = move;
            const piece = rooms[roomId].board[from[0]][from[1]];
            rooms[roomId].board[to[0]][to[1]] = piece;
            rooms[roomId].board[from[0]][from[1]] = '';
            socket.to(roomId).emit('move', { move });
        }
    });

    socket.on('updateTurn', ({ roomId, currentPlayer }) => {
        if (rooms[roomId]) {
            rooms[roomId].currentPlayer = currentPlayer;
            socket.to(roomId).emit('updateTurn', { currentPlayer });
        }
    });

    socket.on('reset', ({ roomId }) => {
        if (rooms[roomId]) {
            rooms[roomId].board = [
                ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
                ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
                ['', '', '', '', '', '', '', ''],
                ['', '', '', '', '', '', '', ''],
                ['', '', '', '', '', '', '', ''],
                ['', '', '', '', '', '', '', ''],
                ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
                ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
            ];
            rooms[roomId].currentPlayer = 'white';
            io.to(roomId).emit('reset');
        }
    });

    socket.on('gameOver', ({ roomId, winner }) => {
        if (rooms[roomId]) {
            io.to(roomId).emit('gameOver', { winner });
        }
    });

    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            const room = rooms[roomId];
            const playerIndex = room.players.indexOf(socket.id);
            if (playerIndex !== -1) {
                room.players.splice(playerIndex, 1);
                delete room.colors[socket.id];
                if (room.players.length === 0) {
                    delete rooms[roomId];
                } else {
                    io.to(roomId).emit('playerDisconnected', { message: 'O outro jogador desconectou.' });
                }
                console.log(`Usuário ${socket.id} desconectado da sala ${roomId}`);
            }
        }
    });
});

server.listen(process.env.PORT || 3000, () => {
    console.log(`Servidor rodando na porta ${process.env.PORT || 3000}`);
});