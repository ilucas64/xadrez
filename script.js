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
        const notification = document.getElementById('notification');
        
        if (!board) {
            console.error('Elemento #board não encontrado');
            showNotification('Erro: Elemento do tabuleiro não encontrado.', 'error');
            return;
        }
        
        let selectedPiece = null;
        let currentPlayer = 'white';
        let gameState = 'playing';
        let gameMode = 'pvp';
        let difficulty = 'medium';
        
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
        
        function showNotification(message, type = 'success') {
            notification.textContent = message;
            notification.className = `notification ${type} show`;
            setTimeout(() => {
                notification.className = 'notification';
            }, 3000);
        }
        
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
                showNotification('Erro ao inicializar o tabuleiro.', 'error');
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
                                     (gameMode === 'pve' && currentPlayer === 'white' && isWhitePiece);
                    if (canSelect) {
                        selectedPiece = [row, col];
                        highlightSquare(row, col);
                        showPossibleMoves(row, col);
                    }
                }
            } catch (error) {
                console.error('Erro em handleSquareClick:', error);
                showNotification('Erro ao processar clique.', 'error');
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
                
                if (piece === 'P' && toRow === 0) {
                    chessBoard[toRow][toCol] = 'Q';
                    showNotification('Peão promovido a rainha!', 'success');
                } else if (piece === 'p' && toRow === 7) {
                    chessBoard[toRow][toCol] = 'q';
                    showNotification('Peão promovido a rainha!', 'success');
                }
                
                initializeBoard();
                checkGameState();
            } catch (error) {
                console.error('Erro em movePiece:', error);
                showNotification('Erro ao mover peça.', 'error');
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
                showNotification('Erro ao alternar jogador.', 'error');
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
        
        function findKing(player) {
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const piece = chessBoard[row][col];
                    if ((player === 'white' && piece === 'K') || (player === 'black' && piece === 'k')) {
                        return [row, col];
                    }
                }
            }
            return null;
        }
        
        function isSquareAttacked(row, col, attacker) {
            const opponent = attacker === 'white' ? 'black' : 'white';
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const piece = chessBoard[r][c];
                    if (piece && ((attacker === 'white' && piece === piece.toUpperCase()) || 
                                 (attacker === 'black' && piece === piece.toLowerCase()))) {
                        const temp = chessBoard[row][col];
                        chessBoard[row][col] = '';
                        const canAttack = isValidMove(r, c, row, col);
                        chessBoard[row][col] = temp;
                        if (canAttack) return true;
                    }
                }
            }
            return false;
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
                return moves;
            } catch (error) {
                console.error('Erro em getAllPossibleMoves:', error);
                return [];
            }
        }
        
        function canEscapeCheck(player) {
            const moves = getAllPossibleMoves(player);
            for (const move of moves) {
                const [fromRow, fromCol] = move.from;
                const [toRow, toCol] = move.to;
                const piece = chessBoard[fromRow][fromCol];
                const captured = chessBoard[toRow][toCol];
                
                chessBoard[toRow][toCol] = piece;
                chessBoard[fromRow][fromCol] = '';
                
                const kingPos = findKing(player);
                const stillInCheck = kingPos ? isSquareAttacked(kingPos[0], kingPos[1], player === 'white' ? 'black' : 'white') : false;
                
                chessBoard[fromRow][fromCol] = piece;
                chessBoard[toRow][toCol] = captured;
                
                if (!stillInCheck) return true;
            }
            return false;
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
                    showNotification('Xeque-mate! Pretas vencem!', 'success');
                    return;
                }
                if (!blackKing) {
                    gameState = 'checkmate';
                    statusDisplay.textContent = 'Xeque-mate! Brancas vencem!';
                    showNotification('Xeque-mate! Brancas vencem!', 'success');
                    return;
                }
                
                const playerInTurn = currentPlayer;
                const kingPos = findKing(playerInTurn);
                if (kingPos) {
                    const [kingRow, kingCol] = kingPos;
                    const opponent = playerInTurn === 'white' ? 'black' : 'white';
                    const inCheck = isSquareAttacked(kingRow, kingCol, opponent);
                    if (inCheck) {
                        const canEscape = canEscapeCheck(playerInTurn);
                        if (!canEscape) {
                            gameState = 'checkmate';
                            const winner = playerInTurn === 'white' ? 'Pretas' : 'Brancas';
                            statusDisplay.textContent = `Xeque-mate! ${winner} vencem!`;
                            showNotification(`Xeque-mate! ${winner} vencem!`, 'success');
                        } else {
                            showNotification('Rei em xeque!', 'error');
                        }
                    }
                }
            } catch (error) {
                console.error('Erro em checkGameState:', error);
                showNotification('Erro ao verificar estado do jogo.', 'error');
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
                initializeBoard();
                showNotification('Jogo reiniciado.', 'success');
            } catch (error) {
                console.error('Erro em resetGame:', error);
                showNotification('Erro ao reiniciar o jogo.', 'error');
            }
        }
        
        function evaluateBoard() {
            try {
                let score = 0;
                
                // Avaliação material
                for (let row = 0; row < 8; row++) {
                    for (let col = 0; col < 8; col++) {
                        const piece = chessBoard[row][col];
                        if (piece) {
                            const value = pieceValues[piece];
                            score += piece === piece.toUpperCase() ? value : -value;
                            
                            // Bônus por controle do centro (e4, d4, e5, d5)
                            const centerPositions = [
                                [3, 3], [3, 4], // d4, e4
                                [4, 3], [4, 4]  // d5, e5
                            ];
                            if (centerPositions.some(pos => pos[0] === row && pos[1] === col)) {
                                score += piece === piece.toUpperCase() ? 0.5 : -0.5;
                            }
                            
                            // Bônus por desenvolvimento (cavalos e bispos fora da posição inicial)
                            if (piece.toLowerCase() === 'n' || piece.toLowerCase() === 'b') {
                                if (piece === piece.toLowerCase()) { // Peças pretas
                                    if (row !== 0 || (col !== 1 && col !== 6)) {
                                        score -= 0.3; // Bônus por cavalo ou bispo preto desenvolvido
                                    }
                                } else { // Peças brancas
                                    if (row !== 7 || (col !== 1 && col !== 6)) {
                                        score += 0.3; // Bônus por cavalo ou bispo branco desenvolvido
                                    }
                                }
                            }
                            
                            // Bônus por torre em coluna aberta
                            if (piece.toLowerCase() === 'r') {
                                let isOpenColumn = true;
                                for (let r = 0; r < 8; r++) {
                                    if (r !== row && (chessBoard[r][col] === 'p' || chessBoard[r][col] === 'P')) {
                                        isOpenColumn = false;
                                        break;
                                    }
                                }
                                if (isOpenColumn) {
                                    score += piece === piece.toUpperCase() ? 0.5 : -0.5;
                                }
                            }
                            
                            // Bônus por rainha ativa (fora da posição inicial)
                            if (piece.toLowerCase() === 'q') {
                                if (piece === 'q' && (row !== 0 || col !== 3)) {
                                    score -= 0.5; // Rainha preta ativa
                                } else if (piece === 'Q' && (row !== 7 || col !== 3)) {
                                    score += 0.5; // Rainha branca ativa
                                }
                            }
                        }
                    }
                }
                
                // Bônus por mobilidade
                const whiteMoves = getAllPossibleMoves('white').length;
                const blackMoves = getAllPossibleMoves('black').length;
                score += whiteMoves * 0.1;
                score -= blackMoves * 0.1;
                
                // Penalidade por peões dobrados
                for (let col = 0; col < 8; col++) {
                    let whitePawns = 0;
                    let blackPawns = 0;
                    for (let row = 0; row < 8; row++) {
                        if (chessBoard[row][col] === 'P') whitePawns++;
                        if (chessBoard[row][col] === 'p') blackPawns++;
                    }
                    if (whitePawns > 1) score -= (whitePawns - 1) * 0.5; // Penalidade por peões brancos dobrados
                    if (blackPawns > 1) score += (blackPawns - 1) * 0.5; // Penalidade por peões pretos dobrados
                }
                
                // Penalidade por rei exposto
                const whiteKing = findKing('white');
                const blackKing = findKing('black');
                if (whiteKing) {
                    const [wRow, wCol] = whiteKing;
                    if (isSquareAttacked(wRow, wCol, 'black')) {
                        score -= 2;
                    }
                    if (wRow >= 3 && wRow <= 4 && wCol >= 3 && wCol <= 4) {
                        score -= 1;
                    }
                }
                if (blackKing) {
                    const [bRow, bCol] = blackKing;
                    if (isSquareAttacked(bRow, bCol, 'white')) {
                        score += 2;
                    }
                    if (bRow >= 3 && bRow <= 4 && bCol >= 3 && bCol <= 4) {
                        score += 1;
                    }
                }
                
                return score;
            } catch (error) {
                console.error('Erro em evaluateBoard:', error);
                return 0;
            }
        }
        
        function sortMoves(moves, player) {
            try {
                const opponent = player === 'white' ? 'black' : 'white';
                const sortedMoves = [];
                
                for (const move of moves) {
                    const [fromRow, fromCol] = move.from;
                    const [toRow, toCol] = move.to;
                    const piece = chessBoard[fromRow][fromCol];
                    const captured = chessBoard[toRow][toCol];
                    let priority = 0;
                    
                    // Prioridade para capturas
                    if (captured) {
                        const capturedValue = pieceValues[captured] || 0;
                        const pieceValue = pieceValues[piece] || 0;
                        priority += capturedValue * 10; // Bônus por capturar peças de maior valor
                        if (capturedValue > pieceValue) priority += 50; // Bônus extra por capturas vantajosas
                    }
                    
                    // Prioridade para movimentos que colocam o rei adversário em xeque
                    chessBoard[toRow][toCol] = piece;
                    chessBoard[fromRow][fromCol] = '';
                    const opponentKing = findKing(opponent);
                    if (opponentKing) {
                        const [kingRow, kingCol] = opponentKing;
                        if (isSquareAttacked(kingRow, kingCol, player)) {
                            priority += 100; // Bônus por xeque
                        }
                    }
                    chessBoard[fromRow][fromCol] = piece;
                    chessBoard[toRow][toCol] = captured;
                    
                    sortedMoves.push({ move, priority });
                }
                
                sortedMoves.sort((a, b) => b.priority - a.priority);
                return sortedMoves.map(item => item.move);
            } catch (error) {
                console.error('Erro em sortMoves:', error);
                return moves;
            }
        }
        
        function minimax(depth, alpha, beta, maximizingPlayer) {
            try {
                if (depth === 0 || gameState !== 'playing') {
                    return evaluateBoard();
                }
                const player = maximizingPlayer ? 'black' : 'white';
                const moves = sortMoves(getAllPossibleMoves(player), player);
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
                        if (piece === 'p' && toRow === 7) chessBoard[toRow][toCol] = 'q';
                        
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
                        if (piece === 'P' && toRow === 0) chessBoard[toRow][toCol] = 'Q';
                        
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
                if (gameState !== 'playing' || currentPlayer !== 'black') return;
                
                const moves = getAllPossibleMoves('black');
                if (moves.length === 0) return;
                
                let move;
                if (difficulty === 'easy') {
                    // Modo Fácil: 80% chance de movimento aleatório, 20% chance de captura
                    const captures = moves.filter(m => chessBoard[m.to[0]][m.to[1]] !== '');
                    if (captures.length > 0 && Math.random() < 0.2) {
                        move = captures[Math.floor(Math.random() * captures.length)];
                    } else {
                        move = moves[Math.floor(Math.random() * moves.length)];
                    }
                } else {
                    let depth = difficulty === 'medium' ? 4 : 6;
                    let bestMove = null;
                    let bestValue = -Infinity;
                    
                    const sortedMoves = sortMoves(moves, 'black');
                    for (const m of sortedMoves) {
                        const [fromRow, fromCol] = m.from;
                        const [toRow, toCol] = m.to;
                        const piece = chessBoard[fromRow][fromCol];
                        const captured = chessBoard[toRow][toCol];
                        
                        chessBoard[toRow][toCol] = piece;
                        chessBoard[fromRow][fromCol] = '';
                        if (piece === 'p' && toRow === 7) chessBoard[toRow][toCol] = 'q';
                        
                        const moveValue = minimax(depth - 1, -Infinity, Infinity, false);
                        chessBoard[fromRow][fromCol] = piece;
                        chessBoard[toRow][toCol] = captured;
                        
                        if (moveValue > bestValue) {
                            bestValue = moveValue;
                            bestMove = m;
                        }
                    }
                    
                    move = bestMove;
                }
                
                if (move) {
                    movePiece(move.from[0], move.from[1], move.to[0], move.to[1]);
                    switchPlayer();
                }
            } catch (error) {
                console.error('Erro em makeAIMove:', error);
                showNotification('Erro na jogada da IA.', 'error');
            }
        }
        
        gameModeSelect.addEventListener('change', () => {
            try {
                gameMode = gameModeSelect.value;
                difficultyLabel.style.display = gameMode === 'pve' ? 'inline' : 'none';
                difficultySelect.style.display = gameMode === 'pve' ? 'inline' : 'none';
                resetGame();
            } catch (error) {
                console.error('Erro ao mudar modo de jogo:', error);
                showNotification('Erro ao mudar modo de jogo.', 'error');
            }
        });
        
        difficultySelect.addEventListener('change', () => {
            try {
                difficulty = difficultySelect.value;
                resetGame();
            } catch (error) {
                console.error('Erro ao mudar dificuldade:', error);
                showNotification('Erro ao mudar dificuldade.', 'error');
            }
        });
        
        resetButton.addEventListener('click', resetGame);
        
        document.getElementById('toggle-theme').addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
        });
        
        document.getElementById('switch-sides').addEventListener('click', () => {
            try {
                if (gameMode === 'pve') {
                    currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
                    resetGame();
                    if (currentPlayer === 'black') {
                        setTimeout(makeAIMove, 500);
                    }
                } else {
                    showNotification('Troca de lados só é permitida no modo Jogador vs IA.', 'error');
                }
            } catch (error) {
                console.error('Erro ao trocar lados:', error);
                showNotification('Erro ao trocar lados.', 'error');
            }
        });
        
        initializeBoard();
    } catch (error) {
        console.error('Erro na inicialização do jogo:', error);
        showNotification('Erro ao iniciar o jogo. Verifique o console.', 'error');
    }
});