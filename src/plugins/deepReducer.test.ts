import { describe, expect, test } from 'bun:test'
import type { Entry } from '../types.ts'
import deepReducer from './deepReducer.ts'

describe('deepReducer', () => {
  test('merges entry value into config object', async () => {
    // Setup
    const plugin = deepReducer({})
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
    // Deep merge should create a new object instead of modifying the original
    expect(result).not.toBe(config)
  })

  test('overwrites properties with the same name', async () => {
    // Setup
    const plugin = deepReducer({})
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
    const plugin = deepReducer({})
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
    const plugin = deepReducer({})
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
  })

  test('merges multiple entries sequentially', async () => {
    // Setup
    const plugin = deepReducer({})
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
    const plugin = deepReducer({})
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

  test('deeply merges nested objects', async () => {
    // Setup
    const plugin = deepReducer({})
    const config = {
      nested: {
        a: 1,
        b: 2,
      },
      top: 'level',
    }
    const entry: Entry = {
      id: 'test',
      format: ['json'],
      value: {
        nested: {
          b: 3,
          c: 4,
        },
      },
      status: 'mapped',
    }

    // Act
    const result = await plugin.reduce!(config, entry, {})

    // Assert
    expect(result).toEqual({
      nested: {
        a: 1,
        b: 3,
        c: 4,
      },
      top: 'level',
    })
  })

  test('merges arrays by concatenation', async () => {
    // Setup
    const plugin = deepReducer({})
    const config = {
      items: [1, 2, 3],
      other: 'value',
    }
    const entry: Entry = {
      id: 'test',
      format: ['json'],
      value: {
        items: [4, 5],
      },
      status: 'mapped',
    }

    // Act
    const result = await plugin.reduce!(config, entry, {})

    // Assert
    expect(result).toEqual({
      items: [1, 2, 3, 4, 5],
      other: 'value',
    })
  })
})
