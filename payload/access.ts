import type { Access, Where } from "payload";

import { canManageFinance, canReviewFieldWork, hasRole } from "@/lib/auth/roles";

type RequestUser = {
  id?: number | string;
  role?: string | null;
};

function getUser(user: unknown): RequestUser | null {
  if (!user || typeof user !== "object") return null;
  return user as RequestUser;
}

export const anyone: Access = () => true;

export const authenticated: Access = ({ req }) => Boolean(getUser(req.user));

export const superAdminsOnly: Access = ({ req }) =>
  hasRole(getUser(req.user)?.role, ["super_admin"]);

export const financeOnly: Access = ({ req }) =>
  canManageFinance(getUser(req.user)?.role);

export const approverOrAdmin: Access = ({ req }) =>
  canReviewFieldWork(getUser(req.user)?.role);

export const fieldOperatorOrAdmin: Access = ({ req }) =>
  hasRole(getUser(req.user)?.role, ["super_admin", "field_operator", "approver"]);

export const fieldOperatorsOnly: Access = ({ req }) =>
  hasRole(getUser(req.user)?.role, ["super_admin", "field_operator"]);

export const internalTeam: Access = ({ req }) =>
  hasRole(getUser(req.user)?.role, [
    "super_admin",
    "finance",
    "field_operator",
    "approver",
  ]);

export const usersReadAccess: Access = ({ req }) => {
  const user = getUser(req.user);
  if (!user) return false;
  if (hasRole(user.role, ["super_admin"])) return true;

  return {
    id: {
      equals: user.id,
    },
  } satisfies Where;
};

export const usersUpdateAccess: Access = ({ req }) => {
  const user = getUser(req.user);
  if (!user) return false;
  if (hasRole(user.role, ["super_admin"])) return true;

  return {
    id: {
      equals: user.id,
    },
  } satisfies Where;
};

export const fieldTaskReadAccess: Access = ({ req }) => {
  const user = getUser(req.user);
  if (!user) return false;
  if (hasRole(user.role, ["super_admin", "approver"])) return true;

  return {
    assignedTo: {
      equals: user.id,
    },
  } satisfies Where;
};

export const fieldTaskUpdateAccess: Access = ({ req }) => {
  const user = getUser(req.user);
  if (!user) return false;
  if (hasRole(user.role, ["super_admin", "approver"])) return true;

  return {
    assignedTo: {
      equals: user.id,
    },
  } satisfies Where;
};

export const proofSubmissionReadAccess: Access = ({ req }) => {
  const user = getUser(req.user);
  if (!user) return false;
  if (hasRole(user.role, ["super_admin", "approver"])) return true;

  return {
    fieldTask: {
      assignedTo: {
        equals: user.id,
      },
    },
  } as Where;
};

export const proofAssetReadAccess: Access = ({ req }) => {
  const user = getUser(req.user);
  if (!user) return false;
  if (hasRole(user.role, ["super_admin", "approver"])) return true;

  return {
    submission: {
      fieldTask: {
        assignedTo: {
          equals: user.id,
        },
      },
    },
  } as Where;
};

export const proofAssetUpdateAccess: Access = ({ req }) => {
  const user = getUser(req.user);
  if (!user) return false;
  if (hasRole(user.role, ["super_admin", "approver"])) return true;

  return {
    submission: {
      fieldTask: {
        assignedTo: {
          equals: user.id,
        },
      },
    },
  } as Where;
};

export const proofSubmissionUpdateAccess: Access = ({ req }) => {
  const user = getUser(req.user);
  if (!user) return false;
  if (hasRole(user.role, ["super_admin", "approver"])) return true;

  return {
    fieldTask: {
      assignedTo: {
        equals: user.id,
      },
    },
  } as Where;
};
