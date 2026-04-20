import { useState, type FormEvent } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import type { NodeImportBatchSummary, NodeImportInput } from "@/types/node";

interface NodeImportFormProps {
  uploadDir: string;
  onImport: (input: NodeImportInput) => Promise<NodeImportBatchSummary>;
}

function currentMonthLabel(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function NodeImportForm({ uploadDir, onImport }: NodeImportFormProps) {
  const [sourceLabel, setSourceLabel] = useState(currentMonthLabel());
  const [sourcePath, setSourcePath] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPickingFile, setIsPickingFile] = useState(false);

  const resetForm = () => {
    setSourcePath("");
  };

  const handlePickFile = async () => {
    setError(null);
    setIsPickingFile(true);

    try {
      const selected = await open({
        multiple: false,
        directory: false,
        title: "选择节点清单文件",
        filters: [
          {
            name: "节点清单",
            extensions: ["json", "csv"],
          },
        ],
      });

      const resolvedPath = Array.isArray(selected) ? selected[0] : selected;
      if (!resolvedPath) {
        return;
      }

      setSourcePath(resolvedPath);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "选择文件失败。");
    } finally {
      setIsPickingFile(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!sourcePath.trim()) {
      setError("请先选择要导入的节点文件。");
      return;
    }

    setIsSubmitting(true);

    try {
      await onImport({
        sourcePath: sourcePath.trim(),
        sourceLabel: sourceLabel.trim(),
      });
      resetForm();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "导入节点文件失败。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="form-stack" onSubmit={handleSubmit}>
      <section className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">节点清单导入</h2>
            <p className="card-subtitle">
              仅导入你自己维护或有授权使用的 JSON / CSV 节点清单，导入后会自动去重并保存到本地数据库。
            </p>
          </div>
          <div className="card-muted">存储目录：{uploadDir}</div>
        </div>

        <div className="form-grid">
          <label className="field">
            <span className="field-label">来源标签</span>
            <input
              className="field-input"
              value={sourceLabel}
              onChange={(event) => setSourceLabel(event.target.value)}
              placeholder="例如：2026-04 / 手动导入"
            />
          </label>

          <div className="field">
            <span className="field-label">文件类型</span>
            <div className="detail-value">JSON / CSV</div>
          </div>

          <label className="field field-span-2">
            <span className="field-label">节点文件本机路径</span>
            <div className="input-inline-group">
              <input
                className="field-input"
                value={sourcePath}
                onChange={(event) => setSourcePath(event.target.value)}
                placeholder="例如：C:\\Users\\xxx\\Desktop\\nodes.json"
              />
              <button type="button" className="button button-secondary" onClick={() => void handlePickFile()}>
                {isPickingFile ? "选择中..." : "选择文件"}
              </button>
            </div>
          </label>
        </div>

        <div className="card-note">
          导入后文件会复制到独立的节点目录，方便后续复测、回溯和迁移。当前目录：{uploadDir}
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}

        <div className="form-actions">
          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "导入中..." : "导入节点清单"}
          </button>
        </div>
      </section>
    </form>
  );
}
