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
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      return alert('Geolocation not supported in this browser.');
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        sortAndDisplayByProximity(lat, lng);
      },
      err => alert('Location error: ' + err.message),
      geoOptions
    );
  });
}


export function autoSortByLocation() {
  // if the browser supports Permissions API…
  if (navigator.permissions) {
    navigator.permissions
      .query({ name: 'geolocation' })
      .then(result => {
        // only if the user has ALREADY granted permission…
        if (result.state === 'granted') {
          navigator.geolocation.getCurrentPosition(
            pos => {
              const { latitude: lat, longitude: lng } = pos.coords;
              sortAndDisplayByProximity(lat, lng);
            },
            () => { /* silently fail—no UI or prompt */ },
            geoOptions
          );
        }
        // if state is "prompt" or "denied", do nothing (no prompt)
      })
      .catch(() => {
        // Permissions API not supported — leave it alone
      });
  }
}
