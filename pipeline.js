import Airtable from 'airtable';
import Twitter from 'twitter';
import Masto from 'mastodon';

export default class Pipeline {
  constructor(keyword, tweet, toot, test) {
    this.keyword = keyword
    this.tweet = tweet
    this.toot = toot
    this.feedURL = process.env[`${keyword}_FEED_URL`]
    this.test = test

    this.twitterConfig = new TwitterConfig(
      process.env[`${keyword}_TWITTER_CONSUMER_KEY`],
      process.env[`${keyword}_TWITTER_CONSUMER_SECRET`],
      process.env[`${keyword}_TWITTER_ACCESS_TOKEN_KEY`],
      process.env[`${keyword}_TWITTER_ACCESS_TOKEN_SECRET`],
      process.env[`${keyword}_TWITTER_USERNAME`]
    )

    this.airtableConfig = new AirtableConfig(
      'Latest',
      process.env[`${keyword}_AIRTABLE_BASE_ID`],
      process.env[`${keyword}_AIRTABLE_RECORD_ID`]
    )

    if (toot) {
      this.mastoToken = process.env[`${keyword}_MASTO_ACCESS_TOKEN`]

      this.masto = new Masto({
        access_token: this.mastoToken,
        timeout_ms: 60 * 1000,
        api_url: "https://mastodon.social/api/v1/"
      });
    }

    this.airtable = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY,
    })
    .base(this.airtableConfig.baseID)

    this.twitter = new Twitter({
      consumer_key: this.twitterConfig.consumerKey,
      consumer_secret: this.twitterConfig.consumerSecret,
      access_token_key: this.twitterConfig.accessTokenKey,
      access_token_secret: this.twitterConfig.accessTokenSecret
    })
  }
}

class AirtableConfig {
  constructor(
    tableName,
    baseID,
    recordID
  ) {
    this.tableName = tableName
    this.baseID = baseID
    this.recordID = recordID
  }
}

class TwitterConfig {
  constructor(
    consumerKey,
    consumerSecret,
    accessTokenKey,
    accessTokenSecret,
    username
  ) {
    this.consumerKey = consumerKey
    this.consumerSecret = consumerSecret
    this.accessTokenKey = accessTokenKey
    this.accessTokenSecret = accessTokenSecret
    this.username = username
  }
}
