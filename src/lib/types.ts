export interface User {
  id: string;
  email: string;
  display_name: string;
  is_active: boolean;
  date_joined: string;
}

export interface TokenPair {
  access: string;
  refresh: string;
}

export interface LoginResponse extends TokenPair {
  user: User;
}
