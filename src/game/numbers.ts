import { createRng, integerBetween, shuffle } from './random';

export type NumbersChallenge = {
  dateKey: string;
  numbers: number[];
  target: number;
  solutionExpression: string;
  solutionSteps: string[];
};

export type NumbersAttemptResult = {
  valid: boolean;
  value: number | null;
  distance: number | null;
  score: number;
  message: string;
};

type WorkValue = {
  value: number;
  expression: string;
  steps: string[];
};

const BIG_NUMBERS = [25, 50, 75, 100];

export function generateNumbersChallenge(dateKey: string): NumbersChallenge {
  const rng = createRng(`numbers:${dateKey}`);
  const bigNumbers = shuffle(BIG_NUMBERS, rng).slice(0, 2);
  const smallNumbers = Array.from({ length: 4 }, () => integerBetween(1, 10, rng));
  const numbers = shuffle([...bigNumbers, ...smallNumbers], rng);

  for (let attempt = 0; attempt < 200; attempt += 1) {
    const generated = tryBuildExpression(numbers, rng);
    if (generated.value >= 100 && generated.value <= 999) {
      return {
        dateKey,
        numbers,
        target: generated.value,
        solutionExpression: generated.expression,
        solutionSteps: generated.steps,
      };
    }
  }

  return {
    dateKey,
    numbers,
    target: integerBetween(100, 999, rng),
    solutionExpression: '',
    solutionSteps: [],
  };
}

export function evaluateNumbersAttempt(expression: string, challenge: NumbersChallenge): NumbersAttemptResult {
  const cleaned = expression.trim();
  if (!cleaned) {
    return { valid: false, value: null, distance: null, score: 0, message: 'Escribe una expresión.' };
  }

  const parsed = parseExpression(cleaned);
  if (!parsed.ok) {
    return { valid: false, value: null, distance: null, score: 0, message: parsed.message };
  }

  const availability = countNumbers(challenge.numbers);
  for (const used of parsed.usedNumbers) {
    const available = availability.get(used) ?? 0;
    if (available <= 0) {
      return {
        valid: false,
        value: null,
        distance: null,
        score: 0,
        message: `El número ${used} no está disponible o ya se ha usado.`,
      };
    }
    availability.set(used, available - 1);
  }

  const distance = Math.abs(challenge.target - parsed.value);
  return {
    valid: true,
    value: parsed.value,
    distance,
    score: scoreNumbersDistance(distance),
    message: distance === 0 ? 'Exacto.' : `Te has quedado a ${distance}.`,
  };
}

export function countExpressionOperations(expression: string) {
  const tokens = tokenize(expression);
  if (!tokens) return 0;
  return tokens.filter((token) => ['+', '-', '*', '/'].includes(token)).length;
}

function tryBuildExpression(numbers: number[], rng: () => number): WorkValue {
  let work: WorkValue[] = shuffle(
    numbers.map((value) => ({ value, expression: String(value), steps: [] as string[] })),
    rng,
  );

  while (work.length > 1) {
    work = shuffle(work, rng);
    const left = work[0];
    const right = work[1];
    const rest = work.slice(2);
    const candidates = buildOperationCandidates(left, right);
    const selected = candidates[Math.floor(rng() * candidates.length)];
    work = [...rest, selected];
  }

  return work[0];
}

function buildOperationCandidates(left: WorkValue, right: WorkValue) {
  const candidates: WorkValue[] = [
    combine(left, right, '+', left.value + right.value),
    combine(left, right, '*', left.value * right.value),
  ];

  if (left.value > right.value) candidates.push(combine(left, right, '-', left.value - right.value));
  if (right.value > left.value) candidates.push(combine(right, left, '-', right.value - left.value));
  if (right.value !== 0 && left.value % right.value === 0) {
    candidates.push(combine(left, right, '/', left.value / right.value));
  }
  if (left.value !== 0 && right.value % left.value === 0) {
    candidates.push(combine(right, left, '/', right.value / left.value));
  }

  return candidates.filter((candidate) => candidate.value > 0 && candidate.value <= 3000);
}

function combine(left: WorkValue, right: WorkValue, operator: string, value: number): WorkValue {
  const readableOperator = operator === '*' ? 'x' : operator;
  return {
    value,
    expression: `(${left.expression} ${operator} ${right.expression})`,
    steps: [
      ...left.steps,
      ...right.steps,
      `${left.expression} ${readableOperator} ${right.expression} = ${value}`,
    ],
  };
}

function scoreNumbersDistance(distance: number) {
  if (distance === 0) return 10;
  if (distance <= 2) return 9;
  if (distance <= 5) return 8;
  if (distance <= 10) return 6;
  if (distance <= 25) return 4;
  if (distance <= 50) return 2;
  return 1;
}

function countNumbers(numbers: number[]) {
  const counts = new Map<number, number>();
  for (const number of numbers) {
    counts.set(number, (counts.get(number) ?? 0) + 1);
  }
  return counts;
}

type ParseResult =
  | { ok: true; value: number; usedNumbers: number[] }
  | { ok: false; message: string };

function parseExpression(expression: string): ParseResult {
  const tokens = tokenize(expression);
  if (!tokens) return { ok: false, message: 'Usa solo números, operaciones y paréntesis.' };

  const output: string[] = [];
  const operators: string[] = [];
  const usedNumbers: number[] = [];
  const precedence: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };

  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      output.push(token);
      usedNumbers.push(Number(token));
      continue;
    }

    if (token === '(') {
      operators.push(token);
      continue;
    }

    if (token === ')') {
      while (operators.length && operators.at(-1) !== '(') output.push(operators.pop()!);
      if (operators.pop() !== '(') return { ok: false, message: 'Paréntesis incompletos.' };
      continue;
    }

    while (
      operators.length &&
      operators.at(-1) !== '(' &&
      precedence[operators.at(-1)!] >= precedence[token]
    ) {
      output.push(operators.pop()!);
    }
    operators.push(token);
  }

  while (operators.length) {
    const operator = operators.pop()!;
    if (operator === '(') return { ok: false, message: 'Paréntesis incompletos.' };
    output.push(operator);
  }

  const stack: number[] = [];
  for (const token of output) {
    if (/^\d+$/.test(token)) {
      stack.push(Number(token));
      continue;
    }

    const right = stack.pop();
    const left = stack.pop();
    if (left === undefined || right === undefined) {
      return { ok: false, message: 'La expresión no está completa.' };
    }

    const value = applyOperator(left, right, token);
    if (value === null) {
      return { ok: false, message: 'Las divisiones deben ser exactas y sin decimales.' };
    }
    stack.push(value);
  }

  if (stack.length !== 1 || !Number.isInteger(stack[0])) {
    return { ok: false, message: 'La expresión no produce un entero válido.' };
  }

  return { ok: true, value: stack[0], usedNumbers };
}

function tokenize(expression: string) {
  const normalized = expression.replace(/[xX×]/g, '*').replace(/[÷:]/g, '/').replace(/\s+/g, '');
  const tokens = normalized.match(/\d+|[()+\-*/]/g);
  if (!tokens || tokens.join('') !== normalized) return null;
  return tokens;
}

function applyOperator(left: number, right: number, operator: string) {
  if (operator === '+') return left + right;
  if (operator === '-') return left - right;
  if (operator === '*') return left * right;
  if (operator === '/') {
    if (right === 0 || left % right !== 0) return null;
    return left / right;
  }
  return null;
}
