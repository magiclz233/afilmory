import path from 'node:path'

const webDir = path.resolve(process.cwd())

export const MANIFEST_PATH = path.join(webDir, 'src/data/photos-manifest.json')

export const MONOREPO_ROOT_PATH = path.resolve(webDir, '../../../../..')
