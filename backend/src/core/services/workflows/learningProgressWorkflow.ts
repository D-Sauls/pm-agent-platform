import { z } from "zod";
import type { LearningProgressResult } from "../../models/knowledgeModels.js";
import type { AgentExecutionContext, BaseWorkflow, WorkflowResult } from "./baseWorkflow.js";
import { CourseService } from "../knowledge/CourseService.js";
import { LearningProgressService } from "../knowledge/LearningProgressService.js";

const metadataSchema = z.object({
  userId: z.string().min(1),
  courseId: z.string().min(1)
});

export class LearningProgressWorkflow implements BaseWorkflow {
  id = "learning_progress" as const;
  name = "Learning Progress Workflow";
  description = "Summarizes completion progress for a user within a course.";
  supportedInputTypes = ["progress_lookup", "learning_status", "completion_report"];

  constructor(
    private readonly courseService: CourseService,
    private readonly learningProgressService: LearningProgressService
  ) {}

  async execute(context: AgentExecutionContext): Promise<WorkflowResult> {
    const metadata = metadataSchema.parse(context.metadata ?? {});
    const course = this.courseService.getCourseById(context.tenantContext.tenant.tenantId, metadata.courseId);
    const progress = this.learningProgressService.calculateCourseProgress(
      context.tenantContext.tenant.tenantId,
      metadata.userId,
      course
    );

    const result: LearningProgressResult = {
      workflowId: this.id,
      resultType: "learning_progress",
      userId: metadata.userId,
      courseId: metadata.courseId,
      progressPercent: progress.progressPercent,
      completedLessons: progress.completedLessons,
      totalLessons: progress.totalLessons,
      status: progress.status,
      generatedAt: new Date(),
      warnings: progress.totalLessons === 0 ? ["Course has no lessons defined."] : []
    };

    return {
      workflowId: this.id,
      resultType: result.resultType,
      data: result,
      generatedAt: result.generatedAt,
      confidenceScore: 0.93,
      warnings: result.warnings
    };
  }
}
