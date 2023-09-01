import { generator, getDynamicParams, type SwaggerApi } from '../core/index.js'
import {
  categorizationByOperationId,
  compile,
  compileParams,
  compileRequestParams,
  type TransformConfigData,
} from './compile.js'
import { hasOwn } from '@cc-heart/utils'
import { join } from 'path'
import { access, constants, mkdir, writeFile } from 'fs/promises'
import { loadingConfig } from './config.js'
import { request } from './request.js'
import { defineOptions } from './types.js'
type Files = Record<string, Record<string, string>>

export async function generateCodeFromSwagger(
  swagger: SwaggerApi,
  config: defineOptions
) {
  const api = generator(swagger)
  const swaggerMetaMap = categorizationByOperationId(api)
  const files = {} as Files
  const executing = []
  const { importPaths } = config

  for (const [fileName, swaggerMeta] of swaggerMetaMap) {
    if (!hasOwn(files, fileName)) {
      files[fileName] = {}
    }

    const isExistTransformFunctionImportName =
      !!config.requestFunctionImportName
    let __imports__: string = [
      ...Object.values(swaggerMeta).reduce((acc, cur: TransformConfigData) => {
        if (isExistTransformFunctionImportName) {
          cur._method =
            config.requestFunctionImportName!(cur.method) || cur.method
        }

        acc.add(cur._method)
        return acc
      }, new Set<string>()),
    ].join(',')

    const target = files[fileName]
    const result = Object.keys(swaggerMeta).map(async (methodName, index) => {
      const _data = Reflect.get(swaggerMeta, methodName)

      let isExistDataParamsField = false
      if (['post', 'put', 'patch'].includes(_data.method)) {
        isExistDataParamsField = true
      }
      const dynamicParams = getDynamicParams(_data.path)
      const params = compileParams(isExistDataParamsField, _data.params, [
        ...dynamicParams,
      ])
      const requestParams = compileRequestParams(
        isExistDataParamsField,
        _data.params,
        [...dynamicParams]
      )
      target[methodName] = await compile(
        {
          ..._data,
          __imports__,
          paths: importPaths,
          method: _data._method,
          params,
          requestParams,
        },
        {
          isGeneratorImportSyntax: index === 0,
          isExistDataParamsField,
        }
      )
    })

    executing.push(Promise.all(result))
  }
  await Promise.all(executing)
  return files
}

async function validateExistDirectory(path: string) {
  try {
    await access(path, constants.F_OK)
    return true
  } catch (e) {
    return false
  }
}

async function generatorFiles(files: Files, rootDirectory: string) {
  const _join = (path?: string) => {
    if (!path) return join(process.cwd(), rootDirectory)
    return join(process.cwd(), `${rootDirectory}/${path}.ts`)
  }

  if (!(await validateExistDirectory(_join()))) {
    await mkdir(_join())
  }

  const flag = Object.keys(files).map(async (fileName) => {
    const paths = _join(fileName)
    const fileValue = Object.values(files[fileName]).join('\n')
    await writeFile(paths, fileValue)
  })

  await Promise.all(flag)
}

export async function composition() {
  const config = await loadingConfig()
  const { swaggerUrl, rootDirectory } = config
  if (!swaggerUrl) {
    throw new Error('swaggerUrl is required')
  }
  const swaggerApi = await request<SwaggerApi>(swaggerUrl)
  const files = await generateCodeFromSwagger(swaggerApi, config)
  await generatorFiles(files, rootDirectory)
}
