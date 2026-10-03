import { openDB } from 'idb'

export interface StoredNote { id: string; data: string; pinned: boolean; archived: boolean; updated: number }

const dbPromise = openDB('vaultnote', 1, {
  upgrade(db) { db.createObjectStore('notes', { keyPath: 'id' }); db.createObjectStore('meta') }
})

export const getMeta = async (k: string): Promise<string | undefined> => (await dbPromise).get('meta', k)
export const setMeta = async (k: string, v: string) => { (await dbPromise).put('meta', v, k) }
export const allNotes = async (): Promise<StoredNote[]> => (await dbPromise).getAll('notes')
export const putNote = async (n: StoredNote) => { (await dbPromise).put('notes', n) }
export const deleteNote = async (id: string) => { (await dbPromise).delete('notes', id) }
