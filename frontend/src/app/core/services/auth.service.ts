import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // In-memory token — never persisted to localStorage (CLAUDE.md security rule)
  private accessToken: string | null = null;

  isAuthenticated(): boolean {
    // Connect to Google OAuth2 token validation in task 1.2.x
    return this.accessToken !== null;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  clearSession(): void {
    this.accessToken = null;
  }
}
