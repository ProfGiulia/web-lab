import React, { useEffect, useMemo, useState } from 'react'
import { sections, exercises } from './exercises.js'

const initialProgress = () => {
  try { return JSON.parse(localStorage.getItem('weblab-progress') || '{}') } catch { return {} }
}
const starterFor = (ex) => ({ html: ex.html, css: ex.css || '', updated: Date.now(), submitted: false })
const esc = (s) => String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')

function makePreview(html, css) {
  const cssTag = css ? `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>` : ''
  if (/<head[\s>]/i.test(html)) return html.replace(/<\/head>/i, `${cssTag}</head>`)
  return `<!doctype html><html><head><meta charset="UTF-8">${cssTag}</head><body>${html}</body></html>`
}

function App() {
  const [progress, setProgress] = useState(initialProgress)
  const [sectionId, setSectionId] = useState('html')
  const [selectedId, setSelectedId] = useState(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('Tutti')
  const [tab, setTab] = useState('html')
  const [showHints, setShowHints] = useState(0)
  const [showChecks, setShowChecks] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [notice, setNotice] = useState('')
  const [previewVersion, setPreviewVersion] = useState(0)
  const [teacherOpen, setTeacherOpen] = useState(false)
  const [teacherPin, setTeacherPin] = useState('')
  const [teacherUnlocked, setTeacherUnlocked] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newBrief, setNewBrief] = useState('')
  const [newSection, setNewSection] = useState('html')
  const [customExercises, setCustomExercises] = useState(() => {
    try { return JSON.parse(localStorage.getItem('weblab-custom-exercises') || '[]') } catch { return [] }
  })
  const allExercises = useMemo(() => [...exercises, ...customExercises], [customExercises])
  const currentSection = sections.find(s => s.id === sectionId) || sections[0]
  const sectionExercises = allExercises.filter(e => e.section === sectionId)
  const selected = allExercises.find(e => e.id === selectedId) || null
  const work = selected ? (progress[selected.id] || starterFor(selected)) : null

  useEffect(() => { localStorage.setItem('weblab-progress', JSON.stringify(progress)) }, [progress])
  useEffect(() => { localStorage.setItem('weblab-custom-exercises', JSON.stringify(customExercises)) }, [customExercises])

  const setWork = (field, value) => {
    if (!selected) return
    setProgress(prev => ({ ...prev, [selected.id]: { ...(prev[selected.id] || starterFor(selected)), [field]: value, updated: Date.now(), submitted: false } }))
  }
  const openExercise = (ex) => {
    setSelectedId(ex.id); setTab('html'); setShowHints(0); setShowChecks(false); setNotice('')
    setProgress(prev => prev[ex.id] ? prev : ({ ...prev, [ex.id]: starterFor(ex) }))
  }
  const checks = selected && work ? selected.requirements.map(req => {
    const html = work.html || '', css = work.css || ''
    let ok = false
    const countTag = (src, tag) => (src.match(new RegExp(`<${tag}(?:\\\\s|>)`, 'gi')) || []).length
    const stripped = html.replace(/<style[\\s\\S]*?<\\/style>/gi,'').replace(/<script[\\s\\S]*?<\\/script>/gi,'')
    switch(req.type) {
      case 'html': ok = req.pattern === 'doctype' ? /<!doctype\\s+html/i.test(html) : /<!--[\\s\\S]*?-->/m.test(html); break
      case 'tag': ok = new RegExp(`<${req.value}(?:\\\\s|>)`, 'i').test(stripped); break
      case 'countTag': ok = countTag(stripped, req.value) >= req.count; break
      case 'allAlt': { const imgs = [...stripped.matchAll(/<img\\b[^>]*>/gi)].map(m=>m[0]); ok = imgs.length > 0 && imgs.every(x => /\\balt\\s*=\\s*(['"])[^'"]+\\1/i.test(x)); break }
      case 'internalLinks': { const links = [...stripped.matchAll(/<a\\b[^>]*href\\s*=\\s*(['"])#([^'"]+)\\1/gi)]; ok = links.length >= req.count && links.every(m => new RegExp(`\\\\bid\\\\s*=\\\\s*(['"])${m[2]}\\\\1`, 'i').test(stripped)); break }
      case 'externalLink': ok = /<a\\b[^>]*href\\s*=\\s*(['"])https?:\\/\\//i.test(stripped); break
      case 'idExists': ok = new RegExp(`\\\\bid\\\\s*=\\\\s*(['"])${req.value}\\\\1`, 'i').test(stripped); break
      case 'cssNonEmpty': ok = css.trim().length > 0; break
      case 'cssSelector': ok = new RegExp(`(^|})\\\\s*${req.value.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&')}\\\\s*\\\\{`, 'm').test(css); break
      case 'cssProperty': ok = new RegExp(`(?:^|[;{])\\\\s*${req.value}\\\\s*:`, 'i').test(css); break
      case 'htmlContains': ok = html.toLowerCase().includes(req.value.toLowerCase()); break
      case 'cssContains': ok = css.includes(req.value); break
      case 'textContains': ok = stripped.replace(/<[^>]+>/g,' ').toLowerCase().includes(req.value.toLowerCase()); break
      case 'linkHref': ok = /<a\\b[^>]*href\\s*=/i.test(stripped); break
      case 'basicClose': ok = /<h1\\b[^>]*>[\\s\\S]*?<\\/h1>/i.test(stripped) && /<p\\b[^>]*>[\\s\\S]*?<\\/p>/i.test(stripped); break
      default: ok = false
    }
    return { ...req, ok }
  }) : []
  const requiredChecks = checks.filter(c => c.ok).length
  const complete = checks.length > 0 && checks.every(c => c.ok)
  const statusFor = (id) => {
    const p = progress[id]
    if (p?.submitted) return 'Completato'
    if (p && ((p.html && p.html !== allExercises.find(e=>e.id===id)?.html) || (p.css && p.css !== (allExercises.find(e=>e.id===id)?.css || '')))) return 'In corso'
    return 'Da iniziare'
  }
  const download = (filename, content, type='text/html;charset=utf-8') => {
    const blob = new Blob([content], {type}); const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url)
  }
  const downloadWork = () => {
    if (!selected || !work) return
    download(`${selected.id.toLowerCase()}-index.html`, work.html)
    if (work.css.trim()) download(`${selected.id.toLowerCase()}-style.css`, work.css, 'text/css;charset=utf-8')
    setNotice('File preparati per il download. Se il browser non scarica entrambi, scarica HTML e CSS separatamente.')
  }
  const save = () => { setProgress(prev => ({...prev, [selected.id]: {...work, updated: Date.now()}})); setNotice('Lavoro salvato in questo browser.'); }
  const submit = () => { setProgress(prev => ({...prev, [selected.id]: {...work, submitted: true, submittedAt: new Date().toISOString(), updated: Date.now()}})); setNotice('Esercizio contrassegnato come completato su questo dispositivo. Scarica i file e inviali alla docente.'); }
  const reset = () => { setProgress(prev => ({...prev, [selected.id]: starterFor(selected)})); setConfirmReset(false); setNotice('Codice iniziale ripristinato.'); }
  const createExercise = () => {
    if (!newTitle.trim() || !newBrief.trim()) return
    const id = `DOC-${String(Date.now()).slice(-6)}`
    const ex = { id, section:newSection, title:newTitle.trim(), level:'Personalizzato', time:'Da definire', topics:['Personalizzato'], mode:'Guidata', description:newBrief.trim().slice(0,110), brief:newBrief.trim(), requirements:[], hints:['Dividi la consegna in passaggi più piccoli.','Controlla spesso l’anteprima.','Rileggi i requisiti prima di consegnare.'], html:'<!doctype html>\n<html lang="it">\n<head><meta charset="UTF-8"><title>Nuovo esercizio</title></head>\n<body>\n  <h1>Inizia da qui</h1>\n</body>\n</html>', css:'', cssEnabled:newSection==='css' }
    setCustomExercises(prev=>[...prev,ex]); setNewTitle(''); setNewBrief(''); setNotice(`Esercizio “${ex.title}” creato.`)
  }

  if (selected && work) return <div className="app-shell">
    <header className="topbar"><button className="brand" onClick={()=>setSelectedId(null)}><span className="brand-mark">W</span><span>WEB LAB<small>LABORATORIO DI SVILUPPO WEB</small></span></button><div className="top-actions"><span className="saved-indicator"><i/>Salvataggio locale attivo</span><button className="ghost" onClick={()=>setSelectedId(null)}>← Tutti gli esercizi</button></div></header>
    <main className="workspace">
      <aside className="brief-panel">
        <div className="eyebrow">{selected.id} · {selected.level}</div><h1>{selected.title}</h1><p className="brief-intro">{selected.description}</p>
        <div className="meta-row"><span>◷ {selected.time}</span><span>◇ {selected.mode}</span></div>
        <div className="panel-rule"/>
        <h3>La consegna</h3><p className="brief-text">{selected.brief}</p>
        <h3>Requisiti</h3>
        {selected.requirements.length ? <div className="requirements">{(showChecks ? checks : selected.requirements).map((r,i)=><div className="requirement" key={r.id}><span className={`check-icon ${showChecks && r.ok ? 'passed' : ''}`}>{showChecks && r.ok ? '✓' : String(i+1).padStart(2,'0')}</span><span>{r.label}{showChecks && <small className={r.ok?'check-good':'check-pending'}>{r.ok?'Completato':'Da completare'}</small>}</span></div>)}</div> : <p className="muted small">Questa consegna è aperta: usa il brief come guida.</p>}
        {selected.hints?.length > 0 && <div className="hint-box"><div className="hint-heading"><span>✧</span> Suggerimenti <span className="hint-count">{Math.min(showHints,selected.hints.length)}/{selected.hints.length}</span></div>{showHints>0 && <p>{selected.hints[Math.min(showHints,selected.hints.length)-1]}</p>}<button className="text-button" onClick={()=>setShowHints(v=>v>=selected.hints.length?0:v+1)}>{showHints===0?'Mostra un suggerimento':showHints>=selected.hints.length?'Ricomincia dai suggerimenti':'Mostra il suggerimento successivo'} ↗</button></div>}
      </aside>
      <section className="editor-area">
        <div className="editor-heading"><div><span className="eyebrow">AREA DI LAVORO</span><h2>Scrivi, prova, migliora.</h2></div><button className="outline-button" onClick={()=>setPreviewVersion(v=>v+1)}>↻ Aggiorna anteprima</button></div>
        <div className="coding-grid">
          <div className="code-panel"><div className="panel-tabs"><button className={tab==='html'?'active':''} onClick={()=>setTab('html')}><span className="file-dot html-dot"/>index.html</button><button className={tab==='css'?'active':''} onClick={()=>setTab('css')}><span className="file-dot css-dot"/>style.css {selected.cssEnabled || work.css ? '' : <span className="optional">facoltativo</span>}</button></div>
            <div className="editor-note">{tab==='html'?'HTML · Struttura e contenuti':'CSS · Stile e impaginazione'}</div>
            <textarea className="code-editor" spellCheck="false" aria-label={tab==='html'?'Editor HTML':'Editor CSS'} value={tab==='html'?work.html:work.css} onChange={e=>setWork(tab==='html'?'html':'css',e.target.value)} />
            <div className="editor-footer"><span>Modifiche salvate automaticamente nel browser</span><span>{(tab==='html'?work.html:work.css).split('\n').length} righe</span></div>
          </div>
          <div className="preview-panel"><div className="preview-toolbar"><div><span className="live-dot"/> ANTEPRIMA LIVE</div><button title="Ricarica anteprima" onClick={()=>setPreviewVersion(v=>v+1)}>↻</button></div><div className="browser-bar"><span/><span/><span/><div>anteprima-locale</div></div><iframe key={previewVersion} title="Anteprima della pagina creata" sandbox="allow-forms allow-modals allow-popups" srcDoc={makePreview(work.html,work.css)} /></div>
        </div>
        <div className="bottom-tools"><div className="tool-left"><button className="outline-button" onClick={save}>▣ Salva lavoro</button><button className="text-button" onClick={()=>setShowChecks(v=>!v)}>{showChecks?'Nascondi verifica':'✓ Controlla requisiti'}</button><button className="text-button danger-text" onClick={()=>setConfirmReset(true)}>Ripristina iniziale</button></div><div className="tool-right"><button className="outline-button" onClick={downloadWork}>↓ Scarica file</button><button className="primary-button" onClick={submit}>Contrassegna completato ↗</button></div></div>
        {showChecks && <div className="check-summary"><div><strong>{requiredChecks}/{checks.length}</strong><span>requisiti verificati</span></div><div className="progress-track"><div style={{width:`${checks.length?requiredChecks/checks.length*100:0}%`}}/></div><p>Il controllo automatico verifica alcuni elementi tecnici. Non sostituisce la revisione del docente.</p></div>}
        {notice && <div className="notice"><span>✓</span>{notice}<button onClick={()=>setNotice('')}>×</button></div>}
        {confirmReset && <div className="modal-backdrop"><div className="modal"><h2>Ripristinare il codice?</h2><p>Le modifiche a questo esercizio saranno sostituite dal codice iniziale. Se vuoi conservarle, scarica prima i file.</p><div className="modal-actions"><button className="outline-button" onClick={()=>setConfirmReset(false)}>Annulla</button><button className="primary-button" onClick={reset}>Ripristina codice</button></div></div></div>}
      </section>
    </main>
  </div>

  return <div className="app-shell">
    <header className="topbar"><button className="brand" onClick={()=>{setSelectedId(null);setSectionId('html')}}><span className="brand-mark">W</span><span>WEB LAB<small>LABORATORIO DI SVILUPPO WEB</small></span></button><div className="top-actions"><span className="saved-indicator"><i/>Ambiente didattico</span><button className="ghost" onClick={()=>{setTeacherOpen(v=>!v);setTeacherUnlocked(false)}}>⚙ Area docente</button></div></header>
    <main className="dashboard">
      <section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line"/> LABORATORIO PRATICO</div><h1>Impara facendo.<br/><span>Una pagina alla volta.</span></h1><p>Un ambiente di lavoro per progettare pagine web, sperimentare con il codice e imparare a risolvere problemi reali.</p><div className="hero-tags"><span>HTML & CSS</span><span>·</span><span>Progetti pratici</span><span>·</span><span>Progressi personali</span></div></div><div className="hero-art"><div className="art-window"><div className="art-top"><span/><span/><span/><b>index.html</b></div><div className="art-code"><p><i>01</i><span className="code-purple">&lt;main&gt;</span></p><p><i>02</i>　<span className="code-blue">&lt;h1&gt;</span><span className="code-white">Crea qualcosa.</span><span className="code-blue">&lt;/h1&gt;</span></p><p><i>03</i>　<span className="code-blue">&lt;p&gt;</span><span className="code-white">Prova. Correggi.</span></p><p><i>04</i>　<span className="code-blue">&lt;/p&gt;</span></p><p><i>05</i><span className="code-purple">&lt;/main&gt;</span></p></div><div className="art-preview"><div/><div/><div/><div/></div></div><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/></div></section>
      {teacherOpen && <section className="teacher-card"><div className="teacher-title"><div><span className="eyebrow">STRUMENTI DOCENTE</span><h2>Gestione esercizi</h2></div><button className="icon-button" onClick={()=>setTeacherOpen(false)}>×</button></div>
        {!teacherUnlocked ? <div className="teacher-unlock"><p>Questa è una protezione dimostrativa, non un sistema di autenticazione sicuro. PIN iniziale: <code>1234</code>.</p><input value={teacherPin} onChange={e=>setTeacherPin(e.target.value)} placeholder="Inserisci PIN dimostrativo" type="password"/><button className="primary-button" onClick={()=>{if(teacherPin==='1234'){setTeacherUnlocked(true);setTeacherPin('')}else setNotice('PIN non corretto.')}}>Apri area docente</button></div> :
        <div className="teacher-form"><p className="muted">Crea una nuova traccia. In questa versione gli esercizi personalizzati restano salvati nel browser usato per crearli.</p><label>Titolo esercizio<input value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Es. La pagina del museo"/></label><label>Sezione<select value={newSection} onChange={e=>setNewSection(e.target.value)}>{sections.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label><label>Consegna<textarea value={newBrief} onChange={e=>setNewBrief(e.target.value)} placeholder="Descrivi l'attività e i requisiti..." rows="3"/></label><button className="primary-button" onClick={createExercise}>＋ Crea esercizio</button><div className="teacher-warning">Nota: puoi creare e gestire tracce in questo browser. Per trasferirle su un altro computer occorre esportare i dati (funzione non inclusa in questa versione).</div></div>}
      </section>}
      <section className="section-heading"><div><div className="eyebrow">ESPLORA IL LABORATORIO</div><h2>Da dove vuoi iniziare?</h2><p>Scegli una sezione e mettiti alla prova con esercizi diversi.</p></div><div className="overall-stat"><strong>{allExercises.length}</strong><span>esercizi disponibili</span></div></section>
      <section className="category-grid">{sections.map(s=>{const list=allExercises.filter(e=>e.section===s.id);const done=list.filter(e=>statusFor(e.id)==='Completato').length;return <button key={s.id} className={`category-card ${s.color} ${sectionId===s.id?'chosen':''}`} onClick={()=>{setSectionId(s.id);setQuery('');setFilter('Tutti')}}><div className="category-top"><span className="category-icon">{s.icon}</span><span className="category-arrow">↗</span></div><h3>{s.title}</h3><p>{s.subtitle}</p><div className="category-bottom"><span>{list.length} esercizi</span><span>{done} completati</span></div><div className="mini-track"><div style={{width:`${list.length?done/list.length*100:0}%`}}/></div></button>})}</section>
      <section className="exercise-section"><div className="exercise-heading"><div><div className="eyebrow">RACCOLTA ESERCIZI</div><h2>{currentSection.title}<span className="title-count">{sectionExercises.length}</span></h2><p>{currentSection.subtitle}</p></div><div className="exercise-controls"><div className="search-box"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cerca un esercizio..."/></div><select value={filter} onChange={e=>setFilter(e.target.value)} aria-label="Filtra per stato"><option>Tutti</option><option>Da iniziare</option><option>In corso</option><option>Completato</option></select></div></div>
        <div className="exercise-list">{sectionExercises.filter(e=>(e.title+' '+e.description+' '+e.topics.join(' ')).toLowerCase().includes(query.toLowerCase())).filter(e=>filter==='Tutti'||statusFor(e.id)===filter).map((ex,i)=><button key={ex.id} className="exercise-row" onClick={()=>openExercise(ex)}><span className="exercise-number">{String(i+1).padStart(2,'0')}</span><div className="exercise-info"><div className="exercise-title-line"><h3>{ex.title}</h3><span className={`status status-${statusFor(ex.id).replaceAll(' ','-').toLowerCase()}`}>{statusFor(ex.id)}</span></div><p>{ex.description}</p><div className="topic-tags">{ex.topics.map(t=><span key={t}>{t}</span>)}</div></div><div className="exercise-meta"><span>{ex.level}</span><span>◷ {ex.time}</span></div><span className="row-arrow">↗</span></button>)}
          {sectionExercises.filter(e=>(e.title+' '+e.description+' '+e.topics.join(' ')).toLowerCase().includes(query.toLowerCase())).filter(e=>filter==='Tutti'||statusFor(e.id)===filter).length===0 && <div className="empty-state"><span>⌕</span><h3>Nessun esercizio trovato</h3><p>Prova a cambiare la ricerca o il filtro.</p></div>}
        </div>
      </section>
      <footer className="footer"><div className="footer-brand"><span className="brand-mark">W</span><span>WEB LAB</span></div><p>Un laboratorio per imparare a progettare, scrivere e migliorare il web.</p><span>HTML · CSS · PROBLEM SOLVING</span></footer>
    </main>
  </div>
}

export default App
