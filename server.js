const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // Permite conexões de qualquer origem (ajuste para produção)
        methods: ['GET', 'POST']
    }
});

const rooms = {};

io.on('connection', (socket) => {
    console.log('Usuário conectado:', socket.id);

    socket.on('createRoom', () => {
        const roomId = Math.random().toString(36).substr(2, 9);
        rooms[roomId] = { players: [socket.id], colors: { [socket.id]: 'white' } };
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
            io.to(roomId).emit('roomStatus', { message: 'Jogo iniciado!' });
            console.log(`Usuário ${socket.id} entrou na sala ${roomId}`);
        } else {
            socket.emit('roomFull');
        }
    });

    socket.on('move', ({ roomId, move }) => {
        socket.to(roomId).emit('move', { move });
    });

    socket.on('reset', ({ roomId }) => {
        socket.to(roomId).emit('reset');
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
                    io.to(roomId).emit('roomStatus', { message: 'O outro jogador desconectou.' });
                }
                console.log(`Usuário ${socket.id} desconectado da sala ${roomId}`);
            }
        }
    });
});

server.listen(process.env.PORT || 3000, () => {
    console.log(`Servidor rodando na porta ${process.env.PORT || 3000}`);
});