import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Project, Message, MemoryEntry, Settings } from '@/types';
import * as storage from '@/services/storage';

interface AppContextType {
  // Projects
  projects: Project[];
  currentProject: Project | null;
  loadingProjects: boolean;
  loadProjects: () => Promise<void>;
  selectProject: (project: Project | null) => void;
  createProject: (name: string, systemPrompt?: string) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // Messages
  messages: Message[];
  loadingMessages: boolean;
  loadMessages: (projectId: string) => Promise<void>;
  clearMessages: (projectId: string) => Promise<void>;

  // Memories
  memories: MemoryEntry[];
  loadingMemories: boolean;
  loadMemories: (projectId: string) => Promise<void>;
  createMemory: (projectId: string, title: string, content: string) => Promise<MemoryEntry>;
  updateMemory: (id: string, updates: Partial<MemoryEntry>) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;

  // Settings
  settings: Settings;
  loadingSettings: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [loadingMemories, setLoadingMemories] = useState(false);

  const [settings, setSettings] = useState<Settings>({
    openRouterApiKey: '',
    selectedModel: 'openai/gpt-4o-mini',
    theme: 'system',
  });
  const [loadingSettings, setLoadingSettings] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const loadedProjects = await storage.getProjects();
      setProjects(loadedProjects.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ));
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  const selectProject = useCallback((project: Project | null) => {
    setCurrentProject(project);
    if (project) {
      loadMessages(project.id);
      loadMemories(project.id);
    } else {
      setMessages([]);
      setMemories([]);
    }
  }, []);

  const createProject = useCallback(async (name: string, systemPrompt?: string) => {
    const project = await storage.createProject(name, systemPrompt);
    await loadProjects();
    return project;
  }, [loadProjects]);

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    await storage.updateProject(id, updates);
    await loadProjects();
    if (currentProject?.id === id) {
      setCurrentProject(prev => prev ? { ...prev, ...updates } : null);
    }
  }, [loadProjects, currentProject]);

  const deleteProject = useCallback(async (id: string) => {
    await storage.deleteProject(id);
    await loadProjects();
    if (currentProject?.id === id) {
      setCurrentProject(null);
      setMessages([]);
      setMemories([]);
    }
  }, [loadProjects, currentProject]);

  const loadMessages = useCallback(async (projectId: string) => {
    setLoadingMessages(true);
    try {
      const loadedMessages = await storage.getMessages(projectId);
      setMessages(loadedMessages);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const clearMessages = useCallback(async (projectId: string) => {
    await storage.clearProjectMessages(projectId);
    await loadMessages(projectId);
  }, [loadMessages]);

  const loadMemories = useCallback(async (projectId: string) => {
    setLoadingMemories(true);
    try {
      const loadedMemories = await storage.getAllMemories();
      setMemories(loadedMemories.filter(m => m.projectId === projectId));
    } finally {
      setLoadingMemories(false);
    }
  }, []);

  const createMemory = useCallback(async (projectId: string, title: string, content: string) => {
    const memory = await storage.createMemory(projectId, title, content);
    await loadMemories(projectId);
    return memory;
  }, [loadMemories]);

  const updateMemory = useCallback(async (id: string, updates: Partial<MemoryEntry>) => {
    await storage.updateMemory(id, updates);
    if (currentProject) {
      await loadMemories(currentProject.id);
    }
  }, [loadMemories, currentProject]);

  const deleteMemory = useCallback(async (id: string) => {
    await storage.deleteMemory(id);
    if (currentProject) {
      await loadMemories(currentProject.id);
    }
  }, [loadMemories, currentProject]);

  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const loadedSettings = await storage.getSettings();
      setSettings(loadedSettings);
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  const updateSettings = useCallback(async (updates: Partial<Settings>) => {
    await storage.saveSettings(updates);
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const value: AppContextType = {
    projects,
    currentProject,
    loadingProjects,
    loadProjects,
    selectProject,
    createProject,
    updateProject,
    deleteProject,
    messages,
    loadingMessages,
    loadMessages,
    clearMessages,
    memories,
    loadingMemories,
    loadMemories,
    createMemory,
    updateMemory,
    deleteMemory,
    settings,
    loadingSettings,
    loadSettings,
    updateSettings,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
