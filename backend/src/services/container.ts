import type { AppConfig } from '../config'
import { createDb, type DrizzleInstance } from '../db'
import { LogService } from './log'

export interface ServiceContainer {
  config: AppConfig
  db: DrizzleInstance
  logger: LogService
  // Will be added in later phases:
  // biliApi: BiliApiClient
  // scheduler: SchedulerService
  // notifier: NotificationService
}

export function createContainer(config: AppConfig): ServiceContainer {
  const db = createDb(config.database)
  const logger = new LogService(db)
  
  return {
    config,
    db,
    logger,
  }
}

