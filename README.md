# ironfish-api

![Build](https://github.com/iron-fish/ironfish-api/actions/workflows/ci.yml/badge.svg)

## Installing

- Make sure you're running at least Node 20 - you may want to avail yourself of a tool like [nvm](https://nvm.sh)
- Run `yarn` to install dependencies
- Run `yarn docker:start` to start docker
- Run `yarn build` to build things locally
- Run `yarn db:client:generate` to generate the Prisma client
- Run `yarn db:migrate` to execute migrations and optionally create a migration if you have made schema changes
- (Optional) Run `yarn db:seed:testing` to load some sample data into the database

## Environment

You'll need a `.env` file including keys listed in `env.template`. We recommend copying `.env.template` to your own `.env` file.

## Running

- Run `yarn start:dev` to run the app with hot reload
- If you prefer to run without hot reload, run `yarn build` to build the app and then `yarn start` to run it

## Database

- Run `yarn db:client:generate` to generate the Prisma client
- Run `yarn db:migrate` to create a migration
