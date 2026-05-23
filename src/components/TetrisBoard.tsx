import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ArrowLeft, 
  ArrowRight, 
  ArrowDown, 
  ArrowUp, 
  ChevronsDown, 
  RefreshCcw, 
  Volume2, 
  VolumeX, 
  Award, 
  Zap, 
  Layers, 
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BlockType, 
  Position, 
  Grid, 
  GameStatus, 
  Tetromino, 
  BOARD_COLS, 
  BOARD_ROWS, 
  TETROMINOES 
} from '../types';

// Simple interface for line-clear particle effects
interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export default function TetrisBoard() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Game state
  const [grid, setGrid] = useState<Grid>(
    Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null))
  );
  
  const [currentPiece, setCurrentPiece] = useState<{
    type: Exclude<BlockType, null>;
    matrix: number[][];
    x: number;
    y: number;
  } | null>(null);

  const [nextPiece, setNextPiece] = useState<Exclude<BlockType, null>>('I');
  const [holdPiece, setHoldPiece] = useState<Exclude<BlockType, null> | null>(null);
  const [hasHeld, setHasHeld] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [lines, setLines] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [gameStatus, setGameStatus] = useState<GameStatus>('WELCOME');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [flashRows, setFlashRows] = useState<number[]>([]);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  
  // Ref-based states to bypass closure issues in the main loop
  const gridRef = useRef<Grid>(grid);
  const currentPieceRef = useRef(currentPiece);
  const statusRef = useRef<GameStatus>(gameStatus);
  const particlesRef = useRef<Particle[]>([]);
  const nextIdRef = useRef<number>(0);
  
  // Bag-of-7 randomizer to guarantee uniform block distribution
  const bagRef = useRef<Exclude<BlockType, null>[]>([]);
  
  // High score local-storage syncer
  useEffect(() => {
    const saved = localStorage.getItem('tetris_high_score');
    if (saved) {
      setHighScore(parseInt(saved, 10));
    }
  }, []);

  const saveHighScore = useCallback((newScore: number) => {
    if (newScore > highScore) {
      setHighScore(newScore);
      localStorage.setItem('tetris_high_score', newScore.toString());
    }
  }, [highScore]);

  // Sync ref values
  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { currentPieceRef.current = currentPiece; }, [currentPiece]);
  useEffect(() => { statusRef.current = gameStatus; }, [gameStatus]);

  // Audio synths (Web Audio API) for sound effects
  const playSound = useCallback((type: 'move' | 'rotate' | 'clear' | 'drop' | 'gameover' | 'level' | 'hold') => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      const now = audioCtx.currentTime;

      if (type === 'move') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.1);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'rotate') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.setValueAtTime(300, now + 0.05);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'hold') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'clear') {
        // High pitched retro double chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'drop') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.setValueAtTime(40, now + 0.08);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'level') {
        // Arpeggio
        osc.type = 'sawtooth';
        const freqs = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        freqs.forEach((freq, idx) => {
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        });
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'gameover') {
        // Falling sad tone
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(60, now + 0.6);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      }
    } catch (e) {
      console.warn("Audio Context is blocked or not supported on this device", e);
    }
  }, [soundEnabled]);

  // Generate random piece from bag
  const getNextPieceFromBag = (): Exclude<BlockType, null> => {
    if (bagRef.current.length === 0) {
      const all: Exclude<BlockType, null>[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
      // Shuffle list (7-bag)
      for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
      }
      bagRef.current = all;
    }
    return bagRef.current.pop()!;
  };

  // Helper for collision checking
  const checkCollision = (
    matrix: number[][],
    offset: Position,
    boardGrid: Grid
  ): boolean => {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c] !== 0) {
          const boardX = offset.x + c;
          const boardY = offset.y + r;

          // Check walls
          if (boardX < 0 || boardX >= BOARD_COLS || boardY >= BOARD_ROWS) {
            return true;
          }

          // Check occupied grid space (ignore above grid top of -1 or -2 optionally, or constraint them)
          if (boardY >= 0) {
            if (boardGrid[boardY][boardX] !== null) {
              return true;
            }
          } else {
            // Above high screen blocks - allow x movement but clamp left and right
            if (boardX < 0 || boardX >= BOARD_COLS) {
              return true;
            }
          }
        }
      }
    }
    return false;
  };

  // Create blast particles
  const createClearParticles = (rows: number[]) => {
    const freshParticles: Particle[] = [];
    rows.forEach((rowIdx) => {
      // Create particles along the cleared row
      for (let c = 0; c < BOARD_COLS; c++) {
        const color = gridRef.current[rowIdx][c] 
          ? TETROMINOES[gridRef.current[rowIdx][c] as Exclude<BlockType, null>].color 
          : '#3b82f6';
        
        // Block grid placement canvas position estimation
        const baseCanvasX = c * 30 + 15;
        const baseCanvasY = rowIdx * 30 + 15;
        
        // 5-8 particles per block
        const count = 4 + Math.floor(Math.random() * 4);
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 1.5 + Math.random() * 4;
          const life = 15 + Math.floor(Math.random() * 20);
          
          freshParticles.push({
            id: nextIdRef.current++,
            x: baseCanvasX,
            y: baseCanvasY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1.5, // slightly upward force
            color,
            size: 2 + Math.random() * 4,
            alpha: 1.0,
            life,
            maxLife: life
          });
        }
      }
    });
    particlesRef.current = [...particlesRef.current, ...freshParticles].slice(-150); // limit count to stay high-performance
  };

  // Lock logic
  const lockPiece = useCallback((activePiece: NonNullable<typeof currentPiece>, boardGrid: Grid) => {
    const updatedGrid = boardGrid.map(row => [...row]);
    
    // Apply blocks to grid
    activePiece.matrix.forEach((row, r) => {
      row.forEach((value, c) => {
        if (value !== 0) {
          const gridY = activePiece.y + r;
          const gridX = activePiece.x + c;
          if (gridY >= 0 && gridY < BOARD_ROWS && gridX >= 0 && gridX < BOARD_COLS) {
            updatedGrid[gridY][gridX] = activePiece.type;
          }
        }
      });
    });

    // Check for complete rows
    const rowsToClear: number[] = [];
    for (let r = 0; r < BOARD_ROWS; r++) {
      if (updatedGrid[r].every(cell => cell !== null)) {
        rowsToClear.push(r);
      }
    }

    if (rowsToClear.length > 0) {
      playSound('clear');
      createClearParticles(rowsToClear);
      setFlashRows(rowsToClear);

      // Perform flash animation before deleting rows
      setTimeout(() => {
        setGrid(prev => {
          let freshGrid = prev.map(row => [...row]);
          // Filter out rows and pad on top
          freshGrid = freshGrid.filter((_, idx) => !rowsToClear.includes(idx));
          while (freshGrid.length < BOARD_ROWS) {
            freshGrid.unshift(Array(BOARD_COLS).fill(null));
          }
          return freshGrid;
        });

        // Scoring
        const scoreTable = [0, 100, 300, 500, 800];
        const linesCount = rowsToClear.length;
        const reward = (scoreTable[linesCount] || 800) * level;
        
        setScore(prev => {
          const nextVal = prev + reward;
          saveHighScore(nextVal);
          return nextVal;
        });

        setLines(prev => {
          const nextLines = prev + linesCount;
          // Level up every 10 lines
          const nextLevel = Math.max(1, Math.floor(nextLines / 10) + 1);
          if (nextLevel > level) {
            setLevel(nextLevel);
            playSound('level');
          }
          return nextLines;
        });

        setFlashRows([]);
        spawnNewPiece();
      }, 200); // 200ms flash effect
    } else {
      playSound('drop');
      setGrid(updatedGrid);
      spawnNewPiece();
    }
  }, [level, playSound, saveHighScore]);

  // Rotates 2D matrix clockwise
  const rotateMatrix = (matrix: number[][]): number[][] => {
    const size = matrix.length;
    const rotated = Array(size).fill(0).map(() => Array(size).fill(0));
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        rotated[c][size - 1 - r] = matrix[r][c];
      }
    }
    return rotated;
  };

  // Swap / Hold piece mechanism
  const holdCurrentPiece = useCallback(() => {
    if (gameStatus !== 'PLAYING' || hasHeld || !currentPiece) return;

    playSound('hold');
    const currentHeld = holdPiece;
    const activeType = currentPiece.type;

    setHoldPiece(activeType);
    setHasHeld(true);

    if (currentHeld === null) {
      // Defer to spawning a new piece
      const nextSpawn = nextPiece;
      const following = getNextPieceFromBag();
      setNextPiece(following);
      
      const newDef = TETROMINOES[nextSpawn];
      const startX = Math.floor((BOARD_COLS - newDef.matrix[0].length) / 2);
      const startY = nextSpawn === 'I' ? -1 : 0;

      setCurrentPiece({
        type: nextSpawn,
        matrix: newDef.matrix,
        x: startX,
        y: startY
      });
    } else {
      // Put held piece back as active
      const heldDef = TETROMINOES[currentHeld];
      const startX = Math.floor((BOARD_COLS - heldDef.matrix[0].length) / 2);
      const startY = currentHeld === 'I' ? -1 : 0;

      setCurrentPiece({
        type: currentHeld,
        matrix: heldDef.matrix,
        x: startX,
        y: startY
      });
    }
  }, [gameStatus, hasHeld, currentPiece, holdPiece, nextPiece, playSound]);

  // Spawns new piece & detects game over
  const spawnNewPiece = () => {
    const spawnedType = nextPiece;
    const following = getNextPieceFromBag();
    setNextPiece(following);
    setHasHeld(false);

    const pieceDef = TETROMINOES[spawnedType];
    const startX = Math.floor((BOARD_COLS - pieceDef.matrix[0].length) / 2);
    // Spawning slightly above screen for organic dropping entrance
    const startY = spawnedType === 'I' ? -2 : -1;

    const isCollided = checkCollision(pieceDef.matrix, { x: startX, y: startY }, gridRef.current);
    if (isCollided) {
      // Game over!
      setGameStatus('GAMEOVER');
      playSound('gameover');
      setCurrentPiece(null);
    } else {
      setCurrentPiece({
        type: spawnedType,
        matrix: pieceDef.matrix,
        x: startX,
        y: startY
      });
    }
  };

  // Move left/right/down
  const moveActivePiece = useCallback((dx: number, dy: number): boolean => {
    if (gameStatus !== 'PLAYING' || !currentPiece) return false;

    const nextPos = { x: currentPiece.x + dx, y: currentPiece.y + dy };
    const gotCollision = checkCollision(currentPiece.matrix, nextPos, grid);
    
    if (!gotCollision) {
      setCurrentPiece(prev => prev ? { ...prev, x: nextPos.x, y: nextPos.y } : null);
      if (dx !== 0) playSound('move');
      return true;
    }
    
    // If we're dropping down and collided, lock piece
    if (dy > 0) {
      lockPiece(currentPiece, grid);
      return false;
    }
    
    return false;
  }, [currentPiece, grid, gameStatus, lockPiece, playSound]);

  // Soft Drop
  const softDrop = useCallback(() => {
    if (moveActivePiece(0, 1)) {
      setScore(prev => prev + 1);
    }
  }, [moveActivePiece]);

  // Hard Drop (Straight to the bottom)
  const hardDrop = useCallback(() => {
    if (gameStatus !== 'PLAYING' || !currentPiece) return;

    let dropY = currentPiece.y;
    while (!checkCollision(currentPiece.matrix, { x: currentPiece.x, y: dropY + 1 }, grid)) {
      dropY++;
    }

    const rowsDropped = dropY - currentPiece.y;
    const finalPiece = { ...currentPiece, y: dropY };
    
    setScore(prev => prev + (rowsDropped * 2));
    setCurrentPiece(finalPiece);
    
    // Immediately lock
    lockPiece(finalPiece, grid);
  }, [currentPiece, grid, gameStatus, lockPiece]);

  // Rotate clockwise with simple wall kick offsets
  const rotateActivePiece = useCallback(() => {
    if (gameStatus !== 'PLAYING' || !currentPiece) return;

    // Retrieve rotated matrix
    const newMatrix = rotateMatrix(currentPiece.matrix);
    
    // Test kick shifts if collision is hit on normal rotation
    // Shift tries: [origin, left-1, right-1, up-1, left-2, right-2]
    const kicks = [
      { x: 0, y: 0 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: -2, y: 0 },
      { x: 2, y: 0 },
    ];

    for (const kick of kicks) {
      const nextPos = { x: currentPiece.x + kick.x, y: currentPiece.y + kick.y };
      const hasCollision = checkCollision(newMatrix, nextPos, grid);
      if (!hasCollision) {
        // Successful rotation with kick offset!
        setCurrentPiece(prev => prev ? {
          ...prev,
          matrix: newMatrix,
          x: nextPos.x,
          y: nextPos.y
        } : null);
        playSound('rotate');
        return;
      }
    }
  }, [currentPiece, grid, gameStatus, playSound]);

  // Restart/Start the whole game
  const handleStartGame = () => {
    // Empty state
    const cleanGrid = Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null));
    bagRef.current = []; // flush bag
    
    // Spawns
    const current = getNextPieceFromBag();
    const future = getNextPieceFromBag();
    const currentDef = TETROMINOES[current];

    setGrid(cleanGrid);
    setScore(0);
    setLines(0);
    setLevel(1);
    setHoldPiece(null);
    setHasHeld(false);
    setNextPiece(future);
    
    setCurrentPiece({
      type: current,
      matrix: currentDef.matrix,
      x: Math.floor((BOARD_COLS - currentDef.matrix[0].length) / 2),
      y: current === 'I' ? -1 : 0
    });

    setGameStatus('PLAYING');
    playSound('level');
  };

  const handlePauseToggle = useCallback(() => {
    if (gameStatus === 'PLAYING') {
      setGameStatus('PAUSED');
    } else if (gameStatus === 'PAUSED') {
      setGameStatus('PLAYING');
    }
  }, [gameStatus]);

  // Capture Keyboard Actions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'KeyP', 'ShiftLeft', 'ShiftRight', 'KeyC'].includes(e.code) || e.key === 'p' || e.key === 'P') {
        // Prevent scrolling with arrows & space
        e.preventDefault();
      }

      if (e.repeat) return; // Prevent speedups on hold-down double trigger

      if (gameStatus === 'WELCOME' || gameStatus === 'GAMEOVER') {
        if (e.code === 'Enter' || e.code === 'Space') {
          handleStartGame();
        }
        return;
      }

      if (e.key === 'p' || e.key === 'P' || e.code === 'Escape') {
        handlePauseToggle();
        return;
      }

      if (gameStatus !== 'PLAYING') return;

      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          moveActivePiece(-1, 0);
          break;
        case 'ArrowRight':
        case 'KeyD':
          moveActivePiece(1, 0);
          break;
        case 'ArrowDown':
        case 'KeyS':
          softDrop();
          break;
        case 'ArrowUp':
        case 'KeyW':
          rotateActivePiece();
          break;
        case 'Space':
          hardDrop();
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
        case 'KeyC':
          holdCurrentPiece();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameStatus, moveActivePiece, softDrop, rotateActivePiece, hardDrop, holdCurrentPiece, handlePauseToggle]);

  // Main dropping gravity cycle
  useEffect(() => {
    if (gameStatus !== 'PLAYING') return;

    // Level formula to determine falling interval ms (classic Tetris progression speed)
    const speed = Math.max(80, 800 - (level - 1) * 85);

    const fallTimer = setInterval(() => {
      moveActivePiece(0, 1);
    }, speed);

    return () => {
      clearInterval(fallTimer);
    };
  }, [gameStatus, level, moveActivePiece]);

  // Dedicated particles and continuous graphics loops
  useEffect(() => {
    let animationId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawLoop = () => {
      // Clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Width of columns / row blocks
      const blockW = 300 / BOARD_COLS;
      const blockH = 600 / BOARD_ROWS;

      // Draw subtle background grid lines
      ctx.strokeStyle = '#1e293b'; // slate-800
      ctx.lineWidth = 1;

      for (let r = 0; r <= BOARD_ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * blockH);
        ctx.lineTo(BOARD_COLS * blockW, r * blockH);
        ctx.stroke();
      }
      for (let c = 0; c <= BOARD_COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * blockW, 0);
        ctx.lineTo(c * blockW, BOARD_ROWS * blockH);
        ctx.stroke();
      }

      // Draw locked grid blocks
      const board = gridRef.current;
      for (let r = 0; r < BOARD_ROWS; r++) {
        const isFlashing = flashRows.includes(r);
        for (let c = 0; c < BOARD_COLS; c++) {
          const type = board[r][c];
          if (type) {
            const def = TETROMINOES[type];
            
            if (isFlashing) {
              // Rapid pure white styling to flash beautifully
              ctx.fillStyle = '#ffffff';
              ctx.shadowColor = '#ffffff';
              ctx.shadowBlur = 15;
            } else {
              ctx.fillStyle = def.color;
              ctx.shadowColor = def.color;
              ctx.shadowBlur = 4;
            }

            // Clean rounded rectangle block drawing
            const padding = 1.5;
            const rx = c * blockW + padding;
            const ry = r * blockH + padding;
            const rw = blockW - padding * 2;
            const rh = blockH - padding * 2;
            const radius = 4;

            ctx.beginPath();
            ctx.roundRect(rx, ry, rw, rh, radius);
            ctx.fill();

            // Bevel stroke shine
            ctx.strokeStyle = isFlashing ? '#ffffff' : def.borderColor;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            // Clean up shadow settings
            ctx.shadowBlur = 0;
          }
        }
      }

      // Draw active piece and its ghost helper
      const piece = currentPieceRef.current;
      const currentStatus = statusRef.current;

      if (piece && currentStatus === 'PLAYING') {
        const def = TETROMINOES[piece.type];

        // 1. Calculate Ghost dropping placement
        let ghostY = piece.y;
        while (!checkCollision(piece.matrix, { x: piece.x, y: ghostY + 1 }, board)) {
          ghostY++;
        }

        // 2. Draw ghost helper outline first
        if (ghostY > piece.y) {
          ctx.strokeStyle = def.color + '66'; // transparent
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]); // Dashed retro tracker wireframe
          
          piece.matrix.forEach((row, r) => {
            row.forEach((value, c) => {
              if (value !== 0) {
                const py = ghostY + r;
                const px = piece.x + c;
                if (py >= 0 && py < BOARD_ROWS) {
                  const gx = px * blockW + 2;
                  const gy = py * blockH + 2;
                  const gw = blockW - 4;
                  const gh = blockH - 4;
                  ctx.beginPath();
                  ctx.roundRect(gx, gy, gw, gh, 4);
                  ctx.stroke();
                }
              }
            });
          });
          ctx.setLineDash([]); // clear dash configuration
        }

        // 3. Draw actual Active piece
        ctx.shadowColor = def.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = def.color;
        
        piece.matrix.forEach((row, r) => {
          row.forEach((value, c) => {
            if (value !== 0) {
              const py = piece.y + r;
              const px = piece.x + c;
              if (py >= 0 && py < BOARD_ROWS) {
                const padding = 1.5;
                const rx = px * blockW + padding;
                const ry = py * blockH + padding;
                const rw = blockW - padding * 2;
                const rh = blockH - padding * 2;
                
                ctx.beginPath();
                ctx.roundRect(rx, ry, rw, rh, 4);
                ctx.fill();

                ctx.strokeStyle = def.borderColor;
                ctx.lineWidth = 1.5;
                ctx.stroke();
              }
            }
          });
        });
        ctx.shadowBlur = 0; // Clear shadow
      }

      // Draw particle engine blasts
      const particles = [...particlesRef.current];
      particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08; // subtle falling force
        p.life--;

        // Draw glowing particle star
        ctx.save();
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Filter dead particles
      particlesRef.current = particles.filter(p => p.life > 0);

      // Loop
      animationId = requestAnimationFrame(drawLoop);
    };

    animationId = requestAnimationFrame(drawLoop);
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [flashRows]);

  // Preview component drawing for Next & Hold boxes
  const renderMiniPreview = (type: BlockType) => {
    if (!type) {
      return (
        <div className="w-20 h-20 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center text-slate-700 text-xs font-mono">
          EMPTY
        </div>
      );
    }
    const def = TETROMINOES[type];
    const matrix = def.matrix;

    return (
      <div className="w-24 h-24 bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col items-center justify-center relative shadow-inner overflow-hidden">
        {/* Subtle grid pattern inside preview */}
        <div className="absolute inset-0 pixel-bg opacity-20" />
        <div className="grid gap-[2px] relative z-10" style={{ 
          gridTemplateColumns: `repeat(${matrix[0].length}, minmax(0, 1fr))` 
        }}>
          {matrix.map((row, r) => 
            row.map((val, c) => (
              <div 
                key={`${r}-${c}`}
                className="w-[14px] h-[14px] rounded-sm transition-all duration-300"
                style={{
                  backgroundColor: val !== 0 ? def.color : 'transparent',
                  borderColor: val !== 0 ? def.borderColor : 'transparent',
                  borderWidth: val !== 0 ? '1px' : '0px',
                  boxShadow: val !== 0 ? `0 0 6px ${def.glowColor}` : 'none'
                }}
              />
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div id="tetris-cabinet" className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6 select-none relative focus:outline-none">
      
      {/* Help panel (Can be toggled elegantly above the grid) */}
      <AnimatePresence>
        {showHelp && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4">
              <button 
                onClick={() => setShowHelp(false)}
                className="text-slate-500 hover:text-slate-300 font-bold text-sm px-2 py-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>
            <h3 className="font-sans text-blue-400 font-bold mb-4 flex items-center gap-2 uppercase tracking-wider text-xs">
              <Zap className="w-4 h-4" /> Keyboard Shortcuts &bull; 操控操控指南
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono text-slate-300">
              <div className="flex items-center justify-between bg-slate-950 p-2 text-[11px] rounded border border-slate-850">
                <span className="text-slate-500 uppercase text-[9px] tracking-wider">Move Left/Right</span>
                <kbd className="px-1.5 py-0.5 bg-slate-850 rounded text-blue-400 border border-slate-700">← → / A D</kbd>
              </div>
              <div className="flex items-center justify-between bg-slate-950 p-2 text-[11px] rounded border border-slate-850">
                <span className="text-slate-500 uppercase text-[9px] tracking-wider">Rotate block</span>
                <kbd className="px-1.5 py-0.5 bg-slate-850 rounded text-blue-400 border border-slate-700">↑ / W</kbd>
              </div>
              <div className="flex items-center justify-between bg-slate-950 p-2 text-[11px] rounded border border-slate-850">
                <span className="text-slate-500 uppercase text-[9px] tracking-wider">Soft Drop</span>
                <kbd className="px-1.5 py-0.5 bg-slate-850 rounded text-blue-400 border border-slate-700">↓ / S</kbd>
              </div>
              <div className="flex items-center justify-between bg-slate-950 p-2 text-[11px] rounded border border-slate-850">
                <span className="text-slate-500 uppercase text-[9px] tracking-wider">Hard Drop</span>
                <kbd className="px-1.5 py-0.5 bg-slate-850 rounded text-blue-400 border border-slate-700">Space</kbd>
              </div>
              <div className="flex items-center justify-between bg-slate-950 p-2 text-[11px] rounded border border-slate-850">
                <span className="text-slate-500 uppercase text-[9px] tracking-wider">Hold / Swap</span>
                <kbd className="px-1.5 py-0.5 bg-slate-850 rounded text-blue-400 border border-slate-700">Shift / C</kbd>
              </div>
              <div className="flex items-center justify-between bg-slate-950 p-2 text-[11px] rounded border border-slate-850">
                <span className="text-slate-500 uppercase text-[9px] tracking-wider">Pause</span>
                <kbd className="px-1.5 py-0.5 bg-slate-850 rounded text-blue-400 border border-slate-700">P / Esc</kbd>
              </div>
              <div className="flex items-center justify-between bg-slate-950 p-2 text-[11px] rounded border border-slate-850">
                <span className="text-slate-500 uppercase text-[9px] tracking-wider">Restart</span>
                <kbd className="px-1.5 py-0.5 bg-slate-850 rounded text-blue-400 border border-slate-700">Enter</kbd>
              </div>
              <div className="flex items-center justify-between bg-slate-950 p-2 text-[11px] rounded border border-slate-850">
                <span className="text-slate-500 uppercase text-[9px] tracking-wider">Sound Engine</span>
                <span className="text-blue-400 text-[10px] font-semibold">Toggled below</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3-Column Grid Layout matching Geometric Balance */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start justify-center">
        
        {/* Left Side (Col 1): Stats and Reserve/Hold Panel */}
        <div className="lg:col-span-3 flex flex-col md:flex-row lg:flex-col gap-6 items-stretch justify-between w-full">
          
          {/* Hold panel - Designed exactly like right options */}
          <div className="flex-1 bg-slate-900 border border-slate-800 p-6 rounded-lg text-right flex flex-col items-end gap-3 relative overflow-hidden">
            <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1 w-full">Hold Piece</div>
            <div className="flex items-center justify-center w-full h-24">
              {holdPiece ? (
                renderMiniPreview(holdPiece)
              ) : (
                <div className="text-xs font-mono text-slate-650 uppercase tracking-widest h-full flex items-center">
                  None
                </div>
              )}
            </div>
            {gameStatus === 'PLAYING' && (
              <button
                id="hold-touch-swap-btn"
                onClick={holdCurrentPiece}
                disabled={hasHeld}
                className={`text-[10px] tracking-widest font-black uppercase px-3 py-1.5 border rounded cursor-pointer transition-colors mt-1 ${
                  !hasHeld 
                    ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800' 
                    : 'border-slate-850/40 text-slate-600 cursor-not-allowed'
                }`}
              >
                SWAP (Shift/C)
              </button>
            )}
          </div>

          {/* Stats boxes: Score */}
          <div className="flex-1 bg-slate-900 border border-slate-800 p-6 rounded-lg text-right">
            <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Score</div>
            <div id="score" className="text-4xl font-mono font-bold text-white tracking-widest">
              {score.toLocaleString('en-US', { minimumIntegerDigits: 6, useGrouping: false })}
            </div>
          </div>

          {/* Stats boxes: Level */}
          <div className="flex-1 bg-slate-900 border border-slate-800 p-6 rounded-lg text-right">
            <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Level</div>
            <div id="level" className="text-4xl font-mono font-bold text-blue-400">
              {level.toString().padStart(2, '0')}
            </div>
          </div>

          {/* Stats boxes: Lines */}
          <div className="flex-1 bg-slate-900 border border-slate-800 p-6 rounded-lg text-right">
            <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Lines</div>
            <div id="lines" className="text-4xl font-mono font-bold text-slate-300">
              {lines.toString().padStart(3, '0')}
            </div>
          </div>

        </div>

        {/* Center Canvas Column (Col 2) */}
        <div id="canvas-column" className="lg:col-span-6 flex flex-col items-center justify-center relative w-full">
          
          <div className="relative group shadow-2xl shadow-blue-500/10 max-w-[320px] w-full">
            {/* Ambient blue shadow glow behind canvas */}
            <div className="absolute -inset-1 bg-gradient-to-b from-blue-500/20 to-transparent blur opacity-20"></div>
            
            <div className="relative bg-slate-900 border-4 border-slate-800 rounded shadow-inner overflow-hidden aspect-[1/2] w-full">
              {/* Grid backdrop */}
              <div className="absolute inset-0 pixel-bg pointer-events-none opacity-20" />

              <canvas
                ref={canvasRef}
                width={300}
                height={600}
                className="w-full h-full relative z-10 block"
              />

              {/* Floating state overlays */}
              <AnimatePresence>
                {gameStatus === 'WELCOME' && (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs z-20 flex flex-col items-center justify-center text-center p-6 gap-6"
                  >
                    <div className="flex flex-col gap-3">
                      <h2 className="text-2xl font-black tracking-widest text-slate-100 uppercase">
                        TETRIS GAME
                      </h2>
                      <p className="text-slate-400 text-xs font-sans max-w-[210px] mx-auto leading-relaxed">
                        準備挑戰高精度俄羅斯方塊！硬下落、方塊暫存以及炫麗的全消 row 特效。
                      </p>
                    </div>

                    <motion.button
                      id="welcome-start-btn"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleStartGame}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold font-sans rounded uppercase tracking-widest text-xs transition-colors cursor-pointer"
                    >
                      開始挑戰 (START)
                    </motion.button>
                  </motion.div>
                )}

                {gameStatus === 'PAUSED' && (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs z-20 flex flex-col items-center justify-center text-center p-6 gap-5"
                  >
                    <Pause className="w-8 h-8 text-blue-500 animate-pulse" />
                    <div className="space-y-1">
                      <h2 className="text-lg font-bold font-sans text-slate-100 uppercase tracking-widest">
                        遊戲已暫停
                      </h2>
                      <p className="text-[10px] text-slate-500 font-sans uppercase">
                        按下 ESC / P 鍵或底部的按鈕恢復
                      </p>
                    </div>

                    <button
                      id="pause-resume-btn"
                      onClick={handlePauseToggle}
                      className="px-5 py-2 border border-blue-500 text-blue-400 hover:text-white bg-blue-950/20 hover:bg-blue-900/40 rounded text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer"
                    >
                      繼續遊玩 RESUME
                    </button>
                  </motion.div>
                )}

                {gameStatus === 'GAMEOVER' && (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-950/95 backdrop-blur-xs z-20 flex flex-col items-center justify-center text-center p-6 gap-6"
                  >
                    <div className="space-y-1">
                      <div className="text-red-500 font-black text-xs uppercase tracking-widest">
                        GAME OVER
                      </div>
                      <h2 className="text-2xl font-black text-slate-100 uppercase">
                        挑戰結束
                      </h2>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800 p-4 w-full max-w-[200px] text-left space-y-2 rounded">
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>消行總數:</span>
                        <span className="font-mono font-bold text-slate-200">{lines}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 border-t border-slate-800/60 pt-2">
                        <span>最終得分:</span>
                        <span className="font-mono font-bold text-blue-400">{score.toLocaleString()}</span>
                      </div>
                    </div>

                    <button
                      id="gameover-retry-btn"
                      onClick={handleStartGame}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded uppercase tracking-wider text-xs transition-colors cursor-pointer"
                    >
                      再試一次 RETRY
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>

        {/* Right Side Column (Col 3): Next, Controls, Options */}
        <div className="lg:col-span-3 flex flex-col md:flex-row lg:flex-col gap-6 items-stretch justify-between w-full">
          
          {/* Next Piece box */}
          <div className="flex-1 bg-slate-900 border border-slate-800 p-6 rounded-lg flex flex-col justify-center">
            <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-4">Next Piece</div>
            <div className="flex items-center justify-center h-24">
              {renderMiniPreview(nextPiece)}
            </div>
          </div>

          {/* Controls description list */}
          <div className="flex-1 bg-slate-900 border border-slate-800 p-6 rounded-lg justify-center flex flex-col">
            <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-4">Controls</div>
            <div className="space-y-3 text-[10px] text-slate-400 uppercase tracking-tighter">
              <div className="flex justify-between">
                <span>Move</span>
                <span className="text-white">Arrows / A D</span>
              </div>
              <div className="flex justify-between">
                <span>Rotate</span>
                <span className="text-white">Up / W</span>
              </div>
              <div className="flex justify-between">
                <span>Soft Drop</span>
                <span className="text-white">Down / S</span>
              </div>
              <div className="flex justify-between">
                <span>Hard Drop</span>
                <span className="text-white">Space</span>
              </div>
              <div className="flex justify-between">
                <span>Swap Piece</span>
                <span className="text-white">Shift / C</span>
              </div>
            </div>
          </div>

          {/* Core high score card / top sound controls details */}
          <div className="flex-1 bg-slate-900 border border-slate-800 p-6 rounded-lg flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">High Score</span>
              <span className="text-lg font-mono text-amber-500 font-bold">{highScore.toLocaleString()}</span>
            </div>
            
            <div className="flex gap-2">
              <button
                id="right-sound-btn"
                onClick={() => {
                  setSoundEnabled(p => !p);
                  playSound('move');
                }}
                className={`p-2 border rounded transition-all cursor-pointer ${
                  soundEnabled 
                    ? 'border-blue-500/30 text-blue-400 bg-blue-900/10 hover:bg-slate-800' 
                    : 'border-slate-800 text-slate-600 hover:bg-slate-800 bg-slate-950'
                }`}
                title={soundEnabled ? "Mute Game" : "Unmute Game"}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                id="right-help-btn"
                onClick={() => setShowHelp(p => !p)}
                className={`p-2 border rounded transition-all cursor-pointer ${
                  showHelp 
                    ? 'border-blue-500 text-blue-400 bg-blue-900/10' 
                    : 'border-slate-800 text-slate-500 hover:bg-slate-800 bg-slate-950'
                }`}
                title="Toggle Help Panel"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Master Trigger Actions button */}
          <div className="flex-1 w-full flex">
            {gameStatus === 'PLAYING' ? (
              <button
                id="master-pause-trigger-btn"
                onClick={handlePauseToggle}
                className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-350 font-bold py-4 rounded-lg uppercase tracking-widest text-sm transition-colors cursor-pointer text-center"
              >
                PAUSE GAME
              </button>
            ) : gameStatus === 'PAUSED' ? (
              <button
                id="master-resume-trigger-btn"
                onClick={handlePauseToggle}
                className="w-full bg-blue-600 hover:bg-blue-550 text-white font-bold py-4 rounded-lg uppercase tracking-widest text-sm transition-colors cursor-pointer text-center"
              >
                RESUME GAME
              </button>
            ) : (
              <button
                id="master-start-trigger-btn"
                onClick={handleStartGame}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-lg uppercase tracking-widest text-sm transition-colors cursor-pointer text-center"
              >
                RESTART GAME
              </button>
            )}
          </div>

        </div>

      </div>

      {/* Virtual D-pad touch overlay (collapsible bottom tray) */}
      <div id="arcade-deck" className="w-full bg-slate-900 border border-slate-800 rounded-lg p-5 mt-4 flex flex-col md:flex-row justify-between items-center gap-6 max-w-xl shadow-lg relative overflow-hidden">
        {/* Detail header line */}
        <div className="absolute top-0 left-0 w-[4px] h-full bg-blue-500" />
        
        <div className="text-center md:text-left">
          <div className="font-mono font-bold text-xs text-slate-405 uppercase tracking-widest flex items-center justify-center md:justify-start gap-1">
            <Zap className="w-3.5 h-3.5 text-blue-500 animate-pulse" /> VIRTUAL KEYPAD (虛擬搖桿)
          </div>
          <p className="text-[10px] text-slate-500 mt-1 max-w-[200px] leading-relaxed">提供手機、平板觸控或滑鼠的便利操作控制面板</p>
        </div>

        {/* Arcade movement keys */}
        <div className="flex items-center gap-6 shrink-0">
          <div className="grid grid-cols-3 gap-1.5 w-28 h-28 shrink-0">
            <div className="col-start-2">
              <button
                id="touch-rotate"
                onClick={rotateActivePiece}
                disabled={gameStatus !== 'PLAYING'}
                className="w-8 h-8 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-950/80 disabled:cursor-not-allowed text-white border border-slate-700/60 rounded flex items-center justify-center transition-all active:scale-90 shadow cursor-pointer mx-auto"
                title="Rotate Block (Up)"
              >
                <ArrowUp className="w-4 h-4 text-blue-400" />
              </button>
            </div>
            <div className="col-start-1 row-start-2">
              <button
                id="touch-left"
                onClick={() => moveActivePiece(-1, 0)}
                disabled={gameStatus !== 'PLAYING'}
                className="w-8 h-8 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-950/80 disabled:cursor-not-allowed text-white border border-slate-700/60 rounded flex items-center justify-center transition-all active:scale-90 shadow cursor-pointer"
                title="Move Left"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
            <div className="col-start-2 row-start-2">
              <button
                id="touch-down"
                onClick={softDrop}
                disabled={gameStatus !== 'PLAYING'}
                className="w-8 h-8 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-950/80 disabled:cursor-not-allowed text-white border border-slate-700/60 rounded flex items-center justify-center transition-all active:scale-90 shadow cursor-pointer text-center mx-auto"
                title="Soft Drop"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>
            <div className="col-start-3 row-start-2">
              <button
                id="touch-right"
                onClick={() => moveActivePiece(1, 0)}
                disabled={gameStatus !== 'PLAYING'}
                className="w-8 h-8 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-950/80 disabled:cursor-not-allowed text-white border border-slate-700/60 rounded flex items-center justify-center transition-all active:scale-90 shadow cursor-pointer"
                title="Move Right"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 w-24">
            <button
              id="touch-hard-drop"
              onClick={hardDrop}
              disabled={gameStatus !== 'PLAYING'}
              className="py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-950/80 disabled:cursor-not-allowed disabled:text-slate-650 disabled:border-slate-800/80 text-white font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all active:scale-95 shadow cursor-pointer rounded"
              title="Instant Hard Drop (Space)"
            >
              <ChevronsDown className="w-3.5 h-3.5 text-white" />
              <span>DROP</span>
            </button>
            
            <button
              id="touch-hold-swap"
              onClick={holdCurrentPiece}
              disabled={gameStatus !== 'PLAYING' || hasHeld}
              className="py-1.5 bg-slate-800 hover:bg-slate-755 disabled:bg-slate-950/80 disabled:cursor-not-allowed disabled:text-slate-650 disabled:border-slate-800/80 text-slate-300 font-semibold text-[9px] uppercase tracking-wider transition-all active:scale-95 border border-slate-700/60 rounded cursor-pointer"
            >
              HOLD
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
