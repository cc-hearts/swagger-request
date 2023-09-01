export interface CompileOptions {
  isGeneratorImportSyntax?: boolean
  isExistDataParamsField?: boolean
}

export interface defineOptions {
  rootDirectory: string
  swaggerUrl: string
  importPaths: string | (() => string)
  requestFunctionImportName?: (name: string) => string
}
