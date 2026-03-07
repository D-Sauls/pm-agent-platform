import { Task } from "./entities.js";

// Task schema extension point for provider-specific metadata.
export interface TaskCollection {
  tasks: Task[];
  sourceSystem: string;
}
