import { useEffect, useState } from 'react';
import { Delete, History, Trash2, X } from 'lucide-react';
import { calculate } from '../lib/calculator';
import { useWorkspace } from '../context/WorkspaceContext';
import { IconButton } from '../components/Shared';

export function Calculator() {
  const { activeApp } = useWorkspace();
  const [expression, setExpression] = useState('0');
  const [previous, setPrevious] = useState('');
  const [fresh, setFresh] = useState(false);
  const [history, setHistory] = useState<{ expression: string; result: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [memory, setMemory] = useState<number | null>(null);
  const [error, setError] = useState('');
  function press(key: string) {
    setError('');
    if (key === 'C') {
      setExpression('0');
      setPrevious('');
      setFresh(false);
      return;
    }
    if (key === 'CE') {
      setExpression((current) => current.replace(/[\d.]+$/, '') || '0');
      return;
    }
    if (key === 'back') {
      setExpression((current) => (current.length > 1 ? current.slice(0, -1) : '0'));
      setFresh(false);
      return;
    }
    if (key === '=') {
      try {
        const result = String(calculate(expression));
        setPrevious(expression + ' =');
        setExpression(result);
        setFresh(true);
        setHistory((items) => [{ expression, result }, ...items].slice(0, 30));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid calculation');
      }
      return;
    }
    if (['sqrt', 'square', 'inverse', 'negate'].includes(key)) {
      try {
        const value = calculate(expression);
        const result =
          key === 'sqrt'
            ? Math.sqrt(value)
            : key === 'square'
              ? value ** 2
              : key === 'inverse'
                ? 1 / value
                : -value;
        if (!Number.isFinite(result))
          throw new Error(
            key === 'sqrt' ? 'A real square root needs a positive number' : 'Cannot divide by zero',
          );
        setExpression(String(Number(result.toPrecision(12))));
        setFresh(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid calculation');
      }
      return;
    }
    const isOperator = ['+', '−', '×', '÷', '%'].includes(key);
    setExpression((current) => {
      if (current.length > 80) return current;
      if (fresh && !isOperator) return key === '.' ? '0.' : key;
      if (current === '0' && !isOperator && key !== '.') return key;
      if (isOperator && /[+−×÷]$/.test(current)) return current.slice(0, -1) + key;
      if (
        key === '.' &&
        current
          .split(/[+−×÷]/)
          .at(-1)
          ?.includes('.')
      )
        return current;
      return current + key;
    });
    setFresh(false);
  }
  useEffect(() => {
    if (activeApp !== 'calculator') return;
    function keydown(e: KeyboardEvent) {
      if ((e.target as HTMLElement).matches('input,textarea') || e.ctrlKey || e.metaKey || e.altKey)
        return;
      const map: Record<string, string> = {
        Enter: '=',
        '=': '=',
        Escape: 'C',
        Backspace: 'back',
        '*': '×',
        '/': '÷',
        '-': '−',
      };
      if (map[e.key] || /^[0-9.+%()]$/.test(e.key)) {
        e.preventDefault();
        press(map[e.key] || e.key);
      }
    }
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [activeApp, expression, fresh]); // eslint-disable-line react-hooks/exhaustive-deps
  const keys = [
    { label: '%', value: '%' },
    { label: 'CE', value: 'CE' },
    { label: 'C', value: 'C' },
    { label: <Delete size={19} />, value: 'back' },
    { label: '¹/ₓ', value: 'inverse' },
    { label: 'x²', value: 'square' },
    { label: '√x', value: 'sqrt' },
    { label: '÷', value: '÷' },
    ...['7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+'].map((key) => ({
      label: key,
      value: key,
    })),
    { label: '⁺/₋', value: 'negate' },
    { label: '0', value: '0' },
    { label: '.', value: '.' },
    { label: '=', value: '=' },
  ];
  return (
    <div className="calculator-app">
      <div className="calculator-heading">
        <h2>Standard</h2>
        <IconButton
          label="Calculation history"
          className={showHistory ? 'active' : ''}
          onClick={() => setShowHistory(!showHistory)}
        >
          <History size={19} />
        </IconButton>
      </div>
      <div className="calculator-display">
        <div>{previous || 'A little clarity.'}</div>
        <output
          style={{
            fontSize: expression.length > 18 ? 26 : expression.length > 11 ? 35 : undefined,
          }}
        >
          {error || expression}
        </output>
      </div>
      <div className="calculator-memory">
        {['MC', 'MR', 'M+', 'M−', 'MS'].map((label) => (
          <button
            key={label}
            disabled={['MC', 'MR'].includes(label) && memory === null}
            onClick={() => {
              try {
                if (label === 'MC') setMemory(null);
                else if (label === 'MR') {
                  setExpression(String(memory));
                  setFresh(true);
                } else {
                  const value = calculate(expression);
                  setMemory(
                    label === 'MS' ? value : (memory || 0) + (label === 'M−' ? -value : value),
                  );
                }
              } catch {
                setError('Calculate a valid number first');
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="calculator-keys">
        {keys.map((key) => (
          <button
            key={key.value}
            aria-label={
              key.value === 'back'
                ? 'Backspace'
                : key.value === '='
                  ? 'Equals'
                  : typeof key.label === 'string'
                    ? key.label
                    : key.value
            }
            className={`${/^\d$/.test(key.value) || key.value === '.' ? 'number-key' : ''} ${key.value === '=' ? 'equals-key' : ''}`}
            onClick={() => press(key.value)}
          >
            {key.label}
          </button>
        ))}
      </div>
      {showHistory && (
        <div className="calculator-history">
          <div>
            <h3>A little look back.</h3>
            <IconButton label="Close calculation history" onClick={() => setShowHistory(false)}>
              <X size={17} />
            </IconButton>
          </div>
          <div className="calculation-list">
            {history.length ? (
              history.map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setExpression(item.result);
                    setPrevious(item.expression + ' =');
                    setFresh(true);
                    setShowHistory(false);
                  }}
                >
                  <span>{item.expression} =</span>
                  <strong>{item.result}</strong>
                </button>
              ))
            ) : (
              <p>Your calculations will appear here.</p>
            )}
          </div>
          <button
            className="button secondary"
            disabled={!history.length}
            onClick={() => setHistory([])}
          >
            <Trash2 size={14} />
            Clear history
          </button>
        </div>
      )}
    </div>
  );
}
