// js/geolocation.js
import { computeDistance } from './utils.js';
import { updateCameraCount, renderGallery, showImage } from './gallery.js';
import { updateSelectedFilters, updateURLParameters } from './ui.js';

/**
 * Sets up the 'Nearest Camera' button action.
 * Moves the DOM lookup inside the setup function so we always bind correctly.
 */
export function setupNearestCameraButton() {
  const nearestButton = document.getElementById('nearestButton');
  if (!nearestButton) return;

  nearestButton.addEventListener('click', () => {
    if (!navigator.geolocation) {
      return alert('Geolocation not supported');
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        localStorage.setItem('locationAllowed', 'true');
        const { latitude: ulat, longitude: ulng } = pos.coords;

        // Build and sort the distance array
        const cw = window.camerasList.map(cam => ({
          camera:  cam,
          distance: computeDistance(ulat, ulng, cam.Latitude, cam.Longitude)
        }));
        cw.sort((a, b) => a.distance - b.distance);

        // Update globals and UI
        window.visibleCameras = cw.map(item => item.camera);
        updateCameraCount();
        renderGallery(window.visibleCameras);
        window.currentIndex = 0;
        showImage(0);
        updateSelectedFilters();
        updateURLParameters();
      },
      err => alert('Location error: ' + err.message)
    );
  });
}

/**
 * Auto-sorts the gallery by proximity on load if permitted.
 * Only runs when no other filters/search have been applied.
 */
export function autoSortByLocation() {
  // If any filter or search is active, just render the current visibleCameras
  const hasFilter =
    window.selectedRegion ||
    window.selectedCounty ||
    window.selectedCity ||
    window.selectedMaintenanceStation ||
    (window.selectedRoute && window.selectedRoute !== 'All') ||
    window.searchQuery;
  if (hasFilter) {
    renderGallery(window.visibleCameras);
    return;
  }

  if (!navigator.geolocation) {
    return renderGallery(window.visibleCameras);
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      localStorage.setItem('locationAllowed', 'true');
      const { latitude: ulat, longitude: ulng } = pos.coords;

      const cw = window.camerasList.map(cam => ({
        camera:  cam,
        distance: computeDistance(ulat, ulng, cam.Latitude, cam.Longitude)
      }));
      cw.sort((a, b) => a.distance - b.distance);

      window.visibleCameras = cw.map(item => item.camera);
      updateCameraCount();
      renderGallery(window.visibleCameras);
      window.currentIndex = 0;
      updateSelectedFilters();
      updateURLParameters();
    },
    // If location fails, just render what’s already visible
    () => renderGallery(window.visibleCameras)
  );
}
