import { useMemo, useState } from "react";
import type { ResolvedAppConfig } from "@/types/app";
import {
  exportCsvBackup,
  exportDatabaseBackup,
  exportJsonBackup,
  importJsonBackup,
} from "@/services/exportService";
import { getErrorMessage } from "@/utils/errors";

interface BackupPanelProps {
  config: ResolvedAppConfig | null;
}

export function BackupPanel({ config }: BackupPanelProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const exportDirectory = useMemo(() => config?.exportDir ?? "-", [config]);

  const runAction = async (task: () => Promise<{ primaryPath: string }>) => {
    setIsWorking(true);
    setStatus(null);

    try {
      const result = await task();
      setStatus(`操作成功：${result.primaryPath}`);
    } catch (caught) {
      setStatus(getErrorMessage(caught));
    } finally {
      setIsWorking(false);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setStatus("请先选择一个 JSON 备份文件。");
      return;
    }

    setIsWorking(true);
    setStatus(null);

    try {
      const content = await file.text();
      const result = await importJsonBackup(content);
      setStatus(`导入成功：${result.primaryPath}`);
    } catch (caught) {
      setStatus(getErrorMessage(caught));
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">数据备份与恢复</h2>
          <p className="card-subtitle">导出与恢复都走服务层，后续切换 SQLite / MySQL / PostgreSQL 时可以少改前端。</p>
        </div>
        <div className="card-muted">导出目录：{exportDirectory}</div>
      </div>

      <div className="backup-actions">
        <button className="button button-secondary" type="button" disabled={isWorking} onClick={() => void runAction(exportJsonBackup)}>
          导出 JSON
        </button>
        <button className="button button-secondary" type="button" disabled={isWorking} onClick={() => void runAction(exportCsvBackup)}>
          导出 CSV
        </button>
        <button className="button button-secondary" type="button" disabled={isWorking} onClick={() => void runAction(exportDatabaseBackup)}>
          导出数据库
        </button>
      </div>

      <div className="backup-import">
        <label className="field">
          <span className="field-label">恢复 JSON 备份</span>
          <input
            className="field-input"
            type="file"
            accept=".json,application/json"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <button className="button" type="button" disabled={isWorking} onClick={() => void handleImport()}>
          导入恢复
        </button>
      </div>

      <p className="card-note">JSON 备份会完整保留项目与报价明细，适合换电脑或重装后恢复数据。</p>

      {status ? <div className="alert">{status}</div> : null}
    </section>
  );
}
