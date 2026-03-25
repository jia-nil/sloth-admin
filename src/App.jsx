import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// NEETARA — Question Bank Admin Panel
// Connects to Supabase. Replace SUPABASE_URL and SUPABASE_ANON_KEY.
// Admin users only — protected by RLS on the questions table.
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL  = "https://tlmazdrnndylafhfxsrc.supabase.co";
const SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsbWF6ZHJubmR5bGFmaGZ4c3JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1ODEwNjAsImV4cCI6MjA4ODE1NzA2MH0.gGPknDEdaGfzDb2JJ2amEY9b33jlbTY3brvbbhvvIWg";

const SUBJECTS = ["Physics","Chemistry","Mathematics"];
const TOPICS = {
  Physics:["Kinematics","Laws of Motion","Work & Energy","Rotational Motion","Gravitation",
    "Thermodynamics","Waves","Oscillations","Properties of Matter","Kinetic Theory",
    "Electrostatics","Current Electricity","Magnetism","EMI & AC","Optics",
    "Modern Physics","Semiconductors","Dual Nature","Atoms & Nuclei","Communication"],
  Chemistry:["Mole Concept","Atomic Structure","Chemical Bonding","States of Matter",
    "Thermodynamics","Equilibrium","Redox","Organic Basics","Hydrocarbons","s-Block Elements",
    "Electrochemistry","Chemical Kinetics","Solutions","Surface Chemistry","p-Block Elements",
    "d-Block Elements","Coordination Compounds","Haloalkanes","Alcohols","Amines"],
  Mathematics:["Sets & Functions","Trigonometry","Sequences & Series","Straight Lines",
    "Conic Sections","Permutations","Binomial Theorem","Limits","Statistics","Probability",
    "Matrices","Determinants","Continuity & Differentiability","Applications of Derivatives",
    "Integrals","Differential Equations","Vectors","3D Geometry","Linear Programming","Complex Numbers"],
};
const YEARS = Array.from({length:7},(_,i)=>2019+i);
const DIFFICULTIES = ["Easy","Medium","Hard"];
const WEIGHTAGES = ["H","M","L"];
const EXAMS = ["JEE Main","JEE Advanced"];

// ── Supabase client (lightweight, no SDK needed) ──────────────────────────
const sb = {
  async query(table, params = {}) {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
    if (params.select)  url.searchParams.set("select", params.select);
    if (params.filter)  Object.entries(params.filter).forEach(([k,v]) => url.searchParams.set(k, v));
    if (params.order)   url.searchParams.set("order", params.order);
    if (params.limit)   url.searchParams.set("limit",  params.limit);
    if (params.offset)  url.searchParams.set("offset", params.offset);
    const r = await fetch(url, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`,
                 "Content-Type": "application/json", "Prefer": "return=representation" }
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async insert(table, data) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`,
                 "Content-Type": "application/json", "Prefer": "return=representation" },
      body: JSON.stringify(data)
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async update(table, id, data) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "PATCH",
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`,
                 "Content-Type": "application/json", "Prefer": "return=representation" },
      body: JSON.stringify(data)
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async delete(table, id) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "DELETE",
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
    });
    if (!r.ok) throw new Error(await r.text());
    return true;
  },
};



// ── Color palette ──────────────────────────────────────────────────────────
const C = {
  bg:"#0d0d0c", sb:"#111110", card:"#161614", hover:"#1c1c1a",
  b:"rgba(255,255,255,0.07)", b2:"rgba(255,255,255,0.12)",
  t:"#f0ede8", t2:"#aaa", t3:"#666", t4:"#3a3a38",
  phys:"#e8845c", chem:"#5eaa8a", math:"#7b8ec8",
  green:"#5eaa8a", red:"#d47070", gold:"#e8c84e", blue:"#7b8ec8",
  inp:"#1a1a18",
};
const subColor = s => s==="Physics"?C.phys:s==="Chemistry"?C.chem:C.math;
const diffColor = d => d==="Easy"?C.green:d==="Hard"?C.red:C.gold;
const wColor    = w => w==="H"?C.red:w==="M"?C.gold:C.t3;

const BLANK_Q = {
  slug:"",subject:"Physics",topic:"Kinematics",subtopic:"",
  exam:"JEE Advanced",year:2024,paper:"P1",session:"",shift:"",qno:1,
  question_text:"",option_a:"",option_b:"",option_c:"",option_d:"",correct:"A",
  solution:"",concept:"",tip:"",diagram_url:"",solution_diagram_url:"",answer_type:"text",partial_marks:null,
  difficulty:"Medium",weightage:"M",question_type:"SCQ",
  marks:4,negative:-1,has_image:false,is_verified:false,is_active:true,source_note:"",
};

// ── Math renderer — proper stacked fractions via JSX ─────────────────────────
// Parses a LaTeX-subset string into tokens, renders as React elements.
// Supports: \frac{}{}, \sqrt{}, ^{}, _{}, Greek, trig inverses, operators.

function parseMath(raw) {
  // Returns array of token objects: {t:"txt"|"frac"|"sqrt"|"sup"|"sub", ...}
  const out = [];
  let i = 0;
  const BSRE = /^\\([a-zA-Z]+|\^)/;

  function readBraced(from) {
    // reads {content} starting at from, returns [content, endIndex]
    if (raw[from] !== '{') return ['', from];
    let depth = 1, j = from + 1, buf = '';
    while (j < raw.length && depth > 0) {
      if (raw[j] === '{') depth++;
      else if (raw[j] === '}') depth--;
      if (depth > 0) buf += raw[j];
      j++;
    }
    return [buf, j];
  }

  while (i < raw.length) {
    const ch = raw[i];

    // backslash command
    if (ch === '\\') {
      const m = raw.slice(i).match(BSRE);
      if (!m) { pushTxt('\\'); i++; continue; }
      const cmd = m[1];
      i += 1 + cmd.length;

      if (cmd === 'frac') {
        const [num, i2] = readBraced(i);
        const [den, i3] = readBraced(i2);
        out.push({ t: 'frac', num, den });
        i = i3; continue;
      }
      if (cmd === 'sqrt') {
        const [inner, i2] = readBraced(i);
        out.push({ t: 'sqrt', inner });
        i = i2; continue;
      }
      // trig inverses: \tan^{-1}
      if ((cmd === 'tan' || cmd === 'sin' || cmd === 'cos') && raw.slice(i, i+4) === '^{-1') {
        out.push({ t: 'txt', v: cmd + '\u207b\u00b9' }); // ⁻¹
        i += 5; continue; // skip ^{-1}
      }
      const SYMS = {
        alpha:'α',beta:'β',gamma:'γ',delta:'δ',Delta:'Δ',theta:'θ',phi:'φ',
        pi:'π',omega:'ω',Omega:'Ω',mu:'μ',lambda:'λ',sigma:'σ',epsilon:'ε',
        rho:'ρ',eta:'η',xi:'ξ',zeta:'ζ',Lambda:'Λ',Gamma:'Γ',Phi:'Φ',Psi:'Ψ',
        tau:'τ',nu:'ν',kappa:'κ',
        tan:'tan',sin:'sin',cos:'cos',log:'log',ln:'ln',
        arctan:'tan⁻¹',arcsin:'sin⁻¹',arccos:'cos⁻¹',
        rightarrow:'→',leftarrow:'←',to:'→',Rightarrow:'⇒',leftrightarrow:'↔',rightleftharpoons:'⇌',
        times:'×',cdot:'·',div:'÷',leq:'≤',geq:'≥',neq:'≠',
        approx:'≈',infty:'∞',pm:'±',mp:'∓',circ:'°',degree:'°',
        int:'∫',sum:'Σ',prod:'Π',partial:'∂',nabla:'∇',
        forall:'∀',exists:'∃',
      };
      pushTxt(SYMS[cmd] ?? '');
      continue;
    }

    // superscript  ^{...} or ^digit
    if (ch === '^') {
      if (raw[i+1] === '{') {
        const [val, i2] = readBraced(i+1);
        out.push({ t: 'sup', v: val });
        i = i2; continue;
      }
      if (/\d/.test(raw[i+1])) { out.push({ t: 'sup', v: raw[i+1] }); i+=2; continue; }
    }

    // subscript  _{...} or _digit
    if (ch === '_') {
      if (raw[i+1] === '{') {
        const [val, i2] = readBraced(i+1);
        out.push({ t: 'sub', v: val });
        i = i2; continue;
      }
      if (/\d/.test(raw[i+1])) { out.push({ t: 'sub', v: raw[i+1] }); i+=2; continue; }
    }

    pushTxt(ch); i++;
  }

  function pushTxt(c) {
    const last = out[out.length - 1];
    if (last && last.t === 'txt') last.v += c;
    else out.push({ t: 'txt', v: c });
  }

  return out;
}

function MathText({ t, style }) {
  if (!t) return null;
  const tokens = parseMath(t);
  return (
    <span style={style}>
      {tokens.map((tok, i) => {
        if (tok.t === 'txt') return <span key={i}>{tok.v}</span>;

        if (tok.t === 'sup') return (
          <sup key={i} style={{fontSize:'0.72em',lineHeight:0,verticalAlign:'super',position:'relative',top:'-0.3em'}}>
            <MathText t={tok.v}/>
          </sup>
        );

        if (tok.t === 'sub') return (
          <sub key={i} style={{fontSize:'0.72em',lineHeight:0,verticalAlign:'sub',position:'relative',bottom:'-0.2em'}}>
            <MathText t={tok.v}/>
          </sub>
        );

        if (tok.t === 'sqrt') return (
          <span key={i} style={{display:'inline-flex',alignItems:'stretch',verticalAlign:'middle',margin:'0 1px'}}>
            <span style={{fontSize:'1.2em',lineHeight:1,paddingRight:1,alignSelf:'center'}}>√</span>
            <span style={{borderTop:'1.5px solid currentColor',paddingTop:1,paddingLeft:2,paddingRight:3}}>
              <MathText t={tok.inner}/>
            </span>
          </span>
        );

        if (tok.t === 'frac') return (
          <span key={i} style={{
            display:'inline-flex',flexDirection:'column',alignItems:'center',
            verticalAlign:'middle',margin:'0 3px',lineHeight:1.15,
          }}>
            <span style={{
              borderBottom:'1.5px solid currentColor',
              paddingBottom:2,paddingLeft:4,paddingRight:4,
              whiteSpace:'nowrap',textAlign:'center',fontSize:'0.88em',
            }}>
              <MathText t={tok.num}/>
            </span>
            <span style={{
              paddingTop:2,paddingLeft:4,paddingRight:4,
              whiteSpace:'nowrap',textAlign:'center',fontSize:'0.88em',
            }}>
              <MathText t={tok.den}/>
            </span>
          </span>
        );

        return null;
      })}
    </span>
  );
}

// Plain-text fallback for non-JSX contexts (list views, etc.)
function renderMath(text) {
  if (!text) return text;
  return text
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g,'($1)/($2)')
    .replace(/\\sqrt\{([^}]+)\}/g,'√($1)').replace(/\\sqrt(?![{])/g,'√')
    .replace(/\^\{([^}]+)\}/g,(_,p)=>{const m={'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','n':'ⁿ','-':'⁻'};return p.split('').map(c=>m[c]||c).join('');})
    .replace(/\^(\d)/g,(_,d)=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[d])
    .replace(/\_\{([^}]+)\}/g,(_,s)=>{const m={'0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉'};return s.split('').map(c=>m[c]||c).join('');})
    .replace(/_(\d)/g,(_,d)=>'₀₁₂₃₄₅₆₇₈₉'[d])
    .replace(/\\arctan/g,'tan⁻¹').replace(/\\arcsin/g,'sin⁻¹').replace(/\\arccos/g,'cos⁻¹')
    .replace(/\\tan\^{-1}/g,'tan⁻¹').replace(/\\sin\^{-1}/g,'sin⁻¹').replace(/\\cos\^{-1}/g,'cos⁻¹')
    .replace(/\\alpha/g,'α').replace(/\\beta/g,'β').replace(/\\gamma/g,'γ').replace(/\\delta/g,'δ')
    .replace(/\\Delta/g,'Δ').replace(/\\theta/g,'θ').replace(/\\phi/g,'φ').replace(/\\pi/g,'π')
    .replace(/\\omega/g,'ω').replace(/\\Omega/g,'Ω').replace(/\\mu/g,'μ').replace(/\\lambda/g,'λ')
    .replace(/\\sigma/g,'σ').replace(/\\epsilon/g,'ε').replace(/\\rho/g,'ρ')
    .replace(/\\to(?![a-z])/g,'→').replace(/\\rightarrow/g,'→').replace(/\\rightleftharpoons/g,'⇌').replace(/\\times/g,'×')
    .replace(/\\leq/g,'≤').replace(/\\geq/g,'≥').replace(/\\neq/g,'≠').replace(/\\approx/g,'≈')
    .replace(/\\infty/g,'∞').replace(/\\pm/g,'±').replace(/\\cdot/g,'·')
    .replace(/\\int/g,'∫').replace(/\\sum/g,'Σ').replace(/\\partial/g,'∂')
    .replace(/\\[a-zA-Z]+/g,'');
}



const MATH_SNIPS=[
  {l:"√x",v:"\\sqrt{}"},{l:"x²",v:"^{2}"},{l:"x³",v:"^{3}"},{l:"xⁿ",v:"^{n}"},
  {l:"x₁",v:"_{1}"},{l:"½",v:"\\frac{1}{2}"},{l:"a/b",v:"\\frac{}{}"},
  {l:"tan⁻¹",v:"\\tan^{-1}"},{l:"sin⁻¹",v:"\\sin^{-1}"},{l:"cos⁻¹",v:"\\cos^{-1}"},
  {l:"π",v:"\\pi"},{l:"θ",v:"\\theta"},{l:"α",v:"\\alpha"},{l:"β",v:"\\beta"},
  {l:"Δ",v:"\\Delta"},{l:"ω",v:"\\omega"},{l:"λ",v:"\\lambda"},{l:"σ",v:"\\sigma"},
  {l:"→",v:"\\to"},{l:"±",v:"\\pm"},{l:"≤",v:"\\leq"},{l:"≥",v:"\\geq"},
  {l:"≠",v:"\\neq"},{l:"≈",v:"\\approx"},{l:"∞",v:"\\infty"},
  {l:"∫",v:"\\int"},{l:"Σ",v:"\\sum"},{l:"°",v:"°"},{l:"×",v:"\\times"},
,
  // Chemistry — ion charges
  {l:"⁺",v:"^{+}"},{l:"⁻",v:"^{-}"},{l:"²⁺",v:"^{2+}"},{l:"³⁺",v:"^{3+}"},
  {l:"²⁻",v:"^{2-}"},{l:"³⁻",v:"^{3-}"},
  // Atom notation: ^{mass}_{atomic_no}Symbol  e.g. ^{23}_{11}Na
  {l:"ᴬ↑Z↓X",v:"^{A}_{Z}X"},{l:"H₂O",v:"H_{2}O"},{l:"CO₂",v:"CO_{2}"},
  {l:"SO₄²⁻",v:"SO_{4}^{2-}"},{l:"NH₄⁺",v:"NH_{4}^{+}"},
  {l:"⇌",v:"\\rightleftharpoons"},{l:"Å",v:"Å"}
];

function MathToolbar({targetRef,value,onChange}) {
  function insert(snip) {
    const el=targetRef.current;
    if(!el){onChange(value+snip);return;}
    const s=el.selectionStart,e=el.selectionEnd;
    const nv=value.slice(0,s)+snip+value.slice(e);
    onChange(nv);
    setTimeout(()=>{
      const cur=snip.endsWith("{}")?s+snip.length-1:s+snip.length;
      el.focus();el.setSelectionRange(cur,cur);
    },0);
  }
  return(
    <div style={{display:"flex",flexWrap:"wrap",gap:3,padding:"7px 10px",
      background:"#111",borderRadius:"7px 7px 0 0",
      border:`1px solid ${C.b}`,borderBottom:"none"}}>
      {MATH_SNIPS.map(s=>(
        <button key={s.l} onClick={()=>insert(s.v)}
          style={{padding:"3px 7px",background:C.card,color:C.t,
            border:`1px solid ${C.b}`,borderRadius:4,fontSize:12.5,
            fontFamily:"serif",cursor:"pointer",lineHeight:1.4}}>
          {s.l}
        </button>
      ))}
      <span style={{fontSize:10,color:C.t4,alignSelf:"center",marginLeft:6}}>
        click to insert · renders live in preview
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function NeetaraAdmin() {
  const [view,  setView]  = useState("dashboard");   // dashboard | questions | add | edit | bulk
  const [qs,    setQs]    = useState([]);
  const [stats, setStats] = useState(null);
  const [loading,setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Filters
  const [fSub,  setFSub]  = useState("All");
  const [fTopic,setFTopic]= useState("All");
  const [fDiff, setFDiff] = useState("All");
  const [fYear, setFYear] = useState("All");
  const [fVerif,setFVerif]= useState("All");
  const [search,setSearch]= useState("");
  const [page,  setPage]  = useState(0);
  const PER_PAGE = 20;

  // Edit state
  const [editQ, setEditQ] = useState(null);
  const [form,  setForm]  = useState({...BLANK_Q});
  const [saving,setSaving]= useState(false);

  // Bulk import
  const [bulkJson,setBulkJson]=useState("");
  const [bulkResult,setBulkResult]=useState(null);

  // Math input refs — used by MathToolbar to insert at cursor
  const qTextRef = useRef(null);
  const optARef  = useRef(null);
  const optBRef  = useRef(null);
  const optCRef  = useRef(null);
  const optDRef  = useRef(null);
  const solRef   = useRef(null);

  function showToast(msg, type="success") {
    setToast({msg,type});
    setTimeout(()=>setToast(null), 3500);
  }

  // ── Load questions ────────────────────────────────────────────────────────
  async function loadQs() {
    setLoading(true);
    try {
      const filter = {};
      if (fSub  !== "All") filter["subject=eq."]  = fSub;
      if (fTopic!== "All") filter["topic=eq."]    = fTopic;
      if (fDiff !== "All") filter["difficulty=eq."]= fDiff;
      if (fYear !== "All") filter["year=eq."]     = fYear;
      if (fVerif!== "All") filter["is_verified=eq."] = fVerif==="Verified"?"true":"false";
      const data = await sb.query("questions", {
        select: "*",
        filter,
        order: "created_at.desc",
        limit: PER_PAGE,
        offset: page * PER_PAGE,
      });
      setQs(data);
    } catch(e) { showToast(e.message, "error"); }
    setLoading(false);
  }

  async function loadStats() {
    try {
      const all = await sb.query("questions", { select:"subject,year,difficulty,is_verified,is_active", filter:{"is_active=eq.":"true"} });
      const s = { total:all.length, verified:all.filter(q=>q.is_verified).length,
        bySubject:{}, byYear:{}, byDifficulty:{} };
      all.forEach(q => {
        s.bySubject[q.subject] = (s.bySubject[q.subject]||0)+1;
        s.byYear[q.year]       = (s.byYear[q.year]||0)+1;
        s.byDifficulty[q.difficulty] = (s.byDifficulty[q.difficulty]||0)+1;
      });
      setStats(s);
    } catch(e) { console.error(e); }
  }

  useEffect(() => { loadQs(); }, [fSub,fTopic,fDiff,fYear,fVerif,page]);
  useEffect(() => { loadStats(); }, []);

  // ── Save question ─────────────────────────────────────────────────────────
  async function saveQ() {
    const isNumerical = form.question_type==="Integer"||form.question_type==="Decimal";
    const required = isNumerical
      ? ["subject","topic","question_text","correct","solution"]
      : ["subject","topic","question_text","option_a","option_b","option_c","option_d","correct","solution"];
    const missing  = required.filter(k=>!form[k]?.toString().trim());
    if (missing.length) { showToast("Fill in: "+missing.join(", "),"error"); return; }
    setSaving(true);
    try {
      if (editQ) {
        await sb.update("questions", editQ.id, form);
        showToast("Question updated ✓");
      } else {
        await sb.insert("questions", form);
        showToast("Question added ✓");
      }
      setEditQ(null);
      setForm({...BLANK_Q});
      setView("questions");
      loadQs();
      loadStats();
    } catch(e) { showToast(e.message,"error"); }
    setSaving(false);
  }

  async function toggleVerify(q) {
    try {
      await sb.update("questions", q.id, {is_verified:!q.is_verified});
      setQs(prev=>prev.map(x=>x.id===q.id?{...x,is_verified:!x.is_verified}:x));
      showToast(!q.is_verified?"Marked as verified ✓":"Moved to unverified");
      loadStats();
    } catch(e) { showToast(e.message,"error"); }
  }

  async function toggleActive(q) {
    try {
      await sb.update("questions", q.id, {is_active:!q.is_active});
      setQs(prev=>prev.map(x=>x.id===q.id?{...x,is_active:!x.is_active}:x));
      showToast(!q.is_active?"Question activated":"Question hidden");
      loadStats();
    } catch(e) { showToast(e.message,"error"); }
  }

  function startEdit(q) {
    setEditQ(q);
    setForm({...q});
    setView("add");
  }

  function startAdd() {
    setEditQ(null);
    setForm({...BLANK_Q});
    setView("add");
  }

  // ── Bulk import ───────────────────────────────────────────────────────────
  async function runBulkImport() {
    let parsed;
    try { parsed = JSON.parse(bulkJson); }
    catch(e) { showToast("Invalid JSON","error"); return; }
    if (!Array.isArray(parsed)) { showToast("Must be a JSON array","error"); return; }
    setSaving(true);
    const results = {ok:0, fail:0, errors:[]};
    for (const q of parsed) {
      try {
        await sb.insert("questions", q); results.ok++;
      } catch(e) { results.fail++; results.errors.push(q.slug||"?"+": "+e.message); }
    }
    setBulkResult(results);
    setSaving(false);
    if (results.ok) { loadStats(); loadQs(); }
  }

  // ── Filtered display ─────────────────────────────────────────────────────
  const displayed = qs.filter(q => {
    if (search) {
      const s = search.toLowerCase();
      if (!q.question_text?.toLowerCase().includes(s) &&
          !q.topic?.toLowerCase().includes(s) &&
          !q.slug?.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.t,fontFamily:"'DM Mono',monospace,sans-serif",display:"flex"}}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:${C.bg};}
        ::-webkit-scrollbar-thumb{background:${C.t4};border-radius:3px;}
        input,textarea,select{background:${C.inp};border:1px solid ${C.b};color:${C.t};
          border-radius:7px;padding:9px 12px;font-family:inherit;font-size:13px;width:100%;outline:none;transition:border .15s;}
        input:focus,textarea:focus,select:focus{border-color:${C.b2};}
        textarea{resize:vertical;min-height:80px;line-height:1.6;}
        button{cursor:pointer;font-family:inherit;border:none;outline:none;transition:all .12s;}
        label{display:block;font-size:11px;color:${C.t3};margin-bottom:5px;letter-spacing:.06em;text-transform:uppercase;}
        .badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:20px;font-size:10.5px;font-weight:600;letter-spacing:.02em;}
        @keyframes fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        .row{display:flex;align-items:center;gap:8px;}
        .rowb{display:flex;align-items:center;justify-content:space-between;gap:8px;}
        .g2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
        .g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;}
        .g4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;}
        .field{margin-bottom:14px;}
        .shim{height:16px;background:${C.hover};border-radius:6px;animation:pulse 1.2s infinite;}
        @keyframes pulse{0%,100%{opacity:.3}50%{opacity:.6}}
      `}</style>

      {/* ── Sidebar ── */}
      <aside style={{width:220,background:C.sb,borderRight:`1px solid ${C.b}`,display:"flex",flexDirection:"column",padding:"24px 0",flexShrink:0,position:"sticky",top:0,height:"100vh"}}>
        <div style={{padding:"0 20px 24px",borderBottom:`1px solid ${C.b}`}}>
          <div style={{fontSize:17,fontWeight:700,letterSpacing:"-.02em",color:C.t}}>Neetara</div>
          <div style={{fontSize:11,color:C.t3,marginTop:2}}>Admin Panel</div>
        </div>
        <nav style={{padding:"12px 10px",flex:1}}>
          {[
            {id:"dashboard",icon:"⌂",label:"Dashboard"},
            {id:"questions",icon:"◈",label:"All Questions"},
            {id:"add",icon:"+",label:"Add Question"},
            {id:"bulk",icon:"⇪",label:"Bulk Import"},
          ].map(item=>(
            <div key={item.id} onClick={()=>{if(item.id==="add")startAdd();else setView(item.id);}}
              style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:8,marginBottom:2,
                background:view===item.id?C.hover:"transparent",color:view===item.id?C.t:C.t2,
                cursor:"pointer",fontSize:13,transition:"all .1s"}}>
              <span style={{fontSize:14,width:16,textAlign:"center"}}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </nav>
        {stats&&(
          <div style={{padding:"16px 16px 0",borderTop:`1px solid ${C.b}`}}>
            <div style={{fontSize:10,color:C.t4,marginBottom:10,letterSpacing:".07em",textTransform:"uppercase"}}>Bank status</div>
            {SUBJECTS.map(sub=>(
              <div key={sub} style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:11,color:subColor(sub)}}>{sub.slice(0,4)}</span>
                <span style={{fontSize:11,color:C.t2}}>{stats.bySubject[sub]||0} Q</span>
              </div>
            ))}
            <div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${C.b}`,display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:11,color:C.t3}}>Total</span>
              <span style={{fontSize:11,fontWeight:600,color:C.t}}>{stats.total}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
              <span style={{fontSize:11,color:C.t3}}>Verified</span>
              <span style={{fontSize:11,color:C.green}}>{stats.verified}</span>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main ── */}
      <main style={{flex:1,padding:"28px 32px",maxWidth:1200,overflowY:"auto"}}>

        {/* Toast */}
        {toast&&(
          <div style={{position:"fixed",top:20,right:24,zIndex:999,padding:"11px 18px",borderRadius:10,
            background:toast.type==="error"?`${C.red}ee`:`${C.green}ee`,color:"#fff",fontSize:13,fontWeight:500,
            boxShadow:"0 4px 20px rgba(0,0,0,.4)",animation:"fade .2s ease"}}>
            {toast.msg}
          </div>
        )}

        {/* ── DASHBOARD ── */}
        {view==="dashboard"&&(
          <div style={{animation:"fade .2s ease"}}>
            <div style={{marginBottom:24}}>
              <div style={{fontSize:22,fontWeight:700,letterSpacing:"-.03em",marginBottom:4}}>Question Bank</div>
              <div style={{fontSize:13,color:C.t3}}>Manage, verify and expand your JEE question database.</div>
            </div>

            {/* Stat cards */}
            {stats?(
              <div className="g4" style={{marginBottom:24}}>
                {[
                  {label:"Total Questions",  val:stats.total,    color:C.blue},
                  {label:"Verified",         val:stats.verified, color:C.green},
                  {label:"Unverified",       val:stats.total-stats.verified, color:C.gold},
                  {label:"Physics",          val:stats.bySubject["Physics"]||0, color:C.phys},
                ].map(s=>(
                  <div key={s.label} style={{background:C.card,border:`1px solid ${C.b}`,borderRadius:12,padding:"16px 18px"}}>
                    <div style={{fontSize:10,color:C.t3,letterSpacing:".07em",textTransform:"uppercase",marginBottom:8}}>{s.label}</div>
                    <div style={{fontSize:28,fontWeight:700,color:s.color,letterSpacing:"-.03em"}}>{s.val}</div>
                  </div>
                ))}
              </div>
            ):(
              <div className="g4" style={{marginBottom:24}}>
                {[0,1,2,3].map(i=><div key={i} className="shim" style={{height:80,borderRadius:12}}/>)}
              </div>
            )}

            {/* Subject breakdown */}
            {stats&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:24}}>
                <div style={{background:C.card,border:`1px solid ${C.b}`,borderRadius:12,padding:"18px 20px"}}>
                  <div style={{fontSize:12,fontWeight:600,marginBottom:14,color:C.t2}}>By Subject</div>
                  {SUBJECTS.map(sub=>{
                    const count=stats.bySubject[sub]||0;
                    const pct=stats.total?Math.round((count/stats.total)*100):0;
                    return(
                      <div key={sub} style={{marginBottom:12}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                          <span style={{fontSize:12,color:subColor(sub)}}>{sub}</span>
                          <span style={{fontSize:11,color:C.t3}}>{count} ({pct}%)</span>
                        </div>
                        <div style={{height:4,background:C.hover,borderRadius:4}}>
                          <div style={{height:"100%",width:`${pct}%`,background:subColor(sub),borderRadius:4,transition:"width .4s"}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{background:C.card,border:`1px solid ${C.b}`,borderRadius:12,padding:"18px 20px"}}>
                  <div style={{fontSize:12,fontWeight:600,marginBottom:14,color:C.t2}}>By Difficulty</div>
                  {DIFFICULTIES.map(diff=>{
                    const count=stats.byDifficulty[diff]||0;
                    const pct=stats.total?Math.round((count/stats.total)*100):0;
                    return(
                      <div key={diff} style={{marginBottom:12}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                          <span style={{fontSize:12,color:diffColor(diff)}}>{diff}</span>
                          <span style={{fontSize:11,color:C.t3}}>{count} ({pct}%)</span>
                        </div>
                        <div style={{height:4,background:C.hover,borderRadius:4}}>
                          <div style={{height:"100%",width:`${pct}%`,background:diffColor(diff),borderRadius:4,transition:"width .4s"}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div style={{display:"flex",gap:10}}>
              <button onClick={startAdd} style={{padding:"10px 20px",background:C.green,color:"#fff",borderRadius:9,fontSize:13,fontWeight:600}}>
                + Add Question
              </button>
              <button onClick={()=>setView("questions")} style={{padding:"10px 20px",background:C.card,color:C.t2,border:`1px solid ${C.b}`,borderRadius:9,fontSize:13}}>
                View All →
              </button>
              <button onClick={()=>setView("bulk")} style={{padding:"10px 20px",background:C.card,color:C.t2,border:`1px solid ${C.b}`,borderRadius:9,fontSize:13}}>
                Bulk Import ⇪
              </button>
            </div>
          </div>
        )}

        {/* ── QUESTIONS LIST ── */}
        {view==="questions"&&(
          <div style={{animation:"fade .2s ease"}}>
            <div className="rowb" style={{marginBottom:20}}>
              <div>
                <div style={{fontSize:20,fontWeight:700,letterSpacing:"-.02em"}}>All Questions</div>
                <div style={{fontSize:12,color:C.t3,marginTop:2}}>{qs.length} loaded</div>
              </div>
              <button onClick={startAdd} style={{padding:"9px 18px",background:C.green,color:"#fff",borderRadius:9,fontSize:13,fontWeight:600}}>
                + Add
              </button>
            </div>

            {/* Filters */}
            <div style={{background:C.card,border:`1px solid ${C.b}`,borderRadius:11,padding:"14px 16px",marginBottom:16,display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
              <div style={{flex:"1 1 140px"}}>
                <label>Subject</label>
                <select value={fSub} onChange={e=>setFSub(e.target.value)}>
                  <option>All</option>
                  {SUBJECTS.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div style={{flex:"1 1 140px"}}>
                <label>Topic</label>
                <select value={fTopic} onChange={e=>setFTopic(e.target.value)}>
                  <option>All</option>
                  {(TOPICS[fSub]||[...new Set(Object.values(TOPICS).flat())]).map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div style={{flex:"1 1 110px"}}>
                <label>Difficulty</label>
                <select value={fDiff} onChange={e=>setFDiff(e.target.value)}>
                  <option>All</option>
                  {DIFFICULTIES.map(d=><option key={d}>{d}</option>)}
                </select>
              </div>
              <div style={{flex:"1 1 100px"}}>
                <label>Year</label>
                <select value={fYear} onChange={e=>setFYear(e.target.value)}>
                  <option>All</option>
                  {YEARS.map(y=><option key={y}>{y}</option>)}
                </select>
              </div>
              <div style={{flex:"1 1 120px"}}>
                <label>Status</label>
                <select value={fVerif} onChange={e=>setFVerif(e.target.value)}>
                  <option>All</option>
                  <option>Verified</option>
                  <option>Unverified</option>
                </select>
              </div>
              <div style={{flex:"2 1 200px"}}>
                <label>Search</label>
                <input placeholder="Question text, topic, slug…" value={search} onChange={e=>setSearch(e.target.value)}/>
              </div>
            </div>

            {/* Table */}
            {loading?(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {[0,1,2,3,4].map(i=><div key={i} className="shim" style={{height:52,borderRadius:9}}/>)}
              </div>
            ):(
              <div style={{background:C.card,border:`1px solid ${C.b}`,borderRadius:11,overflow:"hidden"}}>
                {/* Header */}
                <div style={{display:"grid",gridTemplateColumns:"80px 1fr 110px 80px 60px 70px 70px 110px",
                  padding:"10px 16px",borderBottom:`1px solid ${C.b}`,fontSize:10,color:C.t4,letterSpacing:".07em",textTransform:"uppercase"}}>
                  <span>Slug</span><span>Question</span><span>Subject/Topic</span>
                  <span>Year</span><span>Diff</span><span>Weight</span><span>Status</span><span>Actions</span>
                </div>
                {displayed.length===0&&(
                  <div style={{padding:"40px",textAlign:"center",color:C.t3,fontSize:13}}>No questions match your filters.</div>
                )}
                {displayed.map((q,i)=>(
                  <div key={q.id} style={{display:"grid",gridTemplateColumns:"80px 1fr 110px 80px 60px 70px 70px 110px",
                    padding:"11px 16px",borderBottom:i<displayed.length-1?`1px solid ${C.b}`:"none",
                    background:i%2===0?"transparent":C.hover,alignItems:"center",gap:8,fontSize:12}}>
                    <span style={{color:C.t3,fontFamily:"monospace",fontSize:11}}>{q.slug||"—"}</span>
                    <span style={{color:C.t,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",paddingRight:12,fontSize:12.5}}>
                      {q.question_text?.slice(0,80)}{q.question_text?.length>80?"…":""}
                    </span>
                    <div>
                      <div style={{color:subColor(q.subject),fontSize:11,fontWeight:600}}>{q.subject?.slice(0,4)}</div>
                      <div style={{color:C.t3,fontSize:10,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{q.topic}</div>
                    </div>
                    <span style={{color:C.t2}}>{q.year}</span>
                    <span><span className="badge" style={{background:`${diffColor(q.difficulty)}18`,color:diffColor(q.difficulty)}}>{q.difficulty?.[0]}</span></span>
                    <span><span className="badge" style={{background:`${wColor(q.weightage)}18`,color:wColor(q.weightage)}}>{q.weightage||"M"}</span></span>
                    <div style={{display:"flex",flexDirection:"column",gap:3}}>
                      <span className="badge" style={{background:q.is_verified?`${C.green}18`:`${C.gold}18`,color:q.is_verified?C.green:C.gold}}>
                        {q.is_verified?"✓ Live":"⏳ Pending"}
                      </span>
                      {!q.is_active&&<span className="badge" style={{background:`${C.red}15`,color:C.red}}>Hidden</span>}
                    </div>
                    <div style={{display:"flex",gap:5}}>
                      <button onClick={()=>startEdit(q)}
                        style={{padding:"4px 10px",background:C.hover,color:C.t2,border:`1px solid ${C.b}`,borderRadius:6,fontSize:11}}>
                        Edit
                      </button>
                      <button onClick={()=>toggleVerify(q)}
                        style={{padding:"4px 8px",background:q.is_verified?`${C.gold}18`:`${C.green}18`,
                          color:q.is_verified?C.gold:C.green,border:"none",borderRadius:6,fontSize:11,fontWeight:600}}
                        title={q.is_verified?"Unverify":"Mark as verified"}>
                        {q.is_verified?"✕":"✓"}
                      </button>
                      <button onClick={()=>toggleActive(q)}
                        style={{padding:"4px 8px",background:`${C.t4}20`,color:C.t3,border:"none",borderRadius:6,fontSize:11}}
                        title={q.is_active?"Hide question":"Show question"}>
                        {q.is_active?"⊘":"⊕"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            <div style={{display:"flex",gap:8,marginTop:16,alignItems:"center"}}>
                <button disabled={page===0} onClick={()=>setPage(p=>p-1)}
                  style={{padding:"7px 14px",background:C.card,color:page===0?C.t4:C.t,border:`1px solid ${C.b}`,borderRadius:7,fontSize:12,opacity:page===0?.4:1}}>
                  ← Prev
                </button>
                <span style={{fontSize:12,color:C.t3}}>Page {page+1}</span>
                <button disabled={qs.length<PER_PAGE} onClick={()=>setPage(p=>p+1)}
                  style={{padding:"7px 14px",background:C.card,color:qs.length<PER_PAGE?C.t4:C.t,border:`1px solid ${C.b}`,borderRadius:7,fontSize:12,opacity:qs.length<PER_PAGE?.4:1}}>
                  Next →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── ADD / EDIT FORM ── */}
        {view==="add"&&(
          <div style={{animation:"fade .2s ease",maxWidth:860}}>
            <div className="rowb" style={{marginBottom:22}}>
              <div>
                <div style={{fontSize:20,fontWeight:700,letterSpacing:"-.02em"}}>{editQ?"Edit Question":"Add Question"}</div>
                {editQ&&<div style={{fontSize:11,color:C.t3,marginTop:2,fontFamily:"monospace"}}>{editQ.id}</div>}
              </div>
              <button onClick={()=>setView("questions")} style={{padding:"7px 14px",background:C.card,color:C.t3,border:`1px solid ${C.b}`,borderRadius:8,fontSize:12}}>
                ← Back
              </button>
            </div>

            {/* ── Section: Identity ── */}
            <Section title="Identity">
              <div className="g4">
                <Field label="Slug (unique ID)">
                  <input placeholder="P042" value={form.slug} onChange={e=>setForm(f=>({...f,slug:e.target.value}))}/>
                </Field>
                <Field label="Subject">
                  <select value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value,topic:""}))}>
                    {SUBJECTS.map(s=><option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Topic">
                  <select value={form.topic} onChange={e=>setForm(f=>({...f,topic:e.target.value}))}>
                    {(TOPICS[form.subject]||[]).map(t=><option key={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Subtopic (optional)">
                  <input placeholder="e.g. Projectile Motion" value={form.subtopic||""} onChange={e=>setForm(f=>({...f,subtopic:e.target.value}))}/>
                </Field>
              </div>
            </Section>

            {/* ── Section: Source ── */}
            <Section title="Source">
              <div className="g4">
                <Field label="Exam">
                  <select value={form.exam} onChange={e=>setForm(f=>({...f,exam:e.target.value}))}>
                    {EXAMS.map(e=><option key={e}>{e}</option>)}
                  </select>
                </Field>
                <Field label="Year">
                  <select value={form.year} onChange={e=>setForm(f=>({...f,year:parseInt(e.target.value)}))}>
                    {YEARS.map(y=><option key={y}>{y}</option>)}
                  </select>
                </Field>
                <Field label="Session (leave blank for JEE Advanced)">
                  <input placeholder="leave blank for JEE Advanced" value={form.session||""} onChange={e=>setForm(f=>({...f,session:e.target.value}))}/>
                </Field>
                <Field label="Paper (Morning = P1, Evening = P2)">
                  <input placeholder="Morning (P1) / Evening (P2)" value={form.shift||""} onChange={e=>setForm(f=>({...f,shift:e.target.value}))}/>
                </Field>
                <Field label="Question No. (qno)">
                  <input type="number" min="1" max="54" placeholder="e.g. 1"
                    value={form.qno||""}
                    onChange={e=>setForm(f=>({...f,qno:parseInt(e.target.value)||1}))}/>
                </Field>
              </div>
              <Field label="Source Note">
                <input placeholder="e.g. Reconstructed from 2019 Jan S1 Shift 1" value={form.source_note||""} onChange={e=>setForm(f=>({...f,source_note:e.target.value}))}/>
              </Field>
            </Section>

            {/* ── Section: Question ── */}
            <Section title="Question">
              <Field label="Question text *">
                <MathToolbar targetRef={qTextRef} value={form.question_text} onChange={v=>setForm(f=>({...f,question_text:v}))}/>
                <textarea ref={qTextRef} rows={5}
                  placeholder={"Type question here. Use math toolbar above or type directly:\n\\sqrt{2}, x^{2}, \\frac{a}{b}, \\tan^{-1}, \\pi, \\theta..."}
                  value={form.question_text}
                  onChange={e=>setForm(f=>({...f,question_text:e.target.value}))}
                  style={{borderRadius:"0 0 7px 7px"}}/>
              </Field>
              <Field label="Diagram URL (optional)">
                <input placeholder="https://xyz.supabase.co/storage/v1/object/public/diagrams/adv-2024-p1-ph-001.png"
                  value={form.diagram_url||""}
                  onChange={e=>setForm(f=>({...f,diagram_url:e.target.value}))}/>
                {form.diagram_url&&(
                  <div style={{marginTop:8,padding:10,background:C.hover,borderRadius:7,textAlign:"center"}}>
                    <img src={form.diagram_url} alt="diagram" style={{maxWidth:"100%",maxHeight:220,objectFit:"contain",borderRadius:4}}
                      onError={e=>{e.target.style.display="none";e.target.nextSibling.style.display="block";}}/>
                    <div style={{display:"none",fontSize:11,color:C.red,marginTop:4}}>⚠ Image failed to load — check URL</div>
                  </div>
                )}
              </Field>
              {/* ── Question Type selector ── */}
              <div style={{marginBottom:16}}>
                <label>Question Type *</label>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {[
                    {v:"SCQ", l:"Single Correct",  hint:"+3 / −1"},
                    {v:"MSQ", l:"Multiple Correct", hint:"+4 / −2"},
                    {v:"Integer", l:"Integer",      hint:"+4 / 0"},
                    {v:"Decimal", l:"Decimal",      hint:"+4 / 0"},
                  ].map(t=>(
                    <button key={t.v}
                      onClick={()=>setForm(f=>({...f,question_type:t.v,correct:"",
                        // clear options for numerical types
                        ...(t.v==="Integer"||t.v==="Decimal"?{option_a:"",option_b:"",option_c:"",option_d:""}:{})
                      }))}
                      style={{padding:"8px 14px",borderRadius:7,fontSize:12,
                        fontWeight:form.question_type===t.v?700:400,
                        background:form.question_type===t.v?`${C.gold}22`:C.hover,
                        color:form.question_type===t.v?C.gold:C.t3,
                        border:`1.5px solid ${form.question_type===t.v?C.gold:C.b}`}}>
                      {t.l}
                      <span style={{fontSize:10,marginLeft:6,opacity:.7}}>{t.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Answer Type (text vs image options) — only for MCQ types ── */}
              {(form.question_type==="SCQ"||form.question_type==="MSQ")&&(
                <div style={{marginBottom:14}}>
                  <label>Option Format</label>
                  <div style={{display:"flex",gap:8}}>
                    {[{v:"text",l:"Text / Math"},{v:"image",l:"Diagram Images"}].map(t=>(
                      <button key={t.v} onClick={()=>setForm(f=>({...f,answer_type:t.v}))}
                        style={{padding:"7px 16px",borderRadius:7,fontSize:12,fontWeight:form.answer_type===t.v?700:400,
                          background:form.answer_type===t.v?`${C.blue}22`:C.hover,
                          color:form.answer_type===t.v?C.blue:C.t3,
                          border:`1.5px solid ${form.answer_type===t.v?C.blue:C.b}`}}>
                        {t.l}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Options (hidden for Integer/Decimal) ── */}
              {(form.question_type==="SCQ"||form.question_type==="MSQ")&&(
                form.answer_type==="image"?(
                  <div className="g2">
                    {["a","b","c","d"].map(opt=>(
                      <Field key={opt} label={`Option ${opt.toUpperCase()} — Image URL *`}>
                        <input value={form[`option_${opt}`]}
                          onChange={e=>setForm(f=>({...f,[`option_${opt}`]:e.target.value}))}
                          placeholder={`https://...supabase.co/.../option-${opt}.png`}/>
                        {form[`option_${opt}`]&&(
                          <div style={{marginTop:6,textAlign:"center",padding:8,background:C.hover,borderRadius:6}}>
                            <img src={form[`option_${opt}`]} alt={`Option ${opt.toUpperCase()}`}
                              style={{maxWidth:"100%",maxHeight:120,objectFit:"contain",borderRadius:4}}
                              onError={e=>{e.target.style.display="none";e.target.nextSibling.style.display="block";}}/>
                            <div style={{display:"none",fontSize:10,color:C.red}}>⚠ image failed</div>
                          </div>
                        )}
                      </Field>
                    ))}
                  </div>
                ):(
                  <div className="g2">
                    <Field label="Option A *">
                      <MathToolbar targetRef={optARef} value={form.option_a} onChange={v=>setForm(f=>({...f,option_a:v}))}/>
                      <input ref={optARef} value={form.option_a} onChange={e=>setForm(f=>({...f,option_a:e.target.value}))} style={{borderRadius:"0 0 7px 7px"}}/>
                    </Field>
                    <Field label="Option B *">
                      <MathToolbar targetRef={optBRef} value={form.option_b} onChange={v=>setForm(f=>({...f,option_b:v}))}/>
                      <input ref={optBRef} value={form.option_b} onChange={e=>setForm(f=>({...f,option_b:e.target.value}))} style={{borderRadius:"0 0 7px 7px"}}/>
                    </Field>
                    <Field label="Option C *">
                      <MathToolbar targetRef={optCRef} value={form.option_c} onChange={v=>setForm(f=>({...f,option_c:v}))}/>
                      <input ref={optCRef} value={form.option_c} onChange={e=>setForm(f=>({...f,option_c:e.target.value}))} style={{borderRadius:"0 0 7px 7px"}}/>
                    </Field>
                    <Field label="Option D *">
                      <MathToolbar targetRef={optDRef} value={form.option_d} onChange={v=>setForm(f=>({...f,option_d:v}))}/>
                      <input ref={optDRef} value={form.option_d} onChange={e=>setForm(f=>({...f,option_d:e.target.value}))} style={{borderRadius:"0 0 7px 7px"}}/>
                    </Field>
                  </div>
                )
              )}

              {/* ── Correct Answer — changes based on question type ── */}
              <Field label="Correct Answer *">
                {form.question_type==="Integer"?(
                  <div>
                    <input type="number" step="1"
                      placeholder="Enter the integer answer (e.g. 7)"
                      value={form.correct}
                      onChange={e=>setForm(f=>({...f,correct:e.target.value}))}
                      style={{fontFamily:"monospace",fontSize:15,fontWeight:700}}/>
                    <div style={{fontSize:11,color:C.t3,marginTop:5}}>Integer only. +4 marks, no negative marking.</div>
                  </div>
                ):form.question_type==="Decimal"?(
                  <div>
                    <input type="number" step="0.01"
                      placeholder="Enter decimal answer (e.g. 3.14)"
                      value={form.correct}
                      onChange={e=>setForm(f=>({...f,correct:e.target.value}))}
                      style={{fontFamily:"monospace",fontSize:15,fontWeight:700}}/>
                    <div style={{fontSize:11,color:C.t3,marginTop:5}}>Decimal. +4 marks, no negative marking.</div>
                  </div>
                ):form.question_type==="MSQ"?(
                  <div>
                    <div style={{display:"flex",gap:8,marginBottom:8}}>
                      {["A","B","C","D"].map(opt=>{
                        const selected=(form.correct||"").includes(opt);
                        return(
                          <button key={opt}
                            onClick={()=>{
                              const cur=(form.correct||"").split("").filter(Boolean);
                              const next=selected?cur.filter(x=>x!==opt):[...cur,opt].sort();
                              setForm(f=>({...f,correct:next.join("")}));
                            }}
                            style={{flex:1,padding:"10px",borderRadius:8,fontWeight:700,fontSize:14,
                              background:selected?`${C.green}22`:C.hover,
                              color:selected?C.green:C.t3,
                              border:`2px solid ${selected?C.green:C.b}`}}>
                            {opt}{selected?" ✓":""}
                          </button>
                        );
                      })}
                    </div>
                    {form.correct&&<div style={{fontSize:12,color:C.green,fontWeight:700,marginBottom:12}}>Correct options: {form.correct}</div>}
                    {/* Partial marks scheme */}
                    {form.correct&&form.correct.length>0&&(()=>{
                      const n=form.correct.length;
                      const pm=form.partial_marks||{};
                      return(
                        <div style={{background:C.card,border:`1px solid ${C.b}`,borderRadius:8,padding:"12px 14px"}}>
                          <div style={{fontSize:11,color:C.t3,marginBottom:10,letterSpacing:".05em",textTransform:"uppercase"}}>
                            Partial marks scheme — if student selects exactly k correct options (no wrong ones)
                          </div>
                          <div style={{display:"flex",flexDirection:"column",gap:7}}>
                            {Array.from({length:n},(_,i)=>i+1).map(k=>(
                              <div key={k} style={{display:"flex",alignItems:"center",gap:12}}>
                                <span style={{fontSize:12,color:C.t2,width:180,flexShrink:0}}>
                                  {k===n
                                    ? `All ${n} correct selected`
                                    : `${k} of ${n} correct selected`}
                                </span>
                                <input type="number" step="1" min="0" max="4"
                                  value={pm[k]??( k===n?4:k )}
                                  onChange={e=>setForm(f=>({...f,
                                    partial_marks:{...(f.partial_marks||{}),[k]:parseInt(e.target.value)||0}
                                  }))}
                                  style={{width:60,fontFamily:"monospace",fontWeight:700,
                                    fontSize:14,textAlign:"center",color:C.green}}/>
                                <span style={{fontSize:11,color:C.t3}}>marks</span>
                              </div>
                            ))}
                            <div style={{display:"flex",alignItems:"center",gap:12,borderTop:`1px solid ${C.b}`,paddingTop:8,marginTop:2}}>
                              <span style={{fontSize:12,color:C.red,width:180,flexShrink:0}}>Any wrong option selected</span>
                              <span style={{fontFamily:"monospace",fontWeight:700,fontSize:14,color:C.red}}>−2</span>
                              <span style={{fontSize:11,color:C.t3}}>marks (fixed)</span>
                            </div>
                          </div>
                          <div style={{fontSize:10,color:C.t4,marginTop:10}}>
                            Default: 1 correct=1mk, 2=2mk… all correct=4mk. Edit if different.
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ):(
                  /* SCQ */
                  <div style={{display:"flex",gap:8}}>
                    {["A","B","C","D"].map(opt=>(
                      <button key={opt} onClick={()=>setForm(f=>({...f,correct:opt}))}
                        style={{flex:1,padding:"10px",borderRadius:8,fontWeight:700,fontSize:14,
                          background:form.correct===opt?`${C.green}22`:C.hover,
                          color:form.correct===opt?C.green:C.t3,
                          border:`1.5px solid ${form.correct===opt?C.green:C.b}`}}>
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </Field>
            </Section>

            {/* ── Section: Solution ── */}
            <Section title="Solution">
              <Field label="Step-by-step solution *">
                <MathToolbar targetRef={solRef} value={form.solution} onChange={v=>setForm(f=>({...f,solution:v}))}/>
                <textarea ref={solRef} rows={7}
                  placeholder={"Write solution step by step.\nUse math: x^{3}, \\frac{a}{b}, \\sqrt{2}, \\alpha, Fe^{3+}, ^{56}_{26}Fe\n\nLine 1: Setup\nLine 2: Substitute\nLine 3: Solve"}
                  value={form.solution}
                  onChange={e=>setForm(f=>({...f,solution:e.target.value}))}
                  style={{borderRadius:"0 0 7px 7px",minHeight:140}}/>
              </Field>
              {/* Solution preview */}
              {form.solution&&(
                <div style={{background:C.hover,borderRadius:8,padding:"12px 14px",marginBottom:14}}>
                  <div style={{fontSize:10,color:C.t4,marginBottom:8,letterSpacing:".06em",textTransform:"uppercase"}}>Solution preview</div>
                  <div style={{fontSize:13,lineHeight:2,color:C.t,whiteSpace:"pre-wrap",fontFamily:"serif"}}>
                    {form.solution.split("\n").map((line,i)=>(
                      <div key={i}><MathText t={line}/></div>
                    ))}
                  </div>
                </div>
              )}
              <Field label="Solution diagram URL (optional)">
                <input
                  placeholder="https://...supabase.co/.../solution-diagram.png"
                  value={form.solution_diagram_url||""}
                  onChange={e=>setForm(f=>({...f,solution_diagram_url:e.target.value}))}/>
                {form.solution_diagram_url&&(
                  <div style={{marginTop:8,padding:10,background:C.hover,borderRadius:7,textAlign:"center"}}>
                    <img src={form.solution_diagram_url} alt="solution diagram"
                      style={{maxWidth:"100%",maxHeight:260,objectFit:"contain",borderRadius:4}}
                      onError={e=>{e.target.style.display="none";e.target.nextSibling.style.display="block";}}/>
                    <div style={{display:"none",fontSize:11,color:C.red,marginTop:4}}>⚠ Image failed to load — check URL</div>
                  </div>
                )}
              </Field>
              <div className="g2">
                <Field label="Key concept">
                  <input placeholder="e.g. Differentiation to find acceleration" value={form.concept||""} onChange={e=>setForm(f=>({...f,concept:e.target.value}))}/>
                </Field>
                <Field label="Exam strategy tip">
                  <input placeholder="e.g. Always differentiate position twice…" value={form.tip||""} onChange={e=>setForm(f=>({...f,tip:e.target.value}))}/>
                </Field>
              </div>
            </Section>

            {/* ── Section: Metadata ── */}
            <Section title="Metadata">
              <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
                <div style={{flex:"1 1 120px"}}>
                  <label>Difficulty *</label>
                  <div style={{display:"flex",gap:6}}>
                    {DIFFICULTIES.map(d=>(
                      <button key={d} onClick={()=>setForm(f=>({...f,difficulty:d}))}
                        style={{flex:1,padding:"8px 4px",borderRadius:7,fontSize:12,fontWeight:form.difficulty===d?700:400,
                          background:form.difficulty===d?`${diffColor(d)}18`:C.hover,
                          color:form.difficulty===d?diffColor(d):C.t3,border:`1.5px solid ${form.difficulty===d?diffColor(d):C.b}`}}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{flex:"1 1 100px"}}>
                  <label>JEE Weightage</label>
                  <div style={{display:"flex",gap:6}}>
                    {WEIGHTAGES.map(w=>(
                      <button key={w} onClick={()=>setForm(f=>({...f,weightage:w}))}
                        style={{flex:1,padding:"8px 4px",borderRadius:7,fontSize:12,fontWeight:form.weightage===w?700:400,
                          background:form.weightage===w?`${wColor(w)}18`:C.hover,
                          color:form.weightage===w?wColor(w):C.t3,border:`1.5px solid ${form.weightage===w?wColor(w):C.b}`}}>
                        {w}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.t2,textTransform:"none",letterSpacing:0}}>
                  <input type="checkbox" style={{width:15,height:15,accentColor:C.green}} checked={form.is_verified} onChange={e=>setForm(f=>({...f,is_verified:e.target.checked}))}/>
                  Mark as verified (live to students)
                </label>
                <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.t2,textTransform:"none",letterSpacing:0}}>
                  <input type="checkbox" style={{width:15,height:15,accentColor:C.green}} checked={form.is_active} onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))}/>
                  Active (visible in queries)
                </label>
              </div>
            </Section>

            {/* ── Preview ── */}
            {form.question_text&&(
              <Section title="Preview — rendered">
                <div style={{background:C.hover,borderRadius:10,padding:"16px 18px"}}>
                  {form.diagram_url&&(
                    <div style={{textAlign:"center",marginBottom:14}}>
                      <img src={form.diagram_url} alt="diagram"
                        style={{maxWidth:"100%",maxHeight:220,objectFit:"contain",borderRadius:6,border:`1px solid ${C.b}`}}/>
                    </div>
                  )}
                  <div style={{fontSize:14,lineHeight:1.9,color:C.t,marginBottom:14}}>
                    <MathText t={form.question_text} style={{fontSize:14,lineHeight:1.9,fontFamily:"serif"}}/>
                  </div>
                  {(form.question_type==="Integer"||form.question_type==="Decimal")?(
                    <div style={{padding:"14px 16px",background:C.card,borderRadius:8,border:`1px solid ${C.b}`}}>
                      <div style={{fontSize:11,color:C.t3,marginBottom:6,textTransform:"uppercase",letterSpacing:".06em"}}>
                        {form.question_type} answer
                      </div>
                      <div style={{fontSize:22,fontWeight:700,color:C.green,fontFamily:"monospace"}}>
                        {form.correct||<span style={{color:C.t4,fontSize:14}}>not set</span>}
                      </div>
                    </div>
                  ):form.answer_type==="image"?(
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      {["A","B","C","D"].map(opt=>{
                        const url=form[`option_${opt.toLowerCase()}`];
                        const isCorrect=(form.correct||"").includes(opt);
                        return(
                          <div key={opt} style={{borderRadius:8,padding:"10px",
                            background:isCorrect?`${C.green}12`:C.card,
                            border:`1.5px solid ${isCorrect?C.green:C.b}`}}>
                            <div style={{fontWeight:700,color:isCorrect?C.green:C.t3,marginBottom:6,fontSize:12}}>
                              {opt}{isCorrect?" ✓":""}
                            </div>
                            {url
                              ?<img src={url} alt={`Option ${opt}`} style={{width:"100%",maxHeight:100,objectFit:"contain",borderRadius:4}}/>
                              :<div style={{fontSize:11,color:C.t4,textAlign:"center",padding:"16px 0"}}>no image</div>
                            }
                          </div>
                        );
                      })}
                    </div>
                  ):(
                    <div style={{display:"flex",flexDirection:"column",gap:7}}>
                      {["A","B","C","D"].map(opt=>{
                        const isCorrect=(form.correct||"").includes(opt);
                        return(
                          <div key={opt} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 12px",borderRadius:8,
                            background:isCorrect?`${C.green}12`:C.card,border:`1px solid ${isCorrect?C.green:C.b}`}}>
                            <span style={{fontWeight:700,color:isCorrect?C.green:C.t3,width:18}}>{opt}</span>
                            <span style={{fontSize:13,color:isCorrect?C.t:C.t2,fontFamily:"serif"}}>
                              <MathText t={form[`option_${opt.toLowerCase()}`]||""}/>{!form[`option_${opt.toLowerCase()}`]&&<span style={{color:C.t4}}>—</span>}
                            </span>
                            {isCorrect&&<span style={{marginLeft:"auto",fontSize:11,color:C.green}}>✓ Correct</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div style={{marginTop:10,fontSize:10,color:C.t4}}>
                    raw: <span style={{fontFamily:"monospace",color:C.t3}}>{form.question_text.slice(0,80)}{form.question_text.length>80?"…":""}</span>
                  </div>
                </div>
              </Section>
            )}

            {/* Save button */}
            <div style={{display:"flex",gap:10,marginTop:8}}>
              <button onClick={saveQ} disabled={saving}
                style={{padding:"12px 28px",background:saving?C.t4:C.green,color:"#fff",borderRadius:9,fontSize:14,fontWeight:700,
                  opacity:saving?.6:1,minWidth:140}}>
                {saving?"Saving…":editQ?"Update Question":"Save Question"}
              </button>
              <button onClick={()=>setView("questions")}
                style={{padding:"12px 20px",background:C.card,color:C.t3,border:`1px solid ${C.b}`,borderRadius:9,fontSize:13}}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── BULK IMPORT ── */}
        {view==="bulk"&&(
          <div style={{animation:"fade .2s ease",maxWidth:800}}>
            <div style={{marginBottom:22}}>
              <div style={{fontSize:20,fontWeight:700,letterSpacing:"-.02em"}}>Bulk Import</div>
              <div style={{fontSize:13,color:C.t3,marginTop:4}}>Paste a JSON array of questions. Each question must include all required fields.</div>
            </div>

            <Section title="JSON Format">
              <div style={{background:C.hover,borderRadius:9,padding:"14px 16px",fontSize:11.5,color:C.t3,fontFamily:"monospace",lineHeight:1.8,marginBottom:0,overflowX:"auto"}}>
{`[
  {
    "slug": "P099",
    "subject": "Physics",          // Physics | Chemistry | Mathematics
    "topic": "Electrostatics",
    "subtopic": "",                 // optional
    "exam": "JEE Main",             // JEE Main | JEE Advanced
    "year": 2019,
    "session": "Jan S1",            // optional
    "shift": "Morning",             // optional
    "question_text": "Full question here...",
    "option_a": "...",
    "option_b": "...",
    "option_c": "...",
    "option_d": "...",
    "correct": "B",                 // A | B | C | D
    "solution": "Step by step...",
    "concept": "Key concept",       // optional
    "tip": "Exam tip",              // optional
    "difficulty": "Medium",         // Easy | Medium | Hard
    "weightage": "H",               // H | M | L
    "is_verified": false,
    "source_note": "JEE Main 2019 Jan S1 Shift 1"
  }
]`}
              </div>
            </Section>

            <Section title="Paste JSON">
              <textarea rows={14} placeholder="[ { ... }, { ... } ]" value={bulkJson} onChange={e=>setBulkJson(e.target.value)}
                style={{fontFamily:"monospace",fontSize:12}}/>
              <div style={{display:"flex",gap:10,marginTop:10}}>
                <button onClick={runBulkImport} disabled={saving||!bulkJson.trim()}
                  style={{padding:"11px 24px",background:saving?C.t4:C.blue,color:"#fff",borderRadius:9,fontSize:13,fontWeight:700,opacity:!bulkJson.trim()?.5:1}}>
                  {saving?"Importing…":"Import Questions ⇪"}
                </button>
                <button onClick={()=>{setBulkJson("");setBulkResult(null);}}
                  style={{padding:"11px 16px",background:C.card,color:C.t3,border:`1px solid ${C.b}`,borderRadius:9,fontSize:13}}>
                  Clear
                </button>
              </div>
            </Section>

            {bulkResult&&(
              <div style={{background:bulkResult.fail>0?`${C.red}12`:`${C.green}12`,
                border:`1px solid ${bulkResult.fail>0?C.red:C.green}`,borderRadius:10,padding:"14px 16px",marginTop:4}}>
                <div style={{fontSize:14,fontWeight:700,color:bulkResult.fail>0?C.red:C.green,marginBottom:6}}>
                  Import complete: {bulkResult.ok} added, {bulkResult.fail} failed
                </div>
                {bulkResult.errors.map((e,i)=>(
                  <div key={i} style={{fontSize:11.5,color:C.t3,fontFamily:"monospace",marginTop:3}}>✗ {e}</div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}

// ── Tiny helper components ────────────────────────────────────────────────
function Section({title,children}) {
  return(
    <div style={{background:C.card,border:`1px solid ${C.b}`,borderRadius:12,padding:"18px 20px",marginBottom:14}}>
      <div style={{fontSize:10,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",color:C.t3,marginBottom:14}}>{title}</div>
      {children}
    </div>
  );
}
function Field({label,children}) {
  return(
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}
