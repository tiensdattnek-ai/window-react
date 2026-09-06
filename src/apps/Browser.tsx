import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Code2,
  ExternalLink,
  Globe2,
  Home,
  LockKeyhole,
  Plus,
  RotateCw,
  Search,
  X,
} from 'lucide-react';
import { WindowLogo } from '../components/AppIcon';
import { IconButton } from '../components/Shared';
import { useWorkspace } from '../context/WorkspaceContext';

interface Tab {
  id: number;
  history: string[];
  index: number;
}
const bookmarks = [
  {
    name: 'Wikipedia',
    url: 'https://www.wikipedia.org',
    color: '#e9e7e0',
    letter: 'W',
    subtitle: 'Stay curious',
  },
  {
    name: 'GitHub',
    url: 'https://github.com',
    color: '#dee5e1',
    letter: 'G',
    subtitle: 'Build something',
  },
  {
    name: 'MDN Web Docs',
    url: 'https://developer.mozilla.org',
    color: '#e1e5f1',
    letter: 'M',
    subtitle: 'Learn a little',
  },
  {
    name: 'Figma',
    url: 'https://www.figma.com',
    color: '#efe0d9',
    letter: 'F',
    subtitle: 'Make it beautiful',
  },
];
export function Browser() {
  const { notify, activeApp } = useWorkspace();
  const [tabs, setTabs] = useState<Tab[]>([{ id: 1, history: ['react://newtab'], index: 0 }]);
  const [active, setActive] = useState(1);
  const [address, setAddress] = useState('');
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const addressInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (activeApp !== 'browser') return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        addressInput.current?.focus();
        addressInput.current?.select();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeApp]);
  const counter = useRef(1);
  const frame = useRef<HTMLIFrameElement>(null);
  const tab = tabs.find((t) => t.id === active)!;
  const url = tab.history[tab.index];
  const isHome = url === 'react://newtab';
  function urlFromInput(value: string) {
    const text = value.trim();
    if (!text || text === 'react://newtab') return 'react://newtab';
    if (/^[a-z][a-z\d+.-]*:/i.test(text) && !/^https?:\/\//i.test(text)) {
      notify('That address can’t be opened', 'Use a secure http or https website address.');
      return null;
    }
    if (/^https?:\/\//i.test(text)) {
      try {
        return new URL(text).href;
      } catch {
        return null;
      }
    }
    if (/^[^\s]+\.[a-z]{2,}(\/.*)?$/i.test(text)) return `https://${text}`;
    return `https://duckduckgo.com/?q=${encodeURIComponent(text)}`;
  }
  function navigate(value: string) {
    const next = urlFromInput(value);
    if (!next) return;
    setTabs((items) =>
      items.map((t) =>
        t.id === active
          ? { ...t, history: [...t.history.slice(0, t.index + 1), next], index: t.index + 1 }
          : t,
      ),
    );
    setAddress(next === 'react://newtab' ? '' : next);
    setLoading(next !== 'react://newtab');
  }
  function back(offset: number) {
    const index = tab.index + offset;
    if (index < 0 || index >= tab.history.length) return;
    setTabs((items) => items.map((t) => (t.id === active ? { ...t, index } : t)));
    setAddress(tab.history[index] === 'react://newtab' ? '' : tab.history[index]);
  }
  function newTab() {
    const id = ++counter.current;
    setTabs((items) => [...items, { id, history: ['react://newtab'], index: 0 }]);
    setActive(id);
    setAddress('');
    setSearch('');
  }
  function closeTab(id: number) {
    if (tabs.length === 1) {
      setTabs([{ id, history: ['react://newtab'], index: 0 }]);
      setAddress('');
      return;
    }
    const rest = tabs.filter((t) => t.id !== id);
    setTabs(rest);
    if (active === id) {
      const next = rest[rest.length - 1];
      setActive(next.id);
      setAddress(next.history[next.index] === 'react://newtab' ? '' : next.history[next.index]);
    }
  }
  function title(value: string) {
    if (value === 'react://newtab') return 'A new possibility';
    try {
      return new URL(value).hostname.replace(/^www\./, '');
    } catch {
      return value;
    }
  }
  return (
    <div className="browser-app">
      <div className="browser-tabstrip">
        {tabs.map((t) => (
          <div className={`browser-tab ${t.id === active ? 'active' : ''}`} key={t.id}>
            <button
              onClick={() => {
                setActive(t.id);
                const value = t.history[t.index];
                setAddress(value === 'react://newtab' ? '' : value);
              }}
            >
              <Globe2 size={13} />
              <span>{title(t.history[t.index])}</span>
            </button>
            <IconButton label="Close browser tab" onClick={() => closeTab(t.id)}>
              <X size={12} />
            </IconButton>
          </div>
        ))}
        <IconButton label="New browser tab" onClick={newTab}>
          <Plus size={17} />
        </IconButton>
      </div>
      <div className="browser-toolbar">
        <IconButton label="Browser back" disabled={tab.index === 0} onClick={() => back(-1)}>
          <ArrowLeft size={16} />
        </IconButton>
        <IconButton
          label="Browser forward"
          disabled={tab.index >= tab.history.length - 1}
          onClick={() => back(1)}
        >
          <ArrowRight size={16} />
        </IconButton>
        <IconButton
          label="Reload page"
          onClick={() => {
            setRefreshKey((k) => k + 1);
            setLoading(!isHome);
          }}
        >
          <RotateCw size={15} />
        </IconButton>
        <IconButton label="Browser home" onClick={() => navigate('react://newtab')}>
          <Home size={15} />
        </IconButton>
        <form
          className="browser-address"
          onSubmit={(e) => {
            e.preventDefault();
            navigate(address);
          }}
        >
          {isHome ? <Search size={14} /> : <LockKeyhole size={13} />}
          <input
            ref={addressInput}
            aria-label="Website address"
            value={address}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Search the web or enter an address"
          />
          <span>Ctrl L</span>
        </form>
        <IconButton
          label="Open website in a new tab"
          disabled={isHome}
          onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
        >
          <ExternalLink size={16} />
        </IconButton>
      </div>
      {isHome ? (
        <main className="browser-newtab">
          <div className="browser-greeting">
            <WindowLogo size={43} />
            <span className="eyebrow muted">STAY A LITTLE CURIOUS</span>
            <h1>
              A world of possibilities<span>.</span>
            </h1>
            <p>Where will your next little adventure take you?</p>
          </div>
          <form
            className="browser-big-search"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(search);
            }}
          >
            <Search size={20} />
            <input
              aria-label="Search the web"
              placeholder="A question. An idea. Somewhere new."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" aria-label="Go search">
              <ArrowRight size={21} />
            </button>
          </form>
          <div className="browser-bookmarks">
            {bookmarks.map((bookmark) => (
              <button key={bookmark.name} onClick={() => navigate(bookmark.url)}>
                <span className="bookmark-symbol" style={{ background: bookmark.color }}>
                  {bookmark.letter}
                </span>
                <strong>{bookmark.name}</strong>
                <small>{bookmark.subtitle}</small>
              </button>
            ))}
          </div>
          <div className="browser-discovery">
            <span>
              <BookOpen size={17} />
              <div>
                <strong>The internet is a big place.</strong>
                <p>Learn something. Make something. Find your next favorite thing.</p>
              </div>
            </span>
            <button
              onClick={() =>
                navigate('https://developer.mozilla.org/en-US/docs/Learn_web_development')
              }
            >
              <Code2 size={16} />
              Start exploring <ArrowUpRight size={15} />
            </button>
          </div>
          <footer>Powered by curiosity. Search with DuckDuckGo.</footer>
        </main>
      ) : (
        <div className="browser-site">
          <div className="browser-embed-notice">
            <span>
              <Globe2 size={14} />
              Some sites don’t allow embedding. For the full experience:
            </span>
            <a href={url} target="_blank" rel="noreferrer">
              Open in a real browser tab <ArrowUpRight size={14} />
            </a>
          </div>
          {loading && <div className="browser-loading-line" />}
          <iframe
            key={`${active}-${refreshKey}-${url}`}
            ref={frame}
            title={title(url)}
            src={url}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
            referrerPolicy="no-referrer"
            onLoad={() => setLoading(false)}
          />
        </div>
      )}
    </div>
  );
}
