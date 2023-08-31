import { hasOwn } from '@cc-heart/utils'
import { urlToRequestPath } from './utils.js'
import type {
  IComponents,
  IPath,
  SwaggerApi,
  methods,
  GeneratorList,
  ApiMeta,
} from './types'

export function getSchemas(components: IComponents) {
  const { schemas } = components
  const container = {}

  Object.keys(schemas).forEach((key) => {
    Reflect.set(container, key, {})
    const fieldsValue = Reflect.get(container, key)
    const dtoTarget = Reflect.get(schemas, key)
    const { properties = {}, required = [] } = dtoTarget

    Object.keys(properties).forEach((property) => {
      const description = Reflect.get(properties, property)
      Reflect.set(fieldsValue, property, {
        type: description.type,
        required: required.includes(property),
      })
    })
  })
  return container
}

// get ref dto name list
export function getRefDtoNames(pathVal: IPath): string[] {
  const contentType = pathVal?.requestBody?.content
  if (!contentType) return []
  return Object.keys(contentType).reduce<string[]>((acc, key) => {
    if (key === 'application/json') {
      const { schema } = Reflect.get(contentType, key)
      const { $ref } = schema
      const [dtoName] = $ref.split('/').slice(-1)
      acc.push(dtoName)
    }
    return acc
  }, [])
}

export function getParams(pathVal: IPath) {
  const { parameters = [] } = pathVal
  return parameters.map((param) => {
    return {
      field: param.name,
      require: param.required,
      type: param.schema.type,
    }
  })
}

export function parsePaths(paths: SwaggerApi['paths']) {
  const pathsMap = new Map<string, methods<ApiMeta>>()

  Object.keys(paths).forEach((path) => {
    const val = {} as methods<ApiMeta>
    pathsMap.set(path, val)
    const pathVal = Reflect.get(paths, path)

    Object.keys(pathVal).forEach((method) => {
      const target = Reflect.get(pathVal, method) as IPath
      Reflect.set(val, method, {
        // request trait names
        operationId: target.operationId,
        trait: getRefDtoNames(target),
        params: getParams(target),
        interface: {},
      })
    })
  })
  return pathsMap
}

export function parseSwagger(api: SwaggerApi) {
  const { components, paths } = api
  const schemas = getSchemas(components)
  const apis = parsePaths(paths)
  const resultApis = new Map<string, methods<ApiMeta>>()
  for (const [path, methods] of apis) {
    resultApis.set(urlToRequestPath(path), methods)
    Object.values(methods).forEach((value) => {
      value.trait.forEach((dtoField: string) => {
        if (hasOwn(schemas, dtoField)) {
          Object.assign(value.interface, Reflect.get(schemas, dtoField))
        }
      })
    })
  }
  return resultApis
}

export function generator(Swagger: SwaggerApi) {
  const apiMeta = parseSwagger(Swagger)
  const generatorList: GeneratorList<typeof getParams>[] = []
  apiMeta.forEach((val, path) => {
    Object.keys(val).forEach((method) => {
      const target = Reflect.get(val, method) as IPath
      generatorList.push({
        path,
        method,
        params: target.params,
        interface: target.interface,
        trait: target.trait,
        operationId: target.operationId,
      })
    })
  })
  return generatorList
}
