import type { GeneratorList, getParams } from '@/core'
import { readFile } from 'fs/promises'
import Handlebars from 'handlebars'
import { join } from 'path'
import { TEMPLATE_PATH } from './constant.js'
import type { CompileOptions } from './types'
export type TransformConfigData = Data & { name: string; _method?: string }

type Data = GeneratorList<typeof getParams>

export async function compile(
  target: TransformConfigData & {
    __imports__: string
    paths: string
    params: string
    requestParams: string
  },
  options: CompileOptions = {}
) {
  const temp = Handlebars.compile(await readTemplate())
  const { isGeneratorImportSyntax, isExistDataParamsField } = options
  const { path, requestParams, ...rest } = target
  const callbackParams = ['`' + path + '`', requestParams]
    .filter(Boolean)
    .join(', ')

  return temp({
    ...rest,
    callbackParams,
    isGeneratorImportSyntax,
    isExistDataParamsField,
  })
}

async function readTemplate() {
  return await readFile(
    join(process.cwd(), TEMPLATE_PATH),
    'utf-8'
  )
}

export function categorizationByOperationId(target: Data[]) {
  const map = new Map<string, TransformConfigData>()

  target.forEach((item) => {
    const { operationId } = item
    const [controllerName, methodName] = operationId.split('_')

    if (!map.has(controllerName)) {
      map.set(controllerName, {} as TransformConfigData)
    }

    const controller = map.get(controllerName)!
    Reflect.set(controller, methodName, { ...item, name: methodName })
  })
  return map
}

export function compileParams(
  isExistDataParamsField: boolean,
  params: ReturnType<typeof getParams>,
  dynamicParams: string[]
) {
  const paramsList = params.reduce<string[]>((acc, cur) => {
    const index = dynamicParams.findIndex((item) => item === cur.field)
    if (index > -1) {
      dynamicParams.splice(index, 1)
    }
    acc.push(`${cur.field}${cur.require ? '' : '?'}: ${cur.type}`)
    return acc
  }, [])
  if (isExistDataParamsField) {
    paramsList.unshift('data: T')
  }
  const dynamicParamsList = dynamicParams.map((item) => `${item}: any`)
  return [...paramsList, ...dynamicParamsList].join(', ')
}

export function compileRequestParams(
  isExistDataParamsField: boolean,
  params: ReturnType<typeof getParams>,
  dynamicParams: string[]
) {
  if (params.length === 0) {
    if (isExistDataParamsField) return 'data'
    return ''
  }
  let paramsList = params.reduce<string[]>((acc, cur) => {
    if (dynamicParams.includes(cur.field)) return acc
    acc.push(cur.field)
    return acc
  }, [])
  if (isExistDataParamsField) {
    paramsList.unshift('...data')
  }
  if (paramsList.length === 0) return ''
  return `{ ${paramsList.join(', ')} }`
}
