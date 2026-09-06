import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { TRACKS } from '../lib/data';
import { useWorkspace } from './WorkspaceContext';
import { safeRead } from '../lib/utils';

interface MusicValue {
  track: (typeof TRACKS)[number];
  trackIndex: number;
  playing: boolean;
  progress: number;
  duration: number;
  shuffle: boolean;
  repeat: boolean;
  favorites: string[];
  play: (index?: number) => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  setShuffle: (value: boolean) => void;
  setRepeat: (value: boolean) => void;
  toggleFavorite: (id: string) => void;
}
const MusicContext = createContext<MusicValue | null>(null);
export function MusicProvider({ children }: { children: ReactNode }) {
  const { prefs, notify } = useWorkspace();
  const audio = useRef<HTMLAudioElement>(null);
  const [trackIndex, setTrackIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(TRACKS[0].duration);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => safeRead('wr:music-favorites', []));
  const autoPlay = useRef(false);
  const track = TRACKS[trackIndex];
  const tryPlay = () => {
    audio.current?.play().catch(() => {
      setPlaying(false);
      notify(
        'A little silence, for now',
        'Click play to start your soundscape. Check that your browser allows audio.',
        'music',
      );
    });
  };
  useEffect(() => {
    if (audio.current) audio.current.volume = prefs.volume / 100;
  }, [prefs.volume]);
  useEffect(() => {
    if (autoPlay.current) tryPlay();
  }, [trackIndex]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    try {
      localStorage.setItem('wr:music-favorites', JSON.stringify(favorites));
    } catch {
      /* private mode */
    }
  }, [favorites]);
  function play(index = trackIndex) {
    if (index !== trackIndex) {
      autoPlay.current = true;
      setProgress(0);
      setDuration(TRACKS[index].duration);
      setTrackIndex(index);
    } else tryPlay();
  }
  function toggle() {
    if (playing) {
      audio.current?.pause();
      autoPlay.current = false;
    } else play();
  }
  function next() {
    play(
      shuffle
        ? (trackIndex + 1 + Math.floor(Math.random() * (TRACKS.length - 1))) % TRACKS.length
        : (trackIndex + 1) % TRACKS.length,
    );
  }
  function previous() {
    if (audio.current && audio.current.currentTime > 3) {
      audio.current.currentTime = 0;
      setProgress(0);
    } else play((trackIndex + TRACKS.length - 1) % TRACKS.length);
  }
  return (
    <MusicContext.Provider
      value={{
        track,
        trackIndex,
        playing,
        progress,
        duration,
        shuffle,
        repeat,
        favorites,
        play,
        toggle,
        next,
        previous,
        seek: (seconds) => {
          if (audio.current) {
            audio.current.currentTime = seconds;
            setProgress(seconds);
          }
        },
        setShuffle,
        setRepeat,
        toggleFavorite: (id) =>
          setFavorites((items) =>
            items.includes(id) ? items.filter((i) => i !== id) : [...items, id],
          ),
      }}
    >
      <audio
        ref={audio}
        src={track.url}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={() => setProgress(audio.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audio.current?.duration || track.duration)}
        onEnded={() => {
          if (repeat) {
            if (audio.current) audio.current.currentTime = 0;
            tryPlay();
          } else next();
        }}
        onError={() => {
          setPlaying(false);
          notify(
            'Couldn’t load this soundscape',
            'Please refresh the page and try again.',
            'music',
          );
        }}
      />
      {children}
    </MusicContext.Provider>
  );
}
export function useMusic() {
  const context = useContext(MusicContext);
  if (!context) throw new Error('MusicProvider missing');
  return context;
}
