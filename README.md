<div align="center">
  <img src="https://github.com/incubated-geek-cc/sg-transportation/raw/main/public/img/logo.png" width="96" alt="logo">

  # SG Bus Routes

**Bus route visualisation site built to aid me in an analytical task. Related articles are:**
<div align="left">
	<ol>
		<li>[Tackling Heroku H12 timeout errors of Node.js Web APIs — Handling Long Response Times](https://towardsdatascience.com/tackling-heroku-h12-timeout-errors-of-node-js-web-apis-handling-long-response-times-8fbafe46cd40)</li>
		<li>[Building a real-time web app in NodeJS Express with Socket.io library](https://towardsdatascience.com/building-a-real-time-web-app-in-nodejs-express-with-socket-io-library-d9b50aded6e6)</li>
	</ol>
</div>
</div>

Bus stops, bus services and bus routes are called via [LTA's Public API](https://datamall.lta.gov.sg/content/datamall/en.html). Faster retrieval via [Redis](https://redis.com/) caching for in-memory storage. Realtime bus ETAs in Singapore can be displayed based on bus stop selected.

[**Web App :: Link**](https://sg-transportation.glitch.me/) &nbsp;&nbsp;&nbsp; [**Web App :: Backup Link**](https://sg-transportation.onrender.com) 

## Features and Screenshots

<p>Displays Realtime Bus ETAs: 📱 Mobile & 💻 🖥️  Larger Screens</p>
<br/><img src="https://miro.medium.com/max/1400/1*QKFF2dM6D7apIZfRLn30Jg.png" width="800px" />

<p>Enables Selection of Route Origin-Destination</p>
<br/><img src="https://miro.medium.com/max/1050/1*dDjLS1LBpUOlTFh357ozLg.png" width="800px" />

<p>Exports Bus Route as JSON data (based on earlier selections)</p>
<br/><img src="https://miro.medium.com/max/1050/1*MrnOOOJPG62tror-WAPseg.png" width="800px" />

## 📜 License

Data © [LTA](http://www.mytransport.sg/content/mytransport/home/dataMall/termOfUse.html) © [OneMap](https://www.onemap.sg/legal/termsofuse.html) © [OSM contributors](https://www.openstreetmap.org/copyright). Everything else: [MIT](http://cheeaun.mit-license.org/)

---
## ⚠️ Important Note: As of 12 Nov 2022, UI has been revamped with existing functionalities still in place. 

<p>Select Bus Service No. to render route</p>
📱 Mobile View
<br/><img src="https://github.com/incubated-geek-cc/sg-transportation/raw/main/public/img/updated_mobile_ui.jpg" width="250px" />
💻 🖥️ On Larger Screens:
<br/><img src="https://github.com/incubated-geek-cc/sg-transportation/raw/main/public/img/updated_ui.jpg" width="800px" />

<p>Origin-Destination selection for data export</p>
<br/><img src="https://github.com/incubated-geek-cc/sg-transportation/raw/main/public/img/updated_ui_bus_route_od_selection.jpg" width="800px" />

<p>Bus Stop Realtime ETA</p>
<br/><img src="https://github.com/incubated-geek-cc/sg-transportation/raw/main/public/img/updated_ui_bus_etas.jpg" width="800px" />

## Special Mentions
- Inspired by [BusrouteSG by cheeaun](https://github.com/cheeaun/busrouter-sg).