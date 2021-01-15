import Pipeline from './pipeline.js';
import Express from 'express';
import BodyParser from 'body-parser';
import Dotenv from 'dotenv';
import axios from 'axios';
import util from 'util';

Dotenv.config()

const app = Express();

app.use(BodyParser.urlencoded({ extended: false }));
app.use(BodyParser.json());

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

let listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});

app.post('/', function(req, res) {
  res.send("{ 'message': 'Use /widegamut or /swiftuidir routes.' }");
});

app.post('/widegamut', function(req, res) {
  var pipeline = new Pipeline('WIDEGAMUT', true, true, req.query.test)
  processRequest(pipeline, req, res)
});

app.post('/swiftuidir', function(req, res) {
  var pipeline = new Pipeline('SWIFTUIDIR', true, false, req.query.test)
  processRequest(pipeline, req, res)
});

let processRequest = async (pipeline, req, res) => {
  console.log("Requested at: " + new Date())
  console.log(req.headers)

  axios.get(pipeline.feedURL)
    .then(response => verifyItem(response.data, pipeline))
    .then(item => syndicateItem(item, pipeline))
    .then(item => cacheItem(item, pipeline))
    .then(item => { 
      console.log(`Successfully syndicated ${item.id}`)
      res.send({ success: item.id }) 
    })
    .catch(error => {
      console.log(`An error occured. ${error}`)

      if (error.includes("Error 7002")) {
        res.status(200).send("No new posts to syndicate.")
      } else {
        res.status(500).send({ error: error })
      }
    })
}

let verifyItem = async (data, pipeline) => {
  let items = data.items;
  let latestItem = items[0];

  const record = await pipeline.airtable(pipeline.airtableConfig.tableName)
  .find(pipeline.airtableConfig.recordID)
  
  if (record.fields.ID == latestItem.id) {
    throw `Error 7002. No new content since ${latestItem.id}`
  } else {
    return latestItem
  }
}

let syndicateItem = async (item, pipeline) => {
  let postBody = pipeline.keyword == 'WIDEGAMUT' ? widegamut(item) : swiftUIDir(item)

  if (pipeline.test) {
    console.log("\nPost body: " + postBody + "\n")
    return item
  }

  if (pipeline.toot) {
    await pipeline.masto.post("statuses", { status: postBody })
  }

  if (item.image !== undefined && item.image != "") {
   console.log("Downloading image: " + item.image + "...")
   await axios.get(item.image, { responseType: 'arraybuffer' })
    .then(response => pipeline.twitter.post("media/upload", { media: response.data}))
    .then(media => pipeline.twitter.post("statuses/update", { status: postBody, media_ids: media.media_id_string }))
    .catch(error => {
      console.log(`An image upload error occured. ${error}`)
    })
  } else {
    await pipeline.twitter.post("statuses/update", { status: postBody })
  }

  return item
}

let cacheItem = async (item, pipeline) => {
  if (pipeline.test) { return item }

  await pipeline.airtable(pipeline.airtableConfig.tableName)
    .update(pipeline.airtableConfig.recordID, { ID: item.id })

  return item
}

function widegamut(post) {
  let text;

  if (post.title !== undefined && post.title != "") {
    text = `"${post.excerpt}"[...]`;
  } else if (post.excerpt !== undefined && post.excerpt != "") {
    text = `${post.excerpt}[...]`;
  } else {
    text = "New micro-post 👇[...]";
  }

  return text.replace("[...]", "\n" + post.id)
}

function swiftUIDir(library) {
  let authorTwitter = library.metadata.authorTwitter ? 
  ' by @' + 
  library.metadata.authorTwitter : '';

  return `${library.title}
  ${authorTwitter}: ${library.content_html.replace(/\r?\n|\r/gm, '')} #SwiftUI\n
  ${library.url}`
}
