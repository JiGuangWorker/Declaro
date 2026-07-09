/**
 * 验收标准 #3：双端可用 —— UniApp 端导入测试
 *
 * 验证 UniApp 端可以从 shared/api-types/ 导入所有核心类型。
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
type UniApp_Template = Schemas["Template"];
type UniApp_FormSchema = Schemas["FormSchema"];
type UniApp_StepSchema = Schemas["StepSchema"];
type UniApp_FieldSchema = Schemas["FieldSchema"];
type UniApp_UploadConfig = Schemas["UploadConfig"];
type UniApp_MaterialInstance = Schemas["MaterialInstance"];
type UniApp_StepProgress = Schemas["StepProgress"];
type UniApp_StepDetail = Schemas["StepDetail"];
type UniApp_FormData = Schemas["FormData"];
type UniApp_UploadedFile = Schemas["UploadedFile"];
type UniApp_QualityCheckResult = Schemas["QualityCheckResult"];
type UniApp_ExportTask = Schemas["ExportTask"];

// ============================================================
// operations 导入验证（operationId 映射）
// ============================================================

type UniApp_WxLogin = operations["wxLogin"];
type UniApp_ListTemplates = operations["listTemplates"];
type UniApp_GetTemplate = operations["getTemplate"];
type UniApp_CreateMaterial = operations["createMaterial"];
type UniApp_GetStepProgress = operations["getStepProgress"];
type UniApp_SaveFormData = operations["saveFormData"];
type UniApp_UploadFile = operations["uploadFile"];
type UniApp_TriggerQualityCheck = operations["triggerQualityCheck"];
type UniApp_CreateExportTask = operations["createExportTask"];

// ============================================================
// paths 导入验证
// ============================================================

type UniApp_TemplatesPath = paths["/api/v1/templates"];
type UniApp_MaterialsPath = paths["/api/v1/materials"];

// ============================================================
// 实际使用验证：构造一个符合类型的 MaterialInstance
// ============================================================

export function createUniAppMaterial(): UniApp_MaterialInstance {
  return {
    id: "mat_test_001",
    template_id: "tpl_pesticide_001",
    status: "in_progress",
    current_step_id: "step_basic_info",
    schema_version: "1.0.0",
    created_at: "2026-07-08T10:00:00Z",
  };
}
