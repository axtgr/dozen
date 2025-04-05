import { describe, expect, test } from 'bun:test'
import type { Entry } from '../types.ts'
import assignReducer from './assignReducer.ts'

describe('assignReducer', () => {
  test('merges entry value into config object', async () => {
    // Setup
    const plugin = assignReducer({})
    const config = { existing: true }
    const entry: Entry = {
      id: 'test',
      format: ['json'],
      value: { added: 'value' },
      status: 'mapped',
    }

    // Act
    const result = await plugin.reduce!(config, entry, {})

    // Assert
    expect(result).toEqual({ existing: true, added: 'value' })
    // The reducer should modify the original config object (Object.assign behavior)
    expect(result).toBe(config)
  })

  test('overwrites properties with the same name', async () => {
    // Setup
    const plugin = assignReducer({})
    const config = { name: 'original', count: 1 }
    const entry: Entry = {
      id: 'test',
      format: ['json'],
      value: { name: 'new' },
      status: 'mapped',
    }

    // Act
    const result = await plugin.reduce!(config, entry, {})

    // Assert
    expect(result).toEqual({ name: 'new', count: 1 })
  })

  test('handles empty config object', async () => {
    // Setup
    const plugin = assignReducer({})
    const config = {}
    const entry: Entry = {
      id: 'test',
      format: ['json'],
      value: { foo: 'bar', baz: 42 },
      status: 'mapped',
    }

    // Act
    const result = await plugin.reduce!(config, entry, {})

    // Assert
    expect(result).toEqual({ foo: 'bar', baz: 42 })
  })

  test('handles empty entry value', async () => {
    // Setup
    const plugin = assignReducer({})
    const config = { existing: 'data' }
    const entry: Entry = {
      id: 'test',
      format: ['json'],
      value: {},
      status: 'mapped',
    }

    // Act
    const result = await plugin.reduce!(config, entry, {})

    // Assert
    expect(result).toEqual({ existing: 'data' })
    // Even with empty value, the result should be the same object
    expect(result).toBe(config)
  })

  test('merges multiple entries sequentially', async () => {
    // Setup
    const plugin = assignReducer({})
    let config = {}

    const entries: Entry[] = [
      {
        id: 'first',
        format: ['json'],
        value: { first: true },
        status: 'mapped',
      },
      {
        id: 'second',
        format: ['json'],
        value: { second: true },
        status: 'mapped',
      },
      {
        id: 'third',
        format: ['json'],
        value: { third: true },
        status: 'mapped',
      },
    ]

    // Act
    for (const entry of entries) {
      config = await plugin.reduce!(config, entry, {})
    }

    // Assert
    expect(config).toEqual({
      first: true,
      second: true,
      third: true,
    })
  })

  test('preserves entry value after merging', async () => {
    // Setup
    const plugin = assignReducer({})
    const config = { existing: true }
    const entryValue = { added: 'value' }
    const entry: Entry = {
      id: 'test',
      format: ['json'],
      value: entryValue,
      status: 'mapped',
    }

    // Act
    const result = await plugin.reduce!(config, entry, {})

    // Assert
    expect(result).toEqual({ existing: true, added: 'value' })
    // Make sure the original entry value wasn't modified
    expect(entry.value).toBe(entryValue)
    expect(entry.value).toEqual({ added: 'value' })
  })
})
