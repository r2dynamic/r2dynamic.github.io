// Wrap everything in an async IIFE so we can await the fetch
(async function() {
  'use strict';
 
  // --- Constants ---
  const DEBOUNCE_DELAY = 300;
  const LEFT_COUNT = 10;
  const RIGHT_COUNT = 10;
 
  // --- Fetch cameras JSON from external file ---
  let camerasList = [];
  try {
    const response = await fetch('cameras.json');
    const data = await response.json();
    camerasList = data.CamerasList.filter(camera => !(camera.Latitude === 0.0 && camera.Longitude === 0.0));
  } catch (e) {
    console.error('Error fetching cameras JSON:', e);
  }
 
  // Global array to store the cameras that pass the filters
  let visibleCameras = [];
 
  // --- Mappings & Data ---
  const cityFullNames = {
   "ALP": "Alpine",
      "ALT": "Alta",
      "ALM": "Altamont",
      "ALN": "Alton",
      "AMG": "Amalga",
      "AFK": "American Fork",
      "ANB": "Annabella",
      "ANT": "Antimony",
      "APV": "Apple Valley",
      "ARA": "Aurora",
      "BAL": "Ballard",
      "BRV": "Bear River",
      "BVR": "Beaver",
      "BRL": "Beryl",
      "BKL": "Bicknell",
      "BGW": "Big Water",
      "BLA": "Blanding",
      "BMT": "Bloomington",
      "BLF": "Bluffdale",
      "BLD": "Boulder",
      "BTF": "Bountiful",
      "BTN": "Brighton",
      "BHD": "Brian Head",
      "BRC": "Brigham City",
      "BCC": "Bryce Canyon City",
      "CNV": "Cannonville",
      "CNR": "Canyon Rim",
      "CDL": "Castle Dale",
      "CVY": "Castle Valley",
      "CDC": "GA",
      "CDF": "Cedar Fort",
      "CDH": "Cedar Hills",
      "CNF": "Centerfield",
      "CVL": "Centerville",
      "CEV": "Central Valley",
      "CHR": "Charleston",
      "CRV": "Circleville",
      "CLK": "Clarkston",
      "CLW": "Clawson",
      "CFD": "Clearfield",
      "CVD": "Cleveland",
      "CTN": "Clinton",
      "CLV": "Coalville",
      "CRN": "Corinne",
      "CNS": "Cornish",
      "CWH": "Cottonwood Heights",
      "CWW": "Cottonwood West",
      "DAN": "Daniel",
      "DLT": "Delta",
      "DEW": "Deweyville",
      "DPR": "Draper",
      "DCH": "Duchesne",
      "DUG": "Dugway",
      "EAG": "Eagle Mountain",
      "ECB": "East Carbon",
      "EMC": "East Millcreek",
      "ELK": "Elk Ridge",
      "EMO": "Elmo",
      "ELS": "Elsinore",
      "ELW": "Elwood",
      "EMR": "Emery",
      "ENO": "Enoch",
      "ENT": "Enterprise",
      "EPH": "Ephraim",
      "ERD": "Erda",
      "ESC": "Escalante",
      "EUR": "Eureka",
      "FRF": "Fairfield",
      "FRV": "Fairview",
      "FRM": "Farmington",
      "FRW": "Farr West",
      "FAY": "Fayette",
      "FRN": "Ferron",
      "FLD": "Fielding",
      "FIL": "Fillmore",
      "FTD": "Fort Duchesne",
      "FOU": "Fountain Green",
      "FRA": "Francis",
      "FRU": "Fruit Heights",
      "GRC": "Garden City",
      "GAR": "Garland",
      "GEN": "Genola",
      "GDL": "Glendale",
      "GWD": "Glenwood",
      "GOS": "Goshen",
      "GNT": "Granite",
      "GVL": "Grantsville",
      "GRR": "Green River",
      "GUN": "Gunnison",
      "HKV": "Hanksville",
      "HRV": "Harrisville",
      "HAT": "Hatch",
      "HBR": "Heber City",
      "HLP": "Helper",
      "HFR": "Henefer",
      "HNV": "Henrieville",
      "HRR": "Herriman",
      "HIA": "Hiawatha",
      "HLD": "Highland",
      "HDL": "Hildale",
      "HKY": "Hinckley",
      "HDN": "Holden",
      "HDY": "Holladay",
      "HYV": "Honeyville",
      "HPR": "Hooper",
      "HWL": "Howell",
      "HTN": "Huntington",
      "HTV": "Huntsville",
      "HRC": "Hurricane",
      "HYD": "Hyde Park",
      "HYR": "Hyrum",
      "IVN": "Ivins",
      "JSP": "Joseph",
      "JCT": "Junction",
      "KMS": "Kamas",
      "KNB": "Kanab",
      "KRV": "Kanarraville",
      "KSH": "Kanosh",
      "KAY": "Kaysville",
      "KRN": "Kearns",
      "KTY": "Keetley",
      "KNG": "Kingston",
      "KOO": "Koosharem",
      "LVR": "La Verkin",
      "LKP": "Lake Point",
      "LKT": "Laketown",
      "LTN": "Layton",
      "LMT": "Leamington",
      "LED": "Leeds",
      "LHI": "Lehi",
      "LVN": "Levan",
      "LEW": "Lewiston",
      "LDN": "Lindon",
      "LOA": "Loa",
      "LGN": "Logan",
      "LUN": "Lund",
      "LYM": "Lyman",
      "LDL": "Lynndyl",
      "MAE": "Maeser",
      "MAG": "Magna",
      "MNL": "Manila",
      "MTI": "Manti",
      "MTU": "Mantua",
      "MPL": "Mapleton",
      "MSV": "Marriott-Slaterville",
      "MRV": "Marysvale",
      "MAY": "Mayfield",
      "MDW": "Meadow",
      "MDN": "Mendon",
      "MXH": "Mexican Hat",
      "MDV": "Midvale",
      "MWY": "Midway",
      "MFD": "Milford",
      "MCK": "Millcreek",
      "MLV": "Millville",
      "MAB": "Moab",
      "MNA": "Mona",
      "MRO": "Monroe",
      "MZC": "Montezuma Creek",
      "MNC": "Monticello",
      "MGN": "Morgan",
      "MRN": "Moroni",
      "MCR": "Mt. Carmel",
      "MCJ": "Mt. Carmel Junction",
      "MTO": "Mt. Olympus",
      "MTP": "Mt. Pleasant",
      "MUR": "Murray",
      "MYT": "Myton",
      "NPL": "Naples",
      "NEO": "Neola",
      "NPH": "Nephi",
      "NCL": "New Castle",
      "NHR": "New Harmony",
      "NTN": "Newton",
      "NIB": "Nibley",
      "NLG": "North Logan",
      "NOG": "North Ogden",
      "NSL": "North Salt Lake",
      "OAC": "Oak City",
      "OKY": "Oakley",
      "OGD": "Ogden",
      "OPH": "Ophir",
      "OQR": "Oquirrh",
      "OGV": "Orangeville",
      "ODV": "Orderville",
      "ORM": "Orem",
      "PNG": "Panguitch",
      "PDS": "Paradise",
      "PGH": "Paragonah",
      "PKC": "Park City",
      "PWN": "Parowan",
      "PSN": "Payson",
      "PRY": "Perry",
      "PLC": "Plain City",
      "PLG": "Pleasant Grove",
      "PLV": "Pleasant View",
      "PLY": "Plymouth",
      "PTG": "Portage",
      "PRC": "Price",
      "PVD": "Providence",
      "PVO": "Provo",
      "RDT": "Randlett",
      "RAN": "Randolph",
      "RED": "Redmond",
      "RFD": "Richfield",
      "RMD": "Richmond",
      "RHT": "River Heights",
      "RDL": "Riverdale",
      "RVT": "Riverton",
      "RKV": "Rockville",
      "RKR": "Rocky Ridge",
      "RSV": "Roosevelt",
      "ROY": "Roy",
      "RVY": "Rush Valley",
      "SLM": "Salem",
      "SLA": "Salina",
      "SLC": "Salt Lake City",
      "SND": "Sandy",
      "SCL": "Santa Clara",
      "STQ": "Santaquin",
      "SSP": "Saratoga Springs",
      "SCP": "Scipio",
      "SCO": "Scofield",
      "SIG": "Sigurd",
      "SMF": "Smithfield",
      "SNO": "Snowville",
      "SOL": "Soldier Summit",
      "SJO": "South Jordan",
      "SOG": "South Ogden",
      "SSL": "South Salt Lake",
      "SWE": "South Weber",
      "SPF": "Spanish Fork",
      "SPC": "Spring City",
      "SDL": "Springdale",
      "SPV": "Springville",
      "STG": "St. George",
      "STP": "Stansbury Park",
      "STE": "Sterling",
      "STO": "Stockton",
      "SMT": "Summit",
      "SNY": "Sunnyside",
      "SUN": "Sunset",
      "SYR": "Syracuse",
      "TAB": "Tabiona",
      "TAY": "Taylorsville",
      "THI": "Thistle",
      "TLE": "Tooele",
      "TOQ": "Toquerville",
      "TOR": "Torrey",
      "TRE": "Tremonton",
      "TNT": "Trenton",
      "TRO": "Tropic",
      "UIN": "Uintah",
      "UNI": "Union",
      "VAL": "Val Verda",
      "VNL": "Vernal",
      "VRN": "Vernon",
      "VEY": "Veyo",
      "VIN": "Vineyard",
      "VRG": "Virgin",
      "WAL": "Wales",
      "WBG": "Wallsburg",
      "WAS": "Washington",
      "WTE": "Washington Terrace",
      "WTN": "Wellington",
      "WVL": "Wellsville",
      "WEN": "Wendover",
      "WBN": "West Bountiful",
      "WHV": "West Haven",
      "WJD": "West Jordan",
      "WPT": "West Point",
      "WVC": "West Valley City",
      "WHC": "White City",
      "WRK": "Whiterocks",
      "WIL": "Willard",
      "WLH": "Woodland Hills",
      "WDF": "Woodruff",
      "WXS": "Woods Cross",
      "UT": "Utah",
      "SL": "Salt Lake",
      "DU": "Duchesne",
      "KN": "Kane",
      "CA": "Cache",
      "CC": "Carbon",
      "SE": "Sevier",
      "UN": "Uintah",
      "BE": "Box Elder",
      "BV": "Beaver",
      "RN": "Iron",
      "WE": "Wayne",
      "SJ": "San Juan",
      "WN": "Washington",
      "DA": "Davis",
      "PT": "Piute",
      "EM": "Emery",
      "GR": "Grand",
      "WA": "Wasatch",
      "MD": "Millard",
      "JU": "Juab",
      "DG": "Daggett",
      "GA": "Garfield",
      "MN": "Morgan",
      "RI": "Rich",
      "SP": "Sanpete",
      "SU": "Summitt",
      "TE": "Tooele",
      "WB": "Weber"
  };
 
  const regionCities = {
    "Region 1": ["AMG","BRV","BTF","BRC","CVL","CLK","CFD","CTN","CRN","CNS","ELW","FRM","FRW","FLD","FRU","GRC","GAR","HRV","HYV","HPR","HWL","HTV","HYD","HYR","KAY","LKT","LTN","LEW","LGN","MTU","MSV","MDN","MLV","MGN","NTN","NIB","NLG","NOG","NSL","OGD","PDS","PRY","PLC","PLV","PLY","PTG","PVD","RAN","RMD","RHT","RDL","ROY","SMF","SNO","SOG","SWE","SUN","SYR","TRE","TNT","UIN","VAL","WTE","WVL","WBN","WHV","WPT","WIL","WDF","WXS","BE","CA","RI","WB","MN","DA"],
    "Region 2": ["ALT","BLF","CNR","CLV","CWH","CWW","DPR","DUG","EMC","ERD","FRA","GNT","GVL","HFR","HRR","HDY","KMS","KRN","LKP","MAG","MDV","MCK","MTO","MUR","OKY","OPH","OQR","PKC","RVT","RVY","SLC","SND","SJO","SSL","STP","STO","TAY","TLE","UNI","VRN","WEN","WJD","WVC","WHC","SU","SL","TE"],
    "Region 3": ["ALP","ALM","AFK","BAL","CDF","CDH","CHR","DAN","DCH","EAG","ELK","EUR","FRF","FTD","GEN","GOS","HBR","HLD","KTY","LHI","LVN","LDN","MAE","MNL","MPL","MWY","MNA","MYT","NPL","NEO","NPH","ORM","PSN","PLG","PVO","RDT","RKR","RSV","STQ","SSP","SOL","SPF","SPV","TAB","THI","VNL","VIN","WBG","WRK","WLH","JU","UT","WA","DU","UN","DG"],
    "Region 4": ["ALN","ANB","ANT","APV","ARA","BVR","BRL","BKL","BGW","BLA","BMT","BLD","BHD","BCC","CNV","CDL","CVY","CDC","CNF","CEV","CRV","CLW","CVD","DLT","ECB","EMO","ELS","EMR","ENO","ENT","EPH","ESC","FRV","FAY","FRN","FIL","FOU","GDL","GWD","GRR","GUN","HKV","HAT","HLP","HNV","HIA","HDL","HKY","HDN","HTN","HRC","IVN","JSP","JCT","KNB","KRV","KSH","KNG","KOO","LVR","LMT","LED","LOA","LUN","LYM","LDL","MTI","MRV","MAY","MDW","MXH","MFD","MRV","MAB","MRO","MZC","MNC","MRN","MCR","MCJ","MTP","NCL","NHR","OAC","OGV","ODV","PNG","PGH","PWN","PRC","RED","RFD","RKV","SLA","SCL","SCP","SCO","SIG","SPC","SDL","STG","STE","SMT","SNY","TOQ","TOR","TRO","VEY","VRG","WAL","WAS","WTN","MD","SJ","CC","GR","EM","SE","BV","PT","SJ","RN","GA","WN","KN","WE","SP"]
  };
 
  // --- Load Curated Routes from external file ---
  let curatedRoutes = [];
  try {
    const response = await fetch('routes.json');
    curatedRoutes = await response.json();
  } catch (e) {
    console.error('Error fetching routes:', e);
  }
  const defaultRoute = "All";
 
  // --- DOM Elements ---
  const galleryContainer = document.getElementById("imageGallery");
  const modalImage = document.getElementById("modalImage");
  const modalTitle = document.querySelector(".modal-title");
  const cameraCountElement = document.getElementById("cameraCount");
  
  // Search dropdown input element
  const searchInput = document.getElementById("searchInput");
  
  // Elements for City/County and Region dropdowns
  const cityFilterMenu = document.getElementById("cityFilterMenu");
  const regionFilterMenu = document.getElementById("regionFilterMenu");
  const cityDropdownButton = document.getElementById("cityDropdownButton");
  const regionDropdownButton = document.getElementById("regionDropdownButton");
  
  // Elements for Curated Routes dropdown
  const routeFilterButton = document.getElementById("routeFilterButton");
  const routeFilterMenu = document.getElementById("routeFilterMenu");
  
  // Other DOM elements remain unchanged
  const prevImageBtn = document.getElementById("prevImageBtn");
  const nextImageBtn = document.getElementById("nextImageBtn");
  const openInNewTabBtn = document.getElementById("openInNewTabBtn");
  const googleMapsLink = document.getElementById("googleMapsLink");
  const udotTrafficLink = document.getElementById("udotTrafficLink");
  const thumbnailContainer = document.getElementById("thumbnailContainer");
 
  let currentIndex = 0;
  let debounceTimer;
 
  // Variables for selections
  let selectedCity = "";
  let selectedRegion = "";
  let searchQuery = "";
  let selectedRoute = "All";
 
  // --- Utility: Debounce Function ---
  function debounce(func, delay) {
    return function(...args) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => func.apply(this, args), delay);
    };
  }
 
  // --- Populate City Dropdown ---
  const cities = camerasList.map(camera => camera.Location.split(",").pop().trim());
  const uniqueCities = [...new Set(cities.filter(city => city.length <= 4))];
 
  function updateCityDropdown() {
    cityFilterMenu.innerHTML = "";
    // Default option
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
  updateCityDropdown();
 
  // --- Populate Region Dropdown ---
  function populateRegionDropdown() {
    regionFilterMenu.innerHTML = "";
    // Default option
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
  populateRegionDropdown();
 
  // --- Populate Curated Routes Dropdown ---
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
  updateRouteOptions();
 
  // --- Event Listeners for City Dropdown ---
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
 
  // --- Event Listeners for Region Dropdown ---
  regionFilterMenu.addEventListener("click", function(e) {
    e.preventDefault();
    if (e.target && e.target.matches("a.dropdown-item")) {
      selectedRegion = e.target.getAttribute("data-value");
      regionDropdownButton.innerHTML = `<i class="fas fa-industry"></i>`;
      if (e.target.textContent !== "All Regions") {
        regionDropdownButton.innerHTML += ` ${e.target.textContent}`;
      }
      // Reset city selection when region changes
      selectedCity = "";
      cityDropdownButton.innerHTML = `<i class="fas fa-map-marked-alt"></i>`;
      updateCityDropdown();
      filterImages();
    }
  });
 
  // --- Event Listener for Curated Routes Dropdown ---
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
 
  // --- Event Listener for Search Dropdown ---
  searchInput.addEventListener("input", debounce(function() {
    searchQuery = searchInput.value;
    filterImages();
  }, DEBOUNCE_DELAY));
 
  // --- Camera Count Click ---
  cameraCountElement.addEventListener("click", () => {
    const versionModalEl = document.getElementById("versionModal");
    const versionModalInstance = new bootstrap.Modal(versionModalEl);
    versionModalInstance.show();
  });
 
  // --- Build Image Gallery ---
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
      image.src = camera.Views[0].Url;
      image.alt = `Camera at ${camera.Location}`;
 
      anchor.appendChild(image);
      aspectBox.appendChild(anchor);
      col.appendChild(aspectBox);
      galleryContainer.appendChild(col);
    });
  }
  createImageElements();
  filterImages();
 
  function updateCameraCount() {
    cameraCountElement.innerHTML = `${visibleCameras.length}`;
  }
 
  // --- Filter Images ---
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
 
    updateCameraCount();
    renderGallery(visibleCameras);
    currentIndex = 0;
    buildCarousel();
  }
 
  // --- Render Gallery ---
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
      image.src = camera.Views[0].Url;
      image.alt = `Camera at ${camera.Location}`;
 
      anchor.appendChild(image);
      aspectBox.appendChild(anchor);
      col.appendChild(aspectBox);
      galleryContainer.appendChild(col);
    });
  }
 
  function getVisibleImageIndices() {
    const cols = Array.from(document.querySelectorAll("#imageGallery .col"));
    return cols.map((col, idx) => idx);
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
 
    buildCarousel();
  }
 
  function buildCarousel() {
    thumbnailContainer.innerHTML = "";
    const visibleImages = getVisibleImageIndices();
    if (visibleImages.length === 0) return;
    const totalVisible = visibleImages.length;
    const desiredWindow = LEFT_COUNT + 1 + RIGHT_COUNT;
    const windowSize = Math.min(totalVisible, desiredWindow);
    let currentVisibleIndex = visibleImages.indexOf(currentIndex);
    if (currentVisibleIndex === -1) currentVisibleIndex = 0;
    const start = (((currentVisibleIndex - LEFT_COUNT) % totalVisible) + totalVisible) % totalVisible;
    const carouselIndices = [];
    for (let i = 0; i < windowSize; i++) {
      const idx = (start + i) % totalVisible;
      carouselIndices.push(visibleImages[idx]);
    }
    carouselIndices.forEach(camIdx => {
      const camera = visibleCameras[camIdx];
      const thumbImg = document.createElement("img");
      thumbImg.src = camera.Views[0].Url;
      thumbImg.alt = `Thumbnail for ${camera.Location}`;
      thumbImg.style.height = "70px";
      thumbImg.style.width = "auto";
      thumbImg.style.objectFit = "contain";
      thumbImg.style.border = "2px solid transparent";
      thumbImg.style.borderRadius = "4px";
      thumbImg.style.cursor = "pointer";
      thumbImg.draggable = false;
      thumbImg.style.userSelect = "none";
      if (camIdx === currentIndex) {
        thumbImg.style.border = "2px solid orange";
        thumbImg.classList.add("selected-carousel");
      }
      thumbImg.addEventListener("click", () => showImage(camIdx));
      thumbnailContainer.appendChild(thumbImg);
    });
    const selectedThumb = thumbnailContainer.querySelector("img.selected-carousel");
    if (selectedThumb) {
      centerThumbnail(thumbnailContainer, selectedThumb);
    }
  }
 
  function centerThumbnail(container, thumb) {
    const containerWidth = container.offsetWidth;
    const thumbLeft = thumb.offsetLeft;
    const thumbWidth = thumb.offsetWidth;
    const scrollPos = thumbLeft - (containerWidth / 2) + (thumbWidth / 2);
    container.scroll({ left: scrollPos, behavior: "smooth" });
  }
 
  function showNextImage() {
    const visibleImages = getVisibleImageIndices();
    if (visibleImages.length === 0) return;
    const currentVisibleIndex = visibleImages.indexOf(currentIndex);
    if (currentVisibleIndex === -1) return;
    const nextIndex = (currentVisibleIndex + 1) % visibleImages.length;
    showImage(visibleImages[nextIndex]);
  }
 
  function showPreviousImage() {
    const visibleImages = getVisibleImageIndices();
    if (visibleImages.length === 0) return;
    const currentVisibleIndex = visibleImages.indexOf(currentIndex);
    if (currentVisibleIndex === -1) return;
    const prevIndex = (currentVisibleIndex - 1 + visibleImages.length) % visibleImages.length;
    showImage(visibleImages[prevIndex]);
  }
 
  function openGoogleMaps() {
    const camera = visibleCameras[currentIndex];
    const googleMapsUrl = `https://www.google.com/maps?q=${camera.Latitude},${camera.Longitude}`;
    window.open(googleMapsUrl, "_blank");
  }
  
  function openUdotTraffic() {
    const camera = visibleCameras[currentIndex];
    const udotTrafficUrl = `https://www.udottraffic.utah.gov/map/#camera-${camera.Id}`;
    window.open(udotTrafficUrl, "_blank");
  }
  
  function openImageInNewTab() {
    window.open(modalImage.src, "_blank");
  }
 
  document.addEventListener("keydown", (event) => {
    const modalIsOpen = document.querySelector("#imageModal.show");
    if (!modalIsOpen) return;
    if (event.key === "ArrowLeft") showPreviousImage();
    else if (event.key === "ArrowRight") showNextImage();
    else if (event.key === "Escape") {
      const modal = bootstrap.Modal.getInstance(document.getElementById("imageModal"));
      if (modal) modal.hide();
    }
  });
 
  prevImageBtn.addEventListener("click", showPreviousImage);
  nextImageBtn.addEventListener("click", showNextImage);
  openInNewTabBtn.addEventListener("click", openImageInNewTab);
  googleMapsLink.addEventListener("click", (e) => { e.preventDefault(); openGoogleMaps(); });
  udotTrafficLink.addEventListener("click", (e) => { e.preventDefault(); openUdotTraffic(); });
})();
 
// --- Additional DOMContentLoaded for auto-close behavior, slider events, and haptic feedback ---
document.addEventListener('DOMContentLoaded', () => {
  // For each dropdown toggle, add mouseenter/mouseleave to delay auto-close when interacting
  const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
  dropdownToggles.forEach(toggle => {
    let closeTimer;
    const dropdownMenu = toggle.nextElementSibling;
    toggle.addEventListener('shown.bs.dropdown', function () {
      // Hide any other open dropdowns immediately
      dropdownToggles.forEach(otherToggle => {
        if (otherToggle !== toggle) {
          const instance = bootstrap.Dropdown.getInstance(otherToggle);
          if (instance) instance.hide();
        }
      });
    });
    if (dropdownMenu) {
      dropdownMenu.addEventListener('mouseenter', () => {
        clearTimeout(closeTimer);
      });
      dropdownMenu.addEventListener('mouseleave', () => {
        closeTimer = setTimeout(() => {
          const instance = bootstrap.Dropdown.getInstance(toggle);
          if (instance) instance.hide();
        }, 5000);
      });
    }
  });
  
  // Close dropdowns if clicking outside
  document.addEventListener('click', function(event) {
    dropdownToggles.forEach(function(toggle) {
      const dropdownMenu = toggle.nextElementSibling;
      if (dropdownMenu && !toggle.contains(event.target) && !dropdownMenu.contains(event.target)) {
        const instance = bootstrap.Dropdown.getInstance(toggle);
        if (instance) instance.hide();
      }
    });
  });
  
  // --- Image Size Slider event handlers ---
  const sizeControlButton = document.getElementById("sizeControlButton");
  const sizeSliderContainer = document.getElementById("sizeSliderContainer");
  const sizeSlider = document.getElementById("sizeSlider");
  const imageGallery = document.getElementById("imageGallery");
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
    updateImageSize(sizeSlider.value);
    showSlider();
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  });
  
  sizeSlider.addEventListener("change", hideSlider);
  
  // New: Close the slider if a click occurs outside its container or its button
  document.addEventListener("click", function(event) {
    if (sizeSliderContainer.classList.contains("active")) {
      if (!sizeSliderContainer.contains(event.target) && !sizeControlButton.contains(event.target)) {
        hideSlider();
      }
    }
  });
  
  // --- Haptic Feedback on All Buttons ---
  document.querySelectorAll('.button').forEach(btn => {
    btn.addEventListener('click', () => {
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    });
  });
  
  // --- Draggable Modal ---
  const imageModal = document.getElementById("imageModal");
  if (imageModal) {
    const modalDialog = imageModal.querySelector(".draggable-modal");
    const modalHeader = imageModal.querySelector(".modal-header");
    let isDragging = false, offsetX = 0, offsetY = 0;
    
    modalHeader.addEventListener("mousedown", function(e) {
      isDragging = true;
      const rect = modalDialog.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      modalDialog.style.transition = "none"; // Disable transition during drag
    });
    
    document.addEventListener("mousemove", function(e) {
      if (isDragging) {
        modalDialog.style.left = (e.clientX - offsetX) + "px";
        modalDialog.style.top = (e.clientY - offsetY) + "px";
      }
    });
    
    document.addEventListener("mouseup", function(e) {
      isDragging = false;
      modalDialog.style.transition = ""; // Restore transition
    });
    
    // Reset modal position when shown
    imageModal.addEventListener("shown.bs.modal", function() {
      modalDialog.style.left = "";
      modalDialog.style.top = "";
    });
  }
});

document.getElementById("locationButton").addEventListener("click", function() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      const userLat = position.coords.latitude;
      const userLon = position.coords.longitude;
      
      // Compute distance for each camera, ensuring numbers
      const camerasWithDistance = camerasList.map(camera => {
        const camLat = parseFloat(camera.Latitude);
        const camLon = parseFloat(camera.Longitude);
        camera.distanceFromUser = haversineDistance(userLat, userLon, camLat, camLon);
        return camera;
      });
      
      // Sort cameras by distance ascending
      camerasWithDistance.sort((a, b) => a.distanceFromUser - b.distanceFromUser);
      
      // Keep only the 10 nearest cameras
      visibleCameras = camerasWithDistance.slice(0, 10);
      
      updateCameraCount();
      renderGallery(visibleCameras);
      currentIndex = 0;
      buildCarousel();
      
    }, function(error) {
      console.error("Error obtaining location:", error);
      alert("Unable to retrieve your location.");
    });
  } else {
    alert("Geolocation is not supported by your browser.");
  }
});
