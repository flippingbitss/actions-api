// server.js
// where your node app starts

// init project
const express = require("express");
const ApiAiAssistant = require("actions-on-google").ApiAiAssistant;
const bodyParser = require("body-parser");
const request = require("request");
const app = express();
// const Map = require("es6-map");

// Pretty JSON output for logs
const prettyjson = require("prettyjson");

// Join an array of strings into a sentence
const toSentence = require("underscore.string/toSentence");

const FLASK_URL = 'http://35.182.93.208:5000/recommend'

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json({ type: "application/json" }));
app.use(express.static("public"));


app.get("/", function(request, response) {
  response.sendFile(__dirname + "/views/index.html");
});

// Handle webhook requests
app.post("/", function(req, res, next) {
 
  // Log the request headers and body, to aide in debugging. You'll be able to view the
  // webhook requests coming from API.AI by clicking the Logs button the sidebar.
  logObject("Request headers: ", req.headers);
  logObject("Request body: ", req.body);

  // Instantiate a new API.AI assistant object.
  const assistant = new ApiAiAssistant({ request: req, response: res });

  // Declare constants for your action and parameter names
  const ASK_WEATHER_ACTION = "askWeather"; // The action name from the API.AI intent
  const CITY_PARAMETER = "geo-city"; // An API.ai parameter name

  const ASK_RECOMMENDATION_ACTION = "askRecommendation";
  const CHOICES_PARAM = "choicesVector";

  function getRecommendation(assistant) {
    console.log("Handling action: " + ASK_RECOMMENDATION_ACTION);
    let choices = assistant.getArgument(CHOICES_PARAM);

    const body = new FormData();
    body.append("test", "blah blah");

    const resHandler = val => {
      logObject("flask response: ", val);
      assistant.tell("the flask server responded with" + JSON.stringify(val));
    };

    fetch(FLASK_URL, { method:'POST',body})
      .then(res => res.json())
      .then(resHandler)
      .catch(err => next(err));
  }

  assistant.tell("test response from aws action server");


  // // Add handler functions to the action router.
  // let actionRouter = new Map()
  // // The ASK_WEATHER_INTENT (askWeather) should map to the getWeather method.
  // actionRouter.set(ASK_RECOMMENDATION_ACTION, getRecommendation);

  // // Route requests to the proper handler functions via the action router.
  // assistant.handleRequest(actionRouter);
});

// Handle errors.
app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// Pretty print objects for logging.
function logObject(message, object, options) {
  console.log(message);
  console.log(prettyjson.render(object, options));
}

// Listen for requests.
let server = app.listen(process.env.PORT || 8080, function() {
  console.log("Your app is listening on port " + server.address().port);
});
