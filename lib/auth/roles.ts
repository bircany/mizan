export const USER_ROLES = [
  "super_admin",
  "finance",
  "field_operator",
  "approver",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export function hasRole(
  role: string | undefined | null,
  allowed: readonly UserRole[],
): boolean {
  return Boolean(role && allowed.includes(role as UserRole));
}

export function canManageFinance(role: string | undefined | null) {
  return hasRole(role, ["super_admin", "finance"]);
}

export function canReviewFieldWork(role: string | undefined | null) {
  return hasRole(role, ["super_admin", "approver"]);
}
