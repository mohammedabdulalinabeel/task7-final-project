import { useEffect, useMemo, useState } from 'react'
import { allNotes, deleteNote, getMeta, putNote, setMeta } from './db'
import { decrypt, deriveKey, encrypt, randomSalt } from './crypto'

type Note = { id: string; title: string; body: string; pinned: boolean; archived: boolean; updated: number }
type View = 'all' | 'pinned' | 'archived'

export default function App() {
  const [key, setKey] = useState<string | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [sel, setSel] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [view, setView] = useState<View>('all')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [isNew, setIsNew] = useState(false)

  useEffect(() => { getMeta('verifier').then(v => setIsNew(!v)) }, [])

  const persist = (n: Note, k = key!) =>
    putNote({ id: n.id, data: encrypt({ title: n.title, body: n.body }, k), pinned: n.pinned, archived: n.archived, updated: n.updated })

  async function unlock(e: React.FormEvent) {
    e.preventDefault(); setErr('')
    if (isNew) {
      if (pw.length < 8) return setErr('Use at least 8 characters for your master password.')
      const salt = randomSalt(); const k = deriveKey(pw, salt)
      await setMeta('salt', salt); await setMeta('verifier', encrypt({ ok: 1 }, k))
      setKey(k); setIsNew(false)
    } else {
      const k = deriveKey(pw, (await getMeta('salt'))!)
      if (!decrypt(await getMeta('verifier') as string, k)) return setErr('That password is wrong. Try again.')
      const recs = await allNotes()
      setNotes(recs.flatMap(r => {
        const d = decrypt<{ title: string; body: string }>(r.data, k)
        return d ? [{ id: r.id, ...d, pinned: r.pinned, archived: r.archived, updated: r.updated }] : []
      }))
      setKey(k)
    }
    setPw('')
  }

  const lock = () => { setKey(null); setNotes([]); setSel(null); setQ('') }
  const save = (n: Note) => { const u = { ...n, updated: Date.now() }; setNotes(p => p.map(x => x.id === u.id ? u : x)); persist(u) }
  const add = () => {
    const n: Note = { id: crypto.randomUUID(), title: '', body: '', pinned: false, archived: false, updated: Date.now() }
    setNotes(p => [n, ...p]); persist(n); setSel(n.id); setView('all'); setQ('')
  }
  const remove = (id: string) => {
    if (!confirm('Delete this note for good? This cannot be undone.')) return
    setNotes(p => p.filter(n => n.id !== id)); deleteNote(id); setSel(null)
  }

  const counts = { all: notes.filter(n => !n.archived).length, pinned: notes.filter(n => n.pinned && !n.archived).length, archived: notes.filter(n => n.archived).length }
  const list = useMemo(() => notes
    .filter(n => view === 'archived' ? n.archived : !n.archived && (view !== 'pinned' || n.pinned))
    .filter(n => (n.title + ' ' + n.body).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated - a.updated), [notes, view, q])
  const note = notes.find(n => n.id === sel)

  if (!key) return (
    <main className="lock">
      <form className="lock-card" onSubmit={unlock}>
        <div className="shackle-wrap"><svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true"><path className="shackle" d="M20 28v-8a12 12 0 0 1 24 0v8" fill="none" stroke="#7fd6dc" strokeWidth="5" strokeLinecap="round"/><rect x="12" y="28" width="40" height="28" rx="7" fill="#7fd6dc"/><circle cx="32" cy="42" r="4" fill="#0b2a30"/></svg></div>
        <h1>{isNew ? 'Create your vault' : 'Unlock your vault'}</h1>
        <p>{isNew ? 'Choose a master password. Your notes are encrypted with it and never leave this browser. If you forget it, nobody can recover your notes.' : 'Enter your master password to decrypt your notes.'}</p>
        <label htmlFor="pw">Master password</label>
        <input id="pw" type="password" value={pw} onChange={e => setPw(e.target.value)} autoFocus autoComplete={isNew ? 'new-password' : 'current-password'} />
        {err && <div className="error" role="alert">{err}</div>}
        <button type="submit">{isNew ? 'Create vault' : 'Unlock vault'}</button>
        <small>AES-256 encryption, key derived with PBKDF2</small>
      </form>
    </main>
  )

  const nav: [View, string][] = [['all', 'All notes'], ['pinned', 'Pinned'], ['archived', 'Archived']]
  return (
    <div className="app">
      <aside className="side">
        <div className="brand">Vaultnote</div>
        <button className="primary" onClick={add}>New note</button>
        <nav>{nav.map(([v, label]) => (
          <button key={v} className={view === v ? 'nav on' : 'nav'} onClick={() => { setView(v); setSel(null) }}>
            <span>{label}</span><b>{counts[v]}</b>
          </button>))}
        </nav>
        <button className="ghost" onClick={lock}>Lock vault</button>
      </aside>
      <section className="listcol">
        <input className="search" placeholder="Search your notes" value={q} onChange={e => setQ(e.target.value)} aria-label="Search notes" />
        <ul>
          {list.map(n => (
            <li key={n.id}><button className={n.id === sel ? 'item on' : 'item'} onClick={() => setSel(n.id)}>
              <strong>{n.pinned && <i className="dot" title="Pinned" />}{n.title || 'Untitled note'}</strong>
              <span>{n.body.slice(0, 80) || 'No content yet'}</span>
              <time>{new Date(n.updated).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</time>
            </button></li>))}
          {!list.length && <li className="empty">{q ? 'No notes match your search.' : view === 'all' ? 'Your vault is empty. Create your first note.' : `No ${view} notes.`}</li>}
        </ul>
      </section>
      <section className="editor">
        {note ? (<>
          <div className="bar">
            <button onClick={() => save({ ...note, pinned: !note.pinned })}>{note.pinned ? 'Unpin' : 'Pin'}</button>
            <button onClick={() => { save({ ...note, archived: !note.archived }); setSel(null) }}>{note.archived ? 'Restore' : 'Archive'}</button>
            <button className="danger" onClick={() => remove(note.id)}>Delete</button>
            <span className="saved">Encrypted and saved</span>
          </div>
          <input className="title" placeholder="Note title" value={note.title} onChange={e => save({ ...note, title: e.target.value })} />
          <textarea placeholder="Start writing. Everything here is encrypted before it is saved." value={note.body} onChange={e => save({ ...note, body: e.target.value })} />
        </>) : <div className="blank"><h2>Select a note</h2><p>Pick a note from the list, or create a new one.</p></div>}
      </section>
    </div>
  )
}
