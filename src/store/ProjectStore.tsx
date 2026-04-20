import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import type { DashboardStats, ResolvedAppConfig } from "@/types/app";
import { getAppConfig } from "@/services/configService";
import { getDashboardStats } from "@/services/projectService";
import { getErrorMessage } from "@/utils/errors";

interface ProjectStoreValue {
  config: ResolvedAppConfig | null;
  stats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;
  reloadMeta: () => Promise<void>;
  reloadStats: () => Promise<void>;
}

const ProjectStoreContext = createContext<ProjectStoreValue | undefined>(undefined);

export function ProjectStoreProvider({ children }: PropsWithChildren) {
  const [config, setConfig] = useState<ResolvedAppConfig | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reloadMeta = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const [nextConfig, nextStats] = await Promise.all([getAppConfig(), getDashboardStats()]);
      setConfig(nextConfig);
      setStats(nextStats);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setIsLoading(false);
    }
  };

  const reloadStats = async () => {
    try {
      const nextStats = await getDashboardStats();
      setStats(nextStats);
    } catch (caught) {
      setError(getErrorMessage(caught));
    }
  };

  useEffect(() => {
    void reloadMeta();
  }, []);

  const value = useMemo<ProjectStoreValue>(
    () => ({
      config,
      stats,
      isLoading,
      error,
      reloadMeta,
      reloadStats,
    }),
    [config, error, isLoading, stats],
  );

  return <ProjectStoreContext.Provider value={value}>{children}</ProjectStoreContext.Provider>;
}

export function useProjectStore() {
  const context = useContext(ProjectStoreContext);

  if (!context) {
    throw new Error("useProjectStore must be used within ProjectStoreProvider.");
  }

  return context;
}
