import { capitalize } from '@cc-heart/utils'
import { defineOptions } from './types'

const defaultConfig: defineOptions = {
  rootDirectory: '_apis',
  importPaths: '@/request',
  requestFunctionImportName: (name: string) => capitalize(name),
}

export default defaultConfig
