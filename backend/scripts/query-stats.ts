#!/usr/bin/env bun
/**
 * 数据库统计查询工具
 * 用于查看和分析导入的历史数据
 */

import { Database } from 'bun:sqlite'
import { parseArgs } from 'util'

interface CLIOptions {
  video?: string
  author?: string
  task?: string
  summary?: boolean
  top?: number
  help?: boolean
}

function parseCLIArgs(): CLIOptions {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      video: { type: 'string', short: 'v' },
      author: { type: 'string', short: 'a' },
      task: { type: 'string', short: 't' },
      summary: { type: 'boolean', short: 's' },
      top: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: false,
  })

  return {
    video: values.video as string | undefined,
    author: values.author as string | undefined,
    task: values.task as string | undefined,
    summary: values.summary || false,
    top: values.top ? parseInt(values.top as string) : undefined,
    help: values.help || false,
  }
}

function showHelp() {
  console.log(`
数据库统计查询工具

用法:
  bun run backend/scripts/query-stats.ts [OPTIONS]

选项:
  -s, --summary              显示数据库总体统计
  -v, --video <BVID>        查询指定视频的指标数据
  -a, --author <UID>        查询指定UP主的粉丝数据
  -t, --task <TASK_ID>      查询指定任务的详细信息
  --top <N>                 显示TOP N的视频/UP主（需配合 --summary）
  -h, --help                显示帮助信息

示例:
  # 显示总体统计
  bun run backend/scripts/query-stats.ts --summary

  # 查询视频数据
  bun run backend/scripts/query-stats.ts --video BV1xx411c7m4

  # 查询UP主数据
  bun run backend/scripts/query-stats.ts --author 123456

  # 显示TOP 10视频
  bun run backend/scripts/query-stats.ts --summary --top 10
`)
}

async function showSummary(db: Database, top?: number) {
  console.log('\n📊 数据库总体统计')
  console.log('='.repeat(60))

  // 任务统计
  const taskStats = db.query(`
    SELECT 
      type,
      status,
      COUNT(*) as count
    FROM tasks
    GROUP BY type, status
  `).all() as any[]

  console.log('\n📋 任务统计:')
  console.table(taskStats)

  // 视频指标统计
  const videoStats = db.query(`
    SELECT 
      COUNT(*) as total_records,
      COUNT(DISTINCT task_id) as unique_videos,
      MIN(collected_at) as earliest_record,
      MAX(collected_at) as latest_record
    FROM video_metrics
  `).get() as any

  console.log('\n🎬 视频指标统计:')
  console.log(`  总记录数: ${videoStats.total_records.toLocaleString()}`)
  console.log(`  视频数量: ${videoStats.unique_videos}`)
  console.log(`  最早记录: ${new Date(videoStats.earliest_record * 1000).toLocaleString()}`)
  console.log(`  最新记录: ${new Date(videoStats.latest_record * 1000).toLocaleString()}`)

  // UP主指标统计
  const authorStats = db.query(`
    SELECT 
      COUNT(*) as total_records,
      COUNT(DISTINCT task_id) as unique_authors,
      MIN(collected_at) as earliest_record,
      MAX(collected_at) as latest_record
    FROM author_metrics
  `).get() as any

  console.log('\n👤 UP主指标统计:')
  console.log(`  总记录数: ${authorStats.total_records.toLocaleString()}`)
  console.log(`  UP主数量: ${authorStats.unique_authors}`)
  console.log(`  最早记录: ${new Date(authorStats.earliest_record * 1000).toLocaleString()}`)
  console.log(`  最新记录: ${new Date(authorStats.latest_record * 1000).toLocaleString()}`)

  // TOP视频（如果指定了top参数）
  if (top && top > 0) {
    const topVideos = db.query(`
      SELECT 
        t.target_id as bvid,
        t.title,
        COUNT(vm.id) as record_count,
        MAX(vm.view) as max_views,
        MAX(vm.like) as max_likes
      FROM tasks t
      LEFT JOIN video_metrics vm ON t.id = vm.task_id
      WHERE t.type = 'video'
      GROUP BY t.id
      ORDER BY record_count DESC
      LIMIT ${top}
    `).all()

    console.log(`\n🏆 TOP ${top} 视频 (按记录数):`)
    console.table(topVideos)

    const topAuthors = db.query(`
      SELECT 
        t.target_id as uid,
        t.title,
        COUNT(am.id) as record_count,
        MAX(am.follower) as max_followers
      FROM tasks t
      LEFT JOIN author_metrics am ON t.id = am.task_id
      WHERE t.type = 'author'
      GROUP BY t.id
      ORDER BY record_count DESC
      LIMIT ${top}
    `).all()

    console.log(`\n🏆 TOP ${top} UP主 (按记录数):`)
    console.table(topAuthors)
  }
}

async function queryVideo(db: Database, bvid: string) {
  console.log(`\n🎬 视频数据: ${bvid}`)
  console.log('='.repeat(60))

  // 查找任务
  const task = db.query(`
    SELECT * FROM tasks 
    WHERE target_id = ? AND type = 'video'
  `).get(bvid) as any

  if (!task) {
    console.log('❌ 未找到该视频的监控任务')
    return
  }

  console.log('\n📋 任务信息:')
  console.log(`  任务ID: ${task.id}`)
  console.log(`  标题: ${task.title}`)
  console.log(`  状态: ${task.status}`)
  console.log(`  创建时间: ${new Date(task.created_at * 1000).toLocaleString()}`)

  // 查询指标数据
  const metrics = db.query(`
    SELECT 
      COUNT(*) as record_count,
      MIN(view) as min_view,
      MAX(view) as max_view,
      MAX(view) - MIN(view) as view_growth,
      MAX(like) as max_like,
      MAX(coin) as max_coin,
      MAX(favorite) as max_favorite,
      MIN(collected_at) as first_record,
      MAX(collected_at) as last_record
    FROM video_metrics
    WHERE task_id = ?
  `).get(task.id) as any

  console.log('\n📊 指标统计:')
  console.log(`  记录数量: ${metrics.record_count.toLocaleString()}`)
  console.log(`  播放量: ${metrics.min_view.toLocaleString()} → ${metrics.max_view.toLocaleString()} (增长 ${metrics.view_growth.toLocaleString()})`)
  console.log(`  最高点赞: ${metrics.max_like.toLocaleString()}`)
  console.log(`  最高投币: ${metrics.max_coin.toLocaleString()}`)
  console.log(`  最高收藏: ${metrics.max_favorite.toLocaleString()}`)
  console.log(`  监控时间: ${new Date(metrics.first_record * 1000).toLocaleString()} - ${new Date(metrics.last_record * 1000).toLocaleString()}`)

  // 最近10条记录
  const recentRecords = db.query(`
    SELECT view, like, coin, favorite, share, danmaku, online, collected_at
    FROM video_metrics
    WHERE task_id = ?
    ORDER BY collected_at DESC
    LIMIT 10
  `).all(task.id)

  console.log('\n📝 最近10条记录:')
  console.table(recentRecords)
}

async function queryAuthor(db: Database, uid: string) {
  console.log(`\n👤 UP主数据: ${uid}`)
  console.log('='.repeat(60))

  // 查找任务
  const task = db.query(`
    SELECT * FROM tasks 
    WHERE target_id = ? AND type = 'author'
  `).get(uid) as any

  if (!task) {
    console.log('❌ 未找到该UP主的监控任务')
    return
  }

  console.log('\n📋 任务信息:')
  console.log(`  任务ID: ${task.id}`)
  console.log(`  标题: ${task.title}`)
  console.log(`  状态: ${task.status}`)
  console.log(`  创建时间: ${new Date(task.created_at * 1000).toLocaleString()}`)

  // 查询指标数据
  const metrics = db.query(`
    SELECT 
      COUNT(*) as record_count,
      MIN(follower) as min_follower,
      MAX(follower) as max_follower,
      MAX(follower) - MIN(follower) as follower_growth,
      MIN(collected_at) as first_record,
      MAX(collected_at) as last_record
    FROM author_metrics
    WHERE task_id = ?
  `).get(task.id) as any

  console.log('\n📊 粉丝统计:')
  console.log(`  记录数量: ${metrics.record_count.toLocaleString()}`)
  console.log(`  粉丝数: ${metrics.min_follower.toLocaleString()} → ${metrics.max_follower.toLocaleString()} (增长 ${metrics.follower_growth.toLocaleString()})`)
  console.log(`  监控时间: ${new Date(metrics.first_record * 1000).toLocaleString()} - ${new Date(metrics.last_record * 1000).toLocaleString()}`)

  // 最近10条记录
  const recentRecords = db.query(`
    SELECT follower, collected_at
    FROM author_metrics
    WHERE task_id = ?
    ORDER BY collected_at DESC
    LIMIT 10
  `).all(task.id)

  console.log('\n📝 最近10条记录:')
  console.table(recentRecords)
}

async function queryTask(db: Database, taskId: string) {
  console.log(`\n📋 任务详情: ${taskId}`)
  console.log('='.repeat(60))

  const task = db.query(`SELECT * FROM tasks WHERE id = ?`).get(taskId) as any

  if (!task) {
    console.log('❌ 未找到该任务')
    return
  }

  console.log('\n任务信息:')
  console.table([task])

  if (task.type === 'video') {
    await queryVideo(db, task.target_id)
  } else if (task.type === 'author') {
    await queryAuthor(db, task.target_id)
  }
}

async function main() {
  const options = parseCLIArgs()

  if (options.help || Object.keys(options).length === 1) {
    showHelp()
    process.exit(0)
  }

  const db = new Database('./data/app.db', { readonly: true })

  try {
    if (options.summary) {
      await showSummary(db, options.top)
    } else if (options.video) {
      await queryVideo(db, options.video)
    } else if (options.author) {
      await queryAuthor(db, options.author)
    } else if (options.task) {
      await queryTask(db, options.task)
    } else {
      showHelp()
    }
  } finally {
    db.close()
  }
}

main().catch(console.error)


