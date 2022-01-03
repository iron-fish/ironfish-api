release: npx prisma migrate deploy && npx prisma generate
web: cd build && node --async-stack-traces --optimize_for_size --max_old_space_size=$NODE_MAX_OLD_SPACE_SIZE main.js
worker: cd build && node --async-stack-traces --optimize_for_size --max_old_space_size=$NODE_MAX_OLD_SPACE_SIZE worker.js
