function readTimestamp(meta) {
  if (!meta) return 0
  if (typeof meta === 'number') return meta
  if (typeof meta === 'string') {
    const parsed = Number(meta)
    if (!Number.isNaN(parsed)) return parsed
    const fromDate = Date.parse(meta)
    return Number.isNaN(fromDate) ? 0 : fromDate
  }
  if (typeof meta === 'object') {
    if (typeof meta.updatedAt === 'number') return meta.updatedAt
    if (typeof meta.updatedAt === 'string') {
      const parsed = Date.parse(meta.updatedAt)
      return Number.isNaN(parsed) ? 0 : parsed
    }
    if (meta.updatedAt && typeof meta.updatedAt.toMillis === 'function') {
      return meta.updatedAt.toMillis()
    }
    if (meta.updatedAt && typeof meta.updatedAt.toDate === 'function') {
      return meta.updatedAt.toDate().getTime()
    }
  }
  return 0
}

export function resolvePlannerConflict({
  cloudValue,
  localValue,
  cloudMeta,
  localMeta,
  isPending = false,
}) {
  if (cloudValue === undefined) {
    return { action: 'push', reason: 'cloud-missing' }
  }

  if (typeof cloudValue !== 'string' || localValue === cloudValue) {
    return { action: 'none', reason: 'same-or-non-string' }
  }

  if (isPending) {
    return { action: 'push', reason: 'local-pending' }
  }

  const localTs = readTimestamp(localMeta)
  const cloudTs = readTimestamp(cloudMeta)

  if (localTs > cloudTs) {
    return { action: 'push', reason: 'local-newer' }
  }

  return { action: 'pull', reason: 'cloud-newer-or-unknown' }
}
