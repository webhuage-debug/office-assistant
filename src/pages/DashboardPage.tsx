import { Link } from "react-router-dom";
import { BackupPanel } from "@/components/BackupPanel";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { useProjectStore } from "@/store/ProjectStore";
import { centsToCurrency } from "@/utils/money";

export function DashboardPage() {
  const { config, stats, isLoading } = useProjectStore();

  return (
    <div className="page">
      <PageHeader
        title="工作台"
        description="集中查看项目概况、备份数据和快速进入常用页面。"
        actions={
          <>
            <Link className="button button-secondary" to="/projects">
              查看项目
            </Link>
            <Link className="button" to="/projects/new">
              新建项目
            </Link>
          </>
        }
      />

      {isLoading && !stats ? <EmptyState title="正在加载工作台数据..." /> : null}

      <section className="stats-grid">
        <StatCard label="项目总数" value={String(stats?.totalProjects ?? 0)} hint="本地数据库中的全部项目" />
        <StatCard label="跟进中项目数" value={String(stats?.followUpProjects ?? 0)} hint="跟进中 / 方案中 / 报价中" />
        <StatCard label="已签约项目数" value={String(stats?.signedProjects ?? 0)} hint="签约阶段项目" />
        <StatCard
          label="总报价金额"
          value={centsToCurrency(stats?.totalContractAmountCents ?? 0)}
          hint="按项目合同金额自动汇总"
        />
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">本地存储说明</h2>
            <p className="card-subtitle">所有路径都由配置文件管理，后面迁移服务器时只需要改配置和数据适配层。</p>
          </div>
        </div>

        <div className="path-grid">
          <div className="path-item">
            <span className="field-label">数据库路径</span>
            <div className="path-value">{config?.databasePath ?? "-"}</div>
          </div>
          <div className="path-item">
            <span className="field-label">导出目录</span>
            <div className="path-value">{config?.exportDir ?? "-"}</div>
          </div>
          <div className="path-item">
            <span className="field-label">上传目录</span>
            <div className="path-value">{config?.uploadDir ?? "-"}</div>
          </div>
        </div>
      </section>

      <BackupPanel config={config} />
    </div>
  );
}
