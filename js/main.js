// js/main.js
// Entry point: orchestrates module imports and initializes the app

import { loadCameras, loadRoutes } from './dataLoader.js';
import { filterImages }             from './filters.js';
import { renderOtherFiltersMenu, applyOtherFilter } from './otherFilters.js';

import {
  setupCopyUrlButton,
  setupSearchListener,
  setupRefreshButton,
  setupSizeSlider,
  setupDropdownHide,
  setupModalLinks
} from './events.js';  // removed setupOtherFiltersListener here

import { copyURLToClipboard } from './utils.js';
import { setupCustomRouteBuilder } from './customRoute.js';
import {
  initAutoLocationFilterWithTimeout,
  setupLocateButton
} from './geolocation.js';

import {
  updateRegionDropdown,
  updateCountyDropdown,
  updateCityDropdown,
  updateMaintenanceStationDropdown,
  updateRouteOptions
} from './dropdowns.js';

import {
  setupModalMapToggle,
  setupModalCleanup,
  setupLongPressShare,
  setupOverviewModal
} from './modal.js';

import {
  revealMainContent,
  fadeOutSplash,
  updateURLParameters,
  updateSelectedFilters,
  resetFilters,
  applyFiltersFromURL
} from './ui.js';

// --- Global State ---
window.selectedRegion             = '';
window.selectedCounty             = '';
window.selectedCity               = '';
window.selectedMaintenanceStation = '';
window.selectedRoute              = 'All';
window.selectedOtherFilter        = '';
window.searchQuery                = '';

window.camerasList    = [];
window.curatedRoutes  = [];
window.visibleCameras = [];
window.currentIndex   = 0;

// Expose core functions on window for other modules
window.filterImages               = filterImages;
window.updateRegionDropdown       = updateRegionDropdown;
window.updateCountyDropdown       = updateCountyDropdown;
window.updateCityDropdown         = updateCityDropdown;
window.updateMaintenanceStationDropdown = updateMaintenanceStationDropdown;
window.updateRouteOptions         = updateRouteOptions;
window.revealMainContent          = revealMainContent;
window.fadeOutSplash              = fadeOutSplash;
window.updateURLParameters        = updateURLParameters;
window.updateSelectedFilters      = updateSelectedFilters;
window.resetFilters               = resetFilters;
window.applyFiltersFromURL        = applyFiltersFromURL;
window.copyURLToClipboard         = copyURLToClipboard;

/**
 * Initializes cameras and routes, then applies any URL filters
 * before rendering the gallery and dropdowns.
 */
async function initializeApp() {
  // 1. Load cameras & routes
  window.camerasList   = await loadCameras();
  window.curatedRoutes = await loadRoutes();

  // 2. Build dropdowns
  updateRegionDropdown();
  updateCountyDropdown();
  updateCityDropdown();
  updateMaintenanceStationDropdown();
  updateRouteOptions();

  // 3. Build & bind Other-Filters menu
  const menuRoot = document.getElementById('otherFiltersMenu');
  renderOtherFiltersMenu(menuRoot);
  menuRoot.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', async e => {
      e.preventDefault();
      window.selectedOtherFilter = item.dataset.value;
      await applyOtherFilter(window.selectedOtherFilter);
      updateURLParameters();
      bootstrap.Collapse.getOrCreateInstance(
        document.getElementById('otherFiltersOptions')
      ).hide();
    });
  });

  // 4. Apply URL filters before initial render
  applyFiltersFromURL();

  // 5. Initial gallery render
  if (window.selectedOtherFilter) {
    await applyOtherFilter(window.selectedOtherFilter);
  } else {
    const params   = new URLSearchParams(window.location.search);
    const hasMulti = params.has('multiRoute');
    if (!hasMulti) filterImages();
  }

  // 6. Sync badges/UI
  updateSelectedFilters();
}

// Kick off the app when the DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  // 1) Core data + UI setup
  await initializeApp();

  // 2) Always bind the Nearest-Cameras button
  setupLocateButton();

  // 3) Auto‐filter by location ONLY if NO URL params present
  const urlParams = new URLSearchParams(window.location.search);
  if ([...urlParams.keys()].length === 0) {
    await initAutoLocationFilterWithTimeout(5000);
  }

  // 4) Other UI Controls
  setupRefreshButton();
  setupSearchListener();
  setupDropdownHide();
  setupModalLinks();
  // setupOtherFiltersListener();  <-- removed this call
  setupSizeSlider();
  setupModalMapToggle();
  setupModalCleanup();
  setupOverviewModal();
  setupCopyUrlButton();
  setupCustomRouteBuilder();

  // 5) Splash screen logic
  const splash = document.getElementById('splashScreen');
  if (splash) {
    const dv = document.getElementById('desktopVideo');
    if (dv) {
      dv.addEventListener('playing', () => setTimeout(fadeOutSplash, 2300));
      dv.addEventListener('error',   () => setTimeout(fadeOutSplash, 2000));
    }
    setTimeout(fadeOutSplash, 3000);
  }

  // 6) Collapse all filter panels at start
  [
    'regionOptions',
    'countyOptions',
    'cityOptions',
    'maintenanceOptions',
    'otherFiltersOptions'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      bootstrap.Collapse.getOrCreateInstance(el, { toggle: false }).hide();
    }
  });

  // 7) Long-press share setup
  setupLongPressShare('.aspect-ratio-box img');
  setupLongPressShare('#imageModal img');
});
