// cameraData.js
// Module for fetching external JSON data

export async function getCamerasList() {
    try {
      const response = await fetch('cameras.geojson');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.features || !Array.isArray(data.features)) {
        throw new Error('Invalid GeoJSON format: missing features array');
      }
      
      console.log(`Loading ${data.features.length} cameras from GeoJSON...`);
      
      // Transform GeoJSON features to match existing camera structure
      const transformedCameras = data.features.map((feature, index) => {
        try {
          const props = feature.properties;
          const coords = feature.geometry?.coordinates;
          
          if (!props || !coords || coords.length < 2) {
            console.warn(`Skipping camera ${index}: missing properties or coordinates`);
            return null;
          }

          return {
            Id: props.ID || index,
            Source: "UDOT", // Default source
            SourceId: props.ID?.toString() || index.toString(),
            Roadway: props.ROUTE_1 || "Unknown",
            RoadwayOption1: props.ROUTE_1,
            MilepostOption1: parseMilepost(props.MP_LM_1),
            RoadwayOption2: props.ROUTE_2 !== "NULL" ? props.ROUTE_2 : null,
            MilepostOption2: parseMilepost(props.MP_LM_2),
            MunicipalBoundary: props.City || "Not available",
            CountyBoundary: props.County || "Unknown",
            Region: extractRegionNumber(props.UDOT_Region),
            MaintenanceStationOption1: props.Maintenance_Station || "Not available",
            MaintenanceStationOption2: "Not available",
            GoogleMapsURL: `https://www.google.com/maps?q=${props.latitude},${props.longitude}`,
            ArcGISURL: `https://uplan.maps.arcgis.com/apps/webappviewer/index.html?id=07c3dc8429ca42c4b4066e383631681f&find=${props.latitude},${props.longitude}`,
            Direction: props.Side_Of_Road_1 || "Unknown",
            Latitude: parseFloat(props.latitude) || parseFloat(coords[1]) || 0,
            Longitude: parseFloat(props.longitude) || parseFloat(coords[0]) || 0,
            Location: props.name || `Camera ${props.ID}`,
            SortOrder: 0,
            Views: [
              {
                Id: props.ID || index,
                Url: props.ImageUrl,
                Status: "Enabled",
                Description: ""
              }
            ],
            // Additional metadata from new format
            _geoJsonMetadata: {
              altNames: {
                route1A: props.ALT_NAME_1A,
                route1B: props.ALT_NAME_1B, 
                route1C: props.ALT_NAME_1C,
                route2A: props.ALT_NAME_2A,
                route2B: props.ALT_NAME_2B,
                route2C: props.ALT_NAME_2C
              },
              positioning: {
                physicalMP1: props.MP_PHYS_1,
                physicalMP2: props.MP_PHYS_2,
                offset1: props.Offset_1,
                offset2: props.Offset_2,
                heading1: props.Heading_1,
                heading2: props.Heading_2,
                centerlineLat1: props.Centerline_lat_1,
                centerlineLon1: props.Centerline_lon_1,
                centerlineLat2: props.Centerline_lat_2,
                centerlineLon2: props.Centerline_lon_2
              },
              objectId: props.ObjectId
            }
          };
        } catch (err) {
          console.warn(`Error processing camera ${index}:`, err);
          return null;
        }
      }).filter(camera => camera !== null);
      
      // Filter out cameras with invalid coordinates or missing image URLs
      const validCameras = transformedCameras.filter(camera => {
        const hasValidCoords = !(camera.Latitude === 0.0 && camera.Longitude === 0.0) &&
                              !isNaN(camera.Latitude) && !isNaN(camera.Longitude);
        const hasValidImage = camera.Views[0].Url && 
                             camera.Views[0].Url !== "NULL" && 
                             camera.Views[0].Url.startsWith('http');
        return hasValidCoords && hasValidImage;
      });
      
      console.log(`Successfully loaded ${validCameras.length} valid cameras (filtered from ${transformedCameras.length})`);
      return validCameras;
      
    } catch (e) {
      console.error('Error fetching cameras GeoJSON:', e);
      // Fallback to empty array - app should handle gracefully
      return [];
    }
  }

/**
 * Parse milepost value, handling "NULL" strings and various number formats
 * @param {string|number} value - Milepost value from GeoJSON
 * @returns {number|null} - Parsed milepost or null if invalid
 */
function parseMilepost(value) {
  if (value === null || value === undefined || value === "NULL") {
    return null;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Extract region number from region text
 * @param {string} regionText - Text like "Region Four" 
 * @returns {number} - Region number (1-4)
 */
function extractRegionNumber(regionText) {
  if (!regionText) return 1;
  
  const regionMap = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4,
    '1': 1, '2': 2, '3': 3, '4': 4
  };
  
  const match = regionText.toLowerCase().match(/(one|two|three|four|\d)/);
  return match ? (regionMap[match[1]] || 1) : 1;
}

export async function getCuratedRoutes() {
    try {
      const response = await fetch('routes.json');
      return await response.json();
    } catch (e) {
      console.error('Error fetching routes:', e);
      return [];
    }
  }