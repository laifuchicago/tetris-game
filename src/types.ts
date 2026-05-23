export type BlockType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L' | null;

export interface Position {
  x: number;
  y: number;
}

export type Grid = BlockType[][];

export type GameStatus = 'WELCOME' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

export interface Tetromino {
  type: Exclude<BlockType, null>;
  matrix: number[][];
  color: string;
  borderColor: string;
  glowColor: string;
}

export const BOARD_COLS = 10;
export const BOARD_ROWS = 20;

// Tetromino definitions
export const TETROMINOES: Record<Exclude<BlockType, null>, {
  matrix: number[][];
  color: string;
  borderColor: string;
  glowColor: string;
}> = {
  I: {
    matrix: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: '#22d3ee', // Cyan, tailwind cyan-400
    borderColor: '#06b6d4', // Cyan-500
    glowColor: 'rgba(34, 211, 238, 0.4)',
  },
  O: {
    matrix: [
      [1, 1],
      [1, 1],
    ],
    color: '#eab308', // Yellow, tailwind yellow-500
    borderColor: '#ca8a04', // Yellow-600
    glowColor: 'rgba(234, 179, 8, 0.4)',
  },
  T: {
    matrix: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: '#a855f7', // Purple, tailwind purple-500
    borderColor: '#9333ea', // Purple-600
    glowColor: 'rgba(168, 85, 247, 0.4)',
  },
  S: {
    matrix: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    color: '#22c55e', // Green, tailwind green-500
    borderColor: '#16a34a', // Green-600
    glowColor: 'rgba(34, 197, 94, 0.4)',
  },
  Z: {
    matrix: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    color: '#ef4444', // Red, tailwind red-500
    borderColor: '#dc2626', // Red-600
    glowColor: 'rgba(239, 68, 68, 0.4)',
  },
  J: {
    matrix: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: '#3b82f6', // Blue, tailwind blue-500
    borderColor: '#2563eb', // Blue-600
    glowColor: 'rgba(59, 130, 246, 0.4)',
  },
  L: {
    matrix: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: '#f97316', // Orange, tailwind orange-500
    borderColor: '#ea580c', // Orange-600
    glowColor: 'rgba(249, 115, 22, 0.4)',
  },
};
