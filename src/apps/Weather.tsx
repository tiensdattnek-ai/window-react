import { useState } from 'react';
import {
  Cloud,
  CloudDrizzle,
  CloudLightning,
  CloudRain,
  CloudSun,
  Droplets,
  MapPin,
  RefreshCw,
  Search,
  Snowflake,
  Sun,
  Sunrise,
  Sunset,
  Thermometer,
  Wind,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { EmptyState, IconButton } from '../components/Shared';
import { weatherLabel } from '../lib/utils';

export function WeatherIcon({
  code = 2,
  size = 28,
  className = '',
}: {
  code?: number;
  size?: number;
  className?: string;
}) {
  const Icon =
    code === 0
      ? Sun
      : code <= 3
        ? CloudSun
        : code <= 48
          ? Cloud
          : code <= 57
            ? CloudDrizzle
            : code <= 67
              ? CloudRain
              : code <= 77
                ? Snowflake
                : code <= 82
                  ? CloudRain
                  : code <= 86
                    ? Snowflake
                    : CloudLightning;
  return <Icon size={size} className={className} strokeWidth={1.4} />;
}
export function Weather() {
  const { prefs, weather, weatherLoading, weatherError, updatePrefs, refreshWeather } =
    useWorkspace();
  const [city, setCity] = useState(prefs.city);
  const current = weather?.current;
  const clockTime = (value: string) => value.split('T')[1]?.slice(0, 5) || '—';
  return (
    <div className="weather-app">
      <header className="weather-topbar">
        <span>
          <CloudSun size={20} />A little look outside.
        </span>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (city.trim()) {
              if (city.trim() === prefs.city) refreshWeather();
              else updatePrefs({ city: city.trim() });
            }
          }}
        >
          <Search size={15} />
          <input
            aria-label="Weather city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Find a city"
            maxLength={80}
            required
          />
          <button aria-label="Search weather" type="submit">
            <MapPin size={15} />
          </button>
        </form>
        <IconButton label="Refresh weather" onClick={refreshWeather}>
          <RefreshCw size={16} className={weatherLoading ? 'spinning' : ''} />
        </IconButton>
      </header>
      {weatherLoading && !weather ? (
        <div className="weather-loading">
          <CloudSun size={74} strokeWidth={1} />
          <h2>Looking at the sky…</h2>
          <p>Finding a little perspective in {prefs.city}.</p>
        </div>
      ) : weatherError || !current || !weather ? (
        <EmptyState
          icon={<Cloud size={58} strokeWidth={1} />}
          title="The sky’s a little out of reach."
          description={weatherError || 'Live weather is unavailable right now.'}
        >
          <button className="button primary" onClick={refreshWeather}>
            <RefreshCw size={14} />
            Take another look
          </button>
          <small className="weather-offline-note">
            Your other apps still work. Weather needs an internet connection.
          </small>
        </EmptyState>
      ) : (
        <main className="weather-main">
          <section className="weather-current">
            <div className="weather-location">
              <span>
                <MapPin size={15} />
                {weather.city}, {weather.country}
              </span>
              <small>LIVE WEATHER · OPEN-METEO</small>
            </div>
            <div className="weather-temperature">
              <div>
                <strong>
                  {Math.round(current.temperature_2m)}
                  <span>°</span>
                </strong>
                <div>
                  <h2>{weatherLabel(current.weather_code)}</h2>
                  <p>
                    Feels like {Math.round(current.apparent_temperature)}° · H:{' '}
                    {Math.round(weather.daily.temperature_2m_max[0])}° L:{' '}
                    {Math.round(weather.daily.temperature_2m_min[0])}°
                  </p>
                </div>
              </div>
              <WeatherIcon code={current.weather_code} size={106} />
            </div>
            <p className="weather-mood">
              {current.weather_code <= 3
                ? 'A good day to find a little sunshine.'
                : current.weather_code <= 48
                  ? 'Even a quiet sky has a story to tell.'
                  : 'A lovely excuse to get a little cozy.'}
            </p>
          </section>
          <div className="weather-stats">
            <div>
              <Wind size={21} />
              <span>
                Wind
                <strong>
                  {current.wind_speed_10m} <small>km/h</small>
                </strong>
              </span>
            </div>
            <div>
              <Droplets size={21} />
              <span>
                Humidity
                <strong>
                  {current.relative_humidity_2m}
                  <small>%</small>
                </strong>
              </span>
            </div>
            <div>
              <Sunrise size={21} />
              <span>
                Sunrise<strong>{clockTime(weather.daily.sunrise[0])}</strong>
              </span>
            </div>
            <div>
              <Sunset size={21} />
              <span>
                Sunset<strong>{clockTime(weather.daily.sunset[0])}</strong>
              </span>
            </div>
          </div>
          <section className="weather-forecast">
            <h3>
              <Thermometer size={15} />A little further ahead
            </h3>
            <div className="forecast-days">
              {weather.daily.time.map((day, index) => (
                <div key={day}>
                  <strong>
                    {index === 0
                      ? 'Today'
                      : new Date(day + 'T12:00:00').toLocaleDateString('en-US', {
                          weekday: 'short',
                        })}
                  </strong>
                  <WeatherIcon code={weather.daily.weather_code[index]} size={27} />
                  <span>
                    {Math.round(weather.daily.temperature_2m_max[index])}°{' '}
                    <small>{Math.round(weather.daily.temperature_2m_min[index])}°</small>
                  </span>
                  <small>
                    <Droplets size={10} />
                    {weather.daily.precipitation_probability_max[index]}%
                  </small>
                </div>
              ))}
            </div>
          </section>
          <footer>
            Weather data by{' '}
            <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
              Open-Meteo
            </a>
            <span>All times local to {weather.city}. A forecast, not a promise.</span>
          </footer>
        </main>
      )}
    </div>
  );
}
