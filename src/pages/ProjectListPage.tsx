import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { ProjectTable } from "@/components/ProjectTable";
import type { ProjectFilters, ProjectSummary } from "@/types/app";
import { deleteProject, listProjects } from "@/services/projectService";
import { getErrorMessage } from "@/utils/errors";

const defaultFilters: ProjectFilters = {
  projectNo: "",
  customerName: "",
  phone: "",
};

export function ProjectListPage() {
  const [filters, setFilters] = useState<ProjectFilters>(defaultFilters);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = async (nextFilters: ProjectFilters = filters) => {
    setLoading(true);
    setError(null);

    try {
      const result = await listProjects(nextFilters);
      setProjects(result);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProjects(defaultFilters);
  }, []);

  const handleDelete = async (project: ProjectSummary) => {
    const confirmed = window.confirm(`确认删除项目「${project.projectNo} - ${project.customerName}」吗？此操作无法撤销。`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteProject(project.id);
      await loadProjects();
    } catch (caught) {
      window.alert(getErrorMessage(caught));
    }
  };

  const handleReset = () => {
    setFilters(defaultFilters);
    void loadProjects(defaultFilters);
  };

  return (
    <div className="page">
      <PageHeader
        title="项目列表"
        description="支持客户姓名、联系电话和项目编号搜索，操作尽量保持直接。"
        actions={
          <Link className="button" to="/projects/new">
            新建项目
          </Link>
        }
      />

      <section className="card">
        <form
          className="filter-form"
          onSubmit={(event) => {
            event.preventDefault();
            void loadProjects(filters);
          }}
        >
          <label className="field">
            <span className="field-label">项目编号</span>
            <input
              className="field-input"
              value={filters.projectNo ?? ""}
              onChange={(event) => setFilters({ ...filters, projectNo: event.target.value })}
              placeholder="按项目编号搜索"
            />
          </label>
          <label className="field">
            <span className="field-label">客户姓名</span>
            <input
              className="field-input"
              value={filters.customerName ?? ""}
              onChange={(event) => setFilters({ ...filters, customerName: event.target.value })}
              placeholder="按客户姓名搜索"
            />
          </label>
          <label className="field">
            <span className="field-label">联系电话</span>
            <input
              className="field-input"
              value={filters.phone ?? ""}
              onChange={(event) => setFilters({ ...filters, phone: event.target.value })}
              placeholder="按联系电话搜索"
            />
          </label>

          <div className="filter-actions">
            <button className="button button-secondary" type="button" onClick={handleReset}>
              重置
            </button>
            <button className="button" type="submit">
              搜索
            </button>
          </div>
        </form>
      </section>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {loading ? <div className="card-note">正在加载项目数据...</div> : null}

      {!loading && projects.length === 0 ? (
        <EmptyState
          title="暂无项目"
          description="当前没有项目记录，先新建第一条项目吧。"
          action={
            <Link className="button" to="/projects/new">
              新建项目
            </Link>
          }
        />
      ) : (
        <ProjectTable projects={projects} onDelete={handleDelete} />
      )}
    </div>
  );
}
