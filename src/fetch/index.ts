import { generator, type SwaggerApi } from '../core/index.js'
import { categorizationByOperationId, compile } from './compile.js'
import Swagger from '../../swagger.json' assert { type: 'json' }
import { hasOwn } from '@cc-heart/utils'
import { join } from 'path'
import { access, constants, mkdir, writeFile } from 'fs/promises'

type Files = Record<string, Record<string, string>>

export async function generateCodeFromSwagger() {
  const api = generator(Swagger as unknown as SwaggerApi)
  const swaggerMetaMap = categorizationByOperationId(api)
  const files = {} as Files
  const executing = []
  for (const [fileName, swaggerMeta] of swaggerMetaMap) {
    if (!hasOwn(files, fileName)) {
      files[fileName] = {}
    }

    const target = files[fileName]
    const result = Object.keys(swaggerMeta).map(async (methodName) => {
      const _data = Reflect.get(swaggerMeta, methodName)
      target[methodName] = await compile({ ..._data })
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

export async function composition() {
  const rootDirectory = '_apis'
  const files = await generateCodeFromSwagger()
  await generatorFiles(files, rootDirectory)
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

composition()
