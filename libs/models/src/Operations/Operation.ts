import { z } from 'zod';

const Schema = z.object({
  /**
   * Command to execute.
   * Must be a runner that support the command
   */
  command: z.string(),

  /**
   * Command arguments
   */
  command_args: z.record(z.string(), z.any()),
});

type TModel = z.infer<typeof Schema>;

export { TModel, Schema };
