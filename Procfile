release: npx prisma db execute --url $DATABASE_URL --file ./prisma/scripts/drop_retool.sql && npx prisma migrate deploy && npx prisma generate && npx prisma db execute --url $DATABASE_URL --file ./prisma/scripts/create_retool.sql
web: cd build && node --async-stack-traces --optimize_for_size --max_old_space_size=$NODE_MAX_OLD_SPACE_SIZE main.js
worker: cd build && node --async-stack-traces --optimize_for_size --max_old_space_size=$NODE_MAX_OLD_SPACE_SIZE worker.js
