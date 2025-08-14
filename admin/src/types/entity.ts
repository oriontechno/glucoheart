export type User = {
  id: string; // UUID (PK)
  firstName: string;
  lastName: string;
  email: string;
  role: 'user' | 'super_admin';
  created_at: string;
};
