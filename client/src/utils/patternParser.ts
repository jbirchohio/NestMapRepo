// Centralized pattern matching utility for AI suggestions
export interface ParsedSuggestion {
    key: string;
    name: string;
    description: string;
    notes: string;
}
export interface PatternConfig {
    regex: RegExp;
    nameGroup: number;
    descriptionGroup: number;
    prefix: string;
}
export function parseAISuggestions(content: string): ParsedSuggestion[] {
    const suggestions: ParsedSuggestion[] = [];
    const patterns: PatternConfig[] = [
        // Pattern 1: • Name - Description format
        {
            regex: /• (.+?) - (.+)/g,
            nameGroup: 1,
            descriptionGroup: 2,
            prefix: 'bullet'
        },
        // Pattern 2: **Name** - Description format
        {
            regex: /\*\*(.+?)\*\* - (.+)/g,
            nameGroup: 1,
            descriptionGroup: 2,
            prefix: 'bold'
        },
        // Pattern 3: 1. Name - Description format
        {
            regex: /\d+\.\s+(.+?) - (.+)/g,
            nameGroup: 1,
            descriptionGroup: 2,
            prefix: 'numbered'
        },
        // Pattern 4: Numbered list with **Name** format
        {
            regex: /\d+\.\s+\*\*(.+?)\*\*(.+)/g,
            nameGroup: 1,
            descriptionGroup: 2,
            prefix: 'numbered-bold'
        }
    ];
    patterns.forEach((pattern, patternIndex) => {
        const matches = Array.from(content.matchAll(pattern.regex));
        matches.forEach((match, matchIndex) => {
            if (match[pattern.nameGroup] && match[pattern.descriptionGroup]) {
                const name = match[pattern.nameGroup].trim();
                const description = match[pattern.descriptionGroup].replace(/\s*-\s*/, '').trim();
                suggestions.push({
                    key: `${pattern.prefix}-${patternIndex}-${matchIndex}`,
                    name,
                    description,
                    notes: description
                });
            }
        });
    });
    return suggestions;
}
