# ironfish-api

![Build](https://github.com/iron-fish/ironfish-api/actions/workflows/ci.yml/badge.svg)

## Installing

* Make sure you're running at least node 16 - you may want to avail yourself of a tool like [nvm](https://nvm.sh)
* Run `yarn` to install dependencies
* Run `yarn docker:start` to start docker
* Run `yarn build` to build things locally
* Run `yarn db:client:generate` to generate the Prisma client
* Run `yarn db:migrate` to create a migration

## Environment

You'll need a `.env` file with the following keys:

* `API_URL`
* `BLOCK_EXPLORER_URL`
* `DATABASE_CONNECTION_POOL_URL`
* `DATABASE_URL`
* `DATADOG_URL`
* `INCENTIVIZED_TESTNET_URL`
* `INFLUXDB_API_TOKEN`
* `INFLUXDB_BUCKET`
* `INFLUXDB_URL`
* `IRONFISH_API_KEY`
* `MAGIC_SECRET_KEY`
* `NETWORK_VERSION`
* `NODE_ENV`
* `WORKER_COUNT`

You can copy `.env.template` to your own `.env` file

## Running

* Run `yarn start` to run things once you've built them with `yarn build`

## Database

* Run `yarn db:client:generate` to generate the Prisma client
* Run `yarn db:migrate` to create a migration
