import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Clock3,
  FileText,
  Leaf,
  LockKeyhole,
  LogOut,
  Power,
  RotateCw,
  Search,
  X,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { APPS } from '../lib/data';
import { AppIcon, WindowLogo } from './AppIcon';
import { IconButton } from './Shared';
import { relativeDate } from '../lib/utils';

export function StartMenu({
  searchMode,
  onClose,
  onLock,
}: {
  searchMode: boolean;
  onClose: () => void;
  onLock: () => void;
}) {
  const { files, prefs, windows, openApp, closeApp, openFile, showDialog } = useWorkspace();
  const [query, setQuery] = useState('');
  const [allApps, setAllApps] = useState(false);
  const [power, setPower] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (searchMode) input.current?.focus();
  }, [searchMode]);
  const matchingApps = APPS.filter((app) =>
    `${app.name} ${app.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  const matchingFiles = files
    .filter((f) => !f.trashed && f.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5);
  const recent = files
    .filter((f) => !f.trashed && f.kind !== 'folder')
    .sort((a, b) => b.modified - a.modified)
    .slice(0, 4);
  return (
    <section className="start-menu glass-panel" aria-label="Start menu">
      <div className="start-menu-top">
        <div>
          <WindowLogo size={21} />
          <strong>
            A good place to start<span>.</span>
          </strong>
        </div>
        <span>YOURS, ALWAYS.</span>
      </div>
      <div className="start-search">
        <Search size={17} />
        <input
          ref={input}
          aria-label="Search apps and files"
          placeholder="An app, a file, a little possibility…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus={searchMode}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (matchingApps.length) {
                openApp(matchingApps[0].id);
                onClose();
              } else if (matchingFiles.length) {
                openFile(matchingFiles[0]);
                onClose();
              }
            }
          }}
        />
        {query ? (
          <IconButton label="Clear Start search" onClick={() => setQuery('')}>
            <X size={14} />
          </IconButton>
        ) : (
          <kbd>Ctrl K</kbd>
        )}
      </div>
      <div className="start-scroll">
        {query ? (
          <>
            <div className="section-heading">
              <h2>Apps</h2>
              <span>{matchingApps.length} found</span>
            </div>
            <div className="search-app-results">
              {matchingApps.map((app) => (
                <button
                  key={app.id}
                  onClick={() => {
                    openApp(app.id);
                    onClose();
                  }}
                >
                  <AppIcon app={app.id} size={36} />
                  <span>
                    <strong>{app.name}</strong>
                    <small>{app.description}</small>
                  </span>
                  <ArrowUpRight size={15} />
                </button>
              ))}
              {!matchingApps.length && (
                <p className="search-no-results">No matching apps. Try another little idea.</p>
              )}
            </div>
            <div className="section-heading">
              <h2>Your files</h2>
            </div>
            <div className="search-file-results">
              {matchingFiles.map((file) => (
                <button
                  key={file.id}
                  onClick={() => {
                    openFile(file);
                    onClose();
                  }}
                >
                  <FileText size={17} />
                  <span>{file.name}</span>
                  <ArrowUpRight size={13} />
                </button>
              ))}
              {!matchingFiles.length && (
                <p className="search-no-results">No files match this search.</p>
              )}
            </div>
            <a
              className="start-web-search"
              href={`https://duckduckgo.com/?q=${encodeURIComponent(query)}`}
              target="_blank"
              rel="noreferrer"
              onClick={onClose}
            >
              <Search size={15} />
              Take “{query.slice(0, 35)}” to the web
              <ArrowUpRight size={15} />
            </a>
          </>
        ) : (
          <>
            <div className="section-heading">
              <h2>{allApps ? 'All your little possibilities' : 'Your everyday essentials'}</h2>
              <button className="start-all-apps" onClick={() => setAllApps(!allApps)}>
                {allApps && <ArrowLeft size={12} />}
                {allApps ? 'Back' : 'All apps'}
                {!allApps && <ChevronRight size={13} />}
              </button>
            </div>
            <div className={allApps ? 'all-apps-list' : 'pinned-apps'}>
              {(allApps
                ? [...APPS].sort((a, b) => a.name.localeCompare(b.name))
                : APPS.slice(0, 10)
              ).map((app) => (
                <button
                  key={app.id}
                  onClick={() => {
                    openApp(app.id);
                    onClose();
                  }}
                >
                  <AppIcon app={app.id} size={allApps ? 33 : 43} />
                  <span>
                    {app.name}
                    {allApps && <small>{app.description}</small>}
                  </span>
                  {allApps && <ArrowUpRight size={14} />}
                </button>
              ))}
            </div>
            {!allApps && (
              <>
                <div className="section-heading recommended-heading">
                  <h2>Right where you left off</h2>
                  <button
                    onClick={() => {
                      openApp('explorer', 'recent');
                      onClose();
                    }}
                  >
                    More <ArrowRight size={13} />
                  </button>
                </div>
                <div className="start-recent">
                  {recent.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => {
                        openFile(file);
                        onClose();
                      }}
                    >
                      {file.kind === 'image' ? (
                        <img src={file.url} alt="" />
                      ) : (
                        <AppIcon app={file.kind === 'audio' ? 'music' : 'notes'} size={32} />
                      )}
                      <span>
                        <strong>{file.name}</strong>
                        <small>
                          <Clock3 size={10} />
                          {relativeDate(file.modified)}
                        </small>
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  className="start-focus-card"
                  onClick={() => {
                    openApp('focus');
                    onClose();
                  }}
                >
                  <span>
                    <Leaf size={19} />
                  </span>
                  <div>
                    <strong>A little space for deep work.</strong>
                    <small>One thing at a time. Find your focus.</small>
                  </div>
                  <ArrowUpRight size={17} />
                </button>
              </>
            )}
          </>
        )}
      </div>
      <footer className="start-footer">
        <button
          className="start-account"
          onClick={() => {
            openApp('settings', 'profile');
            onClose();
          }}
        >
          <span className="account-avatar">
            <Leaf size={17} />
          </span>
          <span>
            {prefs.name}
            <small>Personal by nature.</small>
          </span>
        </button>
        <div className="relative">
          <IconButton
            label="Power options"
            className={power ? 'active' : ''}
            onClick={() => setPower(!power)}
          >
            <Power size={19} />
          </IconButton>
          {power && (
            <div className="power-menu inline-menu">
              <button onClick={onLock}>
                <LockKeyhole size={15} />
                Take a pause
              </button>
              <button
                onClick={() => {
                  onClose();
                  showDialog({
                    title: 'Open a fresh window?',
                    message:
                      'This restarts your web desktop. Your saved files and preferences will stay right here.',
                    confirmLabel: 'Restart desktop',
                    onConfirm: () => location.reload(),
                  });
                }}
              >
                <RotateCw size={15} />
                Restart desktop
              </button>
              <button
                onClick={() => {
                  windows.forEach((w) => closeApp(w.id));
                  onClose();
                }}
              >
                <LogOut size={15} />
                Close all windows
              </button>
            </div>
          )}
        </div>
      </footer>
    </section>
  );
}
