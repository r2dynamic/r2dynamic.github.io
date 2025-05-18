// js/geolocation.js
import { computeDistance } from './utils.js';
import { renderGallery, updateCameraCount, showImage } from './gallery.js';
import { updateSelectedFilters, updateURLParameters } from './ui.js';

const geoOptions = {
  enableHighAccuracy: true,
  timeout:        5000,
  maximumAge:     0
};

/** shared helper from before */
function sortAndDisplayByProximity(lat, lng) {
  const sorted = window.camerasList
    .map(cam => ({ cam, distance: computeDistance(lat, lng, cam.Latitude, cam.Longitude) }))
    .sort((a, b) => a.distance - b.distance)
    .map(x => x.cam);

  window.visibleCameras = sorted;
  window.currentIndex   = 0;

  updateCameraCount();
  renderGallery(sorted);

  if (sorted.length) showImage(0);
  updateSelectedFilters();
  updateURLParameters();
}

/** exactly as before—sets the “allowed” flag on success */
export function setupNearestCameraButton() {
  const btn = document.getElementById('nearestButton');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      return alert('Geolocation not supported in this browser.');
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        localStorage.setItem('locationAllowed', 'true');
        sortAndDisplayByProximity(pos.coords.latitude, pos.coords.longitude);
      },
      err => alert('Location error: ' + err.message),
      geoOptions
    );
  });
}

/**
 * Only auto-sort if:
 *  1. No URL filters are present (you already handle that in main.js),
 *  2. And the user has previously clicked “Nearest Camera” (flag is true).
 */
export function autoSortByLocation() {
  if (localStorage.getItem('locationAllowed') !== 'true') {
    // never prompt on load
    return;
  }
  if (!navigator.geolocation) {
    console.warn('Geolocation unsupported');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      sortAndDisplayByProximity(pos.coords.latitude, pos.coords.longitude);
    },
    err => {
      console.warn('Auto-sort failed:', err);
      // but fail silently—no alert
    },
    geoOptions
  );
}
