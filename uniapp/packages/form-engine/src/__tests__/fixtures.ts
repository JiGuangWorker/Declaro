// Copyright (c) 2026 Declaro. All rights reserved.

/**
 * FormRenderer 测试 fixtures。
 *
 * 基于真实《农药经营许可申请表》设计，覆盖：
 * - 13 种字段类型全覆盖
 * - 4 种布局节点（field/section/row/repeatable）
 * - 联动声明（条件可见/条件必填/级联/循环/自定义 handler）
 */
import type { StepSchema, FieldSchema } from '../types/engine'
import type { LayoutNode } from '../types/engine'
import type { LinkageBinding } from '../linkage/types'
import type { Condition } from '../types/engine'

// ─── L1+L2 组合：StepSchema + runtime 扩展 ───

export interface RuntimeStep extends StepSchema {
  layout?: LayoutNode[]
  linkage?: LinkageBinding[]
}

export interface RuntimeFormSchema {
  template_id: string
  version: string
  steps: RuntimeStep[]
}

// ─── 13 类型字段定义工厂 ───

function makeAllTypeFields(): FieldSchema[] {
  return [
    { name: 'applicant_name', label: '姓名', type: 'text', required: true, placeholder: '请输入姓名' },
    { name: 'address', label: '地址', type: 'textarea', required: true, placeholder: '请输入详细地址' },
    { name: 'capital', label: '注册资本(万)', type: 'number', required: false, placeholder: '请输入金额' },
    { name: 'phone', label: '联系电话', type: 'phone', required: true, placeholder: '请输入11位手机号', validation: { pattern: '^1[3-9]\\d{9}$', min_length: 11, max_length: 11 } },
    { name: 'id_card', label: '身份证号', type: 'id_card', required: true, placeholder: '请输入身份证号', validation: { pattern: '^\\d{17}[\\dXx]$', min_length: 18, max_length: 18 } },
    { name: 'establish_date', label: '成立日期', type: 'date', required: true, placeholder: '请选择日期' },
    { name: 'business_scope', label: '经营范围', type: 'select', required: true, placeholder: '请选择', options: [{ value: 'retail', label: '零售' }, { value: 'wholesale', label: '批发' }] },
    { name: 'entity_type', label: '主体类型', type: 'radio', required: true, options: [{ value: 'individual', label: '个体' }, { value: 'company', label: '企业' }] },
    { name: 'channels', label: '销售渠道', type: 'checkbox', required: false, options: [{ value: 'online', label: '线上' }, { value: 'offline', label: '线下' }] },
    { name: 'region', label: '所在地区', type: 'cascader', required: true, placeholder: '请选择', options: [{ value: '110000', label: '北京市' }, { value: '120000', label: '天津市' }] },
    { name: 'license_photo', label: '营业执照照片', type: 'image', required: true },
    { name: 'signature', label: '签名', type: 'signature', required: true },
    { name: 'notice', label: '提示', type: 'label', required: false, tips: '以上信息请如实填写' },
    // repeatable 子表字段（C2: ref 必须在 fields[] 存在）
    { name: 'branch_name', label: '分支名称', type: 'text', required: true },
    { name: 'branch_address', label: '分支地址', type: 'textarea', required: true },
  ]
}

// ─── fullSchema：完整覆盖（13 类型 + 4 布局 + 联动）───

export const fullSchema: RuntimeFormSchema = {
  template_id: 'tpl_pesticide_001',
  version: '1.0.0',
  steps: [
    {
      id: 'step_basic_info',
      name: '基本信息',
      type: 'form',
      tips: '请填写真实有效的个人信息',
      fields: makeAllTypeFields(),
      layout: [
        { kind: 'section', id: 'sec_applicant', title: '一、申请人基本情况', children: [
          { kind: 'field', ref: 'applicant_name' },
          { kind: 'field', ref: 'id_card' },
          { kind: 'row', id: 'row_contact', children: [
            { kind: 'field', ref: 'phone' },
            { kind: 'field', ref: 'establish_date' },
          ]},
          { kind: 'field', ref: 'address' },
          { kind: 'field', ref: 'capital' },
          { kind: 'field', ref: 'region' },
          { kind: 'field', ref: 'business_scope' },
          { kind: 'field', ref: 'entity_type' },
          { kind: 'field', ref: 'channels' },
          { kind: 'field', ref: 'license_photo' },
          { kind: 'field', ref: 'signature' },
          { kind: 'field', ref: 'notice' },
        ]},
        { kind: 'repeatable', id: 'sec_branches', name: 'branches', min: 1, max: 5, children: [
          { kind: 'field', ref: 'branch_name' },
          { kind: 'field', ref: 'branch_address' },
        ]},
      ],
      linkage: [
        {
          handler: 'conditional-visibility',
          on: { field: 'entity_type' },
          target: 'sec_branches',
          params: [{ field: 'entity_type', op: 'eq', value: 'company' }] as Condition[],
        },
        {
          handler: 'conditional-required',
          on: { field: 'channels' },
          target: 'phone',
          params: [{ field: 'channels', op: 'not_empty' }] as Condition[],
        },
      ],
    },
    {
      id: 'step_upload',
      name: '材料上传',
      type: 'upload',
      upload_config: {
        min_count: 3,
        max_count: 5,
        accepted_types: ['image/jpeg', 'image/png'],
        max_size_mb: 10,
        auto_check: true,
        quality_check_rules: [{ id: 'rule_clear', name: '文字清晰可辨' }],
      },
    },
  ],
}

// ─── minimalSchema：最小化（无 layout / 无 linkage）───

export const minimalSchema: RuntimeFormSchema = {
  template_id: 'tpl_min',
  version: '1.0.0',
  steps: [
    {
      id: 'step1',
      name: '基本信息',
      type: 'form',
      fields: [
        { name: 'name', label: '姓名', type: 'text', required: true },
        { name: 'age', label: '年龄', type: 'number', required: false },
      ],
    },
  ],
}

// ─── unknownSchema：含未知字段类型 ───

export const unknownSchema: RuntimeFormSchema = {
  template_id: 'tpl_unknown',
  version: '1.0.0',
  steps: [
    {
      id: 'step1',
      name: '测试',
      type: 'form',
      fields: [
        { name: 'name', label: '姓名', type: 'text', required: true },
        { name: 'custom_field', label: '自定义', type: 'futuristic' as FieldSchema['type'], required: false },
      ],
    },
  ],
}

// ─── cascadeSchema：A→B→C 级联收敛 ───

export const cascadeSchema: RuntimeFormSchema = {
  template_id: 'tpl_cascade',
  version: '1.0.0',
  steps: [
    {
      id: 'step_cascade',
      name: '级联测试',
      type: 'form',
      fields: [
        { name: 'a', label: 'A', type: 'text', required: true },
        { name: 'b', label: 'B', type: 'text', required: false },
        { name: 'c', label: 'C', type: 'text', required: false },
      ],
      linkage: [
        {
          handler: 'computed-field',
          on: { field: 'a' },
          target: 'b',
          params: { template: 'B={{a}}' },
        },
        {
          handler: 'computed-field',
          on: { field: 'b' },
          target: 'c',
          params: { template: 'C={{b}}' },
        },
      ],
    },
  ],
}

// ─── cycleSchema：A→B→A 循环（触发 halt）───

export const cycleSchema: RuntimeFormSchema = {
  template_id: 'tpl_cycle',
  version: '1.0.0',
  steps: [
    {
      id: 'step_cycle',
      name: '循环测试',
      type: 'form',
      fields: [
        { name: 'a', label: 'A', type: 'text', required: true },
        { name: 'b', label: 'B', type: 'text', required: false },
      ],
      linkage: [
        {
          handler: 'computed-field',
          on: { field: 'a' },
          target: 'b',
          params: { template: 'B={{a}}' },
        },
        {
          handler: 'computed-field',
          on: { field: 'b' },
          target: 'a',
          params: { template: 'A={{b}}' },
        },
      ],
    },
  ],
}

// ─── customHandlerSchema：声明未注册的自定义 handler ───

export const customHandlerSchema: RuntimeFormSchema = {
  template_id: 'tpl_custom',
  version: '1.0.0',
  steps: [
    {
      id: 'step_custom',
      name: '自定义handler测试',
      type: 'form',
      fields: [
        { name: 'trigger', label: '触发', type: 'text', required: false },
        { name: 'target_field', label: '目标', type: 'text', required: false },
      ],
      linkage: [
        {
          handler: 'my-custom-handler',
          on: { field: 'trigger' },
          target: 'target_field',
          params: { msg: 'hello' },
        },
      ],
    },
  ],
}
