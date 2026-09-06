import { useEffect, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Heart,
  Volume2,
  VolumeX,
  ListMusic,
  Search,
  ArrowUpRight,
  Music2,
  Headphones,
  X,
} from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { TRACKS } from '../lib/data';
import { formatTime } from '../lib/utils';
import { EmptyState, IconButton } from '../components/Shared';

export function Music({ data, launchKey }: { data?: string; launchKey?: number }) {
  const music = useMusic();
  const { prefs, updatePrefs } = useWorkspace();
  const [tab, setTab] = useState('library');
  const [search, setSearch] = useState('');
  const [queue, setQueue] = useState(false);
  useEffect(() => {
    if (data) {
      const index = TRACKS.findIndex((t) => t.id === data);
      if (index >= 0) music.play(index);
    }
  }, [data, launchKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const tracks = TRACKS.filter(
    (track) =>
      (tab !== 'favorites' || music.favorites.includes(track.id)) &&
      `${track.title} ${track.artist}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="music-app">
      <header className="music-topbar">
        <div className="music-wordmark">
          <Headphones size={20} />
          <strong>
            the listening room<span>.</span>
          </strong>
        </div>
        <div className="music-nav">
          <button className={tab === 'library' ? 'active' : ''} onClick={() => setTab('library')}>
            Your library
          </button>
          <button
            className={tab === 'favorites' ? 'active' : ''}
            onClick={() => setTab('favorites')}
          >
            Favorites
          </button>
        </div>
        <div className="music-search">
          <Search size={15} />
          <input
            aria-label="Search music"
            placeholder="Find your rhythm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>
      <main className="music-main">
        <div className="music-album-art" style={{ backgroundImage: `url(${music.track.artwork})` }}>
          <span className="album-topline">WINDOW SESSIONS — VOL. 01</span>
          <div>
            <span>a little room</span>
            <strong>to breathe.</strong>
          </div>
          <span className="album-bottomline">
            <span>ORIGINAL AMBIENT SOUNDSCAPES</span>
            <Music2 size={21} />
          </span>
        </div>
        <section className="album-detail">
          <span className="eyebrow muted">SLOW DOWN. TUNE IN.</span>
          <h1>Find your quiet.</h1>
          <p>
            A softer soundtrack for your everyday.
            <br />
            Three original soundscapes. A little more headspace.
          </p>
          <div className="album-byline">
            <span className="artist-avatar">
              <Headphones size={13} />
            </span>
            <strong>Window Sessions</strong>
            <span>·</span>
            <span>3 tracks, 4 min</span>
          </div>
          <div className="album-actions">
            <button className="button primary" onClick={() => music.play(0)}>
              <Play size={15} fill="currentColor" />
              Play something good
            </button>
            <IconButton
              label={
                music.favorites.includes(music.track.id)
                  ? 'Unfavorite this track'
                  : 'Favorite this track'
              }
              className={music.favorites.includes(music.track.id) ? 'is-liked' : ''}
              onClick={() => music.toggleFavorite(music.track.id)}
            >
              <Heart
                size={19}
                fill={music.favorites.includes(music.track.id) ? 'currentColor' : 'none'}
              />
            </IconButton>
          </div>
          <div className="track-list">
            {tracks.length ? (
              tracks.map((track) => {
                const index = TRACKS.findIndex((t) => t.id === track.id);
                const current = track.id === music.track.id;
                return (
                  <div className={`track-row ${current ? 'active' : ''}`} key={track.id}>
                    <button
                      className="track-play"
                      aria-label={`Play ${track.title}`}
                      onClick={() => (current ? music.toggle() : music.play(index))}
                    >
                      {current && music.playing ? (
                        <span className="equalizer">
                          <i />
                          <i />
                          <i />
                        </span>
                      ) : (
                        <span className="track-number">{index + 1}</span>
                      )}
                      <Play size={13} className="track-hover-play" fill="currentColor" />
                    </button>
                    <button className="track-info" onClick={() => music.play(index)}>
                      <strong>{track.title}</strong>
                      <span>{track.artist}</span>
                    </button>
                    <IconButton
                      label={`Favorite ${track.title}`}
                      className={music.favorites.includes(track.id) ? 'is-liked' : ''}
                      onClick={() => music.toggleFavorite(track.id)}
                    >
                      <Heart
                        size={14}
                        fill={music.favorites.includes(track.id) ? 'currentColor' : 'none'}
                      />
                    </IconButton>
                    <span className="track-duration">{formatTime(track.duration)}</span>
                  </div>
                );
              })
            ) : (
              <EmptyState
                icon={<Heart size={25} />}
                title="A little room for favorites."
                description={
                  search ? 'Try another track name.' : 'Tap a heart to keep a soundscape close.'
                }
              />
            )}
          </div>
        </section>
      </main>
      <div className="music-editorial">
        <span>
          <span className="online-dot" /> No ads. No rush. Just a little good music.
        </span>
        <button
          onClick={() => {
            setTab('library');
            setSearch('');
            music.setShuffle(true);
            music.play(Math.floor(Math.random() * TRACKS.length));
          }}
        >
          Let the day surprise you <ArrowUpRight size={13} />
        </button>
      </div>
      <footer className="music-player">
        <div className="now-playing">
          <img src={music.track.artwork} alt="Current album artwork" />
          <div>
            <strong>{music.track.title}</strong>
            <span>{music.track.artist}</span>
          </div>
        </div>
        <div className="player-center">
          <div className="playback-buttons">
            <IconButton
              label="Shuffle"
              className={music.shuffle ? 'active' : ''}
              onClick={() => music.setShuffle(!music.shuffle)}
            >
              <Shuffle size={15} />
            </IconButton>
            <IconButton label="Previous track" onClick={music.previous}>
              <SkipBack size={18} fill="currentColor" />
            </IconButton>
            <button
              className="main-play-button"
              aria-label={music.playing ? 'Pause music' : 'Play music'}
              onClick={music.toggle}
            >
              {music.playing ? (
                <Pause size={18} fill="currentColor" />
              ) : (
                <Play size={18} fill="currentColor" />
              )}
            </button>
            <IconButton label="Next track" onClick={music.next}>
              <SkipForward size={18} fill="currentColor" />
            </IconButton>
            <IconButton
              label="Repeat current track"
              className={music.repeat ? 'active' : ''}
              onClick={() => music.setRepeat(!music.repeat)}
            >
              <Repeat size={15} />
            </IconButton>
          </div>
          <div className="playback-progress">
            <span>{formatTime(music.progress)}</span>
            <input
              type="range"
              aria-label="Track progress"
              min="0"
              max={music.duration || music.track.duration}
              step="0.1"
              value={music.progress}
              onChange={(e) => music.seek(Number(e.target.value))}
            />
            <span>{formatTime(music.duration)}</span>
          </div>
        </div>
        <div className="player-volume">
          <IconButton
            label="Toggle music queue"
            className={queue ? 'active' : ''}
            onClick={() => setQueue(!queue)}
          >
            <ListMusic size={17} />
          </IconButton>
          <IconButton
            label={prefs.volume === 0 ? 'Unmute' : 'Mute'}
            onClick={() => updatePrefs({ volume: prefs.volume === 0 ? 65 : 0 })}
          >
            {prefs.volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </IconButton>
          <input
            type="range"
            aria-label="Music volume"
            value={prefs.volume}
            onChange={(e) => updatePrefs({ volume: Number(e.target.value) })}
          />
        </div>
      </footer>
      {queue && (
        <aside className="music-queue">
          <div>
            <h3>A little more to listen to.</h3>
            <IconButton label="Close music queue" onClick={() => setQueue(false)}>
              <X size={18} />
            </IconButton>
          </div>
          {TRACKS.map((track, index) => (
            <button
              key={track.id}
              onClick={() => music.play(index)}
              className={music.trackIndex === index ? 'active' : ''}
            >
              <img src={track.artwork} alt="" />
              <span>
                <strong>{track.title}</strong>
                <small>{track.artist}</small>
              </span>
              <Play size={13} />
            </button>
          ))}
        </aside>
      )}
    </div>
  );
}
