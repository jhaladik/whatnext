// src/utils/informationTheory.js

/**
 * Calculate entropy of a probability distribution
 * Entropy measures the uncertainty/randomness in the distribution
 * Higher entropy = more uncertainty = more information needed
 * 
 * @param {number[]} probabilities - Array of probabilities (must sum to 1)
 * @returns {number} Entropy in bits
 */
export function calculateEntropy(probabilities) {
  // Filter out zero probabilities (0 * log(0) is treated as 0)
  return -probabilities
    .filter(p => p > 0)
    .reduce((entropy, p) => entropy + p * Math.log2(p), 0);
}

/**
 * Calculate information gain from asking a question
 * Information gain = reduction in entropy after getting the answer
 * 
 * @param {number} currentEntropy - Entropy before asking the question
 * @param {Object[]} branches - Possible outcomes with their probabilities and resulting entropies
 * @returns {number} Information gain in bits
 */
export function calculateInformationGain(currentEntropy, branches) {
  // Calculate weighted average of entropies after the question
  const weightedEntropy = branches.reduce((sum, branch) => {
    return sum + (branch.probability * branch.entropy);
  }, 0);
  
  // Information gain is the reduction in entropy
  return currentEntropy - weightedEntropy;
}

/**
 * Calculate mutual information between two variables
 * Measures how much knowing one variable reduces uncertainty about the other
 * 
 * @param {Object} jointDistribution - Joint probability distribution
 * @returns {number} Mutual information in bits
 */
export function calculateMutualInformation(jointDistribution) {
  let mutualInfo = 0;
  
  for (const [x, yProbs] of Object.entries(jointDistribution)) {
    for (const [y, jointProb] of Object.entries(yProbs)) {
      if (jointProb > 0) {
        const marginalX = Object.values(jointDistribution[x]).reduce((sum, p) => sum + p, 0);
        const marginalY = Object.values(jointDistribution)
          .reduce((sum, row) => sum + (row[y] || 0), 0);
        
        mutualInfo += jointProb * Math.log2(jointProb / (marginalX * marginalY));
      }
    }
  }
  
  return mutualInfo;
}

/**
 * Calculate the expected information gain for a binary question
 * Assumes a 50/50 split for maximum entropy reduction
 * 
 * @param {number} currentEntropy - Current entropy of the system
 * @param {number} splitProbability - Probability of positive response (default 0.5)
 * @returns {number} Expected information gain
 */
export function calculateBinaryQuestionGain(currentEntropy, splitProbability = 0.5) {
  // For a perfect binary split, each branch has half the uncertainty
  const branch1Entropy = currentEntropy * (1 - splitProbability);
  const branch2Entropy = currentEntropy * splitProbability;
  
  const branches = [
    { probability: splitProbability, entropy: branch1Entropy },
    { probability: 1 - splitProbability, entropy: branch2Entropy }
  ];
  
  return calculateInformationGain(currentEntropy, branches);
}

/**
 * Calculate entropy for user preference state
 * Based on the number of possible content categories and resolved preferences
 * 
 * @param {number} totalCategories - Total number of content categories
 * @param {number} resolvedPreferences - Number of preferences already determined
 * @returns {number} Remaining entropy
 */
export function calculatePreferenceEntropy(totalCategories, resolvedPreferences) {
  // Start with maximum entropy (all categories equally likely)
  const maxEntropy = Math.log2(totalCategories);
  
  // Each resolved preference reduces entropy
  // This is a simplified model - real reduction depends on question quality
  const entropyReductionPerPreference = maxEntropy / 6; // Assume 6 questions fully resolve
  
  const remainingEntropy = Math.max(0, maxEntropy - (resolvedPreferences * entropyReductionPerPreference));
  
  return remainingEntropy;
}

/**
 * Calculate the informativeness of a question based on response distribution
 * Questions with 50/50 splits are most informative
 * 
 * @param {number[]} responseDistribution - Historical response distribution [count_option1, count_option2]
 * @returns {number} Informativeness score (0 to 1, where 1 is perfectly balanced)
 */
export function calculateQuestionInformativeness(responseDistribution) {
  const total = responseDistribution.reduce((sum, count) => sum + count, 0);
  
  if (total === 0) {
    // No data yet, assume perfect balance
    return 1.0;
  }
  
  const probabilities = responseDistribution.map(count => count / total);
  const actualEntropy = calculateEntropy(probabilities);
  
  // Maximum entropy for binary choice is 1 bit (50/50 split)
  const maxEntropy = 1.0;
  
  // Informativeness is how close we are to maximum entropy
  return actualEntropy / maxEntropy;
}

/**
 * Calculate expected entropy reduction for a question tree
 * Used for optimizing question ordering
 * 
 * @param {Object} questionTree - Tree structure of questions and branches
 * @param {number} currentEntropy - Starting entropy
 * @returns {number} Expected final entropy after all questions
 */
export function calculateTreeEntropy(questionTree, currentEntropy) {
  if (!questionTree.children || questionTree.children.length === 0) {
    // Leaf node - return current entropy
    return currentEntropy;
  }
  
  let expectedEntropy = 0;
  
  for (const child of questionTree.children) {
    const branchProbability = child.probability || 0.5;
    const branchEntropy = currentEntropy * (1 - questionTree.informationGain);
    
    // Recursively calculate entropy for this branch
    const finalEntropy = calculateTreeEntropy(child, branchEntropy);
    expectedEntropy += branchProbability * finalEntropy;
  }
  
  return expectedEntropy;
}

/**
 * Estimate information gain for a question based on historical performance
 * 
 * @param {Object} questionStats - Historical statistics for the question
 * @returns {number} Estimated information gain
 */
export function estimateQuestionGain(questionStats) {
  const {
    usage_count = 0,
    avg_info_gain = 0.5,
    response_distribution = [0.5, 0.5],
    leads_to_success = 0.5
  } = questionStats;
  
  // Base gain from historical average
  let estimatedGain = avg_info_gain;
  
  // Adjust based on response balance (50/50 is optimal)
  const informativeness = calculateQuestionInformativeness(response_distribution);
  estimatedGain *= informativeness;
  
  // Boost if question leads to successful recommendations
  estimatedGain *= (0.5 + leads_to_success * 0.5);
  
  // Small penalty for overused questions (encourage exploration)
  if (usage_count > 100) {
    estimatedGain *= 0.95;
  }
  
  return estimatedGain;
}

/**
 * Calculate the diversity score for a set of questions
 * Used to ensure variety in question selection
 * 
 * @param {string[]} questionCategories - Categories of selected questions
 * @returns {number} Diversity score (0 to 1)
 */
export function calculateQuestionDiversity(questionCategories) {
  const uniqueCategories = new Set(questionCategories);
  const totalQuestions = questionCategories.length;
  
  if (totalQuestions === 0) return 1;
  
  // Diversity is the ratio of unique categories to total questions
  return uniqueCategories.size / totalQuestions;
}

/**
 * Calculate confidence score for recommendations based on information gathered
 * 
 * @param {number} questionsAsked - Number of questions answered
 * @param {number} remainingEntropy - Remaining uncertainty
 * @param {number} responseConsistency - How consistent user responses were (0 to 1)
 * @returns {number} Confidence score (0 to 1)
 */
export function calculateRecommendationConfidence(questionsAsked, remainingEntropy, responseConsistency = 1) {
  // Base confidence from entropy reduction
  const maxEntropy = Math.log2(8); // Assume 8 major categories
  const entropyReduction = (maxEntropy - remainingEntropy) / maxEntropy;
  
  // Adjust for number of questions (more questions = more confidence, with diminishing returns)
  const questionConfidence = 1 - Math.exp(-questionsAsked / 3);
  
  // Combine factors
  const confidence = entropyReduction * 0.5 + questionConfidence * 0.3 + responseConsistency * 0.2;
  
  // Ensure confidence is between 0 and 1
  return Math.max(0, Math.min(1, confidence));
}