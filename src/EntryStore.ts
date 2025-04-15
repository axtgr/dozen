import type { Entry, EntryStatus } from './types.ts'

class EntryStore {
  #entries: Entry[] = []
  #entryParents = new Map<Entry['id'], Entry['id']>() // Child → Parent
  #entryStatuses = new Map<Entry['id'], EntryStatus>()
  #entryCountByStatus: Record<EntryStatus, number> = {
    pending: 0,
    loading: 0,
    loaded: 0,
    mapping: 0,
    mapped: 0,
  }
  #hasUpdates = false

  /**
   * Adds, replaces or removes a given entry and repositions it if needed
   */
  updateEntry(
    entry: Entry,
    parentId: Entry['id'] | undefined,
    status: EntryStatus,
    replaceSelf: boolean,
    putBeforeParent: boolean,
  ) {
    if (entry.value === undefined || entry.value === null) {
      this.removeSubtree(entry.id, true)
      return false
    }

    if (parentId) {
      this.#entryParents.set(entry.id, parentId)
    }

    const selfIndex = this.#entries.findIndex((e) => e.id === entry.id)
    let parentIndex = parentId ? this.#entries.findIndex((e) => e.id === parentId) : -1

    if (parentIndex === -1) {
      if (selfIndex === -1) {
        this.#entries.push(entry)
      } else if (replaceSelf) {
        this.#entries.splice(selfIndex, 1, entry)
      } else {
        this.#entries.splice(selfIndex, 1)
        this.#entries.push(entry)
      }
    } else {
      if (selfIndex !== -1) {
        this.#entries.splice(selfIndex, 1)
      }
      parentIndex += selfIndex === -1 || selfIndex > parentIndex || !replaceSelf ? 0 : -1
      if (putBeforeParent) {
        this.#entries.splice(parentIndex, 0, entry)
      } else {
        this.#entries.splice(parentIndex + 1, 0, entry)
      }
    }

    this.setEntryStatus(entry.id, status)

    return true
  }

  /**
   * Removes all descendants of the entry with a given id and, optionally, the entry itself
   */
  public removeSubtree(entryId: Entry['id'], removeItself = true) {
    if (removeItself) {
      const index = this.#entries.findIndex((entry) => entry.id === entryId)
      if (index !== -1) {
        const status = this.#entryStatuses.get(entryId)
        if (status) this.#entryCountByStatus[status]--

        this.#entryStatuses.delete(entryId)
        this.#entryParents.delete(entryId)
        this.#entries.splice(index, 1)
        this.#hasUpdates = true
      }
    }
    this.#entryParents.forEach((parentId, childId) => {
      if (parentId === entryId) {
        this.removeSubtree(childId, true)
      }
    })
  }

  /**
   * Returns all entries with the given status, or all entries if no status is given.
   */
  public getEntries(status?: EntryStatus) {
    if (!status) {
      return this.#entries
    }

    return this.#entries.filter((entry) => this.#entryStatuses.get(entry.id) === status)
  }

  /**
   * Returns the number of entries with the given status, or all entries if no status is given.
   */
  public countEntries(status?: EntryStatus) {
    return status ? this.#entryCountByStatus[status] : this.#entries.length
  }

  /**
   * Sets the status of the entry with the given id to the given value.
   */
  public setEntryStatus(entryId: Entry['id'], newStatus: EntryStatus): void {
    const previousStatus = this.#entryStatuses.get(entryId)
    if (previousStatus === newStatus) return

    if (previousStatus) {
      this.#entryCountByStatus[previousStatus]--
    }

    this.#entryCountByStatus[newStatus]++
    this.#entryStatuses.set(entryId, newStatus)

    // A pending entry means it's going to be loaded and mapped producing a new set
    // of child entries, so we remove the existing children.
    if (newStatus === 'pending' && previousStatus) {
      this.removeSubtree(entryId, false)
    }

    this.#hasUpdates = true
  }

  /**
   * Returns the status of the entry with the given id, or undefined if it doesn't exist.
   */
  public getEntryStatus(entryId: Entry['id']): EntryStatus | undefined {
    return this.#entryStatuses.get(entryId)
  }

  /**
   * Returns true if there are pending updates, false otherwise.
   */
  public hasUpdates() {
    return this.#hasUpdates
  }

  /**
   * Clears all pending updates.
   */
  public clearUpdates() {
    this.#hasUpdates = false
  }
}

export default EntryStore
