/**
 * Determines if any of the detected safety objects represent an immediate hazard.
 * @param safetyObjects List of identified safety-critical objects.
 * @returns True if an immediate interrupt is required for safety.
 */
export function isImmediateHazard(safetyObjects: string[]): boolean {
  const hazards = ['red', 'obstacle', 'stop', 'warning', 'danger'];
  
  return safetyObjects.some(obj => 
    hazards.some(hazard => obj.toLowerCase().includes(hazard))
  );
}
