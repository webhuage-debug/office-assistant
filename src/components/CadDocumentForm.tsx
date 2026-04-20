import { useState, type FormEvent } from "react";
import type { ProjectSummary } from "@/types/app";
import {
  CAD_SOURCE_TYPE_OPTIONS,
  type CadDocumentCreateInput,
  type CadSourceTypeValue,
} from "@/types/cad";

interface CadDocumentFormProps {
  projects: ProjectSummary[];
  uploadDir: string;
  onSubmit: (input: CadDocumentCreateInput) => Promise<void>;
}

export function CadDocumentForm({ projects, uploadDir, onSubmit }: CadDocumentFormProps) {
  const [projectId, setProjectId] = useState("");
  const [sourceType, setSourceType] = useState<CadSourceTypeValue>("DWG");
  const [sourcePath, setSourcePath] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setProjectId("");
    setSourceType("DWG");
    setSourcePath("");
    setNote("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!sourcePath.trim()) {
      setError("请填写 CAD 文件的本机完整路径。");
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        projectId: projectId.trim() || undefined,
        sourcePath: sourcePath.trim(),
        sourceType,
        note: note.trim(),
      });
      resetForm();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "登记 CAD 文件失败。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="form-stack" onSubmit={handleSubmit}>
      <section className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">CAD 文件登记</h2>
            <p className="card-subtitle">
              先把 CAD 文件登记到本地目录，后续识别引擎接入后可以直接沿着这条链路生成报价。
            </p>
          </div>
          <div className="card-muted">存储目录：{uploadDir}</div>
        </div>

        <div className="form-grid">
          <label className="field">
            <span className="field-label">关联项目</span>
            <select className="field-input" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
              <option value="">未关联</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.projectNo} · {project.customerName}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">文件类型</span>
            <select className="field-input" value={sourceType} onChange={(event) => setSourceType(event.target.value as CadSourceTypeValue)}>
              {CAD_SOURCE_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="field field-span-2">
            <span className="field-label">CAD 文件本机路径</span>
            <input
              className="field-input"
              value={sourcePath}
              onChange={(event) => setSourcePath(event.target.value)}
              placeholder="例如：C:\\Users\\xxx\\Desktop\\方案图.dwg"
            />
          </label>

          <label className="field field-span-2">
            <span className="field-label">备注信息</span>
            <textarea
              className="field-input field-textarea"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="例如：主方案、备用方案、客户已确认版本"
            />
          </label>
        </div>

        <div className="card-note">
          当前版本先支持“登记 + 存档 + 状态记录”，后续再接 CAD 解析、图层识别和报价生成。
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}

        <div className="form-actions">
          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "登记中..." : "登记 CAD 文件"}
          </button>
        </div>
      </section>
    </form>
  );
}
