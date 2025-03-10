// main.js
// Main module that imports data fetching functions, constants, and handles UI and events

import { getCamerasList, getCuratedRoutes } from './cameraData.js';
import { cityFullNames, regionCities } from './cityList.js';

// --- Constants ---
const DEBOUNCE_DELAY = 300;

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

// Variables for pinch-to-zoom
let initialDistance = null;
let initialScale = 1;

// --- Initialize Function ---
// Loads data immediately.
function initialize() {
  // Load the cameras data
  getCamerasList()
    .then(data => {
      camerasList = data;
      visibleCameras = camerasList.slice();
      renderGallery(visibleCameras);
      updateCameraCount();
      updateCityDropdown();
      populateRegionDropdown();
    })
    .catch(err => {
      console.error("Error loading cameras:", err);
    });

  // Load curated routes if needed.
  getCuratedRoutes()
    .then(routes => {
      curatedRoutes = routes;
      updateRouteOptions();
    })
    .catch(err => {
      console.error("Error loading curated routes:", err);
    });
}

// --- Function to Reveal Main Content ---
// Removes the hidden-on-load class and adds fade-in.
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
// Reveals main content immediately, then fades out the splash.
function fadeOutSplash() {
  const splash = document.getElementById('splashScreen');
  if (splash) {
    // Reveal main content immediately
    revealMainContent();
    // Start fading out the splash overlay
    splash.classList.add('fade-out');
    // After the fade-out transition, remove the splash completely
    setTimeout(() => {
      splash.style.display = 'none';
    }, 2500); // Adjust to match your splash fade-out transition duration
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
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
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
  filterImages();
  updateSelectedFilters();
}

// --- Dropdown & Gallery Setup ---
function updateCityDropdown() {
  const cities = camerasList.map(camera => camera.Location.split(",").pop().trim());
  const uniqueCities = [...new Set(cities.filter(city => city.length <= 4))];
  cityFilterMenu.innerHTML = "";
  
  // Default "All" option
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
  // Default "All Regions" option
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
  // Default "All Routes" option
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

// --- Nearest Cameras Feature (6 nearest) ---
function setupNearestCameraButton() {
  if (nearestButton) {
    nearestButton.addEventListener("click", () => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            const camerasWithDistance = camerasList.map(camera => ({
              camera,
              distance: computeDistance(userLat, userLng, camera.Latitude, camera.Longitude)
            }));
            camerasWithDistance.sort((a, b) => a.distance - b.distance);
            visibleCameras = camerasWithDistance.slice(0, 6).map(item => item.camera);
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
    refreshButton.addEventListener("click", () => {
      renderGallery(visibleCameras);
    });
  }
}

// --- Image Size Slider ---
// Toggle the slider dropdown when clicking on the size control button.
if (sizeControlButton && sizeSliderContainer) {
  sizeControlButton.addEventListener("click", (e) => {
    e.stopPropagation();
    sizeSliderContainer.classList.toggle("active");
    setTimeout(() => {
      sizeSliderContainer.classList.remove("active");
    }, 3000);
  });
}

// Listen for slider changes to update grid columns.
if (sizeSlider) {
  sizeSlider.addEventListener("input", () => {
    const newSize = sizeSlider.value;
    galleryContainer.style.gridTemplateColumns = `repeat(auto-fit, minmax(${newSize}px, 1fr))`;
    clearTimeout(sizeSlider.autoHideTimeout);
    sizeSlider.autoHideTimeout = setTimeout(() => {
      sizeSliderContainer.classList.remove("active");
    }, 3000);
  });
}

// Global click listener to hide the slider dropdown if clicking outside.
document.addEventListener("click", (e) => {
  if (!sizeControlButton.contains(e.target) && !sizeSliderContainer.contains(e.target)) {
    sizeSliderContainer.classList.remove("active");
  }
});

// --- Pinch-to-Zoom for Modal Image ---
if (modalImage) {
  modalImage.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
      initialDistance = getDistance(e.touches[0], e.touches[1]);
      const transform = window.getComputedStyle(modalImage).transform;
      if (transform && transform !== "none") {
        const values = transform.split('(')[1].split(')')[0].split(',');
        initialScale = parseFloat(values[0]) || 1;
      } else {
        initialScale = 1;
      }
    }
  }, { passive: true });

  modalImage.addEventListener("touchmove", (e) => {
    if (e.touches.length === 2 && initialDistance) {
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const scale = (currentDistance / initialDistance) * initialScale;
      modalImage.style.transform = `scale(${scale})`;
      e.preventDefault();  // Now this works because the listener is non-passive.
    }
  }, { passive: false });

  modalImage.addEventListener("touchend", (e) => {
    if (e.touches.length < 2) {
      const transform = window.getComputedStyle(modalImage).transform;
      if (transform && transform !== "none") {
        const values = transform.split('(')[1].split(')')[0].split(',');
        initialScale = parseFloat(values[0]) || 1;
      }
      initialDistance = null;
    }
  }, { passive: true });
}

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
  // Initialize data immediately.
  initialize();
  setupNearestCameraButton();
  setupRefreshButton();

  // Set up splash video event: fade out the splash screen (while main content is revealed concurrently).
  const splash = document.getElementById('splashScreen');
  if (splash) {
    const videos = splash.querySelectorAll('video');
    videos.forEach(video => {
      video.addEventListener('ended', fadeOutSplash);
    });
  }
  
  // Fallback if the video never ends.
  setTimeout(() => {
    const splash = document.getElementById('splashScreen');
    if (splash && splash.style.display !== 'none') {
      fadeOutSplash();
    }
  }, 6000);
});
