import { logger } from 'firebase-functions';
import { config as functionsConfig } from 'firebase-functions';
import { ai } from './genkitClient.js';

type RuntimeConfig = Record<string, unknown>;

function loadRuntimeConfig(): RuntimeConfig {
  try {
    return functionsConfig();
  } catch (_error) {
    return {};
  }
}

const runtimeConfig = loadRuntimeConfig();

export interface DraftAnswerContext {
  title: string;
  body: string;
  tags?: string[];
  authorName?: string | null;
}

export interface DraftHistoryEntry {
  role: string;
  kind: string;
  content: string;
}

export interface DraftAnswerInput {
  question: DraftAnswerContext;
  history: DraftHistoryEntry[];
}

function buildPrompt({ question, history }: DraftAnswerInput): string {
  const tagLine = question.tags && question.tags.length > 0 ? `태그: ${question.tags.join(', ')}` : '태그: (없음)';
  const historyText = history
    .map((entry) => `- [${entry.role}/${entry.kind}] ${entry.content}`)
    .join('\n');

  return `다음은 고객 지원용 Q&A 시스템에 수집된 질문과 최근 대화 내용입니다.\n` +
    `질문 제목: ${question.title}\n` +
    `질문 본문:\n${question.body}\n\n` +
    `${tagLine}\n\n` +
    `참고용 최근 메시지:\n${historyText || '(최근 메시지 없음)' }\n\n` +
    `위 정보를 바탕으로, 관리자 검토 전에 제안할 한국어 답변 초안을 작성하세요.\n` +
    `답변은 다음 지침을 따릅니다:\n` +
    `1. 명확하고 친절한 톤을 유지합니다.\n` +
    `2. 불확실한 내용은 추측하지 말고 추후 확인이 필요함을 명시합니다.\n` +
    `3. 사용자가 취할 수 있는 다음 단계(예: 추가 정보, 지원 문의 등)를 제안합니다.\n` +
    `4. 필요한 경우 목록이나 단계로 정리해 가독성을 높입니다.`;
}

const MODEL_ALIASES: Record<string, string> = {
  'gemini-1.5-pro-latest': 'gemini-1.5-pro',
  'gemini-1.5-pro': 'gemini-1.5-pro',
  'gemini-1.5-pro-001': 'gemini-1.5-pro-001',
  'gemini-1.5-pro-002': 'gemini-1.5-pro-002',
  'vertexai/gemini-1.5-pro-latest': 'gemini-1.5-pro',
  'vertexai/gemini-1.5-pro': 'gemini-1.5-pro',
  'vertexai/gemini-1.5-pro-001': 'gemini-1.5-pro-001',
  'vertexai/gemini-1.5-pro-002': 'gemini-1.5-pro-002',
};

function resolveModel(): string {
  const runtimeModel =
    typeof runtimeConfig?.genkit === 'object' &&
    runtimeConfig.genkit !== null &&
    typeof (runtimeConfig.genkit as Record<string, unknown>).model === 'string'
      ? ((runtimeConfig.genkit as Record<string, unknown>).model as string)
      : undefined;

  const envModel =
    process.env.GENKIT_MODEL?.trim() ??
    process.env.GENKIT_MODEL_NAME?.trim() ??
    runtimeModel?.trim();
  if (envModel && envModel.length > 0) {
    // vertexai/ 접두사 제거 후 정규화
    const cleanedModel = envModel.startsWith('vertexai/') 
      ? envModel.replace(/^vertexai\//, '') 
      : envModel;
    const normalized = MODEL_ALIASES[cleanedModel] ?? MODEL_ALIASES[envModel] ?? cleanedModel;
    return normalized;
  }
  return 'gemini-1.5-pro';
}

function resolveLocation(): string {
  const runtimeLocation =
    typeof runtimeConfig?.genkit === 'object' &&
    runtimeConfig.genkit !== null &&
    typeof (runtimeConfig.genkit as Record<string, unknown>).vertex_location === 'string'
      ? ((runtimeConfig.genkit as Record<string, unknown>).vertex_location as string)
      : undefined;

  return (
    process.env.VERTEX_LOCATION ??
    process.env.GENKIT_VERTEX_LOCATION ??
    runtimeLocation ??
    'us-central1'
  );
}

function getModelName(): string {
  // 환경 변수로 모델 버전 지정 가능
  const modelName = process.env.GENKIT_MODEL?.trim() ?? 'gemini-1.5-pro-002';
  return modelName;
}

async function tryGenerateWithGenkit(prompt: string): Promise<string | null> {
  if (process.env.GENKIT_DISABLE === 'true') {
    return null;
  }

  const resolvedLocation = resolveLocation();
  const modelName = getModelName();
  
  try {
    logger.info('Genkit draft configuration', {
      model: modelName,
      envModel: process.env.GENKIT_MODEL ?? null,
      vertexLocation: resolvedLocation,
      envVertexLocation: process.env.VERTEX_LOCATION ?? null,
      projectId: process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? null,
    });

    logger.info('Calling Genkit ai.generate...', {
      model: modelName,
      promptLength: prompt.length,
    });

    // 모델 이름을 문자열로 전달하여 플러그인의 location 설정 사용
    // 모델 객체를 직접 사용하면 플러그인의 location 설정을 무시할 수 있음
    const response = await ai.generate({
      model: modelName,
      system: '고객 지원 담당자처럼 명확하고 친절한 한국어로 응답하세요.',
      prompt: [{ text: prompt }],
      config: {
        temperature: 0.2,
        topP: 0.95,
      },
    });

    logger.info('Genkit response received', {
      hasResponse: !!response,
      responseType: typeof response,
      hasText: 'text' in response,
      hasOutput: 'output' in response,
      responseKeys: response ? Object.keys(response) : [],
      textValue: response?.text ? response.text.substring(0, 100) : null,
      outputLength: Array.isArray(response?.output) ? response.output.length : 0,
    });

    const text = response.text ?? response.output?.[0]?.text;
    logger.info('Extracted text from response', {
      hasText: !!text,
      textType: typeof text,
      textLength: typeof text === 'string' ? text.length : 0,
      textPreview: typeof text === 'string' ? text.substring(0, 100) : null,
    });

    if (typeof text === 'string' && text.trim().length > 0) {
      logger.info('AI draft generated successfully', {
        textLength: text.trim().length,
      });
      return text.trim();
    }

    logger.warn('AI response is empty or invalid, falling back to default', {
      textValue: text,
      textType: typeof text,
    });
    return null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error('Genkit draft generation failed, falling back to heuristic message.', {
      error: errorMessage,
      stack: errorStack,
      model: process.env.GENKIT_MODEL ?? 'gemini-1.5-pro-002',
      resolvedLocation,
      projectId: process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? null,
    });
    return null;
  }
}

function buildFallbackDraft(input: DraftAnswerInput): string {
  const requester = input.question.authorName || '사용자';
  const summary = input.question.body.split('\n').slice(0, 2).join('\n');
  const steps = [
    '문의 내용을 검토 중이며, 담당자가 답변을 확정하면 곧 안내드릴 예정입니다.',
    '필요 시 추가 정보나 재현 방법을 알려주시면 더 정확한 답변에 도움이 됩니다.',
    '진행 상황은 이 페이지에서 계속 업데이트됩니다.'
  ];

  return [
    `${requester}님, 문의 주셔서 감사합니다.`,
    '현재 관리자 검토 전 자동 생성된 초안 답변입니다.',
    summary.length > 0 ? `요약된 질문 내용:\n${summary}` : '',
    '다음 내용을 참고해주세요:',
    ...steps.map((step, idx) => `${idx + 1}. ${step}`),
    '',
    '※ 본 답변은 AI가 생성한 초안이며, 관리자의 검토 및 수정을 거쳐 공식 답변으로 게시될 예정입니다.'
  ].filter(Boolean).join('\n\n');
}

export async function generateDraftAnswer(input: DraftAnswerInput): Promise<string> {
  const prompt = buildPrompt(input);
  const aiDraft = await tryGenerateWithGenkit(prompt);
  if (aiDraft && aiDraft.trim().length > 0) {
    return aiDraft.trim();
  }
  return buildFallbackDraft(input);
}
