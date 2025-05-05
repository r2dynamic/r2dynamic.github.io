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
export function setupOverviewModal() {
  let map;
  const modalEl = document.getElementById('overviewMapModal');
  modalEl.addEventListener('shown.bs.modal', () => {
    const cams = window.visibleCameras || [];
    if (!cams.length) return;
    const first = cams[0];
    map = L.map('overviewMap').setView([first.Latitude, first.Longitude], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    cams.forEach(cam => {
      L.marker([cam.Latitude, cam.Longitude]).addTo(map);
    });
  });
  modalEl.addEventListener('hidden.bs.modal', () => {
    if (map) {
      map.remove();
      map = null;
    }
  });
}
