import { AssistantMode } from '../components/ModeSelector';

interface SceneAnalysis {
  objects: string[];
  environment: string;
}

/**
 * Suggests a different mode based on the visual analysis of the scene.
 * @param analysis The visual analysis result from the model.
 * @param currentMode The currently active assistant mode.
 * @returns A suggested AssistantMode or null if the current mode is fine.
 */
export function suggestModeFromScene(analysis: SceneAnalysis, currentMode: AssistantMode): AssistantMode | null {
  const objects = analysis.objects.map(o => o.toLowerCase());
  
  if (currentMode !== 'document' && objects.some(o => o.includes('document') || o.includes('paper') || o.includes('letter'))) {
    return 'document';
  }

  if (currentMode !== 'medication' && objects.some(o => o.includes('pill') || o.includes('medicine') || o.includes('prescription'))) {
    return 'medication';
  }

  if (currentMode !== 'grocery' && (analysis.environment.toLowerCase().includes('grocery') || objects.some(o => o.includes('box') || o.includes('package')))) {
    // Only suggest grocery if we're not in a specific reading mode
    if (currentMode === 'environment') return 'grocery';
  }

  return null;
}
