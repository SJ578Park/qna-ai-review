import { genkit } from 'genkit';
import { vertexAI, gemini15Pro } from '@genkit-ai/vertexai';
import { config as functionsConfig } from 'firebase-functions';

type RuntimeConfig = Record<string, unknown>;

function loadRuntimeConfig(): RuntimeConfig {
  try {
    return functionsConfig();
  } catch (_error) {
    // When running locally without functions config, return empty fallback.
    return {};
  }
}

const runtimeConfig = loadRuntimeConfig();

const projectId =
  process.env.GCLOUD_PROJECT ??
  process.env.GOOGLE_CLOUD_PROJECT ??
  (runtimeConfig.projectId as string | undefined);

const runtimeLocation =
  typeof runtimeConfig?.genkit === 'object' &&
  runtimeConfig.genkit !== null &&
  typeof (runtimeConfig.genkit as Record<string, unknown>).vertex_location === 'string'
    ? ((runtimeConfig.genkit as Record<string, unknown>).vertex_location as string)
    : undefined;

const location =
  process.env.VERTEX_LOCATION ??
  process.env.GENKIT_VERTEX_LOCATION ??
  runtimeLocation ??
  'us-central1';

// 디버깅: location 값 확인
if (typeof process !== 'undefined' && process.env) {
  console.log('[genkitClient] Location resolved:', {
    VERTEX_LOCATION: process.env.VERTEX_LOCATION,
    GENKIT_VERTEX_LOCATION: process.env.GENKIT_VERTEX_LOCATION,
    runtimeLocation,
    finalLocation: location,
  });
}

export const ai = genkit({
  plugins: [
    vertexAI({
      projectId,
      location,
    }),
  ],
  // Default to Gemini 1.5 Pro; individual calls can override via `model`.
  model: gemini15Pro,
});
