// modal.js
// Removed OverlappingMarkerSpiderfier. Use hover to open/close popups.

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
      if (!lat || !lon) {
        alert('No location data');
        return;
      }
      const mapContainer = document.createElement('div');
      mapContainer.id = 'modalMapContainer';
      mapContainer.style.flex = '1';
      const iframe = document.createElement('iframe');
      iframe.width = '100%';
      iframe.height = '100%';
      iframe.frameBorder = '0';
      iframe.style.border = '0';
      iframe.src = `https://maps.google.com/maps?q=${lat},${lon}&z=15&t=k&output=embed`;
      mapContainer.append(iframe);
      modalBody.append(mapContainer);
      modalImageContainer.style.flex = '1';
      modalBody.style.display = 'flex';
      mapButton.textContent = 'Hide Map';
      mapDisplayed = true;
    } else {
      const mc = document.getElementById('modalMapContainer');
      if (mc) mc.remove();
      modalImageContainer.style.flex = '1';
      mapButton.textContent = 'Map';
      mapDisplayed = false;
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
    mapButton.textContent = 'Map';
    mapDisplayed = false;
  });
}

/**
 * Shares an image file via Web Share API.
 */
export async function shareImageFile(imageUrl, extraInfo = "") {
  try {
    const res = await fetch(imageUrl);
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
 * Sets up the Overview Map modal for routes with hover popups.
 */
export function setupOverviewModal() {
  let map;
  const modalEl = document.getElementById('overviewMapModal');

  modalEl.addEventListener('shown.bs.modal', () => {
    // Set header title
    const titleEl = document.getElementById('overviewMapModalLabel');
    titleEl.textContent = window.selectedRoute || 'Route Overview';

    const cams = window.visibleCameras || [];
    if (!cams.length) return;

    // Clean up previous map
    if (map) {
      map.remove();
      map = null;
    }

    // Build bounds
    const coords = cams.map(cam => [cam.Latitude, cam.Longitude]);
    const bounds = L.latLngBounds(coords);

    // Initialize map
    map = L.map('overviewMap', {
      attributionControl: true,
      zoomControl: false,
      dragging: true,
      scrollWheelZoom: true,
      doubleClickZoom: false,
      touchZoom: true,
      closePopupOnClick: false    // ← keep popups open when you click the map
    });
    
    // Add tile layer
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; Esri'
    }).addTo(map);

    // … after adding your tileLayer …

// inside your shown.bs.modal handler, after you add the tileLayer…
cams.forEach(cam => {
  // 1) create the marker
  const marker = L.circleMarker(
    [cam.Latitude, cam.Longitude],
    {
      radius: 6,
      fillColor: '#ff7800',
      color: '#000',
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8
    }
  ).addTo(map);

  // 2) popup HTML
  const popupHtml = `
    <div class="glass-popup-content">
      <img
        src="${cam.Views[0].Url}"
        alt="Camera view"
        class="glass-popup-img"
      />
    </div>
  `;

  // 3) bind the popup (with offset)
  marker.bindPopup(popupHtml, {
    className: 'glass-popup',
    maxWidth: 160,
    minWidth: 120,
    closeButton: true,
    keepInView: false,
    autoClose: false,
    closeOnClick: false,
    offset: [0, -30]      // ← same Y-offset we'll use in the connector
  });

  // open on click
  marker.on('click', () => marker.openPopup());

  // 4) on open: create connector + dynamic updater
  marker.on('popupopen', () => {
    const mapContainer = map.getContainer();
    const popup = marker.getPopup();

    // create an empty line and stash it
    marker._connector = L.polyline([], {
      color: '#ff7800',
      weight: 3,
      interactive: false
    }).addTo(map);

    // function to recalc endpoints
    const updateConnector = () => {
      if (!marker._connector || !popup.isOpen()) return;

      // 4a) marker latlng
      const mLatLng = marker.getLatLng();

      // 4b) popup DOM bottom‑center
      const popupEl = popup.getElement ? popup.getElement() : popup._container;
      const popupRect = popupEl.getBoundingClientRect();
      const mapRect   = mapContainer.getBoundingClientRect();
      const cx = popupRect.left - mapRect.left + popupRect.width  / 2;
      const cy = popupRect.top  - mapRect.top  + popupRect.height;

      // 4c) back to latlng
      const pLatLng = map.containerPointToLatLng([cx, cy]);

      // 4d) update the polyline
      marker._connector.setLatLngs([ mLatLng, pLatLng ]);
    };

    // stash for removal later
    marker._updateConnector = updateConnector;

    // hook into map movements
    map.on('move zoom viewreset', updateConnector);

    // initial draw
    updateConnector();
  });

  // 5) on close: remove line + listeners
  marker.on('popupclose', () => {
    if (marker._connector) {
      map.removeLayer(marker._connector);
      marker._connector = null;
    }
    if (marker._updateConnector) {
      map.off('move zoom viewreset', marker._updateConnector);
      marker._updateConnector = null;
    }
  });
});

// …then your map.invalidateSize() and map.fitBounds() as before…



    // Resize & fit bounds
    map.invalidateSize();
    map.fitBounds(bounds, {
      padding: [10, 10],
      maxZoom: 12
    });
  });

  // Clean up on hide
  modalEl.addEventListener('hidden.bs.modal', () => {
    if (map) {
      map.remove();
      map = null;
    }
  });
}
