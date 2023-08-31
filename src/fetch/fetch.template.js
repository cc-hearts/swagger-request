{{#if isGeneratorImportSyntax }}
import { {{ __imports__ }} } from '{{ paths }}'
{{/if}}

{{#if isExistDataParamsField }}
export async function {{ name }}<T>({{ params }}) {
    {{else}}
export async function {{ name }} ({{ params }}) {
{{/if}}
  const { data: _data } = {{ method }}({{{ callbackParams}}})
  return _data
}