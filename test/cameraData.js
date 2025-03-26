// cameraData.js
// Module for fetching external JSON data

export async function getCamerasList() {
    try {
      const response = await fetch('cameras.json');
      const data = await response.json();
      // Filter out cameras with invalid coordinates
      return data.CamerasList.filter(camera => !(camera.Latitude === 0.0 && camera.Longitude === 0.0));
    } catch (e) {
      console.error('Error fetching cameras JSON:', e);
      return [];
    }
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
  
