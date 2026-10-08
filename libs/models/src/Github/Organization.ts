import { z } from 'zod';

const OrganizationSchema = z.object({
  name: z.string(),
  token: z.string(),
  user: z.string().optional(),
  title: z.string().optional()
});
type TOrganization = z.infer<typeof OrganizationSchema>

const OrganizationsSchema = z.record(OrganizationSchema);
type TOrganizations = z.infer<typeof OrganizationsSchema>

export {
  TOrganization,
  OrganizationSchema,

  TOrganizations,
  OrganizationsSchema
}