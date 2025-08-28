# Camera Data Migration Notes

## Field Mapping: cameras.json → cameras.geojson

| Old Field (cameras.json) | New Field (cameras.geojson) | Notes |
|---------------------------|------------------------------|-------|
| `Id` | `properties.ID` | Primary identifier |
| `Location` | `properties.name` | Camera description/location |
| `Latitude` | `properties.latitude` | Also in `geometry.coordinates[1]` |
| `Longitude` | `properties.longitude` | Also in `geometry.coordinates[0]` |
| `Region` | `properties.UDOT_Region` | Text format, converted to number |
| `CountyBoundary` | `properties.County` | County name |
| `MunicipalBoundary` | `properties.City` | City name |
| `MaintenanceStationOption1` | `properties.Maintenance_Station` | Maintenance station |
| `Roadway` | `properties.ROUTE_1` | Primary route |
| `MilepostOption1` | `properties.MP_LM_1` | Primary milepost |
| `RoadwayOption2` | `properties.ROUTE_2` | Secondary route (if not "NULL") |
| `MilepostOption2` | `properties.MP_LM_2` | Secondary milepost (if not "NULL") |
| `Views[0].Url` | `properties.ImageUrl` | Camera image URL |
| `Direction` | `properties.Side_Of_Road_1` | Traffic direction |

## New Fields Available in GeoJSON

- `properties.ALT_NAME_1A`, `ALT_NAME_1B`, etc. - Alternative road names
- `properties.MP_PHYS_1`, `MP_PHYS_2` - Physical mileposts
- `properties.Offset_1`, `Offset_2` - Distance offsets
- `properties.Heading_1`, `Heading_2` - Camera heading directions
- `properties.Centerline_lat_1`, `Centerline_lon_1` - Centerline coordinates
- `properties.ObjectId` - Database object ID

## Migration Benefits

1. **Geospatial Standard**: GeoJSON is a standard format for geographic data
2. **Additional Metadata**: More detailed road and positioning information
3. **Better Mapping Integration**: Native support in mapping libraries
4. **Structured Coordinates**: Geometry object separates coordinates from properties

## Potential Future Enhancements

- Use alternative road names for better search results
- Implement more precise positioning with centerline coordinates
- Add camera heading indicators on maps
- Use physical mileposts for more accurate route filtering
