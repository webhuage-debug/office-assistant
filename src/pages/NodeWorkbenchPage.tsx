import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { NodeEntryTable } from "@/components/NodeEntryTable";
import { NodeImportForm } from "@/components/NodeImportForm";
import { NodeQualityTable } from "@/components/NodeQualityTable";
import { HermesTaskPanel } from "@/components/HermesTaskPanel";
import { HermesResultPanel } from "@/components/HermesResultPanel";
import { NodeMonthlyJobPanel } from "@/components/NodeMonthlyJobPanel";
import { NodeReportExportPanel } from "@/components/NodeReportExportPanel";
import { NodeReportHistoryPanel } from "@/components/NodeReportHistoryPanel";
import { NodeTestResultTable } from "@/components/NodeTestResultTable";
import { NodeTestRunTable } from "@/components/NodeTestRunTable";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import {
  deleteNodeEntry,
  getNodeOverviewStats,
  getNodeQualityStats,
  importNodeEntries,
  listNodeEntries,
  listNodeQualityRankings,
  listNodeTestResults,
  listNodeTestRuns,
  runNodeTests,
} from "@/services/nodeService";
import { useProjectStore } from "@/store/ProjectStore";
import type {
  NodeEntrySummary,
  NodeImportBatchSummary,
  NodeListFilters,
  NodeOverviewStats,
  NodeQualityStats,
  NodeQualitySummary,
  NodeTestResultSummary,
  NodeTestRunSummary,
} from "@/types/node";
import { getErrorMessage } from "@/utils/errors";

function formatDuration(durationMs: number): string {
  if (durationMs <= 0) {
    return "0 ms";
  }

  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }

  return `${(durationMs / 1000).toFixed(1)} s`;
}

export function NodeWorkbenchPage() {
  const { config } = useProjectStore();
  const [entries, setEntries] = useState<NodeEntrySummary[]>([]);
  const [stats, setStats] = useState<NodeOverviewStats | null>(null);
  const [keyword, setKeyword] = useState("");
  const [lastImport, setLastImport] = useState<NodeImportBatchSummary | null>(null);
  const [testRuns, setTestRuns] = useState<NodeTestRunSummary[]>([]);
  const [activeRun, setActiveRun] = useState<NodeTestRunSummary | null>(null);
  const [activeResults, setActiveResults] = useState<NodeTestResultSummary[]>([]);
  const [qualityStats, setQualityStats] = useState<NodeQualityStats | null>(null);
  const [qualityRows, setQualityRows] = useState<NodeQualitySummary[]>([]);
  const [reportRefreshToken, setReportRefreshToken] = useState(0);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const visibleSuccessCount = activeResults.filter((result) => result.success).length;
  const visibleFailureCount = activeResults.filter((result) => !result.success).length;
  const failedNodeCount = new Set(activeResults.filter((result) => !result.success).map((result) => result.nodeId)).size;

  const loadWorkspace = async (search = keyword) => {
    setLoading(true);
    setError(null);

    try {
      const nextFilters: NodeListFilters = search.trim() ? { keyword: search.trim() } : {};
      const [nextEntries, nextStats, nextRuns, nextQualityStats, nextQualityRows] = await Promise.all([
        listNodeEntries(nextFilters),
        getNodeOverviewStats(),
        listNodeTestRuns(10),
        getNodeQualityStats(nextFilters),
        listNodeQualityRankings(nextFilters, 20),
      ]);

      setEntries(nextEntries);
      setStats(nextStats);
      setTestRuns(nextRuns);
      setQualityStats(nextQualityStats);
      setQualityRows(nextQualityRows);

      if (nextRuns.length > 0) {
        const latestRun = nextRuns[0];
        setActiveRun(latestRun);
        setActiveResults(await listNodeTestResults(latestRun.id));
      } else {
        setActiveRun(null);
        setActiveResults([]);
      }
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkspace();
  }, []);

  const handleImport = async (input: Parameters<typeof importNodeEntries>[0]) => {
    const summary = await importNodeEntries(input);
    setLastImport(summary);
    await loadWorkspace();
    return summary;
  };

  const handleDelete = async (entry: NodeEntrySummary) => {
    const confirmed = window.confirm(`确定删除节点「${entry.nodeName}」吗？`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteNodeEntry(entry.id);
      await loadWorkspace();
    } catch (caught) {
      window.alert(getErrorMessage(caught));
    }
  };

  const handleSearchSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await loadWorkspace(keyword);
  };

  const handleResetSearch = async () => {
    setKeyword("");
    await loadWorkspace("");
  };

  const handleRunTests = async () => {
    setTesting(true);
    setError(null);

    try {
      const nextFilters: NodeListFilters = keyword.trim() ? { keyword: keyword.trim() } : {};
      const detail = await runNodeTests({
        filters: nextFilters,
        triggerSource: "manual",
      });

      setActiveRun(detail.run);
      setActiveResults(detail.results);
      await loadWorkspace(keyword);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setTesting(false);
    }
  };

  const handleSelectRun = async (run: NodeTestRunSummary) => {
    setActiveRun(run);
    setError(null);

    try {
      const results = await listNodeTestResults(run.id);
      setActiveResults(results);
    } catch (caught) {
      setError(getErrorMessage(caught));
    }
  };

  const handleDeleteNode = async (result: NodeTestResultSummary) => {
    const confirmed = window.confirm(`确定删除测试不通的节点「${result.nodeName}」吗？`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteNodeEntry(result.nodeId);
      await loadWorkspace(keyword);
    } catch (caught) {
      window.alert(getErrorMessage(caught));
    }
  };

  const handleDeleteFailedNodes = async () => {
    const failedNodes = activeResults.filter((result) => !result.success);
    const uniqueFailedNodes = Array.from(new Map(failedNodes.map((result) => [result.nodeId, result])).values());

    if (uniqueFailedNodes.length === 0) {
      window.alert("当前测试结果里没有需要删除的不通节点。");
      return;
    }

    const confirmed = window.confirm(`确定删除本次测试中 ${uniqueFailedNodes.length} 个不通节点吗？`);
    if (!confirmed) {
      return;
    }

    try {
      for (const result of uniqueFailedNodes) {
        await deleteNodeEntry(result.nodeId);
      }
      await loadWorkspace(keyword);
    } catch (caught) {
      window.alert(getErrorMessage(caught));
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="节点台账"
        description="只管理你自己维护或有授权的节点清单。先把导入、去重、测试和历史留存做好，后面再往月报和自动化扩展。"
        actions={
          <>
            <Link className="button button-secondary" to="/">
              返回工作台
            </Link>
            <button className="button button-secondary" type="button" onClick={() => void handleRunTests()} disabled={testing}>
              {testing ? "测试中..." : "测试当前筛选"}
            </button>
            <button className="button" type="button" onClick={() => void loadWorkspace()}>
              刷新
            </button>
          </>
        }
      />

      <section className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">当前阶段目标</h2>
            <p className="card-subtitle">
              先把节点清单整理成统一结构，留好批量测试、评分和月度文档输出的底层入口，后面继续往自动化处理串。
            </p>
          </div>
        </div>

        <div className="detail-grid">
          <div className="detail-item">
            <span className="field-label">导入范围</span>
            <div className="detail-value">你自己维护或有授权的 JSON / CSV 节点清单</div>
          </div>
          <div className="detail-item">
            <span className="field-label">存储目录</span>
            <div className="detail-value">{config?.uploadDir ? `${config.uploadDir}\\nodes` : "-"}</div>
          </div>
          <div className="detail-item detail-item-span-2">
            <span className="field-label">后续顺序</span>
            <div className="detail-value detail-remark">节点测试器，去重评分，月度文档生成，定时任务和历史对比</div>
          </div>
        </div>
      </section>

      {loading && !stats ? <EmptyState title="正在加载节点台账..." /> : null}
      {error ? <div className="alert alert-error">{error}</div> : null}

      <section className="stats-grid">
        <StatCard label="节点总数" value={String(stats?.totalNodes ?? 0)} hint="当前已落库的唯一节点" />
        <StatCard label="导入批次" value={String(stats?.importBatches ?? 0)} hint="节点清单导入次数" />
        <StatCard label="来源标签数" value={String(stats?.sourceLabels ?? 0)} hint="不同导入来源标签数量" />
        <StatCard label="协议种类" value={String(stats?.protocolCount ?? 0)} hint="当前节点覆盖的协议类型" />
        <StatCard label="最近导入条数" value={String(stats?.latestBatchRows ?? 0)} hint="最新一次导入的总记录数" />
      </section>

      {lastImport ? (
        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">最近导入结果</h2>
              <p className="card-subtitle">这次导入已经写入本地数据库，后面复测和文档都可以直接沿用这份数据。</p>
            </div>
          </div>

          <div className="detail-grid">
            <div className="detail-item">
              <span className="field-label">文件名</span>
              <div className="detail-value">{lastImport.sourceFileName}</div>
            </div>
            <div className="detail-item">
              <span className="field-label">总条数</span>
              <div className="detail-value">{lastImport.totalRows}</div>
            </div>
            <div className="detail-item">
              <span className="field-label">新增 / 更新</span>
              <div className="detail-value">
                {lastImport.insertedRows} / {lastImport.updatedRows}
              </div>
            </div>
            <div className="detail-item">
              <span className="field-label">重复 / 无效</span>
              <div className="detail-value">
                {lastImport.duplicateRows} / {lastImport.invalidRows}
              </div>
            </div>
            <div className="detail-item detail-item-span-2">
              <span className="field-label">归档路径</span>
              <div className="detail-value detail-remark">{lastImport.copiedFilePath}</div>
            </div>
          </div>
        </section>
      ) : null}

      <NodeImportForm uploadDir={config?.uploadDir ? `${config.uploadDir}\\nodes` : "-"} onImport={handleImport} />

      <section className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">节点搜索</h2>
            <p className="card-subtitle">先按关键字快速筛选节点名称、地址、备注和来源文件，再继续做测试或评分整理。</p>
          </div>
        </div>

        <form className="filter-form" onSubmit={(event) => void handleSearchSubmit(event)}>
          <label className="field">
            <span className="field-label">关键字</span>
            <input
              className="field-input"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="节点名称 / 地址 / 备注 / 来源标签"
            />
          </label>

          <div className="filter-actions">
            <button className="button" type="submit">
              搜索
            </button>
            <button className="button button-secondary" type="button" onClick={() => void handleResetSearch()}>
              重置
            </button>
          </div>
        </form>
      </section>

      {!loading && !error && entries.length === 0 ? (
        <EmptyState
          title="还没有节点记录"
          description="先导入一份 JSON 或 CSV 节点清单，系统会自动去重并保存到本地数据库。"
        />
      ) : (
        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">节点列表</h2>
              <p className="card-subtitle">当前只做台账管理，不碰公开采集。后面测试和评分都会基于这里的记录继续扩展。</p>
            </div>
          </div>

          <NodeEntryTable entries={entries} onDelete={handleDelete} />
        </section>
      )}

      <section className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">节点测试历史</h2>
            <p className="card-subtitle">每次批量测试都会落库，后面可以继续按月复测、去重和生成报告。</p>
          </div>
        </div>

        <NodeTestRunTable runs={testRuns} activeRunId={activeRun?.id ?? null} onSelectRun={handleSelectRun} />
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">当前测试结果</h2>
            <p className="card-subtitle">默认显示最近一次测试批次。点击历史记录中的“查看结果”也会切换这里的内容。</p>
          </div>
        </div>

        {activeRun ? (
          <>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="field-label">触发方式</span>
                <div className="detail-value">{activeRun.triggerSource || "-"}</div>
              </div>
              <div className="detail-item">
                <span className="field-label">测试状态</span>
                <div className="detail-value">{activeRun.status}</div>
              </div>
              <div className="detail-item">
                <span className="field-label">范围摘要</span>
                <div className="detail-value detail-remark">{activeRun.scopeSummary || "-"}</div>
              </div>
              <div className="detail-item">
                <span className="field-label">过滤快照</span>
                <div className="detail-value detail-remark">{activeRun.filterSnapshotJson || "-"}</div>
              </div>
              <div className="detail-item">
                <span className="field-label">成功 / 失败</span>
                <div className="detail-value">
                  {visibleSuccessCount} / {visibleFailureCount}
                </div>
              </div>
              <div className="detail-item">
                <span className="field-label">耗时</span>
                <div className="detail-value">{formatDuration(activeRun.durationMs)}</div>
              </div>
            </div>

            <div className="form-actions">
              <button
                className="button button-secondary"
                type="button"
                onClick={() => void handleDeleteFailedNodes()}
                disabled={failedNodeCount === 0}
              >
                {failedNodeCount === 0 ? "没有不通节点" : `删除本次不通节点 (${failedNodeCount})`}
              </button>
            </div>

            {activeRun.errorMessage ? <div className="alert alert-error">{activeRun.errorMessage}</div> : null}

            <NodeTestResultTable results={activeResults} onDeleteNode={handleDeleteNode} />
          </>
        ) : (
          <EmptyState
            title="当前还没有测试结果"
            description="点击“测试当前筛选”后，系统会对当前节点清单逐个做连通性检测，并把结果保存到本地数据库。"
          />
        )}
      </section>

      <section className="stats-grid">
        <StatCard label="已评分节点" value={String(qualityStats?.totalRankedNodes ?? 0)} hint="至少完成一次测试的节点" />
        <StatCard label="推荐节点" value={String(qualityStats?.recommendedNodes ?? 0)} hint="适合后续优先保留和复测" />
        <StatCard label="优选节点" value={String(qualityStats?.excellentNodes ?? 0)} hint="分数较高且比较稳定" />
        <StatCard label="稳定节点" value={String(qualityStats?.stableNodes ?? 0)} hint="成功率高且测试量足够" />
        <StatCard label="平均评分" value={String(qualityStats?.averageScore ?? 0)} hint="当前评分结果的平均值" />
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">节点评分结果</h2>
            <p className="card-subtitle">评分会根据历史测试结果、成功率、延迟和测试量综合计算，后面可以直接给 Hermes 继续调用。</p>
          </div>
        </div>

        <NodeQualityTable rows={qualityRows} />
      </section>

      <NodeMonthlyJobPanel refreshToken={reportRefreshToken} />

      <NodeReportExportPanel
        config={config}
        keyword={keyword}
        onExported={() => setReportRefreshToken((value) => value + 1)}
      />

      <NodeReportHistoryPanel refreshToken={reportRefreshToken} />

      <HermesTaskPanel config={config} refreshToken={reportRefreshToken} />

      <HermesResultPanel config={config} refreshToken={reportRefreshToken} />
    </div>
  );
}
