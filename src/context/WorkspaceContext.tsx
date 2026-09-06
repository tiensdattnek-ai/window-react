import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  AppId,
  CalendarEvent,
  DialogOptions,
  NotificationItem,
  Preferences,
  WeatherData,
  WindowState,
  WorkspaceFile,
} from '../lib/types';
import { APPS, APP_SIZES, DEFAULT_PREFS, SEED_FILES } from '../lib/data';
import { clamp, safeRead, uid } from '../lib/utils';
import { getDescendants, isValidName, uniqueName, validateImport } from '../lib/filesystem';

const SYSTEM_FOLDERS = ['documents', 'pictures', 'music-folder', 'downloads'];
function makeWindow(id: AppId, z: number, data?: string): WindowState {
  const [w, h] = APP_SIZES[id];
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(w, vw - (vw < 700 ? 16 : 128));
  const height = Math.min(h, vh - 148);
  return {
    id,
    title: APPS.find((a) => a.id === id)!.name,
    x: Math.max(8, (vw - width) / 2 + (z > 2 ? (z % 4) * 16 - 24 : 0)),
    y: Math.max(64, (vh - height - 66) / 2 + (z > 2 ? (z % 3) * 12 : 0)),
    width,
    height: Math.max(320, height),
    minimized: false,
    maximized: vw < 700,
    z,
    data,
    launchKey: 1,
  };
}
interface WorkspaceContextValue {
  files: WorkspaceFile[];
  prefs: Preferences;
  windows: WindowState[];
  activeApp: AppId | undefined;
  notifications: NotificationItem[];
  toasts: NotificationItem[];
  dialog: DialogOptions | null;
  events: CalendarEvent[];
  weather: WeatherData | null;
  weatherLoading: boolean;
  weatherError: string;
  updatePrefs: (patch: Partial<Preferences>) => void;
  openApp: (id: AppId, data?: string) => void;
  closeApp: (id: AppId) => void;
  focusApp: (id: AppId) => void;
  minimizeApp: (id: AppId) => void;
  maximizeApp: (id: AppId) => void;
  patchWindow: (id: AppId, patch: Partial<WindowState>) => void;
  createFile: (
    name: string,
    kind: WorkspaceFile['kind'],
    parentId?: string,
    content?: string,
    url?: string,
  ) => string | undefined;
  updateFile: (id: string, patch: Partial<WorkspaceFile>) => void;
  trashFile: (id: string) => void;
  restoreFile: (id: string) => void;
  deleteFile: (id: string) => void;
  moveFile: (id: string, parentId: string) => void;
  importFiles: (data: unknown) => boolean;
  openFile: (file: WorkspaceFile) => void;
  notify: (title: string, message: string, app?: AppId) => void;
  dismissToast: (id: string) => void;
  dismissNotification: (id?: string) => void;
  showDialog: (options: DialogOptions) => void;
  closeDialog: () => void;
  addEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  removeEvent: (id: string) => void;
  refreshWeather: () => void;
}
const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<WorkspaceFile[]>(() => {
    const saved = safeRead<unknown>('wr:files', null);
    return validateImport(saved) ? saved : SEED_FILES;
  });
  const [prefs, setPrefs] = useState<Preferences>(() => ({
    ...DEFAULT_PREFS,
    ...safeRead<Partial<Preferences>>('wr:prefs', {}),
  }));
  const [windows, setWindows] = useState<WindowState[]>(() => [makeWindow('explorer', 1, 'home')]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'welcome',
      title: 'A fresh start. An open window.',
      message: 'Your personal space is ready. Make yourself at home.',
      time: Date.now(),
      app: 'settings',
    },
  ]);
  const [toasts, setToasts] = useState<NotificationItem[]>([]);
  const [dialog, setDialog] = useState<DialogOptions | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>(() => safeRead('wr:events', []));
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState('');
  const [weatherTick, setWeatherTick] = useState(0);
  const zCounter = useRef(1);
  const storageError = useRef(false);
  const activeApp = [...windows].filter((w) => !w.minimized).sort((a, b) => b.z - a.z)[0]?.id;
  function notify(title: string, message: string, app?: AppId) {
    const item = { id: uid(), title, message, time: Date.now(), app };
    setNotifications((items) => [item, ...items].slice(0, 40));
    if (!prefs.focus) {
      setToasts((items) => [...items.slice(-2), item]);
      setTimeout(() => setToasts((items) => items.filter((t) => t.id !== item.id)), 4800);
    }
  }
  useEffect(() => {
    try {
      localStorage.setItem('wr:files', JSON.stringify(files));
      storageError.current = false;
    } catch {
      if (!storageError.current) {
        storageError.current = true;
        notify(
          'Local storage is full',
          'Your latest changes are in memory. Export your workspace in Settings before closing this tab.',
          'settings',
        );
      }
    }
  }, [files]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    try {
      localStorage.setItem('wr:prefs', JSON.stringify(prefs));
    } catch {
      /* private browsing */
    }
    document.documentElement.dataset.theme = prefs.theme;
    document.documentElement.dataset.animations = String(prefs.animations);
    document.documentElement.dataset.transparency = String(prefs.transparency);
    document.documentElement.style.setProperty('--accent', prefs.accent);
  }, [prefs]);
  useEffect(() => {
    try {
      localStorage.setItem('wr:events', JSON.stringify(events));
    } catch {
      /* private browsing */
    }
  }, [events]);
  useEffect(() => {
    const controller = new AbortController();
    setWeatherLoading(true);
    setWeatherError('');
    fetch(`/api/weather?city=${encodeURIComponent(prefs.city)}`, { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
      })
      .then(setWeather)
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setWeather(null);
          setWeatherError(err.message || 'Weather unavailable');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setWeatherLoading(false);
      });
    return () => controller.abort();
  }, [prefs.city, weatherTick]);
  useEffect(() => {
    const onResize = () =>
      setWindows((items) =>
        items.map((w) => ({
          ...w,
          width: Math.min(w.width, window.innerWidth - 16),
          height: Math.min(w.height, window.innerHeight - 100),
          x: clamp(w.x, 8, window.innerWidth - Math.min(w.width, window.innerWidth - 16) - 8),
          y: clamp(w.y, 8, window.innerHeight - Math.min(w.height, window.innerHeight - 100) - 82),
        })),
      );
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  function openApp(id: AppId, data?: string) {
    const z = ++zCounter.current;
    setWindows((items) =>
      items.some((w) => w.id === id)
        ? items.map((w) =>
            w.id === id
              ? {
                  ...w,
                  minimized: false,
                  z,
                  ...(data !== undefined ? { data, launchKey: (w.launchKey || 0) + 1 } : {}),
                }
              : w,
          )
        : [...items, makeWindow(id, z, data)],
    );
  }
  function focusApp(id: AppId) {
    const z = ++zCounter.current;
    setWindows((items) => items.map((w) => (w.id === id ? { ...w, z, minimized: false } : w)));
  }
  function patchWindow(id: AppId, patch: Partial<WindowState>) {
    setWindows((items) => items.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  }
  function createFile(
    name: string,
    kind: WorkspaceFile['kind'],
    parentId = 'documents',
    content = '',
    url?: string,
  ) {
    if (files.length >= 1000) {
      notify(
        'A little too much to carry',
        'This workspace supports 1,000 items. Back up your files and empty the Recycle Bin to make room.',
        'settings',
      );
      return;
    }
    if (!isValidName(name)) {
      notify(
        'That name needs a small change',
        'Use 1–120 characters, without / \\ : * ? " < > or |.',
      );
      return;
    }
    const parent = files.find((f) => f.id === parentId && f.kind === 'folder' && !f.trashed);
    const actualParent = parentId === 'root' || parent ? parentId : 'root';
    const id = uid();
    setFiles((items) => [
      ...items,
      {
        id,
        name: uniqueName(items, actualParent, name.trim()),
        kind,
        parentId: actualParent,
        content,
        url,
        modified: Date.now(),
        size: new Blob([content || url || '']).size,
      },
    ]);
    return id;
  }
  function updateFile(id: string, patch: Partial<WorkspaceFile>) {
    if (patch.name !== undefined && !isValidName(patch.name)) {
      notify('Invalid file name', 'Please choose a name without special characters.');
      return;
    }
    setFiles((items) =>
      items.map((f) =>
        f.id === id
          ? {
              ...f,
              ...patch,
              ...(patch.name ? { name: uniqueName(items, f.parentId, patch.name.trim(), id) } : {}),
              ...(patch.content !== undefined ? { size: new Blob([patch.content]).size } : {}),
              modified: patch.favorite !== undefined ? f.modified : Date.now(),
            }
          : f,
      ),
    );
  }
  function trashFile(id: string) {
    if (SYSTEM_FOLDERS.includes(id)) {
      notify(
        'This folder belongs here',
        'Default collection folders can’t be deleted. You can manage everything inside.',
      );
      return;
    }
    const ids = getDescendants(files, id);
    setFiles((items) => items.map((f) => (ids.includes(f.id) ? { ...f, trashed: true } : f)));
    notify('Moved to Recycle Bin', 'You can restore it anytime from File Explorer.', 'explorer');
  }
  function restoreFile(id: string) {
    const ids = getDescendants(files, id);
    const file = files.find((f) => f.id === id);
    const parentValid =
      file?.parentId === 'root' || files.some((f) => f.id === file?.parentId && !f.trashed);
    setFiles((items) =>
      items.map((f) =>
        ids.includes(f.id)
          ? {
              ...f,
              trashed: false,
              ...(f.id === id && !parentValid ? { parentId: 'root' } : {}),
              ...(f.id === id
                ? { name: uniqueName(items, parentValid ? f.parentId : 'root', f.name, id) }
                : {}),
            }
          : f,
      ),
    );
    notify('Back where it belongs', 'Your file has been restored.', 'explorer');
  }
  function deleteFile(id: string) {
    const ids = getDescendants(files, id);
    setFiles((items) => items.filter((f) => !ids.includes(f.id)));
  }
  function moveFile(id: string, parentId: string) {
    if (SYSTEM_FOLDERS.includes(id) || getDescendants(files, id).includes(parentId)) return;
    if (
      parentId !== 'root' &&
      !files.some((f) => f.id === parentId && f.kind === 'folder' && !f.trashed)
    )
      return;
    setFiles((items) =>
      items.map((f) =>
        f.id === id
          ? { ...f, parentId, name: uniqueName(items, parentId, f.name, id), modified: Date.now() }
          : f,
      ),
    );
  }
  function openFile(file: WorkspaceFile) {
    if (file.trashed) return;
    if (file.kind === 'folder') openApp('explorer', file.id);
    else if (file.kind === 'image') openApp('photos', file.id);
    else if (file.kind === 'audio') openApp('music', file.id);
    else openApp('notes', file.id);
  }
  return (
    <WorkspaceContext.Provider
      value={{
        files,
        prefs,
        windows,
        activeApp,
        notifications,
        toasts,
        dialog,
        events,
        weather,
        weatherLoading,
        weatherError,
        updatePrefs: (patch) => setPrefs((p) => ({ ...p, ...patch })),
        openApp,
        focusApp,
        patchWindow,
        closeApp: (id) => setWindows((items) => items.filter((w) => w.id !== id)),
        minimizeApp: (id) => patchWindow(id, { minimized: true }),
        maximizeApp: (id) => {
          const z = ++zCounter.current;
          setWindows((items) =>
            items.map((w) => (w.id === id ? { ...w, maximized: !w.maximized, z } : w)),
          );
        },
        createFile,
        updateFile,
        trashFile,
        restoreFile,
        deleteFile,
        moveFile,
        openFile,
        importFiles: (data) => {
          if (!validateImport(data)) return false;
          setFiles(data);
          return true;
        },
        notify,
        dismissToast: (id) => setToasts((items) => items.filter((t) => t.id !== id)),
        dismissNotification: (id) =>
          setNotifications((items) => (id ? items.filter((n) => n.id !== id) : [])),
        showDialog: setDialog,
        closeDialog: () => setDialog(null),
        addEvent: (event) => setEvents((items) => [...items, { ...event, id: uid() }]),
        removeEvent: (id) => setEvents((items) => items.filter((e) => e.id !== id)),
        refreshWeather: () => setWeatherTick((t) => t + 1),
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('WorkspaceProvider missing');
  return context;
}
