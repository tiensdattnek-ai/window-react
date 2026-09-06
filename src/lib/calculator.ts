/** Recursive-descent arithmetic with standard precedence. Never evaluates JavaScript. */
export function calculate(expression: string): number {
  if (expression.length > 512) throw new Error('Expression is too long');
  const input = expression.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  const tokens = input.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[+\-*/()%^]/gi) || [];
  if (tokens.join('') !== input.replace(/\s/g, '') || !tokens.length)
    throw new Error('Invalid expression');
  let position = 0;
  function atom(): number {
    let value: number;
    const token = tokens[position++];
    if (token === '(') {
      value = sum();
      if (tokens[position++] !== ')') throw new Error('Missing closing parenthesis');
    } else {
      value = Number(token);
      if (!token || !Number.isFinite(value)) throw new Error('Expected a number');
    }
    while (tokens[position] === '%') {
      position++;
      value /= 100;
    }
    return value;
  }
  function power(): number {
    const value = atom();
    if (tokens[position] === '^') {
      position++;
      return value ** unary();
    }
    return value;
  }
  function unary(): number {
    if (tokens[position] === '-') {
      position++;
      return -unary();
    }
    if (tokens[position] === '+') {
      position++;
      return unary();
    }
    return power();
  }
  function product(): number {
    let value = unary();
    while (tokens[position] === '*' || tokens[position] === '/') {
      const op = tokens[position++];
      const right = unary();
      if (op === '/' && right === 0) throw new Error('Cannot divide by zero');
      value = op === '*' ? value * right : value / right;
    }
    return value;
  }
  function sum(): number {
    let value = product();
    while (tokens[position] === '+' || tokens[position] === '-') {
      const op = tokens[position++];
      const right = product();
      value = op === '+' ? value + right : value - right;
    }
    return value;
  }
  const result = sum();
  if (position < tokens.length || !Number.isFinite(result)) throw new Error('Invalid calculation');
  return Number(result.toPrecision(12));
}
