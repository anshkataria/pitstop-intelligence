export interface AuthUser { id: number; email: string; displayName: string; role: string; }
export interface AuthSession { accessToken: string; refreshToken: string; expiresIn: number; user: AuthUser; }
export interface LoginCredentials { email: string; password: string; }
export interface RegistrationDetails { displayName: string; email: string; password: string; }
export interface ProfileUpdate { displayName: string; }
export interface PasswordChange { currentPassword: string; newPassword: string; }
