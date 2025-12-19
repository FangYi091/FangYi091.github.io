const SIZE = 8; 
const board = document.getElementById("board");
const statusText = document.getElementById("status");
const scoreText = document.getElementById("score");
const aiLevelSelect = document.getElementById("aiLevel");

let boardState;
let currentPlayer = 1; // 1黑 2白
let isAnimating = false;

const dirs = [
    [-1,-1],[-1,0],[-1,1],
    [0,-1],        [0,1],
    [1,-1],[1,0],[1,1]
];

function initGame() {
    // 1. 處理 Overlay：確保隱藏且不擋住點擊
    const overlay = document.getElementById("resultOverlay");
    if (overlay) {
        overlay.style.display = "none";
        overlay.innerHTML = "";
    }

    // 2. 初始化數據
    boardState = Array.from({length: SIZE}, () => Array(SIZE).fill(0));
    isAnimating = false;
    currentPlayer = 1;

    // 3. 設定初始四顆棋子
    boardState[3][3] = 2;
    boardState[3][4] = 1;
    boardState[4][3] = 1;
    boardState[4][4] = 2;

    // 4. 生成棋盤格 (清空除了 overlay 以外的內容)
    const overlayHtml = overlay ? overlay.outerHTML : '<div id="resultOverlay"></div>';
    board.innerHTML = overlayHtml; 

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const cell = document.createElement("div");
            cell.className = "cell";
            cell.dataset.r = r;
            cell.dataset.c = c;
            cell.onclick = () => playerMove(r, c);
            board.appendChild(cell);
        }
    }

    refreshBoard();
}

let lastMoveCoord = null; // 用來記錄最後一次下棋的位置

// 修改 placeDisc，在落子時記錄坐標
function placeDisc(r, c, player, onAnimationComplete) {
    lastMoveCoord = {r, c}; // 記錄最後位置
    // ... 其餘原本 placeDisc 代碼不變 ...
}

function refreshBoard() {
    let black = 0, white = 0;
    document.querySelectorAll(".cell").forEach(cell => {
        const r = Number(cell.dataset.r);
        const c = Number(cell.dataset.c);

        // 移除所有舊的高亮
        cell.classList.remove("last-move");

        if (boardState[r][c] === 0) {
            cell.innerHTML = "";
            cell.classList.remove("valid");
            cell.dataset.hint = "";
            if (!isAnimating && isValidMove(r, c, currentPlayer)) {
                cell.classList.add("valid");
                cell.dataset.hint = countFlips(r, c, currentPlayer);
            }
        } else {
            cell.classList.remove("valid");
            cell.dataset.hint = "";
            
            // 加入最後落子高亮
            if (lastMoveCoord && lastMoveCoord.r === r && lastMoveCoord.c === c) {
                cell.classList.add("last-move");
            }

            if (!cell.querySelector('.disc')) {
                cell.innerHTML = "";
                const color = boardState[r][c] === 1 ? "black" : "white";
                cell.appendChild(makeDisc(color));
            }
            if (boardState[r][c] === 1) black++;
            else white++;
        }
    });

    // --- 更新分數與進度條 ---
    scoreText.textContent = `黑棋: ${black} | 白棋: ${white}`;
    const total = black + white;
    const blackPercent = (black / total) * 100;
    const whitePercent = (white / total) * 100;
    
    // 確保 HTML 有這些 ID (見下方 HTML 修改)
    if(document.getElementById("black-bar")) {
        document.getElementById("black-bar").style.width = blackPercent + "%";
        document.getElementById("white-bar").style.width = whitePercent + "%";
    }

    statusText.textContent = currentPlayer === 1 ? "目前輪到：黑棋" : "目前輪到：白棋";

    if (!isAnimating && !hasAnyValidMove(1) && !hasAnyValidMove(2)) {
        setTimeout(() => showResult(black, white), 600);
    }
}

function makeDisc(color) {
    const d = document.createElement("div");
    d.className = `disc ${color}`;
    return d;
}

function playerMove(r, c) {
    if (isAnimating || !isValidMove(r, c, 1)) return;
    isAnimating = true;
    placeDisc(r, c, 1, () => {
        setTimeout(() => computerMove(), 500);
    });
    refreshBoard();
}

function computerMove() {
    let moves = [];
    for (let r = 0; r < SIZE; r++)
        for (let c = 0; c < SIZE; c++)
            if (isValidMove(r, c, 2))
                moves.push({r, c, flips: countFlips(r, c, 2)});

    if (moves.length === 0) {
        currentPlayer = 1;
        isAnimating = false;
        refreshBoard();
        return;
    }

    let bestMoves;
    if (aiLevelSelect.value === "advanced") {
        const corners = [[0,0],[0,7],[7,0],[7,7]];
        let cornerMoves = moves.filter(m => corners.some(([cr, cc]) => m.r === cr && m.c === cc));
        if (cornerMoves.length > 0) {
            let m = cornerMoves[Math.floor(Math.random() * cornerMoves.length)];
            executeComputerMove(m.r, m.c);
            return;
        }
        let maxFlips = Math.max(...moves.map(m => m.flips));
        bestMoves = moves.filter(m => m.flips === maxFlips);
    } else {
        bestMoves = moves;
    }
    let m = bestMoves[Math.floor(Math.random() * bestMoves.length)];
    executeComputerMove(m.r, m.c);
}

function executeComputerMove(r, c) {
    placeDisc(r, c, 2, () => { 
        isAnimating = false; 
        refreshBoard(); 
    });
    currentPlayer = 1;
    refreshBoard();
}

function placeDisc(r, c, player, onAnimationComplete) {
    boardState[r][c] = player;
    let opponent = player === 1 ? 2 : 1;
    let flips = [];

    dirs.forEach(([dr, dc]) => {
        let path = [];
        let nr = r + dr, nc = c + dc;
        while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && boardState[nr][nc] === opponent) {
            path.push([nr, nc]);
            nr += dr; nc += dc;
        }
        if (path.length && nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && boardState[nr][nc] === player)
            flips.push(...path);
    });

    const interval = 120; 
    const flipDuration = 200; 

    flips.forEach((p, i) => {
        setTimeout(() => {
            let pr = p[0], pc = p[1];
            let cell = document.querySelector(`.cell[data-r='${pr}'][data-c='${pc}']`);
            let disc = cell ? cell.querySelector('.disc') : null;

            if (disc) {
                disc.style.transform = "rotateY(90deg)";
                setTimeout(() => {
                    boardState[pr][pc] = player;
                    const newColor = player === 1 ? "black" : "white";
                    const oldColor = player === 1 ? "white" : "black";
                    disc.classList.remove(oldColor);
                    disc.classList.add(newColor);
                    disc.style.transition = "none";
                    disc.style.transform = "rotateY(-90deg)";
                    void disc.offsetWidth;
                    disc.style.transition = `transform ${flipDuration}ms ease-in-out`;
                    disc.style.transform = "rotateY(0deg)";
                }, flipDuration);
            }
        }, i * interval);
    });

    let totalTime = (flips.length * interval) + (flipDuration * 2) + 50;
    if (flips.length === 0) totalTime = 0;
    if (onAnimationComplete) setTimeout(onAnimationComplete, totalTime);
}

function showResult(black, white) {
    const overlay = document.getElementById("resultOverlay");
    if (!overlay) return;

    let winnerText = black > white ? "黑棋獲勝！" : white > black ? "白棋獲勝！" : "雙方平手！";
    overlay.innerHTML = `
        <div class="result-title" style="font-size: 2.5rem; color: #ffd700; margin-bottom: 10px;">${winnerText}</div>
        <div class="result-score" style="font-size: 1.2rem; margin-bottom: 20px;">黑棋 ${black} - 白棋 ${white}</div>
        <button id="playAgainBtn">再玩一局</button>
    `;
    overlay.style.display = "flex";
    
    // 綁定「再玩一局」按鈕
    document.getElementById("playAgainBtn").onclick = initGame;
}

function isValidMove(r, c, player) {
    if (boardState[r][c] !== 0) return false;
    let opponent = player === 1 ? 2 : 1;
    return dirs.some(([dr, dc]) => {
        let nr = r + dr, nc = c + dc;
        let found = false;
        while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && boardState[nr][nc] === opponent) {
            found = true;
            nr += dr; nc += dc;
        }
        return found && nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && boardState[nr][nc] === player;
    });
}

function countFlips(r, c, player) {
    let opponent = player === 1 ? 2 : 1;
    let total = 0;
    dirs.forEach(([dr, dc]) => {
        let nr = r + dr, nc = c + dc;
        let count = 0;
        while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && boardState[nr][nc] === opponent) {
            count++;
            nr += dr; nc += dc;
        }
        if (count && nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && boardState[nr][nc] === player)
            total += count;
    });
    return total;
}

function hasAnyValidMove(player) {
    for (let r = 0; r < SIZE; r++)
        for (let c = 0; c < SIZE; c++)
            if (isValidMove(r, c, player)) return true;
    return false;
}

// 綁定重新開始按鈕
document.getElementById("restartBtn").onclick = initGame;

// 確保頁面載入後才執行初始化
window.onload = initGame;
