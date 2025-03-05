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
const nearestButton = document.getElementById("nearestButton"); // New button for nearest camera

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
  const R = 6371; // Radius of the earth in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function findNearestCamera(userLat, userLng) {
  let nearestCamera = null;
  let minDistance = Infinity;
  camerasList.forEach(camera => {
    const lat = camera.Latitude;
    const lng = camera.Longitude;
    const d = computeDistance(userLat, userLng, lat, lng);
    if (d < minDistance) {
      minDistance = d;
      nearestCamera = camera;
    }
  });
  return nearestCamera;
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

  // If a curated route is selected, sort visibleCameras in the order defined in the route list
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
}

// --- Nearest Camera Feature ---
function setupNearestCameraButton() {
  if (nearestButton) {
    nearestButton.addEventListener("click", () => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            const nearestCamera = findNearestCamera(userLat, userLng);
            if (nearestCamera) {
              // Reset filters to show all cameras
              selectedCity = "";
              selectedRegion = "";
              searchQuery = "";
              selectedRoute = "All";
              filterImages();
              // Find the index of the nearest camera in visibleCameras (which equals camerasList if no filter)
              const index = visibleCameras.findIndex(camera => camera.Id === nearestCamera.Id);
              if (index >= 0) {
                showImage(index);
              } else {
                console.error("Nearest camera not found in visible cameras.");
              }
            }
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

// --- Event Listeners ---
function setupEventListeners() {
  cityFilterMenu.addEventListener("click", function (e) {
    e.preventDefault();
    if (e.target && e.target.matches("a.dropdown-item")) {
      selectedCity = e.target.getAttribute("data-value");
      cityDropdownButton.innerHTML = `<i class="fas fa-map-marked-alt"></i>`;
      if (e.target.textContent !== "All") {
        cityDropdownButton.innerHTML += ` ${e.target.textContent}`;
      }
      filterImages();
    }
  });

  regionFilterMenu.addEventListener("click", function (e) {
    e.preventDefault();
    if (e.target && e.target.matches("a.dropdown-item")) {
      selectedRegion = e.target.getAttribute("data-value");
      regionDropdownButton.innerHTML = `<i class="fas fa-industry"></i>`;
      if (e.target.textContent !== "All Regions") {
        regionDropdownButton.innerHTML += ` ${e.target.textContent}`;
      }
      selectedCity = "";
      cityDropdownButton.innerHTML = `<i class="fas fa-map-marked-alt"></i>`;
      updateCityDropdown();
      filterImages();
    }
  });

  routeFilterMenu.addEventListener("click", function (e) {
    e.preventDefault();
    if (e.target && e.target.matches("a.dropdown-item")) {
      selectedRoute = e.target.getAttribute("data-value");
      routeFilterButton.innerHTML = `<i class="fas fa-road"></i>`;
      if (e.target.textContent !== "All Routes") {
        routeFilterButton.innerHTML += ` ${e.target.textContent}`;
      }
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
    // Only handle Escape key to close the modal
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

  // Updated slider handler that clamps size to a safe minimum (30)
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

  // --- Pinch-to-Zoom Support ---
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
        const scaleFactor = newDistance / initialDistance;
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

  // Modal Fade Reset for consistent animation on mobile:
  if (imageModalEl) {
    imageModalEl.addEventListener('hidden.bs.modal', () => {
      imageModalEl.classList.remove("fade");
      // Force reflow to reset animation
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

  // --- Draggable Modal ---
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
    updateCityDropdown();
    populateRegionDropdown();
    updateRouteOptions();
    createImageElements();
    filterImages();
    setupEventListeners();
    setupAdditionalUI();
    setupNearestCameraButton();
  });
}

document.addEventListener('DOMContentLoaded', initialize);
