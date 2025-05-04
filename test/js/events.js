// events.js
import { debounce } from './utils.js';
import { filterImages } from './filters.js';

const searchInput           = document.getElementById('searchInput');
const refreshButton         = document.getElementById('refreshButton');
const sizeSlider            = document.getElementById('sizeSlider');
const sizeControlButton     = document.getElementById('sizeControlButton');
const sizeSliderContainer   = document.getElementById('sizeSliderContainer');

// --- Search Input Listener & Debounce ---
export function setupSearchListener() {
  if (!searchInput) return;
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

// --- Refresh Button ---
export function setupRefreshButton() {
  if (!refreshButton) return;
  refreshButton.addEventListener('click', e => {
    e.preventDefault();
    document.getElementById('imageGallery').querySelectorAll('img').forEach(img => {
      let orig = img.dataset.originalSrc || img.src;
      img.dataset.originalSrc = orig;
      orig = orig.split('?refresh=')[0];
      img.src = orig + (orig.includes('?') ? '&' : '?') + 'refresh=' + Date.now();
    });
  });
}

// --- Size Slider & Pinch-Zoom ---
export function setupSizeSlider() {
  if (sizeControlButton && sizeSliderContainer) {
    sizeControlButton.addEventListener('click', e => {
      e.stopPropagation();
      sizeSliderContainer.classList.toggle('active');
      setTimeout(() => sizeSliderContainer.classList.remove('active'), 3000);
    });
  }
  if (!sizeSlider) return;
  sizeSlider.addEventListener('input', () => {
    const v  = parseInt(sizeSlider.value, 10);
    const n  = Math.max(v, MIN_IMAGE_SIZE);
    document.getElementById('imageGallery').style.gridTemplateColumns =
      `repeat(auto-fit, minmax(${n}px, 1fr))`;
    clearTimeout(sizeSlider.autoHideTimeout);
    sizeSlider.autoHideTimeout = setTimeout(() => sizeSliderContainer.classList.remove('active'), 3000);
  });
  document.addEventListener('click', e => {
    if (!sizeControlButton.contains(e.target) && !sizeSliderContainer.contains(e.target)) {
      sizeSliderContainer.classList.remove('active');
    }
  });
  let initialGridDistance = null;
  let initialGridSize     = parseInt(sizeSlider?.value, 10) || 120;
  const galleryContainer = document.getElementById('imageGallery');
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
      galleryContainer.style.gridTemplateColumns =
        `repeat(auto-fit, minmax(${newGridSize}px, 1fr))`;
    }
  }, { passive: false });
  galleryContainer.addEventListener('touchend', () => {
    if (initialGridDistance !== null) initialGridDistance = null;
  }, { passive: true });
}

// --- Dropdown Hide Cleanup ---
export function setupDropdownHide() {
  document.getElementById('filterDropdownButton')
    .parentElement.addEventListener('hide.bs.dropdown', () => {
      ['regionOptions', 'countyOptions', 'cityOptions', 'maintenanceOptions', 'otherFiltersOptions']
        .forEach(id => {
          const el = document.getElementById(id);
          bootstrap.Collapse.getOrCreateInstance(el).hide();
        });
    });
}

// --- Link Dropdown Items to Modals ---
export function setupModalLinks() {
  document.querySelectorAll('[data-modal]').forEach(item =>
    item.addEventListener('click', e => {
      e.preventDefault();
      new bootstrap.Modal(document.getElementById(item.dataset.modal)).show();
    })
  );
}

// --- Main Initialization ---
export function initializeApp() {
  document.addEventListener('DOMContentLoaded', () => {
    initialize();
    setupNearestCameraButton();
    setupRefreshButton();
    setupSearchListener();
    setupDropdownHide();
    setupModalLinks();
    setupSizeSlider();

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

    ['regionOptions','countyOptions','cityOptions','maintenanceOptions','otherFiltersOptions']
      .forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          bootstrap.Collapse.getOrCreateInstance(el, { toggle: false }).hide();
        }
      });
  });
}
