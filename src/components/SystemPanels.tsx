import {
  Bluetooth,
  Check,
  ChevronRight,
  Expand,
  Focus,
  Leaf,
  Moon,
  Plane,
  Settings2,
  ShieldCheck,
  Sun,
  Volume2,
  VolumeX,
  Wifi,
  X,
  Bell,
  BellOff,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { AppIcon } from './AppIcon';
import { IconButton } from './Shared';
import { relativeDate } from '../lib/utils';

export function QuickSettings({ onClose }: { onClose: () => void }) {
  const { prefs, updatePrefs, openApp, notify } = useWorkspace();
  const networkNotice = (label: string) =>
    notify(
      `${label} indicator updated`,
      'This is a workspace setting. Your device’s real network connection is unchanged.',
    );
  const items = [
    {
      name: 'Wi-Fi',
      icon: Wifi,
      active: prefs.wifi && !prefs.airplane,
      action: () => {
        updatePrefs({ wifi: !prefs.wifi, airplane: false });
        networkNotice('Wi-Fi');
      },
    },
    {
      name: 'Bluetooth',
      icon: Bluetooth,
      active: prefs.bluetooth,
      action: () => {
        updatePrefs({ bluetooth: !prefs.bluetooth });
        networkNotice('Bluetooth');
      },
    },
    {
      name: 'Airplane mode',
      icon: Plane,
      active: prefs.airplane,
      action: () => {
        updatePrefs({ airplane: !prefs.airplane });
        networkNotice('Airplane mode');
      },
    },
    {
      name: 'Dark mode',
      icon: Moon,
      active: prefs.theme === 'dark',
      action: () => updatePrefs({ theme: prefs.theme === 'dark' ? 'light' : 'dark' }),
    },
    {
      name: 'Quiet focus',
      icon: Focus,
      active: prefs.focus,
      action: () => updatePrefs({ focus: !prefs.focus }),
    },
    {
      name: 'Full screen',
      icon: Expand,
      active: !!document.fullscreenElement,
      action: () => {
        if (document.fullscreenElement) void document.exitFullscreen();
        else
          void document.documentElement
            .requestFullscreen()
            .catch(() =>
              notify(
                'A little more room',
                'Full screen is unavailable inside this preview. Open the app in its own browser tab.',
              ),
            );
      },
    },
  ];
  return (
    <section className="quick-settings glass-panel" aria-label="Quick settings">
      <div className="panel-title">
        <div>
          <SlidersIcon />
          <h2>A little fine-tuning.</h2>
        </div>
        <IconButton label="Close quick settings" onClick={onClose}>
          <X size={16} />
        </IconButton>
      </div>
      <div className="quick-settings-grid">
        {items.map((item) => (
          <button key={item.name} aria-pressed={item.active} onClick={item.action}>
            <span className={item.active ? 'active' : ''}>
              <item.icon size={21} strokeWidth={1.6} />
              {item.name === 'Wi-Fi' && <ChevronRight size={14} />}
            </span>
            <small>{item.name}</small>
          </button>
        ))}
      </div>
      <div className="quick-sliders">
        <label>
          <Sun size={20} strokeWidth={1.6} />
          <input
            type="range"
            min="35"
            max="100"
            value={prefs.brightness}
            aria-label="Brightness"
            onChange={(e) => updatePrefs({ brightness: Number(e.target.value) })}
          />
          <span>{prefs.brightness}</span>
        </label>
        <label>
          <button
            aria-label="Toggle mute"
            onClick={() => updatePrefs({ volume: prefs.volume ? 0 : 65 })}
          >
            {prefs.volume ? (
              <Volume2 size={20} strokeWidth={1.6} />
            ) : (
              <VolumeX size={20} strokeWidth={1.6} />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={prefs.volume}
            aria-label="Volume"
            onChange={(e) => updatePrefs({ volume: Number(e.target.value) })}
          />
          <span>{prefs.volume}</span>
        </label>
      </div>
      {prefs.focus && (
        <div className="quiet-mode-note">
          <Leaf size={14} />A little quiet. Notifications are tucked away.
        </div>
      )}
      <footer>
        <span>
          <ShieldCheck size={15} />
          On this browser
        </span>
        <IconButton
          label="Open Settings"
          onClick={() => {
            openApp('settings');
            onClose();
          }}
        >
          <Settings2 size={18} />
        </IconButton>
      </footer>
    </section>
  );
}
function SlidersIcon() {
  return <Settings2 size={18} strokeWidth={1.5} />;
}
export function Notifications({ onClose }: { onClose: () => void }) {
  const { notifications, dismissNotification, openApp, prefs, updatePrefs } = useWorkspace();
  return (
    <section className="notification-panel glass-panel" aria-label="Notification center">
      <div className="panel-title">
        <div>
          <Bell size={18} />
          <h2>A little heads-up.</h2>
        </div>
        <IconButton label="Close notifications" onClick={onClose}>
          <X size={16} />
        </IconButton>
      </div>
      <div className="notification-subheading">
        <span>
          {notifications.length
            ? `${notifications.length} ${notifications.length === 1 ? 'notification' : 'notifications'}`
            : 'You’re all caught up'}
        </span>
        <button disabled={!notifications.length} onClick={() => dismissNotification()}>
          Clear all <Check size={12} />
        </button>
      </div>
      <div className="notification-list">
        {notifications.length ? (
          notifications.map((item) => (
            <article key={item.id} className="notification-card">
              <div>
                <AppIcon app={item.app || 'home'} size={23} />
                <strong>
                  {item.app ? item.app.charAt(0).toUpperCase() + item.app.slice(1) : 'Window React'}
                </strong>
                <span>{relativeDate(item.time)}</span>
                <IconButton
                  label={`Dismiss ${item.title}`}
                  onClick={() => dismissNotification(item.id)}
                >
                  <X size={12} />
                </IconButton>
              </div>
              <button
                onClick={() => {
                  if (item.app) {
                    openApp(item.app);
                    onClose();
                  }
                }}
              >
                <h3>{item.title}</h3>
                <p>{item.message}</p>
              </button>
            </article>
          ))
        ) : (
          <div className="notification-empty">
            <BellOff size={41} strokeWidth={1.2} />
            <h3>A lovely little silence.</h3>
            <p>Nothing needs your attention right now.</p>
          </div>
        )}
      </div>
      <footer>
        <span>
          <Moon size={15} />A little less interruption
        </span>
        <button
          className={prefs.focus ? 'active' : ''}
          onClick={() => updatePrefs({ focus: !prefs.focus })}
        >
          {prefs.focus ? 'Focus is on' : 'Turn on focus'}
        </button>
      </footer>
    </section>
  );
}
