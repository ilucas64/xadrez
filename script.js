document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('Inicializando o jogo...');
        const board = document.getElementById('board');
        const turnIndicator = document.getElementById('turn-indicator').querySelector('span');
        const statusDisplay = document.getElementById('status');
        const resetButton = document.getElementById('reset-btn');
        const gameModeSelect = document.getElementById('game-mode');
        const difficultySelect = document.getElementById('difficulty');
        const difficultyLabel = document.getElementById('difficulty-label');
        const roomSelector = document.getElementById('room-selector');
        const roomIdInput = document.getElementById('room-id');
        const joinRoomBtn = document.getElementById('join-room-btn');
        const createRoomBtn = document.getElementById('create-room-btn');
        const roomStatus = document.getElementById('room-status');
        
        if (!board) {
            console.error('Elemento #board não encontrado');
            return;
        }
        
        let selectedPiece = null;
        let currentPlayer = 'white';
        let gameState = 'playing';
        let gameMode = 'pvp';
        let difficulty = 'medium';
        let socket = null;
        let roomId = null;
        let playerColor = null;
        
        let chessBoard = [
            ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
            ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
            ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
        ];
        
        const pieceSymbols = {
            'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚',
            'P': '♙', 'N': '♘', 'B': '♗', 'R': '♖', 'Q': '♕', 'K': '♔'
        };
        
        const pieceValues = {
            'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 100,
            'P': 1, 'N': 3, 'B': 3, 'R': 5, 'Q': 9, 'K': 100
        };
        
        function initializeBoard() {
            try {
                console.log('Inicializando tabuleiro...');
                board.innerHTML = '';
                for (let row = 0; row < 8; row++) {
                    for (let col = 0; col < 8; col++) {
                        const square = document.createElement('div');
                        square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                        square.dataset.row = row;
                        square.dataset.col = col;
                        
                        const piece = chessBoard[row][col];
                        if (piece) {
                            square.textContent = pieceSymbols[piece];
                            square.dataset.piece = piece;
                            square.classList.add(piece === piece.toLowerCase() ? 'black' : 'white');
                        }
                        
                        square.addEventListener('click', () => handleSquareClick(row, col));
                        board.appendChild(square);
                    }
                }
                updateGameInfo();
                console.log('Tabuleiro inicializado com sucesso');
            } catch (error) {
                console.error('Erro ao inicializar o tabuleiro:', error);
            }
        }
        
        function handleSquareClick(row, col) {
            try {
                if (gameState !== 'playing') return;
                
                const square = document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
                const piece = chessBoard[row][col];
                
                if (selectedPiece) {
                    const [fromRow, fromCol] = selectedPiece;
                    if (isValidMove(fromRow, fromCol, row, col)) {
                        movePiece(fromRow, fromCol, row, col);
                        if (gameMode === 'online' && socket) {
                            socket.emit('move', { roomId, move: { from: [fromRow, fromCol], to: [row, col] } });
                        }
                        selectedPiece = null;
                        removeHighlightsAndSelection();
                        switchPlayer();
                        if (gameMode === 'pve' && gameState === 'playing' && currentPlayer === 'black') {
                            console.log('Acionando IA...');
                            setTimeout(makeAIMove, 500);
                        }
                    } else if (fromRow === row && fromCol === col) {
                        selectedPiece = null;
                        removeHighlightsAndSelection();
                    } else if (piece && isSameColor(piece, chessBoard[fromRow][fromCol])) {
                        selectedPiece = [row, col];
                        removeHighlightsAndSelection();
                        highlightSquare(row, col);
                        showPossibleMoves(row, col);
                    }
                } else if (piece) {
                    const isWhitePiece = piece === piece.toUpperCase();
                    const canSelect = (gameMode === 'pvp' && 
                                      ((currentPlayer === 'white' && isWhitePiece) || 
                                       (currentPlayer === 'black' && !isWhitePiece))) ||
                                     (gameMode === 'pve' && currentPlayer === 'white' && isWhitePiece) ||
                                     (gameMode === 'online' && playerColor === currentPlayer && 
                                      ((playerColor === 'white' && isWhitePiece) || 
                                       (playerColor === 'black' && !isWhitePiece)));
                    if (canSelect) {
                        selectedPiece = [row, col];
                        highlightSquare(row, col);
                        showPossibleMoves(row, col);
                    }
                }
            } catch (error) {
                console.error('Erro em handleSquareClick:', error);
            }
        }
        
        function isSameColor(piece1, piece2) {
            if (!piece1 || !piece2) return false;
            return (piece1 === piece1.toUpperCase() && piece2 === piece2.toUpperCase()) ||
                   (piece1 === piece1.toLowerCase() && piece2 === piece2.toLowerCase());
        }
        
        function movePiece(fromRow, fromCol, toRow, toCol) {
            try {
                const piece = chessBoard[fromRow][fromCol];
                chessBoard[toRow][toCol] = piece;
                chessBoard[fromRow][fromCol] = '';
                initializeBoard();
                checkGameState();
            } catch (error) {
                console.error('Erro em movePiece:', error);
            }
        }
        
        function isValidMove(fromRow, fromCol, toRow, toCol) {
            try {
                const piece = chessBoard[fromRow][fromCol];
                if (!piece) return false;
                
                const targetPiece = chessBoard[toRow][toCol];
                if (targetPiece && isSameColor(piece, targetPiece)) return false;
                
                const dx = Math.abs(toCol - fromCol);
                const dy = Math.abs(toRow - fromRow);
                
                switch (piece.toLowerCase()) {
                    case 'p':
                        const direction = piece === 'p' ? 1 : -1;
                        if (fromCol === toCol && !targetPiece) {
                            if (toRow === fromRow + direction) return true;
                            if ((piece === 'p' && fromRow === 1) || (piece === 'P' && fromRow === 6)) {
                                if (toRow === fromRow + 2 * direction && !chessBoard[fromRow + direction][fromCol]) {
                                    return true;
                                }
                            }
                        }
                        if (dx === 1 && toRow === fromRow + direction && targetPiece) return true;
                        break;
                    case 'r':
                        return (fromRow === toRow || fromCol === toCol) && isPathClear(fromRow, fromCol, toRow, toCol);
                    case 'n':
                        return (dx === 1 && dy === 2) || (dx === 2 && dy === 1);
                    case 'b':
                        return dx === dy && isPathClear(fromRow, fromCol, toRow, toCol);
                    case 'q':
                        return (dx === dy || fromRow === toRow || fromCol === toCol) && isPathClear(fromRow, fromCol, toRow, toCol);
                    case 'k':
                        return dx <= 1 && dy <= 1;
                }
                return false;
            } catch (error) {
                console.error('Erro em isValidMove:', error);
                return false;
            }
        }
        
        function isPathClear(fromRow, fromCol, toRow, toCol) {
            try {
                const rowStep = toRow === fromRow ? 0 : (toRow > fromRow ? 1 : -1);
                const colStep = toCol === fromCol ? 0 : (toCol > fromCol ? 1 : -1);
                let row = fromRow + rowStep;
                let col = fromCol + colStep;
                while (row !== toRow || col !== toCol) {
                    if (chessBoard[row][col] !== '') return false;
                    row += rowStep;
                    col += colStep;
                }
                return true;
            } catch (error) {
                console.error('Erro em isPathClear:', error);
                return false;
            }
        }
        
        function showPossibleMoves(row, col) {
            try {
                for (let r = 0; r < 8; r++) {
                    for (let c = 0; c < 8; c++) {
                        if (isValidMove(row, col, r, c)) {
                            const square = document.querySelector(`.square[data-row="${r}"][data-col="${c}"]`);
                            square.classList.add('highlight');
                        }
                    }
                }
            } catch (error) {
                console.error('Erro em showPossibleMoves:', error);
            }
        }
        
        function highlightSquare(row, col) {
            try {
                const square = document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
                square.classList.add('selected');
            } catch (error) {
                console.error('Erro em highlightSquare:', error);
            }
        }
        
        function removeHighlightsAndSelection() {
            try {
                document.querySelectorAll('.square').forEach(square => {
                    square.classList.remove('highlight');
                    square.classList.remove('selected');
                });
            } catch (error) {
                console.error('Erro em removeHighlightsAndSelection:', error);
            }
        }
        
        function switchPlayer() {
            try {
                currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
                updateGameInfo();
            } catch (error) {
                console.error('Erro em switchPlayer:', error);
            }
        }
        
        function updateGameInfo() {
            try {
                turnIndicator.textContent = currentPlayer === 'white' ? 'Brancas' : 'Pretas';
                turnIndicator.style.color = currentPlayer === 'white' ? '#333' : '#000';
            } catch (error) {
                console.error('Erro em updateGameInfo:', error);
            }
        }
        
        function checkGameState() {
            try {
                let whiteKing = false;
                let blackKing = false;
                for (let row = 0; row < 8; row++) {
                    for (let col = 0; col < 8; col++) {
                        const piece = chessBoard[row][col];
                        if (piece === 'K') whiteKing = true;
                        if (piece === 'k') blackKing = true;
                    }
                }
                if (!whiteKing) {
                    gameState = 'checkmate';
                    statusDisplay.textContent = 'Xeque-mate! Pretas vencem!';
                } else if (!blackKing) {
                    gameState = 'checkmate';
                    statusDisplay.textContent = 'Xeque-mate! Brancas vencem!';
                }
            } catch (error) {
                console.error('Erro em checkGameState:', error);
            }
        }
        
        function resetGame() {
            try {
                chessBoard = [
                    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
                    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
                    ['', '', '', '', '', '', '', ''],
                    ['', '', '', '', '', '', '', ''],
                    ['', '', '', '', '', '', '', ''],
                    ['', '', '', '', '', '', '', ''],
                    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
                    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
                ];
                selectedPiece = null;
                currentPlayer = 'white';
                gameState = 'playing';
                statusDisplay.textContent = 'Jogo em andamento';
                playerColor = null;
                initializeBoard();
                if (gameMode === 'online' && socket && roomId) {
                    socket.emit('reset', { roomId });
                }
            } catch (error) {
                console.error('Erro em resetGame:', error);
            }
        }
        
        function getAllPossibleMoves(player) {
            try {
                const moves = [];
                for (let row = 0; row < 8; row++) {
                    for (let col = 0; col < 8; col++) {
                        const piece = chessBoard[row][col];
                        if (piece && ((player === 'white' && piece === piece.toUpperCase()) ||
                                     (player === 'black' && piece === piece.toLowerCase()))) {
                            for (let r = 0; r < 8; r++) {
                                for (let c = 0; c < 8; c++) {
                                    if (isValidMove(row, col, r, c)) {
                                        moves.push({ from: [row, col], to: [r, c] });
                                    }
                                }
                            }
                        }
                    }
                }
                console.log(`Movimentos possíveis para ${player}:`, moves);
                return moves;
            } catch (error) {
                console.error('Erro em getAllPossibleMoves:', error);
                return [];
            }
        }
        
        function evaluateBoard() {
            try {
                let score = 0;
                for (let row = 0; row < 8; row++) {
                    for (let col = 0; col < 8; col++) {
                        const piece = chessBoard[row][col];
                        if (piece) {
                            const value = pieceValues[piece];
                            score += piece === piece.toUpperCase() ? value : -value;
                        }
                    }
                }
                return score;
            } catch (error) {
                console.error('Erro em evaluateBoard:', error);
                return 0;
            }
        }
        
        function minimax(depth, alpha, beta, maximizingPlayer) {
            try {
                if (depth === 0 || gameState !== 'playing') {
                    return evaluateBoard();
                }
                const player = maximizingPlayer ? 'black' : 'white';
                const moves = getAllPossibleMoves(player);
                if (moves.length === 0) return maximizingPlayer ? -Infinity : Infinity;
                
                if (maximizingPlayer) {
                    let maxEval = -Infinity;
                    for (const move of moves) {
                        const [fromRow, fromCol] = move.from;
                        const [toRow, toCol] = move.to;
                        const piece = chessBoard[fromRow][fromCol];
                        const captured = chessBoard[toRow][toCol];
                        
                        chessBoard[toRow][toCol] = piece;
                        chessBoard[fromRow][fromCol] = '';
                        
                        const evalScore = minimax(depth - 1, alpha, beta, false);
                        maxEval = Math.max(maxEval, evalScore);
                        alpha = Math.max(alpha, evalScore);
                        
                        chessBoard[fromRow][fromCol] = piece;
                        chessBoard[toRow][toCol] = captured;
                        
                        if (beta <= alpha) break;
                    }
                    return maxEval;
                } else {
                    let minEval = Infinity;
                    for (const move of moves) {
                        const [fromRow, fromCol] = move.from;
                        const [toRow, toCol] = move.to;
                        const piece = chessBoard[fromRow][fromCol];
                        const captured = chessBoard[toRow][toCol];
                        
                        chessBoard[toRow][toCol] = piece;
                        chessBoard[fromRow][fromCol] = '';
                        
                        const evalScore = minimax(depth - 1, alpha, beta, true);
                        minEval = Math.min(minEval, evalScore);
                        beta = Math.min(beta, evalScore);
                        
                        chessBoard[fromRow][fromCol] = piece;
                        chessBoard[toRow][toCol] = captured;
                        
                        if (beta <= alpha) break;
                    }
                    return minEval;
                }
            } catch (error) {
                console.error('Erro em minimax:', error);
                return 0;
            }
        }
        
        function makeAIMove() {
            try {
                console.log('makeAIMove chamado, dificuldade:', difficulty);
                if (gameState !== 'playing' || currentPlayer !== 'black') {
                    console.log('IA não acionada: gameState=', gameState, 'currentPlayer=', currentPlayer);
                    return;
                }
                
                const moves = getAllPossibleMoves('black');
                if (moves.length === 0) {
                    console.log('Nenhum movimento possível para a IA');
                    return;
                }
                
                let move;
                if (difficulty === 'easy') {
                    move = moves[Math.floor(Math.random() * moves.length)];
                    console.log('IA (Fácil) escolheu movimento aleatório:', move);
                } else {
                    let depth = difficulty === 'medium' ? 2 : 4;
                    let bestMove = null;
                    let bestValue = -Infinity;
                    
                    for (const m of moves) {
                        const [fromRow, fromCol] = m.from;
                        const [toRow, toCol] = m.to;
                        const piece = chessBoard[fromRow][fromCol];
                        const captured = chessBoard[toRow][toCol];
                        
                        chessBoard[toRow][toCol] = piece;
                        chessBoard[fromRow][fromCol] = '';
                        
                        const moveValue = minimax(depth - 1, -Infinity, Infinity, false);
                        console.log(`Movimento ${fromRow},${fromCol} -> ${toRow},${toCol}: valor=${moveValue}`);
                        
                        chessBoard[fromRow][fromCol] = piece;
                        chessBoard[toRow][toCol] = captured;
                        
                        if (moveValue > bestValue) {
                            bestValue = moveValue;
                            bestMove = m;
                        }
                    }
                    
                    move = bestMove;
                    console.log('IA escolheu movimento:', move, 'valor=', bestValue);
                }
                
                if (move) {
                    movePiece(move.from[0], move.from[1], move.to[0], move.to[1]);
                    switchPlayer();
                } else {
                    console.log('Nenhum movimento selecionado pela IA');
                }
            } catch (error) {
                console.error('Erro em makeAIMove:', error);
            }
        }
        
        function setupSocket() {
            try {
                // Substitua pelo URL do seu servidor hospedado
                const serverUrl = 'http://localhost:3000'; // Ex.: 'https://your-app.onrender.com'
                if (typeof io !== 'undefined') {
                    socket = io(serverUrl);
                    
                    socket.on('connect', () => {
                        console.log('Conectado ao servidor');
                    });
                    
                    socket.on('roomCreated', ({ roomId: newRoomId }) => {
                        roomId = newRoomId;
                        playerColor = 'white';
                        roomStatus.textContent = `Sala criada: ${roomId}. Aguardando o segundo jogador...`;
                        initializeBoard();
                    });
                    
                    socket.on('roomJoined', ({ roomId: joinedRoomId, color }) => {
                        roomId = joinedRoomId;
                        playerColor = color;
                        roomStatus.textContent = `Conectado à sala ${roomId} como ${playerColor === 'white' ? 'Brancas' : 'Pretas'}.`;
                        initializeBoard();
                    });
                    
                    socket.on('roomFull', () => {
                        roomStatus.textContent = 'Erro: Sala cheia ou inexistente.';
                    });
                    
                    socket.on('move', ({ move }) => {
                        movePiece(move.from[0], move.from[1], move.to[0], move.to[1]);
                        switchPlayer();
                    });
                    
                    socket.on('reset', () => {
                        resetGame();
                    });
                } else {
                    console.warn('Socket.IO não carregado. Modo online indisponível.');
                    roomStatus.textContent = 'Modo online indisponível. Configure o servidor.';
                }
            } catch (error) {
                console.error('Erro em setupSocket:', error);
            }
        }
        
        gameModeSelect.addEventListener('change', () => {
            try {
                gameMode = gameModeSelect.value;
                difficultyLabel.style.display = gameMode === 'pve' ? 'inline' : 'none';
                difficultySelect.style.display = gameMode === 'pve' ? 'inline' : 'none';
                roomSelector.style.display = gameMode === 'online' ? 'block' : 'none';
                if (gameMode === 'online') {
                    setupSocket();
                } else if (socket) {
                    socket.disconnect();
                    socket = null;
                    roomId = null;
                    playerColor = null;
                    roomStatus.textContent = '';
                }
                resetGame();
            } catch (error) {
                console.error('Erro ao mudar modo de jogo:', error);
            }
        });
        
        difficultySelect.addEventListener('change', () => {
            try {
                difficulty = difficultySelect.value;
                resetGame();
            } catch (error) {
                console.error('Erro ao mudar dificuldade:', error);
            }
        });
        
        createRoomBtn.addEventListener('click', () => {
            try {
                if (socket) {
                    socket.emit('createRoom');
                } else {
                    roomStatus.textContent = 'Erro: Servidor não conectado.';
                }
            } catch (error) {
                console.error('Erro ao criar sala:', error);
            }
        });
        
        joinRoomBtn.addEventListener('click', () => {
            try {
                const id = roomIdInput.value.trim();
                if (id && socket) {
                    socket.emit('joinRoom', { roomId: id });
                } else {
                    roomStatus.textContent = 'Erro: Insira um ID válido ou conecte ao servidor.';
                }
            } catch (error) {
                console.error('Erro ao entrar na sala:', error);
            }
        });
        
        resetButton.addEventListener('click', resetGame);
        initializeBoard();
    } catch (error) {
        console.error('Erro na inicialização do jogo:', error);
    }
});