# ironfish-api

![Build](https://github.com/iron-fish/ironfish-api/actions/workflows/ci.yml/badge.svg)

## Installing

* Make sure you're running at least node 16 - you may want to avail yourself of a tool like [nvm](https://nvm.sh)
* Run `yarn` to install dependencies
* We're using `nps` for scripts, you can optionally install it with `yarn global add nps` or `npm i -g nps` and then it will be available with `nps`
* Run `nps docker.start` to start docker
* Run `nps build` to build things locally
* Run `nps db.init` to initialize the database

## Environment

You'll need a `.env` file with the following keys:

* `API_URL`
* `BLOCK_EXPLORER_URL`
* `DATABASE_URL`
* `INCENTIVIZED_TESTNET_URL`
* `IRONFISH_API_KEY`
* `MAGIC_SECRET_KEY`
* `NETWORK_VERSION`
* `NODE_ENV`
* `POSTMARK_API_KEY`

You can copy `.env.template` to your own `.env` file

## Running

* Run `nps start` to run things once you've built them with `nps build`

## Database

* Run `nps db.init` to initialize your database
* Run `nps db.migrate` to apply migrations

## Update

* Run `nps fresh` to clean existing builds, apply migrations, run tests and lint
