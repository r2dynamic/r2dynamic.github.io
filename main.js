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

// --- DOM Elements ---
const galleryContainer = document.getElementById("imageGallery");
const imageModalEl = document.getElementById("imageModal");
const modalImage = imageModalEl.querySelector("img");
const modalTitle = document.querySelector(".modal-title");
const cameraCountElement = document.getElementById("cameraCount");
const searchInput = document.getElementById("searchInput");
const cityFilterMenu = document.getElementById("cityFilterMenu");
const regionFilterMenu = document.getElementById("regionFilterMenu");
const cityDropdownButton = document.getElementById("cityDropdownButton");
const regionDropdownButton = document.getElementById("regionDropdownButton");
const routeFilterButton = document.getElementById("routeFilterButton");
const routeFilterMenu = document.getElementById("routeFilterMenu");
const sizeControlButton = document.getElementById("sizeControlButton");
const sizeSliderContainer = document.getElementById("sizeSliderContainer");
const sizeSlider = document.getElementById("sizeSlider");
const imageGallery = document.getElementById("imageGallery");
const nearestButton = document.getElementById("nearestButton");
const refreshButton = document.getElementById("refreshButton");

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

// --- Selected Filters Display ---
// Updates the #selectedFilters container with each active filter on its own line,
// with an icon to the left of bold text.
function updateSelectedFilters() {
  const filtersEl = document.getElementById("selectedFilters");
  filtersEl.innerHTML = "";
  let hasFilters = false;
  
  if (selectedCity) {
    const div = document.createElement("div");
    div.classList.add("selected-filter-item");
    const icon = document.createElement("i");
    // Use the same icon as your header button for city/county:
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
  
  filtersEl.style.display = hasFilters ? "block" : "none";
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
  defaultLi.appendChild(defaultA);
  regionFilterMenu.appendChild(defaultLi);
  Object.keys(regionCities).forEach(region => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.classList.add("dropdown-item");
    a.href = "#";
    a.setAttribute("data-value", region);
    a.textContent = region;
    li.appendChild(a);
    regionFilterMenu.appendChild(li);
  });
}

function updateRouteOptions() {
  routeFilterMenu.innerHTML = '<li><a class="dropdown-item" href="#" data-value="All">All Routes</a></li>';
  curatedRoutes.forEach(route => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.classList.add("dropdown-item");
    a.href = "#";
    a.setAttribute("data-value", route.name);
    a.textContent = route.name;
    li.appendChild(a);
    routeFilterMenu.appendChild(li);
  });
}

function createImageElements() {
  galleryContainer.innerHTML = "";
  camerasList.forEach((camera, index) => {
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

// --- Event Listeners ---
function setupEventListeners() {
  cityFilterMenu.addEventListener("click", function (e) {
    e.preventDefault();
    if (e.target && e.target.matches("a.dropdown-item")) {
      selectedCity = e.target.getAttribute("data-value");
      updateSelectedFilters();
      filterImages();
    }
  });

  regionFilterMenu.addEventListener("click", function (e) {
    e.preventDefault();
    if (e.target && e.target.matches("a.dropdown-item")) {
      selectedRegion = e.target.getAttribute("data-value");
      updateSelectedFilters();
      selectedCity = "";
      updateCityDropdown();
      filterImages();
    }
  });

  routeFilterMenu.addEventListener("click", function (e) {
    e.preventDefault();
    if (e.target && e.target.matches("a.dropdown-item")) {
      selectedRoute = e.target.getAttribute("data-value");
      updateSelectedFilters();
      filterImages();
    }
  });

  searchInput.addEventListener("input", debounce(function () {
    searchQuery = searchInput.value;
    filterImages();
  }, DEBOUNCE_DELAY));

  cameraCountElement.addEventListener("click", () => {
    const versionModalEl = document.getElementById("versionModal");
    if (versionModalEl) {
      const versionModalInstance = new bootstrap.Modal(versionModalEl);
      versionModalInstance.show();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      const modal = bootstrap.Modal.getInstance(imageModalEl);
      if (modal) modal.hide();
    }
  });
}

// --- Additional UI Behaviors ---
function setupAdditionalUI() {
  let hideTimeout;
  function updateImageSize(size) {
    imageGallery.style.gridTemplateColumns = `repeat(auto-fit, minmax(${size}px, 1fr))`;
  }
  
  function showSlider() {
    sizeSliderContainer.classList.add("active");
    sizeSliderContainer.style.maxHeight = "150px";
    sizeSliderContainer.style.opacity = "1";
    clearTimeout(hideTimeout);
  }
  
  function hideSlider() {
    hideTimeout = setTimeout(() => {
      sizeSliderContainer.style.maxHeight = "0px";
      sizeSliderContainer.style.opacity = "0";
      sizeSliderContainer.classList.remove("active");
    }, 2000);
  }
  
  sizeControlButton.addEventListener("click", () => {
    if (sizeSliderContainer.classList.contains("active")) {
      hideSlider();
    } else {
      showSlider();
    }
  });
  
  sizeSlider.addEventListener("input", () => {
    let newSize = parseInt(sizeSlider.value, 10);
    newSize = Math.max(30, Math.min(newSize, 380));
    updateImageSize(newSize);
    sizeSlider.value = newSize;
    showSlider();
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  });
  
  sizeSlider.addEventListener("change", hideSlider);
  
  document.addEventListener("click", function (event) {
    if (sizeSliderContainer.classList.contains("active")) {
      if (!sizeSliderContainer.contains(event.target) && !sizeControlButton.contains(event.target)) {
        hideSlider();
      }
    }
  });
  
  // --- Pinch-to-Zoom Support with Damping ---
  function setupPinchToZoom() {
    let initialDistance = null;
    let initialSize = parseInt(sizeSlider.value, 10) || 125;
    
    imageGallery.addEventListener("touchstart", function (e) {
      if (e.touches.length === 2) {
        initialDistance = getDistance(e.touches[0], e.touches[1]);
        initialSize = parseInt(sizeSlider.value, 10) || 125;
        e.preventDefault();
      }
    });
    
    imageGallery.addEventListener("touchmove", function (e) {
      if (e.touches.length === 2 && initialDistance !== null) {
        const newDistance = getDistance(e.touches[0], e.touches[1]);
        let scaleFactor = newDistance / initialDistance;
        const damping = 0.8;
        scaleFactor = 1 + ((scaleFactor - 1) * damping);
        let newSize = Math.round(initialSize * scaleFactor);
        newSize = Math.max(30, Math.min(newSize, 380));
        requestAnimationFrame(() => {
          updateImageSize(newSize);
        });
        sizeSlider.value = newSize;
        e.preventDefault();
      }
    });
    
    imageGallery.addEventListener("touchend", function (e) {
      if (e.touches.length < 2) {
        initialDistance = null;
      }
    });
  }
  
  function getDistance(touch1, touch2) {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  setupPinchToZoom();
  
  if (imageModalEl) {
    imageModalEl.addEventListener('hidden.bs.modal', () => {
      imageModalEl.classList.remove("fade");
      void imageModalEl.offsetWidth;
      imageModalEl.classList.add("fade");
    });
  }
  
  document.querySelectorAll('.button').forEach(btn => {
    btn.addEventListener('click', () => {
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    });
  });
  
  const modalDialog = imageModalEl.querySelector(".draggable-modal");
  const modalHeader = imageModalEl.querySelector(".modal-header");
  if (modalDialog && modalHeader) {
    let isDragging = false, offsetX = 0, offsetY = 0;
    
    modalHeader.addEventListener("mousedown", function (e) {
      isDragging = true;
      const rect = modalDialog.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      modalDialog.style.transition = "none";
    });
    
    document.addEventListener("mousemove", function (e) {
      if (isDragging) {
        modalDialog.style.left = (e.clientX - offsetX) + "px";
        modalDialog.style.top = (e.clientY - offsetY) + "px";
      }
    });
    
    document.addEventListener("mouseup", function () {
      isDragging = false;
      modalDialog.style.transition = "";
    });
    
    imageModalEl.addEventListener("shown.bs.modal", function () {
      modalDialog.style.left = "";
      modalDialog.style.top = "";
    });
  }
}

// --- Initialization ---
function initialize() {
  Promise.all([getCamerasList(), getCuratedRoutes()]).then(results => {
    camerasList = results[0];
    curatedRoutes = results[1];
    // Default view: full grid in JSON order
    visibleCameras = camerasList;
    updateCityDropdown();
    populateRegionDropdown();
    updateRouteOptions();
    createImageElements();
    filterImages();
    setupEventListeners();
    setupAdditionalUI();
    setupNearestCameraButton();
    setupRefreshButton();
    // Auto-sort full grid by location on load (if permission is granted)
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
  });
}

document.addEventListener('DOMContentLoaded', initialize);

document.addEventListener('DOMContentLoaded', () => {
  // Wait 8 seconds, then fade out the splash screen
  setTimeout(() => {
    const splash = document.getElementById('splashScreen');
    if (splash) {
      splash.classList.add('fade-out');
      // After fade-out transition (1s), remove the splash screen from view
      setTimeout(() => {
        splash.style.display = 'none';
      }, 1000);
    }
  }, 8000);
});
