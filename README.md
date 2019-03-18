# Bloomberg Scraper

This app grabs articles from Bloomberg and posts them on to an API. You will need a Bloomberg account to use it.

It doesn't stay resident, so I suggest putting it into a cron. It can take a while to go through all the articles, so I suggest a cron time of around 5 mins to be safe.

## Installing

`npm i`

## Setup

Create a `.env` file with the following in it:

```
TOKEN=<Your Bloomberg token>
URL=https://api.bloomberg.com/syndication/stage/portal/adapter/v1/api/v1/articles?&size=30
ARTICLE_URL=https://api.bloomberg.com/syndication/stage/portal/adapter/v1/api/v1/articles/
API_USERNAME=<your RESTful API username>
API_PASSWORD=<your RESTful API password>
API_ENDPOINT=<url to the API's endpoint to store the articles>
PROVIDER=Bloomberg
```

## Running

`npm start`
