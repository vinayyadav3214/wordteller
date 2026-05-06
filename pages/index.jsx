import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

export default function Home() {
  const [word, setWord] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notebook, setNotebook] = useState([]);
  const [tab, setTab] = useState('lookup');
  const [listening, setListening] = useState(false);
  const [saved, setSaved] = useState(false);
  const recogRef = useRef(null);

  useEffect(() => {
    try {
      const nb = JSON.parse(localStorage.getItem('wordTeller_vocab') || '[]');
      setNotebook(nb);
    } catch(e) {}
  }, []);

  const saveToStorage = (nb) => {
    localStorage.setItem('wordTeller_vocab', JSON.stringify(nb));
    setNotebook(nb);
  };

  const lookupWord = async (w) => {
    const target = (w || word).trim();
    if (!target) return;
    setLoading(true); setResult(null); setError(''); setSaved(false);
    try {
      const res = await fetch('/api/define', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: target })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setResult({ ...data, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) });
    } catch(e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const toggleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Voice only works in Safari on iPhone. Please type the word!'); return; }
    if (listening) { recogRef.current?.stop(); return; }
    const r = new SR();
    r.lang = 'en-US'; r.interimResults = false; r.maxAlternatives = 1;
    r.onstart = () => setListening(true);
    r.onresult = (e) => { const w = e.results[0][0].transcript.trim().toLowerCase().split(' ')[0]; setWord(w); lookupWord(w); };
    r.onerror = () => { setListening(false); setError('Could not hear you. Try again or type the word!'); };
    r.onend = () => setListening(false);
    recogRef.current = r;
    r.start();
  };

  const saveWord = () => {
    if (!result) return;
    const already = notebook.some(e => e.word.toLowerCase() === result.word.toLowerCase());
    if (already) return;
    const nb = [result, ...notebook];
    saveToStorage(nb);
    setSaved(true);
  };

  const deleteWord = (w) => {
    saveToStorage(notebook.filter(e => e.word !== w));
  };

  const clearAll = () => {
    if (confirm('Clear all saved words?')) { saveToStorage([]); }
  };

  const isSaved = result && notebook.some(e => e.word.toLowerCase() === result.word.toLowerCase());

  return (
    <>
      <Head>
        <title>Word Teller ✨</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Word Teller" />
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>

      <div style={s.app}>
        {/* HEADER */}
        <div style={s.header}>
          <div style={s.headerTitle}>✨ Word Teller</div>
          <div style={s.headerSub}>Say or type a word — get it in English & Telugu!</div>
        </div>

        {/* TABS */}
        <div style={s.tabs}>
          <button style={{...s.tab, ...(tab==='lookup' ? s.tabActive : {})}} onClick={() => setTab('lookup')}>🔍 Look Up</button>
          <button style={{...s.tab, ...(tab==='notebook' ? s.tabActive : {})}} onClick={() => setTab('notebook')}>📒 My Notebook</button>
        </div>

        {/* LOOKUP */}
        {tab === 'lookup' && (
          <div style={s.screen}>
            <div style={s.body}>

              {/* MIC */}
              <div style={s.micHint}>Tap the mic and say a word! 🎤</div>
              <button style={{...s.micBtn, ...(listening ? s.micListening : {})}} onClick={toggleMic}>
                <svg width="42" height="42" viewBox="0 0 24 24" fill="white">
                  <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v6a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2zm7 7a1 1 0 0 1 1 1 8 8 0 0 1-7 7.93V21h2a1 1 0 0 1 0 2H9a1 1 0 0 1 0-2h2v-2.07A8 8 0 0 1 4 11a1 1 0 0 1 2 0 6 6 0 0 0 12 0 1 1 0 0 1 1-1z"/>
                </svg>
              </button>
              <div style={{...s.micStatus, ...(listening ? s.micStatusActive : {})}}>{listening ? 'Listening... say a word!' : 'Tap to speak'}</div>

              <div style={s.divider}><span style={s.dividerText}>or type a word</span></div>

              {/* INPUT */}
              <div style={s.searchRow}>
                <input
                  style={s.input}
                  value={word}
                  onChange={e => setWord(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && lookupWord()}
                  placeholder="e.g. slick, brave, slam..."
                  autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck="false"
                />
                <button style={s.goBtn} onClick={() => lookupWord()}>Go</button>
              </div>

              {/* LOADING */}
              {loading && (
                <div style={s.loadingWrap}>
                  <div style={s.loadingText}>✨ Thinking of a fun explanation...</div>
                  <div style={s.dots}>
                    <span style={{...s.dot, animationDelay:'0s'}} />
                    <span style={{...s.dot, animationDelay:'0.15s'}} />
                    <span style={{...s.dot, animationDelay:'0.3s'}} />
                  </div>
                </div>
              )}

              {/* ERROR */}
              {error && <div style={s.errorCard}>😕 {error}</div>}

              {/* RESULT */}
              {result && !loading && (
                <div style={s.resultCard}>
                  <div style={s.resultWord}>{result.word}</div>

                  <div style={s.engBlock}>
                    <div style={s.engLabel}>🇬🇧 English</div>
                    <div style={s.langText}>{result.english}</div>
                  </div>

                  <div style={s.telBlock}>
                    <div style={s.telLabel}>🇮🇳 తెలుగు</div>
                    <div style={{...s.langText, lineHeight:'2'}}>{result.telugu}</div>
                  </div>

                  {result.synonyms?.length > 0 && (
                    <div style={{marginBottom:'14px'}}>
                      <div style={s.synLabel}>Similar Words</div>
                      <div style={s.synPills}>
                        {result.synonyms.map(syn => (
                          <button key={syn} style={s.synPill} onClick={() => { setWord(syn); lookupWord(syn); }}>{syn}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    style={{...s.saveBtn, ...(isSaved || saved ? s.savedBtn : {})}}
                    onClick={saveWord}
                  >
                    {isSaved || saved ? '✓ Saved to Notebook!' : '+ Save to My Notebook'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* NOTEBOOK */}
        {tab === 'notebook' && (
          <div style={s.screen}>
            <div style={s.body}>
              {notebook.length === 0 ? (
                <div style={s.emptyWrap}>
                  <div style={{fontSize:'52px'}}>📖</div>
                  <div style={s.emptyTitle}>No words yet!</div>
                  <div style={s.emptySub}>Look up a word and save it to build your vocabulary notebook.</div>
                </div>
              ) : (
                <>
                  <div style={s.nbStats}>
                    <div>
                      <div style={s.nbCount}>{notebook.length}</div>
                      <div style={s.nbLabel}>{notebook.length === 1 ? 'word saved' : 'words saved'}</div>
                    </div>
                    <button style={s.clearBtn} onClick={clearAll}>Clear all</button>
                  </div>
                  {notebook.map(e => (
                    <div key={e.word} style={s.nbEntry}>
                      <div style={s.nbEntryHeader}>
                        <div style={s.nbEntryWord}>{e.word}</div>
                        <button style={s.delBtn} onClick={() => deleteWord(e.word)}>✕</button>
                      </div>
                      <div style={s.engBlock}>
                        <div style={s.engLabel}>🇬🇧 English</div>
                        <div style={s.langText}>{e.english}</div>
                      </div>
                      <div style={s.telBlock}>
                        <div style={s.telLabel}>🇮🇳 తెలుగు</div>
                        <div style={{...s.langText, lineHeight:'2'}}>{e.telugu}</div>
                      </div>
                      {e.date && <div style={s.nbDate}>Saved on {e.date}</div>}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F8F7FF; font-family: 'Nunito', sans-serif; }
        @keyframes bounce {
          0%,80%,100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-9px); opacity: 1; }
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(247,137,106,0.6); }
          70% { box-shadow: 0 0 0 24px rgba(247,137,106,0); }
          100% { box-shadow: 0 0 0 0 rgba(247,137,106,0); }
        }
      `}</style>
    </>
  );
}

const s = {
  app: { display:'flex', flexDirection:'column', height:'100vh', maxWidth:'480px', margin:'0 auto', background:'#F8F7FF' },
  header: { background:'linear-gradient(135deg,#9B8FF5,#3DD9A0)', padding:'18px 20px 22px', textAlign:'center', flexShrink:0, position:'relative', overflow:'hidden' },
  headerTitle: { fontSize:'22px', fontWeight:900, color:'#fff', position:'relative', zIndex:1 },
  headerSub: { fontSize:'12px', color:'rgba(255,255,255,0.85)', marginTop:'3px', position:'relative', zIndex:1 },

  tabs: { display:'flex', background:'#fff', borderBottom:'1px solid rgba(155,143,245,0.2)', flexShrink:0 },
  tab: { flex:1, padding:'13px 8px', textAlign:'center', fontSize:'13px', fontWeight:700, color:'#6B6B8A', border:'none', background:'none', cursor:'pointer', borderBottom:'2.5px solid transparent', fontFamily:'Nunito,sans-serif' },
  tabActive: { color:'#9B8FF5', borderBottom:'2.5px solid #9B8FF5' },

  screen: { flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch' },
  body: { display:'flex', flexDirection:'column', alignItems:'center', padding:'24px 20px 40px', gap:'16px' },

  micHint: { fontSize:'14px', color:'#6B6B8A', fontWeight:600, textAlign:'center' },
  micBtn: { width:'110px', height:'110px', borderRadius:'50%', border:'none', background:'linear-gradient(135deg,#9B8FF5,#3DD9A0)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 12px 40px rgba(155,143,245,0.4)', transition:'transform 0.15s' },
  micListening: { animation:'pulse 1.2s ease-out infinite', background:'linear-gradient(135deg,#F7896A,#9B8FF5)' },
  micStatus: { fontSize:'13px', fontWeight:700, color:'#9B8FF5', height:'18px', textAlign:'center' },
  micStatusActive: { color:'#F7896A' },

  divider: { display:'flex', alignItems:'center', gap:'10px', width:'100%', margin:'2px 0' },
  dividerText: { fontSize:'12px', color:'#6B6B8A', fontWeight:700, whiteSpace:'nowrap', padding:'0 4px', borderTop:'1px solid rgba(155,143,245,0.2)', borderBottom:'1px solid rgba(155,143,245,0.2)', flex:'none', background:'transparent' },

  searchRow: { display:'flex', gap:'8px', width:'100%' },
  input: { flex:1, padding:'13px 16px', border:'1.5px solid rgba(155,143,245,0.2)', borderRadius:'14px', fontFamily:'Nunito,sans-serif', fontSize:'15px', fontWeight:600, background:'#fff', color:'#1A1A2E', outline:'none', WebkitAppearance:'none' },
  goBtn: { padding:'13px 20px', borderRadius:'14px', border:'none', background:'#9B8FF5', color:'#fff', fontFamily:'Nunito,sans-serif', fontSize:'14px', fontWeight:800, cursor:'pointer' },

  loadingWrap: { display:'flex', flexDirection:'column', alignItems:'center', gap:'12px', padding:'16px 0', width:'100%' },
  loadingText: { fontSize:'13px', fontWeight:700, color:'#9B8FF5' },
  dots: { display:'flex', gap:'6px' },
  dot: { width:'9px', height:'9px', borderRadius:'50%', background:'#9B8FF5', display:'inline-block', animation:'bounce 0.9s infinite' },

  errorCard: { background:'#FFF0F0', border:'1.5px solid #FFB3B3', borderRadius:'16px', padding:'18px', color:'#C0392B', fontSize:'14px', fontWeight:600, textAlign:'center', width:'100%', lineHeight:1.6 },

  resultCard: { background:'#fff', borderRadius:'20px', border:'1.5px solid rgba(155,143,245,0.2)', padding:'20px', width:'100%', boxShadow:'0 8px 32px rgba(61,217,160,0.12)' },
  resultWord: { fontSize:'28px', fontWeight:900, color:'#1A1A2E', marginBottom:'16px', letterSpacing:'-0.5px' },

  engBlock: { background:'#F0EEFF', borderLeft:'4px solid #9B8FF5', borderRadius:'14px', padding:'14px 16px', marginBottom:'12px' },
  engLabel: { fontSize:'12px', fontWeight:900, textTransform:'uppercase', letterSpacing:'0.6px', color:'#9B8FF5', marginBottom:'8px' },
  telBlock: { background:'#E8FBF4', borderLeft:'4px solid #3DD9A0', borderRadius:'14px', padding:'14px 16px', marginBottom:'14px' },
  telLabel: { fontSize:'12px', fontWeight:900, textTransform:'uppercase', letterSpacing:'0.6px', color:'#0F6E56', marginBottom:'8px' },
  langText: { fontSize:'15px', fontWeight:600, color:'#1A1A2E', lineHeight:1.75 },

  synLabel: { fontSize:'11px', fontWeight:900, textTransform:'uppercase', letterSpacing:'0.8px', color:'#6B6B8A', marginBottom:'8px' },
  synPills: { display:'flex', flexWrap:'wrap', gap:'6px' },
  synPill: { background:'#F0EEFF', color:'#9B8FF5', fontSize:'12px', fontWeight:700, padding:'5px 13px', borderRadius:'20px', cursor:'pointer', border:'none', fontFamily:'Nunito,sans-serif' },

  saveBtn: { width:'100%', padding:'13px', border:'none', borderRadius:'14px', background:'linear-gradient(135deg,#3DD9A0,#5BC8F5)', color:'#fff', fontFamily:'Nunito,sans-serif', fontSize:'15px', fontWeight:800, cursor:'pointer', boxShadow:'0 6px 20px rgba(61,217,160,0.3)' },
  savedBtn: { background:'linear-gradient(135deg,#A8E063,#56AB2F)', boxShadow:'none' },

  emptyWrap: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 20px', textAlign:'center', gap:'10px', width:'100%' },
  emptyTitle: { fontSize:'18px', fontWeight:800, color:'#1A1A2E' },
  emptySub: { fontSize:'14px', color:'#6B6B8A', maxWidth:'220px', fontWeight:500 },

  nbStats: { background:'#F0EEFF', borderRadius:'14px', padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', flexShrink:0 },
  nbCount: { fontSize:'22px', fontWeight:900, color:'#9B8FF5' },
  nbLabel: { fontSize:'13px', color:'#6B6B8A', fontWeight:600 },
  clearBtn: { fontSize:'12px', fontWeight:700, color:'#F7896A', background:'none', border:'1.5px solid #F7896A', borderRadius:'20px', padding:'5px 12px', cursor:'pointer', fontFamily:'Nunito,sans-serif' },

  nbEntry: { background:'#fff', borderRadius:'16px', border:'1.5px solid rgba(155,143,245,0.2)', padding:'16px', display:'flex', flexDirection:'column', gap:'10px', width:'100%' },
  nbEntryHeader: { display:'flex', alignItems:'center', justifyContent:'space-between' },
  nbEntryWord: { fontSize:'20px', fontWeight:900, color:'#1A1A2E' },
  delBtn: { width:'30px', height:'30px', borderRadius:'50%', border:'none', background:'#FFF0F0', color:'#E74C3C', fontSize:'14px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Nunito,sans-serif' },
  nbDate: { fontSize:'11px', color:'#6B6B8A', fontWeight:500 },
};
