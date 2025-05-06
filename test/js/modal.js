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
      touchZoom: true
    });

    // Add tile layer
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; Esri'
    }).addTo(map);

    // Add circleMarkers with hover popups
    cams.forEach(cam => {
      const marker = L.circleMarker([cam.Latitude, cam.Longitude], {
        radius: 6,
        fillColor: '#ff7800',
        color: '#000',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(map);

      const popupHtml = `
      <div class="glass-popup-content">
        <div class="popup-title">${cam.Location}</div>
        <img 
          src="${cam.Views[0].Url}" 
          alt="Camera at ${cam.Location}" 
          class="glass-popup-img"
        />
      </div>
    `;
    
    

      marker.bindPopup(popupHtml, {
        className: 'glass-popup',
        maxWidth: 300,
        minWidth: 250,
        closeButton:  false, 
        keepInView: false
      });

      // Open and close popup on hover
      marker.on('mouseover', () => marker.openPopup());
      marker.on('mouseout', () => marker.closePopup());
    });

    // Resize & fit bounds
    map.invalidateSize();
    map.fitBounds(bounds, {
      padding: [20, 20],
      maxZoom: 10
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
