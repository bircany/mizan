export const USER_ROLES = [
  "admin",
  "field_operator",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

function normalizeRole(role: string | undefined | null): UserRole | null {
  if (role === "field_operator") return "field_operator";
  if (role === "admin" || role === "super_admin" || role === "finance" || role === "approver") {
    return "admin";
  }
  return null;
}

export function hasRole(
  role: string | undefined | null,
  allowed: readonly string[],
): boolean {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) return false;
  return allowed.some((candidate) => normalizeRole(candidate) === normalizedRole);
}

export function canManageFinance(role: string | undefined | null) {
  return hasRole(role, ["admin"]);
}

export function canReviewFieldWork(role: string | undefined | null) {
  return hasRole(role, ["admin"]);
}
