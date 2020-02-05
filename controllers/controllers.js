const { Credentials } = require("uport-credentials");
const decodeJWT = require("did-jwt").decodeJWT;
const message = require("uport-transports").message.util;
const transports = require("uport-transports").transport;
const pushTransport = require("uport-transports").transport.push;
import { mySigner } from "../services/hsmSigner";
const request = require("request");

const credentials = new Credentials({
  appName: "MyIssuer",
  did: "did:ethr:0xd502a2c71e8c90e82500a70683f75de38d57dd9f",
  signer: mySigner
});

function connect(req, res) {
  let ssiSessionId = req.query.ssiSessionId;
  let credentialsToRequest = {};

  let eidas = {
    essential: true,
    iss: [
      {
        did: "did:ethr:0xd502a2c71e8c90e82500a70683f75de38d57dd9f",
        url: "https://seal-issuer.eu"
      }
    ],
    reason: "To access the service, your eIDAS-eID is required"
  };
  let eduGain = {
    essential: true,
    iss: [
      {
        did: "did:ethr:0xd502a2c71e8c90e82500a70683f75de38d57dd9f",
        url: "https://seal-issuer.eu"
      }
    ],
    reason: "To get your academic id"
  };

  if (req.query.eidas) {
    console.log(`eidas requested`);
    credentialsToRequest.eidas = eidas;
  }
  if (req.query.eugain) {
    console.log(`edugain requested`);
    credentialsToRequest.eduGain = eduGain;
  }

  let  responseEndpoint = req.query.callback
  console.log('controllers.js:: will send responses to::' + responseEndpoint)

  credentials
    .createDisclosureRequest({
      iss: "did:ethr:0xd502a2c71e8c90e82500a70683f75de38d57dd9f",
      type: "shareReq",
      callbackUrl:
      responseEndpoint+`?ssiSessionId=${ssiSessionId}`, // + `/connectionResponse?ssiSessionId=${ssiSessionId}`,
      claims: {
        verifiable: credentialsToRequest
      }
    })
    .then(requestToken => {
      console.log("**************Request******************");
      console.log(decodeJWT(requestToken)); //log request token to console
      const uri = message.paramsToQueryString(
        message.messageToURI(requestToken),
        { callback_type: "post" }
      );
      console.log(uri);
      const qr = transports.ui.getImageDataURI(uri);
      res.send(`<div><img src="${qr}"/></div>`);
    });
}

function connectionResponse(req, res) {
  const jwt = req.body.access_token;
  const ssiSessionId = req.query.ssiSessionId;
  console.log(`the ssiSessionId is ${ssiSessionId}`);
  console.log("**************Verifier:: RESPONSE******************");
  credentials
    .authenticateDisclosureResponse(jwt)
    .then(creds => {
      //validate specific data per use case
      console.log(`controllers.js:: creds!!!!`);
      console.log(creds);
      // console.log(`controllers.js:: creds.verified[0]!!!!`);
      // console.log(creds.verified[0]);
      console.log(creds.eidas);
      // http://localhost:8081/auth/realms/test/sp/ssiResponse
      let keycloak = process.env.KEYCLOAK
      request
        .post(`${keycloak}/auth/realms/test/sp/ssiResponse`, {
          form: { sessionId: ssiSessionId, claims: JSON.stringify(creds) }
        })
       
    })
    .catch(err => {
      console.log("oops");
      console.log(err);
    });
}

export { connect, connectionResponse };
