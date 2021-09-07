module.exports = {
  scripts: {
    fresh: `nps clean build db.migrate test lint`,
    build: 'tsc -b',
    clean: 'rm -rf ./build',
    db: {
      init: 'nps db.create db.migrate',
      create: 'prisma generate',
      migrate: 'prisma migrate dev',
    },
    docker: {
      start: 'docker-compose up -d',
      stop: 'docker-compose down',
    },
    lint: {
      script: 'eslint .',
      fix: 'eslint . --fix',
    },
    start: {
      script: 'node build/main.js',
      worker: 'node build/worker.js',
    },
    test: {
      script: 'jest --runInBand',
      coverage: 'nps "test --coverage"',
    },
  },
};
