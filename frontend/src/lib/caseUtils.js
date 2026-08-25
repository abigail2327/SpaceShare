function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof File)
}

function convertKey(key, fn) {
  return fn(key)
}

function toCamelKey(key) {
  return key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase())
}

function toSnakeKey(key) {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
}

function deepConvert(value, keyFn) {
  if (Array.isArray(value)) return value.map((v) => deepConvert(v, keyFn))
  if (isPlainObject(value)) {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      out[convertKey(k, keyFn)] = deepConvert(v, keyFn)
    }
    return out
  }
  return value
}

export function toCamel(value) {
  return deepConvert(value, toCamelKey)
}

export function toSnake(value) {
  return deepConvert(value, toSnakeKey)
}
