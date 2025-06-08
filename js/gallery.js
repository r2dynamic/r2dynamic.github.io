// gallery.js (mini map for all filtered views, 50 nearest, zoom-in on user for nearest only)
const galleryContainer   = document.getElementById('imageGallery');
const cameraCountElement = document.getElementById('cameraCount');
let currentIndex = 0;

/**
 * Determines the current filter context for gallery.
 * Returns an object:
 *   { isFiltered, type, label, nearest: {lat, lng} or null }
 */
function getGalleryFilterContext() {
  let type = null, label = "Overview", nearest = null, isFiltered = false;

  if (window.isNearestFilterActive && window.nearestUserLocation) {
    type = "nearest";
    label = "Nearest Cameras";
    nearest = window.nearestUserLocation;
    isFiltered = true;
  } else if (window.selectedRoute && window.selectedRoute !== 'All') {
    type = "route";
    label = window.selectedRoute;
    isFiltered = true;
  } else if (window.selectedRegion) {
    type = "region";
    label = "Region Overview";
    isFiltered = true;
  } else if (window.selectedCounty) {
    type = "county";
    label = "County Overview";
    isFiltered = true;
  } else if (window.selectedCity) {
    type = "city";
    label = "City Overview";
    isFiltered = true;
  } else if (window.selectedMaintenanceStation) {
    type = "maintenance";
    label = "Maintenance Overview";
    isFiltered = true;
  } else if (window.selectedOtherFilter) {
    type = "other";
    label = window.selectedOtherFilter;
    isFiltered = true;
  } else if (window.searchQuery) {
    type = "search";
    label = "Search Results";
    isFiltered = true;
  }

  return { isFiltered, type, label, nearest };
}

/**
 * Renders an array of camera objects into the gallery.
 * @param {Array} cameras
 */
export function renderGallery(cameras) {
  galleryContainer.innerHTML = '';

  // Determine filter context
  const filterCtx = getGalleryFilterContext();
  window.currentGalleryFilterType = filterCtx.type || ""; // For use in modal

  // For "Nearest Cameras": only show top 50
  let camsToShow = cameras;
  if (filterCtx.type === "nearest") {
    camsToShow = cameras.slice(0, 50);
  }

  // Insert mini overview map cell for all filtered gallery views (except default unfiltered)
  if (filterCtx.isFiltered && camsToShow.length > 0) {
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

    // Initialize the mini overview map after DOM insertion
    const overviewTile = overviewCell.querySelector('#overview-tile');
    requestAnimationFrame(() => {
      // Build coordinates and bounds for visible cameras
      const coords = camsToShow.map(cam => [cam.Latitude, cam.Longitude]);
      const bounds = L.latLngBounds(coords);

      // Set map center for nearest cameras (user location)
      let mapCenter = null;
      if (filterCtx.type === "nearest" && filterCtx.nearest) {
        mapCenter = [filterCtx.nearest.lat, filterCtx.nearest.lng];
      }

      // Destroy any previous map in this div
      if (overviewTile._miniMapInstance) {
        overviewTile._miniMapInstance.remove();
        overviewTile._miniMapInstance = null;
      }

      // Init map
      const miniMap = L.map(overviewTile, {
        attributionControl: false,
        zoomControl:      false,
        dragging:         true,
        scrollWheelZoom:  true,
        doubleClickZoom:  false,
        touchZoom:        true
      });
      overviewTile._miniMapInstance = miniMap;

      // Add base and overlay tile layers
      const darkBase = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: '&copy; Esri',
          subdomains: 'abcd',
          maxZoom: 20
        }
      ).addTo(miniMap);

      const terrainLines = L.tileLayer(
        'http://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
           attribution: '&copy; Esri',
          minZoom: 0,
          maxZoom: 18
        }
      ).addTo(miniMap);



// Now add your new markers, and they will appear with the current JS style:
coords.forEach(([lat, lng]) => {
  L.circleMarker([lat, lng], {
    radius:      3,            
    fillColor:   '#ff7800',
    color:       '#ffffff',
    weight:      .75,
    opacity:     1,
    fillOpacity: 1
  }).addTo(miniMap);
});




      // For nearest cameras, add user location as blue dot
      if (filterCtx.type === "nearest" && filterCtx.nearest) {
        L.circleMarker([filterCtx.nearest.lat, filterCtx.nearest.lng], {
          radius:      6,
          fillColor:   '#2186f6',
          color:       '#ffffff',
          weight:      2,
          opacity:     1,
          fillOpacity: 1
        }).addTo(miniMap);
      }

      // Helper to size & fit
      const fitMap = () => {
        miniMap.invalidateSize();
        if (filterCtx.type === "nearest" && mapCenter) {
          miniMap.setView(mapCenter, 14); // Strong zoom-in on user
        } else if (coords.length > 0) {
          miniMap.fitBounds(bounds, { padding: [8, 8], maxZoom: 16 });
        }
      };
      fitMap();
      new ResizeObserver(fitMap).observe(overviewTile);
    });
  }

  // Render the rest of the camera images in the gallery
  camsToShow.forEach((camera, i) => {
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
