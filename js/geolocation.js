// geolocation.js (50 nearest, clears on other filter, exposes clearNearestCamerasMode)
import { computeDistance } from './utils.js';
import { renderGallery, updateCameraCount, showImage } from './gallery.js';
import { updateSelectedFilters, updateURLParameters } from './ui.js';

/**
 * Geolocation options.
 */
const geoOptions = {
  enableHighAccuracy: true,
  timeout:        5000,
  maximumAge:     0
};

/**
 * Sort all cameras by distance to given lat/lng.
 * @param {number} lat
 * @param {number} lng
 * @returns {Array} Sorted cameras with distance property
 */
function getCamerasSortedByProximity(lat, lng) {
  return window.camerasList
    .map(cam => ({
      cam,
      distance: computeDistance(lat, lng, cam.Latitude, cam.Longitude)
    }))
    .sort((a, b) => a.distance - b.distance)
    .map(x => x.cam);
}

/**
 * Activates the "Nearest Cameras" mode:
 *  - Sets nearest filter state
 *  - Clears all other filters
 *  - Sets visibleCameras to top 50 nearest
 *  - Renders gallery and updates badges
 */
function activateNearestCamerasMode(lat, lng) {
  window.isNearestFilterActive = true;
  window.nearestUserLocation = { lat, lng };

  // Clear all other filters so only nearest is active
  window.selectedRegion = '';
  window.selectedCounty = '';
  window.selectedCity = '';
  window.selectedMaintenanceStation = '';
  window.selectedRoute = 'All';
  window.selectedOtherFilter = '';
  window.searchQuery = '';

  // Sort and select top 50 cameras
  const sorted = getCamerasSortedByProximity(lat, lng);
  window.visibleCameras = sorted.slice(0, 50);
  window.currentIndex = 0;

  // Update everything
  updateCameraCount();
  renderGallery(window.visibleCameras);
  updateSelectedFilters();
  updateURLParameters();
}

/**
 * Clears "Nearest Cameras" mode:
 *  - Resets related flags and location
 *  - (Does NOT trigger gallery update; handled elsewhere)
 */
export function clearNearestCamerasMode() {
  window.isNearestFilterActive = false;
  window.nearestUserLocation = null;
}

/**
 * Set up the Nearest Camera Button click event.
 * When clicked, uses Geolocation, activates nearest mode, and shows nearest cameras.
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
        // Persist permission
        localStorage.setItem('locationAllowed', 'true');
        // Activate nearest filter mode
        activateNearestCamerasMode(pos.coords.latitude, pos.coords.longitude);
      },
      err => alert('Location error: ' + err.message),
      geoOptions
    );
  });
}

/**
 * Automatically activates "Nearest Cameras" mode on app load if:
 *  1. No URL filters are present,
 *  2. User previously allowed geolocation.
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
      activateNearestCamerasMode(pos.coords.latitude, pos.coords.longitude);
    },
    err => {
      console.warn('Auto-sort failed:', err);
      // Fail silently
    },
    geoOptions
  );
}
