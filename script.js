// 取得元素
const boardEl = document.getElementById('board');
const turnEl = document.getElementById('turn');
const stateEl = document.getElementById('state');
const btnReset = document.getElementById('reset');
const btnResetAll = document.getElementById('reset-all');

const scoreXEl = document.getElementById('score-x');
const scoreOEl = document.getElementById('score-o');
const scoreDrawEl = document.getElementById('score-draw');

// 勝利條件（8 種）
const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

// 遊戲變數
let board = Array(9).fill('');
let current = 'X';
let active = true;

// 計分
let scoreX = 0;
let scoreO = 0;
let scoreDraw = 0;

// 產生棋格
function createCells() {
  boardEl.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const btn = document.createElement('button');
    btn.className = 'cell';
    btn.setAttribute('data-idx', i);
    btn.type = 'button';
    btn.addEventListener('click', onCellClick);
    boardEl.appendChild(btn);
  }
}

// 取得所有 cell node
function getCells() {
  return Array.from(document.querySelectorAll('.cell'));
}

// 初始化（重開一局但保留分數）
function init() {
  board = Array(9).fill('');
  current = 'X';
  active = true;
  turnEl.textContent = current;
  stateEl.textContent = '';
  createCells();
  const cells = getCells();
  cells.forEach(c => {
    c.textContent = '';
    c.classList.remove('x','o','win');
    c.disabled = false;
  });
}

// 點擊棋格事件
function onCellClick(e) {
  const idx = Number(e.currentTarget.getAttribute('data-idx'));
  place(idx);
}

function place(idx) {
  if (!active || board[idx]) return;
  board[idx] = current;
  const cells = getCells();
  const cell = cells[idx];
  cell.textContent = current;
  cell.classList.add(current.toLowerCase());
  const result = evaluate();
  if (result.finished) {
    endGame(result);
  } else {
    switchTurn();
  }
}

function switchTurn() {
  current = current === 'X' ? 'O' : 'X';
  turnEl.textContent = current;
}

function evaluate() {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { finished: true, winner: board[a], line };
    }
  }
  if (board.every(v => v)) return { finished: true, winner: null };
  return { finished: false };
}

function endGame({ winner, line }) {
  active = false;
  const cells = getCells();
  if (winner) {
    stateEl.textContent = `${winner} 勝利！`;
    line.forEach(i => cells[i].classList.add('win'));
    if (winner === 'X') scoreX++; else scoreO++;
  } else {
    stateEl.textContent = '平手';
    scoreDraw++;
  }
  updateScoreboard();
  cells.forEach(c => c.disabled = true);
}

function updateScoreboard() {
  scoreXEl.textContent = scoreX;
  scoreOEl.textContent = scoreO;
  scoreDrawEl.textContent = scoreDraw;
}

// 事件綁定
btnReset.addEventListener('click', init);
btnResetAll.addEventListener('click', () => {
  scoreX = scoreO = scoreDraw = 0;
  updateScoreboard();
  init();
});

// 啟動
init();
updateScoreboard();
