import type { NodeTestRunSummary } from "@/types/node";
import { formatDateTime } from "@/utils/date";

interface NodeTestRunTableProps {
  runs: NodeTestRunSummary[];
  activeRunId?: string | null;
  onSelectRun: (run: NodeTestRunSummary) => void;
}

function formatDuration(durationMs: number): string {
  if (durationMs <= 0) {
    return "0 ms";
  }

  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }

  return `${(durationMs / 1000).toFixed(1)} s`;
}

function getStatusLabel(status: string): string {
  switch (status.toLowerCase()) {
    case "running":
      return "进行中";
    case "completed":
      return "已完成";
    case "failed":
      return "失败";
    default:
      return status || "-";
  }
}

function getStatusClass(status: string): string {
  switch (status.toLowerCase()) {
    case "running":
      return "status-chip status-chip-running";
    case "completed":
      return "status-chip status-chip-success";
    case "failed":
      return "status-chip status-chip-danger";
    default:
      return "status-chip";
  }
}

export function NodeTestRunTable({ runs, activeRunId, onSelectRun }: NodeTestRunTableProps) {
  return (
    <div className="table-wrap">
      <table className="table table-compact">
        <thead>
          <tr>
            <th>触发方式</th>
            <th>范围摘要</th>
            <th>目标数</th>
            <th>成功 / 失败</th>
            <th>耗时</th>
            <th>状态</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {runs.length > 0 ? (
            runs.map((run) => (
              <tr key={run.id} className={run.id === activeRunId ? "table-row-active" : undefined}>
                <td>
                  <div className="table-strong">{run.triggerSource || "-"}</div>
                </td>
                <td className="table-truncate" title={run.scopeSummary}>
                  {run.scopeSummary || "-"}
                </td>
                <td>{run.targetCount}</td>
                <td>
                  {run.successCount} / {run.failureCount}
                </td>
                <td>{formatDuration(run.durationMs)}</td>
                <td>
                  <span className={getStatusClass(run.status)}>{getStatusLabel(run.status)}</span>
                </td>
                <td>{formatDateTime(run.createdAt)}</td>
                <td>
                  <button type="button" className="button button-link" onClick={() => onSelectRun(run)}>
                    查看结果
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={8}>
                <div className="table-empty">当前还没有节点测试记录。</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
