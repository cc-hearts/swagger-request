import { generator, type SwaggerApi } from '../core/index.js'
import Swagger from '../../swagger.json' assert { type: 'json' }
// 根据 core中的 parseSwagger 生成的数据结构，生成对应的代码
export function generateCodeFromSwagger() {
  const api = generator(Swagger as unknown as SwaggerApi)
  // TODO: api generator fetch request function
}

generateCodeFromSwagger()
