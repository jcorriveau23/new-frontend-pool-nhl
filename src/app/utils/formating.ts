
import { format } from "date-fns";

export function ordinal(num: number, language: string = 'en'): string {
    const suffixes: { [key: string]: string[] } = {
        'en': ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'],
        'fr': ['ème', 'er', 'ème', 'ème', 'ème', 'ème', 'ème', 'ème', 'ème', 'ème']
    };

    const suffix = suffixes[language];
    if (!suffix) {
        throw new Error('Unsupported language.');
    }

    if (10 <= num % 100 && num % 100 <= 20) {
        return num + suffix[0];
    } else {
        return num + suffix[num % 10];
    }
}