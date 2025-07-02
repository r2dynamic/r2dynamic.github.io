// js/otherFilters.js

import { refreshGallery } from './ui.js';
import { clearNearestCamerasMode } from './geolocation.js';

/** ─── Global Weather Settings (shared across all filters) ───── */
const WEATHER_SETTINGS = {
  timezone:        'America/Denver',
  temperatureUnit: 'fahrenheit',
  windspeedUnit:   'mph'
};

/**
 * Fetch current temperature (°F) from Open-Meteo for given lat/lon.
 */
async function fetchCurrentTemp(lat, lon) {
  const { timezone, temperatureUnit, windspeedUnit } = WEATHER_SETTINGS;
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude',          lat);
  url.searchParams.set('longitude',         lon);
  url.searchParams.set('current_weather',  'true');
  url.searchParams.set('temperature_unit', temperatureUnit);
  url.searchParams.set('windspeed_unit',   windspeedUnit);
  url.searchParams.set('timezone',         timezone);

  const resp = await fetch(url);
  const data = await resp.json();
  const temp = data.current_weather?.temperature;
  return temp != null ? Math.round(temp) : '–';
}

/**
 * Build a Windy.com embed URL from params.
 */
function buildWindyUrl(params) {
  const q = new URLSearchParams({
    type:        'map',
    location:    'coordinates',
    metricRain:  'default',
    metricTemp:  'default',
    metricWind:  'default',
    zoom:        params.zoom,
    overlay:     params.overlay,
    product:     params.product,
    level:       params.level,
    lat:         params.lat,
    lon:         params.lon,
    ...(params.detailLat  !== undefined ? { detailLat:  params.detailLat }  : {}),
    ...(params.detailLon  !== undefined ? { detailLon:  params.detailLon }  : {}),
    ...(params.marker      ? { marker: 'true' } : {})
  });
  return `https://embed.windy.com/embed.html?${q}`;
}

/**
 * Configuration for "Other Filters".
 */
export const otherFiltersConfig = [
  {
    name: 'Inactive Cameras',
    loader: () => {
      const all = Array.isArray(window.camerasList) ? window.camerasList : [];
      return all.filter(cam =>
        Array.isArray(cam.Views) &&
        String(cam.Views[0].Status).toLowerCase() === 'disabled'
      );
    }
  },
  {
    name: 'Idaho Cameras',
    loader: async () => {
      try {
        const res  = await fetch('IdahoCameras.json');
        const json = await res.json();
        return Array.isArray(json.CamerasList) ? json.CamerasList : [];
      } catch (err) {
        console.error('Error loading IdahoCameras.json', err);
        return [];
      }
    }
    // no forecastLoader or windyParams here
  },
  {
    name: 'Zions Cameras',
    loader: async () => {
      try {
        const res  = await fetch('ZionCameras.json');
        const json = await res.json();
        return Array.isArray(json.CamerasList) ? json.CamerasList : [];
      } catch (err) {
        console.error('Error loading ZionCameras.json', err);
        return [];
      }
    },
    // 1) preview shows current temp & opens modal
    forecastLoader: async () => {
      const temp = await fetchCurrentTemp(37.108, -113.024);
      return `
        <button type="button"
                class="forecast-preview"
                data-bs-toggle="modal"
                data-bs-target="#weatherModal">
          <i class="fas fa-cloud-sun fa-2x text-white"></i>
          <div class="temp-preview">${temp}°F</div>
          <div class="label-preview">Click for map</div>
        </button>`;
    },
    // 2) define the Windy embed params for this filter
    windyParams: {
      zoom:      11,
      overlay:   'radar',
      product:   'radar',
      level:     'surface',
      lat:       37.166,
      lon:      -113.017,
      detailLat: 37.67982035083307,
      detailLon: -112.46228775089216,
      message:   true,
      marker:    true
    }
  },
  {
    name: 'Lake Powell Cameras',
    loader: async () => {
      try {
        const res  = await fetch('PowellCameras.json');
        const json = await res.json();
        return Array.isArray(json.CamerasList) ? json.CamerasList : [];
      } catch (err) {
        console.error('Error loading ZionCameras.json', err);
        return [];
      }
    },
    // 1) preview shows current temp & opens modal
    forecastLoader: async () => {
      const temp = await fetchCurrentTemp(37.0365, -111.3533);
      return `
        <button type="button"
                class="forecast-preview"
                data-bs-toggle="modal"
                data-bs-target="#weatherModal">
          <i class="fas fa-cloud-sun fa-2x text-white"></i>
          <div class="temp-preview">${temp}°F</div>
          <div class="label-preview">Click for map</div>
        </button>`;
    },
    // 2) define the Windy embed params for this filter
    windyParams: {
      zoom:      11,
      overlay:   'radar',
      product:   'radar',
      level:     'surface',
      lat:       37.057,
      lon:       -111.358,
      message:   true,
      marker:    true
    }
  }
];

/**
 * Renders the “Other Filters” dropdown menu.
 */
export function renderOtherFiltersMenu(rootEl) {
  rootEl.innerHTML = otherFiltersConfig
    .map(cfg => `
      <li>
        <a class="dropdown-item" href="#" data-value="${cfg.name}">
          ${cfg.name}
        </a>
      </li>
    `).join('');
}

/**
 * Applies the selected “Other Filter”:
 * 1) load cameras via cfg.loader()
 * 2) if cfg.forecastLoader exists, await it & prepend that tile
 * 3) append each camera as {type:'camera',camera}
 * 4) refreshGallery(items)
 * 5) if cfg.windyParams exists, update the modal's iframe src
 */
export async function applyOtherFilter(name) {
  const cfg = otherFiltersConfig.find(f => f.name === name);
  if (!cfg) {
    console.warn(`No Other Filter configured for “${name}”`);
    return;
  }

  // clear any previous "nearest cameras" state so context is correct
  clearNearestCamerasMode();

  // 1) load cameras
  const cameraList = await cfg.loader();

  // 2) build mixed items
  const items = [];
  if (typeof cfg.forecastLoader === 'function') {
    const html = await cfg.forecastLoader();
    if (html) items.push({ type: 'forecast', html });
  }
  cameraList.forEach(cam => items.push({ type: 'camera', camera: cam }));

  // 3) redraw gallery
  refreshGallery(items);

  // 4) update the Windy.com iframe in your #weatherModal
  if (cfg.windyParams) {
    const iframe = document.querySelector('#weatherModal iframe');
    if (iframe) {
      iframe.src = buildWindyUrl(cfg.windyParams);
    }
  }
}
