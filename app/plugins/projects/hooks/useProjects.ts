import { useState, useEffect } from 'react';
import { projectAPI, participationAPI, milestoneAPI } from '../api/projects';
import {
  Project,
  ProjectDetail,
  ProjectParticipation,
  ProjectMilestone
} from '../types/project';

// Projects Hook
export const useProjects = (params?: {
  subject?: number;
  term?: number;
  evaluation_type?: string;
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await projectAPI.getAll(params);
      setProjects(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [params?.subject, params?.term, params?.evaluation_type]);

  const createProject = async (data: Partial<Project>) => {
    try {
      const newProject = await projectAPI.create(data);
      setProjects(prev => [newProject, ...prev]);
      return newProject;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to create project');
    }
  };

  const updateProject = async (id: number, data: Partial<Project>) => {
    try {
      const updated = await projectAPI.update(id, data);
      setProjects(prev => prev.map(p => p.id === id ? updated : p));
      return updated;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to update project');
    }
  };

  const deleteProject = async (id: number) => {
    try {
      await projectAPI.delete(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to delete project');
    }
  };

  return {
    projects,
    loading,
    error,
    refetch: fetchProjects,
    createProject,
    updateProject,
    deleteProject
  };
};

// Project Detail Hook
export const useProjectDetail = (projectId: number | null) => {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await projectAPI.getById(projectId);
      setProject(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch project details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  return {
    project,
    loading,
    error,
    refetch: fetchProject
  };
};

// Project Participations Hook
export const useParticipations = (params?: { project?: number; student?: number }) => {
  const [participations, setParticipations] = useState<ProjectParticipation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchParticipations = async () => {
    try {
      setLoading(true);
      const data = await participationAPI.getAll(params);
      setParticipations(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch participations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipations();
  }, [params?.project, params?.student]);

  const updateParticipation = async (id: number, data: Partial<ProjectParticipation>) => {
    try {
      const updated = await participationAPI.update(id, data);
      setParticipations(prev => prev.map(p => p.id === id ? updated : p));
      return updated;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to update participation');
    }
  };

  return {
    participations,
    loading,
    error,
    refetch: fetchParticipations,
    updateParticipation
  };
};

// Milestones Hook
export const useMilestones = (projectId?: number) => {
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMilestones = async () => {
    try {
      setLoading(true);
      const data = await milestoneAPI.getAll(projectId);
      setMilestones(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch milestones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMilestones();
  }, [projectId]);

  const createMilestone = async (data: Partial<ProjectMilestone>) => {
    try {
      const newMilestone = await milestoneAPI.create(data);
      setMilestones(prev => [...prev, newMilestone].sort((a, b) => a.sequence - b.sequence));
      return newMilestone;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to create milestone');
    }
  };

  const updateMilestone = async (id: number, data: Partial<ProjectMilestone>) => {
    try {
      const updated = await milestoneAPI.update(id, data);
      setMilestones(prev => prev.map(m => m.id === id ? updated : m));
      return updated;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to update milestone');
    }
  };

  const deleteMilestone = async (id: number) => {
    try {
      await milestoneAPI.delete(id);
      setMilestones(prev => prev.filter(m => m.id !== id));
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to delete milestone');
    }
  };

  return {
    milestones,
    loading,
    error,
    refetch: fetchMilestones,
    createMilestone,
    updateMilestone,
    deleteMilestone
  };
};