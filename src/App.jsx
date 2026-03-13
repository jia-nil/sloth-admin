import { useState, useEffect, useRef } from "react";


const SUPABASE_URL  = "https://tlmazdrnndylafhfxsrc.supabase.co
";
const SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsbWF6ZHJubmR5bGFmaGZ4c3JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1ODEwNjAsImV4cCI6MjA4ODE1NzA2MH0.gGPknDEdaGfzDb2JJ2amEY9b33jlbTY3brvbbhvvIWg
";

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

// ── Demo mode (no Supabase) — uses in-memory data ──────────────────────────
const DEMO_QUESTIONS = [
  {id:"1",slug:"P001",subject:"Physics",topic:"Kinematics",exam:"JEE Main",year:2023,
   difficulty:"Medium",weightage:"H",is_verified:true,is_active:true,
   question_text:"A particle's position x = 3t³ − 2t² + t − 5. Acceleration at t=2s?",
   option_a:"18 m/s²",option_b:"28 m/s²",option_c:"32 m/s²",option_d:"36 m/s²",correct:"C",
   solution:"a = d²x/dt² = 18t − 4. At t=2: a = 32 m/s²",
   concept:"Differentiation",tip:"Differentiate position twice.",created_at:new Date().toISOString()},
  {id:"2",slug:"C001",subject:"Chemistry",topic:"Mole Concept",exam:"JEE Main",year:2023,
   difficulty:"Easy",weightage:"H",is_verified:true,is_active:true,
   question_text:"Moles of CO₂ from complete combustion of 1 mol C₃H₈?",
   option_a:"2",option_b:"3",option_c:"4",option_d:"5",correct:"B",
   solution:"C₃H₈ + 5O₂ → 3CO₂ + 4H₂O. Answer: 3 moles.",
   concept:"Stoichiometry",tip:"Balance equation first.",created_at:new Date().toISOString()},
  {id:"3",slug:"M001",subject:"Mathematics",topic:"Integrals",exam:"JEE Main",year:2023,
   difficulty:"Medium",weightage:"H",is_verified:false,is_active:true,
   question_text:"∫₀^(π/2) sin²x dx = ?",
   option_a:"π/4",option_b:"π/2",option_c:"π/8",option_d:"1",correct:"A",
   solution:"Use sin²x = (1−cos2x)/2. Result: π/4.",
   concept:"Half-angle integration",tip:"Memorise ∫sin²x dx = x/2 − sin2x/4.",created_at:new Date().toISOString()},
];

const DEMO_MODE = SUPABASE_URL.includes("YOUR_PROJECT");

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
  exam:"JEE Main",year:2024,session:"",shift:"",
  question_text:"",option_a:"",option_b:"",option_c:"",option_d:"",correct:"A",
  solution:"",concept:"",tip:"",
  difficulty:"Medium",weightage:"M",question_type:"MCQ",
  marks:4,negative:-1,has_image:false,is_verified:false,is_active:true,source_note:"",
};

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

  function showToast(msg, type="success") {
    setToast({msg,type});
    setTimeout(()=>setToast(null), 3500);
  }

  // ── Load questions ────────────────────────────────────────────────────────
  async function loadQs() {
    setLoading(true);
    try {
      if (DEMO_MODE) { setQs(DEMO_QUESTIONS); setLoading(false); return; }
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
    if (DEMO_MODE) {
      setStats({
        total: DEMO_QUESTIONS.length,
        verified: DEMO_QUESTIONS.filter(q=>q.is_verified).length,
        bySubject: {Physics:1,Chemistry:1,Mathematics:1},
        byYear: {2023:3},
        byDifficulty: {Easy:1,Medium:2,Hard:0},
      });
      return;
    }
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
    const required = ["subject","topic","question_text","option_a","option_b","option_c","option_d","correct","solution"];
    const missing  = required.filter(k=>!form[k]?.toString().trim());
    if (missing.length) { showToast("Fill in: "+missing.join(", "),"error"); return; }
    setSaving(true);
    try {
      if (DEMO_MODE) {
        if (editQ) {
          setQs(prev=>prev.map(q=>q.id===editQ.id?{...q,...form}:q));
          showToast("Updated (demo mode)");
        } else {
          setQs(prev=>[{...form,id:String(Date.now()),created_at:new Date().toISOString()},...prev]);
          showToast("Added (demo mode)");
        }
        setView("questions");
        return;
      }
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
    if (DEMO_MODE) {
      setQs(prev=>prev.map(x=>x.id===q.id?{...x,is_verified:!x.is_verified}:x));
      showToast((!q.is_verified?"Verified":"Unverified")+" (demo)");
      return;
    }
    try {
      await sb.update("questions", q.id, {is_verified:!q.is_verified});
      setQs(prev=>prev.map(x=>x.id===q.id?{...x,is_verified:!x.is_verified}:x));
      showToast(!q.is_verified?"Marked as verified ✓":"Moved to unverified");
      loadStats();
    } catch(e) { showToast(e.message,"error"); }
  }

  async function toggleActive(q) {
    if (DEMO_MODE) {
      setQs(prev=>prev.map(x=>x.id===q.id?{...x,is_active:!x.is_active}:x));
      return;
    }
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
        if (DEMO_MODE) { setQs(prev=>[...prev,{...q,id:String(Date.now()+Math.random()),created_at:new Date().toISOString()}]); results.ok++; }
        else { await sb.insert("questions", q); results.ok++; }
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
          {DEMO_MODE&&<div style={{marginTop:8,padding:"4px 8px",background:`${C.gold}18`,border:`1px solid ${C.gold}30`,borderRadius:6,fontSize:10,color:C.gold}}>⚠ Demo mode</div>}
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
            {!DEMO_MODE&&(
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
                <Field label="Session">
                  <input placeholder="Jan S1, Apr S2…" value={form.session||""} onChange={e=>setForm(f=>({...f,session:e.target.value}))}/>
                </Field>
                <Field label="Shift">
                  <input placeholder="Morning / Evening" value={form.shift||""} onChange={e=>setForm(f=>({...f,shift:e.target.value}))}/>
                </Field>
              </div>
              <Field label="Source Note">
                <input placeholder="e.g. Reconstructed from 2019 Jan S1 Shift 1" value={form.source_note||""} onChange={e=>setForm(f=>({...f,source_note:e.target.value}))}/>
              </Field>
            </Section>

            {/* ── Section: Question ── */}
            <Section title="Question">
              <Field label="Question text *">
                <textarea rows={4} placeholder="Type the full question here. Use standard notation — x², √, →, etc." value={form.question_text} onChange={e=>setForm(f=>({...f,question_text:e.target.value}))}/>
              </Field>
              <div className="g2">
                <Field label="Option A *"><input value={form.option_a} onChange={e=>setForm(f=>({...f,option_a:e.target.value}))}/></Field>
                <Field label="Option B *"><input value={form.option_b} onChange={e=>setForm(f=>({...f,option_b:e.target.value}))}/></Field>
                <Field label="Option C *"><input value={form.option_c} onChange={e=>setForm(f=>({...f,option_c:e.target.value}))}/></Field>
                <Field label="Option D *"><input value={form.option_d} onChange={e=>setForm(f=>({...f,option_d:e.target.value}))}/></Field>
              </div>
              <Field label="Correct Answer *">
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
              </Field>
            </Section>

            {/* ── Section: Solution ── */}
            <Section title="Solution">
              <Field label="Step-by-step solution *">
                <textarea rows={5} placeholder={"Line 1: Setup\nLine 2: Substitute\nLine 3: Solve\n..."} value={form.solution} onChange={e=>setForm(f=>({...f,solution:e.target.value}))}/>
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
              <Section title="Preview">
                <div style={{background:C.hover,borderRadius:10,padding:"16px 18px"}}>
                  <div style={{fontSize:14,lineHeight:1.8,color:C.t,marginBottom:14}}>{form.question_text}</div>
                  <div style={{display:"flex",flexDirection:"column",gap:7}}>
                    {["A","B","C","D"].map(opt=>(
                      <div key={opt} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 12px",borderRadius:8,
                        background:form.correct===opt?`${C.green}12`:C.card,border:`1px solid ${form.correct===opt?C.green:C.b}`}}>
                        <span style={{fontWeight:700,color:form.correct===opt?C.green:C.t3,width:18}}>{opt}</span>
                        <span style={{fontSize:13,color:form.correct===opt?C.t:C.t2}}>{form[`option_${opt.toLowerCase()}`]||<span style={{color:C.t4}}>—</span>}</span>
                        {form.correct===opt&&<span style={{marginLeft:"auto",fontSize:11,color:C.green}}>✓ Correct</span>}
                      </div>
                    ))}
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
