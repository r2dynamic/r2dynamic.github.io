// modal.js
const mapButton           = document.getElementById('mapButton');
const modalBody           = document.getElementById('modalBody');
const modalImageContainer = document.getElementById('modalImageContainer');
let mapDisplayed          = false;

/**
 * Sets up the map toggle within the image modal.
 */
export function setupModalMapToggle() {
  if (!mapButton) return;
  mapButton.addEventListener('click', () => {
    if (!mapDisplayed) {
      const modalImage = document.getElementById('imageModal').querySelector('img');
      const lat = modalImage.dataset.latitude;
      const lon = modalImage.dataset.longitude;
      if (!lat || !lon) return alert('No location data');
      const mapContainer = document.createElement('div');
      mapContainer.id    = 'modalMapContainer';
      mapContainer.style.flex = '1';
      const iframe = document.createElement('iframe');
      iframe.width       = '100%';
      iframe.height      = '100%';
      iframe.frameBorder = '0';
      iframe.style.border = '0';
      iframe.src = `https://maps.google.com/maps?q=${lat},${lon}&z=15&t=k&output=embed`;
      mapContainer.append(iframe);
      modalBody.append(mapContainer);
      modalImageContainer.style.flex = '1';
      modalBody.style.display        = 'flex';
      mapButton.textContent          = 'Hide Map';
      mapDisplayed                   = true;
    } else {
      const mc = document.getElementById('modalMapContainer');
      if (mc) mc.remove();
      modalImageContainer.style.flex = '1';
      mapButton.textContent         = 'Map';
      mapDisplayed                  = false;
    }
  });
}

/**
 * Sets up cleanup when the modal is hidden.
 */
export function setupModalCleanup() {
  const imageModalEl = document.getElementById('imageModal');
  imageModalEl.addEventListener('hidden.bs.modal', () => {
    const mc = document.getElementById('modalMapContainer');
    if (mc) mc.remove();
    modalImageContainer.style.flex = '1';
    mapButton.textContent         = 'Map';
    mapDisplayed                  = false;
  });
}

/**
 * Shares an image file via Web Share API.
 */
export async function shareImageFile(imageUrl, extraInfo = "") {
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

/**
 * Enables long-press sharing on images.
 */
export function setupLongPressShare(selector) {
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


/**
 * Sets up the Overview Map modal for routes.
 */
// Replace your existing setupOverviewModal with this:

export function setupOverviewModal() {
  let map;
  const modalEl = document.getElementById('overviewMapModal');
  modalEl.addEventListener('shown.bs.modal', () => {
    const titleEl = document.getElementById('overviewMapModalLabel');
    titleEl.textContent = window.selectedRoute || 'Route Overview';
    const cams = window.visibleCameras || [];
    if (!cams.length) return;

    // 1) Clean up any prior map
    if (map) {
      map.remove();
      map = null;
    }

    // 2) Build coords array & bounds
    const coords = cams.map(cam => [cam.Latitude, cam.Longitude]);
    const bounds = L.latLngBounds(coords);

    // 3) Initialize Leaflet map in your #overviewMap container
    map = L.map('overviewMap', {
      attributionControl: false,
      zoomControl:        false,
      dragging:           false,
      scrollWheelZoom:    false,
      doubleClickZoom:    false,
      touchZoom:          false
    });

    // 4) Add your chosen basemap
    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { attribution: '&copy; OpenStreetMap contributors' }
    ).addTo(map);

    // 5) Drop in your circleMarkers with the SAME style as the thumbnail
    cams.forEach(cam => {
      L.circleMarker([cam.Latitude, cam.Longitude], {
        radius:      4,
        fillColor:   '#ff7800',
        color:       '#000',
        weight:      1,
        opacity:     1,
        fillOpacity: 0.8
      }).addTo(map);
    });

    // 6) Force Leaflet to recalculate size, then center & zoom to show all markers
    map.invalidateSize();
    map.fitBounds(bounds, {
      padding: [8, 8],   // keeps markers off the very edge
      maxZoom: 16        // tweak as desired
    });
  });

  // Tear down when closed
  modalEl.addEventListener('hidden.bs.modal', () => {
    if (map) {
      map.remove();
      map = null;
    }
  });
}


