// Copyright (c) 2026 Declaro. All rights reserved.

/**
 * 冒烟测试用 Mock Form Schema。
 *
 * 基于《农药经营许可申请表》设计，覆盖：
 * - 13 种字段类型全覆盖（text/textarea/number/phone/id_card/date/select/radio/checkbox/cascader/image/signature/label）
 * - 4 种布局节点（field/section/row/repeatable）
 * - 联动规则（条件可见 + 条件必填）
 *
 * 后端 Issue #6（模板接口）完成后，此文件可删除，改为从 API 获取真实 schema。
 */
import type { RuntimeFormSchema } from '@declaro/form-engine'

export const mockFormSchema: RuntimeFormSchema = {
  template_id: 'tpl_pesticide_001',
  version: '1.0.0',
  steps: [
    {
      id: 'step_basic_info',
      name: '基本信息',
      type: 'form',
      tips: '请填写真实有效的信息',
      fields: [
        { name: 'applicant_name', label: '姓名', type: 'text', required: true, placeholder: '请输入姓名' },
        { name: 'address', label: '地址', type: 'textarea', required: true, placeholder: '请输入详细地址' },
        { name: 'capital', label: '注册资本(万)', type: 'number', required: false, placeholder: '请输入金额' },
        { name: 'phone', label: '联系电话', type: 'phone', required: true, placeholder: '请输入11位手机号' },
        { name: 'id_card', label: '身份证号', type: 'id_card', required: true, placeholder: '请输入身份证号' },
        { name: 'establish_date', label: '成立日期', type: 'date', required: true, placeholder: '请选择日期' },
        {
          name: 'business_scope',
          label: '经营范围',
          type: 'select',
          required: true,
          placeholder: '请选择',
          options: [
            { value: 'retail', label: '零售' },
            { value: 'wholesale', label: '批发' },
          ],
        },
        {
          name: 'entity_type',
          label: '主体类型',
          type: 'radio',
          required: true,
          options: [
            { value: 'individual', label: '个体' },
            { value: 'company', label: '企业' },
          ],
        },
        {
          name: 'channels',
          label: '销售渠道',
          type: 'checkbox',
          required: false,
          options: [
            { value: 'online', label: '线上' },
            { value: 'offline', label: '线下' },
          ],
        },
        {
          name: 'region',
          label: '所在地区',
          type: 'cascader',
          required: true,
          placeholder: '请选择',
          options: [
            { value: '110000', label: '北京市' },
            { value: '120000', label: '天津市' },
          ],
        },
        { name: 'license_photo', label: '营业执照照片', type: 'image', required: true },
        { name: 'signature', label: '签名', type: 'signature', required: true },
        { name: 'notice', label: '提示', type: 'label', required: false, tips: '以上信息请如实填写' },
        // repeatable 子表字段
        { name: 'branch_name', label: '分支名称', type: 'text', required: true },
        { name: 'branch_address', label: '分支地址', type: 'textarea', required: true },
      ],
      layout: [
        {
          kind: 'section',
          id: 'sec_applicant',
          title: '一、申请人基本情况',
          children: [
            { kind: 'field', ref: 'applicant_name' },
            { kind: 'field', ref: 'id_card' },
            {
              kind: 'row',
              id: 'row_contact',
              children: [
                { kind: 'field', ref: 'phone' },
                { kind: 'field', ref: 'establish_date' },
              ],
            },
            { kind: 'field', ref: 'address' },
            { kind: 'field', ref: 'capital' },
            { kind: 'field', ref: 'region' },
            { kind: 'field', ref: 'business_scope' },
            { kind: 'field', ref: 'entity_type' },
            { kind: 'field', ref: 'channels' },
            { kind: 'field', ref: 'license_photo' },
            { kind: 'field', ref: 'signature' },
            { kind: 'field', ref: 'notice' },
          ],
        },
        {
          kind: 'repeatable',
          id: 'sec_branches',
          name: 'branches',
          min: 1,
          max: 5,
          children: [
            { kind: 'field', ref: 'branch_name' },
            { kind: 'field', ref: 'branch_address' },
          ],
        },
      ],
      linkage: [
        {
          handler: 'conditional-visibility',
          on: { field: 'entity_type' },
          target: 'sec_branches',
          params: [{ field: 'entity_type', op: 'eq', value: 'company' }],
        },
        {
          handler: 'conditional-required',
          on: { field: 'channels' },
          target: 'phone',
          params: [{ field: 'channels', op: 'not_empty' }],
        },
      ],
    },
  ],
}
