/**
 * 设置表单的草稿状态: 编辑只改本地草稿, 点保存才一次性写回 Host, 点放弃更改
 * 立即还原成 Host 当前值. 数字字段以带单位的文本保存, 未编辑与保存后都还原成
 * 合适的单位写法.
 * @module dsh-limit-timeout/client/settings-draft
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { SettingsPathOpView } from '@deepseek-ai/dsh-api-remotes/client'
import type { ConfigForm as SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client'
import {
  ALLOW_ESCALATION_FIELD,
  DEFAULT_LIMIT_FIELD,
  DEFAULT_SETTINGS,
  HARD_LIMIT_FIELD,
  MAX_LIMIT_MS,
  MIN_LIMIT_MS,
  REQUIRE_EXPLICIT_JOB_WAIT_FIELD,
  SUPPRESS_REPEAT_REMINDER_FIELD,
  type LimitTimeoutSettings,
} from '../shared.ts'
import { formatLimitInput, parseLimitInput } from './format.ts'

/** 以时长文本编辑的字段. */
export const DURATION_FIELDS = [DEFAULT_LIMIT_FIELD, HARD_LIMIT_FIELD] as const

/** 以开关编辑的字段. */
export const FLAG_FIELDS = [
  ALLOW_ESCALATION_FIELD,
  REQUIRE_EXPLICIT_JOB_WAIT_FIELD,
  SUPPRESS_REPEAT_REMINDER_FIELD,
] as const

/** 时长字段名. */
export type DurationField = (typeof DURATION_FIELDS)[number]

/** 开关字段名. */
export type FlagField = (typeof FLAG_FIELDS)[number]

/** 一次保存的结算状态. */
export type SaveStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'error', message: string }

/** 表单草稿: 数字字段存用户输入文本, 开关存布尔值. */
export interface SettingsDraft {
  durations: Record<DurationField, string>
  flags: Record<FlagField, boolean>
}

/** 从 Host 配置构造一份干净草稿. */
export function draftFrom(settings: LimitTimeoutSettings): SettingsDraft {
  return {
    durations: {
      [DEFAULT_LIMIT_FIELD]: formatLimitInput(settings.defaultLimitMs),
      [HARD_LIMIT_FIELD]: formatLimitInput(settings.hardLimitMs),
    },
    flags: {
      [ALLOW_ESCALATION_FIELD]: settings.allowEscalation,
      [REQUIRE_EXPLICIT_JOB_WAIT_FIELD]: settings.requireExplicitJobWaitMs,
      [SUPPRESS_REPEAT_REMINDER_FIELD]: settings.suppressRepeatToolReminders,
    },
  }
}

/** 两份草稿是否完全一致. */
export function sameDraft(a: SettingsDraft, b: SettingsDraft): boolean {
  return DURATION_FIELDS.every(field => a.durations[field] === b.durations[field])
    && FLAG_FIELDS.every(field => a.flags[field] === b.flags[field])
}

/** 一份可提交的保存计划. */
export type SavePlan =
  | { ok: true, ops: SettingsPathOpView[], normalized: SettingsDraft }
  | { ok: false, error: string }

/** 读取 Host 配置里某个开关字段的值. */
function hostFlag(settings: LimitTimeoutSettings, field: FlagField): boolean {
  switch (field) {
    case ALLOW_ESCALATION_FIELD: return settings.allowEscalation
    case REQUIRE_EXPLICIT_JOB_WAIT_FIELD: return settings.requireExplicitJobWaitMs
    case SUPPRESS_REPEAT_REMINDER_FIELD: return settings.suppressRepeatToolReminders
    default: return false
  }
}

/**
 * 校验草稿并算出需要写入的字段操作. 只有相对 Host 当前值真正变化的字段才会写,
 * 因此一次保存是一次原子 mutation, 且不会把未动过的字段标记成用户覆盖.
 * @param draft - 当前草稿.
 * @param settings - Host 当前生效配置.
 * @returns 保存计划, 或第一条校验错误.
 */
export function buildSavePlan(draft: SettingsDraft, settings: LimitTimeoutSettings): SavePlan {
  const hard = parseLimitInput(draft.durations[HARD_LIMIT_FIELD], MIN_LIMIT_MS, MAX_LIMIT_MS)
  if (!hard.ok) return { ok: false, error: `硬天花板: ${hard.error}` }
  const fallback = parseLimitInput(draft.durations[DEFAULT_LIMIT_FIELD], MIN_LIMIT_MS, hard.value)
  if (!fallback.ok) return { ok: false, error: `全局默认等待上限: ${fallback.error}` }

  const ops: SettingsPathOpView[] = []
  if (fallback.value !== settings.defaultLimitMs) {
    ops.push({ op: 'set', path: [DEFAULT_LIMIT_FIELD], value: fallback.value })
  }
  if (hard.value !== settings.hardLimitMs) {
    ops.push({ op: 'set', path: [HARD_LIMIT_FIELD], value: hard.value })
  }
  for (const field of FLAG_FIELDS) {
    if (draft.flags[field] !== hostFlag(settings, field)) {
      ops.push({ op: 'set', path: [field], value: draft.flags[field] })
    }
  }
  return {
    ok: true,
    ops,
    normalized: {
      durations: {
        [DEFAULT_LIMIT_FIELD]: formatLimitInput(fallback.value),
        [HARD_LIMIT_FIELD]: formatLimitInput(hard.value),
      },
      flags: { ...draft.flags },
    },
  }
}

/** 表单草稿的对外句柄. */
export interface SettingsDraftHandle {
  /** Host 当前生效配置. */
  settings: LimitTimeoutSettings
  /** 当前草稿. */
  draft: SettingsDraft
  /** 草稿是否与 Host 不同. */
  dirty: boolean
  /** 最近一次保存的状态. */
  status: SaveStatus
  /** 修改一个时长字段的文本. */
  setDuration: (field: DurationField, text: string) => void
  /** 修改一个开关字段. */
  setFlag: (field: FlagField, value: boolean) => void
  /** 提交全部改动. */
  save: () => void
  /** 放弃全部改动, 还原成 Host 当前值. */
  discard: () => void
  /** 某个时长字段当前的校验错误. */
  durationError: (field: DurationField) => string | undefined
}

/**
 * 维护一份设置草稿. Host 侧被别处改动时, 只要本地没有正在编辑的内容就跟随更新.
 * @param scope - 已绑定的 settings scope.
 * @returns 草稿句柄.
 */
export function useSettingsDraft(scope: SettingsScope<LimitTimeoutSettings>): SettingsDraftHandle {
  const settings = useSyncExternalStore(
    (onChange) => scope.subscribe(onChange),
    () => scope.getSnapshot().value,
  ) ?? DEFAULT_SETTINGS
  const hostDraft = useMemo(() => draftFrom(settings), [settings])
  const [draft, setDraft] = useState<SettingsDraft>(hostDraft)
  const [status, setStatus] = useState<SaveStatus>({ kind: 'idle' })
  const lastHost = useRef(hostDraft)

  // 草稿仍等于上一版 Host 值 (用户没编辑过) 时跟随 Host; 否则保留用户正在编辑的内容.
  useEffect(() => {
    const previous = lastHost.current
    lastHost.current = hostDraft
    setDraft(current => (sameDraft(current, previous) ? hostDraft : current))
  }, [hostDraft])

  const durationError = useCallback((field: DurationField): string | undefined => {
    if (field === HARD_LIMIT_FIELD) {
      const parsed = parseLimitInput(draft.durations[HARD_LIMIT_FIELD], MIN_LIMIT_MS, MAX_LIMIT_MS)
      return parsed.ok ? undefined : parsed.error
    }
    const hard = parseLimitInput(draft.durations[HARD_LIMIT_FIELD], MIN_LIMIT_MS, MAX_LIMIT_MS)
    const parsed = parseLimitInput(
      draft.durations[DEFAULT_LIMIT_FIELD],
      MIN_LIMIT_MS,
      hard.ok ? hard.value : MAX_LIMIT_MS,
    )
    return parsed.ok ? undefined : parsed.error
  }, [draft])

  const save = useCallback((): void => {
    const plan = buildSavePlan(draft, settings)
    if (!plan.ok) {
      setStatus({ kind: 'error', message: plan.error })
      return
    }
    if (plan.ops.length === 0) {
      setStatus({ kind: 'saved' })
      return
    }
    setStatus({ kind: 'saving' })
    void scope.mutate(plan.ops)
      .then((accepted) => {
        if (!accepted) {
          setStatus({ kind: 'error', message: '配置写入被拒绝' })
          return
        }
        setStatus({ kind: 'saved' })
        // 保存后把数字还原成合适的单位写法.
        setDraft(plan.normalized)
      })
      .catch((error: unknown) => {
        setStatus({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
      })
  }, [draft, scope, settings])

  const discard = useCallback((): void => {
    setDraft(draftFrom(settings))
    setStatus({ kind: 'idle' })
  }, [settings])

  return {
    settings,
    draft,
    dirty: !sameDraft(draft, hostDraft),
    status,
    setDuration: (field, text) => {
      setDraft(current => ({ ...current, durations: { ...current.durations, [field]: text } }))
      setStatus({ kind: 'idle' })
    },
    setFlag: (field, value) => {
      setDraft(current => ({ ...current, flags: { ...current.flags, [field]: value } }))
      setStatus({ kind: 'idle' })
    },
    save,
    discard,
    durationError,
  }
}
