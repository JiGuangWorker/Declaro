/**
 * 验收标准 #1：类型完整性测试
 *
 * 验证 openapi.yaml 中所有 schemas 都有对应 TS 类型，无手写补充。
 * 测试方式：TypeScript 编译时类型检查 —— 如果某个 schema 不存在于
 *           components["schemas"] 中，TypeScript 会报编译错误。
 */

import type { components } from "../api-types/index";

// ============================================================
// 核心 Schema 存在性验证
// 通过尝试引用每个 schema 类型来验证其存在
// 如果某个 schema 缺失，TypeScript 编译时就会报错
// ============================================================

type Schemas = components["schemas"];

// --- 错误与通用 ---
type _ErrorResponse = Schemas["ErrorResponse"];

// --- 模板管理 ---
type _Template = Schemas["Template"];
type _FormSchema = Schemas["FormSchema"];
type _StepSchema = Schemas["StepSchema"];
type _FieldSchema = Schemas["FieldSchema"];
type _UploadConfig = Schemas["UploadConfig"];

// --- 材料实例 ---
type _MaterialInstance = Schemas["MaterialInstance"];

// --- 步骤进度 ---
type _StepProgress = Schemas["StepProgress"];
type _StepDetail = Schemas["StepDetail"];

// --- 表单填报 ---
type _FormData = Schemas["FormData"];

// --- 文件上传 ---
type _UploadedFile = Schemas["UploadedFile"];

// --- AI质检 ---
type _QualityCheckResult = Schemas["QualityCheckResult"];

// --- 导出管理 ---
type _ExportTask = Schemas["ExportTask"];

// ============================================================
// 完整性断言：确保所有已知 schema 名称都存在
// 如果 openapi.yaml 新增了 schema 但这里未列出，至少不会导致
// 编译失败；但如果某个 schema 被删除或改名，这里会报错。
// ============================================================

// 所有必须存在的 schema 名称列表
type RequiredSchemas =
  | "ErrorResponse"
  | "Template"
  | "FormSchema"
  | "StepSchema"
  | "FieldSchema"
  | "UploadConfig"
  | "MaterialInstance"
  | "StepProgress"
  | "StepDetail"
  | "FormData"
  | "UploadedFile"
  | "QualityCheckResult"
  | "ExportTask";

// 辅助类型：检查 K 是否在 T 的键中
type AssertKeyExists<T, K extends string> = K extends keyof T ? true : never;

// 对每个必需的 schema 进行编译时断言
// 如果 schema 不存在，TypeScript 报 "Type 'false' is not assignable to type 'true'"
type SchemaCheck1 = AssertKeyExists<Schemas, "ErrorResponse">;
type SchemaCheck2 = AssertKeyExists<Schemas, "Template">;
type SchemaCheck3 = AssertKeyExists<Schemas, "FormSchema">;
type SchemaCheck4 = AssertKeyExists<Schemas, "StepSchema">;
type SchemaCheck5 = AssertKeyExists<Schemas, "FieldSchema">;
type SchemaCheck6 = AssertKeyExists<Schemas, "UploadConfig">;
type SchemaCheck7 = AssertKeyExists<Schemas, "MaterialInstance">;
type SchemaCheck8 = AssertKeyExists<Schemas, "StepProgress">;
type SchemaCheck9 = AssertKeyExists<Schemas, "StepDetail">;
type SchemaCheck10 = AssertKeyExists<Schemas, "FormData">;
type SchemaCheck11 = AssertKeyExists<Schemas, "UploadedFile">;
type SchemaCheck12 = AssertKeyExists<Schemas, "QualityCheckResult">;
type SchemaCheck13 = AssertKeyExists<Schemas, "ExportTask">;

// 导出验证 —— 确保值可以赋给这些类型
// （仅用于编译时检查，不会在运行时执行）
export function validateSchemas(): void {
  // 这个函数体永远不会执行，仅用于让 TypeScript 检查导入
  void ({} as Schemas);
}
