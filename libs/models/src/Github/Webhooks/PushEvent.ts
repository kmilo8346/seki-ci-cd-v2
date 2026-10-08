import { z } from 'zod';

const PushEventSchema = z.object({
  ref: z.string(),
  head_commit: z.object({
    id: z.string(),
    message: z.string(),
    added: z.array(z.string()),
    removed: z.array(z.string()),
    modified: z.array(z.string()),
    committer: z.object({
      name: z.string(),
      email: z.string(),
    }),
    timestamp: z.string(),
  }),
  repository: z.object({
    html_url: z.string(),
    name: z.string(),
    topics: z.array(z.string()),
  }),
  organization: z.object({
    login: z.string(),
  }),
});

type TPushEvent = z.infer<typeof PushEventSchema>;

export { TPushEvent, PushEventSchema };
