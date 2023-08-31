export interface CompileOptions {
  isGeneratorImportSyntax?: boolean
  isExistDataParamsField?: boolean
}

export interface defineOptions {
  rootDirectory: string

  importPaths: string | (() => string)

  requestFunctionImportName?: (name: string) => string
}
