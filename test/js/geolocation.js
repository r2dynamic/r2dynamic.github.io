// js/geolocation.js
import { computeDistance } from './utils.js';
import { updateCameraCount, renderGallery, showImage } from './gallery.js';
import { updateSelectedFilters, updateURLParameters } from './ui.js';

const nearestButton = document.getElementById('nearestButton');

/**
 * Sets up the 'Nearest Camera' button action.
 */
export function setupNearestCameraButton() {
  if (!nearestButton) return;
  nearestButton.addEventListener('click', () => {
    if (!navigator.geolocation) {
      return alert('Geolocation not supported');
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        localStorage.setItem('locationAllowed', 'true');
        const ulat = pos.coords.latitude;
        const ulng = pos.coords.longitude;

        // build and sort the distance array
        const cw = window.camerasList.map(cam => ({
          camera: cam,
          distance: computeDistance(ulat, ulng, cam.Latitude, cam.Longitude)
        }));
        cw.sort((a, b) => a.distance - b.distance);

        // update globals and UI
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
 */
export function autoSortByLocation() {
  if (!navigator.geolocation) {
    return renderGallery(window.visibleCameras);
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      localStorage.setItem('locationAllowed', 'true');
      const ulat = pos.coords.latitude;
      const ulng = pos.coords.longitude;

      const cw = window.camerasList.map(cam => ({
        camera: cam,
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
    _err => renderGallery(window.visibleCameras)
  );
}