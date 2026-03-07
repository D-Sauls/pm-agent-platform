import { Project, Milestone, Sprint } from "./entities.js";

// Project-focused schema grouping used by planners and dashboard widgets.
export interface ProjectAggregate {
  project: Project;
  milestones: Milestone[];
  sprints: Sprint[];
}
