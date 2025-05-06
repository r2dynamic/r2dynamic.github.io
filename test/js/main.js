// js/main.js
// Entry point: orchestrates module imports and initializes the app

import { loadCameras, loadRoutes } from './dataLoader.js';
import { filterImages } from './filters.js';
import {
  updateRegionDropdown,
  updateCountyDropdown,
  updateCityDropdown,
  updateMaintenanceStationDropdown,
  updateRouteOptions
} from './dropdowns.js';
import { renderGallery } from './gallery.js';
import {
  setupModalMapToggle,
  setupModalCleanup,
  setupLongPressShare
} from './modal.js';
import { setupOverviewModal } from './modal.js';
import { setupNearestCameraButton, autoSortByLocation } from './geolocation.js';
import {
  setupSearchListener,
  setupRefreshButton,
  setupSizeSlider,
  setupDropdownHide,
  setupModalLinks
} from './events.js';
import {
  revealMainContent,
  fadeOutSplash,
  updateURLParameters,
  updateSelectedFilters,
  resetFilters,
  applyFiltersFromURL
} from './ui.js';

// --- Global State ---
window.selectedRegion = '';
window.selectedCounty = '';
window.selectedCity = '';
window.selectedMaintenanceStation = '';
window.selectedRoute = 'All';
window.selectedOtherFilter = '';
window.searchQuery = '';

window.camerasList = [];
window.curatedRoutes = [];
window.visibleCameras = [];
window.currentIndex = 0;

// Expose core functions on window
window.filterImages = filterImages;
window.updateRegionDropdown = updateRegionDropdown;
window.updateCountyDropdown = updateCountyDropdown;
window.updateCityDropdown = updateCityDropdown;
window.updateMaintenanceStationDropdown = updateMaintenanceStationDropdown;
window.updateRouteOptions = updateRouteOptions;

window.revealMainContent = revealMainContent;
window.fadeOutSplash = fadeOutSplash;
window.updateURLParameters = updateURLParameters;
window.updateSelectedFilters = updateSelectedFilters;
window.resetFilters = resetFilters;
window.applyFiltersFromURL = applyFiltersFromURL;

/**
 * Initializes cameras and routes, then sets up the Other Filters submenu.
 */
async function initializeApp() {
  // fire the location prompt/sort behind the splash
  autoSortByLocation();

  try {
    window.camerasList = await loadCameras();
    window.visibleCameras = [...window.camerasList];
    filterImages();
    updateRegionDropdown();
    updateCountyDropdown();
    updateCityDropdown();
    updateMaintenanceStationDropdown();
  } catch (err) {
    console.error('Error loading cameras:', err);
  }

  try {
    window.curatedRoutes = await loadRoutes();
    updateRouteOptions();
  } catch (err) {
    console.error('Error loading routes:', err);
  } finally {
    // Setup "Other Filters" submenu interactions
    document.querySelectorAll('#otherFiltersMenu .dropdown-item').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        window.selectedOtherFilter = a.dataset.value;
        bootstrap.Collapse.getOrCreateInstance(
          document.getElementById('otherFiltersOptions')
        ).hide();
        filterImages();
      });
    });
  }

  applyFiltersFromURL();
}

// --- DOMContentLoaded: kick off the app ---
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();

  setupNearestCameraButton();
  // Auto-sort by last known location if permission was granted
  if (localStorage.getItem('locationAllowed') === 'true') {
    autoSortByLocation();
  }

  setupRefreshButton();
  setupSearchListener();
  setupDropdownHide();
  setupModalLinks();
  setupSizeSlider();
  setupModalMapToggle();
  setupModalCleanup();
  setupOverviewModal();

  // Splash screen logic with fallback
  const splash = document.getElementById('splashScreen');
  if (splash) {
    const dv = document.getElementById('desktopVideo');
    if (dv) {
      dv.addEventListener('playing', () => setTimeout(fadeOutSplash, 2300));
      dv.addEventListener('error', () => setTimeout(fadeOutSplash, 2000));
    }
    // Always hide splash after maximum 3 seconds
    setTimeout(fadeOutSplash, 3000);
  }

  // Set up image share long-press
  setupLongPressShare('.aspect-ratio-box img');
  setupLongPressShare('#imageModal img');

  // Hide all collapse panels initially
  ['regionOptions','countyOptions','cityOptions','maintenanceOptions','otherFiltersOptions']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) bootstrap.Collapse.getOrCreateInstance(el, { toggle: false }).hide();
    });
});
