import { getPackage } from '@cc-heart/utils-service'
import { readFile } from 'fs/promises'

export async function isESM(path?: string) {
  if (path) {
    if (isCommonJsExtension(path)) return false
    const file = await readFile(path, 'utf8')
    return !file.includes('module.exports')
  }
  return getPackage().type === 'module'
}

export function getFileExtension(path: string) {
  return path.split('.').slice(-1)[0]
}

export function isTS(path: string) {
  return ['mts', 'cts', 'ts'].includes(getFileExtension(path))
}

export function isCommonJsExtension(path: string) {
  return ['cts', 'cjs'].includes(getFileExtension(path))
}