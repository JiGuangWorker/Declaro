// Copyright (c) 2026 Declaro. All rights reserved.

import { describe, it, expect } from 'vitest'
import {
  readFormSchema,
  readStep,
  flatten,
  extractFieldDefaults,
} from '../schema-reader'
import type { RuntimeStep, RuntimeFormSchema } from './fixtures'
import { fullSchema, minimalSchema } from './fixtures'

describe('schema-reader — readFormSchema', () => {
  it('#1 保留 template_id / version', () => {
    const result = readFormSchema(fullSchema)
    expect(result.template_id).toBe('tpl_pesticide_001')
    expect(result.version).toBe('1.0.0')
  })

  it('#2 steps 缺失 → []', () => {
    const noSteps: RuntimeFormSchema = { template_id: 't', version: '1.0.0', steps: undefined as unknown as RuntimeStep[] }
    const result = readFormSchema(noSteps)
    expect(result.steps).toEqual([])
  })
})

describe('schema-reader — readStep', () => {
  it('#3 form → renderType form + fields', () => {
    const step = readStep(fullSchema.steps[0])
    expect(step.renderType).toBe('form')
    // 13 类型示例 + 2 repeatable 子字段
    expect(step.fields).toHaveLength(15)
  })

  it('#4 upload → upload + 无 fields', () => {
    const step = readStep(fullSchema.steps[1])
    expect(step.renderType).toBe('upload')
    expect(step.fields).toEqual([])
    expect(step.uploadConfig).toBeDefined()
  })

  it('#5 both → fields + uploadConfig', () => {
    const bothStep: RuntimeStep = {
      id: 's1', name: 'both', type: 'both',
      fields: [{ name: 'x', label: 'X', type: 'text', required: true }],
      upload_config: { min_count: 1, max_count: 3, auto_check: false },
    }
    const step = readStep(bothStep)
    expect(step.renderType).toBe('both')
    expect(step.fields).toHaveLength(1)
    expect(step.uploadConfig).toBeDefined()
  })

  it('#6 有 layout → 返回 layout 树', () => {
    const step = readStep(fullSchema.steps[0])
    expect(step.layout).toBeDefined()
    expect(step.layout!.length).toBeGreaterThan(0)
    expect(step.layout![0].kind).toBe('section')
  })

  it('#7 无 layout → flatten(fields) 合成扁平 field 节点', () => {
    const step = readStep(minimalSchema.steps[0])
    expect(step.layout).toBeDefined()
    expect(step.layout!.every((n) => n.kind === 'field')).toBe(true)
    expect(step.layout!.map((n) => n.ref)).toEqual(['name', 'age'])
  })
})

describe('schema-reader — layout 节点解析', () => {
  it('#8 section 节点 → title + children', () => {
    const step = readStep(fullSchema.steps[0])
    const section = step.layout!.find((n) => n.kind === 'section')
    expect(section).toBeDefined()
    expect(section!.title).toBe('一、申请人基本情况')
    expect(section!.children).toBeDefined()
    expect(section!.children!.length).toBeGreaterThan(0)
  })

  it('#9 row 节点 → children 内联', () => {
    const step = readStep(fullSchema.steps[0])
    const section = step.layout!.find((n) => n.kind === 'section')!
    const row = section.children!.find((n) => n.kind === 'row')
    expect(row).toBeDefined()
    expect(row!.children).toBeDefined()
    expect(row!.children!.length).toBe(2)
  })

  it('#10 repeatable 节点 → name + min + max + children', () => {
    const step = readStep(fullSchema.steps[0])
    const repeatable = step.layout!.find((n) => n.kind === 'repeatable')
    expect(repeatable).toBeDefined()
    expect(repeatable!.name).toBe('branches')
    expect(repeatable!.min).toBe(1)
    expect(repeatable!.max).toBe(5)
    expect(repeatable!.children).toBeDefined()
  })
})

describe('schema-reader — extractFieldDefaults', () => {
  it('#11 13 类型默认值', () => {
    const step = readStep(fullSchema.steps[0])
    const defaults = extractFieldDefaults(step)
    // text/textarea/phone/id_card/date/select/radio/cascader → ''
    expect(defaults['applicant_name']).toBe('')
    expect(defaults['address']).toBe('')
    expect(defaults['phone']).toBe('')
    expect(defaults['id_card']).toBe('')
    expect(defaults['establish_date']).toBe('')
    expect(defaults['business_scope']).toBe('')
    expect(defaults['entity_type']).toBe('')
    expect(defaults['region']).toBe('')
    // number → ''（空串，非 0，区分未填）
    expect(defaults['capital']).toBe('')
    // checkbox → []
    expect(defaults['channels']).toEqual([])
    // image/signature → ''
    expect(defaults['license_photo']).toBe('')
    expect(defaults['signature']).toBe('')
    // label → 不入 DataStore
    expect(defaults['notice']).toBeUndefined()
  })

  it('#12 只含 step.fields，不含上传项', () => {
    const bothStep: RuntimeStep = {
      id: 's1', name: 'both', type: 'both',
      fields: [{ name: 'x', label: 'X', type: 'text', required: true }],
      upload_config: { min_count: 1, max_count: 3, auto_check: false },
    }
    const step = readStep(bothStep)
    const defaults = extractFieldDefaults(step)
    expect(Object.keys(defaults)).toEqual(['x'])
    expect(defaults['x']).toBe('')
  })

  it('#12a 含 repeatable → 整表 key 初始化为 [defaultRow × min]', () => {
    const step = readStep(fullSchema.steps[0])
    const defaults = extractFieldDefaults(step)
    // branches 整表 key → 行对象数组
    expect(defaults['branches']).toBeDefined()
    expect(Array.isArray(defaults['branches'])).toBe(true)
    // min=1 → 1 行
    expect((defaults['branches'] as unknown[]).length).toBe(1)
    // 行内子字段不单独入 store
    expect(defaults['branch_name']).toBeUndefined()
    expect(defaults['branch_address']).toBeUndefined()
    // defaultRow = { child.ref → default(child.type) }
    const firstRow = (defaults['branches'] as Record<string, unknown>[])[0]
    expect(firstRow['branch_name']).toBe('')
    expect(firstRow['branch_address']).toBe('')
  })
})

describe('schema-reader — flatten', () => {
  it('flatten 从字段列表合成 field 节点树', () => {
    const fields = minimalSchema.steps[0].fields!
    const nodes = flatten(fields)
    expect(nodes).toHaveLength(2)
    expect(nodes[0]).toEqual({ kind: 'field', ref: 'name' })
    expect(nodes[1]).toEqual({ kind: 'field', ref: 'age' })
  })
})
