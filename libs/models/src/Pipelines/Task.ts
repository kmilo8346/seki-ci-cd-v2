import { z } from 'zod';

const TStepsEnum = ['SC', 'VA', 'BS', 'CI', 'GD', 'BG', 'TS', 'CD', 'DR'] as const;

const TaskUpdateSchema = z.object({
  status: z.enum(['UNDETERMINED', 'ERROR', 'WARN', 'SUCCESS']).default('UNDETERMINED'),
  markdown: z.string().nullable().default(null),
  meta_data: z.any().default({}),
});

const TaskSchema = TaskUpdateSchema.merge(
  z.object({
    commit_id: z.string().nonempty(),
    task_id: z.number(),
    step: z.enum(TStepsEnum),
    sub_step: z.string().nonempty(),
    kind: z.string(),
    command: z.string().nonempty(),
    depends_on: z.enum(TStepsEnum),
    created_at: z.string().datetime().optional(),
    updated_at: z.string().datetime().optional(),
    started_at: z.string().datetime().nullable().default(null),
  })
);

const TaskNewSchema = TaskSchema.merge(
  z.object({
    state: z.enum(['IDLE', 'PENDING', 'STARTED', 'COMPLETED']).default('IDLE'),
  })
);

const TaskPendingSchema = z.object({
  commit_id: z.string().nonempty(),
  task_id: z.number(),
  step: z.enum(TStepsEnum),
  sub_step: z.string().nonempty(),
  kind: z.string(),
  command: z.string().nonempty(),
});

const TaskPendingWithMetadataSchema = TaskPendingSchema.merge(
  z.object({
    meta_data: z.any().default({}),
  })
);

const TaskPendingsSchema = z.object({
  pendings: z.array(TaskPendingSchema),
  meta_data: z.record(z.any()),
});

const TaskIdSchema = z.object({
  commit_id: z.string().nonempty(),
  task_id: z.number(),
});

const TaskIdsSchema = z.array(TaskIdSchema);

type TTask = z.infer<typeof TaskSchema>;
type TTaskUpdate = z.infer<typeof TaskUpdateSchema>;
type TTaskNew = z.infer<typeof TaskNewSchema>;
type TTaskId = z.infer<typeof TaskIdSchema>;
type TTaskPending = z.infer<typeof TaskPendingSchema>;
type TTaskPendingWithMetadata = z.infer<typeof TaskPendingWithMetadataSchema>;
type TTaskPendings = z.infer<typeof TaskPendingsSchema>;

export {
  TTask,
  TaskSchema,
  TTaskUpdate,
  TaskUpdateSchema,
  TTaskNew,
  TaskNewSchema,
  TTaskId,
  TaskIdSchema,
  TaskIdsSchema,
  TStepsEnum,
  TTaskPending,
  TaskPendingSchema,
  TTaskPendingWithMetadata,
  TaskPendingWithMetadataSchema,
  TTaskPendings,
  TaskPendingsSchema,
};
