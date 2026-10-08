import { z } from 'zod';

const CreateSchema = z.object({
  // id come from the runner when it register itself
  id: z.string(),
  endpoint: z.string(),
  timeout: z.number().optional().default(30),
  api_key: z.string().optional(),
});

const Schema = CreateSchema.merge(
  z.object({
    registered_at: z.string().datetime(),
  })
);

const CreateListSchema = z.array(CreateSchema);

type TModel = z.infer<typeof Schema>;
type TCreateModel = z.infer<typeof CreateSchema>;

export { TModel, Schema, TCreateModel, CreateSchema, CreateListSchema };
