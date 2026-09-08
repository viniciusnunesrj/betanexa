/**
 * ============================================================================
 * ATENÇÃO: AUTENTICAÇÃO LOCAL SOMENTE PARA DESENVOLVIMENTO (MVP LOCAL)
 * ============================================================================
 * Esta camada de serviço implementa a lógica de autenticação local para desenvolvimento
 * e testes no computador do usuário, simulando a persistência no localStorage.
 * 
 * NOTA DE MIGRAÇÃO:
 * Esta camada será inteiramente substituída pelo Firebase Authentication (ou OAuth)
 * na etapa de deploy em produção.
 * 
 * SEGURANÇA:
 * Para não armazenar senhas em texto puro nem mesmo durante o desenvolvimento,
 * é gerado um hash criptográfico seguro (SHA-256 com salt) antes de persistir no banco local.
 * ============================================================================
 */

import { NexaUser, RegisterData, AuthResult, StoredAuthAccount, Character, GameItem, NexaAsset } from '../types';
import { MOCK_COMMUNITY_USERS } from '../data/mockUsers';
import { BoxService } from './boxService';

export const AUTH_USERS_KEY = 'nexa_auth_users_db_v2';
export const AUTH_SESSION_KEY = 'nexa_auth_current_session_v2';
export const ASSETS_STORAGE_KEY = 'nexa_assets_v1';

// Web Crypto SHA-256 Helper (Runs natively in all modern browsers)
async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt + '_nexa_dev_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Generates a random alphanumeric salt
function generateSalt(): string {
  return Math.random().toString(36).substring(2, 10);
}

class AuthServiceClass {
  private isInitialized = false;

  constructor() {
    this.ensureInitialized();
  }

  /**
   * Initializes local user accounts including the required DEMO user.
   */
  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const stored = localStorage.getItem(AUTH_USERS_KEY);
      if (!stored) {
        // Seed default demo user and community users
        const demoSalt = 'nexa_demo_salt';
        const demoHash = await hashPassword('demo123', demoSalt);

        const defaultDemoUser: StoredAuthAccount = {
          id: 'usr_demo',
          username: 'demo',
          email: 'demo@nexa.universe',
          avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&auto=format&fit=crop&q=80',
          level: 18,
          experience: 2450,
          maxExperience: 3200,
          balanceNEX: 12450,
          balanceNXA: 850,
          createdAt: '2026-01-15',
          victories: 42,
          defeats: 11,
          seasonLevel: 8,
          seasonXP: 720,
          claimedSeasonRewards: [1, 2, 3, 4, 6],
          bio: 'Piloto veterano de testes da Ordem NEXA. Acesso ilimitado à arena e mercado.',
          title: 'Gladiador Demo',
          passwordHash: demoHash,
          salt: demoSalt,
        };

        const initialAccounts: StoredAuthAccount[] = [defaultDemoUser];

        // Seed other community accounts with default test password 'nexa123'
        for (const communityUser of MOCK_COMMUNITY_USERS) {
          if (communityUser.username.toLowerCase() !== 'demo') {
            const salt = generateSalt();
            const hash = await hashPassword('nexa123', salt);
            initialAccounts.push({
              ...communityUser,
              passwordHash: hash,
              salt,
            });
          }
        }

        localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(initialAccounts));
      }
    } catch {
      // localStorage error fallback
    }

    this.isInitialized = true;
  }

  private getStoredAccounts(): StoredAuthAccount[] {
    try {
      const stored = localStorage.getItem(AUTH_USERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveStoredAccounts(accounts: StoredAuthAccount[]): void {
    try {
      localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(accounts));
    } catch {
      // Storage error
    }
  }

  /**
   * Registers a new user account with complete validations and grants starter kit.
   */
  public async register(data: RegisterData): Promise<AuthResult> {
    await this.ensureInitialized();

    const username = data.username.trim();
    const email = data.email.trim().toLowerCase();
    const password = data.password;
    const confirmPassword = data.confirmPassword;

    // 1. Validation: Username required and length
    if (!username) {
      return { success: false, error: 'O nome de usuário (username) é obrigatório.' };
    }
    if (username.length < 3) {
      return { success: false, error: 'O nome de usuário deve conter no mínimo 3 caracteres.' };
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return { success: false, error: 'O username só pode conter letras, números, hífen e underline.' };
    }

    // 2. Validation: Valid Email
    if (!email) {
      return { success: false, error: 'O e-mail é obrigatório.' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, error: 'Por favor, informe um endereço de e-mail válido.' };
    }

    // 3. Validation: Password length
    if (!password) {
      return { success: false, error: 'A senha é obrigatória.' };
    }
    if (password.length < 6) {
      return { success: false, error: 'A senha deve conter no mínimo 6 caracteres.' };
    }

    // 4. Validation: Confirm password
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return { success: false, error: 'A confirmação de senha não confere com a senha digitada.' };
    }

    // 5. Validation: Duplicates check
    const accounts = this.getStoredAccounts();

    const usernameExists = accounts.some(
      (a) => a.username.toLowerCase() === username.toLowerCase()
    );
    if (usernameExists) {
      return { success: false, error: 'Este nome de usuário já está em uso por outro piloto.' };
    }

    const emailExists = accounts.some(
      (a) => a.email.toLowerCase() === email
    );
    if (emailExists) {
      return { success: false, error: 'Este endereço de e-mail já está cadastrado.' };
    }

    // 6. Create User Object
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);

    const newUser: NexaUser = {
      id: userId,
      username,
      email,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
      level: 1,
      experience: 0,
      maxExperience: 500,
      balanceNEX: 1000,
      balanceNXA: 100,
      createdAt: new Date().toISOString().split('T')[0],
      victories: 0,
      defeats: 0,
      seasonLevel: 1,
      seasonXP: 0,
      claimedSeasonRewards: [],
      bio: 'Novo piloto ingressando no universo NEXA.',
      title: 'Recruta Neon',
      isFirstAccess: true,
    };

    const newStoredAccount: StoredAuthAccount = {
      ...newUser,
      passwordHash,
      salt,
    };

    // Save user in accounts DB
    accounts.push(newStoredAccount);
    this.saveStoredAccounts(accounts);

    // 7. Create starter kit: 1 common character + 1 initial item + 1 Recruit Box
    this.grantStarterKit(newUser);
    BoxService.grantBox(newUser.id, 'RECRUIT', 'STARTER_KIT');

    // 8. Set current session
    this.setSession(newUser);

    return { success: true, user: newUser };
  }

  /**
   * Grants starter character and starter weapon to the newly registered player.
   */
  private grantStarterKit(user: NexaUser): void {
    const starterChar: Character = {
      id: `char-starter-${user.id}`,
      name: 'Recruta da Vanguarda',
      type: 'Character',
      class: 'Guerreiro',
      rarity: 'Comum',
      level: 1,
      power: 450,
      experience: 0,
      maxExperience: 300,
      stats: {
        strength: 40,
        defense: 40,
        speed: 40,
      },
      edition: 'Kit Inicial',
      ownerId: user.id,
      ownerName: user.username,
      createdAt: new Date().toISOString().split('T')[0],
      description: 'Personagem de combate comum entregue aos pilotos recém-chegados ao NEXA.',
      status: 'EQUIPPED',
      isEquipped: true,
      image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80',
    };

    const starterWeapon: GameItem = {
      id: `wpn-starter-${user.id}`,
      name: 'Lâmina Cinética de Treino',
      type: 'Weapon',
      rarity: 'Comum',
      level: 1,
      power: 120,
      edition: 'Kit Inicial',
      ownerId: user.id,
      ownerName: user.username,
      createdAt: new Date().toISOString().split('T')[0],
      description: 'Armamento de treinamento inicial para calibragem na arena cibernética.',
      status: 'IDLE',
      image: 'https://images.unsplash.com/photo-1589241062272-c0a000072dfa?w=600&auto=format&fit=crop&q=80',
      bonusStats: { stat: 'strength', value: 8 },
    };

    try {
      const stored = localStorage.getItem(ASSETS_STORAGE_KEY);
      const existingAssets: NexaAsset[] = stored ? JSON.parse(stored) : [];
      const updatedAssets = [starterChar, starterWeapon, ...existingAssets];
      localStorage.setItem(ASSETS_STORAGE_KEY, JSON.stringify(updatedAssets));
    } catch {
      // Storage fallback
    }
  }

  /**
   * Logs in with username/email and password.
   */
  public async login(identifier: string, password?: string): Promise<AuthResult> {
    await this.ensureInitialized();

    const cleanId = identifier.trim().toLowerCase();
    if (!cleanId) {
      return { success: false, error: 'Informe seu nome de usuário ou e-mail.' };
    }

    const accounts = this.getStoredAccounts();
    const account = accounts.find(
      (a) => a.username.toLowerCase() === cleanId || a.email.toLowerCase() === cleanId
    );

    if (!account) {
      return { success: false, error: 'Piloto não encontrado. Verifique seu usuário ou crie uma conta.' };
    }

    // If password provided, verify hash
    if (password) {
      const computedHash = await hashPassword(password, account.salt);
      if (computedHash !== account.passwordHash) {
        return { success: false, error: 'Código de acesso incorreto. Tente novamente.' };
      }
    }

    const { passwordHash, salt, ...userWithoutSecrets } = account;
    this.setSession(userWithoutSecrets);

    return { success: true, user: userWithoutSecrets };
  }

  /**
   * Logs in automatically as the official DEMO user.
   */
  public async loginAsDemo(): Promise<AuthResult> {
    await this.ensureInitialized();
    return this.login('demo', 'demo123');
  }

  /**
   * Clears the current user session.
   */
  public logout(): void {
    try {
      localStorage.removeItem(AUTH_SESSION_KEY);
    } catch {
      // storage error
    }
  }

  /**
   * Returns current session user or null if not authenticated.
   */
  public getCurrentUser(): NexaUser | null {
    try {
      const session = localStorage.getItem(AUTH_SESSION_KEY);
      return session ? JSON.parse(session) : null;
    } catch {
      return null;
    }
  }

  /**
   * Checks if there is an active authenticated session.
   */
  public isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  /**
   * Updates user session and saves changes to local accounts DB.
   */
  public updateUser(updatedUser: NexaUser): void {
    this.setSession(updatedUser);
    const accounts = this.getStoredAccounts();
    const index = accounts.findIndex((a) => a.id === updatedUser.id);
    if (index !== -1) {
      accounts[index] = {
        ...accounts[index],
        ...updatedUser,
      };
      this.saveStoredAccounts(accounts);
    }
  }

  /**
   * Marks first access celebration modal as seen.
   */
  public dismissFirstAccess(userId: string): void {
    const user = this.getCurrentUser();
    if (user && user.id === userId) {
      const updated = { ...user, isFirstAccess: false };
      this.updateUser(updated);
    }
  }

  private setSession(user: NexaUser): void {
    try {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
    } catch {
      // Storage error
    }
  }

  /**
   * Returns all available accounts for the demo account switcher.
   */
  public getAllUsers(): NexaUser[] {
    const accounts = this.getStoredAccounts();
    return accounts.map(({ passwordHash, salt, ...user }) => user);
  }
}

export const authService = new AuthServiceClass();
export const AuthService = authService;
export { AuthServiceClass };

