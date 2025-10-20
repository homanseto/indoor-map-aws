export function customizeEntityDisplayInfo(entity, featureData) {
  const props = featureData.properties;

  // Skip information box setup for walls - they should be transparent to clicks
  if (props.feature_type === "wall") {
    return;
  }

  // When Cesium loads GeoJSON data, it automatically sets entity.name
  entity.name = props.buildingName;
  entity.description = createInfoBoxHtml(props);
}
function createInfoBoxHtml(properties) {
  const featrureType = properties.feature_type;
  const buildingName = properties.buildingName;
  const buildingType = properties.buildingType;
  const venue_id = properties.venue_id;
  const category = properties.category;
  const levelShortName = properties.levelShortName;
  const level_id = properties.level_id;
  const ordinal = properties.ordinal;

  return `
    <div style="font-family: Arial, sans-serif; font-size: 12px;">
      <h4 style="margin: 0 0 10px 0; color: #333;">${buildingName} Details</h4>
      <table class="cesium-infoBox-defaultTable" style="width: 100%;">
        <tr><td><strong>Feature Type:</strong></td><td>${featrureType}</td></tr>      
        <tr><td><strong>Building Type:</strong></td><td>${buildingType}</td></tr>
        <tr><td><strong>Venue ID:</strong></td><td>${venue_id}</td></tr>
        <tr><td><strong>Category:</strong></td><td>${category}</td></tr>
        <tr><td><strong>Level Name:</strong></td><td>${levelShortName}</td></tr>        
        <tr><td><strong>Level ID:</strong></td><td>${level_id}</td></tr>
        <tr><td><strong>Ordinal:</strong></td><td>${ordinal}</td></tr>
        <tr><td><strong>Eng Name:</strong></td><td>${properties.nameEn}</td></tr>
        <tr><td><strong>Chi Name:</strong></td><td>${properties.nameZh}</td></tr>
        <tr><td><strong>Height:</strong></td><td>${properties.zValue}</td></tr>
      </table>
    </div>
  `;
}
