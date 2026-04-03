/**
 * Rule-based NLP Parser for Natural Language City Descriptions
 * Converts user input into structured JSON for the layout engine
 */
// ============================================================================
// Helper Functions
// ============================================================================
/**
 * Extracts area in acres from text using regex pattern
 * Looks for number followed by "acre(s)"
 * @param text - Input description
 * @returns Area in acres (default: 5 if not found)
 */
const extractArea = (text) => {
    // Case-insensitive regex to match patterns like "10 acres", "5acre", "100 acre"
    const areaPattern = /(\d+)\s*acres?/gi;
    const match = text.match(areaPattern);
    if (match && match.length > 0) {
        // Extract the number from the first match
        const numberMatch = match[0].match(/\d+/);
        if (numberMatch) {
            return parseInt(numberMatch[0], 10);
        }
    }
    // Default to 5 acres if not specified
    return 5;
};
/**
 * Extracts zones from text and returns array of zone configurations
 * Always includes residential zone with default count of 8
 * Adds park (count: 2), hospital (count: 1), or commercial (count: 2) based on keywords
 * @param text - Input description (normalized to lowercase)
 * @returns Array of zone configurations
 */
const extractZones = (text) => {
    const zones = [];
    const lowerText = text.toLowerCase();
    // Always include residential zone as foundation.
    zones.push({ type: 'residential', count: 8 });
    // Add each zone at most once based on a regex match.
    const addZoneIfMatched = (pattern, zone) => {
        if (pattern.test(lowerText) && !zones.some((item) => item.type === zone.type)) {
            zones.push(zone);
        }
    };
    // PARK
    addZoneIfMatched(/park|parks/, { type: 'park', count: 2 });
    // HOSPITAL (robust keyword matching)
    addZoneIfMatched(/hospital|hospitals|clinic|clinics|medical|healthcare/, {
        type: 'hospital',
        count: 1,
    });
    // COMMERCIAL
    addZoneIfMatched(/commercial|market|shops|mall/, { type: 'commercial', count: 2 });
    return zones;
};
/**
 * Determines priority based on keywords in text
 * Priority hierarchy: low_traffic > high_density > eco > balanced (default)
 * @param text - Input description (normalized to lowercase)
 * @returns Priority string
 */
const extractPriority = (text) => {
    const lowerText = text.toLowerCase();
    // Check for low traffic priority (highest priority in this context)
    if (lowerText.includes('low traffic') || lowerText.includes('low-traffic')) {
        return 'low traffic';
    }
    // Check for high density priority
    if (lowerText.includes('high density') || lowerText.includes('high-density')) {
        return 'high density';
    }
    // Check for eco priority
    if (lowerText.includes('eco')) {
        return 'eco priority';
    }
    // Default to balanced if no specific priority mentioned
    return 'balanced';
};
/**
 * Extracts constraints from text
 * Constraints determine special requirements for city generation
 * @param text - Input description (normalized to lowercase)
 * @returns Constraint object with boolean flags
 */
const extractConstraints = (text) => {
    const lowerText = text.toLowerCase();
    return {
        // Eco constraint: true if text contains "eco" keyword
        eco: lowerText.includes('eco'),
        // Low traffic constraint: true if text contains "low traffic" phrase
        low_traffic: lowerText.includes('low traffic') || lowerText.includes('low-traffic'),
        // High density constraint: true if text contains "high density" phrase
        high_density: lowerText.includes('high density') || lowerText.includes('high-density'),
    };
};
// ============================================================================
// Main Parser Function
// ============================================================================
/**
 * Main function to parse natural language city description into structured JSON
 * Handles edge cases like empty input, missing keywords, and mixed casing
 * @param input - Natural language description of desired city
 * @returns Structured ParsedCityData object ready for layout engine
 */
export const parseText = (input) => {
    // Handle edge case: empty or whitespace-only input
    if (!input || input.trim().length === 0) {
        return {
            zones: [{ type: 'residential', count: 8 }],
            area_in_acres: 5,
            priority: 'balanced',
            constraints: {
                eco: false,
                low_traffic: false,
                high_density: false,
            },
        };
    }
    // Normalize input to ensure keyword matching works for mixed casing
    const text = input.trim().toLowerCase();
    // Extract all components using helper functions
    const area = extractArea(text);
    const zones = extractZones(text);
    const priority = extractPriority(text);
    const constraints = extractConstraints(text);
    // Return consistent JSON structure
    return {
        zones,
        area_in_acres: area,
        priority,
        constraints,
    };
};
// ============================================================================
// Export utilities for testing and debugging
// ============================================================================
export const parserUtils = {
    extractArea,
    extractZones,
    extractPriority,
    extractConstraints,
};
