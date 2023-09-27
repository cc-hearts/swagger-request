import { capitalize } from '@cc-heart/utils'
import { defineOptions } from './types'
import { DEFAULT_CONFIG_FILES } from './constant.js'
// @ts-ignore
import { loadConfig } from '@cc-heart/unplugin-load-config'
const defaultConfig: defineOptions = {
  rootDirectory: '_apis',
  importPaths: '@/request',
  swaggerUrl: '',
  requestFunctionImportName: (name: string) => capitalize(name),
}

// loading config files
export async function loadingConfig(): Promise<defineOptions> {
  let config = await loadConfig({ rootPath: DEFAULT_CONFIG_FILES })
  console.log(config);
  config = config || {}
  return {
    ...defaultConfig,
    ...config
  }
}

export default defaultConfig
