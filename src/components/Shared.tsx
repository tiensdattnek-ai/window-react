import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { X, Search, Check, Leaf } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';

export function IconButton({
  label,
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      className={`icon-button ${className}`}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
}
export function SearchBox({
  value,
  onChange,
  placeholder = 'Search',
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`search-box ${className}`}>
      <Search size={15} />
      <input
        aria-label={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <IconButton label="Clear search" onClick={() => onChange('')}>
          <X size={13} />
        </IconButton>
      )}
    </div>
  );
}
export function EmptyState({
  icon,
  title,
  description,
  children,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon || <Leaf size={32} strokeWidth={1.3} />}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className={`toggle ${checked ? 'on' : ''}`}
      role="switch"
      aria-label={label}
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}
export function Dialog() {
  const { dialog, closeDialog } = useWorkspace();
  const [value, setValue] = useState('');
  const panel = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!dialog) return;
    setValue(dialog.initialValue || '');
    const previous = document.activeElement as HTMLElement;
    const timer = setTimeout(() => {
      const input = panel.current?.querySelector('input');
      if (input) {
        input.focus();
        input.select();
      } else panel.current?.querySelector('button')?.focus();
    }, 30);
    const listener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeDialog();
      }
      if (e.key === 'Tab') {
        const elements = panel.current?.querySelectorAll<HTMLElement>('button, input');
        if (!elements?.length) return;
        if (e.shiftKey && document.activeElement === elements[0]) {
          e.preventDefault();
          elements[elements.length - 1].focus();
        } else if (!e.shiftKey && document.activeElement === elements[elements.length - 1]) {
          e.preventDefault();
          elements[0].focus();
        }
      }
    };
    document.addEventListener('keydown', listener, true);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', listener, true);
      previous?.focus();
    };
  }, [dialog]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!dialog) return null;
  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeDialog();
      }}
    >
      <form
        ref={panel}
        className="dialog-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onSubmit={(e) => {
          e.preventDefault();
          if (dialog.input && !value.trim()) return;
          const callback = dialog.onConfirm;
          closeDialog();
          callback(value.trim());
        }}
      >
        <div className="dialog-heading">
          <span className={`dialog-symbol ${dialog.danger ? 'danger' : ''}`}>
            <Leaf size={23} />
          </span>
          <IconButton label="Close dialog" onClick={closeDialog}>
            <X size={18} />
          </IconButton>
        </div>
        <h2 id="dialog-title">{dialog.title}</h2>
        {dialog.message && <p>{dialog.message}</p>}
        {dialog.input && (
          <input
            className="text-input"
            aria-label={dialog.title}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={120}
            required
          />
        )}
        <div className="dialog-actions">
          <button type="button" className="button secondary" onClick={closeDialog}>
            Cancel
          </button>
          <button
            className={`button ${dialog.danger ? 'danger-button' : 'primary'}`}
            disabled={dialog.input && !value.trim()}
          >
            {dialog.confirmLabel || 'Confirm'}
            <Check size={14} />
          </button>
        </div>
      </form>
    </div>
  );
}
