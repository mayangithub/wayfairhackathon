# Wayfair Hackathon Messenger Bot -- July 8-11, 2016

A barebones Messenger Node.js app using [Express 4](http://expressjs.com/).

## Running Locally

There are local script that can be run locally right now for the hackathon project but in order to hook into a Messenger bot this must be a public endpoint.

Make sure you have [Node.js](http://nodejs.org/) and the [Heroku Toolbelt](https://toolbelt.heroku.com/) installed.

```sh
$ git clone git@github.com:heroku/node-js-getting-started.git # or clone your own fork
$ cd node-js-getting-started
$ npm install
$ npm start
```

Your app should now be running on [localhost:5000](http://localhost:5000/).

## Deploying to Heroku

```
$ heroku create
$ git push heroku master
$ heroku open
```
or

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)
