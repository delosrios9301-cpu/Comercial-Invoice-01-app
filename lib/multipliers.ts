/**
 * Centralized sample multiplier configuration and utilities
 * 
 * This module defines all rules for calculating ML/gm multipliers based on:
 * - Sample description
 * - Study name
 * 
 * Benefits:
 * - Single source of truth for all multiplier logic
 * - Case-insensitive and robust matching
 * - Easy to add new rules
 * - Comprehensive documentation
 */

export interface MultiplierRule {
  /** Pattern to match in sample description (case-insensitive) */
  samplePattern: string
  /** Pattern to match in study name (case-insensitive) - optional */
  studyPattern?: string
  /** Multiplier value to apply */
  multiplier: number
  /** Human-readable description of the rule */
  description: string
}

export interface SampleMultiplierInfo {
  description: string
  qty: number
  calculated_ml: number
  multiplier: number
  appliedReason: string
}

/**
 * All multiplier rules in priority order (first match wins)
 * Rules are checked in order, so more specific rules should come first
 */
export const MULTIPLIER_RULES: MultiplierRule[] = [
  {
    samplePattern: "human serum",
    studyPattern: "VYF04",
    multiplier: 1.5,
    description: "Human Serum from VYF04 study",
  },
  {
    samplePattern: "nasal",
    multiplier: 3,
    description: "Nasal samples",
  },
  {
    samplePattern: "swab",
    multiplier: 3,
    description: "Swab samples",
  },
  {
    samplePattern: "hisopado",
    multiplier: 3,
    description: "Hisopado samples",
  },
]

/**
 * Normalize string for matching: lowercase and trim whitespace
 * 
 * @param str - String to normalize
 * @returns Normalized string
 */
function normalizeString(str: string): string {
  return str.toLowerCase().trim()
}

/**
 * Get the multiplier for a sample based on its description and study name
 * 
 * Rules are evaluated in order until a match is found.
 * Matching is case-insensitive and uses partial string matching.
 * 
 * @param sampleDescription - Description of the sample
 * @param studyName - Name of the study
 * @returns Multiplier value (1 = no multiplier, 1.5 = 50% increase, 3 = 200% increase)
 * 
 * @example
 * getMultiplier("HUMAN SERUM", "VYF04") // returns 1.5
 * getMultiplier("Nasal Swab", "STUDY-001") // returns 3
 * getMultiplier("Blood", "STUDY-001") // returns 1 (default)
 */
export function getMultiplier(
  sampleDescription: string,
  studyName: string
): number {
  const normalizedSample = normalizeString(sampleDescription)
  const normalizedStudy = normalizeString(studyName)

  // Check each rule in order
  for (const rule of MULTIPLIER_RULES) {
    const sampleMatches = normalizedSample.includes(normalizeString(rule.samplePattern))
    const studyMatches = !rule.studyPattern || normalizedStudy.includes(normalizeString(rule.studyPattern))

    if (sampleMatches && studyMatches) {
      return rule.multiplier
    }
  }

  // Default: no multiplier
  return 1
}

/**
 * Get detailed multiplier information including the reason it was applied
 * 
 * Useful for audit logging and debugging.
 * 
 * @param sampleDescription - Description of the sample
 * @param studyName - Name of the study
 * @returns Object with multiplier, reason, and other details
 */
export function getMultiplierInfo(
  sampleDescription: string,
  studyName: string
): { multiplier: number; appliedReason: string } {
  const normalizedSample = normalizeString(sampleDescription)
  const normalizedStudy = normalizeString(studyName)

  // Check each rule in order
  for (const rule of MULTIPLIER_RULES) {
    const sampleMatches = normalizedSample.includes(normalizeString(rule.samplePattern))
    const studyMatches = !rule.studyPattern || normalizedStudy.includes(normalizeString(rule.studyPattern))

    if (sampleMatches && studyMatches) {
      return {
        multiplier: rule.multiplier,
        appliedReason: `Rule: ${rule.description}`,
      }
    }
  }

  // Default: no multiplier
  return {
    multiplier: 1,
    appliedReason: "Default: no multiplier rule matched",
  }
}

/**
 * Get complete sample information including calculated ML and multiplier reason
 * 
 * Used for audit logging to provide full transparency.
 * 
 * @param sample - Sample with description and quantity
 * @param studyName - Name of the study
 * @returns Complete sample info for audit logging
 */
export function getSampleMultiplierInfo(
  sample: { description: string; qty: number },
  studyName: string
): SampleMultiplierInfo {
  const multiplierInfo = getMultiplierInfo(sample.description, studyName)
  const calculated_ml = sample.qty * multiplierInfo.multiplier

  return {
    description: sample.description,
    qty: sample.qty,
    calculated_ml,
    multiplier: multiplierInfo.multiplier,
    appliedReason: multiplierInfo.appliedReason,
  }
}
