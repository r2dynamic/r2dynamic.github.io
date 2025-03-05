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

  // If a curated route is selected, sort visibleCameras per the route order.
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
      const modalInstance = bootstrap.Modal.getInstance(imageModalEl);
      if (modalInstance) modalInstance.hide();
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
    // Clamp the slider value between 30 and 380
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
  
  // --- Modal Animation Fix ---
  // On mobile, force reflow on each modal show to retrigger the fade animation.
  if (imageModalEl) {
    imageModalEl.addEventListener("show.bs.modal", function() {
      this.classList.remove("fade");
      void this.offsetWidth;
      this.classList.add("fade");
    });
  }
  
  // --- Modal Dragging Support (Mouse & Touch) ---
  const modalDialog = imageModalEl.querySelector(".draggable-modal");
  const modalHeader = imageModalEl.querySelector(".modal-header");
  if (modalDialog && modalHeader) {
    let isDragging = false, offsetX = 0, offsetY = 0;
    
    // Mouse events
    modalHeader.addEventListener("mousedown", function(e) {
      isDragging = true;
      const rect = modalDialog.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      modalDialog.style.transition = "none";
      e.preventDefault();
    });
    document.addEventListener("mousemove", function(e) {
      if (isDragging) {
        modalDialog.style.left = (e.clientX - offsetX) + "px";
        modalDialog.style.top = (e.clientY - offsetY) + "px";
      }
    });
    document.addEventListener("mouseup", function() {
      isDragging = false;
      modalDialog.style.transition = "";
    });
    
    // Touch events for mobile dragging
    modalHeader.addEventListener("touchstart", function(e) {
      if (e.touches.length === 1) {
        isDragging = true;
        const rect = modalDialog.getBoundingClientRect();
        offsetX = e.touches[0].clientX - rect.left;
        offsetY = e.touches[0].clientY - rect.top;
        modalDialog.style.transition = "none";
        e.preventDefault();
      }
    });
    document.addEventListener("touchmove", function(e) {
      if (isDragging && e.touches.length === 1) {
        modalDialog.style.left = (e.touches[0].clientX - offsetX) + "px";
        modalDialog.style.top = (e.touches[0].clientY - offsetY) + "px";
        e.preventDefault();
      }
    });
    document.addEventListener("touchend", function() {
      isDragging = false;
      modalDialog.style.transition = "";
    });
    
    // Reset position when modal is shown
    imageModalEl.addEventListener("shown.bs.modal", function() {
      modalDialog.style.left = "";
      modalDialog.style.top = "";
    });
  }
  
  // --- Modal Resizing Support ---
  function setupModalResize() {
    if (!modalDialog) return;
    let isResizing = false;
    let startWidth, startHeight, startX, startY;
    
    // Create a resize handle if it doesn't exist
    let resizeHandle = modalDialog.querySelector(".resize-handle");
    if (!resizeHandle) {
      resizeHandle = document.createElement("div");
      resizeHandle.classList.add("resize-handle");
      // Style the handle
      resizeHandle.style.position = "absolute";
      resizeHandle.style.width = "20px";
      resizeHandle.style.height = "20px";
      resizeHandle.style.right = "0";
      resizeHandle.style.bottom = "0";
      resizeHandle.style.cursor = "nwse-resize";
      resizeHandle.style.background = "rgba(0,0,0,0.3)";
      modalDialog.appendChild(resizeHandle);
    }
    
    function startResize(e) {
      isResizing = true;
      startWidth = modalDialog.offsetWidth;
      startHeight = modalDialog.offsetHeight;
      startX = e.clientX || e.touches[0].clientX;
      startY = e.clientY || e.touches[0].clientY;
      e.preventDefault();
    }
    
    function performResize(e) {
      if (!isResizing) return;
      const clientX = e.clientX || e.touches[0].clientX;
      const clientY = e.clientY || e.touches[0].clientY;
      const dx = clientX - startX;
      const dy = clientY - startY;
      modalDialog.style.width = startWidth + dx + "px";
      modalDialog.style.height = startHeight + dy + "px";
      e.preventDefault();
    }
    
    function stopResize(e) {
      isResizing = false;
      e.preventDefault();
    }
    
    resizeHandle.addEventListener("mousedown", startResize);
    resizeHandle.addEventListener("touchstart", startResize);
    document.addEventListener("mousemove", performResize);
    document.addEventListener("touchmove", performResize);
    document.addEventListener("mouseup", stopResize);
    document.addEventListener("touchend", stopResize);
  }
  
  setupModalResize();
  
  // Optional: Haptic feedback for all buttons
  document.querySelectorAll('.button').forEach(btn => {
    btn.addEventListener('click', () => {
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    });
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
