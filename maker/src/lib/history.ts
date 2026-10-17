export type HistoryState<T> = {
  past: T[]
  present: T
  future: T[]
}

export function createHistory<T>(present: T): HistoryState<T> {
  return { past: [], present, future: [] }
}

export function historyCommit<T>(history: HistoryState<T>, next: T, limit = 40): HistoryState<T> {
  if (sameSnapshot(history.present, next)) return history
  return {
    past: [...history.past, history.present].slice(-limit),
    present: next,
    future: [],
  }
}

export function historyUndo<T>(history: HistoryState<T>): HistoryState<T> {
  const previous = history.past.at(-1)
  if (previous === undefined) return history
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  }
}

export function historyRedo<T>(history: HistoryState<T>): HistoryState<T> {
  const [next, ...future] = history.future
  if (next === undefined) return history
  return {
    past: [...history.past, history.present],
    present: next,
    future,
  }
}

function sameSnapshot<T>(left: T, right: T): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}
