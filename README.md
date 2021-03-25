# RSS Syndicator

Provides a REST API to syndicate a set of predefined RSS feeds to Twitter and Mastodon.

## Docker Deployment

With Docker installed, run:

```bash
$ docker-compose up --build -d
```

## Dry Runs

If you want to test a given endpoint, append `?test=true` to its URL. Example with HTTPie:

```sh
$ http post "http://localhost:7080/widegamut?test=true"
```
