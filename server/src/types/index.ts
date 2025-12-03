// Types that will be replaced by @prisma/client after generation
// These serve as placeholders until prisma generate is run

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  provider: string;
  providerId: string | null;
  role: string;
  timezone: string;
  preferences: any;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

export interface Skill {
  id: string;
  userId: string;
  name: string;
  icon: string;
  category: string;
  status: string;
  progressPercent: number;
  hoursSpent: number;
  currentStreak: number;
  longestStreak: number;
  notes: string | null;
  goalDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  status: string;
  priority: number;
  githubUrl: string | null;
  liveUrl: string | null;
  imageUrl: string | null;
  techStack: string[];
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Resource {
  id: string;
  userId: string;
  skillId: string | null;
  projectId: string | null;
  type: string;
  title: string;
  url: string;
  notes: string | null;
  isRead: boolean;
  isFavorite: boolean;
  rating: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Activity {
  id: string;
  userId: string;
  skillId: string | null;
  projectId: string | null;
  date: Date;
  type: string;
  description: string;
  durationMinutes: number | null;
  createdAt: Date;
}

export interface Tag {
  id: string;
  userId: string;
  name: string;
  color: string;
  createdAt: Date;
}

export interface TimeEntry {
  id: string;
  userId: string;
  skillId: string | null;
  projectId: string | null;
  description: string | null;
  startTime: Date;
  endTime: Date | null;
  durationSeconds: number | null;
  isRunning: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Tag relations
export interface SkillTag {
  skillId: string;
  tagId: string;
  tag: Tag;
}

export interface ProjectTag {
  projectId: string;
  tagId: string;
  tag: Tag;
}

export interface ResourceTag {
  resourceId: string;
  tagId: string;
  tag: Tag;
}

export interface TimeEntryTag {
  timeEntryId: string;
  tagId: string;
  tag: Tag;
}

// Skill with relations
export interface SkillWithTags extends Skill {
  tags: SkillTag[];
}

// Project with relations
export interface ProjectWithTags extends Project {
  tags: ProjectTag[];
}

// Resource with relations
export interface ResourceWithTags extends Resource {
  tags: ResourceTag[];
}

// TimeEntry with relations
export interface TimeEntryWithTags extends TimeEntry {
  tags: TimeEntryTag[];
}

// Tag with count
export interface TagWithCount extends Tag {
  _count: {
    skills: number;
    projects: number;
    resources: number;
    timeEntries: number;
  };
}

// Tag with items
export interface TagWithItems extends Tag {
  skills: { skill: { id: string; name: string; icon: string; status: string } }[];
  projects: { project: { id: string; name: string; status: string } }[];
  resources: { resource: { id: string; title: string; type: string } }[];
}

// Stats groupBy results
export interface SkillGroupBy {
  status: string;
  _count: { id: number };
}

export interface ProjectGroupBy {
  status: string;
  _count: { id: number };
}

export interface TimeGroupBy {
  skillId: string | null;
  projectId: string | null;
  _sum: { durationSeconds: number | null };
  _count: { id: number };
}

// Prisma transaction client type
export type PrismaTransactionClient = {
  skill: any;
  skillTag: any;
  project: any;
  projectTag: any;
  resource: any;
  resourceTag: any;
  activity: any;
  tag: any;
  timeEntry: any;
  timeEntryTag: any;
  user: any;
};
