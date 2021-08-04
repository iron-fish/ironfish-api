CREATE INDEX index_users_on_graffiti ON users USING gin ("graffiti" gin_trgm_ops);
