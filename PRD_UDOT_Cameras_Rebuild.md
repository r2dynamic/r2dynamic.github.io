# Product Requirements Document: UDOT Traffic Camera Viewer

## Executive Summary

The UDOT Traffic Camera Viewer is a Progressive Web Application (PWA) that provides real-time access to Utah Department of Transportation (UDOT) traffic cameras across the state. The app serves as an independent, user-friendly interface for viewing highway conditions, weather, and traffic situations through live camera feeds.

## Product Vision

Create an intuitive, fast-loading, and mobile-optimized web application that allows users to quickly access and navigate UDOT traffic cameras with advanced filtering, route planning, and location-based features.

## Core Features & Technical Requirements

### 1. Data Management & Architecture

#### Camera Data System
- **Primary Data Source**: GeoJSON format camera feed (`cameras.geojson`)
- **Data Structure**: Each camera contains:
  - Unique ID and source identifier
  - Geographic coordinates (latitude/longitude)
  - Location description and routing information
  - Two-route system (RoadwayOption1/2 with respective mileposts)
  - Administrative boundaries (region, county, city)
  - Maintenance station assignments
  - Live image URL from UDOT servers
  - Alternative naming metadata for enhanced search

#### Route Configuration
- **Curated Routes**: JSON configuration file (`routes.json`) defining:
  - Named highway segments (e.g., "Parley's Canyon", "Weber Canyon")
  - Milepost ranges for route boundaries
  - Multi-segment route support for complex corridors
  - Custom display names for user-friendly identification

### 2. User Interface & Experience

#### Application Shell
- **Splash Screen**: 
  - Desktop: Animated video splash (MP4)
  - Mobile: Optimized WebP image
  - Auto-fade after 2-3 seconds or video completion
- **Header Controls**: Glass-morphism design with dropdown menus
- **Responsive Grid**: Dynamic image sizing based on screen size and filter results

#### Navigation & Controls
- **Camera Count Badge**: Shows current filtered camera count with dropdown menu
- **Filter System**: Multi-level dropdown with:
  - Region filter (4 UDOT regions)
  - County boundary filter
  - City/municipality filter
  - Maintenance station filter
  - Route-specific filter
  - "Other Filters" for special categories
- **Search**: Real-time text search across camera names and metadata
- **Size Control**: Dynamic image sizing with user override slider (80-380px range)

### 3. Advanced Filtering & Search

#### Geographic Filtering
- **Region-based**: Filter by UDOT administrative regions (1-4)
- **County-based**: Filter by Utah county boundaries
- **City-based**: Filter by municipal boundaries
- **Route-based**: Filter by specific highway routes and milepost ranges

#### Smart Search Features
- **Multi-field Search**: Searches across:
  - Camera signal IDs
  - Location descriptions
  - Alternative route names from metadata
  - Geographic identifiers
- **Route Normalization**: Handles route name variations and direction suffixes

#### Location Services
- **Nearest Camera**: GPS-based location detection
- **Auto-location Filter**: Automatic filtering based on user location (with timeout)
- **Distance-based Results**: Shows closest 50 cameras when location filtering is active

### 4. Interactive Mapping & Visualization

#### Mini-Map Overview
- **Dynamic Overview**: Automatically generated for filtered views
- **Map Technologies**: Leaflet.js with Esri satellite imagery
- **Camera Markers**: Color-coded markers showing camera locations
- **User Location**: Blue marker for user's current position (when available)

#### Full-Screen Map Modal
- **Detailed View**: Expandable full-screen map interface
- **Interactive Controls**: 
  - "Open All Tips" - Show all camera tooltips
  - "Close All Tips" - Hide all tooltips
  - "Auto Open/Close" - Toggle automatic tooltip behavior
- **Camera Integration**: Click markers to view camera images

#### Custom Route Builder
- **Interactive Planning**: Modal-based route construction tool
- **Real-time Preview**: Mini-map showing selected route segments
- **URL Generation**: Shareable URLs for custom routes
- **Multi-segment Support**: Handle complex multi-highway routes

### 5. Camera Viewing & Modal System

#### Image Gallery
- **Lazy Loading**: Progressive image loading for performance
- **Aspect Ratio**: Consistent 16:9 aspect ratio containers
- **Dynamic Sizing**: Automatic sizing based on result count and screen size
- **Selection State**: Visual feedback for selected cameras

#### Camera Modal
- **Full-size Display**: Large format camera image viewing
- **Location Context**: Camera location and description
- **Map Integration**: Toggle between image and location map
- **Draggable Interface**: Moveable modal window
- **Keyboard Navigation**: Arrow key support for browsing

### 6. Progressive Web App (PWA) Features

#### Installation & Offline Support
- **Web App Manifest**: Complete PWA manifest with icons and theme colors
- **Service Worker**: Comprehensive caching strategy:
  - Network-first for shell files (HTML, CSS, JS)
  - Cache-first for static assets
  - Runtime caching for images
- **Offline Capability**: Core functionality available without internet

#### Mobile Optimization
- **Add to Home Screen**: Native app-like installation
- **Viewport Handling**: Safe area support for notched devices
- **Touch Gestures**: Long-press sharing functionality
- **Responsive Design**: Optimized for all screen sizes

### 7. URL State Management & Bookmarking

#### Stateful URLs
- **Filter Persistence**: All filter states encoded in URL parameters
- **Shareable Views**: Copy-paste URLs that preserve current view
- **Deep Linking**: Direct access to specific filtered views
- **Browser Navigation**: Back/forward button support

#### URL Parameters
- **Geographic Filters**: region, county, city parameters
- **Route Filters**: route, multiRoute parameters
- **Search State**: search query persistence
- **Custom Routes**: Encoded route builder state

### 8. Weather Integration

#### Lottie Animations
- **Weather Icons**: Animated weather condition indicators
- **Weather Mapping**: Integration with weather APIs using weather code mapping
- **Animation Assets**: JSON-based Lottie animations for:
  - Clear day/night conditions
  - Cloudy conditions
  - Rain and precipitation
  - Snow conditions
  - Thunderstorms

#### Weather Modal
- **External Integration**: Embedded Windy.com weather radar
- **Location-specific**: Focused on Utah highway corridors
- **Full-screen View**: Detailed weather information overlay

### 9. Performance & Optimization

#### Loading Strategy
- **Dynamic Import**: Modular JavaScript loading
- **Image Optimization**: Lazy loading and progressive enhancement
- **Cache Strategy**: Multi-tiered caching system
- **Bundle Optimization**: Tree-shaking and code splitting

#### User Experience Optimization
- **Fast Initial Load**: Critical path optimization
- **Smooth Animations**: CSS transitions and transforms
- **Memory Management**: Efficient DOM manipulation
- **Error Handling**: Graceful fallbacks for network issues

### 10. Analytics & Monitoring

#### Usage Tracking
- **Google Analytics**: User interaction tracking
- **Performance Monitoring**: Core web vitals tracking
- **Error Reporting**: JavaScript error monitoring

## Technical Stack Requirements

### Frontend Technologies
- **Vanilla JavaScript**: ES6+ modules with dynamic imports
- **CSS3**: Modern CSS with custom properties and grid layout
- **HTML5**: Semantic markup with PWA manifest
- **Bootstrap 5**: UI component framework
- **Leaflet.js**: Interactive mapping library
- **Lottie**: Animation rendering library

### External Dependencies
- **Font Awesome**: Icon library
- **Sortable.js**: Drag-and-drop functionality
- **RBush**: Spatial indexing for map performance
- **LabelGun**: Map label collision detection

### Data Sources
- **UDOT Camera API**: Real-time camera image feeds
- **GeoJSON**: Structured camera location data
- **Open-Meteo API**: Weather data integration
- **Esri/Leaflet**: Map tile services

### Hosting & Deployment
- **Static Hosting**: GitHub Pages or similar CDN
- **Service Worker**: Client-side caching and offline support
- **HTTPS Required**: PWA and geolocation requirements

## User Stories & Acceptance Criteria

### Primary User Stories

1. **As a commuter, I want to quickly view cameras along my route so I can check traffic conditions before leaving.**
   - Filter cameras by specific highway routes
   - View real-time camera images in grid format
   - Access location-based camera suggestions

2. **As a road trip planner, I want to see cameras along multiple connected routes so I can monitor conditions across my entire journey.**
   - Use custom route builder to create multi-segment routes
   - Generate shareable URLs for planned routes
   - View overview map of selected route

3. **As a mobile user, I want the app to work offline and install like a native app so I can access it quickly.**
   - Install PWA to home screen
   - Basic functionality available offline
   - Fast loading and responsive design

4. **As a frequent user, I want to bookmark specific camera views and share them with others.**
   - Generate shareable URLs with current filter state
   - Save bookmarks for quick access
   - Copy URLs to clipboard functionality

### Acceptance Criteria

#### Core Functionality
- ✅ App loads within 3 seconds on 3G connection
- ✅ All cameras display with working image feeds
- ✅ Filtering reduces results appropriately
- ✅ Search finds cameras by name and location
- ✅ Maps display correct camera locations

#### Mobile Experience
- ✅ App installs as PWA on mobile devices
- ✅ Interface adapts to all screen sizes
- ✅ Touch gestures work properly
- ✅ App works without internet connection

#### Performance
- ✅ Images load progressively without blocking UI
- ✅ Filter operations complete within 500ms
- ✅ Map interactions are smooth and responsive
- ✅ Memory usage remains stable during extended use

## Success Metrics

### User Engagement
- **Session Duration**: Average session > 3 minutes
- **Return Users**: 40%+ weekly return rate
- **PWA Installs**: 15%+ installation rate
- **Feature Usage**: 60%+ users engage with filters

### Technical Performance
- **First Contentful Paint**: < 2 seconds
- **Largest Contentful Paint**: < 3 seconds
- **Cumulative Layout Shift**: < 0.1
- **Cache Hit Rate**: > 80% for static assets

### Business Impact
- **User Satisfaction**: High usability scores
- **Error Rate**: < 1% JavaScript errors
- **Uptime**: 99.9% availability
- **Load Performance**: Core Web Vitals in green

## Future Enhancements

### Phase 2 Features
- **Favorites System**: Save frequently viewed cameras
- **Real-time Alerts**: Traffic condition notifications
- **Weather Integration**: Detailed weather overlays
- **Historical Data**: Time-lapse and archive features

### Advanced Features
- **AI Traffic Analysis**: Automated congestion detection
- **Predictive Routing**: ML-based route recommendations
- **Social Features**: User-generated content and reports
- **API Access**: Developer API for third-party integration

## Constraints & Assumptions

### Technical Constraints
- **Data Dependency**: Reliant on UDOT camera feed availability
- **Client-side Only**: No backend server infrastructure
- **Browser Compatibility**: Modern browsers with ES6+ support
- **Image Quality**: Limited by UDOT camera resolution

### Business Assumptions
- **Public Data Access**: UDOT data remains publicly available
- **Usage Patterns**: Users primarily access during commute hours
- **Device Capabilities**: Users have GPS-enabled devices
- **Network Connectivity**: Users have reliable internet access

## Implementation Priority

### High Priority (MVP)
1. Core camera data loading and display
2. Basic filtering by region/route
3. Mobile-responsive image gallery
4. PWA installation capability

### Medium Priority
1. Advanced search functionality
2. Interactive mapping features
3. Custom route builder
4. URL state management

### Low Priority
1. Weather integration
2. Advanced analytics
3. Performance optimizations
4. Additional filter categories

This PRD provides the complete technical and functional requirements for rebuilding the UDOT Traffic Camera Viewer application, ensuring all current features are preserved while providing a clear roadmap for implementation.