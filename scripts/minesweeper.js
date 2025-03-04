const DIFFICULTIES = {
    easy: { size: 6, mines: 6, name: '简单' },
    medium: { size: 10, mines: 12, name: '中等' },
    hard: { size: 12, mines: 25, name: '困难' }
};

let GRID_SIZE = DIFFICULTIES.medium.size;
let MINE_COUNT = DIFFICULTIES.medium.mines;
let grid = [];
let gameOver = false;
let timer = null;
let timeElapsed = 0;
let flagCount = 0;
let highScores = JSON.parse(localStorage.getItem('minesweeperHighScores')) || [];

function initializeGame() {
    const gameDiv = document.getElementById('game');
    const messageDiv = document.getElementById('message');
    gameDiv.innerHTML = '';
    messageDiv.textContent = '';
    grid = [];
    gameOver = false;
    gameDiv.classList.remove('game-over');
    stopTimer();
    timeElapsed = 0;
    updateTimerDisplay();
    flagCount = 0;
    hideModal();

    gameDiv.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 40px)`;

    // 创建网格
    for (let i = 0; i < GRID_SIZE; i++) {
        grid[i] = [];
        for (let j = 0; j < GRID_SIZE; j++) {
            grid[i][j] = {
                isMine: false,
                isRevealed: false,
                count: 0,
                isFlagged: false
            };
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = i;
            cell.dataset.col = j;
            cell.addEventListener('click', handleClick);
            cell.addEventListener('contextmenu', handleRightClick);
            gameDiv.appendChild(cell);
        }
    }

    // 随机放置地雷
    let minesPlaced = 0;
    while (minesPlaced < MINE_COUNT) {
        const row = Math.floor(Math.random() * GRID_SIZE);
        const col = Math.floor(Math.random() * GRID_SIZE);
        if (!grid[row][col].isMine) {
            grid[row][col].isMine = true;
            minesPlaced++;
        }
    }

    // 计算每个格子的数字
    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            if (!grid[i][j].isMine) {
                grid[i][j].count = countMines(i, j);
            }
        }
    }

    // 更新当前难度的高分榜
    const difficulty = document.getElementById('difficulty').value;
    updateHighScores(difficulty, true);  // 修改为 true，确保每次都清空并重新加载高分榜
}

function countMines(row, col) {
    let count = 0;
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            const newRow = row + i;
            const newCol = col + j;
            if (newRow >= 0 && newRow < GRID_SIZE &&
                newCol >= 0 && newCol < GRID_SIZE &&
                grid[newRow][newCol].isMine) {
                count++;
            }
        }
    }
    return count;
}

function handleClick(e) {
    if (gameOver) return;
    const row = parseInt(e.target.dataset.row);
    const col = parseInt(e.target.dataset.col);

    if (!timer) {
        startTimer();
    }

    if (!grid[row][col].isFlagged) {
        revealCell(row, col);
        updateDisplay();
        checkWin();
    }
}

function handleRightClick(e) {
    e.preventDefault();
    if (gameOver || flagCount >= MINE_COUNT) return;
    const cell = e.target;
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);

    if (!cell.classList.contains('revealed')) {
        if (!grid[row][col].isFlagged) {
            cell.textContent = '🚩';
            grid[row][col].isFlagged = true;
            flagCount++;
        } else {
            cell.textContent = '';
            grid[row][col].isFlagged = false;
            flagCount--;
        }
    }
    checkWin();
}

function clearHighScores() {
    const difficulty = document.getElementById('difficulty').value;
    localStorage.removeItem(`minesweeperHighScores-${difficulty}`);
    updateHighScores(difficulty, true);
    alert(`${DIFFICULTIES[difficulty].name}难度的高分榜已清空！`);
}

function revealCell(row, col) {
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE ||
        grid[row][col].isRevealed || grid[row][col].isFlagged) {
        return;
    }

    grid[row][col].isRevealed = true;
    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    cell.classList.add('revealed');

    // 如果点击的是雷，显示失败提示并结束游戏
    if (grid[row][col].isMine) {
        cell.classList.add('mine');
        cell.textContent = '💣';
        gameOver = true;
        document.getElementById('game').classList.add('game-over');
        stopTimer();
        showModal('很遗憾，你踩到了地雷！', '重新开始', resetGame);
        return;
    }

    // 如果周围有数字，显示数字
    if (grid[row][col].count > 0) {
        cell.textContent = grid[row][col].count;
    } else {
        // 使用广度优先搜索（BFS）自动展开空白格子
        const queue = [[row, col]];
        const visited = new Set();
        visited.add(`${row},${col}`);  // 加入当前格子，以防重复处理

        while (queue.length > 0) {
            const [r, c] = queue.shift();
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    const newRow = r + i;
                    const newCol = c + j;

                    // 确保新的格子在有效范围内，并且没有被访问过
                    if (newRow >= 0 && newRow < GRID_SIZE &&
                        newCol >= 0 && newCol < GRID_SIZE &&
                        !visited.has(`${newRow},${newCol}`) &&
                        !grid[newRow][newCol].isRevealed &&
                        !grid[newRow][newCol].isFlagged) {

                        visited.add(`${newRow},${newCol}`);  // 标记该格子为已访问
                        grid[newRow][newCol].isRevealed = true;
                        const currentCell = document.querySelector(`[data-row="${newRow}"][data-col="${newCol}"]`);
                        currentCell.classList.add('revealed');
                        if (grid[newRow][newCol].isMine) {
                            currentCell.classList.add('mine');
                            currentCell.textContent = '💣';
                        } else if (grid[newRow][newCol].count > 0) {
                            currentCell.textContent = grid[newRow][newCol].count;
                        } else {
                            queue.push([newRow, newCol]);  // 添加相邻空白格子到队列中
                        }
                    }
                }
            }
        }
    }
    updateDisplay(); // 确保界面实时更新

    // 每次点击后检查是否通关
    checkWin();
}

function updateDisplay() {
    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            const cell = document.querySelector(`[data-row="${i}"][data-col="${j}"]`);
            if (grid[i][j].isRevealed) {
                cell.classList.add('revealed');
                if (grid[i][j].isMine) {
                    cell.classList.add('mine');
                    cell.textContent = '💣';
                } else if (grid[i][j].count > 0) {
                    cell.textContent = grid[i][j].count;
                }
            } else if (grid[i][j].isFlagged) {
                cell.textContent = '🚩';
            } else {
                cell.textContent = '';
            }
        }
    }
}

function checkWin() {
    if (gameOver) return;
    let unrevealedNonMines = 0;

    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            if (!grid[i][j].isRevealed && !grid[i][j].isMine) {
                unrevealedNonMines++;
            }
        }
    }

    if (unrevealedNonMines === 0) {
        gameOver = true;
        stopTimer();
        const difficulty = document.getElementById('difficulty').value;
        addHighScore(timeElapsed, difficulty);

        // 显示通关提示框
        showModal(
            `恭喜你成功通关！用时：${timeElapsed.toFixed(1)}秒`,
            '继续游戏',
            resetGame
        );
    }
}

function startTimer() {
    if (!timer) {
        timer = setInterval(() => {
            timeElapsed += 0.1;
            updateTimerDisplay();
        }, 100);
    }
}

function stopTimer() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

function updateTimerDisplay() {
    document.getElementById('timer').textContent =
        `时间: ${timeElapsed.toFixed(1)}秒`;
}

function addHighScore(time, difficulty) {
    // 获取当前难度的高分榜
    let difficultyScores = JSON.parse(localStorage.getItem(`minesweeperHighScores-${difficulty}`)) || [];
    
    // 检查是否有完全相同的成绩记录（避免重复）
    const isDuplicate = difficultyScores.some(score => 
        Math.abs(score.time - time) < 0.1 && 
        score.difficulty === DIFFICULTIES[difficulty].name
    );
    
    // 如果不是重复记录，才添加到高分榜
    if (!isDuplicate) {
        // 添加新的成绩
        difficultyScores.push({
            time: time,
            difficulty: DIFFICULTIES[difficulty].name,
            date: new Date().toLocaleDateString() // 可选：记录日期
        });
        
        // 排序并保留前5名
        difficultyScores.sort((a, b) => a.time - b.time);
        difficultyScores = difficultyScores.slice(0, 5);
        
        // 保存更新后的高分榜
        localStorage.setItem(`minesweeperHighScores-${difficulty}`, JSON.stringify(difficultyScores));
    }
    
    // 更新页面中的高分榜显示
    updateHighScores(difficulty, true);
}

function updateHighScores(difficulty, shouldClear = false) {
    const scoreList = document.getElementById('score-list');

    // 只有在需要更新时才清空内容
    if (shouldClear) {
        scoreList.innerHTML = '';  // 清空现有的高分榜
    }

    // 从 localStorage 获取当前难度的高分榜
    let difficultyScores = JSON.parse(localStorage.getItem(`minesweeperHighScores-${difficulty}`)) || [];

    // 更新页面中的高分榜，只显示前5名
    difficultyScores.forEach((score, index) => {
        const li = document.createElement('li');
        li.textContent = `${index + 1}. ${score.time.toFixed(1)}秒 (${score.difficulty})`;
        scoreList.appendChild(li);  // 显示新的高分榜
    });
}

function changeDifficulty() {
    const difficulty = document.getElementById('difficulty').value;
    GRID_SIZE = DIFFICULTIES[difficulty].size;
    MINE_COUNT = DIFFICULTIES[difficulty].mines;
    resetGame();
    updateHighScores(difficulty, true);  // 修改这里，直接传递difficulty值
}

function resetGame() {
    initializeGame();
}

function showModal(message, buttonText, buttonAction) {
    const modal = document.getElementById('modal');
    const overlay = document.getElementById('modal-overlay');
    const modalMessage = document.getElementById('modal-message');
    const modalButton = document.getElementById('modal-button');

    modalMessage.textContent = message;
    modalButton.textContent = buttonText;
    modalButton.onclick = buttonAction;

    modal.classList.remove('hidden');
    overlay.classList.remove('hidden');
}

function hideModal() {
    const modal = document.getElementById('modal');
    const overlay = document.getElementById('modal-overlay');
    modal.classList.add('hidden');
    overlay.classList.add('hidden');
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', function() {
    initializeGame();
    
    // 添加事件监听器
    document.getElementById('clear-scores').addEventListener('click', clearHighScores);
});