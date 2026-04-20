import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import type { ProjectDetail } from "@/types/app";
import { deleteProject, getProjectById } from "@/services/projectService";
import { getErrorMessage } from "@/utils/errors";
import { centsToCurrency } from "@/utils/money";
import { formatDateTime } from "@/utils/date";
import { useProjectStore } from "@/store/ProjectStore";

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { reloadStats } = useProjectStore();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("缺少项目 ID。");
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const detail = await getProjectById(id);
        setProject(detail);
      } catch (caught) {
        setError(getErrorMessage(caught));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

  const handleDelete = async () => {
    if (!project) {
      return;
    }

    const confirmed = window.confirm(`确认删除项目「${project.projectNo} - ${project.customerName}」吗？此操作无法撤销。`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteProject(project.id);
      await reloadStats();
      navigate("/projects");
    } catch (caught) {
      window.alert(getErrorMessage(caught));
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="项目详情"
        description="这里集中展示项目基础信息和报价明细，方便跟进和复查。"
        actions={
          project ? (
            <>
              <Link className="button button-secondary" to={`/projects/${project.id}/edit`}>
                编辑
              </Link>
              <button className="button button-danger" type="button" onClick={() => void handleDelete()}>
                删除
              </button>
            </>
          ) : null
        }
      />

      {loading ? <div className="card-note">正在加载项目详情...</div> : null}
      {error ? <div className="alert alert-error">{error}</div> : null}

      {!loading && !project ? (
        <EmptyState title="未找到项目" description="当前项目不存在，可能已经被删除。">
          <Link className="button" to="/projects">
            返回列表
          </Link>
        </EmptyState>
      ) : null}

      {project ? (
        <>
          <section className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">
                  {project.projectNo} · {project.customerName}
                </h2>
                <p className="card-subtitle">更新时间：{formatDateTime(project.updatedAt)}</p>
              </div>
              <div className="card-muted">{project.followStage}</div>
            </div>

            <div className="detail-grid">
              <div className="detail-item">
                <span className="field-label">联系电话</span>
                <div className="detail-value">{project.phone}</div>
              </div>
              <div className="detail-item">
                <span className="field-label">项目地址</span>
                <div className="detail-value">{project.address}</div>
              </div>
              <div className="detail-item">
                <span className="field-label">房间数量</span>
                <div className="detail-value">{project.roomCount}</div>
              </div>
              <div className="detail-item">
                <span className="field-label">方案类型</span>
                <div className="detail-value">{project.planType}</div>
              </div>
              <div className="detail-item">
                <span className="field-label">合同金额</span>
                <div className="detail-value detail-money">{centsToCurrency(project.contractAmountCents)}</div>
              </div>
              <div className="detail-item detail-item-span-2">
                <span className="field-label">备注信息</span>
                <div className="detail-value detail-remark">{project.remark || "-"}</div>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">报价明细</h2>
                <p className="card-subtitle">自动按单价与数量计算小计。</p>
              </div>
              <div className="card-muted">共 {project.quotationItems.length} 条明细</div>
            </div>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>产品名称</th>
                    <th>品牌</th>
                    <th>型号</th>
                    <th>数量</th>
                    <th>单位</th>
                    <th>单价</th>
                    <th>小计</th>
                  </tr>
                </thead>
                <tbody>
                  {project.quotationItems.length > 0 ? (
                    project.quotationItems.map((item) => (
                      <tr key={item.id}>
                        <td className="table-strong">{item.productName}</td>
                        <td>{item.brand || "-"}</td>
                        <td>{item.model || "-"}</td>
                        <td>{item.quantity}</td>
                        <td>{item.unit}</td>
                        <td className="table-money">{centsToCurrency(item.unitPriceCents)}</td>
                        <td className="table-money">{centsToCurrency(item.subtotalCents)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7}>
                        <div className="table-empty">该项目暂未录入报价明细。</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
