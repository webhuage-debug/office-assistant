import { useEffect, useState, type FormEvent } from "react";
import type { ProjectFormState, ProjectUpsertInput } from "@/types/app";
import { FOLLOW_STAGE_OPTIONS } from "@/types/stages";
import {
  calculateProjectTotalCents,
  createEmptyProjectForm,
  normalizeProjectForm,
} from "@/utils/projectForm";
import { centsToCurrency } from "@/utils/money";
import { getErrorMessage } from "@/utils/errors";
import { QuotationItemsEditor } from "@/components/QuotationItemsEditor";

interface ProjectFormProps {
  initialValue?: ProjectFormState;
  submitLabel: string;
  onSubmit: (input: ProjectUpsertInput) => Promise<void>;
  onCancel?: () => void;
}

export function ProjectForm({ initialValue, submitLabel, onSubmit, onCancel }: ProjectFormProps) {
  const [form, setForm] = useState<ProjectFormState>(initialValue ?? createEmptyProjectForm());
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialValue) {
      setForm(initialValue);
    }
  }, [initialValue]);

  const totalCents = calculateProjectTotalCents(form.quotationItems);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = normalizeProjectForm(form);
      await onSubmit(payload);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="form-stack" onSubmit={handleSubmit}>
      <section className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">项目基础信息</h2>
            <p className="card-subtitle">字段尽量保持简洁，方便日常办公快速录入。</p>
          </div>
          <div className="card-muted">合同金额：{centsToCurrency(totalCents)}</div>
        </div>

        <div className="form-grid">
          <label className="field">
            <span className="field-label">项目编号</span>
            <input
              className="field-input"
              value={form.projectNo}
              onChange={(event) => setForm({ ...form, projectNo: event.target.value })}
              placeholder="例如：SH-20260401-001"
              required
            />
          </label>

          <label className="field">
            <span className="field-label">客户姓名</span>
            <input
              className="field-input"
              value={form.customerName}
              onChange={(event) => setForm({ ...form, customerName: event.target.value })}
              placeholder="客户姓名"
              required
            />
          </label>

          <label className="field">
            <span className="field-label">联系电话</span>
            <input
              className="field-input"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              placeholder="手机号"
              required
            />
          </label>

          <label className="field field-span-2">
            <span className="field-label">项目地址</span>
            <input
              className="field-input"
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
              placeholder="详细地址"
              required
            />
          </label>

          <label className="field">
            <span className="field-label">房间数量</span>
            <input
              className="field-input"
              type="number"
              min="0"
              step="1"
              value={form.roomCount}
              onChange={(event) => setForm({ ...form, roomCount: event.target.value })}
              placeholder="0"
              required
            />
          </label>

          <label className="field">
            <span className="field-label">方案类型</span>
            <input
              className="field-input"
              value={form.planType}
              onChange={(event) => setForm({ ...form, planType: event.target.value })}
              placeholder="例如：全屋智能"
              required
            />
          </label>

          <label className="field">
            <span className="field-label">跟进阶段</span>
            <select
              className="field-input"
              value={form.followStage}
              onChange={(event) => setForm({ ...form, followStage: event.target.value })}
              required
            >
              {FOLLOW_STAGE_OPTIONS.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </label>

          <label className="field field-span-2">
            <span className="field-label">备注信息</span>
            <textarea
              className="field-input field-textarea"
              rows={4}
              value={form.remark}
              onChange={(event) => setForm({ ...form, remark: event.target.value })}
              placeholder="补充特殊说明、沟通记录或注意事项"
            />
          </label>
        </div>
      </section>

      <QuotationItemsEditor
        items={form.quotationItems}
        onChange={(quotationItems) => setForm({ ...form, quotationItems })}
      />

      <section className="card">
        <div className="form-summary">
          <div>
            <div className="card-title">自动汇总</div>
            <p className="card-subtitle">总金额会根据报价明细自动计算，避免手工录入误差。</p>
          </div>

          <div className="summary-money">{centsToCurrency(totalCents)}</div>
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}

        <div className="form-actions">
          {onCancel ? (
            <button type="button" className="button button-secondary" onClick={onCancel}>
              取消
            </button>
          ) : null}
          <button type="submit" className="button" disabled={isSubmitting}>
            {isSubmitting ? "保存中..." : submitLabel}
          </button>
        </div>
      </section>
    </form>
  );
}
