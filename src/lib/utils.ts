export function generateStudentId() {
    const year = new Date().getFullYear();
    const suffix = String(Date.now() % 1000).padStart(3, '0');
    return `STU${year}${suffix}`;
}

export function generatePassword() {
    // For now password matches the ID in API logic; keep a fallback
    return Math.random().toString(36).slice(-8);
}
