// Nested module for testing subdirectory imports
export const nested = true;
export const level = 'subfolder';

export function nestedFunction() {
    return 'Called from nested module';
}

export default {
    nested,
    level,
    nestedFunction
};