import { useEffect, useState, type FormEvent } from "react";
import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import {
  createNodeMonthlyJob,
  deleteNodeMonthlyJob,
  listNodeMonthlyJobRuns,
  listNodeMonthlyJobs,
  runNodeMonthlyJobNow,
  updateNodeMonthlyJob,
} from "@/services/nodeService";
import type {
  NodeMonthlyJobRunSummary,
  NodeMonthlyJobSummary,
  NodeMonthlyJobUpsertInput,
} from "@/types/node";
import { formatDateTime } from "@/utils/date";
import { getErrorMessage } from "@/utils/errors";

interface NodeMonthlyJobPanelProps {
  refreshToken?: number;
}

interface NodeMonthlyJobFormState {
  jobName: string;
  enabled: boolean;
  reportMonthMode: string;
  scheduleDay: string;
  scheduleHour: string;
  scheduleMinute: string;
  triggerSource: string;
  keyword: string;
  sourceLabel: string;
  protocol: string;
}

const defaultFormState = (): NodeMonthlyJobFormState => ({
  jobName: "每月节点月报",
  enabled: true,
  reportMonthMode: "previous",
  scheduleDay: "1",
  scheduleHour: "9",
  scheduleMinute: "0",
  triggerSource: "scheduler",
  keyword: "",
  sourceLabel: "",
  protocol: "",
});

function jobToForm(job: NodeMonthlyJobSummary): NodeMonthlyJobFormState {
  return {
    jobName: job.jobName,
    enabled: job.enabled,
    reportMonthMode: job.reportMonthMode,
    scheduleDay: String(job.scheduleDay),
    scheduleHour: String(job.scheduleHour),
    scheduleMinute: String(job.scheduleMinute),
    triggerSource: job.triggerSource,
    keyword: job.keyword,
    sourceLabel: job.sourceLabel,
    protocol: job.protocol,
  };
}

function formToInput(form: NodeMonthlyJobFormState): NodeMonthlyJobUpsertInput {
  return {
    jobName: form.jobName.trim(),
    enabled: form.enabled,
    reportMonthMode: form.reportMonthMode.trim() || "previous",
    scheduleDay: Number(form.scheduleDay) || 1,
    scheduleHour: Number(form.scheduleHour) || 0,
    scheduleMinute: Number(form.scheduleMinute) || 0,
    triggerSource: form.triggerSource.trim() || "scheduler",
    keyword: form.keyword.trim(),
    sourceLabel: form.sourceLabel.trim(),
    protocol: form.protocol.trim(),
  };
}

function enabledChip(enabled: boolean): string {
  return enabled ? "status-chip status-chip-success" : "status-chip status-chip-danger";
}

function runStatusChip(status: string): string {
  switch (status) {
    case "completed":
      return "status-chip status-chip-success";
    case "failed":
      return "status-chip status-chip-danger";
    case "running":
      return "status-chip status-chip-running";
    default:
      return "status-chip";
  }
}

function formatSchedule(job: NodeMonthlyJobSummary): string {
  return `每月 ${job.scheduleDay} 日 ${String(job.scheduleHour).padStart(2, "0")}:${String(job.scheduleMinute).padStart(2, "0")}`;
}

function formatMode(mode: string): string {
  return mode === "current" ? "当月" : "上月";
}

function JobRunTable({ runs }: { runs: NodeMonthlyJobRunSummary[] }) {
  return (
    <div className="table-wrap">
      <table className="table table-compact">
        <thead>
          <tr>
            <th>任务</th>
            <th>月份</th>
            <th>触发时间</th>
            <th>状态</th>
            <th>快照</th>
            <th>导出目录</th>
            <th>错误</th>
          </tr>
        </thead>
        <tbody>
          {runs.length > 0 ? (
            runs.map((run) => (
              <tr key={run.id}>
                <td>{run.jobName}</td>
                <td>{run.reportMonth}</td>
                <td>{formatDateTime(run.triggeredAt)}</td>
                <td>
                  <span className={runStatusChip(run.status)}>{run.status}</span>
                </td>
                <td className="table-truncate" title={run.snapshotId}>
                  {run.snapshotId || "-"}
                </td>
                <td className="table-truncate" title={run.exportPath}>
                  {run.exportPath || "-"}
                </td>
                <td className="table-truncate" title={run.errorMessage}>
                  {run.errorMessage || "-"}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7}>
                <div className="table-empty">还没有自动任务执行记录。</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function NodeMonthlyJobPanel({ refreshToken = 0 }: NodeMonthlyJobPanelProps) {
  const [jobs, setJobs] = useState<NodeMonthlyJobSummary[]>([]);
  const [runs, setRuns] = useState<NodeMonthlyJobRunSummary[]>([]);
  const [form, setForm] = useState<NodeMonthlyJobFormState>(defaultFormState);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [nextJobs, nextRuns] = await Promise.all([listNodeMonthlyJobs(), listNodeMonthlyJobRuns(12)]);
      setJobs(nextJobs);
      setRuns(nextRuns);
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
      const input = formToInput(form);
      if (editingJobId) {
        await updateNodeMonthlyJob(editingJobId, input);
      } else {
        await createNodeMonthlyJob(input);
      }

      setEditingJobId(null);
      setForm(defaultFormState());
      await loadData();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (job: NodeMonthlyJobSummary) => {
    setEditingJobId(job.id);
    setForm(jobToForm(job));
    setError(null);
  };

  const handleReset = () => {
    setEditingJobId(null);
    setForm(defaultFormState());
    setError(null);
  };

  const handleToggle = async (job: NodeMonthlyJobSummary) => {
    setSaving(true);
    setError(null);

    try {
      await updateNodeMonthlyJob(job.id, {
        ...formToInput(jobToForm(job)),
        enabled: !job.enabled,
      });
      await loadData();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (job: NodeMonthlyJobSummary) => {
    const confirmed = window.confirm(`确定删除自动任务「${job.jobName}」吗？`);
    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await deleteNodeMonthlyJob(job.id);
      await loadData();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  const handleRunNow = async (job: NodeMonthlyJobSummary) => {
    const confirmed = window.confirm(`确定立即执行任务「${job.jobName}」吗？`);
    if (!confirmed) {
      return;
    }

    setRunningJobId(job.id);
    setError(null);

    try {
      await runNodeMonthlyJobNow(job.id);
      await loadData();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setRunningJobId(null);
    }
  };

  const enabledJobs = jobs.filter((job) => job.enabled).length;
  const pendingJobs = jobs.filter((job) => job.enabled && job.nextRunAt).length;
  const failedJobs = jobs.filter((job) => job.lastStatus === "failed").length;
  const latestRun = runs[0] ?? null;

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">月度自动任务</h2>
          <p className="card-subtitle">
            当前是桌面端的调度预留，应用打开时会轮询执行到期任务。后面接 Hermes 时，可以直接复用这里的任务定义和执行历史。
          </p>
        </div>
        <button className="button button-secondary" type="button" onClick={() => void loadData()}>
          刷新任务
        </button>
      </div>

      {loading && jobs.length === 0 ? <EmptyState title="正在加载自动任务..." /> : null}
      {error ? <div className="alert alert-error">{error}</div> : null}

      <section className="stats-grid">
        <StatCard label="任务总数" value={String(jobs.length)} hint="已保存的自动任务数量" />
        <StatCard label="启用任务" value={String(enabledJobs)} hint="当前启用并会参与调度的任务" />
        <StatCard label="待执行任务" value={String(pendingJobs)} hint="已经计算好下次执行时间的任务" />
        <StatCard label="失败任务" value={String(failedJobs)} hint="最近一次执行失败的任务" />
      </section>

      <form className="form-stack" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label className="field">
            <span className="field-label">任务名称</span>
            <input
              className="field-input"
              value={form.jobName}
              onChange={(event) => setForm({ ...form, jobName: event.target.value })}
              placeholder="每月节点月报"
            />
          </label>

          <label className="field">
            <span className="field-label">月报范围</span>
            <select
              className="field-input"
              value={form.reportMonthMode}
              onChange={(event) => setForm({ ...form, reportMonthMode: event.target.value })}
            >
              <option value="previous">上月</option>
              <option value="current">当月</option>
            </select>
          </label>

          <label className="field">
            <span className="field-label">执行日</span>
            <input
              className="field-input"
              type="number"
              min={1}
              max={31}
              value={form.scheduleDay}
              onChange={(event) => setForm({ ...form, scheduleDay: event.target.value })}
            />
          </label>

          <label className="field">
            <span className="field-label">执行时间</span>
            <div className="input-inline-group">
              <input
                className="field-input"
                type="number"
                min={0}
                max={23}
                value={form.scheduleHour}
                onChange={(event) => setForm({ ...form, scheduleHour: event.target.value })}
                placeholder="时"
              />
              <input
                className="field-input"
                type="number"
                min={0}
                max={59}
                value={form.scheduleMinute}
                onChange={(event) => setForm({ ...form, scheduleMinute: event.target.value })}
                placeholder="分"
              />
            </div>
          </label>

          <label className="field">
            <span className="field-label">触发来源</span>
            <input
              className="field-input"
              value={form.triggerSource}
              onChange={(event) => setForm({ ...form, triggerSource: event.target.value })}
              placeholder="scheduler / hermes / manual"
            />
          </label>

          <label className="field">
            <span className="field-label">状态</span>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
              />
              <span>启用任务</span>
            </label>
          </label>

          <label className="field">
            <span className="field-label">关键字筛选</span>
            <input
              className="field-input"
              value={form.keyword}
              onChange={(event) => setForm({ ...form, keyword: event.target.value })}
              placeholder="可选"
            />
          </label>

          <label className="field">
            <span className="field-label">来源标签</span>
            <input
              className="field-input"
              value={form.sourceLabel}
              onChange={(event) => setForm({ ...form, sourceLabel: event.target.value })}
              placeholder="可选"
            />
          </label>

          <label className="field">
            <span className="field-label">协议筛选</span>
            <input
              className="field-input"
              value={form.protocol}
              onChange={(event) => setForm({ ...form, protocol: event.target.value })}
              placeholder="可选"
            />
          </label>
        </div>

        <div className="form-actions">
          <button className="button" type="submit" disabled={saving}>
            {saving ? "保存中..." : editingJobId ? "更新任务" : "创建任务"}
          </button>
          <button className="button button-secondary" type="button" onClick={handleReset}>
            重置表单
          </button>
        </div>
      </form>

      <div className="card-note">
        说明：当前调度器运行在桌面应用进程里，只有程序打开时才会执行到期任务。后面接 Hermes 时，可以直接复用这套任务定义。
      </div>

      <div className="table-wrap">
        <table className="table table-compact">
          <thead>
            <tr>
              <th>任务</th>
              <th>调度</th>
              <th>月报范围</th>
              <th>下次运行</th>
              <th>上次运行</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length > 0 ? (
              jobs.map((job) => (
                <tr key={job.id}>
                  <td>
                    <div className="table-strong">{job.jobName}</div>
                    <div className="card-muted table-truncate" title={job.triggerSource}>
                      触发：{job.triggerSource}
                    </div>
                  </td>
                  <td>{formatSchedule(job)}</td>
                  <td>{formatMode(job.reportMonthMode)}</td>
                  <td>{job.nextRunAt ? formatDateTime(job.nextRunAt) : "-"}</td>
                  <td>{job.lastRunAt ? formatDateTime(job.lastRunAt) : "-"}</td>
                  <td>
                    <span className={enabledChip(job.enabled)}>{job.enabled ? "启用" : "停用"}</span>
                    <div className="card-muted table-truncate" title={job.lastErrorMessage}>
                      {job.lastStatus}
                    </div>
                  </td>
                  <td>
                    <div className="inline-actions">
                      <button className="button button-secondary" type="button" onClick={() => handleEdit(job)}>
                        编辑
                      </button>
                      <button className="button button-secondary" type="button" onClick={() => void handleToggle(job)}>
                        {job.enabled ? "停用" : "启用"}
                      </button>
                      <button
                        className="button button-secondary"
                        type="button"
                        disabled={runningJobId === job.id}
                        onClick={() => void handleRunNow(job)}
                      >
                        {runningJobId === job.id ? "执行中..." : "立即执行"}
                      </button>
                      <button className="button button-secondary" type="button" onClick={() => void handleDelete(job)}>
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>
                  <div className="table-empty">还没有创建任何自动任务。</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card-subtitle" style={{ marginTop: "1rem" }}>
        最近执行记录
      </div>
      {latestRun ? (
        <div className="detail-grid" style={{ marginBottom: "1rem" }}>
          <div className="detail-item">
            <span className="field-label">最近任务</span>
            <div className="detail-value">{latestRun.jobName}</div>
          </div>
          <div className="detail-item">
            <span className="field-label">最近月份</span>
            <div className="detail-value">{latestRun.reportMonth}</div>
          </div>
          <div className="detail-item">
            <span className="field-label">最近状态</span>
            <div className="detail-value">{latestRun.status}</div>
          </div>
          <div className="detail-item">
            <span className="field-label">最近触发</span>
            <div className="detail-value">{formatDateTime(latestRun.triggeredAt)}</div>
          </div>
        </div>
      ) : null}

      <JobRunTable runs={runs} />
    </section>
  );
}
