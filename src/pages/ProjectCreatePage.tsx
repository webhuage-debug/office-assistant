import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { ProjectForm } from "@/components/ProjectForm";
import { createProject } from "@/services/projectService";
import { useProjectStore } from "@/store/ProjectStore";

export function ProjectCreatePage() {
  const navigate = useNavigate();
  const { reloadStats } = useProjectStore();

  return (
    <div className="page">
      <PageHeader title="新建项目" description="先录入基础信息，再补充报价明细。" />

      <ProjectForm
        submitLabel="保存项目"
        onCancel={() => navigate("/projects")}
        onSubmit={async (payload) => {
          const created = await createProject(payload);
          await reloadStats();
          navigate(`/projects/${created.id}`);
        }}
      />
    </div>
  );
}
