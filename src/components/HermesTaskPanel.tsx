import { useEffect, useState, type FormEvent } from "react";
import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import { createHermesTaskDraft, deleteHermesTaskDraft, listHermesTaskDrafts } from "@/services/hermesService";
import type { ResolvedAppConfig } from "@/types/app";
import type { HermesTaskDraftInput, HermesTaskDraftSummary, HermesTaskSourceType } from "@/types/hermes";
import { formatDateTime } from "@/utils/date";
import { getErrorMessage } from "@/utils/errors";

interface HermesTaskPanelProps {
  config: ResolvedAppConfig | null;
  refreshToken?: number;
}

interface HermesTaskFormState {
  title: string;
  instruction: string;
  sourceType: HermesTaskSourceType;
}

const defaultFormState = (): HermesTaskFormState => ({
  title: "节点月报分析草稿",
  instruction: "请基于最新节点月报快照，梳理本月可用节点变化、评分波动和清理建议，并给出下月复测重点。",
  sourceType: "latestNodeReport",
});

function sourceTypeLabel(value: HermesTaskSourceType): string {
  switch (value) {
    case "latestNodeReport":
      return "最新节点月报";
    case "manual":
      return "纯手工";
    default:
      return value;
  }
}

function formToInput(form: HermesTaskFormState): HermesTaskDraftInput {
  return {
    title: form.title.trim(),
    instruction: form.instruction.trim(),
    sourceType: form.sourceType,
  };
}

function DraftTable({ drafts, onDeleteDraft }: { drafts: HermesTaskDraftSummary[]; onDeleteDraft: (draft: HermesTaskDraftSummary) => void }) {
  return (
    <div className="table-wrap">
      <table className="table table-compact">
        <thead>
          <tr>
            <th>标题</th>
            <th>来源</th>
            <th>月份</th>
            <th>生成时间</th>
            <th>文件</th>
            <th>说明</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {drafts.length > 0 ? (
            drafts.map((draft) => (
              <tr key={draft.id}>
                <td>
                  <div className="table-strong">{draft.title}</div>
                  <div className="card-muted table-truncate" title={draft.sourceSnapshotId}>
                    快照：{draft.sourceSnapshotId || "-"}
                  </div>
                </td>
                <td>{sourceTypeLabel(draft.sourceType)}</td>
                <td>{draft.reportMonth || "-"}</td>
                <td>{formatDateTime(draft.generatedAt)}</td>
                <td className="table-truncate" title={draft.payloadPath}>
                  {draft.payloadPath}
                </td>
                <td className="table-truncate" title={draft.instruction}>
                  {draft.instruction}
                </td>
                <td>
                  <button className="button button-secondary" type="button" onClick={() => onDeleteDraft(draft)}>
                    删除
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7}>
                <div className="table-empty">还没有 Hermes 任务草稿。</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function HermesTaskPanel({ config, refreshToken = 0 }: HermesTaskPanelProps) {
  const [form, setForm] = useState<HermesTaskFormState>(defaultFormState);
  const [drafts, setDrafts] = useState<HermesTaskDraftSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const nextDrafts = await listHermesTaskDrafts(10);
      setDrafts(nextDrafts);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [refreshToken]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await createHermesTaskDraft(formToInput(form));
      await loadData();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (draft: HermesTaskDraftSummary) => {
    const confirmed = window.confirm(`确定删除 Hermes 草稿「${draft.title}」吗？`);
    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await deleteHermesTaskDraft(draft.id);
      await loadData();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  const latestDraft = drafts[0] ?? null;

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">Hermes 任务草稿</h2>
          <p className="card-subtitle">
            这里会把你的说明和最新节点月报上下文整理成标准 JSON 草稿，后面 Hermes 可以直接读取这个投递目录。
          </p>
        </div>
        <button className="button button-secondary" type="button" onClick={() => void loadData()}>
          刷新草稿
        </button>
      </div>

      <section className="stats-grid">
        <StatCard label="草稿总数" value={String(drafts.length)} hint="当前 Hermes 投递目录中的草稿数量" />
        <StatCard label="最新来源" value={latestDraft ? sourceTypeLabel(latestDraft.sourceType) : "-"} hint="最近一次草稿使用的上下文来源" />
        <StatCard label="最近生成" value={latestDraft ? formatDateTime(latestDraft.generatedAt) : "-"} hint="最近一份草稿的生成时间" />
        <StatCard label="投递目录" value={config?.hermesInboxDir ? "已配置" : "未配置"} hint={config?.hermesInboxDir ?? "-"} />
      </section>

      <form className="form-stack" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label className="field field-span-2">
            <span className="field-label">草稿标题</span>
            <input
              className="field-input"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="例如：节点月报分析草稿"
            />
          </label>

          <label className="field">
            <span className="field-label">上下文来源</span>
            <select
              className="field-input"
              value={form.sourceType}
              onChange={(event) => setForm({ ...form, sourceType: event.target.value as HermesTaskSourceType })}
            >
              <option value="latestNodeReport">最新节点月报</option>
              <option value="manual">纯手工</option>
            </select>
          </label>

          <div className="field">
            <span className="field-label">投递目录</span>
            <div className="detail-value detail-remark">{config?.hermesInboxDir ?? "-"}</div>
          </div>

          <label className="field field-span-2">
            <span className="field-label">任务说明</span>
            <textarea
              className="field-input field-textarea"
              value={form.instruction}
              onChange={(event) => setForm({ ...form, instruction: event.target.value })}
              placeholder="写给 Hermes / 大模型看的任务说明，尽量具体"
            />
          </label>
        </div>

        <p className="card-note">
          如果选择“最新节点月报”，系统会自动把最新月报快照和跨月对比一起塞进 JSON。后面你只要把这个目录交给 Hermes 就行。
        </p>

        <div className="form-actions">
          <button className="button" type="submit" disabled={saving}>
            {saving ? "生成中..." : "生成 Hermes 草稿"}
          </button>
        </div>
      </form>

      {error ? <div className="alert alert-error">{error}</div> : null}

      {latestDraft ? (
        <div className="detail-grid" style={{ marginTop: "1rem" }}>
          <div className="detail-item">
            <span className="field-label">最新草稿</span>
            <div className="detail-value">{latestDraft.title}</div>
          </div>
          <div className="detail-item">
            <span className="field-label">源快照</span>
            <div className="detail-value">{latestDraft.sourceSnapshotId || "-"}</div>
          </div>
          <div className="detail-item">
            <span className="field-label">文件大小</span>
            <div className="detail-value">{latestDraft.payloadSizeBytes} B</div>
          </div>
          <div className="detail-item detail-item-span-2">
            <span className="field-label">文件路径</span>
            <div className="detail-value detail-remark">{latestDraft.payloadPath}</div>
          </div>
        </div>
      ) : null}

      {loading && drafts.length === 0 ? <EmptyState title="正在加载 Hermes 草稿..." /> : null}

      {!loading && drafts.length === 0 ? (
        <EmptyState
          title="还没有 Hermes 草稿"
          description="先生成一份草稿，系统会把 JSON 文件投递到本地 inbox 目录，后面 Hermes 可以直接读取。"
        />
      ) : (
        <DraftTable drafts={drafts} onDeleteDraft={handleDelete} />
      )}
    </section>
  );
}
