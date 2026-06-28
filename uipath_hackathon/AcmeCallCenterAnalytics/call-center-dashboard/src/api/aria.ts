import { ConversationalAgent } from '@uipath/uipath-typescript/conversational-agent';
import type { UiPath } from '@uipath/uipath-typescript/core';

const rawFolderId = Number(import.meta.env.VITE_ARIA_AGENT_FOLDER_ID);
export const ARIA_FOLDER_ID: number | undefined = Number.isFinite(rawFolderId) ? rawFolderId : undefined;
export const ARIA_AGENT_NAME = 'Agent';

export function createAriaService(sdk: UiPath): ConversationalAgent {
  return new ConversationalAgent(sdk);
}
