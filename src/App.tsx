import { HashRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { ProjectStoreProvider } from "@/store/ProjectStore";
import { DashboardPage } from "@/pages/DashboardPage";
import { ProjectListPage } from "@/pages/ProjectListPage";
import { ProjectCreatePage } from "@/pages/ProjectCreatePage";
import { ProjectDetailPage } from "@/pages/ProjectDetailPage";
import { ProjectEditPage } from "@/pages/ProjectEditPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

export default function App() {
  return (
    <ProjectStoreProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="projects" element={<ProjectListPage />} />
            <Route path="projects/new" element={<ProjectCreatePage />} />
            <Route path="projects/:id" element={<ProjectDetailPage />} />
            <Route path="projects/:id/edit" element={<ProjectEditPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </ProjectStoreProvider>
  );
}
