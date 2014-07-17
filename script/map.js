dojo.require("dijit.dijit"); // optimize: load dijit layer
dojo.require("dijit.layout.BorderContainer");
dojo.require("dijit.layout.TabContainer");
dojo.require("dijit.layout.ContentPane");
dojo.require("esri.map");
dojo.require("esri.toolbars.draw");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.TitlePane");
dojo.require("dijit.form.Slider");
dojo.require('dojo.fx');
dojo.require("esri.tasks.geometry");
dojo.require("dijit.Dialog");

dojo.NodeList.prototype.hover = function(over, out) {
    return this.onmouseenter(over).onmouseleave(out || over);
}


var map, toolbar, symbol, geomTask, streetmap, mapToClip, roadslayer, resizeTimer;
var tocHTML = ""; //used to update the toc 
var visible = [];
var transparencyLayerID = "";
var mapOnLoad_connect;
var _servirID = "Servir";
var _roadsID = "Africa_Roads";
var _groupLayerList = [];

var _statusMessages = { esriJobSucceeded: "Processing Complete", esriJobExecuting: "Processing", esriJobSubmitted: "Processing", esriJobFailed: "There was a problem processing the request.", esriJobWaiting: "Waiting to Process" };
var _rasterlayerstodownload = "";
var _emptyrasterlayerstodownload = "";

var _vectorlayerstodownload = "";
var _emptyvectorlayerstodownload = "";

var _geometryService;


function init() {
    //IE Hack
    // Apply patch to InfoWindow::resize method
    (function() {
        var oldResize = esri.dijit.InfoWindow.prototype.resize;
        esri.dijit.InfoWindow.prototype.resize = function(width, height) {
            if (!width || !height) {
                return;
            }
            oldResize.apply(this, arguments);
        };
    } ());

    dojo.query("uxStartDrawing").hover(function(e) { StartDrawingMouseOver(); }, function(e) { StartDrawingMouseOut(); });

    // Reference a proxy page
    esriConfig.defaults.io.proxyUrl = "proxy.ashx";
    esriConfig.defaults.io.alwaysUseProxy = false;

    // Set up the map
    streetmap = new esri.layers.ArcGISTiledMapServiceLayer(
        _BasemapURL, {
        visible: true,
        id: "Aerial Imagery"
    });

    

    mapToClip = new esri.layers.ArcGISDynamicMapServiceLayer
                (_AfricaMixServiceURL, {
                    visible: true,
                    id: _servirID
                });


    roadslayer = new esri.layers.ArcGISDynamicMapServiceLayer
                (_AfricaRoadsServiceURL, {
                    visible: true,
                    id: _roadsID
                });

    var layerLoadCount = 0;
    //When both layers have loaded, run addLayersSetExtent
    dojo.connect(mapToClip, "onLoad", function(service) {
        layerLoadCount += 1;
        if (layerLoadCount === 2) {
            createMapAddLayers(mapToClip, roadslayer, streetmap);
        }
    });

    dojo.connect(roadslayer, "onLoad", function(service) {
        layerLoadCount += 1;
        if (layerLoadCount === 2) {
            createMapAddLayers(mapToClip, roadslayer, streetmap);
        }
    });

    // Create the geoprocessor
    gp = new esri.tasks.Geoprocessor(_AfricaClipGPService);
    _geometryService = new esri.tasks.GeometryService(_gsURL);

    dojo.connect(_geometryService, "onAreasAndLengthsComplete", outputAreaAndLength);
//    dojo.connect(_geometryService, "onProjectComplete", function(graphics) {
//        //call GeometryService.lengths() with projected geometry
//        _geometryService.areasAndLengths(graphics); //, function(result) {
//            //var perimeter = result.lengths[0];
//            //var area = result.areas[0];
//            //alert(area);
//        //});
//    });

    resizeMap();
}

//Create a map, set the extent, and add the services to the map.
function createMapAddLayers(mixedmap, roads, basemap) {
    //create map
    map = new esri.Map("mapDiv", { extent: mapToClip.initialExtent });

    map.addLayer(basemap);
    addToTOC(basemap, false);
    map.addLayer(mixedmap);
    addToTOC(mixedmap, true);
    _groupLayerList.push(_servirID);
    map.addLayer(roads);
    addToTOC(roads, true);
    _groupLayerList.push(_roadsID);

    dojo.connect(dijit.byId('mapDiv'), 'resize', function() {
        resizeMap();
    });

    createToolbar();
}

//Handle resize of browser
function resizeMap() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
        map.resize();
        map.reposition();
    }, 800);
}

// Create the draw toolbar
function createToolbar() {
    toolbar = new esri.toolbars.Draw(map);
    dojo.connect(toolbar, "onDrawEnd", addToMap);
}

// On draw end, add the graphic to the map and run clip and ship
var _graphic;
function addToMap(geometry) {
    var symbol = new esri.symbol.SimpleFillSymbol();
    _graphic = new esri.Graphic(geometry, symbol);
    map.graphics.add(_graphic);

    ValidateSize();

    toolbar.deactivate();
    map.showZoomSlider();
    
    //runGpTask(graphic);
}

function ShowDoubleCheckWindow() {
    dijit.byId('uxVerifyDownload').show();
}

function ShowAreaTooLargeWindow() {
    dijit.byId('uxSizeError').show();
}

function AcceptDownload() {
    runGpTask(_graphic);
    dijit.byId('uxVerifyDownload').hide();
}

function ValidateSize() {
    var sr = new esri.SpatialReference({ "wkid": 53030 }); //Robinson Projection
    _geometryService.project([_graphic], sr, function(projectedGraphic) {
        //var areasAndLengthParams = new esri.tasks.AreasAndLengthsParameters();
        //areasAndLengthParams.linearUnit = esri.tasks.GeometryService.UNIT_FOOT;
        //areasAndLengthParams.areaUnit = esri.tasks.GeometryService.UNIT_SQUARE_KILOMETERS;
        //areasAndLengthParams.polygons = [projectedGraphic[0]];
    _geometryService.areasAndLengths(projectedGraphic);
    });
}

function outputAreaAndLength(result) {
    console.log(dojo.toJson(result));
    //Mali (the benchmark) is 1149691776853 units sq m
    if (result.areas[0]*.000001 <= _sizeThreshold) {
        ShowDoubleCheckWindow();
    }
    else {
        ShowAreaTooLargeWindow();
    }
    //alert((parseFloat(result.areas[0] * .000001)));  //convert sq meters to sq km
    //dojo.byId("area").innerHTML = result.areas[0] + " square meters";
    //dojo.byId("length").innerHTML = result.lengths[0] + " meters";
}

function CancelDownload() {
    //reset map and drawing stuff.
    map.graphics.clear();
    dojo.byId("messages").innerHTML = "Processing canceled.  Draw another area to download data.";
    dojo.style(dojo.byId("uxWait"), "display", "none");
    dijit.byId('uxVerifyDownload').hide();
}

function ResetDrawingTools() {
    map.graphics.clear();
    dijit.byId('uxSizeError').hide();
    validateEmail();
}

// Run clip and ship
function runGpTask(graphic) {

    // Set up area to download parameter
    var clipFeature = [];
    clipFeature.push(graphic);
    var clipFeatureSet = new esri.tasks.FeatureSet();
    clipFeatureSet.features = clipFeature;



    // Set up layers to download parameter
    var layers = [];
    var layerBuildingsAtts = { LayerName: "Africa_Lithology", DownLoad: "Yes" };
    var layerBuildingsGraphic = new esri.Graphic();
    layerBuildingsGraphic.setAttributes(layerBuildingsAtts);
    layers.push(layerBuildingsGraphic);
    var layersToDownload = new esri.tasks.FeatureSet();
    layersToDownload.features = layers;

    // Set up e-mail address parameter. 
    // TODO: Add validation
    var email = dojo.byId("email").value;

    // Submit the job with the required parameters
    var params = { "AOI": clipFeatureSet, "Email": email, "Raster_Layers_To_Download": _rasterlayerstodownload, "Vector_Layers_To_Download": _vectorlayerstodownload };

    //var params = { "Area_to_Zip": clipFeatureSet, "Email_Zip_To": email, "Raster_Layers_to_Download": _rasterlayerstodownload, "Vector_Layers_to_Download":_vectorlayerstodownload};
    gp.submitJob(params, completeCallback, statusCallback);
}

function statusCallback(jobInfo) {
    // Display the status for debugging purposes

    dojo.style(dojo.byId("uxWait"), "display", "inline");

    //var status = jobInfo.jobStatus;
    //dojo.byId("messages").innerHTML = "<b>Status: " + status + "</b>";

    // Display the status for debugging purposes
    var status = jobInfo.jobStatus;
    var cleanedMsg;
    try {
        cleanedMsg = eval("_statusMessages." + status);
    }
    catch (e) {
        cleanedMsg = "Processing.";
    }
    dojo.byId("messages").innerHTML = "Status: " + cleanedMsg + "...";
}


function completeCallback(jobInfo) {
    var status = jobInfo.jobStatus;
    map.graphics.clear();
    //Assume Success
    var m = "Complete. " + "<b>An E-mail has been sent to " + dojo.byId('email').value + ".</b>";
    if (status == "esriJobFailed") {
        m = "There was a problem processing your request.  Please try again later.";
    }
    
    dojo.byId("messages").innerHTML = m;
    dojo.byId("email").value = "";
    dojo.style(dojo.byId("uxWait"), "display", "none");
}

//**************************************************************
//TOC FUNCTIONS

function addToTOC(layer, listLayers) {
    if (listLayers) {
        if (layer.loaded) {
            buildLayerList(layer);
        }
        else {
            dojo.connect(layer, "onLoad", buildLayerList);
        }
    }
    else {
        if (layer.loaded) {
            buildLayerListRoot(layer);
        }
        else {
            dojo.connect(layer, "onLoad", buildLayerListRoot);
        }
    }
}

function buildLayerListRoot(layer) {
    addToTransparencyList(layer);
    var currentLayer = layer;
    tocHTML = "<img src='images/blank.bmp'><input type='checkbox' dojotype='dijit.form.CheckBox' class='TOC_Root' " + (currentLayer.visible ? " CHECKED " : "") + " id='" + currentLayer.id + "' onclick=\"toggleService('" + currentLayer.id + "');\" /><label for='" + currentLayer.id + "'>" + currentLayer.id + "</label><br>" + tocHTML;
    //tocHTML = "<input id='" + currentLayer.id + "' dojotype='dijit.form.CheckBox' class='TOC_Root' name='developer' " + (currentLayer.visible ? " CHECKED " : "") + " value='on' type='checkbox' onclick=\"toggleService('" + currentLayer.id + "');\" /><label for='" + currentLayer.id + "'>" + currentLayer.id + "</label>"  + tocHTML; 
    dojo.byId("toc").innerHTML = tocHTML;
}

function toggleLayer(id) {
    var layerDiv = dojo.byId(id + 'Layers');
    var icon = dojo.byId(id + 'Icon');
    if (layerDiv.style.display == 'block') {
        icon.src = "images/expand.bmp";
        layerDiv.style.display = 'none';
    }
    else {
        icon.src = "images/close.bmp";
        layerDiv.style.display = 'block';
    }

}

function zoomToLayer(id) {
    var layer = map.getLayer(id);
    if (layer != null) {
        map.setExtent(layer.fullExtent);
    }
}

function buildLayerList(layer) {

    addToTransparencyList(layer);
    var currentLayer = layer;
    var currentHTML = "";
    currentHTML += "<img src='images/close.bmp' id='" + currentLayer.id + "Icon' onclick=\"toggleLayer('" + currentLayer.id + "')\" ><input type='checkbox' dojotype='dijit.form.CheckBox' class='TOC_Root' " + (currentLayer.visible ? " CHECKED " : "") + " id='" + currentLayer.id + "' onclick=\"toggleService('" + currentLayer.id + "');\" /><label for='" + currentLayer.id + "'>" + currentLayer.id + "</label><br>";

    //currentHTML += "<img src='images/expand.bmp' id='" + currentLayer.id + "Icon' onclick=\"toggleLayer('" + currentLayer.id + "')\" ><input type='checkbox' dojotype='dijit.form.CheckBox' class='TOC_Root' " + (currentLayer.visible ? " CHECKED " : "") + " id='" + currentLayer.id + "' onclick=\"toggleService('" + currentLayer.id + "');\" /><label for='" + currentLayer.id + "'>" + currentLayer.id + "</label><br>";

    var subLayers = currentLayer.layerInfos;

    currentHTML += "<div id='" + currentLayer.id + "Layers' style='display:block;'>";

    //currentHTML += "<div id='" + currentLayer.id + "Layers' style='display:none;'>";

    for (var i = 0; i < subLayers.length; i++) {
        var currentSubLayer = subLayers[i];
        if (currentSubLayer.defaultVisibility) {
            visible.push(currentSubLayer.id);
        }
        currentHTML += "<img src='images/blank.bmp'><img src='images/blank.bmp'><input type='checkbox' title='" + currentSubLayer.name + "' class='" + currentLayer.id + "TOC' " + (currentSubLayer.defaultVisibility ? " CHECKED " : "") + " id='" + currentSubLayer.id + "' onclick=\"updateLayerVisibility('" + currentLayer.id + "','" + currentSubLayer.id + "');\" /><label for='" + currentSubLayer.id + "'>" + currentSubLayer.name + "</label><br>";
    }
    currentHTML += "</table></div>";

    tocHTML = currentHTML + tocHTML;

    dojo.byId("toc").innerHTML = tocHTML;
}



function updateLayerVisibility(serviceID, layerid) {
    var inputs = dojo.query("." + serviceID + "TOC"), input;
    visible = [];
    for (var i = 0, il = inputs.length; i < il; i++) {
        if (inputs[i].checked) {
            visible.push(inputs[i].id);
        }
    }

    var layer = map.getLayer(serviceID);
    layer.setVisibleLayers(visible);
}

function validateEmail() {
    if (dijit.byId("email").value.length > 0) {
        getLayerStatus();
        toolbar.activate(esri.toolbars.Draw.POLYGON);
        //toolbar.activate(esri.toolbars.Draw.FREEHAND_POLYGON);
        map.hideZoomSlider();
        //Set messages panel, open it.
        dojo.byId("messages").innerHTML = "Drawing mode activated.  Draw your area of interest by clicking on the map.  Double click when finished.";
        TogglePopout("show");
    }
    else {
        alert("Please enter an e-mail before drawing an area.");
    }

}

function getLayerStatus() {
    _rasterlayerstodownload = "";
    _emptyrasterlayerstodownload = "";
    _vectorlayerstodownload = "";
    _emptyvectorlayerstodownload = "";

    var masterchecklist = "";

    //See if the group layers are checked or unchecked
    for (var a = 0; a < _groupLayerList.length; a++) {
        if (dojo.byId(_groupLayerList[a]).checked == true) {
            masterchecklist == "" ? masterchecklist = "." + _groupLayerList[a] + "TOC" : masterchecklist += ",." + _groupLayerList[a] + "TOC";
        }
    }

    var inputs = dojo.query(masterchecklist), input;
    //visible = [];
    for (var i = 0, il = inputs.length; i < il; i++) {
        if (inputs[i].checked) {
            for (var j = 0; j < _DataSources.length; j++) {
                if (_DataSources[j].Name == inputs[i].title) {
                    if (_DataSources[j].Type == "Raster") {
                        if (_rasterlayerstodownload.indexOf(_DataSources[j].Source, 0) == -1) {
                            _rasterlayerstodownload == "" ? _rasterlayerstodownload = _DataSources[j].Source : _rasterlayerstodownload += "," + _DataSources[j].Source;
                        }
                    }
                    else {
                        if (_vectorlayerstodownload.indexOf(_DataSources[j].Source, 0) == -1) {
                            _vectorlayerstodownload == "" ? _vectorlayerstodownload = _DataSources[j].Source : _vectorlayerstodownload += "," + _DataSources[j].Source;
                        }
                    }
                }
            }
        }
        else {
            for (var j = 0; j < _DataSources.length; j++) {
                if (_DataSources[j].Name == inputs[i].title) {
                    if (_DataSources[j].Type == "Raster") {
                        if (_emptyrasterlayerstodownload.indexOf(_DataSources[j].Source, 0) == -1) {
                            _emptyrasterlayerstodownload == "" ? _emptyrasterlayerstodownload = _DataSources[j].Source : _emptyrasterlayerstodownload += "," + _DataSources[j].Source;
                        }
                    }
                    else {
                        if (_emptyvectorlayerstodownload.indexOf(_DataSources[j].Source, 0) == -1) {
                            _emptyvectorlayerstodownload == "" ? _emptyvectorlayerstodownload = _DataSources[j].Source : _emptyvectorlayerstodownload += "," + _DataSources[j].Source;
                        }
                    }
                }
            }
        }
    }

    
}

function toggleService(layerID) {
    var layer = map.getLayer(layerID);
    if (layer.visible) {
        layer.hide();
    }
    else {
        layer.show();
    }
}
//END TOC FUNCTIONS
//**************************************************************


//**************************************************************
//Transparency FUNCTIONS

function addToTransparencyList(layer) {
    var selectObject = dojo.byId("transparencyList");
    var optionObject = new Option(layer.id, layer.id);
    selectObject.options[selectObject.options.length] = optionObject;

    var list = new Array();
    for (var i = 0; i < selectObject.options.length; i++) {
        list.push(selectObject.options[i].value);
    }

    selectObject.options.length = 0;
    list.sort();
    for (var j = 0; j < list.length; j++) {
        var optionObject = new Option(list[j], list[j]);
        selectObject.options[selectObject.options.length] = optionObject;
    }
}

function updateTransparencyLayer(layerId) {
    transparencyLayerID = layerId;
    var layer = map.getLayer(transparencyLayerID);
    if (layer != null) {
        dijit.byId('slider').setValue(layer.opacity * 100);
    }
}

function changeTransparency(value) {

    var layer = map.getLayer(transparencyLayerID);
    if (layer != null) {
        layer.setOpacity(value);
    }
}
//END Transparency FUNCTIONS
//**************************************************************

function ToggleInstructions(direction) {
    //SlideDown(200);
    if (direction == "show") {
        dojo.style(dojo.byId("uxInstructions"), "display", "block");
        dojo.query("#uxInstructTab")[0].onclick = function() { ToggleInstructions('hide'); };
        dojo.style(dojo.byId("uxInstructionArrowDown"), "display", "none");
        dojo.style(dojo.byId("uxInstructionArrowUp"), "display", "block");
    }
    else {
        dojo.style(dojo.byId("uxInstructions"), "display", "none");
        dojo.query("#uxInstructTab")[0].onclick = function() { ToggleInstructions('show'); };
        dojo.style(dojo.byId("uxInstructionArrowDown"), "display", "block");
        dojo.style(dojo.byId("uxInstructionArrowUp"), "display", "none");
    }
}

function TogglePopout(direction) {
    if (direction == "show") {
        dojo.style(dojo.byId("uxPopout"), "display", "block");
        dojo.style(dojo.byId("uxPopoutTab"), "right", "194px");
        dojo.query("#uxPopoutTab")[0].onclick = function() { TogglePopout('hide'); };
        dojo.style(dojo.byId("uxPopoutArrowLeft"), "display", "none");
        dojo.style(dojo.byId("uxPopoutArrowRight"), "display", "block");
    }
    else {
        dojo.style(dojo.byId("uxPopout"), "display", "none");
        dojo.style(dojo.byId("uxPopoutTab"), "right", "35px");
        dojo.query("#uxPopoutTab")[0].onclick = function() { TogglePopout('show'); };
        dojo.style(dojo.byId("uxPopoutArrowLeft"), "display", "block");
        dojo.style(dojo.byId("uxPopoutArrowRight"), "display", "none");
    }
}

function StartDrawingMouseOver() {
    dojo.byId("uxStartDrawing").src = "images/btn_StartDrawing_hover.png";
}

function StartDrawingMouseOut() {
    dojo.byId("uxStartDrawing").src = "images/btn_StartDrawing.png";
}

dojo.addOnLoad(init);