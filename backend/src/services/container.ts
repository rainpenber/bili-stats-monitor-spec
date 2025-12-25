import type { AppConfig } from '../config'
import { createDb, type DrizzleInstance } from '../db'
import { LogService } from './log'
import { AccountService } from './account'
import { SchedulerService } from './scheduler'

export interface ServiceContainer {
  config: AppConfig
  db: DrizzleInstance
  logger: LogService
  accountService: AccountService
  scheduler: SchedulerService
  // Will be added in later phases:
  // biliApi: BiliApiClient
  // notifier: NotificationService
}

export function createContainer(config: AppConfig): ServiceContainer {
  const db = createDb(config.database)
  const logger = new LogService(db)
  const accountService = new AccountService(db, config.encryptKey)
  const scheduler = new SchedulerService(db, accountService)
  
  return {
    config,
    db,
    logger,
    accountService,
    scheduler,
  }
}

