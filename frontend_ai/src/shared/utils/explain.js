// ─── Guide Section 7 — Explainability Engine ──────────────────────────────
// Context-aware explanation templates based on neighbor types.

const EXPLANATIONS = {
  park: (neighbors) => {
    if (neighbors.includes('residential'))
      return 'Park placed near residential zone for easy walkability and daily access.';
    return 'Park added to improve green coverage and sustainability score.';
  },
  hospital: (neighbors) => {
    if (neighbors.includes('road'))
      return 'Hospital placed adjacent to main road for quick emergency vehicle access.';
    return 'Hospital positioned near road network to ensure accessibility.';
  },
  residential: (neighbors) => {
    if (neighbors.includes('park'))
      return 'Residential block benefits from proximity to park — improves livability score.';
    if (neighbors.includes('school'))
      return 'Residential zone near school — reduces commute for families with children.';
    if (neighbors.includes('road'))
      return 'Residential zone placed near road for transportation access.';
    return 'Residential zone placed in quiet interior — low noise, high livability.';
  },
  commercial: (neighbors) => {
    if (neighbors.includes('road'))
      return 'Commercial zone on road edge — maximizes customer footfall and access.';
    return 'Commercial area placed for economic activity near transport routes.';
  },
  school: (neighbors) => {
    if (neighbors.includes('residential'))
      return 'School near residential area — reduces commute time for students.';
    if (neighbors.includes('park'))
      return 'School adjacent to park — provides outdoor activity space for students.';
    return 'School placed in safe, low-traffic interior zone.';
  },
  industrial: () => 'Industrial area placed away from homes to separate heavy activity and traffic.',
  water: () => 'Water body defines the landscape and shapes surrounding development.',
  road: () => 'Road cell — connects all zones and ensures full layout connectivity.',
  empty: () => 'Unused land reserved for future planning.',
};

/**
 * Get a context-aware explanation for a cell based on its type and neighbors.
 * @param {string} type - The cell type
 * @param {string[]} [neighborTypes] - Optional array of neighbor cell types
 * @returns {string} Human-readable explanation
 */
export const getExplanation = (type, neighborTypes) => {
  const fn = EXPLANATIONS[type];
  if (!fn) return EXPLANATIONS.empty();
  if (typeof fn === 'function') {
    return fn(Array.isArray(neighborTypes) ? neighborTypes : []);
  }
  return fn;
};
