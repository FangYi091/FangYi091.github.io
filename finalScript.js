class NineBoardGo {
    constructor() {
        this.boardSize = 9;
        this.board = [];
        this.currentPlayer = 1; // 1: 黑, -1: 白
        this.gameHistory = []; 
        this.boardHistory = []; 
        this.consecutivePasses = 0;
        this.aiEnabled = true;
        this.gameOver = false;
        this.prisoners = { black: 0, white: 0 };
        this.lastMove = null;

        this.initBoard();
        this.drawBoard();
        this.updateStatus();
    }

    initBoard() {
        this.board = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(0));
        this.gameHistory = [];
        this.boardHistory = [];
        this.prisoners = { black: 0, white: 0 };
    }

    drawBoard() {
        const boardEl = document.getElementById('board');
        boardEl.innerHTML = '';
        let atariFound = false;
        const starPoints = [[2,2],[2,6],[4,4],[6,2],[6,6]];
        
        for (let r = 0; r < this.boardSize; r++) {
            for (let c = 0; c < this.boardSize; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = r;
                cell.dataset.col = c;
                
                // 1. 活棋地盤提示 (墊底)
                if (this.board[r][c] === 0 && !this.gameOver) {
                    const owner = this.getQuickOwner(r, c);
                    if (owner === 1) cell.classList.add('hint-black');
                    else if (owner === -1) cell.classList.add('hint-white');
                }

                // 2. 星位
                if (starPoints.some(p => p[0] === r && p[1] === c)) {
                    const star = document.createElement('div');
                    star.className = 'star-point';
                    cell.appendChild(star);
                }
                
                // 3. 棋子與叫吃
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

    async handleUserClick(row, col) {
        if (this.gameOver || this.currentPlayer !== 1) return;
        if (await this.playMove(row, col)) {
            if (this.aiEnabled && !this.gameOver) setTimeout(() => this.aiMove(), 500);
        }
    }

    async playMove(row, col) {
        if (row < 0 || row >= 9 || col < 0 || col >= 9 || this.board[row][col] !== 0) return false;

        const player = this.currentPlayer;
        const opponent = -player;
        let nextBoard = JSON.parse(JSON.stringify(this.board));
        nextBoard[row][col] = player;

        let capturedStones = [];
        const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
        for (let [dr, dc] of dirs) {
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

        // 提子動畫
        if (capturedStones.length > 0) {
            capturedStones.forEach(s => document.getElementById(`stone-${s.r}-${s.c}`)?.classList.add('captured'));
            await new Promise(res => setTimeout(res, 250));
        }

        this.gameHistory.push({
            board: JSON.parse(JSON.stringify(this.board)),
            player: this.currentPlayer,
            prisoners: {...this.prisoners},
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
        
        const isAtari = this.drawBoard();
        this.updateInfo();
        this.currentPlayer = opponent;
        this.updateStatus(isAtari);
        return true;
    }

    // --- AI 邏輯 (完全保留) ---
    aiMove() {
        if (this.gameOver) return;
        let bestScore = -Infinity, bestMoves = [];
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (this.board[r][c] === 0) {
                    let testBoard = JSON.parse(JSON.stringify(this.board));
                    testBoard[r][c] = -1;
                    if (!this.hasLiberties(testBoard, r, c)) continue;
                    let score = Math.random() * 10;
                    if ((r===2||r===6) && (c===2||c===6)) score += 5;
                    if (r===4 && c===4) score += 3;
                    [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr, dc]) => {
                        let nr = r + dr, nc = c + dc;
                        if (nr>=0 && nr<9 && nc>=0 && nc<9 && this.board[nr][nc]===1 && !this.hasLiberties(testBoard, nr, nc)) score += 50;
                    });
                    if (score > bestScore) { bestScore = score; bestMoves = [{r, c}]; }
                    else if (score === bestScore) bestMoves.push({r, c});
                }
            }
        }
        if (bestMoves.length > 0) {
            const move = bestMoves[Math.floor(Math.random() * bestMoves.length)];
            this.playMove(move.r, move.c);
        } else this.pass();
    }

    // --- 輔助函式 ---
    getLibertiesCount(board, r, c) {
        const group = this.findGroup(board, r, c);
        const liberties = new Set();
        group.forEach(s => {
            [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr, dc]) => {
                const nr = s.r+dr, nc = s.c+dc;
                if (nr>=0 && nr<9 && nc>=0 && nc<9 && board[nr][nc] === 0) liberties.add(`${nr},${nc}`);
            });
        });
        return liberties.size;
    }

    hasLiberties(board, r, c) {
        const visited = Array(9).fill().map(() => Array(9).fill(false));
        const color = board[r][c];
        const stack = [{r, c}];
        visited[r][c] = true;
        while (stack.length > 0) {
            const curr = stack.pop();
            for (let [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                const nr = curr.r+dr, nc = curr.c+dc;
                if (nr>=0 && nr<9 && nc>=0 && nc<9) {
                    if (board[nr][nc] === 0) return true;
                    if (board[nr][nc] === color && !visited[nr][nc]) {
                        visited[nr][nc] = true; stack.push({r: nr, c: nc});
                    }
                }
            }
        }
        return false;
    }

    findGroup(board, r, c) {
        const group = [];
        const color = board[r][c], visited = Array(9).fill().map(() => Array(9).fill(false));
        const stack = [{r, c}]; visited[r][c] = true;
        while (stack.length > 0) {
            const curr = stack.pop(); group.push(curr);
            for (let [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                const nr = curr.r+dr, nc = curr.c+dc;
                if (nr>=0 && nr<9 && nc>=0 && nc<9 && board[nr][nc] === color && !visited[nr][nc]) {
                    visited[nr][nc] = true; stack.push({r: nr, c: nc});
                }
            }
        }
        return group;
    }

    // 改善後的活棋歸屬判斷
getQuickOwner(r, c) {
    // 如果盤面子數太少（例如小於 6 子），不顯示提示，避免全盤變色的閃爍感
    let totalStones = 0;
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (this.board[row][col] !== 0) totalStones++;
        }
    }
    if (totalStones < 6) return 0;

    let visited = Array(9).fill().map(() => Array(9).fill(false));
    const region = this.floodFill(r, c, visited);
    
    // 只有當區域大小合理（例如小於盤面的一半），才顯示提示
    // 這樣可以防止第一手就全盤變色
    if (region.size > 40) return 0; 
    
    return region.owner;
}

    // --- 資訊顯示 ---
    updateInfo() {
        document.getElementById('blackInfo').textContent = `提子: ${this.prisoners.black}`;
        document.getElementById('whiteInfo').textContent = `提子: ${this.prisoners.white}`;
        
        // 動態子數統計
        let b = 0, w = 0;
        for (let r=0; r<9; r++) for (let c=0; c<9; c++) {
            if (this.board[r][c] === 1) b++; else if (this.board[r][c] === -1) w++;
        }
        if (document.getElementById('blackCount')) document.getElementById('blackCount').textContent = `盤面: ${b} 子`;
        if (document.getElementById('whiteCount')) document.getElementById('whiteCount').textContent = `盤面: ${w} 子`;
    }

    updateStatus(atari) {
        if (this.gameOver) return;
        const el = document.getElementById('status');
        let text = this.currentPlayer === 1 ? "🖤 黑棋回合" : "⚪ 白棋回合";
        if (atari) text += ` <span style="color:#ff4757;">⚠️ 叫吃!</span>`;
        el.innerHTML = text;
    }

    showTempStatus(msg) {
        const el = document.getElementById('status');
        const old = el.innerHTML; el.textContent = msg;
        setTimeout(() => { if(!this.gameOver) el.innerHTML = old; }, 1500);
    }

    // --- 終局計分 (保留原邏輯) ---
    pass() {
        if (this.gameOver) return;
        this.consecutivePasses++;
        this.gameHistory.push({ board: JSON.parse(JSON.stringify(this.board)), player: this.currentPlayer, prisoners: {...this.prisoners}, lastMove: this.lastMove, boardHistory: [...this.boardHistory]});
        document.getElementById('passCount').textContent = this.consecutivePasses;
        if (this.consecutivePasses >= 2) return this.endGame();
        this.currentPlayer = -this.currentPlayer;
        this.updateStatus();
        if (this.currentPlayer === -1 && this.aiEnabled) setTimeout(() => this.aiMove(), 800);
    }

    undoMove() {
        if (this.gameHistory.length === 0 || this.gameOver) return;
        const s = this.gameHistory.pop();
        this.board = s.board; this.currentPlayer = s.player; this.prisoners = s.prisoners;
        this.lastMove = s.lastMove; this.boardHistory = s.boardHistory;
        this.consecutivePasses = 0; document.getElementById('passCount').textContent = 0;
        this.drawBoard(); this.updateStatus(); this.updateInfo();
    }

    endGame() {
        this.gameOver = true;
        let bS=0, wS=0;
        for(let r=0; r<9; r++) for(let c=0; c<9; c++) {
            if(this.board[r][c] === 1) bS++; else if(this.board[r][c] === -1) wS++;
        }
        const territory = this.calculateTerritory();
        const bArea = bS + territory.black;
        const bNet = bArea - 3.75;
        const winner = bNet > 40.5 ? '黑勝' : '白勝';
        document.getElementById('status').innerHTML = `<div style="border:2px solid gold; padding:5px; border-radius:8px;">🏁 終局：${winner} (黑淨分:${bNet})</div>`;
    }

    calculateTerritory() {
        let bT=0, wT=0, v = Array(9).fill().map(() => Array(9).fill(false));
        for(let r=0; r<9; r++) for(let c=0; c<9; c++) {
            if(this.board[r][c] === 0 && !v[r][c]) {
                const reg = this.floodFill(r, c, v);
                if(reg.owner === 1) bT += reg.size; else if(reg.owner === -1) wT += reg.size;
            }
        }
        return { black: bT, white: wT };
    }

    floodFill(r, c, v) {
        let stack = [{r, c}], size = 0, tB = false, tW = false;
        v[r][c] = true;
        while (stack.length > 0) {
            const curr = stack.pop(); size++;
            for (let [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                const nr=curr.r+dr, nc=curr.c+dc;
                if (nr>=0 && nr<9 && nc>=0 && nc<9) {
                    if (this.board[nr][nc] === 1) tB = true;
                    else if (this.board[nr][nc] === -1) tW = true;
                    else if (this.board[nr][nc] === 0 && !v[nr][nc]) {
                        v[nr][nc] = true; stack.push({r: nr, c: nc});
                    }
                }
            }
        }
        return { size, owner: (tB && !tW) ? 1 : (!tB && tW ? -1 : 0) };
    }
}

let game;
function newGame() { game = new NineBoardGo(); }
function toggleAI() { if(game) { game.aiEnabled = !game.aiEnabled; document.getElementById('aiBtn').textContent = `AI開關 (${game.aiEnabled?'開':'關'})`; }}
window.onload = newGame;