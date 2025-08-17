export type User = {
  id: string; // UUID (PK)
  firstName: string;
  lastName: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'NURSE' | 'SUPPORT';
  created_at: string;
};
