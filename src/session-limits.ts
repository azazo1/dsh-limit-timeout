/**
 * 会话级等待上限提升. 按用户要求只保存在当前进程内存里: 记录以会话对象为键
 * (WeakMap), 会话对象被回收后记录自然消失, 会话恢复不继承旧提升.
 * @module dsh-limit-timeout/session-limits
 */

/** 一次用户批准的会话级提升. */
export interface SessionWaitGrant {
  /** 批准后生效的等待上限 (毫秒). */
  limitMs: number
  /** 模型给出的申请理由 (审计与提示复用). */
  reason: string
  /** 批准时间戳 (毫秒). */
  grantedAt: number
}

/** 按会话保存的提升记录. */
export class SessionWaitLimits {
  private readonly grants = new WeakMap<object, SessionWaitGrant>()

  /**
   * 记录一次已批准的提升, 覆盖同会话的旧记录.
   * @param session - 目标会话对象.
   * @param limitMs - 批准生效的等待上限.
   * @param reason - 模型给出的申请理由.
   * @param grantedAt - 批准时间戳, 缺省为当前时刻.
   * @returns 写入的记录.
   */
  grant(session: object, limitMs: number, reason: string, grantedAt: number = Date.now()): SessionWaitGrant {
    const grant: SessionWaitGrant = { limitMs, reason, grantedAt }
    this.grants.set(session, grant)
    return grant
  }

  /**
   * 读取会话的当前提升记录.
   * @param session - 目标会话对象, 可能不存在.
   * @returns 提升记录, 没有则 undefined.
   */
  grantOf(session: object | undefined): SessionWaitGrant | undefined {
    return session === undefined ? undefined : this.grants.get(session)
  }

  /**
   * 计算会话当前生效的等待上限: 已批准的提升值 (没有则全局默认值) 与硬天花板
   * 取小, 这样调低硬天花板可以立即收回既有提升.
   * @param session - 目标会话对象.
   * @param defaultLimitMs - 全局默认允许等待上限.
   * @param hardLimitMs - 硬天花板.
   * @returns 当前生效的等待上限 (毫秒).
   */
  limitOf(session: object | undefined, defaultLimitMs: number, hardLimitMs: number): number {
    const grant = this.grantOf(session)
    const base = grant === undefined ? defaultLimitMs : grant.limitMs
    return Math.min(base, hardLimitMs)
  }

  /**
   * 撤销会话的既有提升.
   * @param session - 目标会话对象.
   * @returns 是否确实删除了一条记录.
   */
  revoke(session: object): boolean {
    return this.grants.delete(session)
  }
}
