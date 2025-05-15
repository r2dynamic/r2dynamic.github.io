// js/geolocation.js

import { computeDistance } from './utils.js';
import { renderGallery, updateCameraCount, showImage } from './gallery.js';
import { updateSelectedFilters, updateURLParameters } from './ui.js';

const geoOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0
};

/**
 * Sort cameras by proximity, then refresh everything exactly like our old monolith did.
 */
function sortAndDisplayByProximity(lat, lng) {
  const sorted = window.camerasList
    .map(cam => ({
      cam,
      distance: computeDistance(lat, lng, cam.Latitude, cam.Longitude)
    }))
    .sort((a, b) => a.distance - b.distance)
    .map(item => item.cam);

  window.visibleCameras = sorted;
  window.currentIndex   = 0;

  updateCameraCount();
  renderGallery(sorted);

  // exactly as before, show the very first image
  if (sorted.length) showImage(0);

  updateSelectedFilters();
  updateURLParameters();
}

/**
 * Wire up the “Nearest Camera” button exactly as in your pre‑modular code,
 * with user‑facing alerts on permission errors.
 */
export function setupNearestCameraButton() {
  const btn = document.getElementById('nearestButton');
  console.log('[geo] setupNearestCameraButton, btn=', btn);
  if (!btn) return console.error('[geo] ❌ nearestButton not found');

  btn.addEventListener('click', () => {
    console.log('[geo] 🔘 nearestButton clicked');
    if (!navigator.geolocation) {
      console.warn('[geo] navigator.geolocation unsupported');
      return alert('Your browser doesn’t support geolocation.');
    }

    console.log('[geo] requestPosition…');
    navigator.geolocation.getCurrentPosition(
      pos => {
        console.log('[geo] ✅ got position:', pos.coords);
        alert(`Got position:\nlat=${pos.coords.latitude}\nlng=${pos.coords.longitude}\naccuracy=${pos.coords.accuracy}m`);
        sortAndDisplayByProximity(pos.coords.latitude, pos.coords.longitude);
      },
      err => {
        console.error('[geo] ❌ error callback:', err);
        alert(`Location error (${err.code}): ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

/**
 * On page load, if they’ve already granted, auto‑sort just like before.
 */
export function autoSortByLocation() {
  if (!navigator.geolocation || !navigator.permissions) return;
  navigator.permissions
    .query({ name: 'geolocation' })
    .then(res => {
      if (res.state === 'granted') {
        navigator.geolocation.getCurrentPosition(
          pos => {
            const { latitude: lat, longitude: lng } = pos.coords;
            sortAndDisplayByProximity(lat, lng);
          },
          () => {/* silent fail */},
          geoOptions
        );
      }
    });
}
