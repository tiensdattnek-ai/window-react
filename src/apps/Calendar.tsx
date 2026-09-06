import { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Plus, Trash2, X } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { IconButton } from '../components/Shared';
import { localDate } from '../lib/utils';

export function Calendar({ compact = false }: { compact?: boolean }) {
  const { events, addEvent, removeEvent, notify } = useWorkspace();
  const now = new Date();
  const [month, setMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [selected, setSelected] = useState(localDate(now));
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('09:00');
  const [color, setColor] = useState('#679477');
  const startDay = (month.getDay() + 6) % 7;
  const monthDays = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from(
    { length: 42 },
    (_, index) => new Date(month.getFullYear(), month.getMonth(), index - startDay + 1),
  );
  const selectedEvents = events
    .filter((event) => event.date === selected)
    .sort((a, b) => a.time.localeCompare(b.time));
  const selectedDate = new Date(selected + 'T12:00:00');
  function changeMonth(delta: number) {
    setMonth((date) => new Date(date.getFullYear(), date.getMonth() + delta, 1));
  }
  function goToday() {
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelected(localDate(now));
  }
  return (
    <div className={`calendar-app ${compact ? 'compact-calendar' : ''}`}>
      {!compact && (
        <header className="calendar-header">
          <div>
            <span className="eyebrow muted">MAKE TIME FOR WHAT MATTERS</span>
            <h1>
              A little more present<span>.</span>
            </h1>
            <p>Small plans. Good days. A life that’s yours.</p>
          </div>
          <button className="button secondary small" onClick={goToday}>
            Back to today
          </button>
        </header>
      )}
      <div className="calendar-body">
        <section className="month-calendar">
          <div className="month-heading">
            <h2>{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
            <div>
              <IconButton label="Previous month" onClick={() => changeMonth(-1)}>
                <ChevronLeft size={17} />
              </IconButton>
              <IconButton label="Next month" onClick={() => changeMonth(1)}>
                <ChevronRight size={17} />
              </IconButton>
            </div>
          </div>
          <div className="calendar-weekdays">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
              <span key={index}>{day}</span>
            ))}
          </div>
          <div className="calendar-days">
            {cells.map((date, index) => {
              const value = localDate(date);
              const inMonth = index >= startDay && index < startDay + monthDays;
              return (
                <button
                  key={value}
                  aria-label={date.toLocaleDateString('en-US', { dateStyle: 'full' })}
                  aria-pressed={selected === value}
                  className={`${!inMonth ? 'outside-month' : ''} ${value === selected ? 'selected' : ''} ${value === localDate(now) ? 'today' : ''}`}
                  onClick={() => {
                    setSelected(value);
                    setAdding(false);
                  }}
                >
                  <span>{date.getDate()}</span>
                  {events.some((event) => event.date === value) && <i />}
                </button>
              );
            })}
          </div>
          {!compact && (
            <div className="calendar-quote">
              <CalendarDays size={20} strokeWidth={1.4} />
              <p>
                There is no ordinary day.
                <br />
                <span>Just another chance to make it a good one.</span>
              </p>
            </div>
          )}
        </section>
        <aside className="calendar-agenda">
          <div className="agenda-heading">
            <div>
              <span className="eyebrow muted">
                {selected === localDate(now)
                  ? 'TODAY'
                  : selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()}
              </span>
              <h3>{selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</h3>
            </div>
            <IconButton label="Add calendar event" onClick={() => setAdding(!adding)}>
              {adding ? <X size={17} /> : <Plus size={19} />}
            </IconButton>
          </div>
          {adding && (
            <form
              className="event-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (!title.trim()) return;
                addEvent({ title: title.trim(), date: selected, time, color });
                setTitle('');
                setAdding(false);
                notify(
                  'A little something to look forward to',
                  `“${title.trim()}” has a place in your calendar.`,
                  'calendar',
                );
              }}
            >
              <input
                aria-label="Event title"
                placeholder="Something to look forward to…"
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={90}
                required
              />
              <div>
                <input
                  aria-label="Event time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
                <div className="event-colors">
                  {['#679477', '#ba8c75', '#988ab3'].map((c) => (
                    <button
                      type="button"
                      aria-label={`Event color ${c}`}
                      className={color === c ? 'selected' : ''}
                      style={{ background: c }}
                      key={c}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
              </div>
              <button className="button primary small" type="submit">
                <Plus size={13} />
                Add to your day
              </button>
            </form>
          )}
          <div className="agenda-events">
            {selectedEvents.length
              ? selectedEvents.map((event) => (
                  <div
                    key={event.id}
                    className="agenda-event"
                    style={{ borderLeftColor: event.color }}
                  >
                    <span>
                      <Clock3 size={11} />
                      {event.time}
                    </span>
                    <strong>{event.title}</strong>
                    <IconButton
                      label={`Delete event ${event.title}`}
                      onClick={() => removeEvent(event.id)}
                    >
                      <Trash2 size={13} />
                    </IconButton>
                  </div>
                ))
              : !adding && (
                  <div className="agenda-empty">
                    <span>
                      <CalendarDays size={29} strokeWidth={1.2} />
                    </span>
                    <h4>A little breathing room.</h4>
                    <p>Nothing planned. That’s a possibility, too.</p>
                    <button onClick={() => setAdding(true)}>
                      Make a little plan <Plus size={13} />
                    </button>
                  </div>
                )}
          </div>
          <div className="calendar-local-note">
            <span className="online-dot" />
            Your plans stay in this browser.
          </div>
        </aside>
      </div>
    </div>
  );
}
