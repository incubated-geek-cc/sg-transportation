const express = require("express");
const config = require("dotenv").config()

const PORT = process.env.PORT
const LTA_API_KEY=process.env.LTA_API_KEY

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
.get("/", (req, res) => res.render("index.html"))

// set up web socket
var server = http.createServer(app);
server.setTimeout(0);
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

const API_ENDPOINT = "http://datamall2.mytransport.sg/ltaodataservice"
const PAGE_SIZE = 500 // How many records the API returns in a page.

function resolveAsyncCall(reqOptions) {
  return new Promise(resolve => {
    request(reqOptions, function(err, res, body) {
        let result=body.value;
        resolve(result);
    });
  });
}

async function asyncCall(transportation) {
  var arr_result=[];
  var offset = 0;

  var options={
    url: `${API_ENDPOINT}/${transportation}?$skip=${offset}`,
    method: "GET",
    json: true,
    headers: {
      "AccountKey" : LTA_API_KEY,
      "accept" : "application/json"
    }
  };

  var result = [];
  var toContinue=true;
  while(toContinue) {
    if(offset==0 || result.length==PAGE_SIZE) {
      result = await resolveAsyncCall(options);
      offset += PAGE_SIZE;
      options.url=`${API_ENDPOINT}/${transportation}?$skip=${offset}`;
    } else if(result.length < PAGE_SIZE) {
      toContinue=false;
    }
    arr_result=arr_result.concat(result);
  }
  return new Promise(resolve => {
    resolve(arr_result);
  });
};

//http://datamall2.mytransport.sg/ltaodataservice/PV/ODBus
// api/ltaodataservice/BusServices | BusServices | BusRoutes | BusStops
// http://datamall2.mytransport.sg/ltaodataservice/BusRoutes?$skip=500
router.get("/ltaodataservice/:transportation", async (req, res) => {
    
    req.headers['Content-Type']='application/json; charset=utf-8';
    req.headers['Retry-After']=60;
    req.headers['Connection']='Keep-Alive';
    req.headers['Keep-Alive']='timeout=120, max=3000';
    req.headers['Large-Allocation']=500;

    try {
      let params=req.params;
      let transportation=params["transportation"];
      let entireListing=await asyncCall(transportation);

      return res.status(200).json(entireListing)
    } catch(err) {
      return res.status(404).json({ 
        type: "error",
        message: (err !== null && typeof err.message !== "undefined") ? err.message : `Error. Unable to retrieve data from datamall.lta.gov.sg ${transportation} Routing API.`
      })
    }
});