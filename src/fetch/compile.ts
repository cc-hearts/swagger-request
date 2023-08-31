import { GeneratorList, type getParams } from '@/core/index.js'
import { readFile } from 'fs/promises'
import Handlebars from 'handlebars'
import { join } from 'path'

type FetchData = Data & { name: string }

type Data = GeneratorList<typeof getParams>

export async function compile(target: FetchData) {
  target['path']
  const temp = Handlebars.compile(await readTemplate())
  return temp({
    method: target.method,
    url: target.path,
    name: target.name,
  })
}

async function readTemplate() {
  return await readFile(
    join(process.cwd(), 'src/fetch/fetch.template.js'),
    'utf-8'
  )
}

export function categorizationByOperationId(target: Data[]) {
  const map = new Map<string, FetchData>()

  target.forEach((item) => {
    const { operationId } = item
    const [controllerName, methodName] = operationId.split('_')

    if (!map.has(controllerName)) {
      map.set(controllerName, {} as FetchData)
    }

    const controller = map.get(controllerName)!
    Reflect.set(controller, methodName, { ...item, name: methodName })
  })
  return map
}
