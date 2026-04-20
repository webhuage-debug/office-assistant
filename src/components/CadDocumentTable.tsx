import { Link } from "react-router-dom";
import type { CadDocumentSummary } from "@/types/cad";
import { formatDateTime } from "@/utils/date";
import { formatFileSize } from "@/utils/file";

interface CadDocumentTableProps {
  documents: CadDocumentSummary[];
  onDelete: (document: CadDocumentSummary) => void;
  onParse: (document: CadDocumentSummary) => void;
}

function renderParseSummary(document: CadDocumentSummary): string {
  const summary = document.latestParseSummary;
  if (!summary) {
    return "-";
  }

  return `实体 ${summary.entityCount} / 图层 ${summary.layerCount} / 线 ${summary.lineCount} / 文字 ${summary.textCount}`;
}

export function CadDocumentTable({ documents, onDelete, onParse }: CadDocumentTableProps) {
  return (
    <div className="table-wrap">
      <table className="table table-compact">
        <thead>
          <tr>
            <th>关联项目</th>
            <th>文件名</th>
            <th>类型</th>
            <th>状态</th>
            <th>解析摘要</th>
            <th>任务数</th>
            <th>存储路径</th>
            <th>备注</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {documents.length > 0 ? (
            documents.map((document) => (
              <tr key={document.id}>
                <td>
                  <div className="table-strong">
                    {document.projectNo && document.projectId ? (
                      <Link to={`/projects/${document.projectId}`} className="button button-link">
                        {document.projectNo}
                      </Link>
                    ) : (
                      "未关联"
                    )}
                  </div>
                  <div className="card-muted">{document.customerName ?? "-"}</div>
                </td>
                <td>
                  <div className="table-strong">{document.originalFileName}</div>
                  <div className="card-muted">{formatFileSize(document.fileSizeBytes)}</div>
                </td>
                <td>{document.sourceType}</td>
                <td>{document.status}</td>
                <td className="table-truncate" title={renderParseSummary(document)}>
                  {renderParseSummary(document)}
                </td>
                <td>{document.analysisJobCount}</td>
                <td className="table-truncate" title={document.storagePath}>
                  {document.storagePath}
                </td>
                <td className="table-truncate" title={document.note}>
                  {document.note || "-"}
                </td>
                <td>{formatDateTime(document.updatedAt)}</td>
                <td>
                  <div className="table-actions">
                    {document.sourceType.toUpperCase() === "DXF" ? (
                      <button type="button" className="button button-link" onClick={() => onParse(document)}>
                        解析
                      </button>
                    ) : null}
                    <button type="button" className="button button-link button-danger" onClick={() => onDelete(document)}>
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={10}>
                <div className="table-empty">当前还没有 CAD 文件登记记录。</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
