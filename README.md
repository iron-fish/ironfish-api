# ironfish-api

## Installing

* Make sure you're running at least node 14 - you may want to avail yourself of a tool like [nvm](https://nvm.sh)
* Run `yarn` to install dependencies
* Run `yarn docker:start` to start docker
* Run `yarn build` to build things locally

## Environment

You'll need a `.env` file with the following keys:

* `DATABASE_URL`
* `IRONFISH_API_KEY`
* `NETWORK_VERSION`

## Running

* Run `yarn start` to run things once you've built them with `yarn build`
