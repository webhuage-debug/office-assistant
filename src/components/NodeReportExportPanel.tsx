import { useState } from "react";
import type { ResolvedAppConfig } from "@/types/app";
import { exportNodeMonthlyReport } from "@/services/nodeService";
import { getErrorMessage } from "@/utils/errors";

interface NodeReportExportPanelProps {
  config: ResolvedAppConfig | null;
  keyword: string;
  onExported?: () => void;
}

function currentMonthLabel(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function NodeReportExportPanel({ config, keyword, onExported }: NodeReportExportPanelProps) {
  const [month, setMonth] = useState(currentMonthLabel());
  const [status, setStatus] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const handleExport = async () => {
    setStatus(null);
    setIsWorking(true);

    try {
      const filters = keyword.trim() ? { keyword: keyword.trim() } : {};
      const result = await exportNodeMonthlyReport({
        filters,
        month: month.trim() || undefined,
        triggerSource: "manual",
      });

      setStatus(`月报已导出：${result.primaryPath}`);
      onExported?.();
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
          <h2 className="card-title">月度文档导出</h2>
          <p className="card-subtitle">
            会基于当前筛选条件导出本月节点月报，生成 Markdown 和 CSV，便于你后面继续复测、整理和归档。
          </p>
        </div>
        <div className="card-muted">导出目录：{config?.exportDir ?? "-"}</div>
      </div>

      <div className="form-grid">
        <label className="field">
          <span className="field-label">报告月份</span>
          <input
            className="field-input"
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
        </label>

        <div className="field">
          <span className="field-label">筛选范围</span>
          <div className="detail-value">{keyword.trim() ? `关键字：${keyword.trim()}` : "全部已授权节点"}</div>
        </div>
      </div>

      <p className="card-note">导出内容包含本月评分概览、推荐节点清单、待清理节点清单和完整 CSV 表格。</p>

      <div className="form-actions">
        <button className="button" type="button" disabled={isWorking} onClick={() => void handleExport()}>
          {isWorking ? "导出中..." : "导出月报"}
        </button>
      </div>

      {status ? <div className="alert">{status}</div> : null}
    </section>
  );
}
