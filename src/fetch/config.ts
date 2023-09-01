import { capitalize } from '@cc-heart/utils'
import { defineOptions } from './types'
import { DEFAULT_CONFIG_FILES } from './constant.js'
import { join } from 'path'
import { existsSync } from 'fs'
import { isESM } from './validate.js'
import { rm } from 'fs/promises'
import * as Rollup from 'rollup'

const defaultConfig: defineOptions = {
  rootDirectory: '_apis',
  importPaths: '@/request',
  swaggerUrl: '',
  requestFunctionImportName: (name: string) => capitalize(name),
}

// loading config files
export async function loadingConfig(): Promise<defineOptions> {
  let resolvePath: string | undefined
  for (const fileName of DEFAULT_CONFIG_FILES) {
    const configPath = join(process.cwd(), fileName)
    if (existsSync(configPath)) {
      resolvePath = configPath
      break
    }
  }

  if (!resolvePath) {
    console.log('No configuration file found, using the default configuration')
    return defaultConfig
  }

  const rollupConfig = {
    input: resolvePath,
    plugins: isESM()
      ? []
      : (['@rollup/plugin-commonjs'] as unknown as Rollup.InputPluginOption[]),
  }

  const bundle = await Rollup.rollup(rollupConfig)

  const outputOptions = {
    file: join(process.cwd(), './__config__.js'),
    format: 'esm' as const,
  }
  await bundle.write(outputOptions)
  try {
    // @ts-ignore
    const { default: config } = await import(outputOptions.file)
    await rm(outputOptions.file)
    return {
      ...defaultConfig,
      ...config,
    }
  } catch (e) {}
  return defaultConfig
}

export default defaultConfig
