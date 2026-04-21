import { useEffect, useMemo, useState, type FormEvent } from "react";
import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import {
  createHermesTaskResult,
  deleteHermesTaskResult,
  listHermesTaskDrafts,
  listHermesTaskResults,
} from "@/services/hermesService";
import type { ResolvedAppConfig } from "@/types/app";
import type {
  HermesTaskDraftSummary,
  HermesTaskResultInput,
  HermesTaskResultStatus,
  HermesTaskResultSummary,
} from "@/types/hermes";
import { formatDateTime } from "@/utils/date";
import { getErrorMessage } from "@/utils/errors";

interface HermesResultPanelProps {
  config: ResolvedAppConfig | null;
  refreshToken?: number;
}

interface HermesResultFormState {
  draftId: string;
  title: string;
  status: HermesTaskResultStatus;
  summary: string;
  payloadJson: string;
}

const defaultFormState = (): HermesResultFormState => ({
  draftId: "",
  title: "节点月报处理回执",
  status: "completed",
  summary: "Hermes 已处理最新节点月报，结果已整理成可读回执。",
  payloadJson: `{
  "nextAction": "",
  "recommendations": [],
  "notes": ""
}`,
});

function statusChip(status: HermesTaskResultStatus): string {
  switch (status) {
    case "completed":
      return "status-chip status-chip-success";
    case "needs_review":
      return "status-chip status-chip-warning";
    case "failed":
      return "status-chip status-chip-danger";
    default:
      return "status-chip";
  }
}

function sourceTypeLabel(value: string): string {
  switch (value) {
    case "latestNodeReport":
      return "最新节点月报";
    case "manual":
      return "纯手工";
    default:
      return value || "-";
  }
}

function DraftPicker({
  drafts,
  value,
  onChange,
}: {
  drafts: HermesTaskDraftSummary[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select className="field-input" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">手动结果</option>
      {drafts.map((draft) => (
        <option key={draft.id} value={draft.id}>
          {draft.title} · {draft.reportMonth || sourceTypeLabel(draft.sourceType)}
        </option>
      ))}
    </select>
  );
}

function ResultTable({ results, onDeleteResult }: { results: HermesTaskResultSummary[]; onDeleteResult: (result: HermesTaskResultSummary) => void }) {
  return (
    <div className="table-wrap">
      <table className="table table-compact">
        <thead>
          <tr>
            <th>标题</th>
            <th>状态</th>
            <th>关联草稿</th>
            <th>来源</th>
            <th>生成时间</th>
            <th>文件</th>
            <th>摘要</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {results.length > 0 ? (
            results.map((result) => (
              <tr key={result.id}>
                <td>
                  <div className="table-strong">{result.title}</div>
                  <div className="card-muted table-truncate" title={result.sourceSnapshotId}>
                    快照：{result.sourceSnapshotId || "-"}
                  </div>
                </td>
                <td>
                  <span className={statusChip(result.status)}>{result.status}</span>
                </td>
                <td className="table-truncate" title={result.draftTitle}>
                  {result.draftTitle || "-"}
                </td>
                <td>{sourceTypeLabel(result.sourceType)}</td>
                <td>{formatDateTime(result.generatedAt)}</td>
                <td className="table-truncate" title={result.payloadPath}>
                  {result.payloadPath}
                </td>
                <td className="table-truncate" title={result.summary}>
                  {result.summary}
                </td>
                <td>
                  <button className="button button-secondary" type="button" onClick={() => onDeleteResult(result)}>
                    删除
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={8}>
                <div className="table-empty">还没有 Hermes 结果回执。</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function HermesResultPanel({ config, refreshToken = 0 }: HermesResultPanelProps) {
  const [drafts, setDrafts] = useState<HermesTaskDraftSummary[]>([]);
  const [results, setResults] = useState<HermesTaskResultSummary[]>([]);
  const [form, setForm] = useState<HermesResultFormState>(defaultFormState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [nextDrafts, nextResults] = await Promise.all([listHermesTaskDrafts(10), listHermesTaskResults(10)]);
      setDrafts(nextDrafts);
      setResults(nextResults);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [refreshToken]);

  const latestDraft = drafts[0] ?? null;
  const resultStats = useMemo(
    () => ({
      total: results.length,
      completed: results.filter((result) => result.status === "completed").length,
      review: results.filter((result) => result.status === "needs_review").length,
      failed: results.filter((result) => result.status === "failed").length,
    }),
    [results],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const input: HermesTaskResultInput = {
        draftId: form.draftId.trim() || undefined,
        title: form.title.trim(),
        status: form.status,
        summary: form.summary.trim(),
        payloadJson: form.payloadJson,
      };

      await createHermesTaskResult(input);
      setForm(defaultFormState());
      await loadData();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (result: HermesTaskResultSummary) => {
    const confirmed = window.confirm(`确定删除 Hermes 回执「${result.title}」吗？`);
    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await deleteHermesTaskResult(result.id);
      await loadData();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  const handleUseLatestDraft = () => {
    if (latestDraft) {
      setForm((current) => ({
        ...current,
        draftId: latestDraft.id,
      }));
    }
  };

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">Hermes 结果归档</h2>
          <p className="card-subtitle">
            处理完的 Hermes 回执可以在这里落到本地 outbox 目录，后面你要做自动回填、复盘和导出就有依据了。
          </p>
        </div>
        <button className="button button-secondary" type="button" onClick={() => void loadData()}>
          刷新结果
        </button>
      </div>

      <section className="stats-grid">
        <StatCard label="回执总数" value={String(resultStats.total)} hint="已经归档的 Hermes 结果数量" />
        <StatCard label="已完成" value={String(resultStats.completed)} hint="状态为 completed 的回执" />
        <StatCard label="待复核" value={String(resultStats.review)} hint="需要人工继续处理的回执" />
        <StatCard label="失败" value={String(resultStats.failed)} hint="处理失败或需要重试的回执" />
        <StatCard label="Outbox" value={config?.hermesOutboxDir ? "已配置" : "未配置"} hint={config?.hermesOutboxDir ?? "-"} />
      </section>

      <form className="form-stack" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label className="field field-span-2">
            <span className="field-label">关联草稿</span>
            <div className="input-inline-group">
              <DraftPicker
                drafts={drafts}
                value={form.draftId}
                onChange={(value) => setForm({ ...form, draftId: value })}
              />
              <button className="button button-secondary" type="button" onClick={handleUseLatestDraft} disabled={!latestDraft}>
                使用最新草稿
              </button>
            </div>
          </label>

          <label className="field">
            <span className="field-label">回执标题</span>
            <input
              className="field-input"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="节点月报处理回执"
            />
          </label>

          <label className="field">
            <span className="field-label">处理状态</span>
            <select
              className="field-input"
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value as HermesTaskResultStatus })}
            >
              <option value="completed">completed</option>
              <option value="needs_review">needs_review</option>
              <option value="failed">failed</option>
            </select>
          </label>

          <label className="field field-span-2">
            <span className="field-label">结果摘要</span>
            <textarea
              className="field-input field-textarea"
              value={form.summary}
              onChange={(event) => setForm({ ...form, summary: event.target.value })}
              placeholder="用简短文字说明 Hermes 的处理结果和下一步建议"
            />
          </label>

          <label className="field field-span-2">
            <span className="field-label">结果 JSON</span>
            <textarea
              className="field-input field-textarea"
              value={form.payloadJson}
              onChange={(event) => setForm({ ...form, payloadJson: event.target.value })}
              placeholder='{"nextAction":"","recommendations":[],"notes":""}'
            />
          </label>
        </div>

        <p className="card-note">
          结果 JSON 会被校验后写入本地 outbox 目录和 SQLite。后面如果 Hermes 直接生成结果文件，这个结构也可以直接沿用。
        </p>

        <div className="form-actions">
          <button className="button" type="submit" disabled={saving}>
            {saving ? "归档中..." : "归档 Hermes 结果"}
          </button>
        </div>
      </form>

      {error ? <div className="alert alert-error">{error}</div> : null}

      {loading && results.length === 0 ? <EmptyState title="正在加载 Hermes 结果..." /> : null}

      {!loading && results.length === 0 ? (
        <EmptyState
          title="还没有 Hermes 结果"
          description="你可以先生成一份回执 JSON 进行归档，或者等 Hermes 未来写入 outbox 后再同步到这里。"
        />
      ) : (
        <ResultTable results={results} onDeleteResult={handleDelete} />
      )}
    </section>
  );
}
