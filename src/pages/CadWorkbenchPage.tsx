import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CadDocumentForm } from "@/components/CadDocumentForm";
import { CadDocumentTable } from "@/components/CadDocumentTable";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import {
  createCadDocument,
  deleteCadDocument,
  getCadPipelineStats,
  listCadDocuments,
  parseCadDocument,
} from "@/services/cadService";
import { listProjects } from "@/services/projectService";
import { useProjectStore } from "@/store/ProjectStore";
import type { ProjectSummary } from "@/types/app";
import type { CadDocumentSummary, CadPipelineStats } from "@/types/cad";
import { getErrorMessage } from "@/utils/errors";

export function CadWorkbenchPage() {
  const { config } = useProjectStore();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [documents, setDocuments] = useState<CadDocumentSummary[]>([]);
  const [stats, setStats] = useState<CadPipelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latestParsedDocument = documents.find((document) => document.latestParseSummary);

  const loadWorkspace = async () => {
    setLoading(true);
    setError(null);

    try {
      const [nextProjects, nextDocuments, nextStats] = await Promise.all([
        listProjects(),
        listCadDocuments(),
        getCadPipelineStats(),
      ]);
      setProjects(nextProjects);
      setDocuments(nextDocuments);
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

  const handleCreateDocument = async (input: Parameters<typeof createCadDocument>[0]) => {
    const created = await createCadDocument(input);
    if (input.sourceType.toUpperCase() === "DXF" || input.sourcePath.trim().toLowerCase().endsWith(".dxf")) {
      try {
        await parseCadDocument(created.id);
      } catch (caught) {
        window.alert(getErrorMessage(caught));
      }
    }
    await loadWorkspace();
  };

  const handleParseDocument = async (document: CadDocumentSummary) => {
    try {
      await parseCadDocument(document.id);
      await loadWorkspace();
    } catch (caught) {
      window.alert(getErrorMessage(caught));
    }
  };

  const handleDeleteDocument = async (document: CadDocumentSummary) => {
    const confirmed = window.confirm(`确认删除 CAD 文件「${document.originalFileName}」吗？这会同时移除本地存档。`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteCadDocument(document.id);
      await loadWorkspace();
    } catch (caught) {
      window.alert(getErrorMessage(caught));
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="CAD工作台"
        description="先把 CAD 文件登记进本地仓库，后面接识别引擎时可以直接沿着这条链路做自动报价。"
        actions={
          <>
            <Link className="button button-secondary" to="/projects">
              项目列表
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
            <h2 className="card-title">预留的识别链路</h2>
            <p className="card-subtitle">
              当前只做“登记、归档、状态记录”，后续喂入 CAD 解析、图层识别、房间识别和报价规则时可以直接复用。
            </p>
          </div>
        </div>

        <ol className="cad-steps">
          <li>登记 CAD 文件到本地存储目录</li>
          <li>记录关联项目和文件来源</li>
          <li>保留识别任务状态和结果入口</li>
          <li>未来识别结果可直接转成报价草稿</li>
        </ol>

        <div className="path-grid">
          <div className="path-item">
            <span className="field-label">CAD 存储目录</span>
            <div className="path-value">{config?.uploadDir ? `${config.uploadDir}\\cad` : "-"}</div>
          </div>
          <div className="path-item">
            <span className="field-label">当前登记文件数</span>
            <div className="path-value">{stats?.totalDocuments ?? 0}</div>
          </div>
          <div className="path-item">
            <span className="field-label">待识别文件数</span>
            <div className="path-value">{stats?.pendingDocuments ?? 0}</div>
          </div>
        </div>
      </section>

      {loading && !stats ? <EmptyState title="正在加载 CAD 工作台..." /> : null}
      {error ? <div className="alert alert-error">{error}</div> : null}

      <section className="stats-grid">
        <StatCard label="登记文件总数" value={String(stats?.totalDocuments ?? 0)} hint="所有已登记 CAD 文件" />
        <StatCard label="待识别" value={String(stats?.pendingDocuments ?? 0)} hint="尚未进入识别流程" />
        <StatCard label="识别中" value={String(stats?.processingDocuments ?? 0)} hint="正在处理中的任务" />
        <StatCard label="已完成" value={String(stats?.completedDocuments ?? 0)} hint="识别完成，可进入报价" />
        <StatCard label="已关联项目" value={String(stats?.linkedProjects ?? 0)} hint="已绑定到项目记录" />
      </section>

      {latestParsedDocument?.latestParseSummary ? (
        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">最新解析结果</h2>
              <p className="card-subtitle">
                这里先展示 DXF 解析底座的真实输出，后面你给我样本和报价规则后，就能继续往自动报价推进。
              </p>
            </div>
          </div>

          <div className="detail-grid">
            <div className="detail-item">
              <span className="field-label">文件名</span>
              <div className="detail-value">{latestParsedDocument.originalFileName}</div>
            </div>
            <div className="detail-item">
              <span className="field-label">实体数量</span>
              <div className="detail-value">{latestParsedDocument.latestParseSummary.entityCount}</div>
            </div>
            <div className="detail-item">
              <span className="field-label">图层数量</span>
              <div className="detail-value">{latestParsedDocument.latestParseSummary.layerCount}</div>
            </div>
            <div className="detail-item">
              <span className="field-label">线 / 圆 / 文字</span>
              <div className="detail-value">
                {latestParsedDocument.latestParseSummary.lineCount} / {latestParsedDocument.latestParseSummary.circleCount} /{" "}
                {latestParsedDocument.latestParseSummary.textCount}
              </div>
            </div>
            <div className="detail-item detail-item-span-2">
              <span className="field-label">主要图层</span>
              <div className="detail-value detail-remark">
                {latestParsedDocument.latestParseSummary.topLayers.length > 0
                  ? latestParsedDocument.latestParseSummary.topLayers
                      .map((layer) => `${layer.layerName} (${layer.entityCount})`)
                      .join("， ")
                  : "-"}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <CadDocumentForm projects={projects} uploadDir={config?.uploadDir ?? "-"} onSubmit={handleCreateDocument} />

      {!loading && !error && documents.length === 0 ? (
        <EmptyState
          title="还没有 CAD 文件"
          description="先登记一份 CAD 方案，后面接入识别引擎后就能从这里生成报价。"
        />
      ) : (
        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">CAD 文件列表</h2>
              <p className="card-subtitle">本地归档后，文件路径和任务状态都会被保留下来，方便后期投喂识别结果。</p>
            </div>
          </div>

          <CadDocumentTable documents={documents} onDelete={handleDeleteDocument} onParse={handleParseDocument} />
        </section>
      )}
    </div>
  );
}
