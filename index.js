const express = require('express');
const bodyParser = require("body-parser");
const app = express();
const axios = require('axios');


// Airtable
const airtable = require('airtable');
var base = new airtable({
  apiKey: process.env.AIRTABLE_API_KEY,
}).base(process.env.AIRTABLE_BASE_ID);
var tableName = 'Latest';

// Twitter
var twitter = require('twitter');

var twitterClient = new twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});
 

// Express
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

let listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});

// https://swiftuidir-syndicator.glitch.me/syndicate

app.post('/syndicate', function(req, res) {
  res.send("{ 'success': true }");

  axios.get('https://swiftui.directory/feed.json')
    .then(response => {
        resolveLatestPost(response.data);
    })
    .catch(error => {
        console.log(error);
    });
});

app.get('/test', function(req, res) {
  const library = {
            "id": "https://github.com/lludo/SwiftSunburstDiagram",
            "content_html": "Sunburst diagrams with nesting support. Comes with animated updates and configurable colors and images. \n",
            "url": "https://github.com/lludo/SwiftSunburstDiagram",
            "title": "SwiftSunburstDiagram",
            "date_published": "2019-10-28T23:06:00.000Z",
            "metadata": {
                "authorTwitter": null
            },
            "author": {
                "name": "Ludovic Landry",
                "website": "http://about.me/ludoviclandry",
            }
        }
  
  res.send("{ \"success\": \"" + postText(library) + "\"}");
});


// Functions
function resolveLatestPost(data) {
  let items = data.items;
  let latestItem = items[0];
  let latestItemID = latestItem.id;
  
  base(tableName).find(process.env.AIRTABLE_RECORD_ID, function(err, record) {
    if (err) { console.error(err); return; }
    
    if (record.fields.ID == latestItemID) {
      console.log('No new library detected. The last library is ' + latestItem.id);
    } else {
      base(tableName).update(process.env.AIRTABLE_RECORD_ID, { "ID": latestItemID }, function(err, record) {
        if (err) { console.error(err); return; }
        console.log('Library cached successfully: ' + latestItemID);
        syndicate(latestItem);
      });
    }
  });
}

function syndicate(library) {
  twitterClient.post('statuses/update', {status: postText(library) },  function(error, tweet, response) {
    // if(error) throw error;
    if (error) { console.error(error); return; }
    console.log('Tweet successful: https://twitter.com/swiftuidir/status/' + tweet['id_str']);
  });
}

function postText(library) {
  // let tags = library.tags.length > 0 ? " " + library.tags.map(function(e) { return '#' + e }).join(' ') : ""
  let authorTwitter = library.metadata.authorTwitter ? " by @" + library.metadata.authorTwitter : ""
  return library.title + authorTwitter + ': ' + library.content_html.replace(/\r?\n|\r/gm, "") + ' #SwiftUI\n' + library.url 
}