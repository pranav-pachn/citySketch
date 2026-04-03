const EXPLANATIONS = {
  residential: 'Placed centrally for better accessibility',
  park: 'Placed near residential to improve walkability',
  hospital: 'Placed near road for emergency access',
  road: 'Ensures connectivity across all zones',
  empty: 'Unused land reserved for future planning',
};

export const getExplanation = (type) => EXPLANATIONS[type] || EXPLANATIONS.empty;
