import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import {
  getNodeReportComparison,
  listNodeReportSnapshots,
} from "@/services/nodeService";
import type {
  NodeReportComparisonSummary,
  NodeReportSnapshotSummary,
} from "@/types/node";
import { formatDateTime } from "@/utils/date";
import { getErrorMessage } from "@/utils/errors";

interface NodeReportHistoryPanelProps {
  refreshToken?: number;
}

function formatSignedNumber(value: number): string {
  if (value > 0) {
    return `+${value}`;
  }

  return String(value);
}

function formatRate(value?: number | null): string {
  if (value === null || value === undefined) {
    return "-";
  }

  return `${Math.round(value * 100)}%`;
}

function changeChipClass(changeType: string): string {
  switch (changeType) {
    case "上升":
      return "status-chip status-chip-success";
    case "下降":
      return "status-chip status-chip-danger";
    case "新增":
      return "status-chip status-chip-running";
    case "移除":
      return "status-chip status-chip-warning";
    default:
      return "status-chip";
  }
}

function scoreChangeClass(value: number): string {
  if (value > 0) {
    return "status-chip status-chip-success";
  }

  if (value < 0) {
    return "status-chip status-chip-danger";
  }

  return "status-chip";
}

function SnapshotTable({ snapshots }: { snapshots: NodeReportSnapshotSummary[] }) {
  return (
    <div className="table-wrap">
      <table className="table table-compact">
        <thead>
          <tr>
            <th>月份</th>
            <th>触发</th>
            <th>节点</th>
            <th>推荐</th>
            <th>优选</th>
            <th>平均分</th>
            <th>最高分</th>
            <th>生成时间</th>
            <th>范围说明</th>
          </tr>
        </thead>
        <tbody>
          {snapshots.length > 0 ? (
            snapshots.map((snapshot) => (
              <tr key={snapshot.id}>
                <td>
                  <div className="table-strong">{snapshot.reportMonth}</div>
                </td>
                <td>{snapshot.triggerSource || "-"}</td>
                <td>{snapshot.totalRankedNodes}</td>
                <td>{snapshot.recommendedNodes}</td>
                <td>{snapshot.excellentNodes}</td>
                <td>{snapshot.averageScore}</td>
                <td>{snapshot.topScore}</td>
                <td>{formatDateTime(snapshot.createdAt)}</td>
                <td className="table-truncate" title={snapshot.scopeSummary}>
                  {snapshot.scopeSummary || "-"}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={9}>
                <div className="table-empty">暂无月报快照。</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ChangeTable({ comparison }: { comparison: NodeReportComparisonSummary }) {
  return (
    <div className="table-wrap">
      <table className="table table-compact">
        <thead>
          <tr>
            <th>节点</th>
            <th>变化</th>
            <th>当前分</th>
            <th>上月分</th>
            <th>分差</th>
            <th>当前成功率</th>
            <th>上月成功率</th>
            <th>当前等级</th>
            <th>上月等级</th>
          </tr>
        </thead>
        <tbody>
          {comparison.changeRows.length > 0 ? (
            comparison.changeRows.map((row) => (
              <tr key={`${row.nodeId}-${row.changeType}`}>
                <td>
                  <div className="table-strong">{row.nodeName}</div>
                  <div className="card-muted">
                    {row.protocol} · {row.host}:{row.port}
                  </div>
                </td>
                <td>
                  <span className={changeChipClass(row.changeType)}>{row.changeType}</span>
                </td>
                <td>{row.currentScore ?? "-"}</td>
                <td>{row.previousScore ?? "-"}</td>
                <td>
                  <span className={scoreChangeClass(row.scoreDelta)}>{formatSignedNumber(row.scoreDelta)}</span>
                </td>
                <td>{formatRate(row.currentSuccessRate)}</td>
                <td>{formatRate(row.previousSuccessRate)}</td>
                <td>{row.currentRecommendationLevel || "-"}</td>
                <td>{row.previousRecommendationLevel || "-"}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={9}>
                <div className="table-empty">当前还没有足够的历史记录可供对比。</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function NodeReportHistoryPanel({ refreshToken = 0 }: NodeReportHistoryPanelProps) {
  const [snapshots, setSnapshots] = useState<NodeReportSnapshotSummary[]>([]);
  const [comparison, setComparison] = useState<NodeReportComparisonSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [nextSnapshots, nextComparison] = await Promise.all([
        listNodeReportSnapshots(8),
        getNodeReportComparison(),
      ]);

      setSnapshots(nextSnapshots);
      setComparison(nextComparison);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [refreshToken]);

  const latestSnapshot = snapshots[0] ?? comparison?.currentSnapshot ?? null;
  const previousSnapshot = comparison?.previousSnapshot ?? null;

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">月报历史与对比</h2>
          <p className="card-subtitle">
            这里会保留每次导出的月报快照，并自动对比最近两次结果。后面接 Hermes 时，也可以直接复用这套快照结构。
          </p>
        </div>
        <button className="button button-secondary" type="button" onClick={() => void loadData()}>
          刷新历史
        </button>
      </div>

      {loading && snapshots.length === 0 && !comparison ? <EmptyState title="正在加载月报历史..." /> : null}
      {error ? <div className="alert alert-error">{error}</div> : null}

      {!loading && snapshots.length === 0 ? (
        <EmptyState
          title="还没有月报快照"
          description="先导出一次月报，系统会自动保存快照并在这里生成跨月对比。"
        />
      ) : (
        <>
          {latestSnapshot ? (
            <section className="stats-grid">
              <StatCard label="最新月份" value={latestSnapshot.reportMonth} hint="最近一次导出的月报月份" />
              <StatCard label="快照数量" value={String(snapshots.length)} hint="已保存的月报记录" />
              <StatCard label="最新节点数" value={String(latestSnapshot.totalRankedNodes)} hint="最新月报统计到的节点数量" />
              <StatCard label="最新平均分" value={String(latestSnapshot.averageScore)} hint="最新月报的平均评分" />
            </section>
          ) : null}

          {comparison ? (
            <>
              <section className="stats-grid">
                <StatCard
                  label="节点变化"
                  value={formatSignedNumber(comparison.totalNodesDelta)}
                  hint={previousSnapshot ? `${comparison.currentSnapshot.reportMonth} 对比 ${previousSnapshot.reportMonth}` : "当前快照基线"}
                />
                <StatCard
                  label="平均分变化"
                  value={formatSignedNumber(comparison.averageScoreDelta)}
                  hint="当前月报与上一月的平均分差值"
                />
                <StatCard
                  label="推荐变化"
                  value={formatSignedNumber(comparison.recommendedDelta)}
                  hint="达到推荐阈值的节点变化"
                />
                <StatCard
                  label="优选变化"
                  value={formatSignedNumber(comparison.excellentDelta)}
                  hint="高分节点变化"
                />
                <StatCard
                  label="新增 / 移除"
                  value={`${comparison.addedNodes} / ${comparison.removedNodes}`}
                  hint="本次对比中的节点进出变化"
                />
                <StatCard
                  label="上升 / 下降"
                  value={`${comparison.improvedNodes} / ${comparison.declinedNodes}`}
                  hint="评分有明显变化的节点"
                />
              </section>

              {!previousSnapshot ? (
                <div className="card-note">目前只有一份月报快照，等下次导出后会自动生成跨月对比。</div>
              ) : null}

              <div className="card-subtitle" style={{ marginTop: "1rem" }}>
                最近快照
              </div>
              <SnapshotTable snapshots={snapshots} />

              {comparison.changeRows.length > 0 ? (
                <>
                  <div className="card-subtitle" style={{ marginTop: "1rem" }}>
                    变化节点
                  </div>
                  <ChangeTable comparison={comparison} />
                </>
              ) : null}
            </>
          ) : null}
        </>
      )}
    </section>
  );
}
