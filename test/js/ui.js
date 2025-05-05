import { renderGallery, updateCameraCount } from './gallery.js';

// ui.js
// UI helper functions moved out of main.js for shared use

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
 * Updates the URL parameters based on global selected filters.
 */
export function updateURLParameters() {
  const params = new URLSearchParams();
  if (window.selectedRegion)             params.set('region', selectedRegion);
  if (window.selectedCounty)             params.set('county', selectedCounty);
  if (window.selectedCity)               params.set('city', selectedCity);
  if (window.selectedRoute !== 'All')    params.set('route', selectedRoute);
  if (window.searchQuery)                params.set('search', searchQuery);
  if (window.selectedMaintenanceStation) params.set('maintenance', selectedMaintenanceStation);
  window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
}

/**
 * Updates the selected filters badge area.
 */
export function updateSelectedFilters() {
  const cont   = document.getElementById('selectedFilters');
  const splash = document.getElementById('splashScreen');
  if (cont && splash && splash.style.display !== 'none') {
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

  if (window.selectedRegion)             badges.append(createBadge('fas fa-map',    `Region: ${selectedRegion}`));
  if (window.selectedCounty)             badges.append(createBadge('fas fa-building', `County: ${selectedCounty}`));
  if (window.selectedCity)               badges.append(createBadge('fas fa-city',   `City: ${selectedCity}`));
  if (window.selectedMaintenanceStation) badges.append(createBadge('fas fa-tools',  `Maintenance: ${selectedMaintenanceStation}`));
  if (window.selectedRoute !== 'All')    badges.append(createBadge('fas fa-road',   `Route: ${selectedRoute}`));
  if (window.searchQuery)                badges.append(createBadge('fas fa-search', `Search: ${searchQuery}`));
  if (window.selectedOtherFilter)        badges.append(createBadge('fas fa-sliders-h', selectedOtherFilter));

  cont.append(badges);

  const has =
    window.selectedRegion ||
    window.selectedCounty ||
    window.selectedCity ||
    window.selectedMaintenanceStation ||
    (window.selectedRoute !== 'All') ||
    window.searchQuery ||
    window.selectedOtherFilter;

  if (has) {
    const actions = document.createElement('div');
    actions.className = 'action-buttons';

    const rb = document.createElement('button');
    rb.className = 'reset-button';
    rb.title = 'Reset Filters';
    rb.innerHTML = '<i class="fas fa-undo"></i>';
    rb.onclick = window.resetFilters;
    actions.append(rb);

    const cb = document.createElement('button');
    cb.className = 'reset-button';
    cb.title = 'Copy Link';
    cb.innerHTML = '<i class="fas fa-link"></i>';
    cb.onclick = () => window.copyURLToClipboard().then(() => alert('URL copied!'));
    actions.append(cb);

    cont.append(actions);
    cont.style.display = 'flex';
  } else {
    cont.style.display = 'none';
  }
}

/**
 * Resets all global filters to their default values.
 */
export function resetFilters() {
  window.selectedRegion = '';
  window.selectedCounty = '';
  window.selectedCity   = '';
  window.selectedRoute  = 'All';
  window.selectedMaintenanceStation = '';
  window.selectedOtherFilter = '';
  window.searchQuery = '';
  document.getElementById('searchInput').value = '';
  window.updateRegionDropdown();
  window.updateCountyDropdown();
  window.updateCityDropdown();
  window.updateMaintenanceStationDropdown();
  window.filterImages();
  window.updateSelectedFilters();
  window.updateURLParameters();
}

/**
 * Applies URL parameters (if present) to the global filter state.
 */
export function applyFiltersFromURL() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('region'))      window.selectedRegion             = params.get('region');
  if (params.has('county'))      window.selectedCounty             = params.get('county');
  if (params.has('city'))        window.selectedCity               = params.get('city');
  if (params.has('route'))       window.selectedRoute              = params.get('route');
  if (params.has('search')) {
    window.searchQuery = params.get('search');
    document.getElementById('searchInput').value = window.searchQuery;
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
  window.currentIndex = 0;
  updateCameraCount();
  renderGallery(cameras);
  updateSelectedFilters();
  updateURLParameters();
}
