ALTER TABLE events ADD COLUMN user_id INTEGER NOT NULL;

CREATE INDEX index_events_on_user_id ON events(user_id);

ALTER TABLE ONLY events ADD CONSTRAINT "FK__events__user_id" FOREIGN KEY (user_id) REFERENCES users(id);
