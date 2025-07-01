import { readFile } from 'fs/promises'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { createBuilderConfig } from '@afilmory/config'
import { env } from '@env'

const config = createBuilderConfig(env)

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  // 仅当使用本地文件系统存储时处理请求
  if (config.storage.provider !== 'local-fs') {
    return new NextResponse('不支持的存储提供商', { status: 400 })
  }

  try {
    // 统一基础路径的格式
    const normalizedBasePath = path.normalize(config.storage.basePath)

    // 安全地组合文件路径
    const filePath = path.join(normalizedBasePath, ...params.path)

    // 防止目录遍历攻击
    const normalizedPath = path.normalize(filePath)
    if (!normalizedPath.startsWith(normalizedBasePath)) {
      return new NextResponse('拒绝访问', { status: 403 })
    }

    // 读取文件
    const fileBuffer = await readFile(normalizedPath)

    // 根据文件扩展名确定内容类型
    const ext = path.extname(normalizedPath).toLowerCase()
    let contentType = 'application/octet-stream'

    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg'
    else if (ext === '.png') contentType = 'image/png'
    else if (ext === '.gif') contentType = 'image/gif'
    else if (ext === '.webp') contentType = 'image/webp'
    else if (ext === '.mov') contentType = 'video/quicktime'
    else if (ext === '.mp4') contentType = 'video/mp4'

    // 返回文件内容
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error) {
    console.error('文件访问错误', error)
    return new NextResponse('文件不存在', { status: 404 })
  }
}
