import { z } from 'zod';

type TStatus = 200 | 422 | 500;

const Schema = z.object({
  commit_id: z.string(),
  task_id: z.number(),
  status: z.number(),
  message: z.string().optional(),
});

type TModel = z.infer<typeof Schema>;

export { TModel, Schema, TStatus };
