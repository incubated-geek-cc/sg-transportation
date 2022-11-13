// ==================== ON LOAD ======================
  if (document.readyState === 'complete' || document.readyState !== 'loading' && !document.documentElement.doScroll) {
    callback();
  } else {
    document.addEventListener('DOMContentLoaded', async() => {
      console.log('DOMContentLoaded');

      const reverseLatLngsUtil = (input_latlngs) => {
        let reverseLatLngsUtil_arr=[];
        for(let rv in input_latlngs) {
          let latlng = input_latlngs[rv];
          let lat=latlng[1];
          let lng=latlng[0];
          let reverse_latlng=[lat,lng];
          reverseLatLngsUtil_arr.push(reverse_latlng);
        }
        return reverseLatLngsUtil_arr;
      };
      const toCamelCase = (str) => ( (str.toLowerCase()).replace(/\w+/g, ((str) => ( str.charAt(0).toUpperCase()+str.substr(1) ).replace(/\r/g, "")) ) );
      const removeArrNullVals = ((arr) => arr.filter(element => (element !== null) ? true : false));

      // IE8
      // IE9+ and other modern browsers
      function triggerEvent(el, type) {
        let e = ( ('createEvent' in document) ? document.createEvent('HTMLEvents') : document.createEventObject() );
        if ('createEvent' in document) { 
          e.initEvent(type, false, true);
          el.dispatchEvent(e);
        } else { 
          e.eventType = type;
          el.fireEvent('on' + e.eventType, e);
        }
      }

      const geojsonBusStopMarkerOptions = {
          radius: 1.5,
          fillColor: "#53738C",
          color: "#ffffff",
          weight: 0.5,
          opacity: 1.0,
          fillOpacity: 1.0
      };
      const antpathSettings={
        "delay": 400,
        "dashArray": [5, 20],
        "weight": 5,
        "color": " #123B5C",
        "pulseColor": "#FFFFFF",
        "paused": false,
        "reverse": false,
        "hardwareAccelerated": true
      };
      antpathSettings["renderer"]=L.svg();

      const northEast = [1.56073, 104.1147];
      const southWest = [1.16, 103.502];

      const minZoomVal=10;
      const maxZoomVal=18;
      const defaultZoom=11;

      const lat = ( northEast[0]+southWest[0] )/2; // 1.3603649999999998
      const lng = ( northEast[1]+southWest[1] )/2; // 103.80834999999999

      var map = L.map("map", {
          zoomControl: false
      });
      // jOzR6tdpUGnAtK2TkJCx
      const basemapUrl="https://api.maptiler.com/maps/bright-v2/{z}/{x}/{y}.png?key=fzwCe1gVmN1XHr6rvFPG"; 
      // basemapUrl="https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png";
      const attributionStr= "<span class='pl-1 pr-1 user-select-none'><a href='https://www.maptiler.com/copyright/' target='_blank'>© MapTiler</a> <a href='https://www.openstreetmap.org/copyright' target='_blank'>© OpenStreetMap contributors</a></span>";

      let basemapLayer = L.tileLayer(basemapUrl, {
        attribution: attributionStr,
        minZoom: minZoomVal,
        maxZoom: maxZoomVal,
        errorTileUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAIAAQMAAADOtka5AAAAA1BMVEX28eS888QlAAAANklEQVR4nO3BAQEAAACCIP+vbkhAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB8G4IAAAHSeInwAAAAAElFTkSuQmCC"
      }).addTo(map);

      var selectedRouteLayers = L.layerGroup();
      map.addLayer(selectedRouteLayers);

      function animateSidebar() {
        $("#sidebar").animate({
          width: "toggle"
        }, 
        350, function() {
          map.invalidateSize();
        });
      }

      function sizeLayerControl() {
        $(".leaflet-control-layers").css("max-height", $("#map").height() - 50);
      }

      const mode="prod"; // prod | dev
      const apiHeaders={
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          method: ( (mode=="prod" && navigator.onLine) ? "POST" : "GET" )
      };
      // ====================== init data here ===========================
      let apiUrl="";
      let response="";
      let responseObj="";

      apiUrl = (mode=="prod" ? "api/ltaodataservice/all/BusStops" : "data/BusStops.json");

      let busStopsRetrieved=true;

      try {
        response = await fetch(apiUrl, apiHeaders);
        responseObj = await response.json();
        if(responseObj.length==0) {
          busStopsRetrieved=false;
        }
      } catch(err) {
        console.log(err, "initBusStops");
        busStopsRetrieved=false;
      }
      if(!busStopsRetrieved) {
        apiHeaders["method"]="GET";
        response = await fetch("data/BusStops.json", apiHeaders);
        responseObj = await response.json();
        busStopsRetrieved=true;
      }
      // wait 100 milliseconds
      await new Promise((resolve, reject) => setTimeout(resolve, 100));
      var busStopsGeojsonObj={
        "type":"FeatureCollection",
        "features": []
      };
      var busStops={};

      if(busStopsRetrieved) {
        const busStopsArr=JSON.parse(JSON.stringify(responseObj));
        for(let busStopObj of busStopsArr) {
          let BusStopCode=busStopObj["BusStopCode"]+"";
          let RoadName=busStopObj["RoadName"];
          let Description=busStopObj["Description"];

          let Latitude=busStopObj["Latitude"];
          let Longitude=busStopObj["Longitude"];

          busStops[BusStopCode]={
            "RoadName": RoadName,
            "Description": Description,
            "Coordinates": [Longitude, Latitude]
          };
          let busStopFeatureObj={
            "type":"Feature",
              "properties":{
                "BusStopCode": BusStopCode,
                "Description": Description,
                "RoadName": RoadName
              },
              "geometry": {
                "type":"Point",
                "coordinates": [ Longitude, Latitude ]
              }
          };
          busStopsGeojsonObj["features"].push(busStopFeatureObj);
        }
      }
      // -------------------------------- Bus Stops Done ----------------------------------
      await new Promise((resolve, reject) => setTimeout(resolve, 150));
      // =================================================================
      apiHeaders["method"]=(mode=="prod" ? "POST" : "GET");
      apiUrl = (mode=="prod" ? "api/ltaodataservice/all/BusServices" : "data/BusServices.json");

      var busServices={};
      apiHeaders["method"]=(mode=="prod" ? "POST" : "GET");
      apiUrl = (mode=="prod" ? "api/ltaodataservice/all/BusServices" : "data/BusServices.json");

      let busServicesRetrieved=true;

      try {
        response = await fetch(apiUrl, apiHeaders);
        responseObj = await response.json();
        if(responseObj.length==0) {
          busServicesRetrieved=false;
        }
      } catch(err) {
        console.log(err, "initBusServices");
        busServicesRetrieved=false;
      }
      if(!busServicesRetrieved) {
        apiHeaders["method"]="GET";
        response = await fetch("data/BusServices.json", apiHeaders);
        responseObj = await response.json();
        busServicesRetrieved=true;
      }
      // wait 100 milliseconds
      await new Promise((resolve, reject) => setTimeout(resolve, 100));

      if(busServicesRetrieved) {
        const busServicesArr=JSON.parse(JSON.stringify(responseObj));

        for(let busServicesObj of busServicesArr) {
          let ServiceNo=busServicesObj["ServiceNo"]+"";
          let Direction=busServicesObj["Direction"]+"";

          let BusServiceID=ServiceNo+"_"+Direction;

          let Operator=busServicesObj["Operator"];
          let Category=busServicesObj["Category"];
          let AM_Peak_Freq=busServicesObj["AM_Peak_Freq"];
          let AM_Offpeak_Freq=busServicesObj["AM_Offpeak_Freq"];
          let PM_Peak_Freq=busServicesObj["PM_Peak_Freq"];
          let PM_Offpeak_Freq=busServicesObj["PM_Offpeak_Freq"];
          let LoopDesc=busServicesObj["LoopDesc"];

          let OriginCode=busServicesObj["OriginCode"]+"";
          let DestinationCode=busServicesObj["DestinationCode"]+"";

          let OriginPoint=[0,0];
          if(typeof busStops[OriginCode] !== "undefined") {
            OriginPoint=busStops[OriginCode]["Coordinates"];
          }
          let DestinationPoint=[0,0];
          if(typeof busStops[DestinationCode] !== "undefined") {
            DestinationPoint=busStops[DestinationCode]["Coordinates"];
          }
          busServices[BusServiceID]={
            "ServiceNo": ServiceNo,
            "Direction": Direction,
            "Operator": Operator,
            "Category": Category,
            "AM_Peak_Freq": AM_Peak_Freq,
            "AM_Offpeak_Freq": AM_Offpeak_Freq,
            "PM_Peak_Freq": PM_Peak_Freq,
            "PM_Offpeak_Freq": PM_Offpeak_Freq,
            "IsLoop": (LoopDesc.length==0) ? "N" : "Y",
            "LoopDesc": LoopDesc,
            "OriginCode": OriginCode,
            "DestinationCode": DestinationCode,
            "OriginPoint": OriginPoint,
            "DestinationPoint": DestinationPoint
          };
        }
      }
      await new Promise((resolve, reject) => setTimeout(resolve, 150));
      // ================= INIT service routes ===========================
      const PAGE_SIZE = 5000; // How many records the API returns in a page.
      apiHeaders["method"]=(mode=="prod" ? "POST" : "GET");
      let busRoutesRetrieved=true;

      async function callAPI() {
        let arr_result=[];
        let client_offset = 0;

        let result = [];
        let toContinue=true;
        while(toContinue) {
          if(client_offset==0 || result.length==PAGE_SIZE) {
            apiHeaders["method"]="POST";
            response = await fetch(`api/ltaodataservice/BusRoutes/${client_offset}`, apiHeaders);
            result = await response.json();
            client_offset += PAGE_SIZE;
          } else if(result.length < PAGE_SIZE) {
            toContinue=false;
          }
          arr_result=arr_result.concat(result);
        }
        return Promise.resolve(arr_result);
      };

      if(mode=="dev") {
        response = await fetch("data/BusRoutes.json", apiHeaders);
        responseObj = await response.json();
        if(responseObj.length==0) {
          busRoutesRetrieved=false;
        }
      } else if(mode=="prod") {
        try {
          responseObj=await callAPI();
          if(responseObj.length==0) {
            busRoutesRetrieved=false;
          }
        } catch(err) {
          console.log(err, "initServiceRoutes");
          busRoutesRetrieved=false;
        }
      } 
      if(!busRoutesRetrieved) {
        apiHeaders["method"]="GET";
        response = await fetch("data/BusRoutes.json", apiHeaders);
        responseObj = await response.json();
        busRoutesRetrieved=true;
      }
      // wait 100 milliseconds
      await new Promise((resolve, reject) => setTimeout(resolve, 100));

      var busRouteFeatures={};
      if(busRoutesRetrieved) {
        const busRoutesArr=JSON.parse(JSON.stringify(responseObj));

        for(let busRouteObj of busRoutesArr) {
          let ServiceNo=busRouteObj["ServiceNo"]+"";
          let Direction=busRouteObj["Direction"]+"";

          let BusServiceID=ServiceNo+"_"+Direction;
          
          let StopSequence=parseInt(busRouteObj["StopSequence"]);
          let BusStopCode=busRouteObj["BusStopCode"]+"";
          let Distance=busRouteObj["Distance"];

          if(typeof busRouteFeatures[BusServiceID]=="undefined") {
            let Operator=busRouteObj["Operator"];
            let WD_FirstBus=busRouteObj["WD_FirstBus"];
            let WD_LastBus=busRouteObj["WD_LastBus"];
            let SAT_FirstBus=busRouteObj["SAT_FirstBus"];
            let SAT_LastBus=busRouteObj["SAT_LastBus"];
            let SUN_FirstBus=busRouteObj["SUN_FirstBus"];
            let SUN_LastBus=busRouteObj["SUN_LastBus"];

            busRouteFeatures[BusServiceID]={
              "ServiceNo":ServiceNo,
              "Direction":Direction,

              "Operator":Operator,
              "Category": busServices[BusServiceID]["Category"],

              "IsLoop": busServices[BusServiceID]["IsLoop"],
              "LoopDesc": busServices[BusServiceID]["LoopDesc"],

              "OriginCode": busServices[BusServiceID]["OriginCode"],
              "DestinationCode": busServices[BusServiceID]["DestinationCode"],
              "OriginPoint": busServices[BusServiceID]["OriginPoint"],
              "DestinationPoint": busServices[BusServiceID]["DestinationPoint"],

              "AM_Peak_Freq": busServices[BusServiceID]["AM_Peak_Freq"],
              "AM_Offpeak_Freq": busServices[BusServiceID]["AM_Offpeak_Freq"],
              "PM_Peak_Freq": busServices[BusServiceID]["PM_Peak_Freq"],
              "PM_Offpeak_Freq": busServices[BusServiceID]["PM_Offpeak_Freq"],

              "WD_FirstBus":WD_FirstBus,
              "WD_LastBus":WD_LastBus,
              "SAT_FirstBus":SAT_FirstBus,
              "SAT_LastBus":SAT_LastBus,
              "SUN_FirstBus":SUN_FirstBus,
              "SUN_LastBus":SUN_LastBus,

              "Coordinates": [],
              "Distance": [],

              "BusStopCodes": [],
              "BusStopDescriptions": [],
              "BusStopRoadNames": []
            };
          }
          busRouteFeatures[BusServiceID]["Coordinates"][StopSequence]=JSON.parse(JSON.stringify(busStops[BusStopCode]["Coordinates"]));
          busRouteFeatures[BusServiceID]["Distance"][StopSequence]=parseFloat(Distance)*1000;

          busRouteFeatures[BusServiceID]["BusStopCodes"][StopSequence]=BusStopCode;
          busRouteFeatures[BusServiceID]["BusStopDescriptions"][StopSequence]=busStops[BusStopCode]["Description"];
          busRouteFeatures[BusServiceID]["BusStopRoadNames"][StopSequence]=busStops[BusStopCode]["RoadName"];
        }
      }
      await new Promise((resolve, reject) => setTimeout(resolve, 150));
      // =======================

      // Consolidate Bus Service No.
      const loopSymbol=' ⥀ ';
      const twowaySymbol=' ⇆ '; 
      const onewaySymbol=' ➝ ';

      var busServiceRoutes={};
      for(let busSvcID in busRouteFeatures) {
        let busRouteFeatureObj=busRouteFeatures[busSvcID];

        let ServiceNo=busRouteFeatureObj["ServiceNo"];
        let Direction=busRouteFeatureObj["Direction"];

        if(typeof busServiceRoutes[ServiceNo] === 'undefined') {
          busServiceRoutes[ServiceNo]={};
        }
        busServiceRoutes[ServiceNo][busSvcID]={};

        let IsLoop=busRouteFeatureObj["IsLoop"];
        let LoopDesc=busRouteFeatureObj["LoopDesc"];

        let Operator=busRouteFeatureObj["Operator"];
        let Category=busRouteFeatureObj["Category"];

        let OriginCode=busRouteFeatureObj["OriginCode"];
        let DestinationCode=busRouteFeatureObj["DestinationCode"];

        let OriginBusStopObj=busStops[OriginCode];
        let DestinationBusStopObj=busStops[DestinationCode];

        let BusServiceSymbolType=loopSymbol;
        let BusServiceCaption='';
        if(IsLoop=='Y' && typeof OriginBusStopObj !== 'undefined') {
          BusServiceCaption=toCamelCase(OriginBusStopObj['Description'])+' <span class="unicode">'+BusServiceSymbolType+'</span> '+toCamelCase(LoopDesc);
        } else {
          let svc_1=ServiceNo+'_1';
          let svc_2=ServiceNo+'_2';
          BusServiceSymbolType=twowaySymbol;
          if(typeof busRouteFeatures[svc_2] === 'undefined') {
            BusServiceSymbolType=onewaySymbol;
          }
          if(typeof OriginBusStopObj !== 'undefined' && typeof DestinationBusStopObj !== 'undefined') {
            BusServiceCaption=toCamelCase(OriginBusStopObj['Description'])+' <span class="unicode">'+BusServiceSymbolType+'</span> '+toCamelCase(DestinationBusStopObj['Description']);
          }
        }
        busServiceRoutes[ServiceNo]["BusServiceCaption"]=BusServiceCaption;

        let busServiceRouteCoords=removeArrNullVals(busRouteFeatureObj["Coordinates"]);
        busServiceRoutes[ServiceNo][busSvcID]["Coordinates"]=busServiceRouteCoords;

        let busServiceRouteDistanceArr=removeArrNullVals(busRouteFeatureObj["Distance"]);
        busServiceRoutes[ServiceNo][busSvcID]["Distance"]=busServiceRouteDistanceArr;

        let busStopCodesArr=removeArrNullVals(busRouteFeatureObj["BusStopCodes"]);
        busServiceRoutes[ServiceNo][busSvcID]["BusStopCodes"] = busStopCodesArr;

        let busStopDescriptionsArr=removeArrNullVals(busRouteFeatureObj["BusStopDescriptions"]);
        busServiceRoutes[ServiceNo][busSvcID]["BusStopDescriptions"]=busStopDescriptionsArr;

        let busStopRoadNamesArr=removeArrNullVals(busRouteFeatureObj["BusStopRoadNames"]);
        busServiceRoutes[ServiceNo][busSvcID]["BusStopRoadNames"]=busStopRoadNamesArr;
      }

      let busServicesList=document.querySelector('#feature-list tbody');
      for(let busSvcNo in busServiceRoutes) {
        let busRouteFeatureObj=busServiceRoutes[busSvcNo];

        let BusServiceCaption=busRouteFeatureObj['BusServiceCaption'];

        let busServicesListItem=document.createElement('tr');
        busServicesListItem.className='feature-row';
        busServicesListItem.setAttribute('busSvcNo', busSvcNo);

        busServicesListItem.innerHTML='<td class="w-20"><span class="rounded-sm m-1 busSvcNoSelection">'+busSvcNo+'</span></td><td class="feature-name">' + BusServiceCaption + '</td><td class="w-15"><span class="pull-right">❯</span></td>';
        busServicesList.appendChild(busServicesListItem);
      }

      await new Promise((resolve, reject) => setTimeout(resolve, 100));
      // service_routes_mapping
      console.log("All data initialised.");

      // ======================== all data loaded ===============================\\
      function renderBusStopsGeojsonLayer(busStopCodesArr) {
        let busStopsGeojsonLayer;
        let tooltipPropObj={ 
          className: "leaflet-tooltip-custom", 
          offset: [0, 0]
        };
        
        let busStopMarker;

        busStopsGeojsonLayer = L.geoJSON(busStopsGeojsonObj, {
          pointToLayer: ((feature, latlng) => {
            let busStopDescription=feature["properties"]["Description"];
            let busStopCode=feature["properties"]["BusStopCode"];

            let isInterchange=((busStopDescription.toUpperCase()).indexOf(" INT")>=0 || (busStopDescription.toUpperCase()).indexOf(" TER")>=0);
            let isSelected=(busStopCodesArr.length>0);

            if( (!isSelected && isInterchange) || (isSelected && !isInterchange)) {
              busStopMarker=L.marker(latlng, {
                 icon: L.divIcon({     
                     html: '<span class="bus-stop-marker rounded-circle" style="background-color:' + geojsonBusStopMarkerOptions["fillColor"] + '"><svg class="icon icon-bus"><use xlink:href="symbol-defs.svg#icon-bus"></use></svg></span><span class="small busRouteStopNo" style="color:'+geojsonBusStopMarkerOptions["fillColor"]+'">'+busStopCode+'</span>',
                     className: "leaflet-marker-own"
                 })
              });
            } else if(isSelected && busStopCodesArr[0]==busStopCode && isInterchange) { 
              // origin marker
              busStopMarker=L.marker(latlng, {
                icon: L.icon({
                  iconUrl: 'img/origin.png',
                  iconSize: [25,25]
                })
              });
            } else if(isSelected && busStopCodesArr[busStopCodesArr.length-1]==busStopCode && isInterchange) { 
              // destination marker
              busStopMarker=L.marker(latlng, {
                icon: L.icon({
                  iconUrl: 'img/destination.png',
                  iconSize: [25,25]
                })
              });
            }  else {
              busStopMarker=L.circleMarker(latlng, geojsonBusStopMarkerOptions);
            }
            busStopMarker.bindTooltip(
              "<div><span class='p-1 m-1 rounded-sm' style='background:rgba(83, 115, 140, 0.15);color:" + geojsonBusStopMarkerOptions["fillColor"] + "'><b>" + busStopCode + "</b></span><span>" + toCamelCase(busStopDescription) + "</span></div>", tooltipPropObj);
            return busStopMarker;
          }),
          filter: ((feature, layer) => {
            return (busStopCodesArr.length==0) ? true : (busStopCodesArr.includes(feature["properties"]["BusStopCode"]));
          })
        });
        selectedRouteLayers.addLayer(busStopsGeojsonLayer);
      }

      renderBusStopsGeojsonLayer([]);
      

      function checkMapZoomLevels() {
        let currentZoom=map.getZoom();
        if(currentZoom < 13) {
          $('div.leaflet-marker-own').find('span.small.busRouteStopNo').hide();
        } else {
          $('div.leaflet-marker-own').find('span.small.busRouteStopNo').show();
        } 
      }

      map.on('zoomend', ()=> {
        checkMapZoomLevels();
      });

      L.Control.PanelInfo = L.Control.extend({
        options: {
            position: 'bottomright'
        },
        onAdd: function (map) {
            let controlDiv = L.DomUtil.create('div', 'leaflet-right leaflet-control rounded-25 user-select-none');
            controlDiv.id='customInfoPanel';
            let htmlContent='';
            htmlContent+='<ul class="nav nav-tabs">';
            htmlContent+='<li class="active"><a data-toggle="tab" class="pt-3 pb-2 pl-2 pr-2 ml-0 mr-1 mt-0 mb-1" href="#service_route_details_tab"><svg class="icon icon-route"><use xlink:href="symbol-defs.svg#icon-route"></use></svg> <span class="ascii-chars">ᴿᵒᵘᵗᵉ</span></a></li>';
        
            htmlContent+='<li><a id="bus_eta_details_pill" data-toggle="tab" class="pt-3 pb-2 pl-2 pr-2 ml-0 mr-1 mt-0 mb-1" href="#bus_eta_details_tab"><svg class="icon icon-bus-eta"><use xlink:href="symbol-defs.svg#icon-bus-eta"></use></svg> <span class="ascii-chars">ꭼꭲꭺ</span></a></li>';

            htmlContent+='<button id="toggleInfoPanel" type="button" class="btn btn-sm btn-outline-primary rounded-sm pt-1 pb-1 pl-2 pr-2 m-2 float-right"><span class="emoji">🔼</span></button>';

            htmlContent+='<button type=type="button" id="resetAll" class="btn btn-sm btn-outline-primary rounded-sm pt-1 pb-1 pl-2 pr-2 m-2 text-center float-right"><small class="emoji small">🔄</small><small class="ascii-chars ml-1">ᴿᵉˢᵉᵗ ᴬˡˡ</small></button>';
            

            htmlContent+='</ul>';

            htmlContent+='<div class="tab-content">';

            htmlContent+='<div id="service_route_details_tab" class="tab-pane fade in active">';

            htmlContent+='<table class="mt-2 mb-2 w-100">';
            htmlContent+='<tr>';
            htmlContent+='<td class="text-left" id="selectedBusSvcNo"></td>';
            htmlContent+='<th class="text-left h5"><strong id="selectedBusSvcCaption"></strong></th>';
            htmlContent+='<td class="text-right w-20"><button id="exportSelectedBusRoute" type="button" class="btn btn-sm btn-primary pl-1 pr-1 pt-0 pb-0 m-1 emoji">📥<span class="ascii-chars">ᴱˣᵖᵒʳᵗ</span></button></td>';
            htmlContent+='</tr>';

            htmlContent+='<tr><th colspan="3" class="p-2"></th></tr>';

            htmlContent+='<tr class="busRouteDetailsSubtitle">';
            htmlContent+='<td colspan="3" class="text-left">';
            htmlContent+='<small class="text-dark">';
            htmlContent+='<form id="optRouteForm">';
            htmlContent+='<label id="optRoute_0" class="radio-inline"><input type="radio" name="optRoute" class="optRoute" value="0" checked />Route 1</label>';
            htmlContent+='<label id="optRoute_1" class="radio-inline"><input type="radio" name="optRoute" class="optRoute" value="1" />2</label>';
            htmlContent+='<span id="selectedBusRouteBusStops" class="ml-1"></span>';
            htmlContent+='</form>';
            htmlContent+='</small>';
            htmlContent+='</td>';
            htmlContent+='</tr>';
            htmlContent+='</table>';
            htmlContent+='<form id="start_end_bus_route_form">';
            htmlContent+='<div class="busRouteDetailContentPanel"></div>';
            htmlContent+='</form>';

            htmlContent+='</div>';

            htmlContent+='<div id="bus_eta_details_tab" class="tab-pane fade">';
            htmlContent+='<h6 class="pl-2 pr-2 pt-1 pb-1 mt-2 mb-2"><span id="bus_etas_title" class="w-100"></span></h6>';
            htmlContent+='<div id="bus_etas">';
            htmlContent+='<div class="busETAContentPanel pl-2 pr-2 pt-1 pb-1 mt-3 mb-3"></div>';
            htmlContent+='</div>';

            htmlContent+='</div>';

            controlDiv.innerHTML=htmlContent;
            
            if (!L.Browser.touch) {
              L.DomEvent
              .disableClickPropagation(controlDiv)
              .disableScrollPropagation(controlDiv);
            } else {
              L.DomEvent.disableClickPropagation(controlDiv);
            }
            return controlDiv;
        }
      });
      const infoPanel = new L.Control.PanelInfo();
      map.addControl(infoPanel);

      await new Promise((resolve, reject) => setTimeout(resolve, 150));
      $('#exportSelectedBusRoute').hide();
      
      $("#loading").hide();
      sizeLayerControl();

      map.fitBounds([northEast, southWest]);
      map.setView([lat, lng], defaultZoom);

      checkMapZoomLevels();

      $("#searchbar").on("keyup", function() {
        let searchVal = $(this).val().toLowerCase();
        $("#feature-list tr.feature-row").filter(function() {
          $(this).toggle($(this).text().toLowerCase().indexOf(searchVal) > -1)
        });
      });

      $('#customInfoPanel').on('mouseenter', () => {
          map.dragging.disable();
          map.doubleClickZoom.disable(); 
          map.scrollWheelZoom.disable();
          map.touchZoom.disable();
      });

      $('#customInfoPanel').on('mouseleave', () => {
          map.dragging.enable();
          map.doubleClickZoom.enable(); 
          map.scrollWheelZoom.enable();
          map.touchZoom.enable();
      });

      $(document).on("click", ".feature-row", function(e) {
        sidebarClick($(this).attr("busSvcNo"));
      });
      
      var toExportObj=[];

      var selected_start_sequence;
      var selected_stop_sequence;

      $('#optRoute_0').hide();
      $('#optRoute_1').hide();
      function renderSelectedBusServiceRoute(selectedBusServiceRouteObj) {
        $('#exportSelectedBusRoute').show();

        toExportObj=[];
        selectedRouteLayers.clearLayers();
        // ====================================================
        let BusStopCodes=selectedBusServiceRouteObj['BusStopCodes'];
        let BusStopRoadNames=selectedBusServiceRouteObj['BusStopRoadNames'];
        let BusStopDescriptions=selectedBusServiceRouteObj['BusStopDescriptions'];
        let Distance=selectedBusServiceRouteObj['Distance'];
        let Coordinates=selectedBusServiceRouteObj['Coordinates'];

        let noOfBusStops=BusStopCodes.length;

        if(typeof selected_start_sequence==='undefined' && typeof selected_stop_sequence==='undefined') {
          selected_start_sequence=0;
          selected_stop_sequence=noOfBusStops-1;
        }

        let BusStopCodesCopy=JSON.parse(JSON.stringify(BusStopCodes)).slice(selected_start_sequence, selected_stop_sequence+1);
        let BusStopRoadNamesCopy=JSON.parse(JSON.stringify(BusStopRoadNames)).slice(selected_start_sequence, selected_stop_sequence+1);
        let BusStopDescriptionsCopy=JSON.parse(JSON.stringify(BusStopDescriptions)).slice(selected_start_sequence, selected_stop_sequence+1);
        let DistanceCopy=JSON.parse(JSON.stringify(Distance)).slice(selected_start_sequence, selected_stop_sequence+1);
        let CoordinatesCopy=JSON.parse(JSON.stringify(Coordinates)).slice(selected_start_sequence, selected_stop_sequence+1);

        let noOfBusStopsCopy=BusStopCodesCopy.length;
        let CumulatedDistance=0;
        // ====================================================
        let latlngs=reverseLatLngsUtil(CoordinatesCopy);
        let displayedRouteLayer = L.polyline.antPath(latlngs, antpathSettings);
        selectedRouteLayers.addLayer(displayedRouteLayer);

        renderBusStopsGeojsonLayer(BusStopCodesCopy);
        map.flyToBounds(L.latLngBounds(latlngs));
        checkMapZoomLevels();
        // ====================================================
        let distanceBetweenBusStops=[];

        for(let d=Distance.length-1;d>=0;d--) {
          if(Distance[d]>0) {
            let distanceBetweenStops=parseInt(Distance[d]) - parseInt(Distance[d-1]);
            distanceBetweenBusStops.push(distanceBetweenStops);
          }
        }
        let distanceBetweenBusStopsCopy=JSON.parse(JSON.stringify(distanceBetweenBusStops));
        distanceBetweenBusStops=distanceBetweenBusStops.reverse();
        // ====================================================
        distanceBetweenBusStopsCopy.push(0);
        distanceBetweenBusStopsCopy=distanceBetweenBusStopsCopy.reverse();
        distanceBetweenBusStopsCopy=distanceBetweenBusStopsCopy.slice(selected_start_sequence, selected_stop_sequence+1);

        // console.log(distanceBetweenBusStopsCopy, [selected_start_sequence,selected_stop_sequence]);

        for(let x=0; x<distanceBetweenBusStopsCopy.length;x++) {
          let distance=distanceBetweenBusStopsCopy[x];
          CumulatedDistance+=distance;
         
          let exportObj={
            "bus_stop_code": (BusStopCodesCopy[x]+''),
            "bus_stop_description": toCamelCase(BusStopDescriptionsCopy[x]),
            "bus_stop_road_name": toCamelCase(BusStopRoadNamesCopy[x]),
            "bus_stop_distance": distance,
            "bus_stop_sequence": (x+1),
            "Latitude": CoordinatesCopy[x][1],
            "Longitude": CoordinatesCopy[x][0]
          };
          toExportObj.push(exportObj);
        }

        // ====================================================
        let serviceRouteDetailsTabHtmlContent='';
        serviceRouteDetailsTabHtmlContent+='<table class="table w-100">';
        for(let i=0;i<noOfBusStops;i++) {
          let BusStopCode=BusStopCodes[i];
          let DistanceBetweenStops=parseInt(distanceBetweenBusStops[i]);
          let BusStopDescription=toCamelCase(BusStopDescriptions[i]);

          serviceRouteDetailsTabHtmlContent+='<tr>';

          serviceRouteDetailsTabHtmlContent+='<td class="text-right pl-0 pr-0 border-0 w-40">';
          serviceRouteDetailsTabHtmlContent+='<button type="button" class="text-right rounded-sm btn-busStopSelection view_bus_arrivals" value="'+BusStopCode+'">';
          serviceRouteDetailsTabHtmlContent+='<small class="busRouteStopNo" style="color:'+geojsonBusStopMarkerOptions["fillColor"]+'">'+BusStopCode+'</small>';
          serviceRouteDetailsTabHtmlContent+='<br><strong class="small">'+BusStopDescription+'</strong>';
          serviceRouteDetailsTabHtmlContent+='</button>';
          serviceRouteDetailsTabHtmlContent+='</td>';
          
          serviceRouteDetailsTabHtmlContent+='<td class="text-center pl-0 pr-0 border-0 w-20">';
          if(i==0) {
            serviceRouteDetailsTabHtmlContent+='<img src="img/origin.png" width="20px" height="20px" />';
          } else if(i==(noOfBusStops-1)) {
            serviceRouteDetailsTabHtmlContent+='<img src="img/destination.png" width="20px" height="20px" />';
          } else {
            serviceRouteDetailsTabHtmlContent+='<span class="bus-stop-marker rounded-circle" style="background-color:'+geojsonBusStopMarkerOptions["fillColor"] + '"><svg class="icon icon-bus"><use xlink:href="symbol-defs.svg#icon-bus"></use></svg></span>';
          }

          if(i>=0 && i<(noOfBusStops-1)) {
              serviceRouteDetailsTabHtmlContent+='<div style="color:#145b93" class="mt-1 mb-1">';
              serviceRouteDetailsTabHtmlContent+='⇣';
              serviceRouteDetailsTabHtmlContent+='<br><small>'+DistanceBetweenStops+'m</small>';
              serviceRouteDetailsTabHtmlContent+='<br>⇣';
              serviceRouteDetailsTabHtmlContent+='</div>';
          }

          serviceRouteDetailsTabHtmlContent+='</td>';

          serviceRouteDetailsTabHtmlContent+='<td class="text-center pl-0 pr-0 border-0 w-20">';
          serviceRouteDetailsTabHtmlContent+='<input type="radio" name="start_bus_stop" class="start_bus_stop" value="'+i+'" '+( (i==selected_start_sequence)?'checked':'' )+' /><span class="ascii-chars"> ˢᵗᵃʳᵗ</span>';
          serviceRouteDetailsTabHtmlContent+='</td>';


          serviceRouteDetailsTabHtmlContent+='<td class="text-center pl-0 pr-0 border-0 w-20">';
          serviceRouteDetailsTabHtmlContent+='<input type="radio" name="end_bus_stop" class="end_bus_stop" value="'+i+'" '+( (i==(selected_stop_sequence))?'checked':'' )+' /><span class="ascii-chars"> ᵉⁿᵈ</span>';
          serviceRouteDetailsTabHtmlContent+='</td>';

          serviceRouteDetailsTabHtmlContent+='</tr>';
        }
        serviceRouteDetailsTabHtmlContent+='</table>';

        CumulatedDistance=(parseInt(CumulatedDistance)/1000.0).toFixed(1);
        $('#selectedBusRouteBusStops').html('<span class="emoji ml-2">🚍</span> '+noOfBusStopsCopy+' bus stops <svg class="icon icon-roads pl-1"><use xlink:href="symbol-defs.svg#icon-road"></use></svg> '+CumulatedDistance+' km');
        $('#service_route_details_tab div.busRouteDetailContentPanel').html(serviceRouteDetailsTabHtmlContent);
        // ============================
      }

      var selectedBusServiceRouteObjs=[];
      var selectedBusServiceRouteObj;

      $(window).resize(function() {
        sizeLayerControl();
      });
      
      $('#toggleInfoPanel').on("click", (evt)=> {
        if($('#customInfoPanel').hasClass('expand')) {
          $('#customInfoPanel').removeClass('expand');
          $('#toggleInfoPanel').html('<span class="emoji">🔼</span>');
        } else {
          $('#customInfoPanel').addClass('expand');
          $('#toggleInfoPanel').html('<span class="emoji">🔽</span>');
        }
      });
      
      $("#list-btn").click(function() {
        animateSidebar();
        return false;
      });
      $("#sidebar-toggle-btn").click(function() {
        animateSidebar();
        return false;
      });

      function sidebarClick(busSvcNo) {
        if(!$('#customInfoPanel').hasClass('expand')) {
          $('#toggleInfoPanel').click();
        }

        selected_start_sequence=undefined;
        selected_stop_sequence=undefined;

        $('#optRoute_0').hide();
        $('#optRoute_1').hide();

        selectedBusServiceRouteObjs=[];

        let busServiceRouteObjs=busServiceRoutes[busSvcNo];
        let busServiceRouteObjsCopy=JSON.parse(JSON.stringify(busServiceRouteObjs));

        let BusServiceCaption=busServiceRouteObjs['BusServiceCaption'];
        delete busServiceRouteObjsCopy['BusServiceCaption'];

        for(let busSvcID in busServiceRouteObjsCopy) {
          selectedBusServiceRouteObjs.push(busServiceRouteObjsCopy[busSvcID]);
        }

        $('#optRoute_0').show();
        $('#optRoute_0').find('input:radio[name="optRoute"]').prop('checked', true);

        if(BusServiceCaption.includes(twowaySymbol)) {
          $('#optRoute_1').show();
          $('#optRoute_1').find('input:radio[name="optRoute"]').prop('checked', false);
        }
        
        $('#selectedBusSvcNo').html('<span class="rounded-sm mt-1 mb-1 ml-1 mr-2 busSvcNoSelection">'+busSvcNo+'</span>');
        $('#selectedBusSvcCaption').html(BusServiceCaption);

        selectedBusServiceRouteObj=selectedBusServiceRouteObjs[0];
        renderSelectedBusServiceRoute(selectedBusServiceRouteObj);
        if (document.body.clientWidth <= 767) {
          $("#sidebar").hide();
          map.invalidateSize();
        }
      }

      function disableStartStopBusStops() {
        $(".start_bus_stop").each((ele2) => { 
          let startBusStop=$(".start_bus_stop")[ele2];
          let startSequence=parseInt(startBusStop.value);
          if(startSequence != selected_start_sequence) {
            startBusStop.checked=false;
          }
          if(startSequence<selected_stop_sequence) {
            startBusStop.disabled=false;
          } else {
            startBusStop.disabled=true;
          }
        });
        $(".end_bus_stop").each((ele2) => {
          let stopBusStop=$(".end_bus_stop")[ele2];
          let stopSequence=parseInt(stopBusStop.value);
          if(stopSequence != selected_stop_sequence) {
            stopBusStop.checked=false;
          }
          if(stopSequence>selected_start_sequence) {
            stopBusStop.disabled=false;
          } else {
            stopBusStop.disabled=true;
          }
        });
      } // disableStartStopBusStops

      $('#start_end_bus_route_form').on('change', async(e1) => {
        let eleTarget=e1.target;
        eleTarget.checked=true;

        let dirSelected=eleTarget.className;
        let valSelected=parseInt(eleTarget.value);

        if(dirSelected=='start_bus_stop') {
          selected_start_sequence=valSelected;
        } else if(dirSelected=='end_bus_stop') {
          selected_stop_sequence=valSelected;
        }
        renderSelectedBusServiceRoute(selectedBusServiceRouteObj);
        disableStartStopBusStops();
        e1.stopPropagation();
      }); 

      $('#optRouteForm').on('change', (e2) => {
        selected_start_sequence=undefined;
        selected_stop_sequence=undefined;

        let routeIndex=e2.target.value;  
        selectedBusServiceRouteObj=selectedBusServiceRouteObjs[parseInt(routeIndex)];
        renderSelectedBusServiceRoute(selectedBusServiceRouteObj);
      });

      $("#exportSelectedBusRoute").on("click", () => {
        let txtToSave=JSON.stringify(toExportObj);
        let textblob = new Blob([txtToSave], {
            type: "text/plain"
        });
        let dwnlnk = document.createElement("a");
        dwnlnk.download = "bus_route.json";
        if (window.webkitURL != null) {
            dwnlnk.href = window.webkitURL.createObjectURL(textblob);
        }
        dwnlnk.click();
      });

      $("#resetAll").on("click", async() => {
        $("#loading").show();
        $('#exportSelectedBusRoute').hide();

        $('#service_route_details_tab div.busRouteDetailContentPanel').html('');
        $('#selectedBusRouteBusStops').html('');
        
        $('#selectedBusSvcNo').html('');
        $('#selectedBusSvcCaption').html('');

        $('#optRoute_0').hide();
        $('#optRoute_1').hide();

        selectedRouteLayers.clearLayers();

        selected_start_sequence=undefined;
        selected_stop_sequence=undefined;
        selectedBusServiceRouteObjs=[];
        selectedBusServiceRouteObj=undefined;
        toExportObj=[];

        searchbar.value='';
        triggerEvent(searchbar, 'keyup');

        renderBusStopsGeojsonLayer([]);

        map.fitBounds([northEast, southWest]);
        map.setView([lat, lng], defaultZoom);
        checkMapZoomLevels();

        await new Promise((resolve, reject) => setTimeout(resolve, 150));

        $("#loading").hide();
      });



      // -------------------------- Web Socket for Bus ETAs ---------------------------
      const noOfMillisecondsPerDay=86400000;

      function processBusStopETA(res) {
        let responseArr=JSON.parse(JSON.stringify(res));

        let busEtaHtmlStr="";
        busEtaHtmlStr+="<div class='busETAContentPanel'>";
        busEtaHtmlStr+="<table class='w-100'>";
        busEtaHtmlStr+="<tbody>";

        let colCounter=1;
        for(let r in responseArr) {
          let busEtaObj=responseArr[r];

          let svc_no=busEtaObj["ServiceNo"]; // 12
          let svc_op=busEtaObj["Operator"]; // GAS

          let bus1=busEtaObj["NextBus"];
          let bus1_eta=bus1["EstimatedArrival"]; // "2022-10-27T20:23:14+08:00"
          bus1_eta = ((new Date(bus1_eta)-new Date())/noOfMillisecondsPerDay )*24*60; // min left
          let bus1_feature=bus1["Feature"]; // WAB (Wheelchair Accessible) | <blank>

          // -----------------------------------------
          let bus2=busEtaObj["NextBus2"];
          let bus2_eta=bus2["EstimatedArrival"]; // "2022-10-27T20:27:47+08:00"
          bus2_eta = ((new Date(bus2_eta)-new Date())/noOfMillisecondsPerDay )*24*60; // min left
          let bus2_feature=bus2["Feature"]; // WAB (Wheelchair Accessible) | <blank>

          // -----------------------------------------
          let bus3=busEtaObj["NextBus3"];
          let bus3_eta=bus3["EstimatedArrival"]; // "2022-10-27T20:38:55+08:00"
          bus3_eta = ((new Date(bus3_eta)-new Date())/noOfMillisecondsPerDay )*24*60; // min left
          let bus3_feature=bus3["Feature"]; // WAB (Wheelchair Accessible) | <blank>


          let feature="";
          let eta=bus1_eta;
          let nextBus=bus1;
          if(typeof bus2_eta!=='undefined' && bus2_eta!=='' && bus1_eta<0) {
            nextBus=bus2;
            eta=bus2_eta;
            if(typeof bus3_eta!=='undefined' && bus3_eta!=='' && bus2_eta<0) {
              nextBus=bus3;
              eta=bus3_eta;
            }
          }

          let Feature=nextBus["Feature"];
          if(Feature=="WAB") {
            feature="<svg class='icon icon-wheelchair ml-1'><use xlink:href='symbol-defs.svg#icon-wheelchair'></use></svg>";
          } else {
            feature="<span class='pr-1 pl-1'></span>";
          }

          if(colCounter==1) {
            busEtaHtmlStr+="<tr>";
          }
          busEtaHtmlStr+="<td width='33.33%'>";

          busEtaHtmlStr+="<span class='badge service_no rounded-left mt-1 mb-1'>" + svc_no + "</span>";

          busEtaHtmlStr+="<span class='badge badge-secondary service_no rounded-right mt-1 mb-1 small'>";
          busEtaHtmlStr+="<small class='small text-white pl-1'>";

          if(parseInt(eta)<=0) {
            busEtaHtmlStr+="<span class='ascii-chars'>ᴬʳʳ</span>";
          } else if(parseInt(eta)>0) {
            busEtaHtmlStr+=(parseInt(eta)+"<span class='ascii-chars'>ᵐⁱⁿ</span>");
          } else {
            busEtaHtmlStr+="<span class='ascii-chars'>⁽ᴺᴬ⁾</span>"
          }

          busEtaHtmlStr+=feature;
          busEtaHtmlStr+="</small>";

          busEtaHtmlStr+="</span>";

          busEtaHtmlStr+="</td>";

          if(r==(responseArr.length-1)) {
            if(colCounter==1) {
              busEtaHtmlStr+="<td width='33.33%' class='pl-1 pr-1'>";
              busEtaHtmlStr+="</td><td width='33.33%' class='pl-1 pr-1'></td>";
            } else if(colCounter==2) {
              busEtaHtmlStr+="<td width='33.33%' class='pl-1 pr-1'></td>";
            }
            busEtaHtmlStr+="</tr>";
          }
          if(colCounter==3) {
            busEtaHtmlStr+="</tr>";
            colCounter=0;
          }
          colCounter++;
        } // end for-loop

        busEtaHtmlStr+="</tbody>";
        busEtaHtmlStr+="</table>";
        busEtaHtmlStr+="</div>";

        $("#bus_etas").html(busEtaHtmlStr);
      } // end processBusStopETA


      // --------------------------- CLIENT SIDE WEB SOCKET INIT ------------------------
      const errMsg = "<div class='text-center text-dark'><b><span class='emoji'>⚠️</span> Information unavailable. Please select another Bus Stop.</b></div>";
      const offlineErrMsg = "<div class='text-center text-dark'><b><span class='emoji'>🚫</span> Application is currently running offline. Please ensure that device is internet connected and <span class='emoji'>🔄</span> refresh browser before retrying.</b></div>";

      const socket = io();
      socket.on("connect", async() => {
      console.info(`Client side socket[${socket.id}] connection established at: ${window.navigator.userAgent}`);

      // callback from client-side to server-side
      socket.emit("back_to_server", `${socket.id}`);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));

      $(document).on("click",".view_bus_arrivals", (ele3) => {
        $(".view_bus_arrivals").each(function(){
          if($(this).hasClass('active')) {
            $(this).removeClass('active');
          }
        });

        $("#bus_etas").html("");
        $("#bus_etas_title").html("");
        $("#bus_eta_details_pill").click();

        if(window.navigator.onLine) {
          try {
            let selectedBusStopEle=ele3.currentTarget;
            let selectedBusStop=selectedBusStopEle.value;
            if(!selectedBusStopEle.classList.contains('active')) {
              selectedBusStopEle.classList.add('active');
            }
            let selectedBusStopObj=busStops[selectedBusStop];
            let busStopLngLat=selectedBusStopObj['Coordinates'];

            map.flyTo(L.latLng([busStopLngLat[1],busStopLngLat[0]]), maxZoomVal);

            let busStopDescription=selectedBusStopObj['Description'];
            
            console.log(selectedBusStop);

            if(typeof busStopDescription=="undefined") {
              console.log("[view_bus_arrivals] 'busStopDescription' is undefined.");
              $("#bus_etas_title").html(errMsg);
              $("#bus_etas").html("");
              // Msg server to stop displaying current bus arrival info
              socket.emit("bus_arrivals", undefined);
            } else {
              $("#bus_etas").html("<div class='text-center'><div class='spinner-border'></div></div>");
              $("#bus_etas_title").html('<span class="p-1 m-1 rounded-sm" style="background:rgba(83, 115, 140, 0.15);color:' + geojsonBusStopMarkerOptions["fillColor"] + '"><b>' + selectedBusStop + '</b></span><strong class="mr-1">'+ toCamelCase(busStopDescription)+"</strong>");

              // send bus stop no. to server side socket
              socket.emit("bus_arrivals", selectedBusStop); 
              socket.on("get_bus_arrivals_info", (selectedBusStopETAJSON) => {
                let selectedBusStopETAs=JSON.parse(selectedBusStopETAJSON);
                processBusStopETA(selectedBusStopETAs);
              });
            }
          } catch(err) { 
            console.log(err, "view_bus_arrivals");
            $("#bus_etas_title").html(errMsg);
            $("#bus_etas").html("");
            // Msg server to stop displaying current bus arrival info
            socket.emit("bus_arrivals", undefined);
          }
        } else {
          console.log("Device is offline.","view_bus_arrivals");
          $("#bus_etas_title").html(offlineErrMsg);
          $("#bus_etas").html("");
        }
      });
    }); // --------------------------- // END CLIENT SIDE WEB SOCKET INIT ------------------------
    socket.on("disconnect", () => {
      console.info(`Client side socket[${socket.id}] has disconnected.`);
    });
   
  });
}