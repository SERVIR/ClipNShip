var _DataSources = [];
//Layer Name, then Full Path To DataSet. Notice * between Folder and featureclass or featuredataset name
_DataSources.push({ Name: "Average Precipitation", Source: SOURCE TO PATH ON SERVER, Type: "Raster" });
_DataSources.push({ Name: "Terrestrial Ecosystems", Source: SOURCE TO PATH ON SERVER, Type: "Raster" });
_DataSources.push({ Name: "Surficial Lithology", Source: SOURCE TO PATH ON SERVER, Type: "Raster" });
_DataSources.push({ Name: "Average Temperature", Source: SOURCE TO PATH ON SERVER, Type: "Raster" });
_DataSources.push({ Name: "Land Surface Forms", Source: SOURCE TO PATH ON SERVER, Type: "Raster" });
_DataSources.push({ Name: "FAO Soils", Source: SOURCE TO PATH ON SERVER, Type: "Vector" });
_DataSources.push({ Name: "World Protected Areas", Source: SOURCE TO PATH ON SERVER, Type: "Vector" });
_DataSources.push({ Name: "Dixon Farming Systems", Source: SOURCE TO PATH ON SERVER, Type: "Vector" });
_DataSources.push({ Name: "Soil Fertility", Source: SOURCE TO PATH ON SERVER, Type: "Vector" });
_DataSources.push({ Name: "Topo Moisture Potential", Source: SOURCE TO PATH ON SERVER, Type: "Raster" });
_DataSources.push({ Name: "Isobioclimates", Source: SOURCE TO PATH ON SERVER, Type: "Raster" });

//Roads
//Layer Name, then Full Path To DataSet. . Notice * between Folder and featureclass or featuredataset name
_DataSources.push({ Name: "OSM_PrimaryRoads", Source: SOURCE TO PATH ON SERVER, Type: "Vector" });
_DataSources.push({ Name: "OSM_Roads", Source: SOURCE TO PATH ON SERVER, Type: "Vector" });
_DataSources.push({ Name: "Google_LocalRoads", Source: SOURCE TO PATH ON SERVER, Type: "Vector" });
_DataSources.push({ Name: "Google_PrimaryRoads", Source: SOURCE TO PATH ON SERVER, Type: "Vector" });
//_DataSources.push({ Name: "Sudan_Roads", Source: SOURCE TO PATH ON SERVER, Type: "Vector" });
//_DataSources.push({ Name: "Ethiopia_Roads", Source: SOURCE TO PATH ON SERVER, Type: "Vector" });
//_DataSources.push({ Name: "Somalia_Roads", Source: SOURCE TO PATH ON SERVER, Type: "Vector" });

var _BasemapURL = "http://server.arcgisonline.com/ArcGIS/rest/services/ESRI_StreetMap_World_2D/MapServer";
var _AfricaMixServiceURL = MAPSERVICE ENDPOINT URL;
var _AfricaRoadsServiceURL = MAPSERVICE ENDPOINT URL;
var _AfricaClipGPService = GPSERVICE ENDPOINT;
var _areaCalcURL = GEOMETRY SERVER ENDPOINT;
var _gsURL = GEOMETRY SERVER ENDPOINT;

//Config
var _sizeThreshold = 1149691; //sq km - If area is smaller than that - About the size of Mali