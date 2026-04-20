import { Link } from "react-router-dom";
import type { ProjectSummary } from "@/types/app";
import { formatDateTime } from "@/utils/date";
import { centsToCurrency } from "@/utils/money";

interface ProjectTableProps {
  projects: ProjectSummary[];
  onDelete: (project: ProjectSummary) => void;
}

export function ProjectTable({ projects, onDelete }: ProjectTableProps) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>项目编号</th>
            <th>客户姓名</th>
            <th>联系电话</th>
            <th>项目地址</th>
            <th>跟进阶段</th>
            <th>合同金额</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {projects.length > 0 ? (
            projects.map((project) => (
              <tr key={project.id}>
                <td className="table-strong">{project.projectNo}</td>
                <td>{project.customerName}</td>
                <td>{project.phone}</td>
                <td className="table-truncate">{project.address}</td>
                <td>{project.followStage}</td>
                <td className="table-money">{centsToCurrency(project.contractAmountCents)}</td>
                <td>{formatDateTime(project.updatedAt)}</td>
                <td>
                  <div className="table-actions">
                    <Link className="button button-link" to={`/projects/${project.id}`}>
                      详情
                    </Link>
                    <Link className="button button-link" to={`/projects/${project.id}/edit`}>
                      编辑
                    </Link>
                    <button
                      type="button"
                      className="button button-link button-danger"
                      onClick={() => onDelete(project)}
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={8}>
                <div className="table-empty">暂无项目，请先创建第一条记录。</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
