'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Menu, X, ArrowRight, ChevronDown,
  BookOpen, BarChart2, Puzzle, Users, Building2,
  GraduationCap, MonitorPlay, CheckCircle2, XCircle,
  Layers, Zap, Eye, TrendingUp, ShieldCheck, PlugZap,
  ClipboardList, RefreshCw, FileText
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) router.replace('/dashboard');
  }, [router]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const dos = [
    'Record sessions from any phone or browser',
    'Track learner competency continuously across terms',
    'Use any curriculum — CBC, IGCSE, 8-4-4, or custom',
    'Let the system auto-generate grades and reports',
    'Teach across multiple schools or organizations',
    'Add or remove optional plugins without breaking anything',
    'Have one student assessed by multiple teachers',
    'Run as a solo tutor or a full institution',
  ];

  const donts = [
    "Access another organization's data — ever",
    'Bypass the curriculum plugin system',
    "Expect student dashboards by default — it's a plugin",
    'Use it as a standalone student-facing app',
    'Mix cross-organization records or memberships',
    'Override computed grades without a defined policy',
    'Use billing or payroll — that is a separate plugin',
    'Expect full offline support without internet',
  ];

  const features = [
    { icon: <MonitorPlay size={18} />, title: 'Works on any device', desc: 'A smartphone is enough. No special hardware or app install — just open a browser.' },
    { icon: <Puzzle size={18} />, title: 'Any curriculum', desc: 'CBC, IGCSE, Edexcel, 8-4-4 — attach any curriculum as a plugin without rebuilding anything.' },
    { icon: <RefreshCw size={18} />, title: 'Automatic reports', desc: 'Define your grading policy once. The system computes results and generates reports automatically.' },
    { icon: <Eye size={18} />, title: 'Continuous learner tracking', desc: "Track each student's competency and behavior over time, not just at end of term." },
    { icon: <TrendingUp size={18} />, title: 'Teacher performance insight', desc: 'See patterns in your own teaching — which topics and sessions produce the best outcomes.' },
    { icon: <Users size={18} />, title: 'Flexible scale', desc: 'Works for a single private tutor with one student, or a full school with hundreds.' },
    { icon: <ShieldCheck size={18} />, title: 'Org-scoped data', desc: 'Every piece of data belongs to the organization. No cross-org leakage, ever.' },
    { icon: <PlugZap size={18} />, title: 'Plugin architecture', desc: 'Timetables, billing, student dashboards — optional plugins you add or remove freely.' },
  ];

  const audience = [
    { icon: <MonitorPlay size={22} />, title: 'Private Tutors', desc: 'One teacher, one or a few learners. Track progress as precisely as any institution.' },
    { icon: <BookOpen size={22} />, title: 'Classroom Teachers', desc: 'Record sessions, score assessments, and generate class reports without manual effort.' },
    { icon: <Building2 size={22} />, title: 'Full Schools', desc: 'Multi-teacher, multi-cohort, multi-curriculum environments with full org structure.' },
    { icon: <GraduationCap size={22} />, title: 'Bootcamps & Training', desc: 'Technical training institutions that need competency tracking beyond traditional grading.' },
  ];

  const steps = [
    { n: '01', title: 'Record what was taught', desc: 'Log sessions, topics, and activities directly from your phone as class happens.' },
    { n: '02', title: 'Capture learner responses', desc: 'Score assessments, mark attendance, and note competency levels per student — quickly.' },
    { n: '03', title: 'Let the system compute', desc: 'ScholaroScope automatically grades, generates progress reports, and identifies weak areas.' },
    { n: '04', title: 'See your own patterns', desc: 'Understand where learners consistently struggle — a mirror for your own teaching quality.' },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #0b0f14;
          --surface: #121821;
          --surface-2: #1a2332;
          --primary: #2563eb;
          --primary-h: #1d4ed8;
          --primary-soft: #60a5fa;
          --primary-pale: #1e3a5f;
          --success: #22c55e;
          --text: #e5e7eb;
          --muted: #9ca3af;
          --muted-2: #6b7280;
          --border: #1f2937;
          --border-2: #374151;
          --white: #fff;
        }
        html { scroll-behavior: smooth; }
        body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; overflow-x: hidden; }

        /* NAV */
        .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 200; padding: 1rem 2rem; display: flex; align-items: center; justify-content: space-between; transition: background .3s, border-color .3s; border-bottom: 1px solid transparent; }
        .nav.stuck { background: rgba(11,15,20,.95); backdrop-filter: blur(12px); border-color: var(--border); }
        .nav-logo { font-size: 1.15rem; font-weight: 700; color: var(--white); text-decoration: none; letter-spacing: -.02em; }
        .nav-logo span { color: var(--primary-soft); }
        .nav-links { display: flex; align-items: center; gap: 1.75rem; list-style: none; }
        .nav-links a { font-size: .83rem; font-weight: 500; color: var(--muted); text-decoration: none; transition: color .2s; }
        .nav-links a:hover { color: var(--text); }
        .nav-btn-ghost { color: var(--text) !important; border: 1px solid var(--border-2) !important; padding: .45rem 1.1rem !important; border-radius: 6px; font-weight: 500 !important; transition: border-color .2s, color .2s !important; }
        .nav-btn-ghost:hover { border-color: var(--primary-soft) !important; color: var(--primary-soft) !important; }
        .nav-btn { background: var(--primary) !important; color: var(--white) !important; padding: .45rem 1.1rem !important; border-radius: 6px; display: inline-flex !important; align-items: center; gap: .35rem; font-weight: 600 !important; font-size: .83rem !important; transition: background .2s !important; }
        .nav-btn:hover { background: var(--primary-h) !important; }
        .hamburger { display: none; background: none; border: none; cursor: pointer; color: var(--text); z-index: 201; }
        .mobile-menu { position: fixed; inset: 0; background: var(--bg); z-index: 199; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2rem; list-style: none; border-top: 1px solid var(--border); }
        .mobile-menu a { color: var(--text); font-size: 1.1rem; font-weight: 500; text-decoration: none; }
        .mobile-menu .nav-btn { background: var(--primary) !important; padding: .7rem 2rem !important; border-radius: 6px; }

        /* HERO */
        .hero { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 8rem 2rem 5rem; text-align: center; position: relative; overflow: hidden; }
        .hero::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: radial-gradient(ellipse at 50% 0%, rgba(37,99,235,.15) 0%, transparent 60%); pointer-events: none; }
        .hero-badge { display: inline-flex; align-items: center; gap: .5rem; background: var(--surface); border: 1px solid var(--border-2); border-radius: 100px; padding: .35rem 1rem; font-size: .72rem; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; color: var(--primary-soft); margin-bottom: 2rem; }
        .hero-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--success); animation: pulse 2s infinite; }
        .hero-title { font-size: clamp(2.4rem, 5vw, 4rem); font-weight: 700; line-height: 1.08; letter-spacing: -.03em; color: var(--white); margin-bottom: 1.25rem; max-width: 700px; }
        .hero-title em { font-style: normal; color: var(--primary-soft); }
        .hero-sub { font-size: 1rem; color: var(--muted); max-width: 520px; line-height: 1.75; font-weight: 400; margin: 0 auto 2.5rem; }
        .hero-actions { display: flex; gap: 1rem; align-items: center; justify-content: center; flex-wrap: wrap; margin-bottom: 4rem; }
        .btn-p { background: var(--primary); color: var(--white); padding: .78rem 1.65rem; border-radius: 6px; font-weight: 600; font-size: .9rem; text-decoration: none; display: inline-flex; align-items: center; gap: .45rem; transition: background .2s, transform .15s; }
        .btn-p:hover { background: var(--primary-h); transform: translateY(-1px); }
        .btn-ghost { color: var(--muted); font-size: .88rem; text-decoration: none; display: inline-flex; align-items: center; gap: .35rem; border: 1px solid var(--border-2); padding: .78rem 1.4rem; border-radius: 6px; transition: color .2s, border-color .2s; }
        .btn-ghost:hover { color: var(--text); border-color: var(--border-2); }
        .hero-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; max-width: 680px; width: 100%; }
        .hero-stat { background: var(--surface); padding: 1.25rem; text-align: center; }
        .hero-stat-num { font-size: 1.6rem; font-weight: 700; color: var(--white); letter-spacing: -.03em; margin-bottom: .2rem; }
        .hero-stat-label { font-size: .72rem; color: var(--muted-2); font-weight: 500; }

        /* SECTIONS */
        section { padding: 5.5rem 2rem; }
        .container { max-width: 1100px; margin: 0 auto; }
        .sec-label { font-size: .68rem; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: var(--primary-soft); margin-bottom: .6rem; }
        .sec-title { font-size: clamp(1.75rem, 3vw, 2.4rem); font-weight: 700; line-height: 1.12; letter-spacing: -.025em; color: var(--white); margin-bottom: .6rem; }
        .sec-desc { font-size: .97rem; color: var(--muted); max-width: 520px; line-height: 1.75; font-weight: 400; }
        .rule { width: 32px; height: 2px; background: var(--primary); margin: 1rem 0; border-radius: 2px; }

        /* PROBLEM */
        .problem-s { background: var(--surface); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .prob-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; margin-top: 2.75rem; }
        .prob-card { background: var(--bg); padding: 1.75rem; }
        .prob-icon { width: 36px; height: 36px; border-radius: 7px; background: rgba(37,99,235,.1); display: flex; align-items: center; justify-content: center; color: var(--primary-soft); margin-bottom: .85rem; }
        .prob-card h3 { font-size: .92rem; font-weight: 600; color: var(--white); margin-bottom: .4rem; }
        .prob-card p { font-size: .82rem; color: var(--muted-2); line-height: 1.65; font-weight: 300; }

        /* HOW */
        .how-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4.5rem; align-items: center; margin-top: 3.5rem; }
        .steps { display: flex; flex-direction: column; }
        .step { display: flex; gap: 1.1rem; padding: 1.4rem 0; border-bottom: 1px solid var(--border); }
        .step:last-child { border-bottom: none; }
        .step-num { font-size: 1.1rem; font-weight: 700; color: var(--primary); min-width: 2rem; margin-top: .1rem; flex-shrink: 0; font-variant-numeric: tabular-nums; }
        .step h3 { font-size: .9rem; font-weight: 600; color: var(--white); margin-bottom: .3rem; }
        .step p { font-size: .83rem; color: var(--muted); line-height: 1.65; }
        .mock { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
        .mock-bar { background: var(--surface-2); padding: .65rem 1rem; display: flex; align-items: center; gap: .45rem; border-bottom: 1px solid var(--border); }
        .mock-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .mock-url { margin-left: auto; font-size: .67rem; color: var(--muted-2); font-family: monospace; }
        .mock-body { padding: 1.35rem; }
        .mock-title-row { font-size: .67rem; color: var(--muted-2); letter-spacing: .1em; text-transform: uppercase; margin-bottom: .9rem; }
        .mock-row { display: flex; align-items: center; gap: .7rem; padding: .65rem 0; border-bottom: 1px solid var(--border); }
        .mock-row:last-child { border-bottom: none; }
        .mock-lbl { font-size: .75rem; color: var(--muted); flex: 1; }
        .mock-track { flex: 2; height: 3px; background: var(--border-2); border-radius: 2px; }
        .mock-fill { height: 100%; border-radius: 2px; background: var(--primary); }
        .mock-val { font-size: .72rem; color: var(--primary-soft); font-family: monospace; min-width: 34px; text-align: right; }

        /* FEATURES */
        .features-s { background: var(--surface); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .feat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; margin-top: 2.75rem; }
        .feat-card { background: var(--bg); padding: 1.6rem; transition: background .2s; }
        .feat-card:hover { background: var(--surface-2); }
        .feat-icon { width: 36px; height: 36px; border-radius: 7px; background: rgba(37,99,235,.1); display: flex; align-items: center; justify-content: center; color: var(--primary-soft); margin-bottom: .9rem; }
        .feat-card h3 { font-size: .9rem; font-weight: 600; color: var(--white); margin-bottom: .35rem; }
        .feat-card p { font-size: .82rem; color: var(--muted-2); line-height: 1.65; }

        /* AUDIENCE */
        .aud-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; margin-top: 2.75rem; }
        .aud-card { background: var(--surface); padding: 1.6rem; text-align: center; }
        .aud-icon { width: 44px; height: 44px; border-radius: 50%; background: rgba(37,99,235,.1); display: flex; align-items: center; justify-content: center; color: var(--primary-soft); margin: 0 auto .9rem; }
        .aud-card h3 { font-size: .9rem; font-weight: 600; color: var(--white); margin-bottom: .35rem; }
        .aud-card p { font-size: .8rem; color: var(--muted-2); line-height: 1.6; }

        /* DOS & DONTS */
        .dos-s { background: var(--surface); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .dos-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.75rem; margin-top: 2.75rem; }
        .dos-col-title { font-size: .68rem; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; margin-bottom: 1.1rem; display: flex; align-items: center; gap: .45rem; }
        .can-t { color: var(--success); }
        .cant-t { color: #f87171; }
        .dos-list { display: flex; flex-direction: column; gap: .5rem; }
        .di { display: flex; gap: .7rem; align-items: flex-start; padding: .75rem .9rem; border-radius: 6px; font-size: .83rem; line-height: 1.55; }
        .di.yes { background: rgba(34,197,94,.06); color: rgba(229,231,235,.7); border: 1px solid rgba(34,197,94,.1); }
        .di.no { background: rgba(248,113,113,.06); color: rgba(229,231,235,.4); border: 1px solid rgba(248,113,113,.08); }

        /* PLUGIN ARCH */
        .plugin-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center; margin-top: 3.5rem; }
        .arch { display: flex; flex-direction: column; align-items: center; }
        .kernel { background: var(--primary); color: var(--white); border-radius: 8px; padding: .9rem 2.25rem; text-align: center; font-size: .88rem; font-weight: 700; letter-spacing: -.01em; }
        .kernel-sub { font-size: .62rem; color: rgba(255,255,255,.6); letter-spacing: .1em; text-transform: uppercase; margin-bottom: .2rem; font-weight: 500; }
        .arch-line { width: 1px; height: 26px; background: var(--border-2); }
        .plugins-row { display: flex; gap: .65rem; flex-wrap: wrap; justify-content: center; margin-top: .5rem; }
        .plugin-chip { background: var(--surface-2); border: 1px solid var(--border-2); border-radius: 6px; padding: .5rem .9rem; font-size: .76rem; font-weight: 500; color: var(--muted); display: flex; align-items: center; gap: .35rem; }
        .plugin-points { display: flex; flex-direction: column; gap: 1.35rem; }
        .pp h3 { font-size: .92rem; font-weight: 600; color: var(--white); margin-bottom: .3rem; }
        .pp p { font-size: .83rem; color: var(--muted); line-height: 1.65; }

        /* CTA */
        .cta-s { text-align: center; padding: 7rem 2rem; border-top: 1px solid var(--border); }
        .cta-s .sec-title { margin: 0 auto .75rem; }
        .cta-s .sec-desc { margin: 0 auto 2.25rem; text-align: center; }
        .cta-s .rule { margin: 1rem auto; }
        .cta-actions { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
        .btn-outline { border: 1px solid var(--border-2); color: var(--text); padding: .78rem 1.65rem; border-radius: 6px; font-weight: 500; font-size: .88rem; text-decoration: none; display: inline-flex; align-items: center; gap: .45rem; transition: border-color .2s, color .2s; }
        .btn-outline:hover { border-color: var(--primary-soft); color: var(--primary-soft); }

        /* FOOTER */
        footer { background: var(--surface); border-top: 1px solid var(--border); color: var(--muted-2); padding: 2.5rem 2rem; text-align: center; font-size: .8rem; }
        footer strong { color: var(--muted); font-weight: 600; }
        .footer-links { display: flex; gap: 1.5rem; justify-content: center; margin-top: .75rem; flex-wrap: wrap; }
        .footer-links a { color: var(--muted-2); text-decoration: none; font-size: .78rem; transition: color .2s; }
        .footer-links a:hover { color: var(--text); }

        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
        @keyframes fu { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 900px) {
          .how-grid, .plugin-layout { grid-template-columns: 1fr; gap: 2.5rem; }
          .dos-grid { grid-template-columns: 1fr; }
          .nav-links { display: none; }
          .hamburger { display: block; }
          .hero-stats { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 600px) {
          section { padding: 4rem 1.25rem; }
          .cta-s { padding: 5rem 1.25rem; }
          nav { padding: 1rem 1.25rem; }
          .hero { padding: 7rem 1.25rem 4rem; }
        }
      `}</style>

      {/* NAV */}
      <nav className={`nav${scrolled ? ' stuck' : ''}`}>
        <a href="#" className="nav-logo">Scholaro<span>Scope</span></a>
        <ul className="nav-links">
          <li><a href="#how">How It Works</a></li>
          <li><a href="#features">Features</a></li>
          <li><a href="#who">Who It&apos;s For</a></li>
          <li><Link href="/login" className="nav-btn-ghost">Log In</Link></li>
          <li><Link href="/register" className="nav-btn">Get Started <ArrowRight size={13} /></Link></li>
        </ul>
        <button className="hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {menuOpen && (
        <ul className="mobile-menu">
          <li><a href="#how" onClick={() => setMenuOpen(false)}>How It Works</a></li>
          <li><a href="#features" onClick={() => setMenuOpen(false)}>Features</a></li>
          <li><a href="#who" onClick={() => setMenuOpen(false)}>Who It&apos;s For</a></li>
          <li><Link href="/login" onClick={() => setMenuOpen(false)} style={{ color: 'var(--muted)' }}>Log In</Link></li>
          <li><Link href="/register" className="nav-btn" onClick={() => setMenuOpen(false)}>Get Started <ArrowRight size={13} /></Link></li>
        </ul>
      )}

      {/* HERO */}
      <div className="hero">
        <div className="hero-badge">
          <span className="hero-badge-dot" />
          Academic Execution Engine · Version 5
        </div>
        <h1 className="hero-title">
          Teaching,<br /><em>made measurable.</em>
        </h1>
        <p className="hero-sub">
          ScholaroScope helps teachers record what was taught, track how learners responded,
          and generate reports automatically — from any phone or browser.
        </p>
        <div className="hero-actions">
          <Link href="/register" className="btn-p">Create Account <ArrowRight size={15} /></Link>
          <Link href="/login" className="btn-ghost">Log In</Link>
          <a href="#how" className="btn-ghost">How it works <ChevronDown size={14} /></a>
        </div>
        <div className="hero-stats">
          <div className="hero-stat"><div className="hero-stat-num">v5</div><div className="hero-stat-label">Current Build</div></div>
          <div className="hero-stat"><div className="hero-stat-num">1K+</div><div className="hero-stat-label">Target Teachers</div></div>
          <div className="hero-stat"><div className="hero-stat-num">Any</div><div className="hero-stat-label">Curriculum</div></div>
          <div className="hero-stat"><div className="hero-stat-num">Multi</div><div className="hero-stat-label">Tenant</div></div>
        </div>
      </div>

      {/* PROBLEM */}
      <section className="problem-s">
        <div className="container">
          <p className="sec-label">The Problem</p>
          <h2 className="sec-title">Teaching without visibility is guesswork.</h2>
          <div className="rule" />
          <div className="prob-grid">
            {[
              { icon: <ClipboardList size={16} />, title: 'No tracking system', desc: 'Teachers rely on memory or end-term exams — too late to course-correct when students fall behind.' },
              { icon: <FileText size={16} />, title: 'Manual overload', desc: 'Lesson plans, schemes of work, and report writing consume hours that should go to actual teaching.' },
              { icon: <Eye size={16} />, title: 'Invisible learner gaps', desc: "Without continuous data, struggling students go unnoticed until it's too late to help them." },
              { icon: <RefreshCw size={16} />, title: 'No self-feedback loop', desc: 'Teachers cannot see their own teaching patterns or improve without objective performance data.' },
            ].map((p, i) => (
              <div className="prob-card" key={i}>
                <div className="prob-icon">{p.icon}</div>
                <h3>{p.title}</h3>
                <p>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how">
        <div className="container">
          <p className="sec-label">How It Works</p>
          <h2 className="sec-title">Record once. Understand everything.</h2>
          <div className="rule" />
          <div className="how-grid">
            <div className="steps">
              {steps.map(s => (
                <div className="step" key={s.n}>
                  <span className="step-num">{s.n}</span>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mock">
              <div className="mock-bar">
                <div className="mock-dot" style={{ background: '#ff5f57' }} />
                <div className="mock-dot" style={{ background: '#febc2e' }} />
                <div className="mock-dot" style={{ background: '#28c840' }} />
                <span className="mock-url">scholaroscope.com/dashboard</span>
              </div>
              <div className="mock-body">
                <p className="mock-title-row">Class Overview · Term 2</p>
                {[
                  { lbl: 'Attendance rate', val: '94%', w: '94%' },
                  { lbl: 'Assessments scored', val: '87%', w: '87%' },
                  { lbl: 'CBC competency avg', val: '78%', w: '78%' },
                  { lbl: 'Reports generated', val: '100%', w: '100%' },
                  { lbl: 'Workload saved', val: '~60%', w: '60%' },
                ].map(m => (
                  <div className="mock-row" key={m.lbl}>
                    <span className="mock-lbl">{m.lbl}</span>
                    <div className="mock-track"><div className="mock-fill" style={{ width: m.w }} /></div>
                    <span className="mock-val">{m.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features-s" id="features">
        <div className="container">
          <p className="sec-label">What You Get</p>
          <h2 className="sec-title">Built for real classrooms.</h2>
          <div className="rule" />
          <div className="feat-grid">
            {features.map(f => (
              <div className="feat-card" key={f.title}>
                <div className="feat-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section id="who">
        <div className="container">
          <p className="sec-label">Who It&apos;s For</p>
          <h2 className="sec-title">If you teach, this is for you.</h2>
          <div className="rule" />
          <p className="sec-desc">ScholaroScope is built primarily for teachers — in any setting, at any scale.</p>
          <div className="aud-grid">
            {audience.map(a => (
              <div className="aud-card" key={a.title}>
                <div className="aud-icon">{a.icon}</div>
                <h3>{a.title}</h3>
                <p>{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DOS & DONTS */}
      <section className="dos-s">
        <div className="container">
          <p className="sec-label">Do&apos;s &amp; Don&apos;ts</p>
          <h2 className="sec-title">Know what ScholaroScope is — and isn&apos;t.</h2>
          <div className="rule" />
          <div className="dos-grid">
            <div>
              <p className="dos-col-title can-t"><CheckCircle2 size={13} /> You can</p>
              <div className="dos-list">
                {dos.map(item => (
                  <div className="di yes" key={item}>
                    <CheckCircle2 size={14} color="#22c55e" style={{ flexShrink: 0, marginTop: 1 }} />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="dos-col-title cant-t"><XCircle size={13} /> You cannot</p>
              <div className="dos-list">
                {donts.map(item => (
                  <div className="di no" key={item}>
                    <XCircle size={14} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PLUGIN ARCHITECTURE */}
      <section>
        <div className="container">
          <p className="sec-label">Architecture</p>
          <h2 className="sec-title">The engine. Not the curriculum.</h2>
          <div className="rule" />
          <div className="plugin-layout">
            <div className="arch">
              <div className="kernel">
                <div className="kernel-sub">Core Engine</div>
                ScholaroScope
              </div>
              <div className="arch-line" />
              <div className="plugins-row">
                {[
                  { icon: <BookOpen size={13} />, label: 'CBC' },
                  { icon: <Layers size={13} />, label: '8-4-4' },
                  { icon: <GraduationCap size={13} />, label: 'IGCSE' },
                  { icon: <MonitorPlay size={13} />, label: 'Timetable' },
                  { icon: <PlugZap size={13} />, label: 'Billing' },
                  { icon: <Users size={13} />, label: 'Student Portal' },
                ].map(p => (
                  <div className="plugin-chip" key={p.label}>{p.icon} {p.label}</div>
                ))}
              </div>
            </div>
            <div className="plugin-points">
              {[
                { h: 'Curriculum is a plugin', p: 'The system is the engine. CBC, IGCSE, 8-4-4, or any custom curriculum attaches as a plugin — swap without rebuilding.' },
                { h: 'Optional extras stay optional', p: 'Timetables, billing, student dashboards — each is a plugin. Schools add only what they need.' },
                { h: 'One teacher, many schools', p: "A teacher can belong to multiple organizations simultaneously. Each org's data stays fully isolated." },
              ].map(pt => (
                <div className="pp" key={pt.h}>
                  <h3>{pt.h}</h3>
                  <p>{pt.p}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-s">
        <div className="container">
          <p className="sec-label" style={{ textAlign: 'center' }}>Get Started</p>
          <h2 className="sec-title">Ready to bring clarity to your classroom?</h2>
          <div className="rule" />
          <p className="sec-desc">
            Join teachers already using ScholaroScope to record, track, and improve —
            from any device, any curriculum, any scale.
          </p>
          <div className="cta-actions">
            <Link href="/register" className="btn-p">Create Account <ArrowRight size={15} /></Link>
            <Link href="/login" className="btn-outline">Log In</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <p><strong>ScholaroScope</strong> · Academic Execution Engine · Version 5</p>
        <div className="footer-links">
          <a href="#how">How It Works</a>
          <a href="#features">Features</a>
          <a href="#who">Who It&apos;s For</a>
          <Link href="/login">Log In</Link>
          <Link href="/register">Register</Link>
        </div>
        <p style={{ marginTop: '1rem', fontSize: '.75rem' }}>© {new Date().getFullYear()} ScholaroScope. All rights reserved.</p>
      </footer>
    </>
  );
}