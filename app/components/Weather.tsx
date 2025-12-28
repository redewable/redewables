'use client';

import { useEffect, useState } from 'react';

export default function Weather() {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    const fetchWeather = () => {
      const lat = 32.75;
      const lon = -99.90;
      
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,shortwave_radiation,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America/Chicago`)
        .then(res => {
          if (!res.ok) throw new Error('API error');
          return res.json();
        })
        .then(data => {
          console.log('Weather data:', data);
          setWeather(data.current);
          setLastUpdated(new Date().toLocaleTimeString());
          setLoading(false);
        })
        .catch(err => {
          console.error('Weather fetch error:', err);
          setError(err.message);
          setLoading(false);
        });
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 60000);
    return () => clearInterval(interval);
  }, []);

  const getWindDirection = (degrees: number) => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return `${directions[index]} (${Math.round(degrees)}°)`;
  };

  if (loading) return <div className="weather-loading">Loading site conditions...</div>;
  if (error) return <div className="weather-loading">Weather unavailable</div>;
  if (!weather) return null;

  return (
    <div className="weather-widget">
      <div className="weather-title">SITE CONDITIONS</div>
      <div className="weather-grid">
        <div className="weather-item">
          <span className="weather-label">Temperature</span>
          <span className="weather-value">{Math.round(weather.temperature_2m)} °F</span>
        </div>
        <div className="weather-item">
          <span className="weather-label">Solar Irradiance</span>
          <span className="weather-value">{Math.round(weather.shortwave_radiation)} W/m²</span>
        </div>
        <div className="weather-item">
          <span className="weather-label">Wind Speed</span>
          <span className="weather-value">{Math.round(weather.wind_speed_10m)} mph</span>
        </div>
        <div className="weather-item">
          <span className="weather-label">Humidity</span>
          <span className="weather-value">{Math.round(weather.relative_humidity_2m)}%</span>
        </div>
        <div className="weather-item">
          <span className="weather-label">Wind Direction</span>
          <span className="weather-value">{getWindDirection(weather.wind_direction_10m)}</span>
        </div>
        <div className="weather-item">
          <span className="weather-label">Last Updated</span>
          <span className="weather-value">{lastUpdated}</span>
        </div>
      </div>
    </div>
  );
}