CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`uid` text NOT NULL,
	`nickname` text,
	`sessdata` text NOT NULL,
	`bili_jct` text,
	`bind_method` text NOT NULL,
	`status` text DEFAULT 'valid' NOT NULL,
	`last_failures` integer DEFAULT 0,
	`bound_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `author_metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`collected_at` integer NOT NULL,
	`follower` integer NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `media_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`asset_type` text NOT NULL,
	`local_path` text,
	`source_url` text,
	`last_refresh` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notify_channels` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`enabled` integer DEFAULT false,
	`config` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notify_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`enabled` integer DEFAULT true,
	`triggers` text NOT NULL,
	`channels` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `qrcode_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`qrcode_key` text NOT NULL,
	`qr_url` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`expire_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `system_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`ts` integer NOT NULL,
	`level` text NOT NULL,
	`source` text NOT NULL,
	`message` text NOT NULL,
	`context` text
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`target_id` text NOT NULL,
	`title` text,
	`cid` text,
	`cid_retries` integer DEFAULT 0,
	`account_id` text,
	`strategy` text NOT NULL,
	`deadline` integer NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`reason` text,
	`tags` text,
	`next_run_at` integer,
	`published_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `video_metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`collected_at` integer NOT NULL,
	`view` integer NOT NULL,
	`online` integer,
	`like` integer NOT NULL,
	`coin` integer NOT NULL,
	`favorite` integer NOT NULL,
	`share` integer NOT NULL,
	`danmaku` integer NOT NULL,
	`reply` integer,
	`completion_rate` real,
	`avg_watch_duration` real,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `qrcode_sessions_qrcode_key_unique` ON `qrcode_sessions` (`qrcode_key`);--> statement-breakpoint
CREATE INDEX `idx_qrcode_sessions_user_id` ON `qrcode_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_qrcode_sessions_expire_at` ON `qrcode_sessions` (`expire_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);