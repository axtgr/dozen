import { describe, expect, test } from 'bun:test'
import type { Entry } from '../types.ts'
import { toFilteredArray } from '../utils.ts'
import argvLoader from './argvLoader.ts'

describe('argvLoader', () => {
  test('does not load entries without argv format', async () => {
    // Setup
    const plugin = argvLoader({})
    const entry: Entry = {
      id: 'test',
      format: ['json'],
      value: ['--foo', 'bar', '--baz'],
    }

    // Act
    const result = await plugin.load!(entry, {})
    const resultArray = toFilteredArray(result)

    // Assert
    expect(resultArray.length).toBe(0)
    expect(entry.value).toEqual(['--foo', 'bar', '--baz'])
  })

  test('does not load entries with non-array values', async () => {
    // Setup
    const plugin = argvLoader({})
    const entry: Entry = {
      id: 'test',
      format: ['argv'],
      value: 'not-an-array',
    }

    // Act
    const result = await plugin.load!(entry, {})
    const resultArray = toFilteredArray(result)

    // Assert
    expect(resultArray.length).toBe(0)
    expect(entry.value).toBe('not-an-array')
  })

  test('parses argv entries with array values', async () => {
    // Setup
    const plugin = argvLoader({})
    const entry: Entry = {
      id: 'test',
      format: ['argv'],
      value: ['--foo', 'bar', '--baz'],
    }

    // Act
    const result = await plugin.load!(entry, {})
    const resultArray = toFilteredArray(result)

    // Assert
    expect(resultArray.length).toBe(1)
    expect(resultArray[0].id).toBe('test')
    expect(resultArray[0].format).toEqual(['argv'])
    expect(resultArray[0].value).toEqual({ foo: true, baz: true })
  })

  test('handles numeric values correctly', async () => {
    // Setup
    const plugin = argvLoader({})
    const entry: Entry = {
      id: 'test',
      format: ['argv'],
      value: ['--port', '3000', '--count', '42'],
    }

    // Act
    const result = await plugin.load!(entry, {})
    const resultArray = toFilteredArray(result)

    // Assert
    expect(resultArray.length).toBe(1)
    expect(resultArray[0].id).toBe('test')
    expect(resultArray[0].value).toEqual({ port: true, count: true })
  })

  test('handles boolean flags correctly', async () => {
    // Setup
    const plugin = argvLoader({})
    const entry: Entry = {
      id: 'test',
      format: ['argv'],
      value: ['--debug', '--verbose', '--no-color'],
    }

    // Act
    const result = await plugin.load!(entry, {})
    const resultArray = toFilteredArray(result)

    // Assert
    expect(resultArray.length).toBe(1)
    expect(resultArray[0].id).toBe('test')
    expect(resultArray[0].value).toEqual({ debug: true, verbose: true, 'no-color': true })
  })

  test('handles empty array values', async () => {
    // Setup
    const plugin = argvLoader({})
    const entry: Entry = {
      id: 'test',
      format: ['argv'],
      value: [],
    }

    // Act
    const result = await plugin.load!(entry, {})
    const resultArray = toFilteredArray(result)

    // Assert
    expect(resultArray.length).toBe(1)
    expect(resultArray[0].id).toBe('test')
    expect(resultArray[0].value).toEqual({})
  })
})
