import { createRng, shuffle } from './random';

const SIDE = 9;
const BOX = 3;
const LEVEL_GIVENS = [48, 46, 44, 42, 40, 38, 36, 34, 32, 30];

export type SudokuPuzzle = {
  dateKey: string;
  level: number;
  puzzle: number[];
  solution: number[];
  givens: boolean[];
  emptyCells: number;
};

export function generateSudokuPuzzle(dateKey: string, level: number): SudokuPuzzle {
  const safeLevel = Math.min(10, Math.max(1, level));
  const rng = createRng(`sudoku:${dateKey}:${safeLevel}`);
  const solution = generateSolution(rng);
  const puzzle = [...solution];
  const targetGivens = LEVEL_GIVENS[safeLevel - 1];
  const cells = shuffle(
    Array.from({ length: SIDE * SIDE }, (_, index) => index),
    rng,
  );

  for (const index of cells) {
    const currentGivens = puzzle.filter(Boolean).length;
    if (currentGivens <= targetGivens) break;

    const previous = puzzle[index];
    puzzle[index] = 0;

    if (countSolutions(puzzle, 2) !== 1) {
      puzzle[index] = previous;
    }
  }

  return {
    dateKey,
    level: safeLevel,
    puzzle,
    solution,
    givens: puzzle.map((value) => value !== 0),
    emptyCells: puzzle.filter((value) => value === 0).length,
  };
}

export function isSudokuSolved(grid: number[], solution: number[]) {
  return grid.length === solution.length && grid.every((value, index) => value === solution[index]);
}

export function getSudokuConflicts(grid: number[]) {
  const conflicts = new Set<number>();
  const groups: number[][] = [];

  for (let row = 0; row < SIDE; row += 1) {
    groups.push(Array.from({ length: SIDE }, (_, col) => row * SIDE + col));
  }

  for (let col = 0; col < SIDE; col += 1) {
    groups.push(Array.from({ length: SIDE }, (_, row) => row * SIDE + col));
  }

  for (let boxRow = 0; boxRow < BOX; boxRow += 1) {
    for (let boxCol = 0; boxCol < BOX; boxCol += 1) {
      const indexes: number[] = [];
      for (let row = 0; row < BOX; row += 1) {
        for (let col = 0; col < BOX; col += 1) {
          indexes.push((boxRow * BOX + row) * SIDE + boxCol * BOX + col);
        }
      }
      groups.push(indexes);
    }
  }

  for (const group of groups) {
    const seen = new Map<number, number[]>();
    for (const index of group) {
      const value = grid[index];
      if (!value) continue;
      seen.set(value, [...(seen.get(value) ?? []), index]);
    }

    for (const indexes of seen.values()) {
      if (indexes.length > 1) {
        indexes.forEach((index) => conflicts.add(index));
      }
    }
  }

  return conflicts;
}

function generateSolution(rng: () => number) {
  const basePattern = (row: number, col: number) => (BOX * (row % BOX) + Math.floor(row / BOX) + col) % SIDE;
  const numbers = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);
  const rows = shuffle([0, 1, 2], rng).flatMap((band) =>
    shuffle([0, 1, 2], rng).map((row) => band * BOX + row),
  );
  const cols = shuffle([0, 1, 2], rng).flatMap((stack) =>
    shuffle([0, 1, 2], rng).map((col) => stack * BOX + col),
  );

  return rows.flatMap((row) => cols.map((col) => numbers[basePattern(row, col)]));
}

function countSolutions(grid: number[], limit: number) {
  const working = [...grid];

  function solve(count: number): number {
    if (count >= limit) return count;

    const next = findBestEmptyCell(working);
    if (!next) return count + 1;

    const [index, candidates] = next;
    for (const candidate of candidates) {
      working[index] = candidate;
      count = solve(count);
      working[index] = 0;
      if (count >= limit) break;
    }

    return count;
  }

  return solve(0);
}

function findBestEmptyCell(grid: number[]): [number, number[]] | null {
  let bestIndex = -1;
  let bestCandidates: number[] = [];

  for (let index = 0; index < grid.length; index += 1) {
    if (grid[index] !== 0) continue;
    const candidates = getCandidates(grid, index);
    if (candidates.length === 0) return [index, []];
    if (bestIndex === -1 || candidates.length < bestCandidates.length) {
      bestIndex = index;
      bestCandidates = candidates;
    }
  }

  return bestIndex === -1 ? null : [bestIndex, bestCandidates];
}

function getCandidates(grid: number[], index: number) {
  const row = Math.floor(index / SIDE);
  const col = index % SIDE;
  const used = new Set<number>();

  for (let cursor = 0; cursor < SIDE; cursor += 1) {
    used.add(grid[row * SIDE + cursor]);
    used.add(grid[cursor * SIDE + col]);
  }

  const startRow = Math.floor(row / BOX) * BOX;
  const startCol = Math.floor(col / BOX) * BOX;
  for (let rowOffset = 0; rowOffset < BOX; rowOffset += 1) {
    for (let colOffset = 0; colOffset < BOX; colOffset += 1) {
      used.add(grid[(startRow + rowOffset) * SIDE + startCol + colOffset]);
    }
  }

  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((value) => !used.has(value));
}
