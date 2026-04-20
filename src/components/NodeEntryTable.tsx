import type { NodeEntrySummary } from "@/types/node";
import { formatDateTime } from "@/utils/date";

interface NodeEntryTableProps {
  entries: NodeEntrySummary[];
  onDelete: (entry: NodeEntrySummary) => void;
}

function formatAddress(entry: NodeEntrySummary): string {
  return `${entry.host}:${entry.port}`;
}

export function NodeEntryTable({ entries, onDelete }: NodeEntryTableProps) {
  return (
    <div className="table-wrap">
      <table className="table table-compact">
        <thead>
          <tr>
            <th>节点名称</th>
            <th>协议</th>
            <th>地址</th>
            <th>来源标签</th>
            <th>来源文件</th>
            <th>备注</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {entries.length > 0 ? (
            entries.map((entry) => (
              <tr key={entry.id}>
                <td>
                  <div className="table-strong">{entry.nodeName}</div>
                  <div className="card-muted">{entry.createdAt ? formatDateTime(entry.createdAt) : "-"}</div>
                </td>
                <td>{entry.protocol}</td>
                <td>{formatAddress(entry)}</td>
                <td>{entry.sourceLabel || "-"}</td>
                <td className="table-truncate" title={entry.sourceFileName}>
                  {entry.sourceFileName || "-"}
                </td>
                <td className="table-truncate" title={entry.remark}>
                  {entry.remark || "-"}
                </td>
                <td>{formatDateTime(entry.updatedAt)}</td>
                <td>
                  <div className="table-actions">
                    <button type="button" className="button button-link button-danger" onClick={() => onDelete(entry)}>
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={8}>
                <div className="table-empty">当前还没有节点导入记录。</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
