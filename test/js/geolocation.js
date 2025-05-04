// geolocation.js
import { computeDistance } from './utils.js';

const nearestButton = document.getElementById('nearestButton');

/**
 * Sets up the 'Nearest Camera' button action.
 */
export function setupNearestCameraButton() {
  if (!nearestButton) return;
  nearestButton.addEventListener('click', () => {
    if (!navigator.geolocation) return alert('Geolocation not supported');
    navigator.geolocation.getCurrentPosition(
      pos => {
        localStorage.setItem('locationAllowed', 'true');
        const ulat = pos.coords.latitude, ulng = pos.coords.longitude;
        const cw   = camerasList.map(cam => ({
          camera: cam,
          distance: computeDistance(ulat, ulng, cam.Latitude, cam.Longitude)
        }));
        cw.sort((a, b) => a.distance - b.distance);
        visibleCameras = cw.map(item => item.camera);
        updateCameraCount();
        renderGallery(visibleCameras);
        currentIndex = 0;
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
  if (!navigator.geolocation) return renderGallery(visibleCameras);
  navigator.geolocation.getCurrentPosition(
    pos => {
      localStorage.setItem('locationAllowed', 'true');
      const ulat = pos.coords.latitude, ulng = pos.coords.longitude;
      const cw   = camerasList.map(cam => ({
        camera: cam,
        distance: computeDistance(ulat, ulng, cam.Latitude, cam.Longitude)
      }));
      cw.sort((a, b) => a.distance - b.distance);
      visibleCameras = cw.map(item => item.camera);
      updateCameraCount();
      renderGallery(visibleCameras);
      currentIndex = 0;
      updateSelectedFilters();
      updateURLParameters();
    },
    err => renderGallery(visibleCameras)
  );
}
