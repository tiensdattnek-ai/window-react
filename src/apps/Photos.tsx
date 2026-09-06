import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Heart,
  Image,
  Maximize,
  RotateCw,
  Search,
  SlidersHorizontal,
  Wallpaper,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { EmptyState, IconButton } from '../components/Shared';
import { download } from '../lib/utils';

export function Photos({ data }: { data?: string }) {
  const { files, updateFile, updatePrefs, patchWindow, notify, openApp } = useWorkspace();
  const [query, setQuery] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const photos = files.filter((f) => f.kind === 'image' && !f.trashed);
  const selected = photos.find((f) => f.id === data);
  const filtered = photos.filter(
    (f) => (!onlyFavorites || f.favorite) && f.name.toLowerCase().includes(query.toLowerCase()),
  );
  function select(id?: string) {
    patchWindow('photos', { data: id });
    setZoom(1);
    setRotation(0);
  }
  function step(direction: number) {
    const index = photos.findIndex((f) => f.id === selected?.id);
    select(photos[(index + direction + photos.length) % photos.length].id);
  }
  async function save() {
    if (!selected?.url) return;
    try {
      const res = await fetch(selected.url);
      if (!res.ok) throw new Error();
      download(await res.blob(), selected.name);
    } catch {
      notify('Couldn’t download that photo', 'Give it another try.');
    }
  }
  return (
    <div className={`photos-app ${selected ? 'photo-viewer-mode' : ''}`}>
      {selected ? (
        <>
          <div className="photo-viewer-toolbar">
            <IconButton label="Back to all photos" onClick={() => select()}>
              <ArrowLeft size={18} />
            </IconButton>
            <span>{selected.name}</span>
            <div className="toolbar-spacer" />
            <IconButton
              label="Zoom out"
              disabled={zoom <= 0.5}
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            >
              <ZoomOut size={17} />
            </IconButton>
            <span className="zoom-label">{Math.round(zoom * 100)}%</span>
            <IconButton
              label="Zoom in"
              disabled={zoom >= 3}
              onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            >
              <ZoomIn size={17} />
            </IconButton>
            <IconButton label="Rotate photo" onClick={() => setRotation((r) => r + 90)}>
              <RotateCw size={17} />
            </IconButton>
            <IconButton
              label="Fit photo"
              onClick={() => {
                setZoom(1);
                setRotation(0);
              }}
            >
              <Maximize size={16} />
            </IconButton>
            <span className="toolbar-separator" />
            <IconButton
              label="Favorite photo"
              className={selected.favorite ? 'is-liked' : ''}
              onClick={() => updateFile(selected.id, { favorite: !selected.favorite })}
            >
              <Heart size={17} fill={selected.favorite ? 'currentColor' : 'none'} />
            </IconButton>
            <IconButton label="Download photo" onClick={() => void save()}>
              <Download size={17} />
            </IconButton>
            <IconButton
              label="Set as wallpaper"
              onClick={() => {
                updatePrefs({ wallpaper: selected.url! });
                notify('A fresh perspective', 'Your desktop has a lovely new view.', 'settings');
              }}
            >
              <Wallpaper size={18} />
            </IconButton>
          </div>
          <div className="photo-canvas">
            <img
              src={selected.url}
              alt={selected.name}
              style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
            />
            <button className="photo-previous" aria-label="Previous photo" onClick={() => step(-1)}>
              <ArrowLeft size={19} />
            </button>
            <button className="photo-next" aria-label="Next photo" onClick={() => step(1)}>
              <ArrowRight size={19} />
            </button>
          </div>
          <div className="photo-filmstrip">
            {photos.map((photo) => (
              <button
                key={photo.id}
                className={photo.id === selected.id ? 'selected' : ''}
                onClick={() => select(photo.id)}
                aria-label={`View ${photo.name}`}
              >
                <img src={photo.url} alt={photo.name} />
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <header className="photos-header">
            <div>
              <span className="eyebrow muted">THE WAY YOU SEE THE WORLD</span>
              <h1>
                A collection of little wonders<span>.</span>
              </h1>
              <p>Good views. Quiet moments. The things worth keeping.</p>
            </div>
            <button
              className="button secondary small"
              onClick={() => openApp('explorer', 'pictures')}
            >
              <Image size={15} />
              Import photos
            </button>
          </header>
          <div className="photos-filterbar">
            <div>
              <button
                className={!onlyFavorites ? 'active' : ''}
                onClick={() => setOnlyFavorites(false)}
              >
                All photos <span>{photos.length}</span>
              </button>
              <button
                className={onlyFavorites ? 'active' : ''}
                onClick={() => setOnlyFavorites(true)}
              >
                <Heart size={14} />
                Favorites
              </button>
            </div>
            <div className="photos-search">
              <Search size={14} />
              <input
                aria-label="Search photos"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a moment"
              />
              <SlidersHorizontal size={14} />
            </div>
          </div>
          <div className="photos-gallery">
            {filtered.map((photo, index) => (
              <button
                key={photo.id}
                className={`photo-card photo-card-${index % 3}`}
                onClick={() => select(photo.id)}
              >
                <img src={photo.url} alt={photo.name} />
                <div>
                  <span>
                    <strong>{photo.name.replace(/\.[^.]+$/, '')}</strong>
                    <small>
                      {photo.url?.startsWith('/wallpapers')
                        ? 'Window React originals'
                        : 'Your collection'}
                    </small>
                  </span>
                  {photo.favorite ? (
                    <Heart size={15} fill="currentColor" />
                  ) : (
                    <ArrowRight size={16} />
                  )}
                </div>
              </button>
            ))}
            {!filtered.length && (
              <EmptyState
                title="A new way to see things."
                description={
                  query
                    ? 'No photos match your search.'
                    : 'Add a favorite photo, or import a moment of your own.'
                }
              />
            )}
          </div>
          <footer className="photos-footer">
            <span>{filtered.length} moments worth a second look.</span>
            <span>Beautifully yours.</span>
          </footer>
        </>
      )}
    </div>
  );
}
