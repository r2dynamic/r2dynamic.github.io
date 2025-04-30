// main.js
// Main module that imports data fetching functions and handles UI and events

import { getCamerasList, getCuratedRoutes } from './cameraData.js';

// --- Constants ---
const DEBOUNCE_DELAY = 300;
const MIN_IMAGE_SIZE = 80; // Enforced minimum grid image size

// --- Global Variables ---
let selectedRegion = "";
let selectedCounty = "";
let selectedCity = "";
let selectedMaintenanceStation = "";
let selectedRoute = "All";
let searchQuery = "";

let camerasList = [];
let curatedRoutes = [];
let visibleCameras = [];
let currentIndex = 0;
let debounceTimer;

// --- Helper: Degrees to Radians ---
function toRadians(deg) {
  return deg * Math.PI / 180;
}

// --- Typed-Field Single Route Match Helper ---
function isCameraOnSingleRoute(camera, { name, mpMin, mpMax }) {
  if (camera.RoadwayOption1 === name) {
    const mp = camera.MilepostOption1;
    if (mpMin != null && mp < mpMin) return false;
    if (mpMax != null && mp > mpMax) return false;
    return true;
  }
  if (camera.RoadwayOption2 === name) {
    const mp = camera.MilepostOption2;
    if (mpMin != null && mp < mpMin) return false;
    if (mpMax != null && mp > mpMax) return false;
    return true;
  }
  return false;
}

// --- Typed-Field Composite Route Match Helper ---
function isCameraOnRoute(camera, routeObj) {
  if (Array.isArray(routeObj.routes)) {
    return routeObj.routes.some(sub => isCameraOnSingleRoute(camera, sub));
  }
  return isCameraOnSingleRoute(camera, routeObj);
}

// --- Utility Functions ---
function debounce(func, delay) {
  return function (...args) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => func.apply(this, args), delay);
  };
}

function computeDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// --- Initialization ---
function initialize() {
  getCamerasList()
    .then(data => {
      camerasList = data;
      visibleCameras = [...camerasList];
      updateCameraCount();
      updateRegionDropdown();
      updateCountyDropdown();
      updateCityDropdown();
      updateMaintenanceStationDropdown();

      if (window.location.search) {
        applyFiltersFromURL();
      } else if (localStorage.getItem('locationAllowed') === 'true') {
        autoSortByLocation();
      } else if (navigator.permissions) {
        navigator.permissions.query({ name: 'geolocation' })
          .then(result => {
            if (result.state === 'granted') {
              localStorage.setItem('locationAllowed', 'true');
              autoSortByLocation();
            } else {
              renderGallery(visibleCameras);
            }
          })
          .catch(() => renderGallery(visibleCameras));
      } else {
        renderGallery(visibleCameras);
      }
    })
    .catch(err => console.error("Error loading cameras:", err));

  getCuratedRoutes()
    .then(routes => {
      curatedRoutes = routes.sort((a, b) => {
        const aMin = a.mpMin != null ? a.mpMin : Infinity;
        const bMin = b.mpMin != null ? b.mpMin : Infinity;
        return aMin - bMin;
      });
      updateRouteOptions();
    })
    .catch(err => console.error("Error loading curated routes:", err));
}

// --- Reveal Main Content ---
function revealMainContent() {
  const headerControls = document.querySelector('.header-controls');
  const imageGallery = document.getElementById('imageGallery');
  if (headerControls) headerControls.classList.replace('hidden-on-load', 'fade-in');
  if (imageGallery) imageGallery.classList.replace('hidden-on-load', 'fade-in');
}

// --- Splash Screen Fade-Out ---
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

// --- URL Parameter Functions ---
function updateURLParameters() {
  const params = new URLSearchParams();
  if (selectedRegion) params.set('region', selectedRegion);
  if (selectedCounty) params.set('county', selectedCounty);
  if (selectedCity) params.set('city', selectedCity);
  if (selectedRoute !== 'All') params.set('route', selectedRoute);
  if (searchQuery) params.set('search', searchQuery);
  if (selectedMaintenanceStation) params.set('maintenance', selectedMaintenanceStation);
  const newUrl = window.location.pathname + '?' + params.toString();
  window.history.replaceState({}, '', newUrl);
}

function applyFiltersFromURL() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('region')) selectedRegion = params.get('region');
  if (params.has('county')) selectedCounty = params.get('county');
  if (params.has('city')) selectedCity = params.get('city');
  if (params.has('route')) selectedRoute = params.get('route');
  if (params.has('search')) {
    searchQuery = params.get('search');
    searchInput.value = searchQuery;
  }
  if (params.has('maintenance')) selectedMaintenanceStation = params.get('maintenance');
  updateRegionDropdown(); updateCountyDropdown(); updateCityDropdown(); updateMaintenanceStationDropdown();
  updateRouteOptions(); filterImages();
}

// --- Copy URL to Clipboard ---
function copyURLToClipboard() {
  const url = window.location.href;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => alert('URL copied!'));
  } else {
    const tmp = document.createElement('input');
    tmp.value = url;
    document.body.append(tmp);
    tmp.select();
    document.execCommand('copy');
    tmp.remove();
    alert('URL copied!');
  }
}

// --- DOM Elements ---
const galleryContainer      = document.getElementById('imageGallery');
const imageModalEl          = document.getElementById('imageModal');
const modalImage            = imageModalEl.querySelector('img');
const modalTitle            = document.querySelector('.modal-title');
const cameraCountElement    = document.getElementById('cameraCount');
const searchInput           = document.getElementById('searchInput');
const routeFilterMenu       = document.getElementById('routeFilterMenu');
const nearestButton         = document.getElementById('nearestButton');
const refreshButton         = document.getElementById('refreshButton');
const sizeSlider            = document.getElementById('sizeSlider');
const sizeControlButton     = document.getElementById('sizeControlButton');
const sizeSliderContainer   = document.getElementById('sizeSliderContainer');

// --- Modal Map Toggle ---
const mapButton             = document.getElementById('mapButton');
const modalBody             = document.getElementById('modalBody');
const modalImageContainer   = document.getElementById('modalImageContainer');
let mapDisplayed            = false;
if (mapButton) mapButton.addEventListener('click', () => {
  if (!mapDisplayed) {
    const lat = modalImage.dataset.latitude;
    const lon = modalImage.dataset.longitude;
    if (!lat || !lon) return alert('No location data');
    const mapContainer = document.createElement('div'); mapContainer.id = 'modalMapContainer'; mapContainer.style.flex = '1';
    const iframe = document.createElement('iframe');
    iframe.width = '100%'; iframe.height = '100%'; iframe.frameBorder = '0'; iframe.style.border = '0';
    iframe.src = `https://maps.google.com/maps?q=${lat},${lon}&z=15&t=k&output=embed`;
    mapContainer.append(iframe); modalBody.append(mapContainer);
    modalImageContainer.style.flex   = '1';
    modalBody.style.display           = 'flex';
    mapButton.textContent             = 'Hide Map';
    mapDisplayed                      = true;
  } else {
    const mc = document.getElementById('modalMapContainer'); if (mc) mc.remove();
    modalImageContainer.style.flex = '1';
    mapButton.textContent         = 'Map';
    mapDisplayed                  = false;
  }
});
imageModalEl.addEventListener('hidden.bs.modal', () => {
  const mc = document.getElementById('modalMapContainer'); if (mc) mc.remove();
  modalImageContainer.style.flex = '1';
  mapButton.textContent         = 'Map';
  mapDisplayed                  = false;
});

// --- Dropdown Population Functions ---
function getFilteredCameras(exclude) {
  return camerasList.filter(camera => {
    if (exclude !== 'region' && selectedRegion && (!camera.Region || camera.Region.toString() !== selectedRegion)) return false;
    if (exclude !== 'county' && selectedCounty && (!camera.CountyBoundary || camera.CountyBoundary !== selectedCounty)) return false;
    if (exclude !== 'city' && selectedCity && (!camera.MunicipalBoundary || camera.MunicipalBoundary !== selectedCity)) return false;
    if (exclude !== 'maintenance' && selectedMaintenanceStation) {
      const ok = (camera.MaintenanceStationOption1 === selectedMaintenanceStation
                  && camera.MaintenanceStationOption1.toLowerCase() !== 'not available')
               || (camera.MaintenanceStationOption2 === selectedMaintenanceStation
                   && camera.MaintenanceStationOption2.toLowerCase() !== 'not available');
      if (!ok) return false;
    }
    return true;
  });
}

function updateRegionDropdown() {
  const avail = getFilteredCameras('region');
  const set   = new Set(avail.map(c => c.Region).filter(v => v != null).map(v => v.toString()));
  const menu  = document.getElementById('regionFilterMenu'); if (!menu) return; menu.innerHTML = '';
  const li0   = document.createElement('li'),
        a0    = document.createElement('a');
  a0.classList.add('dropdown-item');
  a0.href = '#';
  a0.dataset.value = '';
  a0.textContent   = 'All Regions';
  a0.addEventListener('click', e => {
    e.preventDefault();
    selectedRegion = '';
    updateCountyDropdown();
    updateCityDropdown();
    updateMaintenanceStationDropdown();
    filterImages();
    bootstrap.Collapse.getOrCreateInstance(document.getElementById('regionOptions')).hide();
  });
  li0.append(a0);
  menu.append(li0);

  Array.from(set).sort().forEach(val => {
    const li = document.createElement('li'),
          a  = document.createElement('a');
    a.classList.add('dropdown-item');
    a.href = '#';
    a.dataset.value = val;
    a.textContent   = val;
    a.addEventListener('click', e => {
      e.preventDefault();
      selectedRegion = val;
      updateCountyDropdown();
      updateCityDropdown();
      updateMaintenanceStationDropdown();
      filterImages();
      bootstrap.Collapse.getOrCreateInstance(document.getElementById('regionOptions')).hide();
    });
    li.append(a);
    menu.append(li);
  });
}

function updateCountyDropdown() {
  const avail = getFilteredCameras('county');
  const set   = new Set(avail.map(c => c.CountyBoundary).filter(v => v));
  const menu  = document.getElementById('countyFilterMenu'); if (!menu) return; menu.innerHTML = '';
  const li0   = document.createElement('li'),
        a0    = document.createElement('a');
  a0.classList.add('dropdown-item');
  a0.href = '#';
  a0.dataset.value = '';
  a0.textContent   = 'All Counties';
  a0.addEventListener('click', e => {
    e.preventDefault();
    selectedCounty = '';
    updateCityDropdown();
    updateRegionDropdown();
    updateMaintenanceStationDropdown();
    filterImages();
    bootstrap.Collapse.getOrCreateInstance(document.getElementById('countyOptions')).hide();
  });
  li0.append(a0);
  menu.append(li0);

  Array.from(set).sort().forEach(val => {
    const li = document.createElement('li'),
          a  = document.createElement('a');
    a.classList.add('dropdown-item');
    a.href = '#';
    a.dataset.value = val;
    a.textContent   = val;
    a.addEventListener('click', e => {
      e.preventDefault();
      selectedCounty = val;
      updateCityDropdown();
      updateRegionDropdown();
      updateMaintenanceStationDropdown();
      filterImages();
      bootstrap.Collapse.getOrCreateInstance(document.getElementById('countyOptions')).hide();
    });
    li.append(a);
    menu.append(li);
  });
}

function updateCityDropdown() {
  const avail = getFilteredCameras('city');
  const set   = new Set(avail.map(c => c.MunicipalBoundary).filter(v => v));
  const menu  = document.getElementById('cityFilterMenu'); if (!menu) return; menu.innerHTML = '';
  const li0   = document.createElement('li'),
        a0    = document.createElement('a');
  a0.classList.add('dropdown-item');
  a0.href = '#';
  a0.dataset.value = '';
  a0.textContent   = 'All Cities';
  a0.addEventListener('click', e => {
    e.preventDefault();
    selectedCity = '';
    updateRegionDropdown();
    updateCountyDropdown();
    updateMaintenanceStationDropdown();
    filterImages();
    bootstrap.Collapse.getOrCreateInstance(document.getElementById('cityOptions')).hide();
  });
  li0.append(a0);
  menu.append(li0);

  Array.from(set).sort().forEach(val => {
    const li = document.createElement('li'),
          a  = document.createElement('a');
    a.classList.add('dropdown-item');
    a.href = '#';
    a.dataset.value = val;
    a.textContent   = val;
    a.addEventListener('click', e => {
      e.preventDefault();
      selectedCity = val;
      updateRegionDropdown();
      updateCountyDropdown();
      updateMaintenanceStationDropdown();
      filterImages();
      bootstrap.Collapse.getOrCreateInstance(document.getElementById('cityOptions')).hide();
    });
    li.append(a);
    menu.append(li);
  });
}

function updateMaintenanceStationDropdown() {
  const avail = getFilteredCameras('maintenance');
  const set   = new Set();
  avail.forEach(c => {
    const o1 = c.MaintenanceStationOption1,
          o2 = c.MaintenanceStationOption2;
    if (o1 && o1.toLowerCase() !== 'not available') set.add(o1);
    if (o2 && o2.toLowerCase() !== 'not available') set.add(o2);
  });
  const menu = document.getElementById('maintenanceStationMenu'); if (!menu) return; menu.innerHTML = '';
  const li0  = document.createElement('li'),
        a0   = document.createElement('a');
  a0.classList.add('dropdown-item');
  a0.href = '#';
  a0.dataset.value = '';
  a0.textContent   = 'All Stations';
  a0.addEventListener('click', e => {
    e.preventDefault();
    selectedMaintenanceStation = '';
    updateRegionDropdown();
    updateCountyDropdown();
    updateCityDropdown();
    filterImages();
    bootstrap.Collapse.getOrCreateInstance(document.getElementById('maintenanceOptions')).hide();
  });
  li0.append(a0);
  menu.append(li0);

  Array.from(set).sort().forEach(val => {
    const li = document.createElement('li'),
          a  = document.createElement('a');
    a.classList.add('dropdown-item');
    a.href = '#';
    a.dataset.value = val;
    a.textContent   = val;
    a.addEventListener('click', e => {
      e.preventDefault();
      selectedMaintenanceStation = val;
      updateRegionDropdown();
      updateCountyDropdown();
      updateCityDropdown();
      filterImages();
      bootstrap.Collapse.getOrCreateInstance(document.getElementById('maintenanceOptions')).hide();
    });
    li.append(a);
    menu.append(li);
  });
}

// --- Selected Filters Display & Reset ---
function updateSelectedFilters() {
  const cont = document.getElementById('selectedFilters');
  const splash = document.getElementById('splashScreen');
  if (cont && splash && splash.style.display !== 'none') {
    cont.style.display = 'none';
    return;
  }
  cont.innerHTML = '';
  const badges = document.createElement('div');
  badges.className = 'badges';

  if (selectedRegion) {
    const d = document.createElement('div');
    d.className = 'filter-item';
    d.innerHTML = '<i class="fas fa-map"></i> Region: ' + selectedRegion;
    badges.append(d);
  }
  if (selectedCounty) {
    const d = document.createElement('div');
    d.className = 'filter-item';
    d.innerHTML = '<i class="fas fa-building"></i> County: ' + selectedCounty;
    badges.append(d);
  }
  if (selectedCity) {
    const d = document.createElement('div');
    d.className = 'filter-item';
    d.innerHTML = '<i class="fas fa-city"></i> City: ' + selectedCity;
    badges.append(d);
  }
  if (selectedMaintenanceStation) {
    const d = document.createElement('div');
    d.className = 'filter-item';
    d.innerHTML = '<i class="fas fa-tools"></i> Maintenance: ' + selectedMaintenanceStation;
    badges.append(d);
  }
  if (selectedRoute !== 'All') {
    const d = document.createElement('div');
    d.className = 'filter-item';
    d.innerHTML = '<i class="fas fa-road"></i> Route: ' + selectedRoute;
    badges.append(d);
  }
  if (searchQuery) {
    const d = document.createElement('div');
    d.className = 'filter-item';
    d.innerHTML = '<i class="fas fa-search"></i> Search: ' + searchQuery;
    badges.append(d);
  }
  cont.append(badges);

  const has = selectedRegion || selectedCounty || selectedCity ||
              selectedMaintenanceStation || (selectedRoute !== 'All') || searchQuery;
  if (has) {
    const bc = document.createElement('div');
    bc.className = 'action-buttons';
    const rb = document.createElement('button');
    rb.innerHTML = '<i class="fas fa-undo"></i>';
    rb.title = 'Reset Filters';
    rb.className = 'reset-button';
    rb.addEventListener('click', resetFilters);
    bc.append(rb);
    const cb = document.createElement('button');
    cb.innerHTML = '<i class="fas fa-link"></i>';
    cb.title = 'Copy Link';
    cb.className = 'reset-button';
    cb.addEventListener('click', e => { e.preventDefault(); copyURLToClipboard(); });
    bc.append(cb);
    cont.append(bc);
    cont.style.display = 'flex';
  } else {
    cont.style.display = 'none';
  }
}

function resetFilters() {
  selectedRegion = '';
  selectedCounty = '';
  selectedCity = '';
  selectedRoute = 'All';
  selectedMaintenanceStation = '';
  searchQuery = '';
  searchInput.value = '';
  updateRegionDropdown();
  updateCountyDropdown();
  updateCityDropdown();
  updateMaintenanceStationDropdown();
  if (localStorage.getItem('locationAllowed') === 'true') {
    autoSortByLocation();
  } else {
    filterImages();
  }
  updateSelectedFilters();
  updateURLParameters();
}

// --- Route Options ---
function updateRouteOptions() {
  routeFilterMenu.innerHTML = '';
  const li0 = document.createElement('li'),
        a0  = document.createElement('a');
  a0.classList.add('dropdown-item');
  a0.href = '#';
  a0.dataset.value = 'All';
  a0.textContent   = 'All Routes';
  a0.addEventListener('click', e => {
    e.preventDefault();
    selectedRoute = 'All';
    filterImages();
  });
  li0.append(a0);
  routeFilterMenu.append(li0);

  curatedRoutes.forEach(route => {
    const li = document.createElement('li'),
          a  = document.createElement('a');
    a.classList.add('dropdown-item');
    a.href = '#';
    const lbl = route.displayName || route.name;
    a.dataset.value = lbl;
    a.textContent   = lbl;
    a.addEventListener('click', e => {
      e.preventDefault();
      selectedRoute = lbl;
      filterImages();
    });
    li.append(a);
    routeFilterMenu.append(li);
  });
}

// --- Gallery Rendering Functions ---
function renderGallery(cameras) {
  galleryContainer.innerHTML = '';
  cameras.forEach((camera, i) => {
    const col = document.createElement('div');
    col.classList.add('col');
    const arb = document.createElement('div');
    arb.classList.add('aspect-ratio-box');
    const anc = document.createElement('a');
    anc.href = '#';
    anc.setAttribute('data-bs-toggle', 'modal');
    anc.setAttribute('data-bs-target', '#imageModal');
    anc.addEventListener('click', e => { e.preventDefault(); showImage(i); });
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.src     = camera.Views[0].Url;
    img.alt     = `Camera at ${camera.Location}`;
    img.dataset.cameraInfo = `Location: ${camera.Location}\nUrl: ${camera.Views[0].Url}`;
    anc.append(img);
    arb.append(anc);
    col.append(arb);
    galleryContainer.append(col);
  });
}

function updateCameraCount() {
  cameraCountElement.textContent = `${visibleCameras.length}`;
}

function showImage(index) {
  const prev = document.querySelector('.aspect-ratio-box.selected');
  if (prev) prev.classList.remove('selected');
  currentIndex = index;
  const camera = visibleCameras[index];
  modalImage.src        = camera.Views[0].Url;
  modalTitle.textContent= camera.Location;
  modalImage.dataset.latitude  = camera.Latitude;
  modalImage.dataset.longitude = camera.Longitude;
  const sel = galleryContainer.children[index].querySelector('.aspect-ratio-box');
  if (sel) sel.classList.add('selected');
}

// --- Main Filtering ---
function filterImages() {
  const routeObj = selectedRoute !== 'All'
    ? curatedRoutes.find(r => (r.displayName || r.name) === selectedRoute)
    : null;

  // 1️⃣ Filter
  visibleCameras = camerasList.filter(camera => {
    const txt = `${camera.SignalID || ''} ${camera.Location || ''}`.toLowerCase();
    const matchesSearch = !searchQuery || txt.includes(searchQuery.toLowerCase());

    const matchesMaintenance = !selectedMaintenanceStation ||
      ((camera.MaintenanceStationOption1 === selectedMaintenanceStation &&
        camera.MaintenanceStationOption1.toLowerCase() !== 'not available') ||
       (camera.MaintenanceStationOption2 === selectedMaintenanceStation &&
        camera.MaintenanceStationOption2.toLowerCase() !== 'not available'));

    const matchesRoute = routeObj ? isCameraOnRoute(camera, routeObj) : true;
    const matchesRegion = !selectedRegion || camera.Region == selectedRegion;
    const matchesCounty = !selectedCounty || camera.CountyBoundary === selectedCounty;
    const matchesCity   = !selectedCity || camera.MunicipalBoundary === selectedCity;

    return matchesSearch && matchesMaintenance && matchesRoute
        && matchesRegion && matchesCounty && matchesCity;
  });

  // 2️⃣ Sort
  if (routeObj) {
    if (Array.isArray(routeObj.routes)) {
      // Composite route: group by sub-route order, then sort within each by its sortOrder
      visibleCameras.sort((a, b) => {
        const subA = routeObj.routes.find(sr => isCameraOnSingleRoute(a, sr));
        const subB = routeObj.routes.find(sr => isCameraOnSingleRoute(b, sr));

        const idxA = routeObj.routes.indexOf(subA);
        const idxB = routeObj.routes.indexOf(subB);
        if (idxA !== idxB) return idxA - idxB;

        // Same sub-route: sort by its sortOrder
        const getMp = (cam, sub) =>
          cam.RoadwayOption1 === sub.name ? cam.MilepostOption1 : cam.MilepostOption2;

        const mpA = getMp(a, subA);
        const mpB = getMp(b, subB);

        return (subA.sortOrder === 'desc')
          ? mpB - mpA
          : mpA - mpB;
      });
    } else {
      // Single-route: always ascending by milepost
      visibleCameras.sort((a, b) => {
        const mpA = isCameraOnSingleRoute(a, routeObj)
          ? (a.RoadwayOption1 === routeObj.name ? a.MilepostOption1 : a.MilepostOption2)
          : 0;
        const mpB = isCameraOnSingleRoute(b, routeObj)
          ? (b.RoadwayOption1 === routeObj.name ? b.MilepostOption1 : b.MilepostOption2)
          : 0;
        return mpA - mpB;
      });
    }
  }

  // 3️⃣ Render
  updateCameraCount();
  renderGallery(visibleCameras);
  currentIndex = 0;
  updateSelectedFilters();
  updateURLParameters();
}


// --- Nearest Cameras Feature ---
function setupNearestCameraButton() {
  if (nearestButton) {
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
}

// --- Auto-Sort by Location ---
function autoSortByLocation() {
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

// --- Refresh Button ---
function setupRefreshButton() {
  if (refreshButton) {
    refreshButton.addEventListener('click', e => {
      e.preventDefault();
      galleryContainer.querySelectorAll('img').forEach(img => {
        let orig = img.dataset.originalSrc || img.src;
        img.dataset.originalSrc = orig;
        orig = orig.split('?refresh=')[0].split('&refresh=')[0];
        img.src = orig + (orig.includes('?') ? '&' : '?') + 'refresh=' + Date.now();
      });
    });
  }
}

// --- Link Dropdown Items to Modals ---
document.querySelectorAll('[data-modal]').forEach(item =>
  item.addEventListener('click', e => {
    e.preventDefault();
    new bootstrap.Modal(document.getElementById(item.dataset.modal)).show();
  })
);

// --- Image Size Slider & Pinch-Zoom ---
if (sizeControlButton && sizeSliderContainer) {
  sizeControlButton.addEventListener('click', e => {
    e.stopPropagation();
    sizeSliderContainer.classList.toggle('active');
    setTimeout(() => sizeSliderContainer.classList.remove('active'), 3000);
  });
}
if (sizeSlider) {
  sizeSlider.addEventListener('input', () => {
    const v  = parseInt(sizeSlider.value, 10);
    const n  = Math.max(v, MIN_IMAGE_SIZE);
    galleryContainer.style.gridTemplateColumns = `repeat(auto-fit, minmax(${n}px, 1fr))`;
    clearTimeout(sizeSlider.autoHideTimeout);
    sizeSlider.autoHideTimeout = setTimeout(() => sizeSliderContainer.classList.remove('active'), 3000);
  });
}
document.addEventListener('click', e => {
  if (!sizeControlButton.contains(e.target) && !sizeSliderContainer.contains(e.target)) {
    sizeSliderContainer.classList.remove('active');
  }
});
let initialGridDistance = null;
let initialGridSize    = parseInt(sizeSlider?.value, 10) || 120;
galleryContainer.style.touchAction = 'pan-y pinch-zoom';
galleryContainer.addEventListener('touchstart', e => {
  if (e.touches.length === 2) {
    e.preventDefault();
    initialGridDistance = getDistance(e.touches[0], e.touches[1]);
    initialGridSize     = parseInt(sizeSlider.value, 10) || 120;
  }
}, { passive: false });
galleryContainer.addEventListener('touchmove', e => {
  if (e.touches.length === 2 && initialGridDistance) {
    e.preventDefault();
    const currentGridDistance = getDistance(e.touches[0], e.touches[1]);
    let newGridSize = Math.round(initialGridSize * (currentGridDistance / initialGridDistance));
    newGridSize = Math.max(MIN_IMAGE_SIZE, Math.min(newGridSize, parseInt(sizeSlider.max, 10) || 380));
    sizeSlider.value = newGridSize;
    galleryContainer.style.gridTemplateColumns = `repeat(auto-fit, minmax(${newGridSize}px, 1fr))`;
  }
}, { passive: false });
galleryContainer.addEventListener('touchend', () => {
  if (initialGridDistance !== null) initialGridDistance = null;
}, { passive: true });

function getDistance(t1, t2) {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

// --- Share Image via Long Press ---
async function shareImageFile(imageUrl, extraInfo = "") {
  try {
    const res  = await fetch(imageUrl);
    const blob = await res.blob();
    const file = new File([blob], "sharedImage.png", { type: blob.type });
    const shareData = { files: [file], title: extraInfo, text: extraInfo };
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share(shareData);
    } else {
      alert("Your device does not support sharing files.");
    }
  } catch (err) {
    console.error("Error sharing image file:", err);
  }
}

function setupLongPressShare(selector) {
  const threshold = 500;
  document.querySelectorAll(selector).forEach(img => {
    let timer = null;
    img.addEventListener('contextmenu', e => e.preventDefault());
    img.addEventListener('touchstart', () => {
      timer = setTimeout(() => {
        const info = img.dataset.cameraInfo || "";
        shareImageFile(img.src, info);
      }, threshold);
    });
    ['touchend', 'touchcancel'].forEach(evt =>
      img.addEventListener(evt, () => clearTimeout(timer))
    );
  });
}

// --- Search Input Listener & Dropdown Hide ---
if (searchInput) {
  searchInput.addEventListener('input', debounce(e => {
    searchQuery = e.target.value;
    filterImages();
  }, DEBOUNCE_DELAY));
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      bootstrap.Dropdown.getInstance(document.getElementById('searchDropdownButton'))?.hide();
    }
  });
}
document.getElementById('filterDropdownButton').parentElement.addEventListener('hide.bs.dropdown', () => {
  ['regionOptions', 'countyOptions', 'cityOptions', 'maintenanceOptions'].forEach(id => {
    const el = document.getElementById(id);
    bootstrap.Collapse.getOrCreateInstance(el).hide();
  });
});

// On main filters dropdown:
// collapse all nested sub-menus whenever the dropdown is shown
const multiFilterDropdown = document
  .getElementById('filterDropdownButton')
  .parentElement;

multiFilterDropdown.addEventListener('show.bs.dropdown', () => {
  ['regionOptions','countyOptions','cityOptions','maintenanceOptions']
    .forEach(id => {
      const el = document.getElementById(id);
      bootstrap.Collapse.getOrCreateInstance(el).hide();
    });
});


// --- Main Initialization & Splash Setup ---
document.addEventListener('DOMContentLoaded', () => {
  initialize();
  setupNearestCameraButton();
  setupRefreshButton();

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

  // ← Add this _inside_ the DOMContentLoaded handler
  ['regionOptions','countyOptions','cityOptions','maintenanceOptions'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const collapse = bootstrap.Collapse.getOrCreateInstance(el, { toggle: false });
      collapse.hide();
    }
  });
}); // ← only this one closing brace & parenthesis here

