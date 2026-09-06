import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Coffee,
  Headphones,
  Leaf,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SkipForward,
  Trash2,
  X,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useMusic } from '../context/MusicContext';
import { IconButton } from '../components/Shared';
import { formatTime, safeRead, uid } from '../lib/utils';

interface FocusTask {
  id: string;
  text: string;
  done: boolean;
}
const MODES = [
  { id: 'focus', name: 'Focus', minutes: 25 },
  { id: 'short', name: 'Short break', minutes: 5 },
  { id: 'long', name: 'Long break', minutes: 15 },
];
export function Focus() {
  const { notify, updatePrefs } = useWorkspace();
  const music = useMusic();
  const [mode, setMode] = useState('focus');
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(() => safeRead('wr:focus-sessions', 0));
  const [tasks, setTasks] = useState<FocusTask[]>(() =>
    safeRead('wr:focus-tasks', [
      { id: 'first-thought', text: 'Make room for something good', done: false },
    ]),
  );
  const [taskInput, setTaskInput] = useState('');
  const [adding, setAdding] = useState(false);
  const endTime = useRef(0);
  const runningRef = useRef(running);
  const total = (MODES.find((m) => m.id === mode)?.minutes || 25) * 60;
  useEffect(() => {
    runningRef.current = running;
  }, [running]);
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endTime.current - Date.now()) / 1000));
      setSeconds(remaining);
      if (remaining === 0) {
        setRunning(false);
        updatePrefs({ focus: false });
        if (mode === 'focus') {
          setSessions((n) => n + 1);
          notify(
            'A little well-earned pause',
            'You made time for what matters. Take a short break.',
            'focus',
          );
          setMode('short');
          setSeconds(5 * 60);
        } else {
          notify('Ready for a fresh start?', 'Your break is over. One thing at a time.', 'focus');
          setMode('focus');
          setSeconds(25 * 60);
        }
      }
    }, 250);
    return () => clearInterval(interval);
  }, [running, mode]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    try {
      localStorage.setItem('wr:focus-tasks', JSON.stringify(tasks));
      localStorage.setItem('wr:focus-sessions', JSON.stringify(sessions));
    } catch {
      /* private mode */
    }
  }, [tasks, sessions]);
  useEffect(
    () => () => {
      if (runningRef.current) updatePrefs({ focus: false });
    },
    [],
  ); // Closing stops the session; minimizing keeps it alive.
  function switchMode(id: string) {
    setMode(id);
    setRunning(false);
    setSeconds((MODES.find((m) => m.id === id)?.minutes || 25) * 60);
    updatePrefs({ focus: false });
  }
  function toggle() {
    if (running) {
      setRunning(false);
      updatePrefs({ focus: false });
    } else {
      endTime.current = Date.now() + seconds * 1000;
      updatePrefs({ focus: mode === 'focus' });
      setRunning(true);
    }
  }
  return (
    <div className="focus-app">
      <header>
        <span className="focus-small-brand">
          <Leaf size={17} />A little less, a little better.
        </span>
        <button
          className={music.playing ? 'focus-sound active' : 'focus-sound'}
          onClick={music.toggle}
        >
          <Headphones size={15} />
          {music.playing ? 'Sound on' : 'Add a little calm'}
        </button>
      </header>
      <main className="focus-main">
        <div className="focus-tabs">
          {MODES.map((item) => (
            <button
              key={item.id}
              className={mode === item.id ? 'active' : ''}
              onClick={() => switchMode(item.id)}
            >
              {item.name}
            </button>
          ))}
        </div>
        <div className="focus-timer">
          <svg viewBox="0 0 220 220">
            <circle
              cx="110"
              cy="110"
              r="101"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="timer-track"
            />
            <circle
              cx="110"
              cy="110"
              r="101"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={635}
              strokeDashoffset={635 * (1 - seconds / total)}
              className="timer-progress"
              transform="rotate(-90 110 110)"
            />
          </svg>
          <div>
            {mode === 'focus' ? (
              <Leaf size={23} strokeWidth={1.3} />
            ) : (
              <Coffee size={24} strokeWidth={1.3} />
            )}
            <span>{formatTime(seconds)}</span>
            <p>
              {running
                ? mode === 'focus'
                  ? 'Just this moment. Just this thing.'
                  : 'A little time to breathe.'
                : 'Make a little room for your mind.'}
            </p>
          </div>
        </div>
        <div className="focus-controls">
          <IconButton label="Reset focus timer" onClick={() => switchMode(mode)}>
            <RotateCcw size={17} />
          </IconButton>
          <button className="button primary focus-start" onClick={toggle}>
            {running ? (
              <Pause size={16} fill="currentColor" />
            ) : (
              <Play size={16} fill="currentColor" />
            )}
            {running ? 'A little pause' : mode === 'focus' ? 'Let’s begin' : 'Take a breath'}
          </button>
          <IconButton
            label="Skip to next session"
            onClick={() => switchMode(mode === 'focus' ? 'short' : 'focus')}
          >
            <SkipForward size={17} />
          </IconButton>
        </div>
        <span className="focus-session-count">
          {sessions
            ? `${sessions} focused ${sessions === 1 ? 'moment' : 'moments'}. Every little bit matters.`
            : 'No rush. One good thing at a time.'}
        </span>
      </main>
      <section className="focus-tasks">
        <div>
          <h3>A little intention</h3>
          <IconButton label="Add focus task" onClick={() => setAdding(!adding)}>
            {adding ? <X size={15} /> : <Plus size={17} />}
          </IconButton>
        </div>
        {tasks.map((task) => (
          <div key={task.id} className={`focus-task ${task.done ? 'done' : ''}`}>
            <button
              className="task-checkbox"
              aria-label={`Complete ${task.text}`}
              aria-pressed={task.done}
              onClick={() =>
                setTasks((items) =>
                  items.map((item) => (item.id === task.id ? { ...item, done: !item.done } : item)),
                )
              }
            >
              {task.done && <Check size={12} />}
            </button>
            <span>{task.text}</span>
            <IconButton
              label={`Delete task ${task.text}`}
              onClick={() => setTasks((items) => items.filter((item) => item.id !== task.id))}
            >
              <Trash2 size={12} />
            </IconButton>
          </div>
        ))}
        {adding && (
          <form
            className="focus-task-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!taskInput.trim()) return;
              setTasks((items) => [...items, { id: uid(), text: taskInput.trim(), done: false }]);
              setTaskInput('');
              setAdding(false);
            }}
          >
            <input
              autoFocus
              aria-label="Focus task"
              placeholder="One small thing worth doing…"
              value={taskInput}
              maxLength={100}
              onChange={(e) => setTaskInput(e.target.value)}
            />
            <button type="submit">
              <Plus size={16} />
            </button>
          </form>
        )}
      </section>
      <footer>
        <span className="online-dot" />
        Keep this window open or minimized to keep your timer going.
      </footer>
    </div>
  );
}
