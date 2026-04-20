import type { NodeQualitySummary } from "@/types/node";
import { formatDateTime } from "@/utils/date";

interface NodeQualityTableProps {
  rows: NodeQualitySummary[];
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatLatency(latencyMs?: number | null): string {
  if (latencyMs === null || latencyMs === undefined) {
    return "-";
  }

  return `${latencyMs} ms`;
}

function levelClass(level: string): string {
  switch (level) {
    case "优选":
      return "status-chip status-chip-success";
    case "推荐":
      return "status-chip status-chip-running";
    case "可观察":
      return "status-chip status-chip-warning";
    case "淘汰":
      return "status-chip status-chip-danger";
    default:
      return "status-chip";
  }
}

function formatAddress(row: NodeQualitySummary): string {
  return `${row.host}:${row.port}`;
}

export function NodeQualityTable({ rows }: NodeQualityTableProps) {
  return (
    <div className="table-wrap">
      <table className="table table-compact">
        <thead>
          <tr>
            <th>排名</th>
            <th>节点信息</th>
            <th>测试量</th>
            <th>成功率</th>
            <th>平均延迟</th>
            <th>评分</th>
            <th>等级</th>
            <th>来源</th>
            <th>最近测试</th>
            <th>说明</th>
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row, index) => (
              <tr key={row.id}>
                <td>
                  <div className="table-strong">#{index + 1}</div>
                </td>
                <td>
                  <div className="table-strong">{row.nodeName}</div>
                  <div className="card-muted">
                    {row.protocol} · {formatAddress(row)}
                  </div>
                </td>
                <td>
                  <div className="table-strong">{row.totalTests}</div>
                  <div className="card-muted">
                    成功 {row.successCount} / 失败 {row.failureCount}
                  </div>
                </td>
                <td>{formatPercent(row.successRate)}</td>
                <td>{formatLatency(row.averageLatencyMs)}</td>
                <td className="table-strong">{row.score}</td>
                <td>
                  <span className={levelClass(row.recommendationLevel)}>{row.recommendationLevel}</span>
                </td>
                <td>
                  <div className="table-strong">{row.sourceLabel || "-"}</div>
                  <div className="card-muted table-truncate" title={row.sourceFileName}>
                    {row.sourceFileName || "-"}
                  </div>
                </td>
                <td>{formatDateTime(row.lastTestAt)}</td>
                <td className="table-truncate" title={row.recommendationReason}>
                  {row.recommendationReason}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={10}>
                <div className="table-empty">先完成一次节点测试，评分结果会显示在这里。</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
