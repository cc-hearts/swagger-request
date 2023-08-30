import { describe, expect, it } from 'vitest'
import {
  generator,
  getRefDtoNames,
  getSchemas,
  parsePaths,
  parseSwagger,
  type SwaggerApi,
} from '@/core'

describe('index test module', () => {
  it('get schemas from swagger components', () => {
    const components = {
      schemas: {
        CreateUserDto: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              example: 'admin',
              description: '用户名',
            },
            password: {
              type: 'string',
              example: '123456',
              description: '登陆密码',
            },
            mobile: {
              type: 'string',
              example: '15777991133',
              description: '手机号码',
            },
          },
          required: ['username', 'password', 'mobile'],
        },
      },
    }

    expect(getSchemas(components)).toEqual({
      CreateUserDto: {
        username: { type: 'string', required: true },
        password: { type: 'string', required: true },
        mobile: { type: 'string', required: true },
      },
    })
  })

  it('get ref dto name list', () => {
    const pathVal = {
      requestBody: {
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/CreateUserDto',
            },
          },
        },
      },
    }
    expect(getRefDtoNames(pathVal)).toEqual(['CreateUserDto'])
  })

  it('parse swagger paths', () => {
    const paths: SwaggerApi['paths'] = {
      '/user/register': {
        post: {
          operationId: 'UserController_createUser',
          summary: '注册',
          parameters: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateUserDto',
                },
              },
            },
          },
          responses: {
            '201': {
              description: '',
            },
          },
          tags: ['用户模块'],
        },
      },
    }
    const resultMap = new Map<string, any>()
    resultMap.set('/user/register', {
      post: {
        interface: {},
        trait: ['CreateUserDto'],
        params: [],
      },
    })
    expect(parsePaths(paths)).toEqual(resultMap)
  })

  it('parse paths as a reference when path container dynamic params', () => {
    const swaggerPaths: SwaggerApi['paths'] = {
      '/user/{id}': {
        patch: {
          operationId: 'UserController_update',
          summary: '更新用户信息',
          parameters: [
            {
              name: 'id',
              required: true,
              in: 'path',
              schema: {
                type: 'string',
              },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UpdateUserDto',
                },
              },
            },
          },
          responses: {
            '200': {
              description: '',
            },
          },
          tags: ['用户模块'],
        },
        delete: {
          operationId: 'UserController_remove',
          summary: '删除用户信息',
          parameters: [
            {
              name: 'id',
              required: true,
              in: 'path',
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '200': {
              description: '',
            },
          },
          tags: ['用户模块'],
        },
      },
    }
    const resultMap = new Map<string, any>()
    resultMap.set('/user/{id}', {
      patch: {
        trait: ['UpdateUserDto'],
        interface: {},
        params: [{ field: 'id', require: true, type: 'string' }],
      },
      delete: {
        trait: [],
        interface: {},
        params: [{ field: 'id', require: true, type: 'string' }],
      },
    })
    expect(parsePaths(swaggerPaths)).toEqual(resultMap)
  })

  it('parse swagger', () => {
    const swaggerApi = {
      paths: {
        '/user/register': {
          post: {
            operationId: 'UserController_createUser',
            summary: '注册',
            parameters: [],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/CreateUserDto',
                  },
                },
              },
            },
            responses: {
              '201': {
                description: '',
              },
            },
            tags: ['用户模块'],
          },
        },
      },
      components: {
        schemas: {
          CreateUserDto: {
            type: 'object',
            properties: {
              username: {
                type: 'string',
                example: 'admin',
                description: '用户名',
              },
              password: {
                type: 'string',
                example: '123456',
                description: '登陆密码',
              },
              mobile: {
                type: 'string',
                example: '15777991133',
                description: '手机号码',
              },
            },
            required: ['username', 'password', 'mobile'],
          },
        },
      },
    }

    const resultMap = new Map<string, any>()
    resultMap.set('/user/register', {
      post: {
        trait: ['CreateUserDto'],
        interface: {
          username: { type: 'string', required: true },
          password: { type: 'string', required: true },
          mobile: { type: 'string', required: true },
        },
        params: [],
      },
    })
    expect(parseSwagger(swaggerApi)).toEqual(resultMap)
  })

  it('generator from swagger api', () => {
    const swaggerApi = {
      paths: {
        '/user/{id}': {
          patch: {
            operationId: 'UserController_update',
            summary: '更新用户信息',
            parameters: [
              {
                name: 'id',
                required: true,
                in: 'path',
                schema: {
                  type: 'string',
                },
              },
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/UpdateUserDto',
                  },
                },
              },
            },
            responses: {
              '200': {
                description: '',
              },
            },
            tags: ['用户模块'],
          },
          delete: {
            operationId: 'UserController_remove',
            summary: '删除用户信息',
            parameters: [
              {
                name: 'id',
                required: true,
                in: 'path',
                schema: {
                  type: 'string',
                },
              },
            ],
            responses: {
              '200': {
                description: '',
              },
            },
            tags: ['用户模块'],
          },
        },
      },

      components: {
        schemas: {
          UpdateUserDto: {
            type: 'object',
            properties: {},
          },
        },
      },
    }
    const result = [
      {
        path: '/user/${id}',
        method: 'patch',
        params: [{ field: 'id', require: true, type: 'string' }],
        interface: {},
        trait: ['UpdateUserDto'],
      },
      {
        path: '/user/${id}',
        method: 'delete',
        params: [{ field: 'id', require: true, type: 'string' }],
        interface: {},
        trait: [],
      },
    ]
    expect(generator(swaggerApi)).toEqual(result)
  })
})
