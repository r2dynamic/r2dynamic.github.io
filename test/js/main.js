// main.js
// Entry point: orchestrates module imports and initializes the app

import { loadCameras, loadRoutes } from './js/dataLoader.js';
import { filterImages } from './js/filters.js';
import {
  updateRegionDropdown,
  updateCountyDropdown,
  updateCityDropdown,
  updateMaintenanceStationDropdown,
  updateRouteOptions
} from './js/dropdowns.js';
import { renderGallery, updateCameraCount, showImage } from './js/gallery.js';
import {
  setupModalMapToggle,
  setupModalCleanup,
  setupLongPressShare
} from './js/modal.js';
import {
  setupNearestCameraButton,
  autoSortByLocation
} from './js/geolocation.js';
import {
  setupSearchListener,
  setupRefreshButton,
  setupSizeSlider,
  setupDropdownHide,
  setupModalLinks
} from './js/events.js';
import { copyURLToClipboard } from './js/utils.js';

// --- Global State ---
let selectedRegion = '';
let selectedCounty = '';
let selectedCity = '';
let selectedMaintenanceStation = '';
let selectedRoute = 'All';
let selectedOtherFilter = '';
let searchQuery = '';

let camerasList = [];
let curatedRoutes = [];
let visibleCameras = [];
let currentIndex = 0;

// --- UI Helper Functions ---
function revealMainContent() {
  const headerControls = document.querySelector('.header-controls');
  const imageGallery   = document.getElementById('imageGallery');
  if (headerControls) headerControls.classList.replace('hidden-on-load', 'fade-in');
  if (imageGallery)   imageGallery.classList.replace('hidden-on-load', 'fade-in');
}

function fadeOutSplash() {
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

function updateURLParameters() {
  const params = new URLSearchParams();
  if (selectedRegion)             params.set('region', selectedRegion);
  if (selectedCounty)             params.set('county', selectedCounty);
  if (selectedCity)               params.set('city', selectedCity);
  if (selectedRoute !== 'All')    params.set('route', selectedRoute);
  if (searchQuery)                params.set('search', searchQuery);
  if (selectedMaintenanceStation) params.set('maintenance', selectedMaintenanceStation);
  window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
}

function updateSelectedFilters() {
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

  if (selectedRegion)             badges.append(createBadge('fas fa-map',    `Region: ${selectedRegion}`));
  if (selectedCounty)             badges.append(createBadge('fas fa-building', `County: ${selectedCounty}`));
  if (selectedCity)               badges.append(createBadge('fas fa-city',   `City: ${selectedCity}`));
  if (selectedMaintenanceStation) badges.append(createBadge('fas fa-tools',  `Maintenance: ${selectedMaintenanceStation}`));
  if (selectedRoute !== 'All')    badges.append(createBadge('fas fa-road',   `Route: ${selectedRoute}`));
  if (searchQuery)                badges.append(createBadge('fas fa-search', `Search: ${searchQuery}`));
  if (selectedOtherFilter)        badges.append(createBadge('fas fa-sliders-h', selectedOtherFilter));

  cont.append(badges);

  const has =
    selectedRegion || selectedCounty || selectedCity ||
    selectedMaintenanceStation || (selectedRoute !== 'All') ||
    searchQuery || selectedOtherFilter;

  if (has) {
    const actions = document.createElement('div');
    actions.className = 'action-buttons';

    const rb = document.createElement('button');
    rb.className = 'reset-button';
    rb.title = 'Reset Filters';
    rb.innerHTML = '<i class="fas fa-undo"></i>';
    rb.onclick = resetFilters;
    actions.append(rb);

    const cb = document.createElement('button');
    cb.className = 'reset-button';
    cb.title = 'Copy Link';
    cb.innerHTML = '<i class="fas fa-link"></i>';
    cb.onclick = () => copyURLToClipboard().then(() => alert('URL copied!'));
    actions.append(cb);

    cont.append(actions);
    cont.style.display = 'flex';
  } else {
    cont.style.display = 'none';
  }
}

function resetFilters() {
  selectedRegion = '';
  selectedCounty = '';
  selectedCity   = '';
  selectedRoute  = 'All';
  selectedMaintenanceStation = '';
  selectedOtherFilter = '';
  searchQuery = '';
  document.getElementById('searchInput').value = '';
  updateRegionDropdown();
  updateCountyDropdown();
  updateCityDropdown();
  updateMaintenanceStationDropdown();
  filterImages();
  updateSelectedFilters();
  updateURLParameters();
}

function applyFiltersFromURL() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('region'))      selectedRegion             = params.get('region');
  if (params.has('county'))      selectedCounty             = params.get('county');
  if (params.has('city'))        selectedCity               = params.get('city');
  if (params.has('route'))       selectedRoute              = params.get('route');
  if (params.has('search')) {
    searchQuery = params.get('search');
    document.getElementById('searchInput').value = searchQuery;
  }
  if (params.has('maintenance')) selectedMaintenanceStation = params.get('maintenance');
}

// --- Initialization ---
function initialize() {
  loadCameras()
    .then(data => {
      camerasList = data;
      visibleCameras = [...camerasList];
      filterImages();
      updateRegionDropdown();
      updateCountyDropdown();
      updateCityDropdown();
      updateMaintenanceStationDropdown();
    })
    .catch(err => console.error('Error loading cameras:', err));

  loadRoutes()
    .then(routes => {
      curatedRoutes = routes;
      updateRouteOptions();
    })
    .catch(err => console.error('Error loading routes:', err))
    .finally(() => {
      document.querySelectorAll('#otherFiltersMenu .dropdown-item').forEach(a => {
        a.addEventListener('click', e => {
          e.preventDefault();
          selectedOtherFilter = a.dataset.value;
          bootstrap.Collapse.getOrCreateInstance(
            document.getElementById('otherFiltersOptions')
          ).hide();
          filterImages();
        });
      });
    });

  applyFiltersFromURL();
}

// --- DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', () => {
  initialize();
  setupNearestCameraButton();
  setupRefreshButton();
  setupSearchListener();
  setupDropdownHide();
  setupModalLinks();
  setupSizeSlider();
  setupModalMapToggle();
  setupModalCleanup();

  // Splash screen logic
  const splash = document.getElementById('splashScreen');
  if (splash) {
    const dv = document.getElementById('desktopVideo');
    if (dv && getComputedStyle(dv).display !== 'none') {
      splash.querySelectorAll('video').forEach(v =>
        v.addEventListener('playing', () => setTimeout(fadeOutSplash, 2300))
      );
    } else {
      setTimeout(fadeOutSplash, 2000);
    }
  }

  setupLongPressShare('.aspect-ratio-box img');
  setupLongPressShare('#imageModal img');

  // Hide all collapse panels initially
  ['regionOptions','countyOptions','cityOptions','maintenanceOptions','otherFiltersOptions']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) bootstrap.Collapse.getOrCreateInstance(el, { toggle: false }).hide();
    });
});
