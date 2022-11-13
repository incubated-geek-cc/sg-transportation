require("dotenv").config();

// ================== Part #1. Most variables and constants are declared here
const PORT = process.env.PORT || 3000;
const ORIGIN=process.env.ORIGIN || `http://localhost:${PORT}`;
const LTA_API_KEY=process.env.LTA_API_KEY;
const LTA_API_KEY_BACKUP=process.env.LTA_API_KEY_BACKUP;
const API_ENDPOINT = "http://datamall2.mytransport.sg/ltaodataservice";
const PAGE_SIZE = 500; // How many records the API returns in a page.
const LIMIT_PER_CALL=4500;

const compression = require("compression");
const request = require("request");

const path = require("path");
const favicon = require("serve-favicon");
const engine = require("consolidate");

const express = require("express");

const router = express.Router(); // set up router
router.use(express.urlencoded({extended: true}));
router.use(express.json());
router.use((req, res, next) => { // router middleware
  res.header("Access-Control-Allow-Origin", ORIGIN || "*");
  next();
});


// ========== Part #2. A redis client is instantiated here to fetch all of its non-expired cached information 
// ========== This includes Bus services, Bus Routes, Bus Stops & Bus ETAs for pre-load rendering 
// ========== and mitigate excessive load time for the web app on start
const redis = require("redis");
const url = require("url");
const redis_username=process.env.REDIS_USERNAME;
const redis_password=process.env.REDIS_PASSWORD;
const redis_endpoint_uri=process.env.REDIS_ENDPOINT_URI;
const redis_db=process.env.REDIS_DB;
const redisStr=`redis://${redis_username}:${redis_password}@${redis_endpoint_uri}/${redis_db}`;
const redisURL = url.parse(redisStr);

const connectedRedisClient = (redisClient) => new Promise((resolve, reject) => {
    redisClient.on("connect", () => resolve(redisClient));
    redisClient.on("error", (err) => reject(err));
});

var redisClient;

(async()=> {
  const redisClientInstance = redis.createClient(redisURL.port, redisURL.hostname, {no_ready_check: true});
  redisClientInstance.auth(redisURL.auth.split(":")[1]);

  try {
    redisClient = await connectedRedisClient(redisClientInstance);
    console.log("Successfully connected to Redis instance.");
  } catch(err) {
    console.log(err);
    console.log("Failed to connect to Redis instance.");
  }
 
  // ====================================================================
  // ================== Part #3. All server side API calls are called via the below functions and the redis Client updatse its data
  // ================== storage with the API outputs in event the cache of its storage has expired (to fetch only up-to-date data)
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

      if(typeof redisClient !== "undefined") {
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
                console.log(e);
              }
              let cacheExpirySeconds=60*60*24*60;
              redisClient.setex(cacheKey, cacheExpirySeconds, JSON.stringify(entireListing));
              console.log(`${cacheKey} retrieved from the API`);

              return res.status(200).json(entireListing);
            })();
          }
        });
      } else {
        console.log('empty array');
        return res.status(200).json([]);
      }
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

      if(typeof redisClient !== "undefined") {
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
                console.log(e);
              }
              let cacheExpirySeconds=60*60*24*60;
              redisClient.setex(cacheKey, cacheExpirySeconds, JSON.stringify(entireSubListing));
              console.log(`${cacheKey} retrieved from the API`);

              return res.status(200).json(entireSubListing);
            })();
          }
        });
      } else {
        console.log('empty array');
        return res.status(200).json([]);
      }
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

  const app = express();
  app.use(compression()); //use compression

  // ================== Part #4. Server side socket is set up via socketio and http server below. Connection with client side must be 
  // ================== established before bilateral messages can be exchanged
  const http = require("http");
  const socketio = require("socket.io");
  const server = http.createServer(app);
  const io = socketio(server);

  // important! must listen from `server`, not `app`, otherwise socket.io won't function correctly
  server.listen(PORT, () => {
    console.log(`SG Transportation App [using Forward Proxy] is listening on port ${PORT}!`);
  });

  // REGISTER ALL ROUTES -------------------------------
  // all of the routes will be prefixed with /api
  app.use("/api", router);
  // set up express app properties + serve static assets
  app.use(express.static(path.join(__dirname, "public")))
  .set("views", path.join(__dirname, "views"))
  .engine("html", engine.mustache)
  .use(favicon(path.join(__dirname, "public", "img/favicon.ico")))
  .set("view engine", "html")
  .get("/", (req, res) => res.render("index.html"))


  const onlineClients = new Set(); // Used to track the no. of connected client sockets and ids
  const previousBusCode = new Map(); // Stores the latst bus stop no. ETAs requested by a client
  const updateInterval = new Map(); // Stores latest intervalID of the socket tagged to its client to stop fetching data when not needed


  // whenever a new user logs onto the web app a new client socket shall be established and connected
  function onNewWebsocketConnection(socket) {
      console.info(`Server side socket[${socket.id}] connection established.`);

      // awaits for client-side to callback and confirm connection.
      // echoes on the terminal every "back_to_server" message this socket sends
      socket.on("back_to_server", msg => {
        console.info(`Client side socket id: ${msg}`);
        if(msg==socket.id) {
          onlineClients.add(socket.id);
          previousBusCode.set(socket.id, undefined);
          updateInterval.set(socket.id, undefined);
        }
      });

      // server side receives bus stop code from client side socket
      socket.on("bus_arrivals", bus_stop_code => {
        let intervalID=updateInterval.get(socket.id);
        let prevBusCode=previousBusCode.get(socket.id);

        // when bus_stop_code is undefined it means client side has no required information
        // to transfer to server side to fetch the Bus ETAs
        if(typeof bus_stop_code==="undefined") {
          if( (typeof intervalID!=="undefined") ) { // When user had requested for another bus stop's ETAs previously
            clearInterval(intervalID);
            updateInterval.set(socket.id, undefined);

            prevBusCode=undefined; // When user selects another bus stop, the ETAs for the previous selection should be removed
            previousBusCode.set(socket.id, undefined);
          }
        } else if( (typeof prevBusCode==="undefined") || (prevBusCode !== bus_stop_code) ) { // User has selected another bus stop
          previousBusCode.set(socket.id, bus_stop_code);

          if( (typeof intervalID!=="undefined") ) { // To stop fetch ETAs for previous bus stop selected
            clearInterval(intervalID);
            updateInterval.set(socket.id, undefined);
          }
          intervalID = setInterval(() => {
            request({
                url: `${API_ENDPOINT}/BusArrivalv2?BusStopCode=${bus_stop_code}`,
                method: "GET",
                json: true,
                headers: {
                  "AccountKey" : LTA_API_KEY, // LTA_API_KEY_BACKUP
                  "accept" : "application/json"
                }
            }, (err, res, body) => {
              socket.emit("get_bus_arrivals_info", JSON.stringify(body["Services"]));
            });
          }, 10000);
          updateInterval.set(socket.id, intervalID); // update the stored interval ID
        }
      });

      socket.on("disconnect", () => {
        onlineClients.delete(socket.id);
        previousBusCode.delete(socket.id);
        updateInterval.delete(socket.id);
        console.info(`Server side socket[${socket.id}] has disconnected.`);
      });
  }

  // will fire for every new socket connection: every user logs onto the web app
  io.on("connection", onNewWebsocketConnection);
  // broadcast here
  /*
  setInterval(() => {
      io.emit("online_clients_tracker", onlineClients.size);
  }, 10000);*/
})();