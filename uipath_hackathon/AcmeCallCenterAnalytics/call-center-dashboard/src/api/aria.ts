import { ConversationalAgent } from '@uipath/uipath-typescript/conversational-agent';
import type { IUiPath } from '@uipath/uipath-typescript/core';

export const ARIA_FOLDER_ID = Number(import.meta.env.VITE_ARIA_AGENT_FOLDER_ID);
export const ARIA_AGENT_NAME = 'Agent';

export function createAriaService(sdk: IUiPath): ConversationalAgent {
  return new ConversationalAgent(sdk);
}
