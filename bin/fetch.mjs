import { readFile, rm, mkdir, writeFile, access, constants } from 'fs/promises';
import Handlebars from 'handlebars';
import { join, resolve } from 'path';
import * as Rollup from 'rollup';
import { readFileSync, existsSync } from 'fs';
import 'url';
import fetch from 'node-fetch';

function hasOwn(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
}

/**
 * Capitalizes the first letter of a string.
 *
 * @param target - The string to be capitalized.
 * @return - The capitalized string.
 */
const capitalize = (target) => (target.charAt(0).toUpperCase() + target.slice(1));

// transform url to request path
// e.g. /user/{id} => `/user/${id}`
function urlToRequestPath(url) {
    return url
        .split('/')
        .map((item) => {
        if (/{.*?}/g.test(item)) {
            return `$${item}`;
        }
        return item;
    })
        .join('/');
}
function getDynamicParams(url) {
    const params = url.match(/\${.*?}/g);
    if (!params)
        return [];
    return params.map((item) => item.replace(/\${|}/g, ''));
}

function getSchemas(components) {
    const { schemas } = components;
    const container = {};
    Object.keys(schemas).forEach((key) => {
        Reflect.set(container, key, {});
        const fieldsValue = Reflect.get(container, key);
        const dtoTarget = Reflect.get(schemas, key);
        const { properties = {}, required = [] } = dtoTarget;
        Object.keys(properties).forEach((property) => {
            const description = Reflect.get(properties, property);
            Reflect.set(fieldsValue, property, {
                type: description.type,
                required: required.includes(property),
            });
        });
    });
    return container;
}
// get ref dto name list
function getRefDtoNames(pathVal) {
    const contentType = pathVal?.requestBody?.content;
    if (!contentType)
        return [];
    return Object.keys(contentType).reduce((acc, key) => {
        if (key === 'application/json') {
            const { schema } = Reflect.get(contentType, key);
            const { $ref } = schema;
            const [dtoName] = $ref.split('/').slice(-1);
            acc.push(dtoName);
        }
        return acc;
    }, []);
}
function getParams(pathVal) {
    const { parameters = [] } = pathVal;
    return parameters.map((param) => {
        return {
            field: param.name,
            require: param.required,
            type: param.schema.type,
        };
    });
}
function parsePaths(paths) {
    const pathsMap = new Map();
    Object.keys(paths).forEach((path) => {
        const val = {};
        pathsMap.set(path, val);
        const pathVal = Reflect.get(paths, path);
        Object.keys(pathVal).forEach((method) => {
            const target = Reflect.get(pathVal, method);
            Reflect.set(val, method, {
                // request trait names
                operationId: target.operationId,
                trait: getRefDtoNames(target),
                params: getParams(target),
                interface: {},
            });
        });
    });
    return pathsMap;
}
function parseSwagger(api) {
    const { components, paths } = api;
    const schemas = getSchemas(components);
    const apis = parsePaths(paths);
    const resultApis = new Map();
    for (const [path, methods] of apis) {
        resultApis.set(urlToRequestPath(path), methods);
        Object.values(methods).forEach((value) => {
            value.trait.forEach((dtoField) => {
                if (hasOwn(schemas, dtoField)) {
                    Object.assign(value.interface, Reflect.get(schemas, dtoField));
                }
            });
        });
    }
    return resultApis;
}
function generator(Swagger) {
    const apiMeta = parseSwagger(Swagger);
    const generatorList = [];
    apiMeta.forEach((val, path) => {
        Object.keys(val).forEach((method) => {
            const target = Reflect.get(val, method);
            generatorList.push({
                path,
                method,
                params: target.params,
                interface: target.interface,
                trait: target.trait,
                operationId: target.operationId,
            });
        });
    });
    return generatorList;
}

async function compile(target, options = {}) {
    const temp = Handlebars.compile(await readTemplate());
    const { isGeneratorImportSyntax, isExistDataParamsField } = options;
    const { path, requestParams, ...rest } = target;
    const callbackParams = ['`' + path + '`', requestParams]
        .filter(Boolean)
        .join(', ');
    return temp({
        ...rest,
        callbackParams,
        isGeneratorImportSyntax,
        isExistDataParamsField,
    });
}
async function readTemplate() {
    return await readFile(join(process.cwd(), 'src/fetch/fetch.template.js'), 'utf-8');
}
function categorizationByOperationId(target) {
    const map = new Map();
    target.forEach((item) => {
        const { operationId } = item;
        const [controllerName, methodName] = operationId.split('_');
        if (!map.has(controllerName)) {
            map.set(controllerName, {});
        }
        const controller = map.get(controllerName);
        Reflect.set(controller, methodName, { ...item, name: methodName });
    });
    return map;
}
function compileParams(isExistDataParamsField, params, dynamicParams) {
    const paramsList = params.reduce((acc, cur) => {
        const index = dynamicParams.findIndex((item) => item === cur.field);
        if (index > -1) {
            dynamicParams.splice(index, 1);
        }
        acc.push(`${cur.field}${cur.require ? '' : '?'}: ${cur.type}`);
        return acc;
    }, []);
    if (isExistDataParamsField) {
        paramsList.unshift('data: T');
    }
    const dynamicParamsList = dynamicParams.map((item) => `${item}: any`);
    return [...paramsList, ...dynamicParamsList].join(', ');
}
function compileRequestParams(isExistDataParamsField, params, dynamicParams) {
    if (params.length === 0) {
        if (isExistDataParamsField)
            return 'data';
        return '';
    }
    let paramsList = params.reduce((acc, cur) => {
        if (dynamicParams.includes(cur.field))
            return acc;
        acc.push(cur.field);
        return acc;
    }, []);
    if (isExistDataParamsField) {
        paramsList.unshift('...data');
    }
    if (paramsList.length === 0)
        return '';
    return `{ ${paramsList.join(', ')} }`;
}

const DEFAULT_CONFIG_FILES = [
    'swaggerRequest.config.js',
    'swaggerRequest.config.mjs',
    'swaggerRequest.config.ts',
    'swaggerRequest.config.cjs',
    'swaggerRequest.config.mts',
    'swaggerRequest.config.cts',
];

function getPackage(path) {
    path = path || resolve(process.cwd(), 'package.json');
    const packages = readFileSync(path, { encoding: 'utf-8' });
    return JSON.parse(packages);
}

function isESM() {
    return getPackage().type === 'module';
}

const defaultConfig = {
    rootDirectory: '_apis',
    importPaths: '@/request',
    swaggerUrl: '',
    requestFunctionImportName: (name) => capitalize(name),
};
// loading config files
async function loadingConfig() {
    let resolvePath;
    for (const fileName of DEFAULT_CONFIG_FILES) {
        const configPath = join(process.cwd(), fileName);
        if (existsSync(configPath)) {
            resolvePath = configPath;
            break;
        }
    }
    if (!resolvePath) {
        console.log('No configuration file found, using the default configuration');
        return defaultConfig;
    }
    const rollupConfig = {
        input: resolvePath,
        plugins: isESM()
            ? []
            : ['@rollup/plugin-commonjs'],
    };
    const bundle = await Rollup.rollup(rollupConfig);
    const outputOptions = {
        file: join(process.cwd(), './__config__.js'),
        format: 'esm',
    };
    await bundle.write(outputOptions);
    try {
        // @ts-ignore
        const { default: config } = await import(outputOptions.file);
        await rm(outputOptions.file);
        return {
            ...defaultConfig,
            ...config,
        };
    }
    catch (e) { }
    return defaultConfig;
}

function request(url, options = {}) {
    if (!options.headers)
        options.headers = {
            'Content-Type': 'application/json',
        };
    else if (!Reflect.get(options.headers, 'Content-Type'))
        Reflect.set(options.headers, 'Content-Type', 'application/json');
    if (!options.method)
        options.method = 'get';
    return fetch(`${url}`, options).then((res) => {
        const contentType = res.headers.get('content-type');
        if (contentType?.includes('application/json;')) {
            return res.json();
        }
        return res.text();
    });
}

async function generateCodeFromSwagger(swagger, config) {
    const api = generator(swagger);
    const swaggerMetaMap = categorizationByOperationId(api);
    const files = {};
    const executing = [];
    const { importPaths } = config;
    for (const [fileName, swaggerMeta] of swaggerMetaMap) {
        if (!hasOwn(files, fileName)) {
            files[fileName] = {};
        }
        const isExistTransformFunctionImportName = !!config.requestFunctionImportName;
        let __imports__ = [
            ...Object.values(swaggerMeta).reduce((acc, cur) => {
                if (isExistTransformFunctionImportName) {
                    cur._method =
                        config.requestFunctionImportName(cur.method) || cur.method;
                }
                acc.add(cur._method);
                return acc;
            }, new Set()),
        ].join(',');
        const target = files[fileName];
        const result = Object.keys(swaggerMeta).map(async (methodName, index) => {
            const _data = Reflect.get(swaggerMeta, methodName);
            let isExistDataParamsField = false;
            if (['post', 'put', 'patch'].includes(_data.method)) {
                isExistDataParamsField = true;
            }
            const dynamicParams = getDynamicParams(_data.path);
            const params = compileParams(isExistDataParamsField, _data.params, [
                ...dynamicParams,
            ]);
            const requestParams = compileRequestParams(isExistDataParamsField, _data.params, [...dynamicParams]);
            target[methodName] = await compile({
                ..._data,
                __imports__,
                paths: importPaths,
                method: _data._method,
                params,
                requestParams,
            }, {
                isGeneratorImportSyntax: index === 0,
                isExistDataParamsField,
            });
        });
        executing.push(Promise.all(result));
    }
    await Promise.all(executing);
    return files;
}
async function validateExistDirectory(path) {
    try {
        await access(path, constants.F_OK);
        return true;
    }
    catch (e) {
        return false;
    }
}
async function generatorFiles(files, rootDirectory) {
    const _join = (path) => {
        if (!path)
            return join(process.cwd(), rootDirectory);
        return join(process.cwd(), `${rootDirectory}/${path}.ts`);
    };
    if (!(await validateExistDirectory(_join()))) {
        await mkdir(_join());
    }
    const flag = Object.keys(files).map(async (fileName) => {
        const paths = _join(fileName);
        const fileValue = Object.values(files[fileName]).join('\n');
        await writeFile(paths, fileValue);
    });
    await Promise.all(flag);
}
async function composition() {
    const config = await loadingConfig();
    const { swaggerUrl, rootDirectory } = config;
    if (!swaggerUrl) {
        throw new Error('swaggerUrl is required');
    }
    const swaggerApi = await request(swaggerUrl);
    const files = await generateCodeFromSwagger(swaggerApi, config);
    await generatorFiles(files, rootDirectory);
}

composition();
