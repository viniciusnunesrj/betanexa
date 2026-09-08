import { NexaUser, StoredAuthAccount, Card, SynthesisProductionStatus } from '../types';
import { AUTH_USERS_KEY, AUTH_SESSION_KEY } from './authService';
import { LedgerService } from './ledgerService';
import { MOCK_COMMUNITY_USERS, CURRENT_USER } from '../data/mockUsers';

/**
 * In-memory fallback storage when localStorage is unavailable (e.g. Node.js automated test runner)
 */
const memoryStore: Record<string, string> = {};

function storageGet(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return memoryStore[key] || null;
  } catch {
    return memoryStore[key] || null;
  }
}

function storageSet(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // ignore
  }
  memoryStore[key] = value;
}

export class EconomyServiceClass {
  /**
   * Reads raw stored accounts from persistent database
   */
  private getRawAccounts(): StoredAuthAccount[] {
    const raw = storageGet(AUTH_USERS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // fallback to seed
      }
    }

    // Default synchronous seed if storage is not yet populated
    const seeded: StoredAuthAccount[] = MOCK_COMMUNITY_USERS.map((u) => ({
      ...u,
      passwordHash: 'seeded_hash',
      salt: 'seeded_salt',
    }));
    this.saveRawAccounts(seeded);
    return seeded;
  }

  /**
   * Writes raw accounts back to the persistent database
   */
  private saveRawAccounts(accounts: StoredAuthAccount[]): void {
    storageSet(AUTH_USERS_KEY, JSON.stringify(accounts));
  }

  /**
   * Syncs active session in storage if the updated user is currently logged in
   */
  private syncActiveSessionIfCurrent(updatedUser: NexaUser): void {
    const currentSessionRaw = storageGet(AUTH_SESSION_KEY);
    if (currentSessionRaw) {
      try {
        const sessionUser = JSON.parse(currentSessionRaw) as NexaUser;
        if (sessionUser.id === updatedUser.id) {
          storageSet(AUTH_SESSION_KEY, JSON.stringify(updatedUser));
        }
      } catch {
        // ignore
      }
    }
  }

  /**
   * Retorna o usuário persistido pelo seu ID único.
   * Única fonte da verdade para dados do usuário.
   */
  public getUser(userId: string): NexaUser | null {
    if (!userId) return null;
    const accounts = this.getRawAccounts();
    let account = accounts.find((a) => a.id === userId);

    // Fallback: if user was not in accounts list yet (e.g. mock user or current_user)
    if (!account) {
      const match = MOCK_COMMUNITY_USERS.find((u) => u.id === userId) || (userId === CURRENT_USER.id ? CURRENT_USER : null);
      if (match) {
        account = {
          ...match,
          passwordHash: 'seeded_hash',
          salt: 'seeded_salt',
        };
        accounts.push(account);
        this.saveRawAccounts(accounts);
      } else {
        return null;
      }
    }

    const { passwordHash, salt, ...user } = account;
    return user;
  }

  /**
   * Retorna todos os usuários cadastrados sem credenciais confidenciais.
   */
  public getAllUsers(): NexaUser[] {
    const accounts = this.getRawAccounts();
    return accounts.map(({ passwordHash, salt, ...user }) => user);
  }

  /**
   * Salva alterações genéricas do usuário garantindo persistência na base e na sessão.
   */
  public saveUser(updatedUser: NexaUser): NexaUser {
    const accounts = this.getRawAccounts();
    const index = accounts.findIndex((a) => a.id === updatedUser.id);
    if (index === -1) {
      throw new Error(`Usuário não encontrado na base de dados: ${updatedUser.id}`);
    }

    accounts[index] = {
      ...accounts[index],
      ...updatedUser,
    };

    this.saveRawAccounts(accounts);
    this.syncActiveSessionIfCurrent(updatedUser);
    return updatedUser;
  }

  /**
   * Atualiza diretamente o saldo de NEX ou NXA de um usuário específico.
   * O valor nunca fica negativo.
   */
  public updateUserBalance(userId: string, currency: 'NEX' | 'NXA', newBalance: number): NexaUser {
    const safeBalance = Math.max(0, Math.round(newBalance));
    const accounts = this.getRawAccounts();
    const index = accounts.findIndex((a) => a.id === userId);

    if (index === -1) {
      throw new Error(`Usuário com ID "${userId}" não encontrado para atualização de saldo.`);
    }

    if (currency === 'NEX') {
      accounts[index].balanceNEX = safeBalance;
    } else {
      accounts[index].balanceNXA = safeBalance;
    }

    this.saveRawAccounts(accounts);

    const { passwordHash, salt, ...userWithoutSecrets } = accounts[index];
    this.syncActiveSessionIfCurrent(userWithoutSecrets);
    return userWithoutSecrets;
  }

  /**
   * Adiciona valor à moeda do usuário garantindo persistência imediata.
   */
  public addCurrency(userId: string, currency: 'NEX' | 'NXA', amount: number): NexaUser {
    if (amount < 0) {
      return this.removeCurrency(userId, currency, Math.abs(amount));
    }
    const user = this.getUser(userId);
    if (!user) {
      throw new Error(`Usuário com ID "${userId}" não encontrado ao adicionar ${currency}.`);
    }

    const currentBalance = currency === 'NEX' ? user.balanceNEX : user.balanceNXA;
    const newBalance = currentBalance + Math.round(amount);
    return this.updateUserBalance(userId, currency, newBalance);
  }

  /**
   * Remove valor da moeda do usuário com validação de saldo suficiente.
   */
  public removeCurrency(userId: string, currency: 'NEX' | 'NXA', amount: number): NexaUser {
    if (amount < 0) {
      return this.addCurrency(userId, currency, Math.abs(amount));
    }
    const user = this.getUser(userId);
    if (!user) {
      throw new Error(`Usuário com ID "${userId}" não encontrado ao debitar ${currency}.`);
    }

    const currentBalance = currency === 'NEX' ? user.balanceNEX : user.balanceNXA;
    if (currentBalance < amount) {
      throw new Error(
        `Saldo insuficiente de ${currency}. Necessário: ${amount.toLocaleString()}, Disponível: ${currentBalance.toLocaleString()}.`
      );
    }

    const newBalance = currentBalance - Math.round(amount);
    return this.updateUserBalance(userId, currency, newBalance);
  }

  /**
   * Alias para removeCurrency
   */
  public deductCurrency(userId: string, currency: 'NEX' | 'NXA', amount: number): NexaUser {
    return this.removeCurrency(userId, currency, amount);
  }

  /**
   * Aplica atomicamente os resultados de combate (moedas, XP, nível, vitórias/derrotas)
   * em uma ÚNICA transação na base de dados persistente.
   * Evita a condição de corrida em que múltiplos setState sobrescreviam o saldo.
   */
  public applyBattleReward(
    userId: string,
    reward: {
      nexGained: number;
      nxaGained: number;
      xpGained: number;
      victory: boolean;
    }
  ): NexaUser {
    const accounts = this.getRawAccounts();
    const index = accounts.findIndex((a) => a.id === userId);

    if (index === -1) {
      throw new Error(`Usuário com ID "${userId}" não encontrado ao aplicar recompensa de combate.`);
    }

    const current = accounts[index];

    // 1. Atualiza saldos
    const newNEX = Math.max(0, Math.round(current.balanceNEX + (reward.nexGained || 0)));
    const newNXA = Math.max(0, Math.round(current.balanceNXA + (reward.nxaGained || 0)));

    // 2. Calcula XP e Nível do Piloto
    let exp = (current.experience || 0) + (reward.xpGained || 0);
    let lvl = current.level || 1;
    let maxExp = current.maxExperience || 500;

    while (exp >= maxExp) {
      exp -= maxExp;
      lvl += 1;
      maxExp = Math.floor(maxExp * 1.25);
    }

    // 3. Calcula XP e Nível da Temporada
    const seasonXPGained = Math.floor((reward.xpGained || 0) * 1.5);
    let seasonXP = (current.seasonXP || 0) + seasonXPGained;
    let seasonLvl = current.seasonLevel || 1;
    const seasonXPPerLevel = 1000;

    while (seasonXP >= seasonXPPerLevel && seasonLvl < 20) {
      seasonXP -= seasonXPPerLevel;
      seasonLvl += 1;
    }

    // 4. Incrementa vitórias ou derrotas
    const victories = (current.victories || 0) + (reward.victory ? 1 : 0);
    const defeats = (current.defeats || 0) + (reward.victory ? 0 : 1);

    // 5. Salva na base persistente
    accounts[index] = {
      ...current,
      balanceNEX: newNEX,
      balanceNXA: newNXA,
      experience: exp,
      level: lvl,
      maxExperience: maxExp,
      seasonXP,
      seasonLevel: seasonLvl,
      victories,
      defeats,
    };

    this.saveRawAccounts(accounts);

    const { passwordHash, salt, ...updatedUser } = accounts[index];
    this.syncActiveSessionIfCurrent(updatedUser);
    return updatedUser;
  }

  /**
   * Calcula a produção de NEX da carta com base no tempo decorrido.
   * Não gera transações individuais a cada segundo.
   * Fórmula: elapsedHours * synthesisRate (limitado a synthesisCap - totalGenerated).
   */
  public calculateSynthesisProduction(card: Card, customNowMs?: number): SynthesisProductionStatus {
    const cap = card.synthesisCap;
    const totalGen = card.totalGenerated || 0;

    if (card.cardStatus === 'EXHAUSTED' || totalGen >= cap) {
      return {
        cardId: card.id,
        cardStatus: 'EXHAUSTED',
        ratePerHour: 0,
        totalGenerated: cap,
        synthesisCap: cap,
        unclaimedAmount: 0,
        projectedTotal: cap,
        isExhausted: true,
        hoursElapsed: 0,
        estimatedHoursToCap: 0,
        progressPercentage: 100,
      };
    }

    if (card.cardStatus !== 'ACTIVE') {
      const remainingToCap = Math.max(0, cap - totalGen);
      return {
        cardId: card.id,
        cardStatus: card.cardStatus,
        ratePerHour: card.synthesisRate,
        totalGenerated: totalGen,
        synthesisCap: cap,
        unclaimedAmount: 0,
        projectedTotal: totalGen,
        isExhausted: false,
        hoursElapsed: 0,
        estimatedHoursToCap: remainingToCap > 0 ? remainingToCap / card.synthesisRate : 0,
        progressPercentage: Math.min(100, Math.round((totalGen / cap) * 100)),
      };
    }

    // Calcula tempo decorrido desde a última coleta ou início da síntese
    const lastClaimIso = card.lastClaimedAt || card.synthesisStartedAt || card.synthesizedAt;
    const startTimeMs = lastClaimIso ? new Date(lastClaimIso).getTime() : Date.now();
    const effectiveNow = (customNowMs !== undefined ? customNowMs : Date.now()) + (card.simulatedTimeOffsetMs || 0);

    const elapsedMs = Math.max(0, effectiveNow - startTimeMs);
    const elapsedHours = elapsedMs / (1000 * 60 * 60);

    // Rendimento acumulado
    const rawGenerated = Math.floor(elapsedHours * card.synthesisRate);
    const remainingToCap = Math.max(0, cap - totalGen);
    const unclaimedAmount = Math.min(rawGenerated, remainingToCap);
    const projectedTotal = Math.min(cap, totalGen + unclaimedAmount);
    const isExhausted = projectedTotal >= cap;

    const remainingAfterClaim = Math.max(0, cap - projectedTotal);
    const estimatedHoursToCap = remainingAfterClaim > 0 ? remainingAfterClaim / card.synthesisRate : 0;
    const progressPercentage = Math.min(100, Math.round((projectedTotal / cap) * 100));

    return {
      cardId: card.id,
      cardStatus: isExhausted ? 'EXHAUSTED' : 'ACTIVE',
      ratePerHour: isExhausted ? 0 : card.synthesisRate,
      totalGenerated: totalGen,
      synthesisCap: cap,
      unclaimedAmount,
      projectedTotal,
      isExhausted,
      hoursElapsed: elapsedHours,
      estimatedHoursToCap,
      progressPercentage,
    };
  }

  /**
   * Obtém o status consolidado de síntese de uma carta
   */
  public getSynthesisStatus(card: Card, customNowMs?: number): SynthesisProductionStatus {
    return this.calculateSynthesisProduction(card, customNowMs);
  }

  /**
   * Calcula o valor de NEX acumulado pendente para coleta de uma carta
   */
  public calculateAccumulatedNEX(card: Card, customNowMs?: number): number {
    return this.calculateSynthesisProduction(card, customNowMs).unclaimedAmount;
  }

  /**
   * Sintetiza uma carta que esteja em estado FREE pertencente ao usuário.
   * Ação irreversível para negociação: status = ACTIVE, tradeable = false.
   */
  public synthesizeCard(card: Card, userId: string): Card {
    if (card.ownerId !== userId) {
      throw new Error('Você só pode sintetizar cartas que pertencem à sua conta.');
    }
    if (card.cardStatus !== 'FREE') {
      throw new Error(`Esta carta já foi sintetizada anteriormente (status: ${card.cardStatus}).`);
    }
    if (card.status === 'LISTED' || card.status === 'TRADING') {
      throw new Error(`Não é possível sintetizar uma carta enquanto ela estiver listada no mercado ou em proposta de trade.`);
    }

    const nowIso = new Date().toISOString();

    const synthesizedCard: Card = {
      ...card,
      cardStatus: 'ACTIVE',
      status: 'ACTIVE',
      tradeable: false,
      synthesizable: false,
      synthesizedAt: nowIso,
      synthesisStartedAt: nowIso,
      lastClaimedAt: nowIso,
      totalGenerated: 0,
      simulatedTimeOffsetMs: 0,
    };

    return synthesizedCard;
  }

  /**
   * Coleta os rendimentos acumulados de NEX da carta e atualiza os saldos.
   * Registra a transação no Ledger como SYNTHESIS_REWARD.
   */
  public claimSynthesisRewards(
    userId: string,
    card: Card,
    customNowMs?: number
  ): {
    updatedCard: Card;
    claimedNEX: number;
    user: NexaUser;
    productionBefore: number;
    productionAfter: number;
    exhausted: boolean;
  } {
    if (card.ownerId !== userId) {
      throw new Error('Você não possui permissão para coletar rendimentos desta carta.');
    }
    if (card.cardStatus !== 'ACTIVE') {
      throw new Error(`Apenas cartas ativas em sintetização geram rendimentos (status atual: ${card.cardStatus}).`);
    }

    const production = this.calculateSynthesisProduction(card, customNowMs);
    const amountToCredit = production.unclaimedAmount;

    if (amountToCredit <= 0) {
      throw new Error('Nenhum NEX disponível para coleta no momento. Aguarde mais tempo de produção.');
    }

    const productionBefore = card.totalGenerated || 0;
    const productionAfter = Math.min(card.synthesisCap, productionBefore + amountToCredit);
    const isNowExhausted = productionAfter >= card.synthesisCap;

    const nowIso = new Date().toISOString();

    // 1. Atualiza a carta
    const updatedCard: Card = {
      ...card,
      totalGenerated: productionAfter,
      cardStatus: isNowExhausted ? 'EXHAUSTED' : 'ACTIVE',
      status: isNowExhausted ? 'EXHAUSTED' : 'ACTIVE',
      tradeable: false,
      synthesizable: false,
      lastClaimedAt: nowIso,
      // Reseta offset simulado consumido na coleta
      simulatedTimeOffsetMs: 0,
    };

    // 2. Adiciona o saldo de NEX do usuário através do EconomyService
    const updatedUser = this.addCurrency(userId, 'NEX', amountToCredit);

    // 3. Registra no Ledger com metadados obrigatórios do Requisito 10
    LedgerService.recordEntry(
      userId,
      updatedUser.username,
      'NEX',
      amountToCredit,
      updatedUser.balanceNEX,
      'SYNTHESIS_REWARD',
      `Síntese de NEX da carta "${card.name}" (+${amountToCredit.toLocaleString()} NEX)`,
      {
        cardId: card.id,
        productionBefore,
        productionAfter,
      }
    );

    return {
      updatedCard,
      claimedNEX: amountToCredit,
      user: updatedUser,
      productionBefore,
      productionAfter,
      exhausted: isNowExhausted,
    };
  }

  /**
   * Avança o tempo de sintetização para simulação e testes (Requisito 16)
   */
  public advanceCardSynthesisTime(card: Card, additionalHours: number): Card {
    if (card.cardStatus !== 'ACTIVE') return card;
    const currentOffset = card.simulatedTimeOffsetMs || 0;
    const addedMs = additionalHours * 3600000;
    return {
      ...card,
      simulatedTimeOffsetMs: currentOffset + addedMs,
    };
  }

  /**
   * Para a síntese da carta a pedido do jogador (Requisito 10)
   */
  public stopSynthesis(
    card: Card,
    userId: string
  ): { updatedCard: Card; user: NexaUser; claimedNEX: number } {
    if (card.ownerId !== userId) {
      throw new Error('Você não possui permissão para alterar a síntese desta carta.');
    }
    let claimedNEX = 0;
    let user = this.getUser(userId) || ({} as NexaUser);
    let updatedCard = { ...card };

    const prod = this.calculateSynthesisProduction(card);
    if (prod.unclaimedAmount > 0) {
      try {
        const claimResult = this.claimSynthesisRewards(userId, card);
        updatedCard = claimResult.updatedCard;
        user = claimResult.user;
        claimedNEX = claimResult.claimedNEX;
      } catch {
        // No rewards
      }
    }

    if (updatedCard.cardStatus !== 'EXHAUSTED') {
      updatedCard.cardStatus = 'FREE';
      updatedCard.status = 'IDLE';
    }

    return { updatedCard, user, claimedNEX };
  }
}

export const EconomyService = new EconomyServiceClass();
