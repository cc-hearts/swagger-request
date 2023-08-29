export interface SwaggerApi {
  components: IComponents
  paths: Record<string, IPaths>
}

type method = 'post' | 'get' | 'put' | 'delete' | 'patch'
export type methods<T, k extends string = method> = k extends k
  ? { [s in k]: T }
  : never
// ts 可选
export type IPaths = Partial<Record<method, IPath>>

export interface IPath {
  required?: boolean
  requestBody?: IRequestBody
  parameters?: IParameters[]
  [k: string]: any
}

interface IParameters {
  name: string
  required: boolean
  in: string
  schema: {
    type: string
  }
}

interface IRequestBody {
  required?: boolean
  content: Record<'application/json', IContentTypeMapDto>
}
interface IContentTypeMapDto {
  schema: {
    $ref: string
  }
}
export interface IComponents {
  schemas: Record<string, ISchemas>
}

interface ISchemas {
  type: string
  properties?: Record<string, properties>
  required?: string[]
}

interface properties {
  type: string
  example?: string
  description?: string
}
