const watchers: Record<number, AbortController> = Object.create(null)

export const add = (id: number, controller: AbortController): void => {
  watchers[id] = controller
}

export const get = (id: number): AbortController => {
  return watchers[id]
}

export const has = (id: number): boolean => {
  return id in watchers
}

export const remove = (id: number): void => {
  delete watchers[id]
}
