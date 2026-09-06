import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  ChevronRight,
  Home,
  Search,
  Clock3,
  Star,
  FileText,
  Image,
  Music2,
  Download,
  Trash2,
  HardDrive,
  FolderOpen,
  Plus,
  Upload,
  LayoutGrid,
  List,
  ArrowDownAZ,
  MoreHorizontal,
  Check,
  Pencil,
  Copy,
  X,
  Leaf,
  CheckCircle2,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { FolderIcon, WindowLogo } from '../components/AppIcon';
import { EmptyState, IconButton } from '../components/Shared';
import type { WorkspaceFile } from '../lib/types';
import { download, formatBytes, relativeDate } from '../lib/utils';

function FileGlyph({ file, size = 30 }: { file: WorkspaceFile; size?: number }) {
  if (file.kind === 'folder') return <FolderIcon size={size} color={file.color} />;
  if (file.kind === 'image')
    return (
      <img
        className="file-image-thumb"
        src={file.url}
        alt=""
        style={{ width: size, height: size }}
      />
    );
  if (file.kind === 'audio')
    return (
      <span className="file-glyph audio-glyph" style={{ width: size, height: size }}>
        <Music2 size={size * 0.53} />
      </span>
    );
  return (
    <span
      className={`file-glyph ${file.kind === 'code' ? 'code-glyph' : ''}`}
      style={{ width: size, height: size }}
    >
      <FileText size={size * 0.56} strokeWidth={1.6} />
    </span>
  );
}
export function Explorer({ data = 'home' }: { data?: string }) {
  const {
    files,
    prefs,
    openApp,
    patchWindow,
    createFile,
    openFile,
    updateFile,
    trashFile,
    restoreFile,
    deleteFile,
    moveFile,
    notify,
    showDialog,
  } = useWorkspace();
  const [query, setQuery] = useState('');
  const [layout, setLayout] = useState<'list' | 'grid'>('list');
  const [sort, setSort] = useState<'modified' | 'name'>('modified');
  const [selected, setSelected] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [history, setHistory] = useState<string[]>(['home']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const path = data;
  const activeFiles = files.filter((f) => !f.trashed);
  const folder = files.find((f) => f.id === path);
  const pathName =
    (
      {
        home: 'Home',
        root: 'My files',
        recent: 'Recent',
        favorites: 'Favorites',
        trash: 'Recycle Bin',
      } as Record<string, string>
    )[path] ||
    folder?.name ||
    'My files';
  const collections = ['documents', 'pictures', 'music-folder', 'downloads']
    .map((id) => files.find((f) => f.id === id))
    .filter(Boolean) as WorkspaceFile[];
  function navigate(next: string) {
    if (next !== path) {
      const updated = [...history.slice(0, historyIndex + 1), next];
      setHistory(updated);
      setHistoryIndex(updated.length - 1);
    }
    patchWindow('explorer', { data: next });
    setQuery('');
    setSelected(null);
    setMenu(null);
  }
  function goHistory(offset: number) {
    const index = historyIndex + offset;
    if (index < 0 || index >= history.length) return;
    setHistoryIndex(index);
    patchWindow('explorer', { data: history[index] });
    setQuery('');
    setSelected(null);
  }
  function open(file: WorkspaceFile) {
    if (file.kind === 'folder') navigate(file.id);
    else openFile(file);
  }
  let visible =
    path === 'trash'
      ? files.filter((f) => f.trashed)
      : path === 'recent' || path === 'home'
        ? activeFiles.filter((f) => f.kind !== 'folder')
        : path === 'favorites'
          ? activeFiles.filter((f) => f.favorite)
          : activeFiles.filter((f) => f.parentId === path);
  if (query.trim())
    visible = (path === 'home' ? activeFiles : visible).filter((f) =>
      f.name.toLowerCase().includes(query.trim().toLowerCase()),
    );
  visible = [...visible].sort(
    (a, b) =>
      (a.kind === 'folder' ? -1 : 0) - (b.kind === 'folder' ? -1 : 0) ||
      (sort === 'name' ? a.name.localeCompare(b.name) : b.modified - a.modified),
  );
  const recent = activeFiles
    .filter((f) => f.kind !== 'folder')
    .sort((a, b) => b.modified - a.modified)
    .slice(0, 3);
  function newFolder() {
    showDialog({
      title: 'A place for something new.',
      message: `Create a folder in ${['home', 'recent', 'favorites', 'trash'].includes(path) ? 'My files' : pathName}.`,
      input: true,
      initialValue: 'Untitled folder',
      confirmLabel: 'Create folder',
      onConfirm: (name) => {
        const parent = ['home', 'recent', 'favorites', 'trash'].includes(path) ? 'root' : path;
        const id = createFile(name, 'folder', parent);
        if (id) {
          navigate(parent);
          setSelected(id);
        }
      },
    });
  }
  async function upload(fileList: FileList | null) {
    if (!fileList) return;
    const target = ['home', 'recent', 'favorites', 'trash'].includes(path) ? 'downloads' : path;
    let imported = 0;
    const remainingSlots = Math.max(0, 1000 - files.length);
    if (fileList.length > remainingSlots)
      notify(
        'Your workspace is filling up',
        'Only the files that fit within the 1,000-item limit will be imported.',
      );
    for (const file of [...fileList].slice(0, remainingSlots)) {
      if (file.size > 1024 * 1024 * 2) {
        notify(
          'A little too large',
          `${file.name} exceeds the 2 MB per-file limit. Local browser storage is limited.`,
        );
        continue;
      }
      if (file.type.startsWith('image/') && !file.type.includes('svg')) {
        const url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        if (!/^data:image\/(png|jpeg|webp|gif);base64,/.test(url)) {
          notify('Unsupported image', 'Choose a PNG, JPEG, WebP, or GIF file.');
          continue;
        }
        if (createFile(file.name, 'image', target, '', url)) imported++;
      } else if (
        file.type.startsWith('text/') ||
        /\.(txt|md|json|js|ts|tsx|jsx|css|html|csv|py|yml|yaml)$/i.test(file.name)
      ) {
        if (
          createFile(
            file.name,
            /\.(js|ts|css|html|json|py)$/.test(file.name) ? 'code' : 'text',
            target,
            await file.text(),
          )
        )
          imported++;
      } else notify('Keep it light', 'This workspace supports text, code, and image uploads.');
    }
    if (imported) {
      navigate(target);
      notify(
        'A little more you',
        `${imported} ${imported === 1 ? 'file' : 'files'} added to your workspace.`,
        'explorer',
      );
    }
    if (inputRef.current) inputRef.current.value = '';
  }
  async function downloadFile(file: WorkspaceFile) {
    try {
      if (file.url) {
        const response = await fetch(file.url);
        if (!response.ok) throw new Error();
        download(await response.blob(), file.name);
      } else download(file.content || '', file.name);
    } catch {
      notify('Download didn’t go through', 'Please try again.');
    }
  }
  function rename(file: WorkspaceFile) {
    showDialog({
      title: 'A fresh name.',
      input: true,
      initialValue: file.name,
      confirmLabel: 'Rename',
      onConfirm: (name) => updateFile(file.id, { name }),
    });
  }
  const menuFile = files.find((f) => f.id === menu?.id);
  const systemFolder =
    menuFile && ['documents', 'pictures', 'music-folder', 'downloads'].includes(menuFile.id);
  function contextMenu(event: React.MouseEvent, file: WorkspaceFile) {
    event.preventDefault();
    event.stopPropagation();
    setSelected(file.id);
    setMenu({
      id: file.id,
      x: Math.min(event.clientX, innerWidth - 220),
      y: Math.min(event.clientY, innerHeight - 320),
    });
  }
  const renderRow = (file: WorkspaceFile, simple = false) => (
    <div
      key={file.id}
      className={`file-row ${selected === file.id ? 'selected' : ''} ${simple ? 'simple' : ''}`}
      role="button"
      aria-label={file.name}
      tabIndex={0}
      onClick={() => {
        setSelected(file.id);
        if (simple) open(file);
      }}
      onDoubleClick={() => {
        if (!simple && !file.trashed) open(file);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') open(file);
        if (e.key === 'Delete') trashFile(file.id);
      }}
      onContextMenu={(e) => contextMenu(e, file)}
      draggable={!file.trashed}
      onDragStart={(e) => e.dataTransfer.setData('application/window-react-file', file.id)}
      onDragOver={(e) => {
        if (file.kind === 'folder') e.preventDefault();
      }}
      onDrop={(e) => {
        if (file.kind === 'folder') {
          e.preventDefault();
          e.stopPropagation();
          const id = e.dataTransfer.getData('application/window-react-file');
          if (id) moveFile(id, file.id);
        }
      }}
    >
      <div className="file-name">
        <FileGlyph file={file} size={simple ? 29 : 32} />
        <span>{file.name}</span>
        {file.favorite && <Star size={11} className="file-star" fill="currentColor" />}
      </div>
      <span className="file-location">
        {simple
          ? files.find((f) => f.id === file.parentId)?.name || 'My files'
          : file.kind === 'folder'
            ? `${activeFiles.filter((f) => f.parentId === file.id).length} items`
            : formatBytes(file.size)}
      </span>
      <span className="file-date">{relativeDate(file.modified)}</span>
      <IconButton
        label={`Actions for ${file.name}`}
        className="row-menu-button"
        onClick={(e) => {
          e.stopPropagation();
          contextMenu(e, file);
        }}
      >
        <MoreHorizontal size={17} />
      </IconButton>
    </div>
  );
  return (
    <div
      className="explorer-app"
      onClick={() => {
        if (menu) setMenu(null);
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) e.preventDefault();
      }}
      onDrop={(e) => {
        if (e.dataTransfer.files.length) {
          e.preventDefault();
          void upload(e.dataTransfer.files);
        }
      }}
    >
      <input
        type="file"
        multiple
        ref={inputRef}
        className="visually-hidden"
        tabIndex={-1}
        accept="image/png,image/jpeg,image/webp,image/gif,.txt,.md,.json,.js,.ts,.tsx,.jsx,.css,.html,.csv,.py,.yml,.yaml"
        onChange={(e) => void upload(e.target.files)}
      />
      <div className="explorer-toolbar">
        <div className="navigation-arrows">
          <IconButton label="Go back" disabled={historyIndex === 0} onClick={() => goHistory(-1)}>
            <ArrowLeft size={17} />
          </IconButton>
          <IconButton
            label="Go forward"
            disabled={historyIndex >= history.length - 1}
            onClick={() => goHistory(1)}
          >
            <ArrowRight size={17} />
          </IconButton>
          <IconButton
            label="Up one level"
            disabled={path === 'home' || path === 'root'}
            onClick={() => navigate(folder?.parentId || 'home')}
          >
            <ArrowUp size={17} />
          </IconButton>
        </div>
        <div className="explorer-address">
          <Home size={14} />
          <ChevronRight size={13} />
          <button onClick={() => navigate('home')}>Home</button>
          {path !== 'home' && (
            <>
              <ChevronRight size={13} />
              <span>{pathName}</span>
            </>
          )}
          <ChevronRight size={13} className="address-end" />
        </div>
        <div className="explorer-search">
          <Search size={15} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your space"
            aria-label="Search your space"
          />
          {query ? (
            <IconButton label="Clear file search" onClick={() => setQuery('')}>
              <X size={13} />
            </IconButton>
          ) : (
            <span className="search-shortcut">⌕</span>
          )}
        </div>
      </div>
      <div className="explorer-body">
        <aside className="explorer-sidebar">
          <div className="workspace-label">
            <span className="workspace-leaf">
              <Leaf size={17} />
            </span>
            <div>
              Personal workspace<span>A little more you.</span>
            </div>
          </div>
          <nav className="sidebar-navigation">
            {[
              { id: 'home', name: 'Home', icon: Home },
              { id: 'root', name: 'My files', icon: FolderOpen },
              { id: 'recent', name: 'Recent', icon: Clock3 },
              { id: 'favorites', name: 'Favorites', icon: Star },
            ].map((item) => (
              <button
                key={item.id}
                className={path === item.id ? 'active' : ''}
                onClick={() => navigate(item.id)}
              >
                <item.icon size={17} strokeWidth={1.7} />
                <span>{item.name}</span>
                {path === item.id && <span className="nav-active-dot" />}
              </button>
            ))}
            <p className="sidebar-section-label">YOUR COLLECTIONS</p>
            {collections.map((file, index) => {
              const Icon = [FileText, Image, Music2, Download][index];
              return (
                <button
                  key={file.id}
                  className={path === file.id ? 'active' : ''}
                  onClick={() => navigate(file.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const id = e.dataTransfer.getData('application/window-react-file');
                    if (id) moveFile(id, file.id);
                  }}
                >
                  <Icon size={16} strokeWidth={1.65} />
                  <span>{file.name}</span>
                </button>
              );
            })}
            <button
              className={`sidebar-trash ${path === 'trash' ? 'active' : ''}`}
              onClick={() => navigate('trash')}
            >
              <Trash2 size={16} strokeWidth={1.65} />
              Recycle Bin
              {files.some((f) => f.trashed) && (
                <span className="count-badge">{files.filter((f) => f.trashed).length}</span>
              )}
            </button>
          </nav>
          <div className="sidebar-footer">
            <div className="local-storage">
              <div>
                <HardDrive size={16} />
                <strong>Your local space</strong>
                <CheckCircle2 size={13} />
              </div>
              <div className="storage-meter">
                <span
                  style={{
                    width: `${Math.min(100, Math.max(8, JSON.stringify(files).length / 50000))}%`,
                  }}
                />
              </div>
              <p>
                {activeFiles.filter((f) => f.kind !== 'folder').length} files <span>·</span> Saved
                on this browser
              </p>
            </div>
            <button className="sidebar-account" onClick={() => openApp('settings', 'profile')}>
              <span className="account-avatar">
                {prefs.name === 'Local account' ? (
                  <Leaf size={17} />
                ) : (
                  prefs.name.charAt(0).toUpperCase()
                )}
              </span>
              <span>
                {prefs.name}
                <small>Make yourself at home</small>
              </span>
              <ChevronRight size={14} />
            </button>
          </div>
        </aside>
        <main className="explorer-main">
          {path === 'home' && !query ? (
            <div className="explorer-home">
              <div className="home-intro">
                <div>
                  <h1>
                    Welcome home<span>.</span>
                  </h1>
                  <p>A familiar feeling. A fresh perspective.</p>
                </div>
                <div className="home-date">
                  <span>
                    {new Date().toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                  </span>
                  <strong>
                    {new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
                  </strong>
                </div>
              </div>
              <section className="welcome-banner">
                <div className="welcome-banner-shade" />
                <div className="welcome-banner-copy">
                  <span className="eyebrow">
                    <span /> YOUR SPACE, REIMAGINED
                  </span>
                  <h2>
                    Less noise.
                    <br />
                    More possibility.
                  </h2>
                  <p>A little room for the things that matter.</p>
                  <button onClick={() => openApp('settings', 'personalization')}>
                    Make it yours <ArrowUpRight size={15} />
                  </button>
                </div>
                <div className="hero-window-mark">
                  <WindowLogo size={83} />
                </div>
                <span className="banner-caption">Breathe. You’re right where you belong.</span>
              </section>
              <section className="quick-access-section">
                <div className="section-heading">
                  <h2>Quick access</h2>
                  <button onClick={() => navigate('root')}>
                    View all <ArrowRight size={13} />
                  </button>
                </div>
                <div className="folder-cards">
                  {collections.map((file) => (
                    <button
                      className="folder-card"
                      key={file.id}
                      onClick={() => navigate(file.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        const id = e.dataTransfer.getData('application/window-react-file');
                        if (id) moveFile(id, file.id);
                      }}
                    >
                      <FolderIcon size={42} color={file.color} />
                      <span>
                        <strong>{file.name}</strong>
                        <small>
                          {activeFiles.filter((f) => f.parentId === file.id).length} items
                        </small>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
              <section className="recent-section">
                <div className="section-heading">
                  <h2>Pick up where you left off</h2>
                  <button onClick={() => navigate('recent')}>
                    View recent <ArrowRight size={13} />
                  </button>
                </div>
                <div className="recent-files">{recent.map((file) => renderRow(file, true))}</div>
              </section>
              <div className="home-bottom-line">
                <span>
                  <span className="online-dot" /> All your little things, together.
                </span>
                <span>Thoughtfully made. Open by nature.</span>
              </div>
            </div>
          ) : (
            <div className="files-view">
              <div className="files-view-header">
                <div>
                  <span className="eyebrow muted">YOUR PERSONAL SPACE</span>
                  <h1>
                    {query ? 'Search results' : pathName}
                    <span className="items-pill">{visible.length}</span>
                  </h1>
                </div>
                <div className="file-view-buttons">
                  {path !== 'trash' && (
                    <>
                      <button
                        className="button secondary small"
                        onClick={() => inputRef.current?.click()}
                      >
                        <Upload size={14} />
                        Upload
                      </button>
                      <button className="button primary small" onClick={newFolder}>
                        <Plus size={15} />
                        New folder
                      </button>
                    </>
                  )}
                  {path === 'trash' && visible.length > 0 && (
                    <button
                      className="button secondary small"
                      onClick={() =>
                        showDialog({
                          title: 'Empty the Recycle Bin?',
                          message:
                            'These files will be permanently removed from this browser. This can’t be undone.',
                          danger: true,
                          confirmLabel: 'Empty bin',
                          onConfirm: () =>
                            files.filter((f) => f.trashed).forEach((f) => deleteFile(f.id)),
                        })
                      }
                    >
                      <Trash2 size={14} />
                      Empty bin
                    </button>
                  )}
                </div>
              </div>
              <div className="files-actionbar">
                <span>
                  {query
                    ? `Matches for “${query}”`
                    : path === 'trash'
                      ? 'A second chance for your files.'
                      : 'A place for everything that matters.'}
                </span>
                <div>
                  <IconButton
                    label={sort === 'modified' ? 'Sort by name' : 'Sort by last modified'}
                    onClick={() => setSort((s) => (s === 'name' ? 'modified' : 'name'))}
                  >
                    <ArrowDownAZ size={16} />
                  </IconButton>
                  <div className="segmented-control">
                    <IconButton
                      label="List view"
                      className={layout === 'list' ? 'active' : ''}
                      onClick={() => setLayout('list')}
                    >
                      <List size={16} />
                    </IconButton>
                    <IconButton
                      label="Grid view"
                      className={layout === 'grid' ? 'active' : ''}
                      onClick={() => setLayout('grid')}
                    >
                      <LayoutGrid size={15} />
                    </IconButton>
                  </div>
                </div>
              </div>
              {visible.length === 0 ? (
                <EmptyState
                  icon={
                    path === 'trash' ? (
                      <Trash2 size={32} strokeWidth={1.3} />
                    ) : (
                      <FolderOpen size={35} strokeWidth={1.2} />
                    )
                  }
                  title={
                    query
                      ? 'Nothing here, just yet.'
                      : path === 'trash'
                        ? 'A clean slate.'
                        : 'Room for something good.'
                  }
                  description={
                    query
                      ? 'Try another name or search your entire space from Home.'
                      : path === 'trash'
                        ? 'Your Recycle Bin is empty.'
                        : 'Add a file, create a folder, or bring in something of your own.'
                  }
                >
                  {path !== 'trash' && !query && (
                    <button className="button primary" onClick={() => inputRef.current?.click()}>
                      <Upload size={15} />
                      Bring your files
                    </button>
                  )}
                </EmptyState>
              ) : layout === 'list' ? (
                <div className="file-table">
                  <div className="file-table-head">
                    <span>Name</span>
                    <span>Size</span>
                    <span>Modified</span>
                    <span />
                  </div>
                  {visible.map((file) => renderRow(file))}
                </div>
              ) : (
                <div className="file-grid">
                  {visible.map((file) => (
                    <button
                      className={`file-tile ${selected === file.id ? 'selected' : ''}`}
                      key={file.id}
                      onClick={() => {
                        setSelected(file.id);
                        if (!file.trashed) open(file);
                      }}
                      onContextMenu={(e) => contextMenu(e, file)}
                      draggable={!file.trashed}
                      onDragStart={(e) =>
                        e.dataTransfer.setData('application/window-react-file', file.id)
                      }
                    >
                      <FileGlyph file={file} size={file.kind === 'image' ? 95 : 60} />
                      <strong>{file.name}</strong>
                      <span>{file.kind === 'folder' ? 'Folder' : formatBytes(file.size)}</span>
                    </button>
                  ))}
                </div>
              )}
              {selected && (
                <div className="selection-bar">
                  <span>
                    <Check size={14} />1 item selected
                  </span>
                  <div>
                    {path === 'trash' ? (
                      <button onClick={() => restoreFile(selected)}>Restore file</button>
                    ) : (
                      <button
                        onClick={() => {
                          const file = files.find((f) => f.id === selected);
                          if (file) open(file);
                        }}
                      >
                        Open <ArrowUpRight size={13} />
                      </button>
                    )}
                    <IconButton label="Clear selection" onClick={() => setSelected(null)}>
                      <X size={14} />
                    </IconButton>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
      <div className="explorer-statusbar">
        <span>
          <CheckCircle2 size={11} /> Everything stays on your device
        </span>
        <span>
          {query ? `${visible.length} results` : 'Window React'}
          <span className="status-divider" />
          Local-first. Always.
        </span>
      </div>
      {menu &&
        menuFile &&
        createPortal(
          <>
            <div
              className="context-dismiss"
              onClick={(e) => {
                e.stopPropagation();
                setMenu(null);
              }}
            />
            <div
              className="context-menu file-context"
              style={{ left: menu.x, top: menu.y }}
              onClick={(e) => e.stopPropagation()}
            >
              {menuFile.trashed ? (
                <>
                  <button
                    onClick={() => {
                      restoreFile(menuFile.id);
                      setMenu(null);
                    }}
                  >
                    <ArrowUp size={15} />
                    Restore
                  </button>
                  <button
                    className="danger-text"
                    onClick={() => {
                      setMenu(null);
                      showDialog({
                        title: 'Delete this file forever?',
                        message: menuFile.name,
                        danger: true,
                        confirmLabel: 'Delete permanently',
                        onConfirm: () => deleteFile(menuFile.id),
                      });
                    }}
                  >
                    <Trash2 size={15} />
                    Delete permanently
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      open(menuFile);
                      setMenu(null);
                    }}
                  >
                    <FolderOpen size={15} />
                    Open<kbd>↵</kbd>
                  </button>
                  <button
                    onClick={() => {
                      updateFile(menuFile.id, { favorite: !menuFile.favorite });
                      setMenu(null);
                    }}
                  >
                    <Star size={15} />
                    {menuFile.favorite ? 'Remove from favorites' : 'Add to favorites'}
                  </button>
                  <div className="menu-separator" />
                  {!systemFolder && (
                    <button
                      onClick={() => {
                        rename(menuFile);
                        setMenu(null);
                      }}
                    >
                      <Pencil size={15} />
                      Rename
                    </button>
                  )}
                  {menuFile.kind !== 'folder' && (
                    <>
                      <button
                        onClick={() => {
                          createFile(
                            menuFile.name,
                            menuFile.kind,
                            menuFile.parentId,
                            menuFile.content,
                            menuFile.url,
                          );
                          setMenu(null);
                        }}
                      >
                        <Copy size={15} />
                        Make a copy
                      </button>
                      <button
                        onClick={() => {
                          void downloadFile(menuFile);
                          setMenu(null);
                        }}
                      >
                        <Download size={15} />
                        Download
                      </button>
                    </>
                  )}
                  {!systemFolder && (
                    <>
                      <div className="menu-separator" />
                      <button
                        className="danger-text"
                        onClick={() => {
                          trashFile(menuFile.id);
                          setMenu(null);
                        }}
                      >
                        <Trash2 size={15} />
                        Move to Recycle Bin<kbd>Del</kbd>
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
