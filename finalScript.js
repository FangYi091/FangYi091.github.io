class NineBoardGo {
    constructor() {
        this.boardSize = 9;
        this.board = [];
        this.currentPlayer = 1; // 1: 黑(User), -1: 白(AI)
        this.gameHistory = [];
        this.boardHistory = []; 
        this.consecutivePasses = 0;
        this.aiEnabled = true;
        this.gameOver = false;
        this.prisoners = { black: 0, white: 0 };
        this.lastMove = null;

        // 設定頁籤標題
        document.title = "11XXXXX -FinalTerm";

        this.initBoard();
        this.drawBoard();
        this.updateStatus();
        this.updateInfo();
    }

    initBoard() {
        this.board = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(0));
        this.gameHistory = [];
        this.boardHistory = [];
        this.prisoners = { black: 0, white: 0 };
        this.gameOver = false;
        this.consecutivePasses = 0;
        this.lastMove = null;
    }

    // --- UI 繪製與地盤提示 ---
    drawBoard() {
        const boardEl = document.getElementById('board');
        boardEl.innerHTML = '';
        let atariFound = false;
        const starPoints = [[2, 2], [2, 6], [4, 4], [6, 2], [6, 6]];

        for (let r = 0; r < this.boardSize; r++) {
            for (let c = 0; c < this.boardSize; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = r;
                cell.dataset.col = c;

                // 1. 活棋地盤提示 (墊在格線下方，由 CSS background 控制)
                if (this.board[r][c] === 0 && !this.gameOver) {
                    const owner = this.getQuickOwner(r, c);
                    if (owner === 1) cell.classList.add('hint-black');
                    else if (owner === -1) cell.classList.add('hint-white');
                }

                if (starPoints.some(p => p[0] === r && p[1] === c)) {
                    const star = document.createElement('div');
                    star.className = 'star-point';
                    cell.appendChild(star);
                }

                if (this.board[r][c] !== 0) {
                    const stone = document.createElement('div');
                    stone.className = `stone ${this.board[r][c] === 1 ? 'black' : 'white'}`;
                    stone.id = `stone-${r}-${c}`;

                    if (this.lastMove && this.lastMove.row === r && this.lastMove.col === c) {
                        stone.classList.add('last-move');
                    }

                    const libCount = this.getLibertiesCount(this.board, r, c);
                    if (libCount === 1) {
                        stone.classList.add('atari-warning');
                        atariFound = true;
                        const badge = document.createElement('div');
                        badge.className = 'liberty-count';
                        badge.textContent = '1';
                        cell.appendChild(badge);
                    }
                    cell.appendChild(stone);
                }

                cell.addEventListener('click', () => this.handleUserClick(r, c));
                boardEl.appendChild(cell);
            }
        }
        return atariFound;
    }

    // --- AI 邏輯：具備虛手意識與眼位保護 ---
    aiMove() {
        if (this.gameOver) return;
        let bestScore = -Infinity;
        let bestMoves = [];

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (this.board[r][c] === 0) {
                    let testBoard = JSON.parse(JSON.stringify(this.board));
                    testBoard[r][c] = -1;

                    // A. 規則檢查：禁止自殺
                    if (!this.hasLiberties(testBoard, r, c)) {
                        let canCapture = false;
                        for (let [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                            let nr = r + dr, nc = c + dc;
                            if (nr>=0 && nr<9 && nc>=0 && nc<9 && this.board[nr][nc] === 1) {
                                if (!this.hasLiberties(testBoard, nr, nc)) canCapture = true;
                            }
                        }
                        if (!canCapture) continue;
                    }

                    // B. 戰術檢查：禁止填入自己的「真眼」
                    if (this.isTrueEye(r, c, -1)) continue;

                    let score = Math.random() * 2; 

                    // 1. 吃子權重
                    for (let [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                        let nr = r + dr, nc = c + dc;
                        if (nr>=0 && nr<9 && nc>=0 && nc<9 && this.board[nr][nc] === 1) {
                            if (!this.hasLiberties(testBoard, nr, nc)) score += 50;
                        }
                    }

                    // 2. 防禦權重 (救回自己快被吃掉的棋)
                    for (let [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                        let nr = r + dr, nc = c + dc;
                        if (nr>=0 && nr<9 && nc>=0 && nc<9 && this.board[nr][nc] === -1) {
                            if (this.getLibertiesCount(this.board, nr, nc) === 1) score += 45;
                        }
                    }

                    // 3. 區域意識：優先下在邊界或敵陣
                    const owner = this.getQuickOwner(r, c);
                    if (owner === 1) score += 15; // 進攻黑棋地盤
                    else if (owner === 0) score += 10; // 搶佔公用地
                    else if (owner === -1) score -= 30; // 避開自家腹地自殘

                    // 4. 基礎地位 (星位偏好)
                    if ([[2,2],[2,6],[4,4],[6,2],[6,6]].some(p => p[0]===r && p[1]===c)) score += 8;

                    if (score > bestScore) {
                        bestScore = score;
                        bestMoves = [{ r, c }];
                    } else if (score === bestScore) {
                        bestMoves.push({ r, c });
                    }
                }
            }
        }

        // 虛手判定：如果最佳動作的得分太低（代表無處可下且不應自殘），則虛手
        if (bestMoves.length > 0 && bestScore > 5) {
            const move = bestMoves[Math.floor(Math.random() * bestMoves.length)];
            this.playMove(move.r, move.c);
        } else {
            this.pass();
        }
    }

    isTrueEye(r, c, color) {
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (let [dr, dc] of dirs) {
            let nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) {
                if (this.board[nr][nc] !== color) return false;
            }
        }
        return true;
    }

    // --- 核心邏輯與落子處理 ---
    async handleUserClick(r, c) {
        if (this.gameOver || this.currentPlayer !== 1) return;
        if (await this.playMove(r, c)) {
            if (this.aiEnabled && !this.gameOver) setTimeout(() => this.aiMove(), 600);
        }
    }

    async playMove(row, col) {
        if (row < 0 || row >= 9 || col < 0 || col >= 9 || this.board[row][col] !== 0) return false;

        const player = this.currentPlayer;
        const opponent = -player;
        let nextBoard = JSON.parse(JSON.stringify(this.board));
        nextBoard[row][col] = player;

        let capturedStones = [];
        for (let [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
            const nr = row + dr, nc = col + dc;
            if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9 && nextBoard[nr][nc] === opponent) {
                if (!this.hasLiberties(nextBoard, nr, nc)) {
                    this.findGroup(nextBoard, nr, nc).forEach(s => capturedStones.push(s));
                }
            }
        }

        if (capturedStones.length === 0 && !this.hasLiberties(nextBoard, row, col)) {
            this.showTempStatus("❌ 禁著點：禁止自殺！");
            return false;
        }

        const boardHash = JSON.stringify(nextBoard);
        if (this.boardHistory.includes(boardHash)) {
            this.showTempStatus("❌ 禁著點：打劫！");
            return false;
        }

        if (capturedStones.length > 0) {
            capturedStones.forEach(s => document.getElementById(`stone-${s.r}-${s.c}`)?.classList.add('captured'));
            await new Promise(res => setTimeout(res, 250));
        }

        this.gameHistory.push({
            board: JSON.parse(JSON.stringify(this.board)),
            player: this.currentPlayer,
            prisoners: { ...this.prisoners },
            lastMove: this.lastMove,
            boardHistory: [...this.boardHistory]
        });

        capturedStones.forEach(s => nextBoard[s.r][s.c] = 0);
        this.board = nextBoard;
        if (player === 1) this.prisoners.black += capturedStones.length;
        else this.prisoners.white += capturedStones.length;

        this.boardHistory.push(boardHash);
        this.lastMove = { row, col };
        this.consecutivePasses = 0;

        this.drawBoard();
        this.updateInfo();
        this.currentPlayer = opponent;
        this.updateStatus();
        return true;
    }

    // --- 終局判定：9x9 中國規則數子法 ---
    endGame() {
        this.gameOver = true;
        let bS = 0, wS = 0;
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (this.board[r][c] === 1) bS++;
                else if (this.board[r][c] === -1) wS++;
            }
        }

        const territory = this.calculateTerritory();
        const blackArea = bS + territory.black;
        const blackNetScore = blackArea - 3.75; // 先手貼 3.75 子
        const isBlackWin = blackNetScore > 40.5; // 總格 81 的一半

        const msg = isBlackWin ? 
            `黑勝！(總點數 ${blackArea} - 貼子 3.75 = ${blackNetScore})` : 
            `白勝！(黑棋得分 ${blackNetScore} 未達 40.5)`;

        document.getElementById('status').innerHTML = `
            <div style="border:2px solid gold; padding:10px; background:rgba(0,0,0,0.5);">
                🏁 終局：${msg}
            </div>
        `;
        this.drawBoard();
    }

    pass() {
        if (this.gameOver) return;
        this.consecutivePasses++;
        this.gameHistory.push({ board: JSON.parse(JSON.stringify(this.board)), player: this.currentPlayer, prisoners: { ...this.prisoners }, lastMove: this.lastMove, boardHistory: [...this.boardHistory] });
        if (this.consecutivePasses >= 2) return this.endGame();
        this.currentPlayer = -this.currentPlayer;
        this.updateStatus();
        if (this.currentPlayer === -1 && this.aiEnabled) setTimeout(() => this.aiMove(), 600);
    }

    // --- 工具函式與統計 ---
    getQuickOwner(r, c) {
        let sc = 0;
        for (let i=0; i<81; i++) if (this.board[Math.floor(i/9)][i%9] !== 0) sc++;
        if (sc < 6) return 0; // 開局閃爍保護
        let v = Array(9).fill().map(() => Array(9).fill(false));
        const reg = this.floodFill(r, c, v);
        return reg.size > 40 ? 0 : reg.owner;
    }

    updateInfo() {
        document.getElementById('blackInfo').textContent = `提子: ${this.prisoners.black}`;
        document.getElementById('whiteInfo').textContent = `提子: ${this.prisoners.white}`;
        let b = 0, w = 0;
        for (let i=0; i<81; i++) {
            const val = this.board[Math.floor(i/9)][i%9];
            if (val === 1) b++; else if (val === -1) w++;
        }
        if (document.getElementById('blackCount')) document.getElementById('blackCount').textContent = `盤面: ${b} 子`;
        if (document.getElementById('whiteCount')) document.getElementById('whiteCount').textContent = `盤面: ${w} 子`;
    }

    updateStatus() {
        if (this.gameOver) return;
        const el = document.getElementById('status');
        el.innerHTML = this.currentPlayer === 1 ? "🖤 黑棋回合" : "⚪ 白棋回合";
    }

    showTempStatus(msg) {
        const el = document.getElementById('status');
        const old = el.innerHTML; el.textContent = msg;
        setTimeout(() => { if (!this.gameOver) el.innerHTML = old; }, 1500);
    }

    // --- 棋盤邏輯運算 (findGroup, hasLiberties, calculateTerritory, floodFill 略，保持與前版一致) ---
    findGroup(board, r, c) {
        const group = [];
        const color = board[r][c], v = Array(9).fill().map(() => Array(9).fill(false));
        const stack = [{r, c}]; v[r][c] = true;
        while (stack.length > 0) {
            const curr = stack.pop(); group.push(curr);
            for (let [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                const nr=curr.r+dr, nc=curr.c+dc;
                if (nr>=0 && nr<9 && nc>=0 && nc<9 && board[nr][nc] === color && !v[nr][nc]) {
                    v[nr][nc] = true; stack.push({r: nr, c: nc});
                }
            }
        }
        return group;
    }

    hasLiberties(board, r, c) {
        const color = board[r][c], v = Array(9).fill().map(() => Array(9).fill(false));
        const stack = [{r, c}]; v[r][c] = true;
        while (stack.length > 0) {
            const curr = stack.pop();
            for (let [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                const nr=curr.r+dr, nc=curr.c+dc;
                if (nr>=0 && nr<9 && nc>=0 && nc<9) {
                    if (board[nr][nc] === 0) return true;
                    if (board[nr][nc] === color && !v[nr][nc]) {
                        v[nr][nc] = true; stack.push({r: nr, c: nc});
                    }
                }
            }
        }
        return false;
    }

    getLibertiesCount(board, r, c) {
        const group = this.findGroup(board, r, c);
        const libs = new Set();
        group.forEach(s => {
            for (let [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                const nr=s.r+dr, nc=s.c+dc;
                if (nr>=0 && nr<9 && nc>=0 && nc<9 && board[nr][nc] === 0) libs.add(`${nr},${nc}`);
            }
        });
        return libs.size;
    }

    calculateTerritory() {
        let bT = 0, wT = 0, v = Array(9).fill().map(() => Array(9).fill(false));
        for (let r=0; r<9; r++) for (let c=0; c<9; c++) {
            if (this.board[r][c] === 0 && !v[r][c]) {
                const reg = this.floodFill(r, c, v);
                if (reg.owner === 1) bT += reg.size; else if (reg.owner === -1) wT += reg.size;
            }
        }
        return { black: bT, white: wT };
    }

    floodFill(r, c, v) {
        let stack = [{ r, c }], size = 0, tB = false, tW = false;
        v[r][c] = true;
        while (stack.length > 0) {
            const curr = stack.pop(); size++;
            for (let [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
                const nr = curr.r + dr, nc = curr.c + dc;
                if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) {
                    if (this.board[nr][nc] === 1) tB = true;
                    else if (this.board[nr][nc] === -1) tW = true;
                    else if (this.board[nr][nc] === 0 && !v[nr][nc]) {
                        v[nr][nc] = true; stack.push({ r: nr, c: nc });
                    }
                }
            }
        }
        return { size, owner: (tB && !tW) ? 1 : (!tB && tW ? -1 : 0) };
    }

    undoMove() {
        if (this.gameHistory.length === 0 || this.gameOver) return;
        const s = this.gameHistory.pop();
        this.board = s.board; this.currentPlayer = s.player; this.prisoners = s.prisoners;
        this.lastMove = s.lastMove; this.boardHistory = s.boardHistory;
        this.consecutivePasses = 0; this.drawBoard(); this.updateStatus(); this.updateInfo();
    }
}

let game;
function newGame() { game = new NineBoardGo(); }
function toggleAI() { if (game) { game.aiEnabled = !game.aiEnabled; document.getElementById('aiBtn').textContent = `AI開關 (${game.aiEnabled ? '開' : '關'})`; } }
window.onload = newGame;