import Pipeline from './pipeline.js';
import Express from 'express';
import Dotenv from 'dotenv';
import axios from 'axios';

Dotenv.config()

const app = Express();

app.use(Express.urlencoded({extended: true}));
app.use(Express.json());

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
  var pipeline = new Pipeline('WIDEGAMUT', false, true, req.query.test)
  processRequest(pipeline, req, res)
});

app.post('/swiftuidir', function(req, res) {
  var pipeline = new Pipeline('SWIFTUIDIR', true, false, req.query.test)
  processRequest(pipeline, req, res)
});

app.post('/unredacted', function(req, res) {
  var pipeline = new Pipeline('UNREDACTED', true, false, req.query.test)
  processRequest(pipeline, req, res)
})

let processRequest = async (pipeline, req, res) => {
  console.log("Requested at: " + new Date())
  console.log(req.headers)
 
  if (pipeline.test) {
    axios.get(pipeline.feedURL)
    .then(response => {
      let item = response.data.items[2]
      var postBody

      switch (pipeline.keyword) {
        case 'WIDEGAMUT':
          postBody = widegamut(item)
          break
        case 'UNREDACTED':
          postBody = unredacted(item)
          break
        case 'SWIFTUIDIR':
          postBody = swiftUIDir(item)
          break
      }
      
      res.send({ dry: postBody }) 
    })

    return
  } 

  axios.get(pipeline.feedURL)
    .then(response => verifyItem(response.data, pipeline))
    .then(item => syndicateItem(item, pipeline))
    .then(item => cacheItem(item, pipeline))
    .then(item => { 
      console.log(`Successfully syndicated ${item.id}`)
      res.send({ success: item.id }) 
    })
    .catch(error => {
      console.error(error)
      res.status(200).send({ error: error })
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
  var postBody

  switch (pipeline.keyword) {
    case 'WIDEGAMUT':
      postBody = widegamut(item)
      break
    case 'UNREDACTED':
      postBody = unredacted(item)
      break
    case 'SWIFTUIDIR':
      postBody = swiftUIDir(item)
      break
  }

  if (pipeline.test) {
    console.log("\nPost body: " + postBody + "\n")
    return item
  }

  if (pipeline.toot) {
    await pipeline.masto.post("statuses", { status: postBody })
  }

  if (pipeline.tweet) {
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
       .catch(error => {
         console.log("❗️ Twitter Error ❗️")
         console.error(error)
         throw 'Something went wrong posting to Twitter'
       })
     }
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
    text = post.title + "\n" + post.id;
  } else {
    text = post.excerpt + "\n\n" + post.id;
  }

  return text
}

function unredacted(post) {
  return "New blog post: " + post.title + "\n" + post.url;
}

function swiftUIDir(library) {
  let authorTwitter = library.metadata.authorTwitter ? 
  ' by @' + 
  library.metadata.authorTwitter : '';

  return `${library.title}
  ${authorTwitter}: ${library.content_html.replace(/\r?\n|\r/gm, '')} #SwiftUI\n
  ${library.url}`
}
