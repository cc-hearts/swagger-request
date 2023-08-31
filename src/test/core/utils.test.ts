import { describe, expect, it } from 'vitest'
import { getDynamicParams } from '@/core'

describe('core utils test module', () => {
  it('return dynamic params when url has dynamic params', () => {
    expect(getDynamicParams('/user/${id}')).toEqual(['id'])
  })
})
