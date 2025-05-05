// overview.js
import L from 'leaflet';

/**
 * Adds markers for each camera to the given map instance.
 */
function buildMarkers(map, cameras) {
  cameras.forEach(cam => {
    L.marker([cam.Latitude, cam.Longitude]).addTo(map);
  });
}

/**
 * Initializes the mini overview map inside the gallery grid.
 */
export function initMiniOverview() {
  const miniDiv = document.getElementById('miniOverviewMap');
  if (!miniDiv || miniDiv._leaflet_id) return;
  const cameras = window.visibleCameras || [];
  const view = cameras.length
    ? [cameras[0].Latitude, cameras[0].Longitude]
    : [0, 0];
  const map = L.map(miniDiv, { zoomControl: false, attributionControl: false })
    .setView(view, cameras.length ? 10 : 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
  buildMarkers(map, cameras);
}

/**
 * Sets up the full-screen overview map modal rendering.
 */
export function setupOverviewMaps() {
  const overviewModalEl = document.getElementById('overviewModal');
  if (!overviewModalEl) return;

  overviewModalEl.addEventListener('shown.bs.modal', () => {
    const fullDiv = document.getElementById('overviewMap');
    fullDiv.innerHTML = ''; // reset
    const cameras = window.visibleCameras || [];
    if (!cameras.length) return;
    const map = L.map(fullDiv).fitBounds(
      cameras.map(cam => [cam.Latitude, cam.Longitude])
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    buildMarkers(map, cameras);
  });
}
