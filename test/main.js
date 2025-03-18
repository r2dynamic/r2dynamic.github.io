// main.js
// Main module that imports data fetching functions, constants, and handles UI and events

import { getCamerasList, getCuratedRoutes } from './cameraData.js';
import { cityFullNames, regionCities } from './cityList.js';

// --- Constants ---
const DEBOUNCE_DELAY = 300;
const MIN_IMAGE_SIZE = 80; // Enforced minimum grid image size

// --- Global Variables ---
let camerasList = [];
let curatedRoutes = [];
let visibleCameras = [];
let currentIndex = 0;
let debounceTimer;
let selectedCity = "";
let selectedRegion = "";
let searchQuery = "";
let selectedRoute = "All";

// --- Initialize Function ---
// Loads data immediately.
function initialize() {
  getCamerasList()
    .then(data => {
      camerasList = data;
      visibleCameras = camerasList.slice();
      renderGallery(visibleCameras);
      updateCameraCount();
      updateCityDropdown();
      populateRegionDropdown();
    })
    .catch(err => console.error("Error loading cameras:", err));

  getCuratedRoutes()
    .then(routes => {
      curatedRoutes = routes;
      updateRouteOptions();
    })
    .catch(err => console.error("Error loading curated routes:", err));
}

// Function to refresh only image URLs without resetting filters
function refreshCurrentImages() {
  document.querySelectorAll("#imageGallery img").forEach(img => {
    const src = img.src;
    img.src = "";
    img.src = src;
  });
}

// Function to reset the grid to the user's initial default view
function resetFilters() {
  if (localStorage.getItem('locationAllowed') === 'true') {
    autoSortByLocation(); // Restore filtered grid based on location
  } else {
    visibleCameras = camerasList.slice(); // Restore default JSON order
    renderGallery(visibleCameras);
    updateCameraCount();
  }
  updateSelectedFilters();
}

// --- Refresh Button Feature ---
function setupRefreshButton() {
  if (refreshButton) {
    refreshButton.addEventListener("click", () => {
      refreshCurrentImages();
    });
  }
}

// --- Main Initialization & Splash Setup ---
document.addEventListener('DOMContentLoaded', () => {
  initialize();
  setupNearestCameraButton();
  setupRefreshButton();

  if (localStorage.getItem('locationAllowed') === 'true') {
    autoSortByLocation();
  } else if (navigator.permissions) {
    navigator.permissions.query({ name: 'geolocation' }).then((result) => {
      if (result.state === 'granted') {
        autoSortByLocation();
      }
    });
  }

  const splash = document.getElementById('splashScreen');
  if (splash) {
    const videos = splash.querySelectorAll('video');
    videos.forEach(video => {
      video.addEventListener('playing', () => {
        setTimeout(fadeOutSplash, 2500);
      });
    });
  }
  setTimeout(() => {
    const splash = document.getElementById('splashScreen');
    if (splash && splash.style.display !== 'none') {
      fadeOutSplash();
    }
  }, 5000);
});
