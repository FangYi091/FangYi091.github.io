// 遊戲主變數
let board = Array(9).fill(null);
let current = 'X';
let active = true;

// 狀態顯示
function setStatus(text, color) {
    const s = document.getElementById('status');
    s.innerText = text;
    s.style.color = color;
}

// 初始化棋盤
function init() {
    const boardEl = document.getElementById('board');
    boardEl.innerHTML = '';
    board = Array(9).fill(null);
    active = true;
    current = 'X';

    setStatus('玩家 (X) 先手', '#2b7a0b');

    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.onclick = () => playerMove(i);
        boardEl.appendChild(cell);
    }
}

// 玩家下棋
function playerMove(i) {
    if (!active || board[i]) return;

    board[i] = 'X';
    updateBoard();

    if (checkWin('X')) {
        endGame('玩家 (X) 勝利！');
        return;
    } else if (isFull()) {
        endGame('平手！');
        return;
    }

    current = 'O';
    setStatus('電腦思考中...', '#1e3a8a');

    setTimeout(computerMove, 700);
}

// 電腦AI下棋邏輯
function computerMove() {
    let move = findWinningMove('O');

    if (move === null) move = findWinningMove('X');
    if (move === null) move = getRandomMove();

    board[move] = 'O';
    updateBoard();

    if (checkWin('O')) {
        endGame('電腦 (O) 勝利！');
        return;
    } else if (isFull()) {
        endGame('平手！');
        return;
    }

    current = 'X';
    setStatus('輪到玩家 (X)', '#2b7a0b');
}

// 找到可立即獲勝的位置
function findWinningMove(player) {
    const wins = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
    ];
    for (let [a,b,c] of wins) {
        const line = [board[a], board[b], board[c]];
        if (line.filter(v => v === player).length === 2 && line.includes(null)) {
            return [a,b,c][line.indexOf(null)];
        }
    }
    return null;
}

// 隨機選擇空格
function getRandomMove() {
    const empty = board.map((v, i) => v ? null : i).filter(v => v !== null);
    return empty[Math.floor(Math.random() * empty.length)];
}

// 更新畫面
function updateBoard() {
    const cells = document.getElementsByClassName('cell');
    for (let i = 0; i < 9; i++) {
        const val = board[i] || '';
        cells[i].innerHTML = `<div class="cell-inner ${val.toLowerCase()}">${val}</div>`;
    }
    /*if (val === 'X') {
            cells[i].style.color = '#e63946'; // 紅色
        } else if (val === 'O') {
            cells[i].style.color = '#1d4ed8'; // 藍色
        } else {
            cells[i].style.color = ''; // 空格還原預設
        }
    */
}

// 判斷勝利
function checkWin(player) {
    const wins = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
    ];
    return wins.some(([a,b,c]) => board[a] === player && board[b] === player && board[c] === player);
}

// 判斷是否平手
function isFull() {
    return board.every(cell => cell !== null);
}

// 結束遊戲
function endGame(message) {
    setStatus(message, '#b91c1c');
    active = false;
}

// 重開一局
function resetGame() {
    init();
}

// 初始化
init();
