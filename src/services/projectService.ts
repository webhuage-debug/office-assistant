import type {
  DashboardStats,
  ProjectDetail,
  ProjectFilters,
  ProjectSummary,
  ProjectUpsertInput,
} from "@/types/app";
import { callBackend } from "@/services/backendClient";

export async function listProjects(filters: ProjectFilters = {}): Promise<ProjectSummary[]> {
  return callBackend<ProjectSummary[]>("list_projects", { filters });
}

export async function getProjectById(id: string): Promise<ProjectDetail | null> {
  return callBackend<ProjectDetail | null>("get_project", { id });
}

export async function createProject(input: ProjectUpsertInput): Promise<ProjectDetail> {
  return callBackend<ProjectDetail>("create_project", { input });
}

export async function updateProject(id: string, input: ProjectUpsertInput): Promise<ProjectDetail> {
  return callBackend<ProjectDetail>("update_project", { id, input });
}

export async function deleteProject(id: string): Promise<void> {
  await callBackend<void>("delete_project", { id });
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return callBackend<DashboardStats>("get_dashboard_stats");
}
