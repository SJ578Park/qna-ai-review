import { defineConfig } from '@genkit-ai/core';
import { firebase } from '@genkit-ai/firebase';
import { vertexAI } from '@genkit-ai/vertexai';

const projectId =
  process.env.GCLOUD_PROJECT ??
  process.env.GOOGLE_CLOUD_PROJECT ??
  'qna-ai-review';

export default defineConfig({
  plugins: [
    firebase(),
    vertexAI({
      projectId,
      location: process.env.VERTEX_LOCATION ?? 'us-central1',
    }),
  ],
});
