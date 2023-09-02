import { capitalize } from '@cc-heart/utils'
import { defineOptions } from './types'
import { DEFAULT_CONFIG_FILES } from './constant.js'
import { join } from 'path'
import { existsSync } from 'fs'
import { isESM, isTS } from './validate.js'
import { rm, writeFile } from 'fs/promises'
import * as Rollup from 'rollup'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'

const defaultConfig: defineOptions = {
  rootDirectory: '_apis',
  importPaths: '@/request',
  swaggerUrl: '',
  requestFunctionImportName: (name: string) => capitalize(name),
}

async function loadRollupPlugins(path: string) {
  const plugins = []

  if (!(await isESM(path))) {
    plugins.push(commonjs())
  }

  return plugins
}

async function transformTsToJs(filePath: string, inputOptions: Rollup.RollupOptions, outputOptions: Rollup.OutputOptions) {
  if (isTS(filePath)) {
    (inputOptions.plugins || (inputOptions.plugins = []))
    if (Array.isArray(inputOptions.plugins)) {
      inputOptions.plugins = [...inputOptions.plugins, typescript()]
    }
    const bundle = await compileBundle(inputOptions)
    const { output } = await bundle.generate(outputOptions)
    const { code } = output[0]
    const tsToJsPath = join(process.cwd(), './__config.__tsTransformJs.js')
    await writeFile(tsToJsPath, code, 'utf8')
    return tsToJsPath
  }
  return filePath
}

async function compileBundle(inputOptions: Rollup.RollupOptions) {
  return await Rollup.rollup(inputOptions)
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
    plugins: await loadRollupPlugins(resolvePath)
  }

  const outputOptions = {
    file: join(process.cwd(), './__config__.js'),
    format: 'esm' as const,
  }
  const rmPathList: string[] = []
  const bundlePath = await transformTsToJs(resolvePath, rollupConfig, outputOptions)
  if (rollupConfig.input !== bundlePath) {
    rmPathList.push(bundlePath)
  }
  rollupConfig.input = bundlePath
  const bundle = await Rollup.rollup(rollupConfig)
  await bundle.write(outputOptions)
  rmPathList.push(outputOptions.file)
  try {
    // @ts-ignore
    const { default: config } = await import(outputOptions.file)
    return {
      ...defaultConfig,
      ...config,
    }
  } catch (e) { } finally {
    rmPathList.forEach((path) => rm(path))
  }
  return defaultConfig
}

export default defaultConfig
