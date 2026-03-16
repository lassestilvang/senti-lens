import { AssistantMode } from '../components/ModeSelector';
import { playEarcon } from '../services/earconService';

/**
 * Detects if a user command intends to switch the assistant mode.
 * @param command The transcribed user spoken input.
 * @returns The target AssistantMode or null if no switch is detected.
 */
export function detectModeSwitch(command: string): AssistantMode | null {
  const normalized = command.toLowerCase();
  
  if (!normalized.includes('switch') && !normalized.includes('change') && !normalized.includes('enter') && !normalized.includes('go to')) {
    return null;
  }

  if (normalized.includes('document')) return 'document';
  if (normalized.includes('medication')) return 'medication';
  if (normalized.includes('environment')) return 'environment';
  if (normalized.includes('grocery')) return 'grocery';

  return null;
}

/**
 * Triggers the listening earcon to provide non-visual feedback that the AI is listening.
 */
export function notifyListening(): void {
  playEarcon('listen');
}
