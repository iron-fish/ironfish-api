release: npx prisma migrate deploy && npx prisma generate
web: bin/start-pgbouncer node --optimize_for_size --max_old_space_size=$NODE_MAX_OLD_SPACE_SIZE build/main.js
worker: node --optimize_for_size --max_old_space_size=$NODE_MAX_OLD_SPACE_SIZE build/worker.js
