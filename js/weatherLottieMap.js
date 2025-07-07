// Weather icon mapping for Open-Meteo weather codes
// https://open-meteo.com/en/docs#api_form
export const weatherCodeToLottie = {
  0:  "clear-day.json",         // Clear or mainly clear (day)
  1:  "clear-day.json",
  // You can use weather code 0 or 1 for night as well, but if you have a way to detect night, use "clear-night.json"
  2:  "cloudy.json",            // Partly cloudy/overcast
  3:  "cloudy.json",
  // Optionally, if you detect night and partly cloudy, use "cloudy-night.json"
  45: "cloudy.json",            // Fog/overcast
  48: "cloudy.json",
  51: "rain.json",              // Drizzle/rain
  53: "rain.json",
  55: "rain.json",
  56: "rain.json",              // Freezing drizzle/rain
  57: "rain.json",
  61: "rain.json",
  63: "rain.json",
  65: "rain.json",
  66: "rain.json",
  67: "rain.json",
  71: "snow.json",              // Snow
  73: "snow.json",
  75: "snow.json",
  77: "snow.json",
  80: "rain.json",              // Showers
  81: "rain.json",
  82: "rain.json",
  85: "snow.json",              // Snow showers
  86: "snow.json",
  95: "thunderstorm.json",      // Thunderstorm
  96: "thunderstorm.json",
  99: "thunderstorm.json"
};
