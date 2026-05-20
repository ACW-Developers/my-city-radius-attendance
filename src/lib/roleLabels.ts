export const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  caregiver: 'Caregiver',
  it_support: 'IT Support',
  driver: 'Transport & Caregiver',
  manager: 'Manager',
};

export const roleLabel = (role: string) =>
  ROLE_LABELS[role] || role.replace('_', ' ');

