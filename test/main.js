import { getCamerasList, getCuratedRoutes } from './cameraData.js';
import { cityFullNames, regionCities } from './cityList.js';

// --- Constants ---
const DEBOUNCE_DELAY = 300;
const MIN_IMAGE_SIZE = 80;

// --- Global Variables ---
let camerasList = [];
let curatedRoutes = [];
let visibleCameras = [];
let currentIndex = 0;
let debounceTimer;
let selectedCity = "";
let selectedRegion = "";
let searchQuery = "";
let selectedRoute = "All";

// --- Initialize Function ---
function initialize() {
  getCamerasList()
    .then(data => {
      camerasList = data;
      visibleCameras = camerasList.slice();
      updateCameraCount();
      updateCityDropdown();
      populateRegionDropdown();

      if (window.location.search) {
        applyFiltersFromURL();
      } else if (localStorage.getItem('locationAllowed') === 'true') {
        autoSortByLocation();
      } else if (navigator.permissions) {
        navigator.permissions.query({ name: 'geolocation' })
          .then((result) => {
            if (result.state === 'granted') {
              localStorage.setItem('locationAllowed', 'true');
              autoSortByLocation();
            } else {
              renderGallery(visibleCameras);
            }
          })
          .catch(err => {
            console.error('Permissions API error:', err);
            renderGallery(visibleCameras);
          });
      } else {
         renderGallery(visibleCameras);
      }
    })
    .catch(err => console.error("Error loading cameras:", err));

  getCuratedRoutes()
    .then(routes => {
      curatedRoutes = routes;
      updateRouteOptions();
    })
    .catch(err => console.error("Error loading curated routes:", err));
}

function revealMainContent() {
  const headerControls = document.querySelector('.header-controls');
  const imageGallery = document.getElementById('imageGallery');
  if (headerControls) {
    headerControls.classList.remove('hidden-on-load');
    headerControls.classList.add('fade-in');
  }
  if (imageGallery) {
    imageGallery.classList.remove('hidden-on-load');
    imageGallery.classList.add('fade-in');
  }
}

function fadeOutSplash() {
  const splash = document.getElementById('splashScreen');
  if (splash) {
    revealMainContent();
    splash.classList.add('fade-out');
    splash.addEventListener('animationend', () => {
      splash.style.display = 'none';
    });
  }
}

// --- URL Parameter Functions ---
function updateURLParameters() {
  const params = new URLSearchParams();
  if (selectedCity) params.set("city", selectedCity);
  if (selectedRegion) params.set("region", selectedRegion);
  if (selectedRoute && selectedRoute !== "All") params.set("route", selectedRoute);
  if (searchQuery) params.set("search", searchQuery);

  const newUrl = window.location.pathname + '?' + params.toString();
  window.history.replaceState({}, '', newUrl);
}

function applyFiltersFromURL() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("city")) { selectedCity = params.get("city"); }
  if (params.has("region")) { selectedRegion = params.get("region"); }
  if (params.has("route")) { selectedRoute = params.get("route"); }
  if (params.has("search")) {
    searchQuery = params.get("search");
    if (searchInput) { searchInput.value = searchQuery; }
  }
  updateCityDropdown();
  populateRegionDropdown();
  updateRouteOptions();
  filterImages();
}

function copyURLToClipboard() {
  const url = window.location.href;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url)
      .then(() => { alert("URL copied to clipboard!"); })
      .catch(err => { console.error("Failed to copy URL:", err); });
  } else {
    const input = document.createElement("input");
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
    alert("URL copied to clipboard!");
  }
}

// --- DOM Elements ---
const galleryContainer = document.getElementById("imageGallery");
const imageModalEl = document.getElementById("imageModal");
const modalImage = imageModalEl.querySelector("img");
const modalTitle = document.querySelector(".modal-title");
const cameraCountElement = document.getElementById("cameraCount");
const searchInput = document.getElementById("searchInput");
const nearestButton = document.getElementById("nearestButton");
const refreshButton = document.getElementById("refreshButton");
const sizeSlider = document.getElementById("sizeSlider");
const sizeControlButton = document.getElementById("sizeControlButton");
const sizeSliderContainer = document.getElementById("sizeSliderContainer");
const mapButton = document.getElementById("mapButton");
const modalBody = document.getElementById("modalBody");
const modalImageContainer = document.getElementById("modalImageContainer");
let mapDisplayed = false;

// --- Modal Map Toggle ---
if (mapButton) {
  mapButton.addEventListener("click", () => {
    if (!mapDisplayed) {
      const lat = modalImage.dataset.latitude;
      const lon = modalImage.dataset.longitude;
      if (!lat || !lon) { alert("No location data available for this camera."); return; }
      const mapContainer = document.createElement("div");
      mapContainer.id = "modalMapContainer";
      mapContainer.style.flex = "1";
      const iframe = document.createElement("iframe");
      iframe.width = "100%";
      iframe.height = "100%";
      iframe.frameBorder = "0";
      iframe.style.border = "0";
      iframe.src = `https://maps.google.com/maps?q=${lat},${lon}&z=15&t=k&output=embed`;
      mapContainer.appendChild(iframe);
      modalBody.appendChild(mapContainer);
      modalImageContainer.style.flex = "1";
      modalBody.style.display = "flex";
      mapButton.textContent = "Hide Map";
      mapDisplayed = true;
    } else {
      const mapContainer = document.getElementById("modalMapContainer");
      if (mapContainer) { modalBody.removeChild(mapContainer); }
      modalImageContainer.style.flex = "1";
      mapButton.textContent = "Map";
      mapDisplayed = false;
    }
  });
}

if (imageModalEl) {
  imageModalEl.addEventListener("hidden.bs.modal", () => {
    const mapContainer = document.getElementById("modalMapContainer");
    if (mapContainer) { modalBody.removeChild(mapContainer); }
    modalImageContainer.style.flex = "1";
    mapButton.textContent = "Map";
    mapDisplayed = false;
  });
}

// --- Utility Functions ---
function debounce(func, delay) {
  return function (...args) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => func.apply(this, args), delay);
  };
}
function toRadians(deg) { return deg * Math.PI / 180; }

// --- Route Matching Helper ---
function isCameraOnRoute(camera, routeObj) {
  if (!routeObj || !routeObj.name) return false;
  const location = camera.Location || "";
  const parts = location.split("@");
  const routeSegment = parts.length > 1 ? parts[0].trim() : location;
  const pattern = routeObj.name.replace(/[-\s]/g, "[-\\s]*");
  const regex = new RegExp(`\\b${pattern}(?!\\d)`, "i");
  if (!regex.test(routeSegment)) return false;
  const mpMatch = location.match(/(?:MP|Milepost)\s*([\d.]+)/i);
  if (!mpMatch) return false;
  const milepost = parseFloat(mpMatch[1]);
  if (routeObj.mpMin !== undefined && milepost < routeObj.mpMin) return false;
  if (routeObj.mpMax !== undefined && milepost > routeObj.mpMax) return false;
  return true;
}

function computeDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// --- Selected Filters Display & Reset ---
function updateSelectedFilters() {
  const filtersContainer = document.getElementById("selectedFilters");
  filtersContainer.innerHTML = "";
  const badgesContainer = document.createElement("div");
  badgesContainer.className = "badges";
  if (selectedRegion) {
    const regionDiv = document.createElement("div");
    regionDiv.className = "filter-item";
    regionDiv.innerHTML = '<i class="fas fa-industry"></i> Region: ' + selectedRegion;
    badgesContainer.appendChild(regionDiv);
  }
  if (selectedCity) {
    const cityDiv = document.createElement("div");
    cityDiv.className = "filter-item";
    const fullText = cityFullNames[selectedCity] ? `${selectedCity} (${cityFullNames[selectedCity]})` : selectedCity;
    cityDiv.innerHTML = '<i class="fas fa-map-marked-alt"></i> City: ' + fullText;
    badgesContainer.appendChild(cityDiv);
  }
  if (selectedRoute && selectedRoute !== "All") {
    const routeDiv = document.createElement("div");
    routeDiv.className = "filter-item";
    routeDiv.innerHTML = '<i class="fas fa-road"></i> Route: ' + selectedRoute;
    badgesContainer.appendChild(routeDiv);
  }
  if (searchQuery) {
    const searchDiv = document.createElement("div");
    searchDiv.className = "filter-item";
    searchDiv.innerHTML = '<i class="fas fa-search"></i> Search: ' + searchQuery;
    badgesContainer.appendChild(searchDiv);
  }
  filtersContainer.appendChild(badgesContainer);
  const hasFilters = selectedRegion || selectedCity || (selectedRoute && selectedRoute !== "All") || searchQuery;
  if (hasFilters) {
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "action-buttons";
    const resetButton = document.createElement("button");
    resetButton.innerHTML = '<i class="fas fa-undo"></i>';
    resetButton.title = "Reset Filters";
    resetButton.classList.add("reset-button");
    resetButton.addEventListener("click", resetFilters);
    buttonContainer.appendChild(resetButton);
    const copyButton = document.createElement("button");
    copyButton.innerHTML = '<i class="fas fa-link"></i>';
    copyButton.title = "Copy Link";
    copyButton.classList.add("reset-button");
    copyButton.addEventListener("click", (e) => {
      e.preventDefault();
      copyURLToClipboard();
    });
    buttonContainer.appendChild(copyButton);
    filtersContainer.appendChild(buttonContainer);
  }
  filtersContainer.style.display = hasFilters ? "flex" : "none";
}

function resetFilters() {
  selectedCity = "";
  selectedRegion = "";
  searchQuery = "";
  selectedRoute = "All";
  if (searchInput) { searchInput.value = ""; }
  updateCityDropdown();
  if (localStorage.getItem('locationAllowed') === 'true') {
    autoSortByLocation();
  } else {
    filterImages();
  }
  updateSelectedFilters();
}

// --- Dropdown & Gallery Setup ---
function updateCityDropdown() {
  const cityFilterMenu = document.getElementById("groupCityMenu");
  cityFilterMenu.innerHTML = "";
  const defaultLi = document.createElement("li");
  const defaultA = document.createElement("a");
  defaultA.classList.add("dropdown-item");
  defaultA.href = "#";
  defaultA.setAttribute("data-value", "");
  defaultA.textContent = "All";
  defaultA.addEventListener("click", (e) => {
    e.preventDefault();
    selectedCity = "";
    filterImages();
  });
  defaultLi.appendChild(defaultA);
  cityFilterMenu.appendChild(defaultLi);
  const cities = camerasList.map(camera => {
    let parts = camera.Location.split(",");
    return parts[parts.length - 1].trim();
  });
  const uniqueCities = [...new Set(cities)];
  let filteredCities = uniqueCities;
  if (selectedRegion && regionCities[selectedRegion]) {
    filteredCities = uniqueCities.filter(city => regionCities[selectedRegion].includes(city));
  }
  filteredCities.sort((a, b) => {
    const aFormatted = cityFullNames[a] ? 0 : 1;
    const bFormatted = cityFullNames[b] ? 0 : 1;
    if (aFormatted === bFormatted) { return a.localeCompare(b); }
    return aFormatted - bFormatted;
  }).forEach(city => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.classList.add("dropdown-item");
    a.href = "#";
    a.setAttribute("data-value", city);
    const fullName = cityFullNames[city] || "";
    a.textContent = fullName ? `${city} (${fullName})` : city;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      selectedCity = city;
      filterImages();
    });
    li.appendChild(a);
    cityFilterMenu.appendChild(li);
  });
}

function populateRegionDropdown() {
  const regionFilterMenu = document.getElementById("groupRegionsMenu");
  regionFilterMenu.innerHTML = "";
  const defaultLi = document.createElement("li");
  const defaultA = document.createElement("a");
  defaultA.classList.add("dropdown-item");
  defaultA.href = "#";
  defaultA.setAttribute("data-value", "");
  defaultA.textContent = "All Regions";
  defaultA.addEventListener("click", (e) => {
    e.preventDefault();
    selectedRegion = "";
    updateCityDropdown();
    filterImages();
  });
  defaultLi.appendChild(defaultA);
  regionFilterMenu.appendChild(defaultLi);
  Object.keys(regionCities).forEach(region => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.classList.add("dropdown-item");
    a.href = "#";
    a.setAttribute("data-value", region);
    a.textContent = region;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      selectedRegion = region;
      updateCityDropdown();
      filterImages();
    });
    li.appendChild(a);
    regionFilterMenu.appendChild(li);
  });
}

function updateRouteOptions() {
  const routeFilterMenu = document.getElementById("routeFilterMenu");
  routeFilterMenu.innerHTML = "";
  const defaultLi = document.createElement("li");
  const defaultA = document.createElement("a");
  defaultA.classList.add("dropdown-item");
  defaultA.href = "#";
  defaultA.setAttribute("data-value", "All");
  defaultA.textContent = "All Routes";
  defaultA.addEventListener("click", (e) => {
    e.preventDefault();
    selectedRoute = "All";
    filterImages();
  });
  defaultLi.appendChild(defaultA);
  routeFilterMenu.appendChild(defaultLi);
  curatedRoutes.forEach(route => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.classList.add("dropdown-item");
    a.href = "#";
    const routeLabel = route.displayName || route.name;
    a.setAttribute("data-value", routeLabel);
    a.textContent = routeLabel;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      selectedRoute = routeLabel;
      filterImages();
    });
    li.appendChild(a);
    routeFilterMenu.appendChild(li);
  });
}

function renderGallery(cameras) {
  galleryContainer.innerHTML = "";
  cameras.forEach((camera, index) => {
    const col = document.createElement("div");
    col.classList.add("col");
    const aspectBox = document.createElement("div");
    aspectBox.classList.add("aspect-ratio-box");
    const anchor = document.createElement("a");
    anchor.href = "#";
    anchor.setAttribute("data-bs-toggle", "modal");
    anchor.setAttribute("data-bs-target", "#imageModal");
    anchor.addEventListener("click", (e) => {
      e.preventDefault();
      showImage(index);
    });
    const image = document.createElement("img");
    image.setAttribute("loading", "lazy");
    image.src = camera.Views[0].Url;
    image.alt = `Camera at ${camera.Location}`;
    anchor.appendChild(image);
    aspectBox.appendChild(anchor);
    col.appendChild(aspectBox);
    galleryContainer.appendChild(col);
  });
}

function updateCameraCount() {
  cameraCountElement.innerHTML = `${visibleCameras.length}`;
}

function showImage(index) {
  const prevSelected = document.querySelector(".aspect-ratio-box.selected");
  if (prevSelected) prevSelected.classList.remove("selected");
  currentIndex = index;
  const camera = visibleCameras[index];
  modalImage.src = camera.Views[0].Url;
  modalTitle.textContent = camera.Location;
  modalImage.dataset.latitude = camera.Latitude;
  modalImage.dataset.longitude = camera.Longitude;
  const selectedBox = galleryContainer.children[index].querySelector(".aspect-ratio-box");
  if (selectedBox) selectedBox.classList.add("selected");
}

function filterImages() {
  const routeObj = selectedRoute !== "All"
    ? curatedRoutes.find(route => (route.displayName || route.name) === selectedRoute)
    : null;
  visibleCameras = camerasList.filter(camera => {
    const location = camera.Location || "";
    const city = location.split(",").pop().trim();
    const matchesCity = !selectedCity || city === selectedCity;
    const matchesRegion = !selectedRegion || (regionCities[selectedRegion] && regionCities[selectedRegion].includes(city));
    const matchesSearch = searchQuery.trim().length === 0 || location.toLowerCase().includes(searchQuery.toLowerCase());
    let matchesRoute = true;
    if (routeObj) {
      if (routeObj.routes && Array.isArray(routeObj.routes)) {
        matchesRoute = routeObj.routes.some(subRoute => isCameraOnRoute(camera, subRoute));
      } else {
        matchesRoute = isCameraOnRoute(camera, routeObj);
      }
    }
    return matchesCity && matchesRegion && matchesSearch && matchesRoute;
  });
  if (routeObj) {
    if (routeObj.routes && Array.isArray(routeObj.routes)) {
      let sortedCameras = [];
      routeObj.routes.forEach(subRoute => {
        let group = visibleCameras.filter(camera => isCameraOnRoute(camera, subRoute));
        group.sort((a, b) => {
          const extractMP = camera => {
            const match = camera.Location.match(/(?:MP|Milepost)\s*([\d.]+)/i);
            return match ? parseFloat(match[1]) : Infinity;
          };
          const order = subRoute.sortOrder || "asc";
          return order === "desc" ? extractMP(b) - extractMP(a) : extractMP(a) - extractMP(b);
        });
        sortedCameras = sortedCameras.concat(group);
      });
      visibleCameras = sortedCameras;
    } else {
      visibleCameras.sort((a, b) => {
        const extractMP = camera => {
          const match = camera.Location.match(/(?:MP|Milepost)\s*([\d.]+)/i);
          return match ? parseFloat(match[1]) : Infinity;
        };
        const order = routeObj.sortOrder || "asc";
        return order === "desc" ? extractMP(b) - extractMP(a) : extractMP(a) - extractMP(b);
      });
    }
  }
  updateCameraCount();
  renderGallery(visibleCameras);
  currentIndex = 0;
  updateSelectedFilters();
  updateURLParameters();
}

function setupNearestCameraButton() {
  if (nearestButton) {
    nearestButton.addEventListener("click", () => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            localStorage.setItem('locationAllowed', 'true');
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            const camerasWithDistance = camerasList.map(camera => ({
              camera,
              distance: computeDistance(userLat, userLng, camera.Latitude, camera.Longitude)
            }));
            camerasWithDistance.sort((a, b) => a.distance - b.distance);
            visibleCameras = camerasWithDistance.map(item => item.camera);
            updateCameraCount();
            renderGallery(visibleCameras);
            currentIndex = 0;
            showImage(0);
            updateSelectedFilters();
            updateURLParameters();
          },
          (error) => { alert("Error getting your location: " + error.message); }
        );
      } else {
        alert("Geolocation is not supported by your browser.");
      }
    });
  }
}

function autoSortByLocation() {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        localStorage.setItem('locationAllowed', 'true');
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        const camerasWithDistance = camerasList.map(camera => ({
          camera,
          distance: computeDistance(userLat, userLng, camera.Latitude, camera.Longitude)
        }));
        camerasWithDistance.sort((a, b) => a.distance - b.distance);
        visibleCameras = camerasWithDistance.map(item => item.camera);
        updateCameraCount();
        renderGallery(visibleCameras);
        currentIndex = 0;
        updateSelectedFilters();
        updateURLParameters();
      },
      (error) => {
        console.error("Location not granted or error:", error);
        renderGallery(visibleCameras);
      }
    );
  }
}

function setupRefreshButton() {
  if (refreshButton) {
    refreshButton.addEventListener("click", (event) => {
      event.preventDefault();
      const images = galleryContainer.querySelectorAll("img");
      images.forEach(img => {
        let originalUrl = img.getAttribute("data-original-src");
        if (!originalUrl) {
          originalUrl = img.src;
          img.setAttribute("data-original-src", originalUrl);
        }
        originalUrl = originalUrl.split("&refresh=")[0].split("?refresh=")[0];
        const separator = originalUrl.includes('?') ? '&' : '?';
        img.src = originalUrl + separator + "refresh=" + Date.now();
      });
    });
  }
}

document.querySelectorAll('[data-modal]').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const modalId = item.getAttribute('data-modal');
    const modal = new bootstrap.Modal(document.getElementById(modalId));
    modal.show();
  });
});

if (sizeControlButton && sizeSliderContainer) {
  sizeControlButton.addEventListener("click", (e) => {
    e.stopPropagation();
    sizeSliderContainer.classList.toggle("active");
    setTimeout(() => { sizeSliderContainer.classList.remove("active"); }, 3000);
  });
}

if (sizeSlider) {
  sizeSlider.addEventListener("input", () => {
    const sliderValue = parseInt(sizeSlider.value, 10);
    const newSize = Math.max(sliderValue, MIN_IMAGE_SIZE);
    galleryContainer.style.gridTemplateColumns = `repeat(auto-fit, minmax(${newSize}px, 1fr))`;
    clearTimeout(sizeSlider.autoHideTimeout);
    sizeSlider.autoHideTimeout = setTimeout(() => { sizeSliderContainer.classList.remove("active"); }, 3000);
  });
}

document.addEventListener("click", (e) => {
  if (!sizeControlButton.contains(e.target) && !sizeSliderContainer.contains(e.target)) {
    sizeSliderContainer.classList.remove("active");
  }
});

let initialGridDistance = null;
let initialGridSize = parseInt(sizeSlider.value, 10) || 120;
galleryContainer.style.touchAction = "pan-y pinch-zoom";
galleryContainer.addEventListener("touchstart", (e) => {
  if (e.touches.length === 2) {
    e.preventDefault();
    initialGridDistance = getDistance(e.touches[0], e.touches[1]);
    initialGridSize = parseInt(sizeSlider.value, 10) || 120;
  }
}, { passive: false });
galleryContainer.addEventListener("touchmove", (e) => {
  if (e.touches.length === 2 && initialGridDistance) {
    e.preventDefault();
    const currentGridDistance = getDistance(e.touches[0], e.touches[1]);
    const scaleFactor = currentGridDistance / initialGridDistance;
    let newGridSize = Math.round(initialGridSize * scaleFactor);
    newGridSize = Math.max(MIN_IMAGE_SIZE, Math.min(newGridSize, parseInt(sizeSlider.max, 10) || 380));
    sizeSlider.value = newGridSize;
    galleryContainer.style.gridTemplateColumns = `repeat(auto-fit, minmax(${newGridSize}px, 1fr))`;
  }
}, { passive: false });
galleryContainer.addEventListener("touchend", (e) => {
  if (e.touches.length < 2) { initialGridDistance = null; }
}, { passive: true });
function getDistance(touch1, touch2) {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

if (searchInput) {
  searchInput.addEventListener("input", debounce((e) => {
    searchQuery = e.target.value;
    filterImages();
  }, DEBOUNCE_DELAY));
}

document.addEventListener('DOMContentLoaded', () => {
  initialize();
  setupNearestCameraButton();
  setupRefreshButton();
  
  const splash = document.getElementById('splashScreen');
  if (splash) {
    const videos = splash.querySelectorAll('video');
    videos.forEach(video => {
      video.addEventListener('playing', () => { setTimeout(fadeOutSplash, 2300); });
    });
  }
  setTimeout(() => { if (splash && splash.style.display !== 'none') { fadeOutSplash(); } }, 4300);
  
  // Custom Code to Toggle Nested Dropdowns
  document.querySelectorAll('.dropdown-submenu > a').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const submenu = this.nextElementSibling;
      if (submenu.classList.contains('show')) {
        submenu.classList.remove('show');
      } else {
        const parentDropdown = this.closest('.dropdown-menu');
        parentDropdown.querySelectorAll('.dropdown-menu.show').forEach(menu => { menu.classList.remove('show'); });
        submenu.classList.add('show');
      }
    });
  });
});
