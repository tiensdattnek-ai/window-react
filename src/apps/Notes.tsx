import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Plus,
  Search,
  FileText,
  MoreHorizontal,
  Bold,
  Italic,
  List,
  Heading1,
  Eye,
  PencilLine,
  Download,
  Trash2,
  Check,
  Star,
  ArrowLeft,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { EmptyState, IconButton } from '../components/Shared';
import { download, relativeDate } from '../lib/utils';

export function Notes({ data }: { data?: string }) {
  const { files, createFile, updateFile, trashFile, patchWindow, showDialog } = useWorkspace();
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState(false);
  const [title, setTitle] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const notes = files
    .filter((f) => !f.trashed && (f.kind === 'text' || f.kind === 'code'))
    .sort((a, b) => b.modified - a.modified);
  const note = notes.find((f) => f.id === data) || notes[0];
  useEffect(() => {
    setTitle(note?.name.replace(/\.(md|txt)$/, '') || '');
  }, [note?.id, note?.name]);
  function select(id: string) {
    patchWindow('notes', { data: id });
    setShowMenu(false);
  }
  function newNote() {
    const id = createFile('Untitled note.md', 'text', 'documents', '');
    if (id) {
      select(id);
      setPreview(false);
      setTimeout(() => textarea.current?.focus(), 0);
    }
  }
  function insert(before: string, after = '') {
    if (!note) return;
    setPreview(false);
    const field = textarea.current;
    const start = field?.selectionStart || 0;
    const end = field?.selectionEnd || start;
    const content = note.content || '';
    updateFile(note.id, {
      content:
        content.slice(0, start) + before + content.slice(start, end) + after + content.slice(end),
    });
    requestAnimationFrame(() => {
      field?.focus();
      field?.setSelectionRange(start + before.length, end + before.length);
    });
  }
  const filtered = notes.filter((n) =>
    `${n.name} ${n.content}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className={`notes-app ${showSidebar ? '' : 'sidebar-collapsed'}`}>
      {showSidebar && (
        <aside className="notes-sidebar">
          <div className="notes-sidebar-heading">
            <h2>
              Your thoughts<span>.</span>
            </h2>
            <IconButton label="New note" onClick={newNote}>
              <Plus size={19} />
            </IconButton>
          </div>
          <div className="notes-search">
            <Search size={14} />
            <input
              aria-label="Search notes"
              placeholder="Find a little thought…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <span className="sidebar-section-label">
            ALL NOTES <span>{notes.length}</span>
          </span>
          <div className="note-list">
            {filtered.map((item) => (
              <button
                className={`note-list-item ${note?.id === item.id ? 'active' : ''}`}
                key={item.id}
                onClick={() => select(item.id)}
              >
                <div>
                  <FileText size={15} />
                  <strong>{item.name.replace(/\.(md|txt)$/, '')}</strong>
                  {item.favorite && <Star size={11} fill="currentColor" />}
                </div>
                <p>
                  {item.content
                    ?.replace(/[#*\-]/g, '')
                    .trim()
                    .slice(0, 72) || 'A blank page. A new possibility.'}
                </p>
                <span>{relativeDate(item.modified)}</span>
              </button>
            ))}
            {!filtered.length && (
              <p className="note-no-results">No matching thoughts. Try another word.</p>
            )}
          </div>
          <div className="notes-sidebar-bottom">
            <span className="online-dot" />
            Your ideas, saved as you go.
          </div>
        </aside>
      )}
      <main className="note-main">
        <div className="note-toolbar">
          <IconButton
            label={showSidebar ? 'Hide notes list' : 'Show notes list'}
            onClick={() => setShowSidebar(!showSidebar)}
          >
            <ArrowLeft
              size={16}
              style={{ transform: !showSidebar ? 'rotate(180deg)' : undefined }}
            />
          </IconButton>
          <span className="toolbar-separator" />
          <IconButton label="Heading" disabled={!note} onClick={() => insert('# ')}>
            <Heading1 size={17} />
          </IconButton>
          <IconButton label="Bold" disabled={!note} onClick={() => insert('**', '**')}>
            <Bold size={15} />
          </IconButton>
          <IconButton label="Italic" disabled={!note} onClick={() => insert('*', '*')}>
            <Italic size={15} />
          </IconButton>
          <IconButton label="Bullet list" disabled={!note} onClick={() => insert('\n- ')}>
            <List size={17} />
          </IconButton>
          <div className="toolbar-spacer" />
          <button
            className={`preview-toggle ${preview ? 'active' : ''}`}
            onClick={() => setPreview(!preview)}
          >
            {preview ? <PencilLine size={14} /> : <Eye size={14} />}
            {preview ? 'Edit' : 'Preview'}
          </button>
          <div className="relative">
            <IconButton
              label="Note options"
              disabled={!note}
              onClick={() => setShowMenu(!showMenu)}
            >
              <MoreHorizontal size={18} />
            </IconButton>
            {showMenu && note && (
              <div className="inline-menu">
                <button
                  onClick={() => {
                    updateFile(note.id, { favorite: !note.favorite });
                    setShowMenu(false);
                  }}
                >
                  <Star size={14} />
                  {note.favorite ? 'Unfavorite' : 'Favorite'}
                </button>
                <button
                  onClick={() => {
                    download(note.content || '', note.name);
                    setShowMenu(false);
                  }}
                >
                  <Download size={14} />
                  Export note
                </button>
                <button
                  className="danger-text"
                  onClick={() => {
                    setShowMenu(false);
                    showDialog({
                      title: 'Let this thought go?',
                      message:
                        'Your note will move to the Recycle Bin, where you can bring it back.',
                      confirmLabel: 'Move to bin',
                      danger: true,
                      onConfirm: () => trashFile(note.id),
                    });
                  }}
                >
                  <Trash2 size={14} />
                  Delete note
                </button>
              </div>
            )}
          </div>
        </div>
        {note ? (
          <>
            <div className="note-editor">
              <div className="note-meta">
                <span className="eyebrow muted">A LITTLE SPACE TO THINK</span>
                <span>
                  {new Date(note.modified).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <input
                className="note-title-input"
                aria-label="Note title"
                value={title}
                placeholder="Untitled thought"
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => {
                  if (title.trim() && title !== note.name.replace(/\.(md|txt)$/, ''))
                    updateFile(note.id, {
                      name: title.trim() + (note.kind === 'code' ? '' : '.md'),
                    });
                }}
              />
              {preview ? (
                <div className="markdown-preview">
                  <ReactMarkdown
                    components={{
                      a: ({ children, href }) => (
                        <a href={href} target="_blank" rel="noreferrer">
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {note.content || '*A blank page. A new possibility.*'}
                  </ReactMarkdown>
                </div>
              ) : (
                <textarea
                  ref={textarea}
                  className={`note-textarea ${note.kind === 'code' ? 'code-textarea' : ''}`}
                  aria-label="Note content"
                  placeholder="Good things start with a little thought…"
                  value={note.content || ''}
                  onChange={(e) => updateFile(note.id, { content: e.target.value })}
                  spellCheck={note.kind !== 'code'}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab') {
                      e.preventDefault();
                      insert('  ');
                    }
                    if ((e.ctrlKey || e.metaKey) && e.key === 's') e.preventDefault();
                  }}
                />
              )}
            </div>
            <footer className="note-status">
              <span>
                <Check size={13} /> Saved on this browser
              </span>
              <span>
                {(note.content || '').trim().split(/\s+/).filter(Boolean).length} words
                <span className="status-divider" />
                {preview ? 'Preview' : note.kind === 'code' ? 'Plain text' : 'Markdown'}
              </span>
            </footer>
          </>
        ) : (
          <EmptyState
            title="A new page awaits."
            description="Your next great idea starts with a single thought."
          >
            <button className="button primary" onClick={newNote}>
              <Plus size={15} />
              Write a note
            </button>
          </EmptyState>
        )}
      </main>
    </div>
  );
}
