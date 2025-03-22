// main.js
// Main module that imports data fetching functions, constants, and handles UI and events

import { getCamerasList, getCuratedRoutes } from './cameraData.js';
import { cityFullNames, regionCities } from './cityList.js';

// --- Constants ---
const DEBOUNCE_DELAY = 300;
const MIN_IMAGE_SIZE = 80; // Enforced minimum grid image size

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
// Loads data immediately.
function initialize() {
  // Load cameras data
  getCamerasList()
    .then(data => {
      camerasList = data;
      visibleCameras = camerasList.slice();
      renderGallery(visibleCameras);
      updateCameraCount();
      updateCityDropdown();
      populateRegionDropdown();
    })
    .catch(err => console.error("Error loading cameras:", err));

  // Load curated routes if needed.
  getCuratedRoutes()
    .then(routes => {
      curatedRoutes = routes;
      updateRouteOptions();
    })
    .catch(err => console.error("Error loading curated routes:", err));
}

// --- Function to Reveal Main Content ---
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

// --- Splash Screen Fade-Out ---
// Triggered to fade out the splash screen.
function fadeOutSplash() {
  const splash = document.getElementById('splashScreen');
  if (splash) {
    // Reveal main content immediately
    revealMainContent();
    splash.classList.add('fade-out'); // CSS animation will run
    splash.addEventListener('animationend', () => {
      splash.style.display = 'none';
    });
  }
}

// --- DOM Elements ---
const galleryContainer = document.getElementById("imageGallery");
const imageModalEl = document.getElementById("imageModal");
const modalImage = imageModalEl.querySelector("img");
const modalTitle = document.querySelector(".modal-title");
const cameraCountElement = document.getElementById("cameraCount");
const searchInput = document.getElementById("searchInput");
const cityFilterMenu = document.getElementById("cityFilterMenu");
const regionFilterMenu = document.getElementById("regionFilterMenu");
const routeFilterMenu = document.getElementById("routeFilterMenu");
const nearestButton = document.getElementById("nearestButton");
const refreshButton = document.getElementById("refreshButton");
const sizeSlider = document.getElementById("sizeSlider");
const sizeControlButton = document.getElementById("sizeControlButton");
const sizeSliderContainer = document.getElementById("sizeSliderContainer");

// --- Modal Map Toggle Elements ---
const mapButton = document.getElementById("mapButton");
const modalBody = document.getElementById("modalBody");
const modalImageContainer = document.getElementById("modalImageContainer");
let mapDisplayed = false; // Tracks if the map is shown

// Set up the map toggle in the modal.
if (mapButton) {
  mapButton.addEventListener("click", () => {
    if (!mapDisplayed) {
      const lat = modalImage.dataset.latitude;
      const lon = modalImage.dataset.longitude;
      if (!lat || !lon) {
        alert("No location data available for this camera.");
        return;
      }
      const mapContainer = document.createElement("div");
      mapContainer.id = "modalMapContainer";
      mapContainer.style.flex = "1"; // Equal flex value
      const iframe = document.createElement("iframe");
      iframe.width = "100%";
      iframe.height = "100%";
      iframe.frameBorder = "0";
      iframe.style.border = "0";
      // Use satellite view (&t=k)
      iframe.src = `https://maps.google.com/maps?q=${lat},${lon}&z=15&t=k&output=embed`;
      mapContainer.appendChild(iframe);
      modalBody.appendChild(mapContainer);
      modalImageContainer.style.flex = "1";
      modalBody.style.display = "flex";
      mapButton.textContent = "Hide Map";
      mapDisplayed = true;
    } else {
      const mapContainer = document.getElementById("modalMapContainer");
      if (mapContainer) {
        modalBody.removeChild(mapContainer);
      }
      modalImageContainer.style.flex = "1";
      mapButton.textContent = "Map";
      mapDisplayed = false;
    }
  });
}

// Ensure the map closes when the modal is hidden.
if (imageModalEl) {
  imageModalEl.addEventListener("hidden.bs.modal", () => {
    const mapContainer = document.getElementById("modalMapContainer");
    if (mapContainer) {
      modalBody.removeChild(mapContainer);
    }
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
function toRadians(deg) {
  return deg * Math.PI / 180;
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
  const filtersEl = document.getElementById("selectedFilters");
  filtersEl.innerHTML = "";
  let hasFilters = false;

  if (selectedCity) {
    const div = document.createElement("div");
    div.classList.add("selected-filter-item");
    const icon = document.createElement("i");
    icon.className = "fas fa-map-marked-alt";
    const span = document.createElement("span");
    let cityText = "City/County: " + selectedCity;
    if (cityFullNames[selectedCity]) {
      cityText += " (" + cityFullNames[selectedCity] + ")";
    }
    span.textContent = cityText;
    div.appendChild(icon);
    div.appendChild(span);
    filtersEl.appendChild(div);
    hasFilters = true;
  }

  if (selectedRegion) {
    const div = document.createElement("div");
    div.classList.add("selected-filter-item");
    const icon = document.createElement("i");
    icon.className = "fas fa-industry";
    const span = document.createElement("span");
    span.textContent = "Region: " + selectedRegion;
    div.appendChild(icon);
    div.appendChild(span);
    filtersEl.appendChild(div);
    hasFilters = true;
  }

  if (selectedRoute && selectedRoute !== "All") {
    const div = document.createElement("div");
    div.classList.add("selected-filter-item");
    const icon = document.createElement("i");
    icon.className = "fas fa-road";
    const span = document.createElement("span");
    span.textContent = "Route: " + selectedRoute;
    div.appendChild(icon);
    div.appendChild(span);
    filtersEl.appendChild(div);
    hasFilters = true;
  }

  // Add search query as a filter if it's non-empty.
  if (searchQuery && searchQuery.trim().length > 0) {
    const div = document.createElement("div");
    div.classList.add("selected-filter-item");
    const icon = document.createElement("i");
    icon.className = "fas fa-search";
    const span = document.createElement("span");
    span.textContent = "Name: " + searchQuery;
    div.appendChild(icon);
    div.appendChild(span);
    filtersEl.appendChild(div);
    hasFilters = true;
  }

  if (hasFilters) {
    const resetButton = document.createElement("button");
    resetButton.innerHTML = '<i class="fas fa-undo"></i>';
    resetButton.classList.add("reset-button");
    resetButton.addEventListener("click", resetFilters);
    filtersEl.appendChild(resetButton);
  }
  filtersEl.style.display = hasFilters ? "block" : "none";
}

function resetFilters() {
  selectedCity = "";
  selectedRegion = "";
  searchQuery = "";
  selectedRoute = "All";
  searchInput.value = "";
  updateCityDropdown();
  // If location permission is allowed, revert to the location-based view.
  if (localStorage.getItem('locationAllowed') === 'true') {
    autoSortByLocation();
  } else {
    filterImages();
  }
  updateSelectedFilters();
}

// --- Dropdown & Gallery Setup ---
function updateCityDropdown() {
  const cities = camerasList.map(camera => camera.Location.split(",").pop().trim());
  const uniqueCities = [...new Set(cities.filter(city => city.length <= 4))];
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
  let filteredCities = uniqueCities;
  if (selectedRegion && regionCities[selectedRegion]) {
    filteredCities = uniqueCities.filter(city => regionCities[selectedRegion].includes(city));
  }
  filteredCities.sort().forEach(city => {
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
    a.setAttribute("data-value", route.name);
    a.textContent = route.name;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      selectedRoute = route.name;
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
  // Store location data for the map toggle.
  modalImage.dataset.latitude = camera.Latitude;
  modalImage.dataset.longitude = camera.Longitude;
  const selectedBox = galleryContainer.children[index].querySelector(".aspect-ratio-box");
  if (selectedBox) selectedBox.classList.add("selected");
}

// --- Filtering ---
function filterImages() {
  visibleCameras = camerasList.filter(camera => {
    const city = camera.Location.split(",").pop().trim();
    const matchesCity = !selectedCity || city === selectedCity;
    const matchesRegion = !selectedRegion || (regionCities[selectedRegion] && regionCities[selectedRegion].includes(city));
    const matchesSearch = camera.Location.toLowerCase().includes(searchQuery.toLowerCase());
    let routeMatches = true;
    if (selectedRoute !== "All") {
      const routeObj = curatedRoutes.find(route => route.name === selectedRoute);
      if (routeObj) {
        routeMatches = routeObj.locations.includes(camera.Location);
      }
    }
    return matchesCity && matchesRegion && matchesSearch && routeMatches;
  });
  if (selectedRoute !== "All") {
    const routeObj = curatedRoutes.find(route => route.name === selectedRoute);
    if (routeObj) {
      visibleCameras.sort((a, b) => {
        const indexA = routeObj.locations.indexOf(a.Location);
        const indexB = routeObj.locations.indexOf(b.Location);
        return indexA - indexB;
      });
    }
  }
  updateCameraCount();
  renderGallery(visibleCameras);
  currentIndex = 0;
  updateSelectedFilters();
}

// --- Nearest Cameras Feature (all cameras sorted by distance) ---
function setupNearestCameraButton() {
  if (nearestButton) {
    nearestButton.addEventListener("click", () => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            // Store flag when location is successfully retrieved.
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
          },
          (error) => {
            alert("Error getting your location: " + error.message);
          }
        );
      } else {
        alert("Geolocation is not supported by your browser.");
      }
    });
  }
}

// --- Auto-Sort Full Grid by Location on Load ---
function autoSortByLocation() {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Store flag when location is successfully retrieved.
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
      },
      (error) => {
        console.error("Location not granted or error:", error);
      }
    );
  }
}

// --- Refresh Button Feature ---
function setupRefreshButton() {
  if (refreshButton) {
    refreshButton.addEventListener("click", (event) => {
      event.preventDefault(); // Prevent any default behavior
      // Loop through all currently displayed images and refresh their src attribute
      const images = galleryContainer.querySelectorAll("img");
      images.forEach(img => {
        // Get or set the original URL to avoid stacking refresh parameters
        let originalUrl = img.getAttribute("data-original-src");
        if (!originalUrl) {
          originalUrl = img.src;
          img.setAttribute("data-original-src", originalUrl);
        }
        // Remove any existing refresh parameter to keep the URL clean
        originalUrl = originalUrl.split("&refresh=")[0].split("?refresh=")[0];
        // Append a timestamp as a query parameter to force a refresh
        const separator = originalUrl.includes('?') ? '&' : '?';
        img.src = originalUrl + separator + "refresh=" + Date.now();
      });
    });
  }
}





// --- Image Size Slider ---
if (sizeControlButton && sizeSliderContainer) {
  sizeControlButton.addEventListener("click", (e) => {
    e.stopPropagation();
    sizeSliderContainer.classList.toggle("active");
    setTimeout(() => {
      sizeSliderContainer.classList.remove("active");
    }, 3000);
  });
}
if (sizeSlider) {
  sizeSlider.addEventListener("input", () => {
    const sliderValue = parseInt(sizeSlider.value, 10);
    const newSize = Math.max(sliderValue, MIN_IMAGE_SIZE);
    galleryContainer.style.gridTemplateColumns = `repeat(auto-fit, minmax(${newSize}px, 1fr))`;
    clearTimeout(sizeSlider.autoHideTimeout);
    sizeSlider.autoHideTimeout = setTimeout(() => {
      sizeSliderContainer.classList.remove("active");
    }, 3000);
  });
}
document.addEventListener("click", (e) => {
  if (!sizeControlButton.contains(e.target) && !sizeSliderContainer.contains(e.target)) {
    sizeSliderContainer.classList.remove("active");
  }
});

// --- Pinch-to-Zoom for Image Grid ---
// Allows pinch-to-zoom on the gallery container (adjusts grid image size)
let initialGridDistance = null;
let initialGridSize = parseInt(sizeSlider.value, 10) || 120;
galleryContainer.style.touchAction = "pan-y pinch-zoom";
galleryContainer.addEventListener("touchstart", (e) => {
  if (e.touches.length === 2) {
    // Only prevent default if two fingers are used.
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
  if (e.touches.length < 2) {
    initialGridDistance = null;
  }
}, { passive: true });
function getDistance(touch1, touch2) {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

// --- Search Input Event Listener ---
if (searchInput) {
  searchInput.addEventListener("input", debounce((e) => {
    searchQuery = e.target.value;
    filterImages();
  }, DEBOUNCE_DELAY));
}

// --- Main Initialization & Splash Setup ---
document.addEventListener('DOMContentLoaded', () => {
  initialize();
  setupNearestCameraButton();
  setupRefreshButton();

  // Check the stored flag for location permission (for iOS) or use Permissions API.
  if (localStorage.getItem('locationAllowed') === 'true') {
    autoSortByLocation();
  } else if (navigator.permissions) {
    navigator.permissions.query({ name: 'geolocation' }).then((result) => {
      if (result.state === 'granted') {
        autoSortByLocation();
      }
    });
  }

  // Trigger fade-out 2500ms into the video.
  const splash = document.getElementById('splashScreen');
  if (splash) {
    const videos = splash.querySelectorAll('video');
    videos.forEach(video => {
      video.addEventListener('playing', () => {
        setTimeout(fadeOutSplash, 2200);
      });
    });
  }
  // Fallback if video never ends.
  setTimeout(() => {
    const splash = document.getElementById('splashScreen');
    if (splash && splash.style.display !== 'none') {
      fadeOutSplash();
    }
  }, 5000);
});
