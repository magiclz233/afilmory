import cluster from 'node:cluster'
import { existsSync, readFileSync } from 'node:fs'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { inspect } from 'node:util'

import type { StorageConfig } from '@afilmory/builder'
import consola from 'consola'
import { merge } from 'es-toolkit'

export interface BuilderConfig {
  // 远程仓库的地址
  repo: {
    enable: boolean
    url: string
    // Git token for pushing updates back to the repository
    token?: string
  }
  // 存储配置
  storage: StorageConfig

  // 构建器选项
  options: {
    // 默认并发限制
    defaultConcurrency: number

    // 支持的图片格式（可以覆盖默认的 SUPPORTED_FORMATS）
    supportedFormats?: Set<string>

    // Live Photo 检测是否启用
    enableLivePhotoDetection: boolean

    // 是否启用进度显示
    showProgress: boolean

    // 是否在构建完成后显示详细统计
    showDetailedStats: boolean
  }

  // 日志配置
  logging: {
    // 是否启用详细日志
    verbose: boolean

    // 日志级别：'info' | 'warn' | 'error' | 'debug'
    level: 'info' | 'warn' | 'error' | 'debug'

    // 是否将日志输出到文件
    outputToFile: boolean

    // 日志文件路径（如果 outputToFile 为 true）
    logFilePath?: string
  }

  // 性能优化配置
  performance: {
    // Worker 池配置
    worker: {
      // Worker 超时时间（毫秒）
      timeout: number

      // 是否使用 cluster 模式（多进程）而不是线程池
      useClusterMode: boolean

      // 每个 worker 内部的并发数（cluster 模式下生效）
      workerConcurrency: number

      // Worker 数量
      workerCount: number
    }
  }
}

export function createBuilderConfig(env: Record<string, any>): BuilderConfig {
  const defaultBuilderConfig: BuilderConfig = {
    repo: {
      enable: false,
      url: '',
      token: env.GIT_TOKEN,
    },
    storage: {
      provider: 's3',
      bucket: env.S3_BUCKET_NAME,
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      prefix: env.S3_PREFIX,
      customDomain: env.S3_CUSTOM_DOMAIN,
      excludeRegex: env.S3_EXCLUDE_REGEX,
      maxFileLimit: 1000,
    },
    options: {
      defaultConcurrency: 10,
      enableLivePhotoDetection: true,
      showProgress: true,
      showDetailedStats: true,
    },
    logging: {
      verbose: false,
      level: 'info',
      outputToFile: false,
    },
    performance: {
      worker: {
        workerCount: os.cpus().length * 2,
        timeout: 30000,
        useClusterMode: true,
        workerConcurrency: 2,
      },
    },
  }

  const configPath = new URL('builder.config.json', import.meta.url)
  const configFilePath =
    process.platform === 'win32'
      ? fileURLToPath(configPath)
      : configPath.pathname
  const isUserConfigExist = existsSync(configFilePath)

  if (!isUserConfigExist) {
    return defaultBuilderConfig
  }

  const userConfig = JSON.parse(
    readFileSync(configFilePath, 'utf-8'),
  ) as Partial<BuilderConfig>

  return merge(defaultBuilderConfig, userConfig)
}

// For legacy direct access, create a default config without env vars
const tempEnv = new Proxy({}, { get: () => {} })
export const builderConfig = createBuilderConfig(tempEnv)

if (cluster.isPrimary && process.env.DEBUG === '1') {
  const logger = consola.withTag('CONFIG')
  logger.info('Your builder config:')
  // Note: This will log the config with undefined env variables if accessed directly
  logger.info(inspect(builderConfig, { depth: null, colors: true }))
}
