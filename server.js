const express = require("express");
const next = require("next");
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const bodyParser = require("body-parser");
const session = require("express-session");
const memoryStore = new session.MemoryStore();
const isProduction = process.env.NODE_ENV === "production";
const SESSION_CONF = {
  secret: "this is my super super secret, secret!! shhhh",
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false },
  store: memoryStore
};
const port = parseInt(process.env.PORT, 10) || 3000;
const production = process.env.PRODUCTION || false;

const ngrok = require("ngrok");
import { connect, connectionResponse } from "./controllers/controllers";

let endpoint = "";

app.prepare().then(() => {
  const server = express();
  server.use(bodyParser.json({ type: "*/*" }));
  // set session managment
  if (isProduction) {
    SESSION_CONF.cookie.secure = true; // serve secure cookies, i.e. only over https, only for production
  }
  server.use(session(SESSION_CONF));

  server.get("/connectionRequest", (req, res) => {
    console.log("server.js :: heye connectionRequest called");
    req.endpoint = endpoint;
    return connect(req, res);
  });



  server.post("/connectionResponse", (req, res) => {
    console.log("server.js :: heye connectionResponse called");
    return connectionResponse(req, res);
  });


  server.all("*", (req, res) => {
    return handle(req, res);
  });

  server.listen(port, err => {
    if (err) throw err;
    if(!production){
      ngrok.connect(port).then(ngrokUrl => {
        endpoint = ngrokUrl;
        console.log(`running, open at ${endpoint}`);
      });
    }
    console.log(`running, open at localhost`);
  });
});
