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
const modalImage = document.getElementById("imageModal").querySelector("img");
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

// --- Utility Functions ---
function debounce(func, delay) {
  return function(...args) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => func.apply(this, args), delay);
  };
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
}

// --- Modal Enhancements ---
function setupModalEnhancements() {
  const imageModal = document.getElementById("imageModal");
  if (!imageModal) return;
  const modalDialog = imageModal.querySelector(".draggable-modal");
  const modalContent = imageModal.querySelector(".glass-modal");

  // 1. Reset animation on show
  imageModal.addEventListener("shown.bs.modal", () => {
    modalContent.classList.remove("modal-animate");
    // Force reflow
    void modalContent.offsetWidth;
    modalContent.classList.add("modal-animate");
    // Reset modal position
    modalDialog.style.left = "";
    modalDialog.style.top = "";
  });

  // Helper clamp function
  function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
  }

  // 2. Draggable & Fling Support with boundaries
  let isDragging = false;
  let startX, startY, initialLeft, initialTop;
  let lastTouchTime = 0, lastTouchX = 0, lastTouchY = 0;
  let velocityX = 0, velocityY = 0;

  // Desktop dragging
  modalContent.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    initialLeft = modalDialog.offsetLeft;
    initialTop = modalDialog.offsetTop;
    e.preventDefault();
  });
  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    let dx = e.clientX - startX;
    let dy = e.clientY - startY;
    let newLeft = clamp(initialLeft + dx, 0, window.innerWidth - modalDialog.offsetWidth);
    let newTop = clamp(initialTop + dy, 0, window.innerHeight - modalDialog.offsetHeight);
    modalDialog.style.left = newLeft + "px";
    modalDialog.style.top = newTop + "px";
  });
  document.addEventListener("mouseup", () => {
    isDragging = false;
  });

  // Mobile dragging & fling
  modalContent.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      isDragging = true;
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      initialLeft = modalDialog.offsetLeft;
      initialTop = modalDialog.offsetTop;
      lastTouchTime = Date.now();
      lastTouchX = touch.clientX;
      lastTouchY = touch.clientY;
    }
  });
  modalContent.addEventListener("touchmove", (e) => {
    if (isDragging && e.touches.length === 1) {
      const touch = e.touches[0];
      let dx = touch.clientX - startX;
      let dy = touch.clientY - startY;
      let newLeft = clamp(initialLeft + dx, 0, window.innerWidth - modalDialog.offsetWidth);
      let newTop = clamp(initialTop + dy, 0, window.innerHeight - modalDialog.offsetHeight);
      modalDialog.style.left = newLeft + "px";
      modalDialog.style.top = newTop + "px";
      let now = Date.now();
      let dt = now - lastTouchTime;
      if (dt > 0) {
        velocityX = (touch.clientX - lastTouchX) / dt;
        velocityY = (touch.clientY - lastTouchY) / dt;
        lastTouchTime = now;
        lastTouchX = touch.clientX;
        lastTouchY = touch.clientY;
      }
      e.preventDefault();
    }
  });
  modalContent.addEventListener("touchend", (e) => {
    if (isDragging) {
      isDragging = false;
      let speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
      if (speed > 0.3) {
        applyFling(modalDialog, velocityX * 100, velocityY * 100);
      }
    }
  });

  function applyFling(element, initialVX, initialVY) {
    let vx = initialVX;
    let vy = initialVY;
    const friction = 0.95;
    function step() {
      vx *= friction;
      vy *= friction;
      let newLeft = clamp(element.offsetLeft + vx * 0.016, 0, window.innerWidth - element.offsetWidth);
      let newTop = clamp(element.offsetTop + vy * 0.016, 0, window.innerHeight - element.offsetHeight);
      element.style.left = newLeft + "px";
      element.style.top = newTop + "px";
      if (Math.abs(vx) > 0.5 || Math.abs(vy) > 0.5) {
        requestAnimationFrame(step);
      }
    }
    requestAnimationFrame(step);
  }

  // 3. Resizable Modal
  // Create a resizer element in the bottom-right corner if not already present
  let resizer = modalDialog.querySelector(".modal-resizer");
  if (!resizer) {
    resizer = document.createElement("div");
    resizer.classList.add("modal-resizer");
    modalDialog.appendChild(resizer);
  }
  let isResizing = false;
  let resizeStartX, resizeStartY, startWidth, startHeight;
  resizer.addEventListener("mousedown", (e) => {
    isResizing = true;
    resizeStartX = e.clientX;
    resizeStartY = e.clientY;
    startWidth = modalDialog.offsetWidth;
    startHeight = modalDialog.offsetHeight;
    e.preventDefault();
    e.stopPropagation();
  });
  document.addEventListener("mousemove", (e) => {
    if (!isResizing) return;
    let dx = e.clientX - resizeStartX;
    let dy = e.clientY - resizeStartY;
    let newWidth = startWidth + dx;
    let newHeight = startHeight + dy;
    newWidth = Math.max(200, newWidth);
    newHeight = Math.max(200, newHeight);
    newWidth = Math.min(newWidth, window.innerWidth - modalDialog.offsetLeft);
    newHeight = Math.min(newHeight, window.innerHeight - modalDialog.offsetTop);
    modalDialog.style.width = newWidth + "px";
    modalDialog.style.height = newHeight + "px";
    e.preventDefault();
  });
  document.addEventListener("mouseup", () => {
    if (isResizing) isResizing = false;
  });

  // Mobile pinch-to-resize for modal
  let initialPinchDistance = null;
  let initialModalWidth = null;
  let initialModalHeight = null;
  modalDialog.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
      initialPinchDistance = getDistance(e.touches[0], e.touches[1]);
      initialModalWidth = modalDialog.offsetWidth;
      initialModalHeight = modalDialog.offsetHeight;
      e.preventDefault();
    }
  });
  modalDialog.addEventListener("touchmove", (e) => {
    if (e.touches.length === 2 && initialPinchDistance) {
      const newDistance = getDistance(e.touches[0], e.touches[1]);
      const scaleFactor = newDistance / initialPinchDistance;
      let newWidth = initialModalWidth * scaleFactor;
      let newHeight = initialModalHeight * scaleFactor;
      newWidth = Math.max(200, Math.min(newWidth, window.innerWidth - modalDialog.offsetLeft));
      newHeight = Math.max(200, Math.min(newHeight, window.innerHeight - modalDialog.offsetTop));
      modalDialog.style.width = newWidth + "px";
      modalDialog.style.height = newHeight + "px";
      e.preventDefault();
    }
  });
  modalDialog.addEventListener("touchend", (e) => {
    if (e.touches.length < 2) {
      initialPinchDistance = null;
    }
  });
}

function getDistance(t1, t2) {
  const dx = t2.clientX - t1.clientX;
  const dy = t2.clientY - t1.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

// --- Additional UI Behaviors (Slider, etc.) ---
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
  
  document.addEventListener("click", function(event) {
    if (sizeSliderContainer.classList.contains("active")) {
      if (!sizeSliderContainer.contains(event.target) && !sizeControlButton.contains(event.target)) {
        hideSlider();
      }
    }
  });
  
  document.querySelectorAll('.button').forEach(btn => {
    btn.addEventListener('click', () => {
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    });
  });
  
  // Set up modal enhancements
  setupModalEnhancements();
}

// --- Event Listeners ---
function setupEventListeners() {
  cityFilterMenu.addEventListener("click", function(e) {
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

  regionFilterMenu.addEventListener("click", function(e) {
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

  routeFilterMenu.addEventListener("click", function(e) {
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

  searchInput.addEventListener("input", debounce(function() {
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
      const modal = bootstrap.Modal.getInstance(document.getElementById("imageModal"));
      if (modal) modal.hide();
    }
  });
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
  });
}

document.addEventListener('DOMContentLoaded', initialize);
