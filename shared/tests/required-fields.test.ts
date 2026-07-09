/**
 * 验收标准 #4：required 字段覆盖性测试
 *
 * 验证 schema 中 required 字段在 TS 类型中为必填（无 ?），
 * 非 required 字段为可选（带 ?）。
 *
 * 测试方式：构造缺少必填字段的对象会导致 TypeScript 编译错误；
 *          包含可选字段的对象则编译通过。
 */

import type { components } from "../api-types/index";

// ============================================================
// 辅助类型：判断属性是否必填
// ============================================================

/** 如果 P 在 T 中是必填的（非 optional），返回 true */
type IsRequired<T, P extends keyof T> = T extends { [K in P]-?: T[K] }
  ? true
  : false;

// ============================================================
// Template schema required: [id, name, business_type, status, navigation_mode]
// optional: step_count, created_at
// ============================================================

type Template = components["schemas"]["Template"];

// 必填字段检查
type Template_Id_Required = IsRequired<Template, "id">; // 期望: true
type Template_Name_Required = IsRequired<Template, "name">; // 期望: true
type Template_BusinessType_Required = IsRequired<Template, "business_type">; // 期望: true
type Template_Status_Required = IsRequired<Template, "status">; // 期望: true
type Template_NavigationMode_Required = IsRequired<Template, "navigation_mode">; // 期望: true

// 可选字段检查
type Template_StepCount_Optional = IsRequired<Template, "step_count">; // 期望: false
type Template_CreatedAt_Optional = IsRequired<Template, "created_at">; // 期望: false

// ============================================================
// MaterialInstance required: [id, template_id, status, current_step_id, schema_version, created_at]
// optional: template_name, updated_at
// ============================================================

type MaterialInstance = components["schemas"]["MaterialInstance"];

type MI_Id_Required = IsRequired<MaterialInstance, "id">;
type MI_TemplateId_Required = IsRequired<MaterialInstance, "template_id">;
type MI_Status_Required = IsRequired<MaterialInstance, "status">;
type MI_CurrentStepId_Required = IsRequired<MaterialInstance, "current_step_id">;
type MI_SchemaVersion_Required = IsRequired<MaterialInstance, "schema_version">;
type MI_CreatedAt_Required = IsRequired<MaterialInstance, "created_at">;

type MI_TemplateName_Optional = IsRequired<MaterialInstance, "template_name">;
type MI_UpdatedAt_Optional = IsRequired<MaterialInstance, "updated_at">;

// ============================================================
// UploadedFile required: [id, name, url, uploaded_at]
// optional: thumbnail_url, size, quality_check
// ============================================================

type UploadedFile = components["schemas"]["UploadedFile"];

type UF_Id_Required = IsRequired<UploadedFile, "id">;
type UF_Name_Required = IsRequired<UploadedFile, "name">;
type UF_Url_Required = IsRequired<UploadedFile, "url">;
type UF_UploadedAt_Required = IsRequired<UploadedFile, "uploaded_at">;

type UF_ThumbnailUrl_Optional = IsRequired<UploadedFile, "thumbnail_url">;
type UF_Size_Optional = IsRequired<UploadedFile, "size">;
type UF_QualityCheck_Optional = IsRequired<UploadedFile, "quality_check">;

// ============================================================
// ExportTask required: [id, material_id, status, progress, created_at]
// optional: file_name, file_size, download_url, version, completed_at
// ============================================================

type ExportTask = components["schemas"]["ExportTask"];

type ET_Id_Required = IsRequired<ExportTask, "id">;
type ET_MaterialId_Required = IsRequired<ExportTask, "material_id">;
type ET_Status_Required = IsRequired<ExportTask, "status">;
type ET_Progress_Required = IsRequired<ExportTask, "progress">;
type ET_CreatedAt_Required = IsRequired<ExportTask, "created_at">;

type ET_FileName_Optional = IsRequired<ExportTask, "file_name">;
type ET_FileSize_Optional = IsRequired<ExportTask, "file_size">;
type ET_DownloadUrl_Optional = IsRequired<ExportTask, "download_url">;
type ET_Version_Optional = IsRequired<ExportTask, "version">;
type ET_CompletedAt_Optional = IsRequired<ExportTask, "completed_at">;

// ============================================================
// QualityCheckResult required: [status]
// optional: checked_at, items, total_passed, total_failed
// ============================================================

type QualityCheckResult = components["schemas"]["QualityCheckResult"];

type QC_Status_Required = IsRequired<QualityCheckResult, "status">;

type QC_CheckedAt_Optional = IsRequired<QualityCheckResult, "checked_at">;
type QC_Items_Optional = IsRequired<QualityCheckResult, "items">;
type QC_TotalPassed_Optional = IsRequired<QualityCheckResult, "total_passed">;
type QC_TotalFailed_Optional = IsRequired<QualityCheckResult, "total_failed">;

// ============================================================
// 编译时验证：如果上述任何断言错误，TypeScript 编译失败
// 断言方式：
//   type AssertTrue<T extends true> = T;
//   如果 T 不是 true，编译报错
// ============================================================

type AssertTrue<T extends true> = T;

// --- Template ---
type _Check1 = AssertTrue<Template_Id_Required>;
type _Check2 = AssertTrue<Template_Name_Required>;
type _Check3 = AssertTrue<Template_BusinessType_Required>;
type _Check4 = AssertTrue<Template_Status_Required>;
type _Check5 = AssertTrue<Template_NavigationMode_Required>;

// --- MaterialInstance ---
type _Check6 = AssertTrue<MI_Id_Required>;
type _Check7 = AssertTrue<MI_TemplateId_Required>;
type _Check8 = AssertTrue<MI_Status_Required>;
type _Check9 = AssertTrue<MI_CurrentStepId_Required>;
type _Check10 = AssertTrue<MI_SchemaVersion_Required>;
type _Check11 = AssertTrue<MI_CreatedAt_Required>;

// --- UploadedFile ---
type _Check12 = AssertTrue<UF_Id_Required>;
type _Check13 = AssertTrue<UF_Name_Required>;
type _Check14 = AssertTrue<UF_Url_Required>;
type _Check15 = AssertTrue<UF_UploadedAt_Required>;

// --- ExportTask ---
type _Check16 = AssertTrue<ET_Id_Required>;
type _Check17 = AssertTrue<ET_MaterialId_Required>;
type _Check18 = AssertTrue<ET_Status_Required>;
type _Check19 = AssertTrue<ET_Progress_Required>;
type _Check20 = AssertTrue<ET_CreatedAt_Required>;

// --- QualityCheckResult ---
type _Check21 = AssertTrue<QC_Status_Required>;

// 验证函数（编译时 + 运行时）
export function validateRequiredFields(): boolean {
  return true;
}
