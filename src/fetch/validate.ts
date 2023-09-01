import { getPackage } from '@cc-heart/utils-service'
export function isESM() {
  return getPackage().type === 'module'
}
