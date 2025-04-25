const pusher = new Pusher('1126204250sp', {
  cluster: '1126204250sp',
  encrypted: true
});

let channel;
let roomId = '';
let isMyTurn = true;
let currentPlayer = 'white';

const board = document.getElementById('board');
const turnIndicator = document.getElementById('turn-indicator').querySelector('span');
const statusDisplay = document.getElementById('status');
const resetButton = document.getElementById('reset-btn');
const notification = document.getElementById('notification');
const connectBtn = document.getElementById('connect-btn');

let selectedPiece = null;

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

function showNotification(message, type = 'success') {
  notification.textContent = message;
  notification.className = `notification ${type} show`;
  setTimeout(() => {
    notification.className = 'notification';
  }, 3000);
}

function initializeBoard() {
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
  turnIndicator.textContent = currentPlayer === 'white' ? 'Brancas' : 'Pretas';
  turnIndicator.style.color = currentPlayer === 'white' ? '#333' : '#000';
}

function handleSquareClick(row, col) {
  if (!isMyTurn) return;

  const piece = chessBoard[row][col];

  if (selectedPiece) {
    const [fromRow, fromCol] = selectedPiece;
    if ((fromRow === row && fromCol === col)) {
      selectedPiece = null;
      initializeBoard();
      return;
    }

    chessBoard[row][col] = chessBoard[fromRow][fromCol];
    chessBoard[fromRow][fromCol] = '';
    selectedPiece = null;

    channel.trigger('client-move', {
      board: chessBoard,
      currentPlayer: currentPlayer === 'white' ? 'black' : 'white'
    });

    switchTurn();
    initializeBoard();
  } else if (piece && isCorrectTurn(piece)) {
    selectedPiece = [row, col];
    document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`).classList.add('selected');
  }
}

function isCorrectTurn(piece) {
  return (currentPlayer === 'white' && piece === piece.toUpperCase()) ||
         (currentPlayer === 'black' && piece === piece.toLowerCase());
}

function switchTurn() {
  currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
  isMyTurn = !isMyTurn;
}

function resetGame() {
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
  currentPlayer = 'white';
  isMyTurn = true;
  initializeBoard();
}

resetButton.addEventListener('click', () => {
  resetGame();
  channel.trigger('client-reset', {});
});

connectBtn.addEventListener('click', () => {
  const input = document.getElementById('room-id');
  roomId = input.value.trim();
  if (!roomId) {
    alert("Informe um código de sala");
    return;
  }

  channel = pusher.subscribe(`presence-${roomId}`);

  channel.bind('pusher:subscription_succeeded', (members) => {
    showNotification("Conectado com sucesso!", "success");
    statusDisplay.textContent = "Conectado à sala";
    initializeBoard();
  });

  channel.bind('client-move', (data) => {
    chessBoard = data.board;
    currentPlayer = data.currentPlayer;
    isMyTurn = !isMyTurn;
    initializeBoard();
  });

  channel.bind('client-reset', () => {
    resetGame();
  });
});
