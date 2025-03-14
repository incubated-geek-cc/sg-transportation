require("dotenv").config();

// ================== Part #1. Most variables and constants are declared here
const PORT = process.env.PORT || 3000;
const ORIGIN=process.env.ORIGIN || `http://localhost:${PORT}`;
const LTA_API_KEY_BACKUP=process.env.LTA_API_KEY_BACKUP;
// const LTA_API_KEY=process.env.LTA_API_KEY;
const API_ENDPOINT = "https://datamall2.mytransport.sg/ltaodataservice";
// https://datamall2.mytransport.sg/ltaodataservice/BusStops
// https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival
// https://datamall2.mytransport.sg/ltaodataservice
// https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival?BusStopCode=83139
// https://datamall2.mytransport.sg/ltaodataservice/BusServices
// https://datamall2.mytransport.sg/ltaodataservice/BusStops

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
var redis_api_host=process.env.REDIS_API_HOST;

var redis_user_name=process.env.REDIS_USER_NAME;
var redis_account_key=process.env.REDIS_ACCOUNT_KEY;
var redis_secret_key=process.env.REDIS_SECRET_KEY;

const redis_username=process.env.REDIS_DEFAULT_USERNAME;
const redis_password=process.env.REDIS_DEFAULT_PASSWORD;

const redis_host=process.env.REDIS_HOST;
const redis_port=process.env.REDIS_PORT;
const redis_endpoint_url=process.env.REDIS_ENDPOINT_URL;
const redis_db=process.env.REDIS_DB;

const authHeaders={ 
  url: `https://${redis_api_host}/logs`,
  method: 'GET',
  headers: {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "x-api-key": redis_account_key,
    "x-api-secret-key": redis_secret_key
  }
};

// function getAsyncRequest() {
//   return new Promise(resolve => {
//     request(authHeaders, (_err, _res, _body) => {
//       // console.log('_err',_err);
//       // console.log('_res',_res);
//       let result=_body;
//       resolve(result);
//     });
//   });
// }
// async function getReditAPIData() {
//   let results=await getAsyncRequest();
//   return results;
// }
// url: 'redis://alice:foobared@awesome.redis.server:6380'
// [
//   'redisURL',
//   Url {
//     protocol: 'redis:',
//     slashes: true,
//     auth: 'incubated.geek.woman@gmail.com:S3z7inpt9ouxcfn1q4i5wuh3ycwtpqavkanc3uua0y93dgz7ql3',
//     host: 'redis-13866.c334.asia-southeast2-1.gce.redns.redis-cloud.com:13866',
//     port: '13866',
//     hostname: 'redis-13866.c334.asia-southeast2-1.gce.redns.redis-cloud.com',
//     hash: null,
//     search: null,
//     query: null,
//     pathname: '/sg-transportation',
//     path: '/sg-transportation',
//     href: 'redis://incubated.geek.woman%40gmail.com:S3z7inpt9ouxcfn1q4i5wuh3ycwtpqavkanc3uua0y93dgz7ql3@redis-13866.c334.asia-southeast2-1.gce.redns.redis-cloud.com:13866/sg-transportation'
//   }
// ]

// var redisClient;

var connectedClient;
const connectedRedisClient = (connectedClient) => new Promise((resolve, reject) => {
    connectedClient.on("connect", () => resolve(connectedClient));
    connectedClient.on("error", (err) => reject(err));
});

(async()=> {
  // var reditAPIResultset=await getReditAPIData();
  // console.log(['reditAPIResultset',reditAPIResultset]);

  console.log(["---result---"]);
  const client = redis.createClient({
    url: `redis://${redis_username}:${redis_password}@${redis_endpoint_url}/${redis_db}`,
    username: redis_username, // use your Redis user. More info https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/
    password: redis_secret_key, // use your password here
    socket: {
        host: `redis://${redis_username}:${redis_password}@${redis_endpoint_url}`,
        port: redis_port
        // tls: true,
        // key: readFileSync('./redis_user_private.key'),
        // cert: readFileSync('./redis_user.crt'),
        // ca: [readFileSync('./redis_ca.pem')]
    }
  });
  connectedClient = await connectedRedisClient(client);
  console.log("Redis client connected.");
  console.log(["---result---"]);
  // Url {
  //   protocol: 'redis:',
  //   slashes: true,
  //   auth: 'incubated.geek.woman@gmail.com:CE3BvBPJKaUMttEHZWrb9UGTSxpEw6Zr',
  //   host: 'redis-13866.c334.asia-southeast2-1.gce.redns.redis-cloud.com:13866',
  //   port: '13866',
  //   hostname: 'redis-13866.c334.asia-southeast2-1.gce.redns.redis-cloud.com',
  //   hash: null,
  //   search: null,
  //   query: null,
  //   pathname: '/sg-transportation',
  //   path: '/sg-transportation',
  //   href: 'redis://incubated.geek.woman%40gmail.com:CE3BvBPJKaUMttEHZWrb9UGTSxpEw6Zr@redis-13866.c334.asia-southeast2-1.gce.redns.redis-cloud.com:13866/sg-transportation'
  // }
  


  // console.log(["==="]);
  // const connectedClientInstance = redis.createClient(redisURL.port, redisURL.hostname, {no_ready_check: true});
  // connectedClientInstance.auth(redisURL.auth.split(":")[1]);
  // try {
  //   connectedClient = await connectedRedisClient(connectedClientInstance);
  //   console.log("Successfully connected to Redis instance.");
  // } catch(err) {  
  //   console.log(err);
  //   console.log("Failed to connect to Redis instance.");
  // }
  // console.log(["==="]);

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
        "AccountKey" : LTA_API_KEY_BACKUP,
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

      if(typeof connectedClient !== "undefined") {
        let cacheKey=`${transportation}_hash`;
        connectedClient.get(cacheKey, (err, data) => {
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
              connectedClient.setex(cacheKey, cacheExpirySeconds, JSON.stringify(entireListing));
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
            "AccountKey" : LTA_API_KEY_BACKUP,
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

      if(typeof connectedClient !== "undefined") {
        let cacheKey=`${transportation}_hash_${client_offset}`;
        connectedClient.get(cacheKey, (err, data) => {
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
              connectedClient.setex(cacheKey, cacheExpirySeconds, JSON.stringify(entireSubListing));
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
                url: `${API_ENDPOINT}/v3/BusArrival?BusStopCode=${bus_stop_code}`,
                method: "GET",
                json: true,
                headers: {
                  "AccountKey" : LTA_API_KEY_BACKUP,
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