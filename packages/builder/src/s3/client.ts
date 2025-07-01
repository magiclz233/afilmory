import type { S3ClientConfig } from '@aws-sdk/client-s3'
import { S3Client } from '@aws-sdk/client-s3'
import { builderConfig } from '@builder'

// 创建 S3 客户端
function createS3Client(): S3Client | null {
  const storageConfig = builderConfig.storage

  // 如果不是S3存储提供商，返回null
  if (storageConfig.provider !== 's3') {
    return null
  }

  const { accessKeyId, secretAccessKey, endpoint, region } = storageConfig
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('accessKeyId and secretAccessKey are required')
  }

  const s3ClientConfig: S3ClientConfig = {
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    // from https://github.com/aws/aws-sdk-js-v3/issues/6810
    // some non AWS services like backblaze or cloudflare don't expect the new headers
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    endpoint,
  }

  return new S3Client(s3ClientConfig)
}

// 导出S3客户端或null（对于非S3存储提供商）
export const s3Client = createS3Client()
