import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { ProjectForm } from "@/components/ProjectForm";
import { buildProjectFormFromDetail } from "@/utils/projectForm";
import { getProjectById, updateProject } from "@/services/projectService";
import { getErrorMessage } from "@/utils/errors";
import type { ProjectFormState } from "@/types/app";
import { useProjectStore } from "@/store/ProjectStore";

export function ProjectEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { reloadStats } = useProjectStore();
  const [initialValue, setInitialValue] = useState<ProjectFormState | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("缺少项目 ID。");
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const detail = await getProjectById(id);
        if (!detail) {
          setError("未找到该项目。");
          return;
        }
        setInitialValue(buildProjectFormFromDetail(detail));
      } catch (caught) {
        setError(getErrorMessage(caught));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

  return (
    <div className="page">
      <PageHeader title="编辑项目" description="修改基础信息和报价明细后会重新保存。" />

      {loading ? <div className="card-note">正在加载项目详情...</div> : null}
      {error ? <div className="alert alert-error">{error}</div> : null}

      {!loading && initialValue ? (
        <ProjectForm
          initialValue={initialValue}
          submitLabel="保存修改"
          onCancel={() => navigate(`/projects/${id}`)}
          onSubmit={async (payload) => {
            if (!id) {
              throw new Error("缺少项目 ID。");
            }
            const updated = await updateProject(id, payload);
            await reloadStats();
            navigate(`/projects/${updated.id}`);
          }}
        />
      ) : null}
    </div>
  );
}
