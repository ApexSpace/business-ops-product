type StaffNameSource = {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
};

export function formatStaffName(user: StaffNameSource): string {
  const parts = [user.firstName, user.lastName].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  return user.email;
}
