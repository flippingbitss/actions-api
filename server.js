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

const FLASK_URL = "http://35.182.93.208:5000/recommend";

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({ type: "application/json" }));
app.use(express.static("public"));

app.get("/", function(request, response) {
  response.sendFile(__dirname + "/views/index.html");
});

const interestScore = [
  "Museums",
  "Nature",
  "Amusement",
  "Temples",
  "Adventure",
  "Skyscrapers"
];

const convValues = {
  interests: [],
  budget: 300,
  duration: 10
};

const params = {
  budget: "unit-currency",
  duration: "duration",
  interest: "interest"
};

const actionResponse = value => {
  return {
    "quiz.budget": `Great! ${value} sounds good. What's the duration of your travel ? (In days)`,
    "quiz.duration": `${value} sounds good ! Of the following what do you prefer the most ?`,
    "quiz.interest": `${value} added to the list. What else do you like ?`,
    "quiz.interest2": `Got it . Now based on all the information you have provided, my recommendation would be to  travel to ${value}.`
  };
};

const SESSION_STORE = new Map();

// Handle webhook requests
app.post("/", function(req, res, next) {
  // Log the request headers and body, to aide in debugging. You'll be able to view the
  // webhook requests coming from API.AI by clicking the Logs button the sidebar.
  logObject("Request headers: ", req.headers);
  logObject("Request body: ", req.body);

  // Instantiate a new API.AI assistant object.
  const assistant = new ApiAiAssistant({ request: req, response: res });

  let conversation = SESSION_STORE.get(req.body.sessionId);

  const reqParams = req.body.result.parameters;
  const action = req.body.result.action;

  if (!conversation){
   conversation = SESSION_STORE.set(req.body.sessionId, {
      interests: new Set(),
      duration: 0,
      budget: 0
    });
  }
  
    console.log(action)
  
  if (action == "quiz.budget") {
    conversation.budget = reqParams.budget.amount;
    console.log(conversation)
    assistant.tell(actionResponse(conversation.budget)[action]);
  }

  if (action == "quiz.duration") {
    conversation.duration =
      reqParams.duration.unit == "day"
        ? reqParams.duration.amount
        : reqParams.duration.amount * 30;


    console.log(conversation)
    assistant.tell(actionResponse(conversation.duration.amount)[action]);
  }

  if (action == "quiz.interest") {

    conversation.interests.add(reqParams.interest);
    console.log(conversation)
    assistant.tell(actionResponse(reqParams.interest)[action]);
  }

  function getRecommendation(assistant, featureVector) {
    const body = new FormData();
    body.append("features", featureVector);

    const resHandler = val => {
      logObject("flask response: ", val);
      console.log("flask ", val)
      assistant.tell(actionResponse(val)["quiz.interest2"]);

      SESSION_STORE.delete(req.body.sessionId);
    };

    fetch(FLASK_URL, { method: "POST", body })
      .then(res => res.json())
      .then(resHandler)
      .catch(err => next(err));
  }

  if (action == "quiz.interest2") {

    conversation.interests.add(reqParams.interest);
    const convInterests = Array.from(conversation.interests)
    console.log(conversation)

    const interestRatios = interestScore.map((item, idx) => {
      const index = convInterests.indexOf(item);
      return index >= 0 ? convInterests.length - index : 0;
    });

    const sumOfIRs = interestRatios.reduce((a, b) => a + b);
    const finalInterest = interestRatios.map((item, idx) => item / sumOfIRs);

    const religionVec = Array(5).fill(0);
    const urbanism = [0.5, 0];

    let duration = [];
    if (conversation.duration > 0 && conversation.duration <= 15)
      duration = [1, 0, 0];
    else if (conversation.duration > 15 && conversation.duration <= 20)
      duration = [0.5, 0.5, 0];
    else duration = [0.3, 0.3, 0.3];

    const featureVector = [
      ...finalInterest,
      ...religionVec,
      ...urbanism,
      ...Array(3).fill(0),
      conversation.budget,
      ...Array(4).fill(0)
    ];

    getRecommendation(assistant, featureVector);
  }

  // assistant.tell("test response from aws action server");

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
