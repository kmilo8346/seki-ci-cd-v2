import { z } from 'zod';

const CommitSchema = z.object({
  sha: z.string(),
  commit: z.object({
    author: z.object({
      name: z.string(),
      email: z.string(),
      date: z.string(),
    }),
    message: z.string(),
    url: z.string(),
  }),
  files:  z.array(z.object({
    filename: z.string()
  }))
});

type TCommit = z.infer<typeof CommitSchema>

export {
  TCommit,
  CommitSchema,
}