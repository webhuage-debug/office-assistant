import type { NodeTestResultSummary } from "@/types/node";
import { formatDateTime } from "@/utils/date";

interface NodeTestResultTableProps {
  results: NodeTestResultSummary[];
}

function formatAddress(result: NodeTestResultSummary): string {
  return `${result.host}:${result.port}`;
}

function formatLatency(latencyMs?: number | null): string {
  if (latencyMs === null || latencyMs === undefined) {
    return "-";
  }

  return `${latencyMs} ms`;
}

function getStatusLabel(success: boolean): string {
  return success ? "可用" : "失败";
}

function getStatusClass(success: boolean): string {
  return success ? "status-chip status-chip-success" : "status-chip status-chip-danger";
}

export function NodeTestResultTable({ results }: NodeTestResultTableProps) {
  return (
    <div className="table-wrap">
      <table className="table table-compact">
        <thead>
          <tr>
            <th>顺序</th>
            <th>节点名称</th>
            <th>协议</th>
            <th>地址</th>
            <th>测试结果</th>
            <th>延迟</th>
            <th>错误信息</th>
            <th>创建时间</th>
          </tr>
        </thead>
        <tbody>
          {results.length > 0 ? (
            results.map((result) => (
              <tr key={result.id}>
                <td>{result.resultOrder + 1}</td>
                <td>
                  <div className="table-strong">{result.nodeName}</div>
                  <div className="card-muted">{result.nodeId}</div>
                </td>
                <td>{result.protocol}</td>
                <td>{formatAddress(result)}</td>
                <td>
                  <span className={getStatusClass(result.success)}>{getStatusLabel(result.success)}</span>
                </td>
                <td>{formatLatency(result.latencyMs)}</td>
                <td className="table-truncate" title={result.errorMessage}>
                  {result.errorMessage || "-"}
                </td>
                <td>{formatDateTime(result.createdAt)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={8}>
                <div className="table-empty">选择一个测试批次后，结果会显示在这里。</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
