// geolocation.js

import { computeDistance } from './utils.js';
import { renderGallery, updateCameraCount } from './gallery.js';
import { updateSelectedFilters, updateURLParameters } from './ui.js';

/**
 * Sort cameras by proximity to the given coordinates and refresh UI.
 */
function sortAndDisplayByProximity(lat, lng) {
  const sortedCams = window.camerasList
    .map(cam => ({
      cam,
      distance: computeDistance(lat, lng, cam.Latitude, cam.Longitude)
    }))
    .sort((a, b) => a.distance - b.distance)
    .map(item => item.cam);

  window.visibleCameras = sortedCams;
  updateCameraCount();
  renderGallery(sortedCams);
  window.currentIndex = 0;
  updateSelectedFilters();
  updateURLParameters();
}

/**
 * Initialize the "Nearest Camera" button to sort on user click.
 */
export function setupNearestCameraButton() {
  const btn = document.getElementById('nearestButton');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported in this browser.');
      return;
    }
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej)
      );
      const { latitude: lat, longitude: lng } = pos.coords;
      sortAndDisplayByProximity(lat, lng);
    } catch (err) {
      console.warn('Error obtaining geolocation:', err);
    }
  });
}

/**
 * Automatically sort cameras by location if permission was previously granted.
 */
export function autoSortByLocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      sortAndDisplayByProximity(lat, lng);
    },
    err => {
      console.warn('Auto-sort geolocation error:', err);
    }
  );
}
