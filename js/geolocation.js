// js/geolocation.js

import { computeDistance } from './utils.js';
import { renderGallery, updateCameraCount, showImage } from './gallery.js';
import { updateSelectedFilters, updateURLParameters } from './ui.js';

const geoOptions = {
  enableHighAccuracy: true,
  timeout: 5000,
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


function getAndSort() {
  navigator.geolocation.getCurrentPosition(
    pos => sortAndDisplayByProximity(pos.coords.latitude, pos.coords.longitude),
    () => {/* fail silently */},
    geoOptions
  );
}

export function autoSortByLocation() {
  // 1) If Permissions API works, use it
  if (navigator.permissions?.query) {
    navigator.permissions
      .query({ name: 'geolocation' })
      .then(result => {
        if (result.state === 'granted') {
          getAndSort();
        } 
        // else prompt/denied: do nothing (no auto‑prompt)
      })
      .catch(() => {
        // 2) If .query() rejects, fallback to your flag
        if (localStorage.getItem('locationAllowed') === 'true') {
          getAndSort();
        }
      });
  } 
  // 3) If Permissions API missing (e.g. iOS Safari),
  //    rely solely on your stored flag:
  else if (localStorage.getItem('locationAllowed') === 'true') {
    getAndSort();
  }
}
