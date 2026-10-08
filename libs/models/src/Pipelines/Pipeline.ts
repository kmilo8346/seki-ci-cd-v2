import { z } from 'zod';
import { TaskNewSchema } from './Task';

const PipelineSchema = z.object({
  id: z.string(),
  commit: z.string(),
  commit_message: z.string(),
  reference: z.string(),
  environment: z.enum(['staging', 'production']),
  organization: z.string().toLowerCase(),
  repository: z.string(),
  trigger: z.enum(['commit', 'tag']),
  trigger_by: z.string(),
  state: z.enum(['IDLE', 'STARTED', 'COMPLETED']).default('IDLE'),
  tasks: z.array(TaskNewSchema).nonempty(),
  created_at: z.string().datetime().default(new Date().toISOString()),
  updated_at: z.string().datetime().default(new Date().toISOString()),
});

type TPipeline = z.infer<typeof PipelineSchema>;

export { TPipeline, PipelineSchema };
