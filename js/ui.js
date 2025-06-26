// js/ui.js
// UI helper functions with integrated custom route support

import { renderGallery, updateCameraCount } from './gallery.js';
import {
  serializeSegments,
  parseMultiRouteFromURL,
  applyCustomRouteFilter
} from './customRoute.js';


/**
 * Reveals the main content by applying fade-in styles.
 */
export function revealMainContent() {
  const headerControls = document.querySelector('.header-controls');
  const imageGallery   = document.getElementById('imageGallery');
  if (headerControls) headerControls.classList.replace('hidden-on-load', 'fade-in');
  if (imageGallery)   imageGallery.classList.replace('hidden-on-load', 'fade-in');
}

/**
 * Fades out the splash screen and triggers main content reveal.
 */
export function fadeOutSplash() {
  const splash = document.getElementById('splashScreen');
  if (splash) {
    revealMainContent();
    splash.classList.add('fade-out');
    setTimeout(() => {
      splash.style.display = 'none';
      updateSelectedFilters();
    }, 1000);
  }
}

/**
 * Updates the URL parameters based on current filter state, including custom routes.
 */
export function updateURLParameters() {
  const params = new URLSearchParams();

  // Custom multi-segment route takes precedence
  if (window.customRouteFormData?.length) {
    params.set('multiRoute', serializeSegments(window.customRouteFormData));
    window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
    return;
  }

  // Standard filters
  if (window.selectedRegion)             params.set('region', window.selectedRegion);
  if (window.selectedCounty)             params.set('county', window.selectedCounty);
  if (window.selectedCity)               params.set('city', window.selectedCity);
  if (window.selectedRoute && window.selectedRoute !== 'All')    params.set('route', window.selectedRoute);
  if (window.searchQuery)                params.set('search', window.searchQuery);
  if (window.selectedMaintenanceStation) params.set('maintenance', window.selectedMaintenanceStation);

  window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
}

/**
 * Updates the selected filters badge area, including custom route segments.
 */
export function updateSelectedFilters() {
  const cont   = document.getElementById('selectedFilters');
  const splash = document.getElementById('splashScreen');
  if (!cont) return;

  // Hide badges while splash is visible
  if (splash && splash.style.display !== 'none') {
    cont.style.display = 'none';
    return;
  }

  cont.innerHTML = '';
  const badges = document.createElement('div');
  badges.className = 'badges';

  function createBadge(iconClass, text) {
    const d = document.createElement('div');
    d.className = 'filter-item';
    d.innerHTML = `<i class="${iconClass}"></i> ${text}`;
    return d;
  }

  // Custom route badges
  if (window.customRouteFormData?.length) {
    badges.append(createBadge('fas fa-road', 'Custom Route:'));
    window.customRouteFormData.forEach(seg => {
      const routeNum = seg.name.replace(/P$/, '');
      const label    = `${routeNum}: ${seg.mpMin}–${seg.mpMax}`;
      badges.append(createBadge('fas fa-map-marker-alt', label));
    });
    cont.append(badges);

    // Action buttons (reset and copy)
    const actions = document.createElement('div');
    actions.className = 'action-buttons';

    const rb = document.createElement('button');
    rb.className = 'reset-button';
    rb.title     = 'Reset Filters';
    rb.innerHTML = '<i class="fas fa-undo"></i>';
    rb.addEventListener('click', () => window.resetFilters());
    actions.append(rb);

    const cb = document.createElement('button');
    cb.className = 'reset-button';
    cb.title     = 'Copy Link';
    cb.innerHTML = '<i class="fas fa-link"></i>';
    cb.addEventListener('click', () => window.copyURLToClipboard().then(() => alert('URL copied!')));
    actions.append(cb);

    cont.append(actions);
    cont.style.display = 'flex';
    return;
  }

  // Standard filter badges
  if (window.selectedRegion)             badges.append(createBadge('fas fa-map',    `Region: ${window.selectedRegion}`));
  if (window.selectedCounty)             badges.append(createBadge('fas fa-building', `County: ${window.selectedCounty}`));
  if (window.selectedCity)               badges.append(createBadge('fas fa-city',   `City: ${window.selectedCity}`));
  if (window.selectedMaintenanceStation) badges.append(createBadge('fas fa-tools',  `Maintenance: ${window.selectedMaintenanceStation}`));
  if (window.selectedRoute && window.selectedRoute !== 'All')    badges.append(createBadge('fas fa-road',   `Route: ${window.selectedRoute}`));
  if (window.searchQuery)                badges.append(createBadge('fas fa-search', `Search: ${window.searchQuery}`));
  if (window.selectedOtherFilter)        badges.append(createBadge('fas fa-sliders-h', `${window.selectedOtherFilter}`));

  cont.append(badges);

  const has = window.selectedRegion ||
              window.selectedCounty ||
              window.selectedCity ||
              window.selectedMaintenanceStation ||
              (window.selectedRoute && window.selectedRoute !== 'All') ||
              window.searchQuery ||
              window.selectedOtherFilter;

  if (has) {
    const actions = document.createElement('div');
    actions.className = 'action-buttons';

    const rb2 = document.createElement('button');
    rb2.className = 'reset-button';
    rb2.title     = 'Reset Filters';
    rb2.innerHTML = '<i class="fas fa-undo"></i>';
    rb2.addEventListener('click', () => window.resetFilters());
    actions.append(rb2);

    const cb2 = document.createElement('button');
    cb2.className = 'reset-button';
    cb2.title     = 'Copy Link';
    cb2.innerHTML = '<i class="fas fa-link"></i>';
    cb2.addEventListener('click', () => window.copyURLToClipboard().then(() => alert('URL copied!')));
    actions.append(cb2);

    cont.append(actions);
    cont.style.display = 'flex';
  } else {
    cont.style.display = 'none';
  }
}

/**
 * Resets all global filters and custom routes to default.
 */
export function resetFilters() {
  window.selectedRegion              = '';
  window.selectedCounty              = '';
  window.selectedCity                = '';
  window.selectedRoute               = 'All';
  window.selectedMaintenanceStation  = '';
  window.selectedOtherFilter         = '';
  window.searchQuery                 = '';
  window.customRouteFormData         = [];

  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';

  window.updateRegionDropdown();
  window.updateCountyDropdown();
  window.updateCityDropdown();
  window.updateMaintenanceStationDropdown();
  window.filterImages();
  window.updateSelectedFilters();
  window.updateURLParameters();
}

/**
 * Apply URL parameters (including multiRoute) to the global filter state.
 */
export function applyFiltersFromURL() {
  const params = new URLSearchParams(window.location.search);

  // 1) If we have a multiRoute param, parse & apply it
  if (params.has('multiRoute')) {
    parseMultiRouteFromURL();
    applyCustomRouteFilter();
    return;
  }

  // otherwise fall back to your standard filters:
  if (params.has('region'))      window.selectedRegion             = params.get('region');
  if (params.has('county'))      window.selectedCounty             = params.get('county');
  if (params.has('city'))        window.selectedCity               = params.get('city');
  if (params.has('route'))       window.selectedRoute              = params.get('route');
  if (params.has('search')) {
    window.searchQuery = params.get('search');
    const input = document.getElementById('searchInput');
    if (input) input.value = window.searchQuery;
  }
  if (params.has('maintenance')) window.selectedMaintenanceStation = params.get('maintenance');
}

/**
 * Refreshes the gallery based on the provided cameras array:
 * - updates global state
 * - resets index
 * - re-renders count, gallery, badges, and URL
 */
export function refreshGallery(cameras) {
  window.visibleCameras = cameras;
  window.currentIndex   = 0;
  updateCameraCount();
  renderGallery(cameras);
  updateSelectedFilters();
  updateURLParameters();
}

/**
 * Copies the current window.location.href into the clipboard.
 */
export function copyURLToClipboard() {
  const url = window.location.href;
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(url);
  }
  const textarea = document.createElement('textarea');
  textarea.value = url;
  textarea.style.position = 'absolute';
  textarea.style.left     = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  return new Promise((resolve, reject) => {
    try {
      document.execCommand('copy');
      document.body.removeChild(textarea);
      resolve();
    } catch (err) {
      document.body.removeChild(textarea);
      reject(err);
    }
  });
}
