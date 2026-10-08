import { z } from 'zod';

const CommitMetadataSchema = z.object({
  step: z.string(),
  sub_step: z.string(),
  command: z.string(),
  kind: z.string(),
  meta_data: z.any(),
});

const CommitSchema = z.object({
  id: z.string(),
  commit: z.string(),
  commit_message: z.string(),
  reference: z.string(),
  environment: z.enum(['staging', 'production']),
  organization: z.string().toLowerCase(),
  repository: z.string(),
  trigger: z.enum(['commit', 'tag']),
  trigger_by: z.string(),
  meta_data: z.array(CommitMetadataSchema).optional(),
  state: z.enum(['IDLE', 'STARTED', 'COMPLETED']).default('IDLE'),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

type TCommit = z.infer<typeof CommitSchema>;
type TCommitMetadata = z.infer<typeof CommitMetadataSchema>;

export { TCommit, TCommitMetadata, CommitSchema };
