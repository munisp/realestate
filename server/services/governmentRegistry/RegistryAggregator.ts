import { RegistryFactory } from './RegistryFactory';
import {
  CofOVerificationResult,
  StateCode,
  AggregatedVerificationResult,
} from './base/types';

/**
 * Aggregator class to query multiple state registries and build consensus
 */
export class RegistryAggregator {
  /**
   * Verify C of O across multiple state registries
   * Returns aggregated results with consensus
   */
  async verifyCofOAcrossStates(
    cofoNumber: string,
    states: StateCode[]
  ): Promise<AggregatedVerificationResult> {
    const results: CofOVerificationResult[] = [];
    const successfulStates: StateCode[] = [];

    // Query all specified states in parallel
    await Promise.all(
      states.map(async (state) => {
        try {
          const client = RegistryFactory.getClient(state);
          const result = await client.verifyCofO(cofoNumber);
          results.push(result);
          successfulStates.push(state);
        } catch (error) {
          console.error(`[RegistryAggregator] Failed to verify with ${state}:`, error);
          // Continue with other states even if one fails
        }
      })
    );

    if (results.length === 0) {
      throw new Error('All registry verifications failed');
    }

    // Determine primary result (highest verification score)
    const primaryResult = results.reduce((prev, current) =>
      current.verificationScore > prev.verificationScore ? current : prev
    );

    // Build consensus
    const consensus = this.buildConsensus(results);

    return {
      primaryResult,
      alternativeResults: results.filter((r) => r !== primaryResult),
      consensus,
      sources: successfulStates,
    };
  }

  /**
   * Build consensus from multiple verification results
   */
  private buildConsensus(
    results: CofOVerificationResult[]
  ): AggregatedVerificationResult['consensus'] {
    if (results.length === 0) {
      return {
        isValid: false,
        confidence: 0,
        conflictingFields: [],
      };
    }

    // Count how many results say valid
    const validCount = results.filter((r) => r.isValid).length;
    const totalCount = results.length;

    // Consensus is valid if majority say valid
    const isValid = validCount > totalCount / 2;

    // Confidence is percentage of agreement
    const confidence = Math.round((validCount / totalCount) * 100);

    // Find conflicting fields
    const conflictingFields = this.findConflictingFields(results);

    return {
      isValid,
      confidence,
      conflictingFields,
    };
  }

  /**
   * Find fields that have conflicting values across results
   */
  private findConflictingFields(results: CofOVerificationResult[]): string[] {
    if (results.length < 2) return [];

    const conflicts: string[] = [];
    const first = results[0];

    // Check each field for conflicts
    const fieldsToCheck: (keyof CofOVerificationResult)[] = [
      'isValid',
      'ownerName',
      'parcelId',
      'status',
    ];

    fieldsToCheck.forEach((field) => {
      const values = results.map((r) => r[field]);
      const uniqueValues = new Set(values);

      if (uniqueValues.size > 1) {
        conflicts.push(field);
      }
    });

    // Check verification details
    if (first.verificationDetails) {
      const detailFields: (keyof CofOVerificationResult['verificationDetails'])[] = [
        'documentAuthenticity',
        'ownershipMatch',
        'noEncumbrances',
        'taxCompliance',
      ];

      detailFields.forEach((field) => {
        const values = results.map((r) => r.verificationDetails[field]);
        const uniqueValues = new Set(values);

        if (uniqueValues.size > 1) {
          conflicts.push(`verificationDetails.${field}`);
        }
      });
    }

    return conflicts;
  }

  /**
   * Get the best available state for a given location
   * Prioritizes local state, then nearby states
   */
  getBestStateForLocation(state: string, lga?: string): StateCode[] {
    const stateUpper = state.toUpperCase();

    // Map state names to codes
    const stateMap: Record<string, StateCode> = {
      'LAGOS': 'LAGOS',
      'FCT': 'FCT',
      'ABUJA': 'FCT',
      'RIVERS': 'RIVERS',
      'KANO': 'KANO',
      'OYO': 'OYO',
    };

    const primaryState = stateMap[stateUpper];

    if (!primaryState) {
      // Return all available states as fallback
      return RegistryFactory.getAvailableStates();
    }

    // Return primary state first, then others as fallback
    const allStates = RegistryFactory.getAvailableStates();
    return [primaryState, ...allStates.filter((s) => s !== primaryState)];
  }

  /**
   * Verify with automatic state selection based on location
   */
  async verifyWithAutoStateSelection(
    cofoNumber: string,
    state: string,
    lga?: string
  ): Promise<AggregatedVerificationResult> {
    const statesToTry = this.getBestStateForLocation(state, lga);
    return this.verifyCofOAcrossStates(cofoNumber, statesToTry);
  }
}
