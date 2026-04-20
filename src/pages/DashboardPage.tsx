import { Link } from "react-router-dom";
import { BackupPanel } from "@/components/BackupPanel";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { useProjectStore } from "@/store/ProjectStore";
import { centsToCurrency } from "@/utils/money";

export function DashboardPage() {
  const { config, stats, isLoading, reloadStats } = useProjectStore();

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
            <Link className="button button-secondary" to="/cad">
              CAD工作台
            </Link>
            <Link className="button button-secondary" to="/nodes">
              节点台账
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

      <BackupPanel config={config} onImported={() => reloadStats()} />

      <section className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">CAD 识别预留</h2>
            <p className="card-subtitle">
              当前项目已经把 CAD 文件登记、任务状态和存储目录的底层架子搭好，后续只需要往这里接识别服务。
            </p>
          </div>
          <Link className="button button-secondary" to="/cad">
            打开 CAD 工作台
          </Link>
        </div>

        <div className="detail-grid">
          <div className="detail-item">
            <span className="field-label">文件登记</span>
            <div className="detail-value">本地复制并归档到独立目录</div>
          </div>
          <div className="detail-item">
            <span className="field-label">识别输入</span>
            <div className="detail-value">DWG / DXF / PDF / 图片</div>
          </div>
          <div className="detail-item detail-item-span-2">
            <span className="field-label">后续扩展方向</span>
            <div className="detail-value detail-remark">
              图层识别、房间识别、设备识别、材料清单生成、报价草稿生成、人工复核保存到项目。
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">节点台账预留</h2>
            <p className="card-subtitle">
              这里先把你自己维护或有授权的节点清单整理起来，后面再顺着这份台账接测试、去重和月度文档。
            </p>
          </div>
          <Link className="button button-secondary" to="/nodes">
            打开节点台账
          </Link>
        </div>

        <div className="detail-grid">
          <div className="detail-item">
            <span className="field-label">导入方式</span>
            <div className="detail-value">JSON / CSV 清单导入</div>
          </div>
          <div className="detail-item">
            <span className="field-label">数据范围</span>
            <div className="detail-value">仅管理你自己的授权节点数据</div>
          </div>
          <div className="detail-item detail-item-span-2">
            <span className="field-label">后续顺序</span>
            <div className="detail-value detail-remark">节点测试器、去重评分、月报导出、历史对比和定时任务。</div>
          </div>
        </div>
      </section>
    </div>
  );
}
