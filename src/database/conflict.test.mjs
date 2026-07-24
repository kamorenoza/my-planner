import test from 'node:test'
import assert from 'node:assert/strict'
import { resolvePlannerConflict } from './conflict.js'

test('prefers local when it is newer than the cloud', () => {
  const decision = resolvePlannerConflict({
    cloudValue: '{"a":1}',
    localValue: '{"a":2}',
    cloudMeta: { updatedAt: 1000 },
    localMeta: { updatedAt: 2000 },
  })

  assert.equal(decision.action, 'push')
  assert.equal(decision.reason, 'local-newer')
})

test('prefers cloud when it is newer than the local copy', () => {
  const decision = resolvePlannerConflict({
    cloudValue: '{"a":2}',
    localValue: '{"a":1}',
    cloudMeta: { updatedAt: 2000 },
    localMeta: { updatedAt: 1000 },
  })

  assert.equal(decision.action, 'pull')
  assert.equal(decision.reason, 'cloud-newer-or-unknown')
})

test('keeps the local change when the device has a pending edit', () => {
  const decision = resolvePlannerConflict({
    cloudValue: '{"a":2}',
    localValue: '{"a":1}',
    cloudMeta: { updatedAt: 1000 },
    localMeta: { updatedAt: 500 },
    isPending: true,
  })

  assert.equal(decision.action, 'push')
  assert.equal(decision.reason, 'local-pending')
})
