import { z } from 'zod';

export const FetchJobRequest = z.object({
  url: z.string().url(),
});

export const JobDetails = z.object({
  title: z.string(),
  description: z.string(),
  skills: z.array(z.string()),
  budget: z.string(),
  platform: z.string(),
});

export const FetchJobResponse = JobDetails;

export type FetchJobRequest = z.infer<typeof FetchJobRequest>;
export type JobDetails = z.infer<typeof JobDetails>;
export type FetchJobResponse = z.infer<typeof FetchJobResponse>;
