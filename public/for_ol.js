
var mapView = new ol.View({
    center: ol.proj.fromLonLat([125.568014,8.890400]), //Butuan City Center Coodinates
    zoom: 7,
});

var map = new ol.Map({
    target: 'map',
    view: mapView,
    controls:[]
});

var nonTile = new ol.layer.Tile({
    title: 'None',
    type: 'base',
    visible: false
});
    
var osmTile = new ol.layer.Tile({
    title:'OpenStreetMap',
    type: 'base',
    visible: true,
    source: new ol.source.OSM()
});


var aerialTile = new ol.layer.Tile({
    title: 'Aerial',
    type: 'base',
    source: new ol.source.XYZ({
        attributions: 'Tiles © Esri',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        crossOrigin: 'anonymous'
    })
});



var baseGroup = new ol.layer.Group({
    title: 'Base Maps',
    fold: true,
    layers: [osmTile, nonTile, aerialTile]
});
map.addLayer(baseGroup);

var add_butuan= new ol.layer.Tile({  // layers
    title: 'Butuan',
    // opacity: 1,
    source:new ol.source.TileWMS({
        url: 'http://localhost:8080/geoserver/ITE-18-WEBGIS/wms',
        params:{
            'LAYERS': 'ITE-18-WEBGIS:projected_butuan',
            'TILED': true},
            serverType: 'geoserver',
            visible: true
        })
});
 //map.addLayer(add_butuan);

// Mangrove data is bundled with the application as GeoJSON. This replaces the
// former GeoServer WMS dependency, so the overlay works with only `npm run dev`.
var activeProvinceFilter = null;
var mangroveStyle = new ol.style.Style({
    fill: new ol.style.Fill({color: 'rgba(71, 153, 94, 0.42)'}),
    stroke: new ol.style.Stroke({color: 'rgba(202, 239, 166, 0.9)', width: 1})
});
var mangroveSource = new ol.source.Vector({
    strategy: ol.loadingstrategy.all,
    loader: function(extent, resolution, projection, success, failure) {
        fetch('data/mangroves.geojson')
            .then(function(response) {
                if (!response.ok) throw new Error('Could not load mangrove data');
                return response.json();
            })
            .then(function(data) {
                var features = new ol.format.GeoJSON().readFeatures(data, {
                    dataProjection: 'EPSG:4326',
                    featureProjection: projection
                });
                mangroveSource.addFeatures(features);
                success(features);
            })
            .catch(function(error) {
                mangroveSource.removeLoadedExtent(extent);
                console.error(error);
                if (failure) failure();
            });
    }
});
var add_mangrove = new ol.layer.Vector({
    title: 'Mangroves',
    opacity: 1,
    source: mangroveSource,
    style: function(feature) {
        return !activeProvinceFilter || String(feature.get('PROVINCE')).toUpperCase() === activeProvinceFilter.toUpperCase() ? mangroveStyle : null;
    }
});

//Landcover end


var overlayGroup = new ol.layer.Group({  // overlays
    title: 'Overlays',
    fold: true,
    layers: [add_mangrove]
});
map.addLayer(overlayGroup);

// Marker used by the React search and "use my location" controls.
var searchMarkerSource = new ol.source.Vector();
var searchMarkerLayer = new ol.layer.Vector({
    source: searchMarkerSource,
    style: new ol.style.Style({
        image: new ol.style.Circle({
            radius: 8,
            fill: new ol.style.Fill({color: '#f5cb62'}),
            stroke: new ol.style.Stroke({color: '#143c31', width: 3})
        })
    })
});
map.addLayer(searchMarkerLayer);

function showSearchLocation(longitude, latitude) {
    var coordinate = ol.proj.fromLonLat([longitude, latitude]);
    searchMarkerSource.clear();
    searchMarkerSource.addFeature(new ol.Feature(new ol.geom.Point(coordinate)));
    map.getView().animate({center: coordinate, zoom: 11, duration: 850});
}

// The surrounding React page communicates with this embedded map using
// same-origin postMessage events. Keeping the map in its own document lets
// the legacy OpenLayers controls continue to work unchanged.
window.addEventListener('message', function(event) {
    if (event.origin !== window.location.origin || !event.data) return;

    if (event.data.type === 'zoomTo') {
        showSearchLocation(event.data.longitude, event.data.latitude);
    }

    if (event.data.type === 'setOpacity') {
        add_mangrove.setOpacity(event.data.opacity);
    }

    if (event.data.type === 'filterProvince') {
        activeProvinceFilter = event.data.province || null;
        add_mangrove.changed();
    }
});
        
var layerSwitcher= new ol.control.LayerSwitcher({   // switcher
    activationMode: 'click',
    startActive: false,
    groupSelectStyle: 'children'
});
map.addControl(layerSwitcher);

var mousePosition = new ol.control.MousePosition({
    className: 'mousePosition',
    projection: 'EPSG:4326',
    coordinateFormat: function(coordinate){return ol.coordinate.format(coordinate, '{y},{x}', 6);}
});
map.addControl(mousePosition);

var scaleControl = new ol.control.ScaleLine({
    bar: true,
    text: true
});
map.addControl(scaleControl);

var container = document.getElementById('popup');
var content = document.getElementById('popup-content');
var closer = document.getElementById('popup-closer');

var popup = new ol.Overlay({
    element: container,
    autoPan: true,
    autoPanAnimation:{
        duration: 250,
    },
});
map.addOverlay(popup);

closer.onclick = function(){
    popup.setPosition(undefined);
    closer.blur();
    return false;
};

map.on('singleclick', function(e){
  
    if(featureInfoFlag){
        content.innerHTML ='';
        var feature = map.forEachFeatureAtPixel(e.pixel, function(clickedFeature, layer) {
            return layer === add_mangrove ? clickedFeature : undefined;
        });

        if (!feature) {
            popup.setPosition(undefined);
            return;
        }

        var props = feature.getProperties();
        content.innerHTML =
            "<h3 style='display: inline-block;'>Landcover:</h3><p style='display: inline-block;'>" + (props.LCOV || 'Mangrove').toUpperCase() + "</p><br>" +
            "<h3 style='display: inline-block;'>Province:</h3><p style='display: inline-block;'>" + (props.PROVINCE || 'Not available') + "</p><br>" +
            "<h3 style='display: inline-block;'>Area:</h3><p style='display: inline-block;'>" + (props.AREA || 'Not available') + "</p><br>" +
            "<h3 style='display: inline-block;'>Region:</h3><p style='display: inline-block;'>" + (props.REGION || 'Not available') + "</p>";
        popup.setPosition(e.coordinate);
    }
});

var homeButton = document.createElement('button');
homeButton.innerHTML = '<img src = "images/controls/home.png" alt="HOME" style="width:20px;height:20px;filter:brightness(0);vertical-align:middle"></img>';
homeButton.className = 'myButton';

var homeElement = document.createElement('div');
homeElement.className = 'homeButtonDiv';
homeElement.appendChild(homeButton);

var homeControl = new ol.control.Control({
    element: homeElement
});

homeButton.addEventListener("click", () =>{
    map.getView().animate({
        center: ol.proj.fromLonLat([125.568014, 8.890400]),
        zoom: 7,
        duration: 700
    });
})

map.addControl(homeControl);

var fsButton = document.createElement('button');
fsButton.innerHTML = '<img src = "images/controls/fullscreen.png" alt = "FULLSCREEN" style = "width:20px;height:20px;filter:brightness(0);vertical-align:middle"></img>';
fsButton.className = 'myButton';

var fsElement = document.createElement('div');
fsElement.className = 'fsButtonDiv';
fsElement.appendChild(fsButton);

var fsControl = new ol.control.Control({
    element: fsElement
})

fsButton.addEventListener("click", () => {
    var mapEle = document.getElementById("map");
    if (mapEle.requestFullscreen) {
        mapEle.requestFullscreen();
    } else if (mapEle.mozRequestFullScreen) {
        mapEle.mozRequestFullScreen();
    } else if (mapEle.webkitRequestFullScreen) {
        mapEle.webkitRequestFullScreen();
    } else if (mapEle.msRequestFullScreen) {
        mapEle.msRequestFullScreen();
    }
});

map.addControl(fsControl);

var featureInfoButton = document.createElement('button');
featureInfoButton.innerHTML = '<img src = "images/controls/featureInfo.png" alt = "FEATURE INFO" style = "width:20px;height:20px;filter:brightness(0);vertical-align:middle"></img>';
featureInfoButton.className = 'myButton';
featureInfoButton.id = 'featureInfoButton';

var featureInfoElement = document.createElement('div');
featureInfoElement.className = 'featureInfoButtonDiv';
featureInfoElement.appendChild(featureInfoButton);

var featureInfoControl = new ol.control.Control({
    element: featureInfoElement
})

var featureInfoFlag = false;
featureInfoButton.addEventListener("click", () => {
    featureInfoButton.classList.toggle('clicked');
    featureInfoFlag = !featureInfoFlag;
})

map.addControl(featureInfoControl);

//start of length control
var lengthButton = document.createElement('button');
lengthButton.innerHTML = '<img src= "images/controls/length.png" alt="LENGTH" style="width:20px;height:20px; filter:brightness(0); vertical-align:middle"></img>'; 
lengthButton.className = 'myButton';
lengthButton.id = 'lengthButton';

var lengthElement = document.createElement('div');
lengthElement.className = 'lengthButtonDiv'; 
lengthElement.appendChild(lengthButton);

var lengthControl = new ol.control.Control({ 
    element: lengthElement
})

var lengthFlag = false;
lengthButton.addEventListener("click", () => {
    lengthButton.classList.toggle('clicked');
    lengthFlag - !lengthFlag;
    document.getElementById("map").style.cursor = "default";
    if(lengthFlag){
        map.removeInteraction(draw);
        addInteraction('LineString');
    }else{
        map.removeInteraction(draw);
        source.clear();
        const elements = document.getElementsByClassName("ol-tooltip ol-tooltip-static"); 
        while(elements.length > 0) elements[0].remove();

    }
});
map.addControl(lengthControl);
//end of lengthControl

//start of areaControl
var areaButton = document.createElement('button');
areaButton.innerHTML = '<img src="images/controls/area.png" alt="AREA" style="width:20px; height:20px; filter:brightness(0);vertical-align:middle"></img>'; 
areaButton.className = 'myButton';
areaButton.id = 'areaButton';

var areaElement = document.createElement('div');
areaElement.className = 'areaButtonDiv'; 
areaElement.appendChild(areaButton);

var areaControl = new ol.control.Control({
    element: areaElement
})

var areaFlag = false;
areaButton.addEventListener("click", () => {
    areaButton.classList.toggle('clicked');
    areaFlag = !areaFlag;
    document.getElementById("map").style.cursor = "default";
    if(areaFlag){
        map.removeInteraction(draw);
        addInteraction('Polygon');
    }else{
        map.removeInteraction(draw);
        source.clear();
        const elements = document.getElementsByClassName("ol-tooltip ol-tooltip-static");
        while(elements.length > 0) elements[0].remove();
    }
});
map.addControl(areaControl);
//end of areaControl

// start of zoom-in Control
var zoomInInteraction = new ol.interaction.DragBox();

zoomInInteraction.on('boxend', function(){
    var zoomInExtent = zoomInInteraction.getGeometry().getExtent(); 
    map.getView().fit(zoomInExtent);
});

var ziButton = document.createElement('button');
ziButton.innerHTML = '<img src="images/controls/zoom-in.png" alt="ZOOM-IN" style="width:20px; height:20px; filter:brightness(0);vertical-align:middle"></img>'; 
ziButton.className = 'myButton';
ziButton.id = 'ziButton';

var ziElement = document.createElement('div');
ziElement.className = 'ziButtonDiv';
ziElement.appendChild(ziButton);

var ziControl = new ol.control.Control({
    element: ziElement
})

var zoomInFlag= false;
ziButton.addEventListener("click", () => {
    ziButton.classList.toggle('clicked'); 
    zoomInFlag= !zoomInFlag;
    if(zoomInFlag){
        document.getElementById("map").style.cursor = "zoom-in";
        map.addInteraction(zoomInInteraction);
    }else{
        map.removeInteraction(zoomInInteraction);
        document.getElementById("map").style.cursor="default";
    }
});
map.addControl(ziControl);
//end of zoon-in control

//start of zoom-out control
var zoomOutInteraction = new ol.interaction.DragBox();
zoomOutInteraction.on('boxend', function(){
    var zoomOutExtent = zoomOutInteraction.getGeometry().getExtent();   
    map.getView().setCenter(ol.extent.getCenter(zoomOutExtent)); 
    mapView.setZoom(mapView.getZoom() - 1);
});

var zoButton = document.createElement('button');
zoButton.innerHTML = '<img src="images/controls/zoom-out.png" alt="ZOOM-OUT" style="width:20px; height:20px; filter:brightness(0);vertical-align:middle"></img>'; 
zoButton.className = 'myButton';
zoButton.id = 'zoButton';

var zoElement = document.createElement('div'); 
zoElement.className='zoButtonDiv'; 
zoElement.appendChild(zoButton);

var zoControl = new ol.control.Control({
    element: zoElement
})

var zoomOutFlag = false;
zoButton.addEventListener("click", () => {
    zoButton.classList.toggle('clicked'); 
    zoomOutFlag = !zoomOutFlag; 
    if(zoomOutFlag){
        document.getElementById("map").style.cursor = "zoom-out"; 
        map.addInteraction (zoomOutInteraction);
    }else{
        map.removeInteraction(zoomOutInteraction);
        document.getElementById("map").style.cursor="default";
    }
})
map.addControl(zoControl);
//end of zoom-out control

/**
*Message to show when the user draws a polygon.
* @type {string}
*/

var continuePolygonMsg = 'Click to continue drawing the polygon, Double click to complete it.';

/**
 * Message to show when the user is drawing a line.
 * @type {string}
 */

var continueLineMsg = 'Click to continue drawing the line, Double click to complete it.'; 
var draw; // global so we can remove it later

var source = new ol.source.Vector();
var vector = new ol.layer.Vector({
    source: source,
    style: new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(255, 255, 255, 0.2)'
        }),
        stroke: new ol.style.Stroke({
            color: '#ffcc33',
            width: 2
        }),
        image: new ol.style.Circle({
            radius: 7,
            fill: new ol.style.Fill({
                color: '#ffcc33'
            }),
        }),
    }),
});

map.addLayer(vector);

function addInteraction (intType){ 
    draw = new ol.interaction. Draw({
        source: source,
        type: intType,
        style: new ol.style.Style({ 
            fill: new ol.style.Fill({
                color: 'rgba(200, 200, 200, 0.6)'
            }),
            stroke: new ol.style.Stroke({
                color: '#ffcc33',
                lineDash: [10, 10],
                width: 2
            }),

            image: new ol.style.Circle({
            radius: 5,
            stroke: new ol.style.Stroke({ 
                color: 'rgba(0, 0, 0, 0.7)',
            }),
            fill: new ol.style.Fill({
                color: '#ffcc33'
            }),
        }),
    }),
});
map.addInteraction (draw);

createMeasureTooltip();
createHelpTooltip();

/**
 * Currently drawn features.
 * @type {import("../ol/Feature.js").default}
*/
var sketch;

/**
* Handle pointer move.
@param {import("../ol/MapBrowserEvent.js").default} evt Map browser event.
*/

var pointerMoveHandler = function(evt){
    if (evt.dragging){
        return;
    }
    /**@type {string} */
    var helpMsg = 'Click to start drawing';

    if(sketch) {
        var geom = sketch.getGeometry();

    }
};

map.on('pointermove', pointerMoveHandler);

draw.on('drawstart', function(evt){
    //set sketch
    sketch = evt.feature;

/**
 * @type {import("../ol/coordinate.js").Coordinate underfined} 
*/ 
var tooltipCoord = evt.coordinate;

sketch.getGeometry().on('change', function(evt) { 
    var geom = evt.target;
    var output;

    if (geom instanceof ol.geom.Polygon){ 
        output = formatArea(geom);
        tooltipCoord = geom.getInteriorPoint().getCoordinates(); 
    } else if(geom instanceof ol.geom.LineString) { 
        output = formatLength(geom);
        tooltipCoord = geom.getLastCoordinate();
    }
    measureTooltipElement.innerHTML = output; 
    measureTooltip.setPosition(tooltipCoord);
    });
});

draw.on('drawend', function(){
    measureTooltipElement.className = 'ol-tooltip ol-tooltip-static';
    measureTooltip.setOffset([0, -7]);
    //unset sketch
    sketch = null;
    //unset tooltip so that a new one can be created
    measureTooltipElement = null;
    createMeasureTooltip();
});
}

/**
* the help tooltip element
*@type {HTMLElement}
 */
var helpTooltipElement;




/**
* Overlay to show the help messages
*@type {Overlay}
 */
var helpTooltip;

/**
 * Creates a new help tooltip.
 */
function createHelpTooltip() {
    if (helpTooltipElement) {
        helpTooltipElement.parentNode.removeChild(helpTooltipElement);
    }
    helpTooltipElement = document.createElement('div');
    helpTooltipElement.className = 'ol-tooltip hidden';
    helpTooltip = new ol.Overlay({
        element: helpTooltipElement,
        offset: [15, 0],
        positioning: 'center-left',
    });
    map.addOverlay(helpTooltip);

    // Add an event listener to hide the tooltip when the mouse is out
    map.getViewport().addEventListener('mouseout', function () {
        helpTooltipElement.classList.add('hidden');
    });
}
/** 
 * The measure tooltip element.
 * @type {HTMLElement}
*/
var measureTooltipElement;

/** 
 * Overlay to show the measurement. 
 * @type {Overlay}
*/
var measureTooltip;

/** 
 * Creates a new measure tooltip. 
*/

function createMeasureTooltip(){ 
    if (measureTooltipElement){
        measureTooltipElement.parentNode.removeChild (measureTooltipElement);
    }
    measureTooltipElement = document.createElement('div');
    measureTooltipElement.className = 'ol-tooltip ol-tooltip-measure'; 
    measureTooltip = new ol.Overlay({
        element: measureTooltipElement,
        offset: [0, -15],
        positioning: 'bottom-center',
    });
    map.addOverlay(measureTooltip);
}

    
/** 
 * Format length output.
 * @param {LineString} line The line.
 * @return {string} The formatted length.
*/ 
    
var formatLength = function(line){
    var length = ol.sphere.getLength(line);
    var output;
    if (length > 100){
        output = (Math.round(length / 1000 * 100) / 100) + ' ' + 'km';
    } else {
        output = (Math.round(length * 100) / 100) + ' ' + 'm';
    }
    return output;
};

/** 
 * Format area output.
 * @param {Polygon} polygon The polygon.
 * @return {string} The formatted area.
*/ 

var formatArea = function (polygon){
    var area = ol.sphere.getArea(polygon);
    var output;
    if (area > 10000){
        output = (Math.round(area / 1000000 * 100) / 100) + ' ' + 'km<sup>2</sup>'; 
    } else {
        output = (Math.round(area * 100) / 100) + ' ' + 'm<sup>2</sup>';
    }
    return output;
};
//start of attribute query control
var geojson;
var featureOverlay;

var qryButton = document.createElement('button');
qryButton.innerHTML = '<img src = "images/controls/attribute-query.png" alt = "ATTRIBUTE-QUERY" style = "width:20px;height:20px;filter:brightness(0);vertical-align:middle"></img>';
qryButton.className = 'myButton';
qryButton.id = 'qryButton';

var qryElement = document.createElement('div');
qryElement.className = 'qryButtonDiv';
qryElement.appendChild(qryButton);

var qryControl = new ol.control.Control({
    element: qryElement
})

var qryFlag = false;
qryButton.addEventListener("click", () => {
    qryButton.classList.toggle('clicked');
    qryFlag = !qryFlag;
    document.getElementById("map").style.cursor="default";
    if(qryFlag){
        if(geojson){
            geojson.getSource().clear();
            map.removeLayer(geojson);
        }
        if (featureOverlay){
            featureOverlay.getSource().clear();
            map.removeLayer(featureOverlay);
        }
        document.getElementById("attQueryDiv").style.display = "block";
        
        bolIdentify = false;

        addMapLayerList();
    } else {
        document.getElementById("attQueryDiv").style.display = "none";
        document.getElementById("attListDiv").style.display = "none";

        if(geojson){
            geojson.getSource().clear();
            map.removeLayer(geojson);
        }
        if(featureOverlay){
            featureOverlay.getSource().clear();
            map.removeLayer(featureOverlay);
        }
    }
});
// The old attribute-query panel required GeoServer WFS. Province filtering is
// now available in the React page, so do not expose a control that would call
// an unavailable local server.

function addMapLayerList(){
    $(document).ready(function(){
        $.ajax({
            type: "GET",
            url: "http://localhost:8080/geoserver/wfs?request=GetCapabilities",
            dataType: "xml",
            success: function(xml){
                var select = $('#selectLayer');
                select.append("<option class='ddindent' value=''></option>");
                $(xml).find('FeatureType').each(function(){
                    $(this).find('Name').each(function  (){
                        var name = $(this).text();
                        select.append("<option class='ddindent' value='" + name + "'>" + name + "</option>");
                    });
                });
            }
        });
    });
};

$(function () {
    document.getElementById("selectLayer").onchange = function () {
        var select = document.getElementById("selectAttribute");
        while(select.options.length > 0){
            select.remove(0);
        }
        var value_layer = $(this).val();
        $(document).ready(function(){
            $.ajax({
                type: "GET",
                url: "http://localhost:8080/geoserver/wfs?service=WFS&request=DescribeFeatureType&version=1.1.0&typeName=" + value_layer,
                dataType: "xml",                
                success: function(xml){
                    var select = $('#selectAttribute');
                    select.append("<option class='ddindent' value=''></option>");
                    $(xml).find('xsd\\:sequence').each(function(){
                        $(this).find('xsd\\:element').each(function(){
                            var value = $(this).attr('name');
                            var type = $(this).attr('type');
                            if (value != 'geom' && value != 'the_geom'){
                                select.append("<option class='ddindent' value='" + type + "'>" + value + "</option>");
                            }
                        });
                    });
                }
            });
        });
    }

    document.getElementById("selectAttribute").onchange = function() {
        var operator = document.getElementById("selectOperator");
        while (operator.options.length > 0) {
            operator.remove(0);
        }
        
        var value_type = $(this).val();
        var value_attribute = $('#selectAttribute option:selected').text();
        operator.options[0] = new Option('Select operator', "");
        
        if (value_type == 'xsd:short' || value_type == 'xsd:int' || value_type == 'xsd:double'){
            var operator1 = document.getElementById("selectOperator");
            operator1.options[1] = new Option('Greater than', '>');
            operator1.options[2] = new Option('Less than', '<');
            operator1.options[3] = new Option('Equal to', '=');
        }
        else if (value_type == 'xsd:string'){
            var operator1 = document.getElementById("selectOperator");
            operator1.options[1] = new Option('Like', 'Like');
            operator1.options[2] = new Option('Equal to', '=');
        }
    }
        
    document.getElementById('attQryRun').onclick = function () {
        map.set("isLoading", 'YES');
        
        if (featureOverlay){
        featureOverlay.getSource().clear();
        map.removeLayer(featureOverlay);
        }
        var layer = document.getElementById("selectLayer");
        var attribute = document.getElementById("selectAttribute");
        var operator = document.getElementById("selectOperator");
        var txt = document.getElementById("enterValue");
        
        if(layer.options.selectedIndex == 0){
            alert("Select Layer");
        } else if (attribute.options.selectedIndex == -1){
            alert("Select Attribute");
        } else if (operator.options.selectedIndex <= 0){
            alert("select operator");
        } else if (txt.value.length <= 0){
            alert("Enter value");
        } else {
            var value_layer = layer.options[layer.selectedIndex].value;
            var value_attribute = attribute.options[attribute.selectedIndex].text;
            var value_operator = operator.options[operator.selectedIndex].value;
            var value_txt = txt.value;          
            if (value_operator == 'Like'){
                value_txt = "%25" + value_txt + "%25";
            } else{
                value_txt = value_txt;
            }
            var url = "http://localhost:8080/geoserver/ITE-18-WEBGIS/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=" + value_layer +
            "&CQL_FILTER=" + value_attribute + "+" + value_operator + "+'" + value_txt + "'&outputFormat=application/json";
            newaddGeoJsonToMap(url);
            newpopulateQueryTable(url);
            setTimeout(function () { newaddRowHandlers(url); }, 300);
            map.set("isLoading", 'NO');
        }
    }
});

function newaddGeoJsonToMap(url){
    if(geojson){
        geojson.getSource().clear();
        map.removeLayer(geojson);
    }
    
    var style = new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: '#FFFF00',
            width: 3
        }),
        image: new ol.style.Circle({
            radius: 7,
            fill: new ol.style.Fill({
                color: '#FFFF00'
            })
        })
    });
    
    geojson = new ol.layer.Vector({
        source: new ol.source.Vector({
            url: url,
            format: new ol.format.GeoJSON()
        }),
        style: style,
    });
    
    geojson.getSource().on('addfeature', function(){
        map.getView().fit(
            geojson.getSource().getExtent(),
            {duration: 1590, size: map.getSize(), maxZoom: 21}
        );
    });
    map.addLayer(geojson);
};

function newpopulateQueryTable(url){
    if (typeof attributePanel !== 'undefined'){
        if (attributePanel.parentElement !== null){
            attributePanel.close();
        } 
    }
    $.getJSON(url, function (data){
        var col = [];
        col.push('id');
        for(var i=0; i < data.features.length; i++){
            for (var key in data.features[i].properties){
                if (col.indexOf(key) === -1){
                    col.push(key);
                }
            }
        }
        var table = document.createElement("table");
        table.setAttribute("class", "table table-bordered table-hover table-condensed");
        table.setAttribute("id", "attQryTable");
        // CREATE HTML TABLE HEADER ROW USING THE EXTRACTED HEADERS ABOVE.
    
    var tr = table.insertRow(-1);
    for (var i = 0; i < col.length; i++){
        var th = document.createElement("th");
        th.innerHTML = col[i];
        tr.appendChild(th);
    }
    // ADD JSON DATA TO THE TABLE AS ROWS.
    for (var i=0; i < data.features.length; i++){
        tr = table.insertRow(-1);
        for (var j=0; j < col.length; j++){
            var tabCell = tr.insertCell(-1);
            if (j == 0){ tabCell.innerHTML = data.features[i]['id']; }
            else{
                tabCell.innerHTML = data.features[i].properties[col[j]];
            }
        }
    }
    
    var tabDiv = document.getElementById("attListDiv");

    var delTab = document.getElementById("attQryTable");
    if (delTab){
        tabDiv.removeChild(delTab);
    }
    tabDiv.appendChild(table);
    document.getElementById("attListDiv").style.display = "block";
    
    });
    
    var highlightStyle = new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(255,255,0,0.7)'
        }), 
        stroke: new ol.style.Stroke({
        color: 'rgba(255,0,0,0.7)',
        width: 3
        }),
        image: new ol.style.Circle({
            radius:10,
            fill: new ol.style.Fill({
                color: '#FF00FF'
            })
        })
    });
    
    var featureOverlay = new ol.layer.Vector({
        source: new ol.source.Vector(),
        map: map,
        style: highlightStyle
    });
};

function newaddRowHandlers(){
    var table = document.getElementById("attQryTable");
    var rows = document.getElementById("attQryTable").rows;
    var heads = table.getElementsByTagName('th');
    var col_no;
    for (var i = 0; i < heads.length; i++){
        //Take each cell
        var head = heads[i];
        if (head.innerHTML == 'id'){
            col_no = i + 1;
        }
    }
    for (i = 0; i < rows.length; i++){
        rows[i].onclick = function(){
            return function(){
                featureOverlay.getSource().clear();
                
                $(function () {
                    $("#attQryTable td").each(function () {
                        $(this).parent("tr").css("background-color", "white");
                    });
                });
            
                var cell = this.cells[col_no -1];
                var id = cell.innerHTML;
                $(document).ready(function () {
                    $("#attQryTable td:nth-child(" + col_no + ")").each(function(){
                        if ($(this).text() == id){
                            $(this).parent("tr").css("background-color", "#d1d8e2");
                        }
                    });
                });
                
                var features = geojson.getSource().getFeatures();
                
                for(i = 0; i < features.length; i++){
                    if(features[i].getId() == id){
                        featureOverlay.getSource().addFeature(features[i]);
                        
                        featureOverlay.getSource().on('addfeature', function(){
                            map.getView().fit(
                                featureOverlay.getSource().getExtent(),
                                {duration: 1500, size: map.getSize(), maxZoom: 24}
                            );
                        });
                    }
                }
            };
        }(rows[i]);
    }
}
