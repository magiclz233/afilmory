import fs from 'node:fs/promises'
import path from 'node:path'
import { existsSync } from 'node:fs'

import { SUPPORTED_FORMATS } from '../../constants/index.js'
import { logger } from '../../logger/index.js'
import type {
  LocalFSConfig,
  StorageObject,
  StorageProvider,
} from '../interfaces'

export class LocalFSStorageProvider implements StorageProvider {
  private config: LocalFSConfig

  constructor(config: LocalFSConfig) {
    this.config = config

    // 确保基础路径存在
    if (!existsSync(this.config.basePath)) {
      throw new Error(`指定的本地文件夹路径不存在: ${this.config.basePath}`)
    }
  }

  async getFile(key: string): Promise<Buffer | null> {
    try {
      const filePath = this.getFullPath(key)
      logger.s3.info(`读取本地文件：${filePath}`)
      const startTime = Date.now()

      const buffer = await fs.readFile(filePath)

      const duration = Date.now() - startTime
      const sizeKB = Math.round(buffer.length / 1024)
      logger.s3.success(`文件读取完成：${key} (${sizeKB}KB, ${duration}ms)`)

      return buffer
    } catch (error) {
      logger.s3.error(`文件读取失败：${key}`, error)
      return null
    }
  }

  async listImages(): Promise<StorageObject[]> {
    const allFiles = await this.listAllFiles()
    const excludeRegex = this.config.excludeRegex
      ? new RegExp(this.config.excludeRegex)
      : null

    // 过滤出图片文件
    return allFiles.filter((file) => {
      if (excludeRegex && excludeRegex.test(file.key)) return false

      const ext = path.extname(file.key).toLowerCase()
      return SUPPORTED_FORMATS.has(ext)
    })
  }

  async listAllFiles(): Promise<StorageObject[]> {
    const basePath = this.config.basePath
    const prefix = this.config.prefix || ''
    const result: StorageObject[] = []

    // 递归函数来遍历目录
    const scanDir = async (dirPath: string, relativePath: string) => {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)
        const entryRelativePath = path.join(relativePath, entry.name)

        if (entry.isDirectory()) {
          // 递归扫描子目录
          await scanDir(fullPath, entryRelativePath)
        } else {
          // 获取文件状态信息
          const stats = await fs.stat(fullPath)

          // 创建存储对象
          const storageObject: StorageObject = {
            key: entryRelativePath.replace(/\\/g, '/'), // 确保使用正斜杠作为路径分隔符
            size: stats.size,
            lastModified: stats.mtime,
            etag: `"${stats.size}-${stats.mtimeMs}"`, // 创建一个基于大小和修改时间的简单etag
          }

          result.push(storageObject)
        }
      }
    }

    // 从基础路径开始扫描
    const startPath = prefix ? path.join(basePath, prefix) : basePath
    const startRelativePath = prefix || ''

    await scanDir(startPath, startRelativePath)

    return result
  }

  generatePublicUrl(key: string): string {
    // 使用自定义域名或通过本地服务器提供文件访问
    if (this.config.customDomain) {
      const customDomain = this.config.customDomain.replace(/\/$/, '')
      return `${customDomain}/${key}`
    }

    // 如果没有自定义域名，使用相对路径
    return `/api/files/${key}`
  }

  detectLivePhotos(allObjects: StorageObject[]): Map<string, StorageObject> {
    const livePhotoMap = new Map<string, StorageObject>()

    // 按目录和基础文件名分组所有文件
    const fileGroups = new Map<string, StorageObject[]>()

    for (const obj of allObjects) {
      if (!obj.key) continue

      const dir = path.dirname(obj.key)
      const basename = path.basename(obj.key, path.extname(obj.key))
      const groupKey = `${dir}/${basename}`

      if (!fileGroups.has(groupKey)) {
        fileGroups.set(groupKey, [])
      }
      fileGroups.get(groupKey)!.push(obj)
    }

    // 在每个分组中寻找图片 + 视频配对
    for (const files of fileGroups.values()) {
      let imageFile: StorageObject | null = null
      let videoFile: StorageObject | null = null

      for (const file of files) {
        if (!file.key) continue

        const ext = path.extname(file.key).toLowerCase()

        // 检查是否为支持的图片格式
        if (SUPPORTED_FORMATS.has(ext)) {
          imageFile = file
        }
        // 检查是否为 .mov 视频文件
        else if (ext === '.mov') {
          videoFile = file
        }
      }

      // 如果找到配对，记录为 live photo
      if (imageFile && videoFile && imageFile.key) {
        livePhotoMap.set(imageFile.key, videoFile)
      }
    }

    return livePhotoMap
  }

  // 辅助方法：获取文件的完整路径
  private getFullPath(key: string): string {
    return path.join(this.config.basePath, key)
  }
}
