// gallery.js (Revised to display mini overview map in the gallery)
const galleryContainer   = document.getElementById('imageGallery');
const cameraCountElement = document.getElementById('cameraCount');
let currentIndex = 0;

/**
 * Renders an array of camera objects into the gallery.
 * @param {Array} cameras
 */
export function renderGallery(cameras) {
  galleryContainer.innerHTML = '';

  // Route overview map
  if (window.selectedRoute && window.selectedRoute !== 'All') {
    const overviewCell = document.createElement('div');
    overviewCell.className = 'col';
    overviewCell.innerHTML = `
      <div class="aspect-ratio-box overview-map">
        <a href="#" data-bs-toggle="modal" data-bs-target="#overviewMapModal">
          <div id="overview-tile" style="width:100%;height:100%;"></div>
        </a>
      </div>
    `;
    galleryContainer.append(overviewCell);

    // Initialize the mini overview map
    // …after galleryContainer.append(overviewCell) …

const overviewTile = overviewCell.querySelector('#overview-tile');

requestAnimationFrame(() => {
  // 1. build coords & bounds
  const coords = window.visibleCameras.map(cam => [cam.Latitude, cam.Longitude]);
  const bounds = L.latLngBounds(coords);

  // 2. init map
  const miniMap = L.map(overviewTile, {
    attributionControl: false,
    zoomControl:      false,
    dragging:         false,
    scrollWheelZoom:  true,
    doubleClickZoom:  false,
    touchZoom:        false
  });

  // 3. add tiles
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(miniMap);

  // 4. add markers
  coords.forEach(([lat, lng]) => {
    L.circleMarker([lat, lng], {
      radius:      4,
      fillColor:   '#ff7800',
      color:       '#000',
      weight:      1,
      opacity:     1,
      fillOpacity: 0.8
    }).addTo(miniMap);
  });

  // 5. helper to size & fit
  const fitMap = () => {
    miniMap.invalidateSize();             // recalc container dims
    miniMap.fitBounds(bounds, {           // auto‑zoom & center exactly
      padding: [8, 8],                    // px margin around markers
      maxZoom: 16                         // won’t zoom in closer than this
    });
  };

  // initial fit
  fitMap();

  // 6. whenever the thumbnail div resizes, re‑fit
  new ResizeObserver(fitMap).observe(overviewTile);
});

  }

  // Render individual camera images
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

/**
 * Updates the camera count display.
 */
export function updateCameraCount() {
  cameraCountElement.textContent = `${window.visibleCameras.length}`;
}

/**
 * Shows the selected image in the modal.
 * @param {number} index
 */
export function showImage(index) {
  document.querySelectorAll('.aspect-ratio-box.selected')
    .forEach(el => el.classList.remove('selected'));
  currentIndex = index;
  const cam = window.visibleCameras[index];
  const modalImage = document.getElementById('imageModal').querySelector('img');
  const modalTitle = document.querySelector('.modal-title');
  modalImage.src         = cam.Views[0].Url;
  modalTitle.textContent = cam.Location;
  modalImage.dataset.latitude  = cam.Latitude;
  modalImage.dataset.longitude = cam.Longitude;
  document.querySelectorAll('.aspect-ratio-box')[index]
    .classList.add('selected');
}