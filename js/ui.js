// js/ui.js
// UI helper functions with integrated custom route & other-filters support

import { renderGallery, updateCameraCount, resetImageSizeOverride } from './gallery.js';
import {
  serializeSegments,
  parseMultiRouteFromURL,
  applyCustomRouteFilter
} from './customRoute.js';
import { applyOtherFilter } from './otherFilters.js';

/**
 * Reveal the main UI once the splash is done.
 */
export function revealMainContent() {
  const hdr = document.querySelector('.header-controls');
  const gal = document.getElementById('imageGallery');
  if (hdr) hdr.classList.replace('hidden-on-load','fade-in');
  if (gal) gal.classList.replace('hidden-on-load','fade-in');
}

/**
 * Fade out splash and then show filters.
 */
export function fadeOutSplash() {
  const splash = document.getElementById('splashScreen');
  if (!splash) return;
  revealMainContent();
  splash.classList.add('fade-out');
  setTimeout(()=>{
    splash.style.display = 'none';
    updateSelectedFilters();
  },1000);
}

/**
 * Write the current filter state into the URL.
 */
export function updateURLParameters() {
  const params = new URLSearchParams();

  // 1) multiRoute
  if (window.customRouteFormData?.length) {
    params.set('multiRoute', serializeSegments(window.customRouteFormData));
    window.history.replaceState({},'',`${window.location.pathname}?${params}`);
    return;
  }

  // 2) other-filters
  if (window.selectedOtherFilter) {
    params.set('other', window.selectedOtherFilter);
    window.history.replaceState({},'',`${window.location.pathname}?${params}`);
    return;
  }

  // 3) standard filters
  if (window.selectedRegion)             params.set('region', window.selectedRegion);
  if (window.selectedCounty)             params.set('county', window.selectedCounty);
  if (window.selectedCity)               params.set('city', window.selectedCity);
  if (window.selectedRoute && window.selectedRoute!=='All') params.set('route', window.selectedRoute);
  if (window.searchQuery)                params.set('search', window.searchQuery);
  if (window.selectedMaintenanceStation) params.set('maintenance', window.selectedMaintenanceStation);

  window.history.replaceState({},'',`${window.location.pathname}?${params}`);
}

/**
 * Update the badges area to show active filters.
 */
export function updateSelectedFilters() {
  const cont   = document.getElementById('selectedFilters');
  const splash = document.getElementById('splashScreen');
  if (!cont) return;
  if (splash && splash.style.display!=='none') {
    cont.style.display = 'none';
    return;
  }

  cont.innerHTML = '';
  const badges = document.createElement('div');
  badges.className = 'badges';

  const makeBadge = (icon, txt) => {
    const d = document.createElement('div');
    d.className = 'filter-item';
    d.innerHTML = `<i class="${icon}"></i> ${txt}`;
    return d;
  };

  // custom-route badges
  if (window.customRouteFormData?.length) {
    badges.append(makeBadge('fas fa-road','Custom Route:'));
    window.customRouteFormData.forEach(seg=>{
      const num = seg.name.replace(/P$/,'');
      badges.append(makeBadge('fas fa-map-marker-alt',`${num}: ${seg.mpMin}–${seg.mpMax}`));
    });
    cont.append(badges);
    const actions = document.createElement('div');
    actions.className = 'action-buttons';
    const rb = document.createElement('button');
    rb.className = 'reset-button';
    rb.title     = 'Reset Filters';
    rb.innerHTML = '<i class="fas fa-undo"></i>';
    rb.addEventListener('click', ()=> window.resetFilters());
    actions.append(rb);
    const cb = document.createElement('button');
    cb.className = 'reset-button';
    cb.title     = 'Copy Link';
    cb.innerHTML = '<i class="fas fa-link"></i>';
    cb.addEventListener('click', ()=> window.copyURLToClipboard().then(()=>alert('URL copied!')));
    actions.append(cb);
    cont.append(actions);
    cont.style.display = 'flex';
    return;
  }

  // standard badges + other-filters
  if (window.selectedRegion)             badges.append(makeBadge('fas fa-map',    `Region: ${window.selectedRegion}`));
  if (window.selectedCounty)             badges.append(makeBadge('fas fa-building',`County: ${window.selectedCounty}`));
  if (window.selectedCity)               badges.append(makeBadge('fas fa-city',   `City: ${window.selectedCity}`));
  if (window.selectedMaintenanceStation) badges.append(makeBadge('fas fa-tools',  `Maintenance: ${window.selectedMaintenanceStation}`));
  if (window.selectedRoute && window.selectedRoute!=='All') badges.append(makeBadge('fas fa-road', `Route: ${window.selectedRoute}`));
  if (window.searchQuery)                badges.append(makeBadge('fas fa-search',`Search: ${window.searchQuery}`));
  if (window.selectedOtherFilter)        badges.append(makeBadge('fas fa-sliders-h',window.selectedOtherFilter));

  cont.append(badges);

  const any = window.selectedRegion ||
              window.selectedCounty ||
              window.selectedCity ||
              window.selectedMaintenanceStation ||
              (window.selectedRoute && window.selectedRoute!=='All') ||
              window.searchQuery ||
              window.selectedOtherFilter;

  if (any) {
    const actions = document.createElement('div');
    actions.className = 'action-buttons';
    const rb2 = document.createElement('button');
    rb2.className = 'reset-button';
    rb2.title     = 'Reset Filters';
    rb2.innerHTML = '<i class="fas fa-undo"></i>';
    rb2.addEventListener('click', ()=> window.resetFilters());
    actions.append(rb2);
    const cb2 = document.createElement('button');
    cb2.className = 'reset-button';
    cb2.title     = 'Copy Link';
    cb2.innerHTML = '<i class="fas fa-link"></i>';
    cb2.addEventListener('click', ()=> window.copyURLToClipboard().then(()=>alert('URL copied!')));
    actions.append(cb2);
    cont.append(actions);
    cont.style.display = 'flex';
  } else {
    cont.style.display = 'none';
  }
}

/**
 * Clear all filters and custom routes.
 */
export function resetFilters() {
  window.selectedRegion             = '';
  window.selectedCounty             = '';
  window.selectedCity               = '';
  window.selectedRoute              = 'All';
  window.selectedMaintenanceStation = '';
  window.selectedOtherFilter        = '';
  window.searchQuery                = '';
  window.customRouteFormData        = [];

  const inp = document.getElementById('searchInput');
  if (inp) inp.value = '';

  window.updateRegionDropdown();
  window.updateCountyDropdown();
  window.updateCityDropdown();
  window.updateMaintenanceStationDropdown();
  window.filterImages();
  resetImageSizeOverride(); // Reset image size override on reset
  window.updateSelectedFilters();
  window.updateURLParameters();
}

/**
 * Renders the gallery, updates badges & URL.
 */
export function refreshGallery(cameras) {
  // Normalize raw camera arrays into the mixed-item format used elsewhere.
  const unified = Array.isArray(cameras) && cameras.length && cameras[0].type
    ? cameras
    : cameras.map(camObj => ({ type: 'camera', camera: camObj }));

  window.visibleCameras = unified;
  window.currentIndex   = 0;
  updateCameraCount();
  renderGallery(unified);
  updateSelectedFilters();
  updateURLParameters();
}

/**
 * Copy current URL to clipboard.
 */
export function copyURLToClipboard() {
  const url = window.location.href;
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(url);
  }
  const ta = document.createElement('textarea');
  ta.value = url;
  ta.style.position = 'absolute';
  ta.style.left     = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  return new Promise((res, rej) => {
    try { document.execCommand('copy'); res(); }
    catch(e) { rej(e); }
    document.body.removeChild(ta);
  });
}

/**
 * Read URL params and apply filters (multiRoute → other → standard).
 */
export async function applyFiltersFromURL() {
  const params = new URLSearchParams(window.location.search);

  if (params.has('multiRoute')) {
    parseMultiRouteFromURL();
    applyCustomRouteFilter();
    return;
  }

  if (params.has('other')) {
    window.selectedOtherFilter = params.get('other');
    await applyOtherFilter(window.selectedOtherFilter);
    return;
  }

  if (params.has('region'))      window.selectedRegion             = params.get('region');
  if (params.has('county'))      window.selectedCounty             = params.get('county');
  if (params.has('city'))        window.selectedCity               = params.get('city');
  if (params.has('route'))       window.selectedRoute              = params.get('route');
  if (params.has('search')) {
    window.searchQuery = params.get('search');
    const inp = document.getElementById('searchInput');
    if (inp) inp.value = window.searchQuery;
  }
  if (params.has('maintenance')) window.selectedMaintenanceStation = params.get('maintenance');
}
