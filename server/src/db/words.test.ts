import { test } from 'node:test'
import assert from 'node:assert'
import { isValidWord } from './words.js'

test('isValidWord accepts word containing prompt', () => {
  assert.strictEqual(isValidWord('thing', 'ing'), true)
  assert.strictEqual(isValidWord('the', 'th'), true)
})

test('isValidWord rejects word without prompt', () => {
  assert.strictEqual(isValidWord('word', 'ing'), false)
})

test('isValidWord rejects empty or too short', () => {
  assert.strictEqual(isValidWord('a', 'a'), false)
  assert.strictEqual(isValidWord('', 'th'), false)
})

test('isValidWord rejects non-letters', () => {
  assert.strictEqual(isValidWord('th1ng', 'ing'), false)
})
