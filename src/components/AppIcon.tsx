import { useId } from 'react';
import type { AppId } from '../lib/types';
import { Cog, CloudSun, Timer, Trash2 } from 'lucide-react';

export function WindowLogo({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="12" height="12" rx="2.3" />
      <rect x="18" y="2" width="12" height="12" rx="2.3" />
      <rect x="2" y="18" width="12" height="12" rx="2.3" />
      <rect x="18" y="18" width="12" height="12" rx="2.3" />
    </svg>
  );
}
const folderColors: Record<string, [string, string, string]> = {
  yellow: ['#e7ad38', '#ffdf80', '#edba50'],
  green: ['#77a591', '#bce0c3', '#80b79a'],
  blue: ['#74a4d5', '#b1d5f4', '#7cafe0'],
  purple: ['#a288c8', '#d5c1ed', '#b096d5'],
  orange: ['#dd936a', '#facaae', '#e8a077'],
};
export function FolderIcon({ size = 42, color = 'yellow' }: { size?: number; color?: string }) {
  const id = useId();
  const colors = folderColors[color] || folderColors.yellow;
  return (
    <svg width={size} height={size} viewBox="0 0 56 52" aria-hidden="true" className="folder-icon">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0.3" y2="1">
          <stop stopColor={colors[1]} />
          <stop offset="1" stopColor={colors[2]} />
        </linearGradient>
      </defs>
      <path d="M5 13a5 5 0 0 1 5-5h12l5 5h19a5 5 0 0 1 5 5v23H5Z" fill={colors[0]} />
      <path d="M7 18h41v25H7z" fill="#fff" opacity=".82" />
      <path
        d="M4 22a4 4 0 0 1 4-4h40a4 4 0 0 1 4 4l-2 21a5 5 0 0 1-5 4H10a5 5 0 0 1-5-4Z"
        fill={`url(#${id})`}
      />
      <path d="M8 19h39" stroke="#fff" strokeOpacity=".6" strokeWidth="1.3" />
    </svg>
  );
}
export function AppIcon({
  app,
  size = 40,
  className = '',
}: {
  app: AppId | 'trash' | 'home';
  size?: number;
  className?: string;
}) {
  const id = useId();
  if (app === 'explorer')
    return (
      <span className={`app-icon ${className}`}>
        <FolderIcon size={size} />
      </span>
    );
  const svgProps = {
    width: size,
    height: size,
    viewBox: '0 0 56 56',
    'aria-hidden': true as const,
  };
  let icon;
  switch (app) {
    case 'home':
      icon = (
        <svg {...svgProps}>
          <defs>
            <linearGradient id={id} x2=".8" y2="1">
              <stop stopColor="#b2d3b1" />
              <stop offset="1" stopColor="#548c72" />
            </linearGradient>
          </defs>
          <path
            d="m7 25 18-17a5 5 0 0 1 6 0l18 17a3 3 0 0 1-2 5h-3v17H12V30H9a3 3 0 0 1-2-5Z"
            fill={`url(#${id})`}
          />
          <rect x="23" y="31" width="10" height="16" rx="2" fill="#e9f2df" />
          <path d="m10 24 18-16 18 16" fill="none" stroke="#d8e9cd" strokeWidth="2" />
        </svg>
      );
      break;
    case 'browser':
      icon = (
        <svg {...svgProps}>
          <defs>
            <linearGradient id={id} x2=".8" y2="1">
              <stop stopColor="#56c5df" />
              <stop offset="1" stopColor="#2976d0" />
            </linearGradient>
            <linearGradient id={`${id}b`} x2=".8" y2="1">
              <stop stopColor="#6fe0b5" />
              <stop offset="1" stopColor="#35a695" />
            </linearGradient>
          </defs>
          <circle cx="28" cy="28" r="23" fill={`url(#${id})`} />
          <path
            d="M6 29C4 14 19 2 33 6c-13 0-23 11-17 23 5 9 22 12 31 3-2 15-18 23-31 14C10 42 7 36 6 29"
            fill={`url(#${id}b)`}
          />
          <path
            d="M18 26c1-13 22-14 29-2 2 3 3 6 2 10-7-9-26-8-27 1-5-2-6-5-4-9Z"
            fill="#adf1db"
            opacity=".8"
          />
          <path
            d="M24 13c-8 5-11 13-7 20"
            fill="none"
            stroke="#e0ffff"
            strokeOpacity=".4"
            strokeWidth="2"
          />
        </svg>
      );
      break;
    case 'notes':
      icon = (
        <svg {...svgProps}>
          <defs>
            <linearGradient id={id} x2=".4" y2="1">
              <stop stopColor="#fff4d7" />
              <stop offset="1" stopColor="#f1d998" />
            </linearGradient>
          </defs>
          <rect x="10" y="6" width="36" height="44" rx="5" fill={`url(#${id})`} />
          <path d="M10 11a5 5 0 0 1 5-5h26a5 5 0 0 1 5 5v5H10Z" fill="#ecb869" />
          <path
            d="M18 24h20M18 31h16M18 38h12"
            stroke="#b99960"
            strokeWidth="2"
            strokeLinecap="round"
            opacity=".7"
          />
          <path d="m35 35 11-15 5 4-11 15-7 4Z" fill="#697f72" />
          <path d="m33 43 2-8 5 4Z" fill="#e8c8a0" />
        </svg>
      );
      break;
    case 'terminal':
      icon = (
        <svg {...svgProps}>
          <defs>
            <linearGradient id={id} x2=".8" y2="1">
              <stop stopColor="#526967" />
              <stop offset="1" stopColor="#203835" />
            </linearGradient>
          </defs>
          <rect x="4" y="8" width="48" height="39" rx="7" fill={`url(#${id})`} />
          <path d="M5 17h46" stroke="#b0c2b7" strokeOpacity=".25" />
          <circle cx="11" cy="13" r="1.5" fill="#c4d4c8" />
          <circle cx="16" cy="13" r="1.5" fill="#c4d4c8" />
          <path
            d="m14 25 7 6-7 6m13 1h12"
            fill="none"
            stroke="#e2f5e4"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
      break;
    case 'music':
      icon = (
        <svg {...svgProps}>
          <defs>
            <linearGradient id={id} x2=".9" y2="1">
              <stop stopColor="#d2b4e8" />
              <stop offset="1" stopColor="#9471ba" />
            </linearGradient>
          </defs>
          <rect x="5" y="5" width="46" height="46" rx="12" fill={`url(#${id})`} />
          <path
            d="M24 35V19l16-4v17M24 24l16-4"
            stroke="#fff7ff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <ellipse cx="19" cy="37" rx="6" ry="4.5" fill="#fff7ff" transform="rotate(-16 19 37)" />
          <ellipse cx="35" cy="34" rx="6" ry="4.5" fill="#fff7ff" transform="rotate(-16 35 34)" />
        </svg>
      );
      break;
    case 'photos':
      icon = (
        <svg {...svgProps}>
          <defs>
            <linearGradient id={id} x2=".8" y2="1">
              <stop stopColor="#fafffa" />
              <stop offset="1" stopColor="#dbe8df" />
            </linearGradient>
          </defs>
          <rect x="5" y="5" width="46" height="46" rx="10" fill={`url(#${id})`} />
          {[
            '#e8b875',
            '#dd997e',
            '#bd8daf',
            '#a2a5cc',
            '#86b9d3',
            '#88baa5',
            '#b1c986',
            '#dec980',
          ].map((color, i) => (
            <ellipse
              key={color}
              cx="28"
              cy="19"
              rx="6.5"
              ry="11"
              fill={color}
              fillOpacity=".9"
              transform={`rotate(${i * 45} 28 28)`}
            />
          ))}
          <circle cx="28" cy="28" r="5" fill="#fff8df" opacity=".8" />
        </svg>
      );
      break;
    case 'settings':
      icon = (
        <svg {...svgProps}>
          <defs>
            <linearGradient id={id} x2=".8" y2="1">
              <stop stopColor="#c7d0d2" />
              <stop offset="1" stopColor="#7c9098" />
            </linearGradient>
          </defs>
          <Cog
            x="4"
            y="4"
            width="48"
            height="48"
            stroke={`url(#${id})`}
            strokeWidth="3"
            fill="#dce3e3"
          />
          <circle cx="28" cy="28" r="8" fill="#6e929b" />
          <circle cx="28" cy="28" r="4.5" fill="#bcdce4" />
        </svg>
      );
      break;
    case 'calculator':
      icon = (
        <svg {...svgProps}>
          <defs>
            <linearGradient id={id} x2=".7" y2="1">
              <stop stopColor="#97b7b6" />
              <stop offset="1" stopColor="#5a8586" />
            </linearGradient>
          </defs>
          <rect x="11" y="4" width="34" height="48" rx="7" fill={`url(#${id})`} />
          <rect x="16" y="10" width="24" height="11" rx="2" fill="#e6f2df" />
          {[0, 1, 2].flatMap((y) =>
            [0, 1, 2].map((x) => (
              <rect
                key={`${y}${x}`}
                x={17 + x * 8}
                y={27 + y * 7}
                width="5"
                height="4"
                rx="1"
                fill={x === 2 ? '#e8cf8e' : '#e2eded'}
              />
            )),
          )}
        </svg>
      );
      break;
    case 'calendar':
      icon = (
        <svg {...svgProps}>
          <rect x="6" y="7" width="44" height="44" rx="7" fill="#fcf5ee" />
          <path d="M6 14a7 7 0 0 1 7-7h30a7 7 0 0 1 7 7v8H6Z" fill="#cf8977" />
          <path d="M17 5v7m22-7v7" stroke="#a26a59" strokeWidth="3" strokeLinecap="round" />
          <text
            x="28"
            y="41"
            textAnchor="middle"
            fontFamily="sans-serif"
            fontWeight="600"
            fontSize="20"
            fill="#66524a"
          >
            {new Date().getDate()}
          </text>
        </svg>
      );
      break;
    case 'weather':
      icon = <CloudSun size={size} fill="#f3d087" stroke="#daac59" strokeWidth={1.7} />;
      break;
    case 'focus':
      icon = (
        <span className="focus-app-glyph" style={{ width: size, height: size }}>
          <Timer size={size * 0.73} strokeWidth={1.8} />
        </span>
      );
      break;
    case 'trash':
      icon = (
        <span className="trash-app-glyph" style={{ width: size, height: size }}>
          <Trash2 size={size * 0.85} strokeWidth={1.4} fill="#e6f4f4" stroke="#97b0b5" />
        </span>
      );
      break;
  }
  return <span className={`app-icon ${className}`}>{icon}</span>;
}
