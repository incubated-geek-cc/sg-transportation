const myApp = Object.create(null);
// ======================= MAP =========================
const basemapUrl="https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=fzwCe1gVmN1XHr6rvFPG"; // jOzR6tdpUGnAtK2TkJCx
const attributionStr= "&nbsp;<a href='https://www.maptiler.com/copyright/' target='_blank'>© MapTiler</a> <a href='https://www.openstreetmap.org/copyright' target='_blank'>© OpenStreetMap contributors</a>&nbsp;";

const northEast = [1.56073, 104.1147];
const southWest = [1.16, 103.502];

const minZoomVal=9;
const maxZoomVal=18;
const defaultZoom=13;

var map="";

var lat = ( northEast[0]+southWest[0] )/2; // 1.3603649999999998
var lng = ( northEast[1]+southWest[1] )/2; // 103.80834999999999
var zoom=11;

const initMap = (lat, lng, zoom) => {
  let position = L.tileLayer(basemapUrl, {
    attribution: attributionStr,
    minZoom: minZoomVal,
    maxZoom: maxZoomVal,
    errorTileUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAIAAQMAAADOtka5AAAAA1BMVEX28eS888QlAAAANklEQVR4nO3BAQEAAACCIP+vbkhAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB8G4IAAAHSeInwAAAAAElFTkSuQmCC"
  });

  map = L.map("map-id", {
    zoomControl: false,
    renderer: L.svg()
  });
  if(map !== "") {
    map.setMaxBounds([northEast, southWest]);
    map.setView([lat, lng], zoom);
    position.addTo(map);

    return map;
  }
};

// ==================== ON LOAD ======================
if (document.readyState === 'complete' || document.readyState !== 'loading' && !document.documentElement.doScroll) {
  callback();
} else {
  document.addEventListener('DOMContentLoaded', async() => {
      console.log('DOMContentLoaded');
      // Handler when the DOM is fully loaded
      myApp.map = initMap(lat, lng, zoom);

      var geojsonBusStopMarkerOptions = {
          radius: 1.5,
          fillColor: "#0b0b75",
          color: "#ffffff",
          weight: 0.5,
          opacity: 1.0,
          fillOpacity: 1.0
      };

      var all_bus_stops_geojson_layer;
      var displayed_bus_stops_geojson_layer;
      var displayed_route_selected_layer;
      
      var bus_stops_by_service_geojson_layer;
      var service_route_selected_layer;

      var bus_stops_by_service_geojson = {
        "type":"FeatureCollection",
        "features":[]
      };

      var displayed_bus_stops_geojson={
        "type":"FeatureCollection",
        "features": []
      };

      var all_bus_stops_geojson={
        "type":"FeatureCollection",
        "features":[]
      };

      var bus_stops_mapping={};
      var bus_services_mapping={};
      var service_routes_mapping={};

      const reverse_latlngs = (input_latlngs) => {
        let reverse_latlngs_arr=[];
        for(let rv in input_latlngs) {
          let latlng = input_latlngs[rv];
          let lat=latlng[1];
          let lng=latlng[0];
          let reverse_latlng=[lat,lng];
          reverse_latlngs_arr.push(reverse_latlng);
        }
        return reverse_latlngs_arr;
      };

      var service_route_selected="";
      var selected_start_sequence=1;
      var selected_stop_sequence=1;

      $("#search_bus_stop_clear").click((e)=> {
        $("#search_bus_stop").val("");
        $("#search_bus_stop").trigger("keyup");
      });

      $("#sidebar").on("mouseover", function () {
          map.dragging.disable();
          map.doubleClickZoom.disable(); 
          map.scrollWheelZoom.disable();
          map.touchZoom.disable();
      });
      $("#sidebar").on("mouseout", function () {
          map.dragging.enable();
          map.doubleClickZoom.enable(); 
          map.scrollWheelZoom.enable();
          map.touchZoom.enable();
      });

      const mode="prod"; // prod | dev
      const apiHeaders={
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          method: (mode=="prod" ? "POST" : "GET")
      };

      // --------------------------- INIT DATA FETCH HERE ------------------------  
      let apiUrl="";
      let response="";
      let responseObj="";

      apiUrl = (mode=="prod" ? "api/ltaodataservice/all/BusStops" : "data/BusStops.json");

      // ================ INIT bus stops =======================
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

      if(busStopsRetrieved) {
        for(let bus_stop of responseObj) {
            if( bus_stop.hasOwnProperty('BusStopCode') && bus_stop.hasOwnProperty('RoadName') && bus_stop.hasOwnProperty('Description') && bus_stop.hasOwnProperty('Latitude') && bus_stop.hasOwnProperty('Longitude') ) {
              let code=bus_stop["BusStopCode"];
              let road_name=bus_stop["RoadName"].toUpperCase();
              let description=bus_stop["Description"].toUpperCase();
              
              let Latitude=bus_stop["Latitude"];
              let Longitude=bus_stop["Longitude"];
              
              let bus_stop_no=code+"";

              bus_stops_mapping[bus_stop_no]={}
              bus_stops_mapping[bus_stop_no]={
                "road_name":road_name,
                "description":description,
                "latitude":Latitude,
                "longitude":Longitude
              };

              let bus_stop_feature={
                "type":"Feature",
                "properties":{
                  "code": code,
                  "description": description,
                  "road_name": road_name
                },
                "geometry": {
                  "type":"Point",
                  "coordinates": [ Longitude, Latitude ]
                }
              }
              all_bus_stops_geojson["features"].push(bus_stop_feature);
            }
          }
        // wait 100 milliseconds
        await new Promise((resolve, reject) => setTimeout(resolve, 100));
        if(all_bus_stops_geojson["features"].length>0) {
          all_bus_stops_geojson_layer = L.geoJSON(all_bus_stops_geojson, {
              pointToLayer: ((feature, latlng) => {
                let busStopMarker;
                let bus_stop_description=feature["properties"]["description"];
                if(bus_stop_description.indexOf(" INT")>=0 || bus_stop_description.indexOf(" TER")>=0) {
                  busStopMarker=L.marker(latlng, {
                     icon: L.divIcon({     
                         html: '<span class="bus-stop-marker" style="background-color:' + geojsonBusStopMarkerOptions["fillColor"] + ';"><svg class="icon icon-bus"><use xlink:href="symbol-defs.svg#icon-bus"></use></svg></span>',
                         className: "leaflet-marker-own"
                     })
                  });
                } else {
                  busStopMarker=L.circleMarker(latlng, geojsonBusStopMarkerOptions);
                }

                busStopMarker.bindTooltip(
                  "<div><span style='background:rgba(11, 11, 117, 0.15);padding:1px;color:" + geojsonBusStopMarkerOptions["fillColor"] + "'><b>" + feature["properties"]["code"] + "</b></span>&nbsp;" + bus_stop_description + "</div>", { 
                  className: "leaflet-tooltip-custom", 
                  offset: [0, 0]
                });
                return busStopMarker;
              })
          });
          await new Promise((resolve, reject) => setTimeout(resolve, 100));
          if(typeof all_bus_stops_geojson_layer !== 'undefined') {
            map.addLayer(all_bus_stops_geojson_layer);
          }
        }

          // ================ INIT bus services ==============================
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
            for(let bus_service of responseObj) {
              let ServiceNo=bus_service["ServiceNo"]+"";
              let Operator=bus_service["Operator"];
              let Direction=bus_service["Direction"];
              let Category=bus_service["Category"];
              let OriginCode=bus_service["OriginCode"]+"";
              let DestinationCode=bus_service["DestinationCode"]+"";
              let LoopDesc=bus_service["LoopDesc"].toUpperCase();

              let AM_Peak_Freq=bus_service["AM_Peak_Freq"];
              let AM_Offpeak_Freq=bus_service["AM_Offpeak_Freq"];
              let PM_Peak_Freq=bus_service["PM_Peak_Freq"];
              let PM_Offpeak_Freq=bus_service["PM_Offpeak_Freq"];

              let origin_bus_stop="";
              let destination_bus_stop="";

              let service_id=ServiceNo+"_"+Direction;
              if(typeof bus_stops_mapping[OriginCode] !== "undefined") {
                origin_bus_stop=bus_stops_mapping[OriginCode]["description"];
              }
              if(typeof bus_stops_mapping[DestinationCode] !== "undefined") {
                destination_bus_stop=bus_stops_mapping[DestinationCode]["description"];
              }

              bus_services_mapping[service_id]={};
              bus_services_mapping[service_id]={
                "service_no":ServiceNo,
                "operator":Operator,
                "direction":Direction,
                "category":Category,
                "origin_code":OriginCode,
                "destination_code":DestinationCode,
                "origin_bus_stop": origin_bus_stop,
                "destination_bus_stop": destination_bus_stop,
                "loop_description":LoopDesc
              };
            }
          }
          await new Promise((resolve, reject) => setTimeout(resolve, 100));
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

          if(busRoutesRetrieved) {
            for(let bus_route of responseObj) {
              let ServiceNo=bus_route["ServiceNo"];
              let Direction=bus_route["Direction"];
              let Operator=bus_route["Operator"];

              let WD_FirstBus=bus_route["WD_FirstBus"];
              let WD_LastBus=bus_route["WD_LastBus"];
              let SAT_FirstBus=bus_route["SAT_FirstBus"];
              let SAT_LastBus=bus_route["SAT_LastBus"];
              let SUN_FirstBus=bus_route["SUN_FirstBus"];
              let SUN_LastBus=bus_route["SUN_LastBus"];

              let service_id=ServiceNo+"_"+Direction;
              let service_obj=bus_services_mapping[service_id];
              
              let stop_sequence=bus_route["StopSequence"];
              let bus_stop_code=bus_route["BusStopCode"]+"";
              let distance=parseFloat(bus_route["Distance"]);

              if(typeof service_routes_mapping[service_id]=="undefined") {
                service_routes_mapping[service_id]={
                  "service_no_mapped":service_obj["service_no"],
                  "operator_mapped":service_obj["operator"],
                  "direction_mapped":service_obj["direction"],
                  "category_mapped":service_obj["category"],
                  "origin_code_mapped":service_obj["origin_code"],
                  "destination_code_mapped":service_obj["destination_code"],
                  "loop_description_mapped":service_obj["loop_description"],

                  "service_no":ServiceNo,
                  "direction":Direction,
                  "operator":Operator,
                  "weekday_first_bus":WD_FirstBus,
                  "weekday_last_bus":WD_LastBus,
                  "saturday_first_bus":SAT_FirstBus,
                  "saturday_last_bus":SAT_LastBus,
                  "sunday_first_bus":SUN_FirstBus,
                  "sunday_last_bus":SUN_LastBus,
                  "total_distance": 0,
                  "cumulated_distance":{},
                  "bus_stops": {},
                  "coordinates": {}
                };
              }
              service_routes_mapping[service_id]["bus_stops"][stop_sequence]=bus_stop_code;
              service_routes_mapping[service_id]["cumulated_distance"][stop_sequence]=distance;
              service_routes_mapping[service_id]["total_distance"] = distance;

              if(typeof bus_stops_mapping[bus_stop_code]!="undefined") {
                let bus_stop_latitude=bus_stops_mapping[bus_stop_code]["latitude"];
                let bus_stop_longitude=bus_stops_mapping[bus_stop_code]["longitude"];
                let bus_stop_coordinate=[bus_stop_longitude,bus_stop_latitude];

                service_routes_mapping[service_id]["coordinates"][stop_sequence]=bus_stop_coordinate;
              }
            }
          }
        }
        await new Promise((resolve, reject) => setTimeout(resolve, 100));
        // service_routes_mapping
        console.log("All data initialised.");


        // ============================== RENDER OUTPUT ====================================================
        let bus_service_selections = "";
        bus_service_selections+="<div class='card-body rounded-0'>";
        bus_service_selections+="<table class='table table-condensed table-hover w-100'><tbody>";

        for(let s in service_routes_mapping) {
          let service_route=service_routes_mapping[s];

          let cumulated_distance_obj=service_route["cumulated_distance"];
          let cumulated_distance_arr=Object.values(cumulated_distance_obj);
          
          let bus_stops_obj=service_route["bus_stops"];
          let bus_stops_arr=Object.values(bus_stops_obj);

          let coordinates_obj=service_route["coordinates"];
          let coordinates_arr=Object.values(coordinates_obj);

          let loop_description_mapped = service_route["loop_description_mapped"];
          let origin_code_mapped = service_route["origin_code_mapped"];
          let destination_code_mapped = service_route["destination_code_mapped"];

          let service_no = service_route["service_no"];
          let direction = service_route["direction"];
          let service_id = service_no+"_"+direction;
          let operator = service_route["operator"];

          let weekday_first_bus = service_route["weekday_first_bus"].substr(0,2) + ":" + service_route["weekday_first_bus"].substr(2);
          let weekday_last_bus = service_route["weekday_last_bus"].substr(0,2) + ":" + service_route["weekday_last_bus"].substr(2);

          let saturday_first_bus = service_route["saturday_first_bus"].substr(0,2) + ":" + service_route["saturday_first_bus"].substr(2);
          let saturday_last_bus = service_route["saturday_first_bus"].substr(0,2) + ":" + service_route["saturday_first_bus"].substr(2);

          let sunday_first_bus = service_route["sunday_first_bus"].substr(0,2) + ":" + service_route["sunday_first_bus"].substr(2);
          let sunday_last_bus = service_route["sunday_last_bus"].substr(0,2) + ":" + service_route["sunday_last_bus"].substr(2);

          let total_distance = service_route["total_distance"];

          let service_route_obj={
            "service_id": service_id,
            "service_no": service_no,
            "direction": direction,
            "operator": operator,
            "weekday": `${weekday_first_bus} to ${weekday_last_bus}`,
            "saturday": `${saturday_first_bus} to ${saturday_last_bus}`,
            "sunday": `${sunday_first_bus} to ${sunday_last_bus}`,
            "total_distance":  total_distance,
            "origin_bus_stop": bus_stops_arr[0],
            "dest_bus_stop": bus_stops_arr[bus_stops_arr.length-1],
            
            "service_no_mapped":service_route["service_no_mapped"],
            "operator_mapped":service_route["operator_mapped"],
            "direction_mapped":service_route["direction_mapped"],
            "category_mapped":service_route["category_mapped"],
            "origin_code_mapped":origin_code_mapped,
            "destination_code_mapped":destination_code_mapped,
            "loop_description_mapped":loop_description_mapped,
            "coordinates_arr": coordinates_arr,
            "cumulated_distance": cumulated_distance_obj,
            "bus_stops": bus_stops_obj,
            "coordinates":coordinates_obj
          };

          let symbol = "➝"
          if(loop_description_mapped !== "") {
            symbol = "⟲"
          } else if(
            typeof bus_services_mapping[service_no+"_"+1] !== "undefined" 
            && typeof bus_services_mapping[service_no+"_"+2] !== "undefined"
          ) {
            symbol = "⇆"
          }

          service_route_obj["symbol"]=symbol;
          service_routes_mapping[service_id]=service_route_obj;

          let caption="<br>";
          if(symbol=="⟲") {
            caption+="<span class='ascii_chars'>ᴸᵒᵒᵖ@</span>" + loop_description_mapped;
          } else if(symbol=="⇆") {
            caption+="<span class='ascii_chars'>2ʳᵒᵘᵗᵉˢ</span>";
          } else {
            caption+="<span class='ascii_chars'>1ʳᵒᵘᵗᵉ ᵒⁿˡʸ</span>";
          }
          caption=`<span class='ascii_chars'>${caption}</span>`;

          if( ( symbol=="⇆" && parseInt(direction)==1 ) ||  symbol !== "⇆") {

            let route_title = bus_stops_mapping[origin_code_mapped]["description"]+"<span class='ascii_chars ml-1 mr-1'>➝</span>"+bus_stops_mapping[destination_code_mapped]["description"];
            route_title = "<small class='small'>"+route_title+"</small>";

            if(symbol=="⇆") {
              let route_2_origin_code=bus_services_mapping[service_no+"_"+2]["origin_code"];
              let route_2_destination_code=bus_services_mapping[service_no+"_"+2]["destination_code"];

              let route_2_title="<small class='small'>" + bus_stops_mapping[route_2_origin_code]["description"]+"<span class='ascii_chars ml-1 mr-1'>➝</span>"+bus_stops_mapping[route_2_destination_code]["description"]+"</small>";

              route_title=route_title;
              route_title=`${route_title}<b class="ascii_chars p-1">ᵒʳ</b>${route_2_title}`;
            }

            bus_service_selections += "<tr>";
            bus_service_selections += "<td><span class='badge badge-info service_no'>"+service_no+"</span></td>";
            bus_service_selections += "<td class='small'>"+route_title+caption+"</td>";
            
            bus_service_selections += "<td>";
            bus_service_selections += "<input type='radio' data-serviceid='"+service_id+"' class='form-check-input service_route_selection' name='service_route_selection' />";
            if(symbol=="⇆") {
              bus_service_selections += "<small class='ascii_chars'>ᴿᵒᵘᵗᵉ1</small>";
            }
            bus_service_selections += "</td>";

            if(symbol=="⇆") {
              bus_service_selections += "<td>";
              bus_service_selections += "<input type='radio' data-serviceid='"+service_no+"_2' class='form-check-input service_route_selection' name='service_route_selection' />";
              bus_service_selections += "<small class='ascii_chars'>ᴿᵒᵘᵗᵉ2</small>";
              bus_service_selections += "</td>";
            } else {
              bus_service_selections += "<td>&nbsp;</td>";
            }
            bus_service_selections += "</tr>";
          }

          for(let sIndex in coordinates_obj) {
            let featurePropertiesCopy = JSON.parse(JSON.stringify((service_route_obj)));
            let bus_stop_code=bus_stops_obj[sIndex];

            featurePropertiesCopy["stop_sequence"]=parseInt(sIndex)
            featurePropertiesCopy["cumulated_distance"]=cumulated_distance_arr[sIndex],
            featurePropertiesCopy["bus_stop_code"]=bus_stop_code,
            featurePropertiesCopy["bus_stop_description"]=bus_stops_mapping[bus_stop_code]["description"],
            featurePropertiesCopy["bus_stop_road_name"]=bus_stops_mapping[bus_stop_code]["road_name"]

            let bus_stop_feature={
              "type":"Feature",
              "properties": featurePropertiesCopy,
              "geometry": {
                "type": "Point",
                "coordinates": [ 
                  bus_stops_mapping[bus_stop_code]["longitude"],
                  bus_stops_mapping[bus_stop_code]["latitude"] 
                ]
              }
            }
            bus_stops_by_service_geojson["features"].push(bus_stop_feature);
          } // nested for-loop
        } // outer for-loop
        await new Promise((resolve, reject) => setTimeout(resolve, 100));

        bus_service_selections += "</tbody></table>"
        bus_service_selections+="</div>";
        $("#bus_services").html(bus_service_selections);

        console.log("Output is rendered.");


        $(".service_route_selection").change((ele) => {
          $(".service_route_selection").each((ele2) => {
              $(".service_route_selection")[ele2].checked=false;
          });
          service_route_selected=ele.target.dataset.serviceid;
          ele.target.checked=true;

          if(typeof bus_stops_by_service_geojson_layer !== "undefined") {
            map.removeLayer(bus_stops_by_service_geojson_layer);
          }
          if(typeof service_route_selected_layer !== "undefined") {
            map.removeLayer(service_route_selected_layer);
          }
          if(typeof displayed_bus_stops_geojson_layer !== "undefined") {
            map.removeLayer(displayed_bus_stops_geojson_layer);
          }
          if(typeof displayed_route_selected_layer !== "undefined") {
            map.removeLayer(displayed_route_selected_layer);
          }

          let coordinates_arr=service_routes_mapping[service_route_selected]["coordinates_arr"];
          let latlngs=reverse_latlngs(coordinates_arr);
          let center=L.latLngBounds(latlngs).getCenter();
          map.flyTo(center, defaultZoom);

          service_route_selected_layer = L.polyline(latlngs, {
              color: "#cc1f5e",
              weight: 3.5,
              strokeOpacity: 1.0,
              offset: 5.5,
              renderer: L.svg()
          });
          map.addLayer(service_route_selected_layer);

          let service_no=service_routes_mapping[service_route_selected]["service_no"];
          let direction=service_routes_mapping[service_route_selected]["direction"];
          let symbol=service_routes_mapping[service_route_selected]["symbol"];

          let service_route_details_htmlstr="";
          service_route_details_htmlstr += '<div class="card-header">';
          service_route_details_htmlstr += '<h6><a class="card-link w-100">';
          service_route_details_htmlstr += '<p class="pb-0 pt-1 mb-1 mt-1 small">';

          service_route_details_htmlstr += '<span class="badge badge-success service_no">';
          service_route_details_htmlstr += service_no;
          service_route_details_htmlstr += '</span>';

          service_route_details_htmlstr += '<span class="ml-1 mr-1">';
          service_route_details_htmlstr += bus_stops_mapping[service_routes_mapping[service_route_selected]["origin_code_mapped"]]["description"];
          service_route_details_htmlstr += "<b class='ascii_chars ml-1 mr-1'>"+symbol+"</b>";
          service_route_details_htmlstr += bus_stops_mapping[ service_routes_mapping[service_route_selected]["destination_code_mapped"]]["description"];
          service_route_details_htmlstr += '</span>';

          service_route_details_htmlstr += '<small class="rounded-sm bg-primary ml-1 mr-1 mb-2 mt-2 pl-1 pr-1 pt-1 pb-1 text-light">';
          service_route_details_htmlstr += service_routes_mapping[service_route_selected]["operator"];
          service_route_details_htmlstr += '</small>';

          service_route_details_htmlstr += '<small class="rounded-sm bg-warning ml-1 mr-1 mb-2 mt-2 pl-1 pr-1 pt-1 pb-1 text-dark">';
          service_route_details_htmlstr += service_routes_mapping[service_route_selected]["category_mapped"];
          service_route_details_htmlstr += '</small>';

          if(symbol=="⇆") {
            service_route_details_htmlstr += '<small class="rounded-sm badge-secondary ml-1 mr-1 mb-2 mt-2 pl-1 pr-1 pt-1 pb-1 text-light">ROUTE ';
            service_route_details_htmlstr += direction;
            service_route_details_htmlstr += '</small>';
          }

          service_route_details_htmlstr += '</p>';
          service_route_details_htmlstr += '</a></h6>';
          service_route_details_htmlstr += '</div>';

          service_route_details_htmlstr += '<div id="service_selected" class="w-100">';
          service_route_details_htmlstr += '<div class="card-body rounded-0">';

          service_route_details_htmlstr+="<table class='table table-condensed table-hover w-100'>";
          service_route_details_htmlstr+="<tbody>";

          bus_stops_by_service_geojson_layer = L.geoJSON(bus_stops_by_service_geojson, {
            pointToLayer: ((feature, latlng) => {
              let busStopMarker=L.marker(latlng, {
                 icon: L.divIcon({      
                     html: '<span class="bus-stop-marker" style="background-color:#cc1f5e">◆</span>',
                     className: "leaflet-marker-own"
                 })
              });

              busStopMarker.bindTooltip(
                "<div><span style='background:rgba(204,31,94,0.15);padding:1px;color:#cc1f5e'><b>" + feature["properties"]["bus_stop_code"] + "</b></span>&nbsp;" + feature["properties"]["bus_stop_description"] + "</div>", { 
                className: "leaflet-tooltip-own", 
                offset: [5.5, 5.5]
              });
              return busStopMarker;
            }),
            filter: ((feature, layer) => {
                if(feature["properties"]["service_id"]==service_route_selected) {
                  let stop_sequence=feature["properties"]["stop_sequence"]
                  let bus_stop_description=feature["properties"]["bus_stop_description"]
                  let bus_stop_code=feature["properties"]["bus_stop_code"]
                  let bus_stop_road_name=feature["properties"]["bus_stop_road_name"]

                  let destination_code_mapped=feature["properties"]["destination_code_mapped"]

                  service_route_details_htmlstr+="<tr>";

                  service_route_details_htmlstr+="<td class='small'>№<b>"+ stop_sequence+"</b></td>";
                  service_route_details_htmlstr+="<td colspan='3' class='small text-left'>"+bus_stop_description+"<small class='ml-1'>(" + bus_stop_code +")</small><br><small>"+bus_stop_road_name+"</small></td>";

                  service_route_details_htmlstr += "<td colspan='2'><div class='form-check'><label class='form-check-label'><input type='radio' class='form-check-input start_bus_stop_selection' data-serviceid='"+service_route_selected+"' name='start_bus_stop' id='start_s"+stop_sequence+"' " + ( stop_sequence==1 ? "checked" : "") + "/><span class='ascii_chars'> ᴼʳⁱᵍⁱⁿ</span></label></div></td>";

                  service_route_details_htmlstr += "<td colspan='2'><div class='form-check'><label class='form-check-label'><input type='radio' class='form-check-input end_bus_stop_selection' data-serviceid='"+service_route_selected+" name='end_bus_stop' id='end_s"+stop_sequence+"' " + ( stop_sequence!=1 && bus_stop_code==destination_code_mapped ? "checked" : "") + "/><span class='ascii_chars'> ᴰᵉˢᵗⁱⁿᵃᵗⁱᵒⁿ</span></label></div></td>";

                  service_route_details_htmlstr+="</tr>";

                  selected_start_sequence=1;
                  selected_stop_sequence=(stop_sequence!=1 && bus_stop_code==destination_code_mapped ? stop_sequence : 1)
                }
                return feature["properties"]["service_id"]==service_route_selected;
            })
          });
          map.addLayer(bus_stops_by_service_geojson_layer);

          service_route_details_htmlstr+="</tbody></table>";
          service_route_details_htmlstr += "</div>";
          service_route_details_htmlstr += "</div>";

          $("#service_route_details").html(service_route_details_htmlstr);
          $("#displayed_bus_route_details").html("");
          let displayed_bus_route_htmlStr="";
       
          function renderServiceRoute() {
            let service_routes_mappingObj=service_routes_mapping[service_route_selected];
            let service_no=service_routes_mappingObj["service_no"]
            let operator=service_routes_mappingObj["operator"]
            let category=service_routes_mappingObj["category_mapped"]
            let total_distance=service_routes_mappingObj["total_distance"]

            let weekday_hours=service_routes_mappingObj["weekday"]

            let saturday_hours=service_routes_mappingObj["saturday"];
            let sunday_hours=service_routes_mappingObj["sunday"];

            let cumulated_distance=service_routes_mappingObj["cumulated_distance"]
            let bus_stops=service_routes_mappingObj["bus_stops"]
            let coordinates=service_routes_mappingObj["coordinates"]

            let initial_distance_unconvered=cumulated_distance[selected_start_sequence]
            let distance_with_extra=cumulated_distance[selected_stop_sequence]
            let actual_distance_covered=distance_with_extra-initial_distance_unconvered

            if(typeof displayed_bus_stops_geojson_layer !== "undefined") {
              map.removeLayer(displayed_bus_stops_geojson_layer);
            }
            if(typeof displayed_route_selected_layer !== "undefined") {
              map.removeLayer(displayed_route_selected_layer);
            }

            displayed_bus_stops_geojson={
              "type":"FeatureCollection",
              "features": []
            };

            $("#displayed_bus_route_details").html("");

            displayed_bus_route_htmlStr="";
            displayed_bus_route_htmlStr+="<div class='card-header'>";

            displayed_bus_route_htmlStr+="<h6><a class='card-link w-100'>";
            displayed_bus_route_htmlStr+="<span class='badge badge-primary'>"+ actual_distance_covered.toFixed(1) +"<span class='ascii_chars pl-1 pr-1'>ᵏᵐ</span>";
            displayed_bus_route_htmlStr+="</span>";

            displayed_bus_route_htmlStr+="&nbsp;";
            displayed_bus_route_htmlStr+="<span class='mb-0 pb-0'>";
            displayed_bus_route_htmlStr+="<span class='badge badge-success'>";
            displayed_bus_route_htmlStr+=`<span>WEEKDAY</span> <u>${weekday_hours}</u>`;
            displayed_bus_route_htmlStr+="</span>";

            displayed_bus_route_htmlStr+="&nbsp;";
            displayed_bus_route_htmlStr+="<span class='badge badge-warning small'>";
            displayed_bus_route_htmlStr+=`<span>SATURDAY</span> <u>${saturday_hours}</u>`;
            displayed_bus_route_htmlStr+="</span>";

            displayed_bus_route_htmlStr+="&nbsp;";
            displayed_bus_route_htmlStr+="<span class='badge badge-warning small'>";
            displayed_bus_route_htmlStr+=`<span>SUNDAY</span> <u>${sunday_hours}</u>`;
            displayed_bus_route_htmlStr+="</span>";
            displayed_bus_route_htmlStr+="</span>";

            displayed_bus_route_htmlStr+="<button id='exportDisplayedBusRoute' type='button' class='btn btn-md btn-secondary rounded-0 float-right'>📥 ᴊsᴏɴ</button>";

            displayed_bus_route_htmlStr+="</a></h6>";
            displayed_bus_route_htmlStr+="</div>";

            displayed_bus_route_htmlStr+="<div id='displayed_route_selected' class='w-100'>";
            displayed_bus_route_htmlStr+="<div class='card-body rounded-0'>";

            displayed_bus_route_htmlStr+="<table class='table table-condensed table-hover w-100'>";
            displayed_bus_route_htmlStr+="<tbody>";

            let selected_route=[]
            let coordinates_arr = service_routes_mappingObj["coordinates_arr"];
            coordinates_arr=coordinates_arr.slice( (selected_start_sequence-1), (selected_stop_sequence) )

            let latlngs=reverse_latlngs(coordinates_arr);
            let center=L.latLngBounds(latlngs).getCenter();
            map.flyTo(center, defaultZoom);

            displayed_route_selected_layer = L.polyline(latlngs, {
              color: "#15727B",
              weight: 3.5,
              strokeOpacity: 1.0,
              offset: 2.5,
              renderer: L.svg()
            });
            map.addLayer(displayed_route_selected_layer);

            for(let i=selected_start_sequence;i<=selected_stop_sequence;i++) {
              try {
                let coordinate=coordinates[i];

                let bus_stop_code=bus_stops[i];
                let bus_stop_distance= (i==selected_start_sequence) ? 0 : (cumulated_distance[i]-cumulated_distance[i-1]);
                let bus_stop_description=bus_stops_mapping[bus_stop_code]["description"]

                let displayed_bus_stop_feature={
                  "type":"Feature",
                  "properties": {
                    "bus_stop_code": bus_stop_code,
                    "bus_stop_description": bus_stop_description,
                    "bus_stop_road_name": bus_stops_mapping[bus_stop_code]["road_name"],
                    "bus_stop_distance": bus_stop_distance,
                    "bus_stop_sequence": i
                  },
                  "geometry": {
                    "type": "Point",
                    "coordinates": coordinate
                  }
                };
                displayed_bus_stops_geojson["features"].push(displayed_bus_stop_feature);

                displayed_bus_route_htmlStr+="<tr>";

                displayed_bus_route_htmlStr+="<td>";
                displayed_bus_route_htmlStr+="<span style='background-color:#15727B' class='bus-stop-marker'><svg class='icon icon-bus'><use xlink:href='symbol-defs.svg#icon-bus'></use></svg></span>";
                displayed_bus_route_htmlStr+="</td>";

                displayed_bus_route_htmlStr+="<td class='small'>";
                displayed_bus_route_htmlStr+="<button type='button' class='view_bus_arrivals btn btn-outline-secondary btn-sm rounded-0' value='"+bus_stop_code+"'><svg class='icon icon-bus-eta'><use xlink:href='symbol-defs.svg#icon-bus-eta'></use></svg>&nbsp;<small>("+bus_stop_code+")</small></button>";
                displayed_bus_route_htmlStr+="</td>";
                displayed_bus_route_htmlStr+="<th class='small'>"+bus_stop_description+"</th>";
                displayed_bus_route_htmlStr+="<td class='small'>"+(bus_stop_distance*1000).toFixed(0)+" m</td>";

                displayed_bus_route_htmlStr+="</tr>";

              } catch(err) { console.log(err, "renderServiceRoute") }
            } // end for-loop

            displayed_bus_route_htmlStr+="</tbody>";
            displayed_bus_route_htmlStr+="</table>";

            displayed_bus_route_htmlStr+="</div>";
            displayed_bus_route_htmlStr+="</div>";

            $("#displayed_bus_route_details").html(displayed_bus_route_htmlStr);

            displayed_bus_stops_geojson_layer=L.geoJSON(displayed_bus_stops_geojson, {
              pointToLayer: ((feature, latlng) => {
                let busStopMarker=L.marker(latlng, {
                   icon: L.divIcon({      
                       html: '<span class="bus-stop-marker" style="background-color:#15727B"><svg class="icon icon-bus"><use xlink:href="symbol-defs.svg#icon-bus"></use></svg></span>',
                       className: "leaflet-marker-own"
                   })
                });
                busStopMarker.bindTooltip(
                  "<div><span style='background:rgba(21,124,113,0.15);padding:1px;color:#15727B'><b>" + feature["properties"]["bus_stop_code"] + "</b></span>&nbsp;" + feature["properties"]["bus_stop_description"] + "</div>", { 
                  className: "leaflet-tooltip-own-2",
                  offset: [2.5, 2.5]
                });
                return busStopMarker
              })
            });
            map.addLayer(displayed_bus_stops_geojson_layer);
          } // renderServiceRoute

          function disabledStartStopBusStops() {
            $(".start_bus_stop_selection").each((ele2) => { 
              let startBusStop=$(".start_bus_stop_selection")[ele2];
              let startSequence=parseInt(startBusStop.id.split("start_s")[1]);
              if(startSequence != selected_start_sequence) {
                startBusStop.checked=false;
              }
              if(startSequence<selected_stop_sequence) {
                startBusStop.disabled=false;
              } else {
                startBusStop.disabled=true;
              }
            });
            $(".end_bus_stop_selection").each((ele2) => {
              let stopBusStop=$(".end_bus_stop_selection")[ele2];
              let stopSequence=parseInt(stopBusStop.id.split("end_s")[1]);
              if(stopSequence != selected_stop_sequence) {
                stopBusStop.checked=false;
              }
              if(stopSequence>selected_start_sequence) {
                stopBusStop.disabled=false;
              } else {
                stopBusStop.disabled=true;
              }
            });
          } // disabledStartStopBusStops

          $(".start_bus_stop_selection").change((ele) => {
            let serviceid_selected=ele.target.dataset.serviceid;
            ele.target.checked=true;
            selected_start_sequence=parseInt((ele.target.id).split("start_s")[1]);
            disabledStartStopBusStops();
            renderServiceRoute();
          });
          $(".end_bus_stop_selection").change((ele) => {
            let serviceid_selected=ele.target.dataset.serviceid;
            selected_stop_sequence=parseInt((ele.target.id).split("end_s")[1]);
            ele.target.checked=true;
            disabledStartStopBusStops();
            renderServiceRoute();
          });
        });

        await new Promise((resolve, reject) => setTimeout(resolve, 100));


        $("body").on("click", "#exportDisplayedBusRoute", () => {
          let exportObj=[];
          let exportFeatures=displayed_bus_stops_geojson["features"];
          for(let e in exportFeatures) {
            let ef=exportFeatures[e]
            let ePropertiesObj=JSON.parse(JSON.stringify( (ef["properties"]) ));
            ePropertiesObj["Latitude"]=ef["geometry"]["coordinates"][1]
            ePropertiesObj["Longitude"]=ef["geometry"]["coordinates"][0]
            exportObj.push(ePropertiesObj);
          }
          if (!window.Blob) {
            alert("Your browser does not support HTML5 'Blob' function required to save a file.");
          } else {
            let textblob = new Blob([JSON.stringify(exportObj)], {
                type: "text/plain"
            });
            let dwnlnk = document.createElement("a");
            dwnlnk.download = "bus_route.json";
            if (window.webkitURL != null) {
                dwnlnk.href = window.webkitURL.createObjectURL(textblob);
            } 
            dwnlnk.click();
          }
        });

        $("body").on("keyup", "#search_bus_stop", function() {
          let value = $(this).val().toLowerCase();
          $("body").find("#bus_services tr").filter(function() {
            $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)
          });
        });

        const noOfMillisecondsPerDay=86400000;
        // const currentTimestamp = new Date();

        function processBusStopETA(res) {
          let responseArr=JSON.parse(JSON.stringify(res));

          let busEtaHtmlStr="";
          busEtaHtmlStr+="<div class='card-body rounded-0'>";
          busEtaHtmlStr+="<table class='w-100'><tbody>";

          var colCounter=1;
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
              feature="&nbsp;<svg class='icon icon-wheelchair'><use xlink:href='symbol-defs.svg#icon-wheelchair'></use></svg>";
            } else {
              feature="&nbsp;<svg class='icon icon-non-wheelchair'><use xlink:href='symbol-defs.svg#icon-non-wheelchair'></use></svg>";
            }

            if(colCounter==1) {
              busEtaHtmlStr+="<tr>";
            }
            busEtaHtmlStr+="<td width='33.33%'>";
            busEtaHtmlStr+="<span style='border-radius:0;margin-top:5px;margin-bottom:5px' class='badge badge-warning service_no rounded-left'>" + svc_no + "</span><span style='border-radius:0;margin-top:5px;margin-bottom:5px' class='badge badge-secondary service_no rounded-right small'><small class='small' style='color:#fff'>";
            if(parseInt(eta)<=0) {
              busEtaHtmlStr+="<span class='ascii_chars'>ᴬʳʳ</span>";
            } else if(parseInt(eta)>0) {
              busEtaHtmlStr+=(parseInt(eta)+"<span class='ascii_chars'>ᵐⁱⁿ</span>");
            } else {
              busEtaHtmlStr+="<span class='ascii_chars'>⁽ᴺᴬ⁾</span>"
            }
            busEtaHtmlStr+="&nbsp"+feature;
            busEtaHtmlStr+="</small></span>";
            busEtaHtmlStr+="</td>";

            if(r==(responseArr.length-1)) {
              if(colCounter==1) {
                busEtaHtmlStr+="<td width='33.33%'>&nbsp;</td><td width='33.33%'>&nbsp;</td></tr>";
              } else if(colCounter==2) {
                busEtaHtmlStr+="<td width='33.33%'>&nbsp;</td></tr>";
              }
            }
            if(colCounter==3) {
              busEtaHtmlStr+="</tr>";
              colCounter=0;
            }
            colCounter++;
          } // end for-loop
          busEtaHtmlStr+="</tbody></table>";
          busEtaHtmlStr+="</div>";
          $("#bus_etas").html(busEtaHtmlStr);
        } // end processBusStopETA


         // --------------------------- CLIENT SIDE WEB SOCKET INIT ------------------------
      const errMsg = "<div class='text-center text-dark'><b>⚠ Information unavailable. Please select another Bus Stop.</b></div>";

      const socket = io();
      socket.on("connect", async() => {
        console.info(`Client side socket[${socket.id}] connection established at: ${window.navigator.userAgent}`);

        // callback from client-side to server-side
        socket.emit("back_to_server", `${socket.id}`);
        await new Promise((resolve, reject) => setTimeout(resolve, 1000));

        $("body").on("click",".view_bus_arrivals", (ele3) => {
          $("#bus_etas").html("");
          $("#bus_etas_title").html("");
          $("#bus_eta_details_pill").click();

          try {
            let selectedBusStop=ele3.target.value;
            let busStopDescription=bus_stops_mapping[selectedBusStop];
            console.log(selectedBusStop);

            if(typeof busStopDescription=="undefined") {
              console.log("[view_bus_arrivals] 'busStopDescription' is undefined.");
              $("#bus_etas_title").html(errMsg);
              $("#bus_etas").html("");
              // Msg server to stop displaying current bus arrival info
              socket.emit("bus_arrivals", undefined);
            } else {
              busStopDescription=busStopDescription["description"];
              $("#bus_etas").html("<div class='text-center'><div class='spinner-border'></div></div>");
              $("#bus_etas_title").html('<b><svg class="icon icon-bus-eta"><use xlink:href="symbol-defs.svg#icon-bus-eta"></use></svg> Bus ETAs at (' + selectedBusStop + ') ' + busStopDescription + '</b>');
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
        });
      }); // --------------------------- // END CLIENT SIDE WEB SOCKET INIT ------------------------
      socket.on("disconnect", () => {
        console.info(`Client side socket[${socket.id}] has disconnected.`);
      });
     
  }); // end document.addEventListener('DOMContentLoaded', async() => {
}