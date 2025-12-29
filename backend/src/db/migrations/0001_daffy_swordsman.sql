ALTER TABLE tasks ADD `author_uid` text;--> statement-breakpoint
ALTER TABLE tasks ADD `bili_account_id` text REFERENCES accounts(id);--> statement-breakpoint
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('default_account_id', 'null', strftime('%s', 'now'));--> statement-breakpoint
/*
 SQLite does not support "Creating foreign key on existing column" out of the box, we do not generate automatic migration for that, so it has to be done manually
 Please refer to: https://www.techonthenet.com/sqlite/tables/alter_table.php
                  https://www.sqlite.org/lang_altertable.html

 Due to that we don't generate migration automatically and it has to be done manually
*/