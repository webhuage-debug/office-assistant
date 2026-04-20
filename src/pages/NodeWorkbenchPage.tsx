import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { NodeEntryTable } from "@/components/NodeEntryTable";
import { NodeImportForm } from "@/components/NodeImportForm";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { deleteNodeEntry, getNodeOverviewStats, importNodeEntries, listNodeEntries } from "@/services/nodeService";
import { useProjectStore } from "@/store/ProjectStore";
import type { NodeEntrySummary, NodeImportBatchSummary, NodeOverviewStats } from "@/types/node";
import { getErrorMessage } from "@/utils/errors";

export function NodeWorkbenchPage() {
  const { config } = useProjectStore();
  const [entries, setEntries] = useState<NodeEntrySummary[]>([]);
  const [stats, setStats] = useState<NodeOverviewStats | null>(null);
  const [keyword, setKeyword] = useState("");
  const [lastImport, setLastImport] = useState<NodeImportBatchSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWorkspace = async (search = keyword) => {
    setLoading(true);
    setError(null);

    try {
      const nextFilters = search.trim() ? { keyword: search.trim() } : {};
      const [nextEntries, nextStats] = await Promise.all([listNodeEntries(nextFilters), getNodeOverviewStats()]);
      setEntries(nextEntries);
      setStats(nextStats);
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
    const confirmed = window.confirm(`确认删除节点「${entry.nodeName}」吗？`);
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

  return (
    <div className="page">
      <PageHeader
        title="节点台账"
        description="仅用于你自己维护或有授权的节点清单，先完成导入、去重、落库和列表管理，后续再接测试和文档生成。"
        actions={
          <>
            <Link className="button button-secondary" to="/">
              返回工作台
            </Link>
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
              先把节点清单整理成统一结构，留好后续批量测试、去重复测和月度文档输出的底层接口。
            </p>
          </div>
        </div>

        <div className="detail-grid">
          <div className="detail-item">
            <span className="field-label">导入范围</span>
            <div className="detail-value">你自己维护或有授权的 JSON / CSV 清单</div>
          </div>
          <div className="detail-item">
            <span className="field-label">存储目录</span>
            <div className="detail-value">{config?.uploadDir ? `${config.uploadDir}\\nodes` : "-"}</div>
          </div>
          <div className="detail-item detail-item-span-2">
            <span className="field-label">后续顺序</span>
            <div className="detail-value detail-remark">节点测试器 → 去重与评分 → 月度文档生成 → 定时任务与历史对比</div>
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
              <p className="card-subtitle">这次导入已经写入本地数据库，后续复测和文档可以直接基于这份数据继续做。</p>
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
            <p className="card-subtitle">先按关键字快速筛选节点名称、地址、备注和来源文件，再继续往测试器和月报推进。</p>
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
              <p className="card-subtitle">当前只做台账管理，不做公开节点采集。后续测试和报表会基于这里的记录继续扩展。</p>
            </div>
          </div>

          <NodeEntryTable entries={entries} onDelete={handleDelete} />
        </section>
      )}
    </div>
  );
}
