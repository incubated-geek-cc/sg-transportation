require("dotenv").config();

const redis = require("redis")
const url = require("url")

const redis_username=process.env.REDIS_USERNAME
const redis_password=process.env.REDIS_PASSWORD

const redis_endpoint_uri=process.env.REDIS_ENDPOINT_URI
const redis_db=process.env.REDIS_DB

const redisStr=`redis://${redis_username}:${redis_password}@${redis_endpoint_uri}/${redis_db}`
const redisURL = url.parse(redisStr)

const redisClient = redis.createClient(redisURL.port, redisURL.hostname, {no_ready_check: true})
redisClient.auth(redisURL.auth.split(":")[1])

redisClient.on("connect", () => {
  console.log("Successfully connected to Redis instance.");
});

const PORT = process.env.PORT || 3000
const ORIGIN=process.env.ORIGIN || `http://localhost:${PORT}`
const LTA_API_KEY=process.env.LTA_API_KEY

const http = require("http")
const request = require("request")
const express = require("express")
const socketio = require("socket.io")

const onlineClients = new Set();

const API_ENDPOINT = "http://datamall2.mytransport.sg/ltaodataservice"
const PAGE_SIZE = 500 // How many records the API returns in a page.
const LIMIT_PER_CALL=4500

let updateInterval;
let previousBusCode;

function onNewWebsocketConnection(socket) {
  console.info(`Socket ${socket.id} has connected.`);
  onlineClients.add(socket.id);

  socket.on("disconnect", () => {
      onlineClients.delete(socket.id);
      console.info(`Socket ${socket.id} has disconnected.`);
  });

  // echoes on the terminal every "back_to_server" message this socket sends
  // will send a message only to this socket (different than using `io.emit()`, which would broadcast it)
  socket.on("back_to_server", msg => console.info(`Socket ${socket.id} says: "${msg}"`));
  
  socket.on("bus_arrivals", bus_stop_code => {
    console.log(`Requesting bus stop: ${bus_stop_code}`)
    if(previousBusCode != bus_stop_code) {
      previousBusCode=bus_stop_code;
      clearInterval(updateInterval);
    
      updateInterval = setInterval(() => {
        request({
            url: `${API_ENDPOINT}/BusArrivalv2?BusStopCode=${bus_stop_code}`,
            method: "GET",
            json: true,
            headers: {
              "AccountKey" : LTA_API_KEY,
              "accept" : "application/json"
            }
        }, (err, res, body) => {
            socket.emit("get_bus_arrivals_info", JSON.stringify(body["Services"]));
        });
      }, 10000);
    }
  });

}

function startServer() {
  const app = express()
  const path = require("path")
  const favicon = require("serve-favicon")
  const engine = require("consolidate")
  const server = http.createServer(app)
  const io = socketio(server);
  const compression = require("compression");
  
  app.use(compression()); //use compression 

  // set up router
  const router = express.Router();

  router.use(express.urlencoded({extended: true}))
  router.use(express.json())
  router.use((req, res, next) => { // router middleware
      res.header("Access-Control-Allow-Origin", ORIGIN || "*");
      next();
  });
  // REGISTER ALL ROUTES -------------------------------
  // all of the routes will be prefixed with /api
  app.use("/api", router);

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

  router.post("/ltaodataservice/all/:transportation", async (req, res) => {
    try {
      let params=req.params;
      let transportation=params["transportation"];

      let cacheKey=`${transportation}_hash`;
      
      redisClient.get(cacheKey, (err, data) => {
        if (err) {
          console.error(err);
          throw err;
        }
        if (data) {
          console.log(`${cacheKey} is retrieved from Redis`);
          return res.status(200).json(JSON.parse(data));
        } else {
          let entireListing;
          (async () => {
            try {
              entireListing=await asyncCall(transportation);
            } catch(e) {
              console.log(e)
            }
            let cacheExpirySeconds=60*60*24*60
            redisClient.setex(cacheKey, cacheExpirySeconds, JSON.stringify(entireListing));
            console.log(`${cacheKey} retrieved from the API`);

            return res.status(200).json(entireListing);
          })();
        }
      });
    } catch(err) {
      return res.status(500).json({ 
        type: "error",
        message: (err !== null && typeof err.message !== "undefined") ? err.message : `Error. Unable to retrieve data from datamall.lta.gov.sg ${transportation} Routing API.`
      });
    }
  }); 


  router.post("/ltaodataservice/:transportation/:client_offset", async(req, res) => {
    try {
      let params=req.params;

      let transportation=params["transportation"];
      let client_offset=params["client_offset"];
      client_offset=parseInt(client_offset);

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
        var offset = client_offset;

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
          if(offset==(client_offset+LIMIT_PER_CALL)) {
            toContinue=false;
          } else if(offset==client_offset || result.length==PAGE_SIZE) {
            result = await resolveAsyncCall(options);
            offset += PAGE_SIZE;
            options.url=`${API_ENDPOINT}/${transportation}?$skip=${offset}`;
          } else if(
              (offset>client_offset) 
              && ( offset<(client_offset+LIMIT_PER_CALL) && (result.length<PAGE_SIZE) )
            ) {
            toContinue=false;
          }
          arr_result=arr_result.concat(result);
        }
        return new Promise(resolve => {
          resolve(arr_result);
        });
      };


      let cacheKey=`${transportation}_hash_${client_offset}`;
      
      redisClient.get(cacheKey, (err, data) => {
        if (err) {
          console.error(err);
          throw err;
        }
        if (data) {
          console.log(`${cacheKey} is retrieved from Redis`);
          return res.status(200).json(JSON.parse(data));
        } else {
          (async () => {
            let entireSubListing;
            try {
              entireSubListing=await asyncCall(transportation);
            } catch(e) {
              console.log(e)
            }
            let cacheExpirySeconds=60*60*24*60
            redisClient.setex(cacheKey, cacheExpirySeconds, JSON.stringify(entireSubListing));
            console.log(`${cacheKey} retrieved from the API`);

            return res.status(200).json(entireSubListing);
          })();
        }
      });
    } catch(err2) {
      return res.status(500).json({ 
        type: "error",
        message: (err2 !== null && typeof err2.message !== "undefined") ? err2.message : `Error. Unable to retrieve data from datamall.lta.gov.sg ${transportation} API.`
      });
    }
  });

  router.get("/wake_up", (req, res) => {
    res.json({"status":"app_is_awake"});
  });
  
  // set up express app properties + serve static assets
  app.use(express.static(path.join(__dirname, "public")))
  .set("views", path.join(__dirname, "views"))
  .engine("html", engine.mustache)
  .use(favicon(path.join(__dirname, "public", "img/favicon.ico")))
  .set("view engine", "html")
  .get("/", (req, res) => res.render("index.html"))

  // will fire for every new websocket connection
  io.on("connection", onNewWebsocketConnection);

  // important! must listen from `server`, not `app`, otherwise socket.io won't function correctly
  server.listen(PORT, () => {
    console.log(`SG Transportation App [using Forward Proxy] is listening on port ${PORT}!`);
  });

  // broadcast here
  /*
  setInterval(() => {
      io.emit("online_clients_tracker", onlineClients.size);
  }, 10000);*/
}

startServer();