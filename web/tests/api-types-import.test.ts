/**
 * 验收标准 #3：双端可用 —— Web 端导入测试
 *
 * 验证 Web 端可以从 shared/api-types/ 导入所有核心类型。
 * 如果任何导入失败，TypeScript 编译时就会报错。
 *
 * 运行：cd shared && npx tsc --noEmit
 */

import type { paths, components, operations } from "../../shared/api-types/index";

// ============================================================
// components.schemas 导入验证
// ============================================================

type Schemas = components["schemas"];

// 验证所有核心 schema 类型可导入
type Web_Template = Schemas["Template"];
type Web_FormSchema = Schemas["FormSchema"];
type Web_StepSchema = Schemas["StepSchema"];
type Web_FieldSchema = Schemas["FieldSchema"];
type Web_UploadConfig = Schemas["UploadConfig"];
type Web_MaterialInstance = Schemas["MaterialInstance"];
type Web_StepProgress = Schemas["StepProgress"];
type Web_StepDetail = Schemas["StepDetail"];
type Web_FormData = Schemas["FormData"];
type Web_UploadedFile = Schemas["UploadedFile"];
type Web_QualityCheckResult = Schemas["QualityCheckResult"];
type Web_ExportTask = Schemas["ExportTask"];

// ============================================================
// operations 导入验证（operationId 映射）
// ============================================================

type Web_WxLogin = operations["wxLogin"];
type Web_ListTemplates = operations["listTemplates"];
type Web_GetTemplate = operations["getTemplate"];
type Web_CreateMaterial = operations["createMaterial"];
type Web_GetStepProgress = operations["getStepProgress"];
type Web_SaveFormData = operations["saveFormData"];
type Web_UploadFile = operations["uploadFile"];
type Web_TriggerQualityCheck = operations["triggerQualityCheck"];
type Web_CreateExportTask = operations["createExportTask"];

// ============================================================
// paths 导入验证
// ============================================================

type Web_TemplatesPath = paths["/api/v1/templates"];
type Web_MaterialsPath = paths["/api/v1/materials"];

// ============================================================
// 实际使用验证：构造一个符合类型的对象
// ============================================================

export function createWebTemplate(): Web_Template {
  return {
    id: "tpl_test",
    name: "测试模板",
    business_type: "test",
    status: "enabled",
    navigation_mode: "free",
  };
}
