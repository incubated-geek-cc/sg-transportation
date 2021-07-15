const express = require("express");
const config = require("dotenv").config()

const PORT = process.env.PORT || 3000
const GOOGLE_API_KEY=process.env.GOOGLE_API_KEY
const LTA_API_KEY=process.env.LTA_API_KEY

const ONEMAP_EMAIL = process.env.ONEMAP_EMAIL
const ONEMAP_PASSWORD = process.env.ONEMAP_PASSWORD

const path = require("path")
const request = require("request");
const http = require("http");
const favicon = require("serve-favicon");
const engine = require("consolidate");
const socketIo = require("socket.io");

// set up router
var router = express.Router();
router.use(
  express.urlencoded({
    extended: true
  })
)
router.use(express.json())
router.use((req, res, next) => { // router middleware
    res.header("Access-Control-Allow-Origin", process.env.ORIGIN || "*");
    next();
});

const app = express();
// REGISTER ALL ROUTES -------------------------------
// all of the routes will be prefixed with /api
app.use("/api", router);

// set up express app properties
app.use(express.static(path.join(__dirname, "public")))
.set("views", path.join(__dirname, "views"))
.engine("html", engine.mustache)
.use(favicon(path.join(__dirname, "public", "img/favicon.ico")))
.set("view engine", "html")
.get("/sg_bus_routes", (req, res) => res.render("sg_bus_routes.html"))
.get("/", (req, res) => res.render("sg_bus_routes.html"))

// awr up web socket
const server = http.createServer(app);
const io = socketIo(server);

server.listen(PORT, () => {
  console.log(`SG Transportation App [using Forward Proxy] is listening on port ${PORT}!`)
});

let updateInterval;
io.on("connection", (socket) => {
  console.log("server side socket connection established");
  if(updateInterval) {
    clearInterval(updateInterval);
  }
  function retrieveLatestBusArrivals(bus_stop_code) {
    let baseUrl = "http://datamall2.mytransport.sg/ltaodataservice/BusArrivalv2?BusStopCode=";
    request({
        url: `${baseUrl}${bus_stop_code}`,
        method: "GET",
        headers: {
          "AccountKey" : LTA_API_KEY,
          "accept" : "application/json"
        }
    }, (err, response, body) => {
      if (err || response.statusCode !== 200) {
          return (err !== null && typeof err.message !== "undefined") ? err.message : "Error. Unable to retrieve data from datamall.lta.gov.sg Bus Arrival API.";
      } else {
          let result=JSON.parse(body);
          let resultStr=JSON.stringify(result["Services"])
          setInterval(()=> {
            socket.emit("bus_arrivals", resultStr);
          }, 10000);
          return resultStr;
      }
    });
  }
  
  socket.on("bus_arrivals", (selectedBusStop) => {
    console.log(`requested bus stop: ${selectedBusStop}`)
    retrieveLatestBusArrivals(selectedBusStop);
  });
 
  socket.on("disconnect", () => {
    console.log("socket disconnected");
  });
});


// UTILS
function concatParams(baseUrl, params={}) {
  let fullUrl=baseUrl;
  let counter=0;
  for(let p in params) {
    if(counter>0) {
      fullUrl+="&";
    }
    fullUrl+=p+"="+params[p];
    counter++;
  }
  return fullUrl;
}

function jsonArrToCsvStr(jsonArr) {
  let noHeader=true
  let jsonCsv=""
  let jsonArr = bus_services
  for(let o in jsonArr) {
    try {
      let jsonObj=jsonArr[o]
      let vals_arr=Object.values(jsonObj)
      let vals_csv_str=vals_arr.join(",") + "\n"
      
      if(noHeader) {
        let header_arr=Object.keys(jsonObj)
        let header_csv_str=header_arr.join(",") + "\n"
        jsonCsv += header_csv_str
        noHeader=false
      }
      
      jsonCsv += vals_csv_str
    } catch(err) {  console.log(err) }
  }
  return jsonCsv;
}

var ONEMAP_API_TOKEN = ""; 

// Onemap API Token
request({
    url: "https://developers.onemap.sg/privateapi/auth/post/getToken",
    method: "POST",
    json: true,
    body: {
      email: ONEMAP_EMAIL,
      password: ONEMAP_PASSWORD
    }
}, (err, res, body) => {
  ONEMAP_API_TOKEN = body.access_token;
});

// Onemap Routing API
// Calling via a proxy
router.get("/onemap/directions/json/:routeType/:start/:end", (req, res) => {   
  let baseUrl="https://developers.onemap.sg/privateapi/routingsvc/route?"; // call onemap routing api via a proxy
  let params=req.params;
  params["token"]=ONEMAP_API_TOKEN;
  let fullUrl=concatParams(baseUrl,params);
  request({ url: fullUrl }, (err, response, body) => {
    let immediateResponse=JSON.parse(body);
    if(typeof immediateResponse["error"] !== "undefined") {
      return res.status(500).json({ // renew token here
        type: "error",
        message: immediateResponse["error"]
      });
    } else if (err || response.statusCode !== 200) {
      return res.status(500).json({ 
        type: "error", 
        message: (err !== null && typeof err.message !== "undefined") ? err.message : "Error. Unabled to retrieve data from OneMap API."
      });
    }
    res.json(JSON.parse(body))
  })
});

// Google Geocoding
// Calling via a proxy
router.get("/google/geocode/json/:latlng", (req, res) => {
  let baseUrl="https://maps.googleapis.com/maps/api/geocode/json?"; 
  let params=req.params;
  params["key"]=GOOGLE_API_KEY;
  let fullUrl=concatParams(baseUrl,params);
  request({ url: fullUrl }, (err, response, body) => {
    if (err || response.statusCode !== 200) {
      return res.status(500).json({
        type: "error", 
        message: (err !== null && typeof err.message !== "undefined") ? err.message : "Error. Unabled to retrieve data from Google Geocoding API."
      });
    }
    res.json(JSON.parse(body))
  })
});

var location_data={
  "data": {
    "mappings": {
      "addresses": {}
    },
    "addresses": []
  }
};
var place_id_mapper={}

// Google Place Autocomplete
router.get("/google/place/autocomplete/json/:input", (req, res) => {
  place_id_mapper={}
  
  let baseUrl="https://maps.googleapis.com/maps/api/place/autocomplete/json?"; 
  let params=req.params;
  params["key"]=GOOGLE_API_KEY
  params["types"]="geocode"
  params["language"]="en"
  let fullUrl=concatParams(baseUrl,params);
  request({ url: fullUrl }, (err, response, body) => {
    if (err || response.statusCode !== 200) {
      return res.status(500).json({
        type: "error", 
        message: (err !== null && typeof err.message !== "undefined") ? err.message : "Error. Unabled to retrieve data from Google Autocomplete API."
      });
    }

    let jsonObj=JSON.parse(body)
    let predictions=jsonObj["predictions"]
    for(let p in predictions) {
      let predictionObj = predictions[p]
      let place_id = predictionObj["place_id"]
      let description = predictionObj["description"]
      place_id_mapper[description] = place_id
    }
    location_data["data"]["mappings"]["addresses"]=place_id_mapper
    location_data["data"]["addresses"]=Object.keys(place_id_mapper)

    res.json(location_data)
  })
});

router.get("/google/place/details/json/:place_id", (req, res) => {
  let baseUrl="https://maps.googleapis.com/maps/api/place/details/json?"; 
  let params=req.params;
  params["fields"]="formatted_address,geometry"
  params["key"]=GOOGLE_API_KEY

  let fullUrl=concatParams(baseUrl,params);
  request({ url: fullUrl }, (err, response, body) => {
    if (err || response.statusCode !== 200) {
      return res.status(500).json({
        type: "error", 
        message: (err !== null && typeof err.message !== "undefined") ? err.message : "Error. Unabled to retrieve data from Google Place Details API."
      });
    }
    let jsonObj=JSON.parse(body)
    let resultObj=jsonObj["result"]
    let formatted_address=resultObj["result"]
    let latitude=resultObj["geometry"]["location"]["lat"]
    let longitude=resultObj["geometry"]["location"]["lng"]

    let result={
      "latitude":latitude,
      "longitude":longitude
    };
    res.json(result)
  })
});

// Google Routing
router.get("/google/directions/json/:origin/:destination/:mode/:alternatives/:language/:units", (req, res) => {
  let baseUrl="https://maps.googleapis.com/maps/api/directions/json?"; 
  let params=req.params;
  params["key"]=GOOGLE_API_KEY;
  let fullUrl=concatParams(baseUrl,params);
  request({ url: fullUrl }, (err, response, body) => {
    if (err || response.statusCode !== 200) {
      return res.status(500).json({ 
        type: "error", 
        message: (err !== null && typeof err.message !== "undefined") ? err.message : "Error. Unabled to retrieve data from Google Routing API."
      });
    }
    res.json(JSON.parse(body))
  })
});

//http://datamall2.mytransport.sg/ltaodataservice/PV/ODBus
// api/ltaodataservice/BusServices | BusServices | BusRoutes | BusStops
// http://datamall2.mytransport.sg/ltaodataservice/BusRoutes?$skip=500
router.get("/ltaodataservice/:transportation", (req, res) => {
	var arr_result=[]
	var offset = 0
	const API_ENDPOINT = "http://datamall2.mytransport.sg/ltaodataservice"
	const PAGE_SIZE = 500 // How many records the API returns in a page.

	let params=req.params;
	let transportation=params["transportation"]

	function callLTAService(transportation, offset) {
		request({
		    url: `${API_ENDPOINT}/${transportation}?$skip=${offset}`,
		    method: "GET",
		    json: true,
		    headers: {
		    	"AccountKey" : LTA_API_KEY,
			    "accept" : "application/json"
		  	}
		}, (err, response, body) => {
			let result = {}
			if (err || response.statusCode !== 200) {
		    	return res.status(500).json({ 
		        type: "error",
		        message: (err !== null && typeof err.message !== "undefined") ? err.message : "Error. Unable to retrieve data from datamall.lta.gov.sg Bus Routing API."
	      	});
		    } else {
		    	result=body.value
		    	arr_result = arr_result.concat(result)
		    	offset += PAGE_SIZE
		    	if(result.length<PAGE_SIZE) {
		    		return res.status(200).json(arr_result)
		    	} else {
		    		callLTAService(transportation, offset)
		    	}
		    }
		});
  } // end method --- callLTAService

  callLTAService(transportation, offset)
});