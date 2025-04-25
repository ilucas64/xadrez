const pusher = new Pusher('1126204250sp', {
  cluster: '1126204250sp',
  encrypted: true
});

let channel;
let roomId = '';
let playerColor = '';
let currentTurn = 'white';
let chessBoard = [];
let selectedPiece = null;

const pieceSymbols = {
  'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚',
  'P': '♙', 'N': '♘', 'B': '♗', 'R': '♖', 'Q': '♕', 'K': '♔'
};

const board = document.getElementById('board');
const turnIndicator = document.getElementById('turn-indicator').querySelector('span');
const statusDisplay = document.getElementById('status');
const notification = document.getElementById('notification');
const resetButton = document.getElementById('reset-btn');
const createBtn = document.getElementById('create-room');
const joinBtn = document.getElementById('join-room');

function defaultBoard() {
  return [
    ['r','n','b','q','k','b','n','r'],
    ['p','p','p','p','p','p','p','p'],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['P','P','P','P','P','P','P','P'],
    ['R','N','B','Q','K','B','N','R']
  ];
}

function showNotification(msg, type = 'success') {
  notification.textContent = msg;
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
        square.classList.add(piece === piece.toLowerCase() ? 'black' : 'white');
      }

      square.addEventListener('click', () => handleSquareClick(row, col));
      board.appendChild(square);
    }
  }
  updateTurnInfo();
}

function updateTurnInfo() {
  turnIndicator.textContent = currentTurn === 'white' ? 'Brancas' : 'Pretas';
  turnIndicator.style.color = currentTurn === 'white' ? '#333' : '#000';
}

function handleSquareClick(row, col) {
  if (playerColor !== currentTurn) return;

  const piece = chessBoard[row][col];

  if (selectedPiece) {
    const [fromRow, fromCol] = selectedPiece;

    chessBoard[row][col] = chessBoard[fromRow][fromCol];
    chessBoard[fromRow][fromCol] = '';
    selectedPiece = null;

    currentTurn = currentTurn === 'white' ? 'black' : 'white';
    channel.trigger('client-move', { board: chessBoard, turn: currentTurn });
    initializeBoard();
  } else if (piece && isPlayerPiece(piece)) {
    selectedPiece = [row, col];
    document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`).classList.add('selected');
  }
}

function isPlayerPiece(piece) {
  return (playerColor === 'white' && piece === piece.toUpperCase()) ||
         (playerColor === 'black' && piece === piece.toLowerCase());
}

function setupChannelEvents() {
  channel.bind('client-move', data => {
    chessBoard = data.board;
    currentTurn = data.turn;
    initializeBoard();
  });

  channel.bind('client-reset', () => {
    chessBoard = defaultBoard();
    currentTurn = 'white';
    initializeBoard();
  });
}

function createRoom() {
  roomId = document.getElementById('room-id').value.trim();
  if (!roomId) return alert("Informe um nome para a sala");

  playerColor = 'white';
  chessBoard = defaultBoard();
  currentTurn = 'white';

  channel = pusher.subscribe(`private-${roomId}`);
  setupChannelEvents();

  channel.bind('pusher:subscription_succeeded', () => {
    showNotification("Sala criada! Esperando outro jogador...");
    statusDisplay.textContent = "Você é BRANCO (inicia o jogo)";
    initializeBoard();
  });
}

function joinRoom() {
  roomId = document.getElementById('room-id').value.trim();
  if (!roomId) return alert("Informe o código da sala");

  playerColor = 'black';
  currentTurn = 'white';

  channel = pusher.subscribe(`private-${roomId}`);
  setupChannelEvents();

  channel.bind('pusher:subscription_succeeded', () => {
    showNotification("Conectado à sala!");
    statusDisplay.textContent = "Você é PRETO (aguarde sua vez)";
    // Solicitando tabuleiro do criador da sala
    channel.trigger('client-request-board', {});
  });

  channel.bind('client-request-board', () => {
    if (playerColor === 'white') {
      channel.trigger('client-move', { board: chessBoard, turn: currentTurn });
    }
  });
}

resetButton.addEventListener('click', () => {
  chessBoard = defaultBoard();
  currentTurn = 'white';
  initializeBoard();
  channel.trigger('client-reset', {});
});

createBtn.addEventListener('click', createRoom);
joinBtn.addEventListener('click', joinRoom);
