'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Menu, X, ArrowRight, ChevronDown,
  BookOpen, BarChart2, FileText, Smartphone,
  Puzzle, Users, Building2, GraduationCap, MonitorPlay,
  CheckCircle2, XCircle, Layers, Zap, Eye, TrendingUp,
  ShieldCheck, PlugZap, ClipboardList, RefreshCw
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
    { icon: <Smartphone size={18} />, title: 'Works on any device', desc: 'A smartphone is enough. No special hardware or app install — just open a browser.' },
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
                @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,500;0,600;1,500;1,600&family=Inter:wght@300;400;500;600&display=swap');
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                :root {
                    --ink: #0c0c0c;
                    --ink-soft: #3a3a3a;
                    --ink-muted: #6e6e6e;
                    --paper: #f5f2ec;
                    --paper-dark: #edeae2;
                    --accent: #1a5c38;
                    --accent-h: #236644;
                    --accent-pale: #e5f0ea;
                    --gold: #b8962e;
                    --rule: #d8d3ca;
                    --white: #fff;
                }
                html { scroll-behavior: smooth; }
                body { font-family: 'Inter', sans-serif; background: var(--paper); color: var(--ink); line-height: 1.6; overflow-x: hidden; }

                .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 200; padding: 1rem 2rem; display: flex; align-items: center; justify-content: space-between; transition: background .3s, border-color .3s; border-bottom: 1px solid transparent; }
                .nav.stuck { background: rgba(245,242,236,.96); backdrop-filter: blur(12px); border-color: var(--rule); }
                .nav-logo { font-family: 'Lora', serif; font-size: 1.25rem; font-weight: 600; color: var(--ink); text-decoration: none; }
                .nav-logo span { color: var(--accent); }
                .nav-links { display: flex; align-items: center; gap: 1.75rem; list-style: none; }
                .nav-links a { font-size: .83rem; font-weight: 500; color: var(--ink-soft); text-decoration: none; transition: color .2s; }
                .nav-links a:hover { color: var(--accent); }
                .nav-btn { background: var(--accent) !important; color: var(--white) !important; padding: .48rem 1.2rem !important; border-radius: 5px; display: inline-flex !important; align-items: center; gap: .35rem; font-weight: 600 !important; transition: background .2s !important; }
                .nav-btn:hover { background: var(--accent-h) !important; }
                .hamburger { display: none; background: none; border: none; cursor: pointer; color: var(--ink); z-index: 201; }
                .mobile-menu { position: fixed; inset: 0; background: var(--ink); z-index: 199; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2rem; list-style: none; }
                .mobile-menu a { color: var(--white); font-size: 1.15rem; font-weight: 500; text-decoration: none; }
                .mobile-menu .nav-btn { background: var(--accent) !important; padding: .7rem 2rem !important; border-radius: 6px; }

                .hero { min-height: 100vh; display: grid; grid-template-columns: 1fr 1fr; }
                .hero-l { background: var(--ink); padding: 9rem 4rem 5rem; display: flex; flex-direction: column; justify-content: center; position: relative; overflow: hidden; }
                .hero-l::before { content: ''; position: absolute; bottom: -100px; left: -100px; width: 380px; height: 380px; background: radial-gradient(circle, rgba(26,92,56,.22) 0%, transparent 70%); pointer-events: none; }
                .hero-l::after { content: ''; position: absolute; right: -1px; top: 0; bottom: 0; width: 52px; background: var(--paper); clip-path: polygon(100% 0, 100% 100%, 0 50%); z-index: 2; }
                .eyebrow { display: flex; align-items: center; gap: .6rem; font-size: .68rem; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: var(--gold); margin-bottom: 1.5rem; animation: fu .5s ease both; }
                .eyebrow-line { width: 28px; height: 1px; background: var(--gold); flex-shrink: 0; }
                .hero-title { font-family: 'Lora', serif; font-size: clamp(2.5rem, 4vw, 3.8rem); line-height: 1.08; letter-spacing: -.02em; color: var(--white); margin-bottom: 1.4rem; animation: fu .5s .1s ease both; }
                .hero-title em { font-style: italic; color: var(--gold); }
                .hero-sub { font-size: .97rem; color: rgba(255,255,255,.58); max-width: 400px; line-height: 1.75; font-weight: 300; margin-bottom: 2.25rem; animation: fu .5s .2s ease both; }
                .hero-actions { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; animation: fu .5s .3s ease both; }
                .btn-p { background: var(--accent); color: var(--white); padding: .78rem 1.65rem; border-radius: 5px; font-weight: 600; font-size: .88rem; text-decoration: none; display: inline-flex; align-items: center; gap: .45rem; transition: background .2s, transform .15s; }
                .btn-p:hover { background: var(--accent-h); transform: translateY(-1px); }
                .btn-ghost { color: rgba(255,255,255,.5); font-size: .85rem; text-decoration: none; display: inline-flex; align-items: center; gap: .35rem; transition: color .2s; }
                .btn-ghost:hover { color: var(--white); }
                .hero-badge { margin-top: 2.75rem; font-size: .68rem; letter-spacing: .12em; text-transform: uppercase; color: rgba(255,255,255,.22); animation: fu .5s .4s ease both; }
                .hero-r { padding: 9rem 4rem 5rem 5rem; display: flex; flex-direction: column; justify-content: center; animation: fu .6s .15s ease both; }
                .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.1rem; margin-bottom: 2.25rem; }
                .stat-card { background: var(--white); border: 1px solid var(--rule); border-radius: 8px; padding: 1.25rem; }
                .stat-num { font-family: 'Lora', serif; font-size: 2rem; color: var(--accent); line-height: 1; margin-bottom: .3rem; }
                .stat-label { font-size: .75rem; color: var(--ink-muted); font-weight: 500; }
                .hero-quote { font-family: 'Lora', serif; font-style: italic; font-size: 1.25rem; color: var(--ink); line-height: 1.45; border-left: 3px solid var(--accent); padding-left: 1.15rem; }

                section { padding: 5.5rem 2rem; }
                .container { max-width: 1100px; margin: 0 auto; }
                .sec-label { font-size: .67rem; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: var(--accent); margin-bottom: .65rem; }
                .sec-title { font-family: 'Lora', serif; font-size: clamp(1.8rem, 3vw, 2.6rem); line-height: 1.12; letter-spacing: -.02em; color: var(--ink); margin-bottom: .65rem; }
                .sec-desc { font-size: .97rem; color: var(--ink-muted); max-width: 520px; line-height: 1.75; font-weight: 300; }
                .rule { width: 38px; height: 2px; background: var(--gold); margin: 1.1rem 0; }

                .problem-s { background: var(--ink); }
                .problem-s .sec-label { color: var(--gold); }
                .problem-s .sec-title { color: var(--white); }
                .problem-s .rule { background: var(--gold); }
                .prob-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1px; background: #1e1e1e; border: 1px solid #1e1e1e; border-radius: 10px; overflow: hidden; margin-top: 2.75rem; }
                .prob-card { background: #111; padding: 1.75rem; }
                .prob-icon { width: 36px; height: 36px; border-radius: 7px; background: rgba(184,150,46,.1); display: flex; align-items: center; justify-content: center; color: var(--gold); margin-bottom: .85rem; }
                .prob-card h3 { font-size: .92rem; font-weight: 600; color: var(--white); margin-bottom: .4rem; }
                .prob-card p { font-size: .82rem; color: rgba(255,255,255,.38); line-height: 1.65; font-weight: 300; }

                .how-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4.5rem; align-items: center; margin-top: 3.5rem; }
                .steps { display: flex; flex-direction: column; }
                .step { display: flex; gap: 1.1rem; padding: 1.4rem 0; border-bottom: 1px solid var(--rule); }
                .step:last-child { border-bottom: none; }
                .step-num { font-family: 'Lora', serif; font-size: 1.3rem; color: var(--accent); min-width: 2rem; margin-top: .1rem; flex-shrink: 0; }
                .step h3 { font-size: .9rem; font-weight: 600; margin-bottom: .3rem; }
                .step p { font-size: .83rem; color: var(--ink-muted); line-height: 1.65; font-weight: 300; }
                .mock { background: var(--ink); border-radius: 10px; overflow: hidden; box-shadow: 0 20px 56px rgba(0,0,0,.14); }
                .mock-bar { background: #181818; padding: .65rem 1rem; display: flex; align-items: center; gap: .45rem; border-bottom: 1px solid #222; }
                .mock-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
                .mock-url { margin-left: auto; font-size: .67rem; color: #3a3a3a; font-family: monospace; }
                .mock-body { padding: 1.35rem; }
                .mock-title-row { font-size: .67rem; color: rgba(255,255,255,.25); letter-spacing: .1em; text-transform: uppercase; margin-bottom: .9rem; }
                .mock-row { display: flex; align-items: center; gap: .7rem; padding: .65rem 0; border-bottom: 1px solid #1a1a1a; }
                .mock-row:last-child { border-bottom: none; }
                .mock-lbl { font-size: .75rem; color: rgba(255,255,255,.4); flex: 1; }
                .mock-track { flex: 2; height: 3px; background: #252525; border-radius: 2px; }
                .mock-fill { height: 100%; border-radius: 2px; background: var(--accent); }
                .mock-val { font-size: .72rem; color: var(--gold); font-family: monospace; min-width: 34px; text-align: right; }

                .features-s { background: var(--paper-dark); }
                .feat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.1rem; margin-top: 2.75rem; }
                .feat-card { background: var(--white); border: 1px solid var(--rule); border-radius: 8px; padding: 1.6rem; transition: transform .2s, box-shadow .2s; }
                .feat-card:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(0,0,0,.07); }
                .feat-icon { width: 38px; height: 38px; border-radius: 7px; background: var(--accent-pale); display: flex; align-items: center; justify-content: center; color: var(--accent); margin-bottom: .9rem; }
                .feat-card h3 { font-size: .9rem; font-weight: 600; margin-bottom: .35rem; }
                .feat-card p { font-size: .82rem; color: var(--ink-muted); line-height: 1.65; font-weight: 300; }

                .aud-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1.1rem; margin-top: 2.75rem; }
                .aud-card { border: 1px solid var(--rule); border-radius: 8px; padding: 1.6rem; background: var(--white); text-align: center; }
                .aud-icon { width: 46px; height: 46px; border-radius: 50%; background: var(--accent-pale); display: flex; align-items: center; justify-content: center; color: var(--accent); margin: 0 auto .9rem; }
                .aud-card h3 { font-size: .92rem; font-weight: 600; margin-bottom: .35rem; }
                .aud-card p { font-size: .8rem; color: var(--ink-muted); line-height: 1.6; font-weight: 300; }

                .dos-s { background: var(--ink); }
                .dos-s .sec-label { color: var(--gold); }
                .dos-s .sec-title { color: var(--white); }
                .dos-s .rule { background: var(--gold); }
                .dos-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.75rem; margin-top: 2.75rem; }
                .dos-col-title { font-size: .67rem; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; margin-bottom: 1.1rem; display: flex; align-items: center; gap: .45rem; }
                .can-t { color: #4ade80; }
                .cant-t { color: #f87171; }
                .dos-list { display: flex; flex-direction: column; gap: .55rem; }
                .di { display: flex; gap: .7rem; align-items: flex-start; padding: .8rem .95rem; border-radius: 6px; font-size: .83rem; line-height: 1.55; font-weight: 300; }
                .di.yes { background: rgba(74,222,128,.06); color: rgba(255,255,255,.68); }
                .di.no { background: rgba(248,113,113,.06); color: rgba(255,255,255,.42); }

                .plugin-s { background: var(--paper-dark); }
                .plugin-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center; margin-top: 3.5rem; }
                .arch { display: flex; flex-direction: column; align-items: center; }
                .kernel { background: var(--ink); color: var(--white); border-radius: 8px; padding: .9rem 2.25rem; text-align: center; font-family: monospace; font-size: .88rem; font-weight: 600; }
                .kernel-sub { font-size: .62rem; color: var(--gold); letter-spacing: .1em; text-transform: uppercase; margin-bottom: .2rem; }
                .arch-line { width: 1px; height: 26px; background: var(--rule); }
                .plugins-row { display: flex; gap: .65rem; flex-wrap: wrap; justify-content: center; margin-top: .5rem; }
                .plugin-chip { background: var(--white); border: 1px solid var(--rule); border-radius: 6px; padding: .5rem .9rem; font-size: .76rem; font-weight: 500; color: var(--ink-soft); display: flex; align-items: center; gap: .35rem; }
                .plugin-points { display: flex; flex-direction: column; gap: 1.35rem; }
                .pp h3 { font-size: .92rem; font-weight: 600; margin-bottom: .3rem; }
                .pp p { font-size: .83rem; color: var(--ink-muted); line-height: 1.65; font-weight: 300; }

                .vision-s { background: var(--accent); }
                .vision-s .sec-label { color: var(--gold); }
                .vision-s .sec-title { color: var(--white); }
                .vision-s .sec-desc { color: rgba(255,255,255,.7); max-width: 640px; }
                .vision-s .rule { background: var(--gold); }
                .vision-quote { font-family: 'Lora', serif; font-style: italic; font-size: clamp(1.4rem, 2.5vw, 2rem); color: var(--white); line-height: 1.4; border-top: 1px solid rgba(255,255,255,.18); padding-top: 2rem; margin-top: 2.75rem; max-width: 780px; }

                .cta-s { text-align: center; padding: 7rem 2rem; }
                .cta-s .sec-title { margin: 0 auto .75rem; }
                .cta-s .sec-desc { margin: 0 auto 2.25rem; text-align: center; }
                .cta-actions { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
                .btn-outline { border: 1.5px solid var(--ink); color: var(--ink); padding: .78rem 1.65rem; border-radius: 5px; font-weight: 600; font-size: .88rem; text-decoration: none; display: inline-flex; align-items: center; gap: .45rem; transition: background .2s, color .2s; }
                .btn-outline:hover { background: var(--ink); color: var(--white); }

                footer { background: var(--ink); color: rgba(255,255,255,.35); padding: 2.5rem 2rem; text-align: center; font-size: .8rem; font-weight: 300; }
                footer strong { color: rgba(255,255,255,.65); font-weight: 600; }
                .footer-links { display: flex; gap: 1.5rem; justify-content: center; margin-top: .75rem; flex-wrap: wrap; }
                .footer-links a { color: rgba(255,255,255,.35); text-decoration: none; font-size: .78rem; transition: color .2s; }
                .footer-links a:hover { color: rgba(255,255,255,.65); }

                @keyframes fu { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

                @media (max-width: 900px) {
                    .hero { grid-template-columns: 1fr; min-height: unset; }
                    .hero-l { padding: 7rem 1.75rem 3rem; }
                    .hero-l::after { display: none; }
                    .hero-r { padding: 2.5rem 1.75rem 4rem; }
                    .how-grid, .plugin-layout { grid-template-columns: 1fr; gap: 2.5rem; }
                    .dos-grid { grid-template-columns: 1fr; }
                    .nav-links { display: none; }
                    .hamburger { display: block; }
                }
                @media (max-width: 600px) {
                    section { padding: 4rem 1.25rem; }
                    .stat-grid { grid-template-columns: 1fr 1fr; }
                    .cta-s { padding: 5rem 1.25rem; }
                    nav { padding: 1rem 1.25rem; }
                }
            `}</style>

      {/* NAV */}
      <nav className={`nav${scrolled ? ' stuck' : ''}`}>
        <a href="#" className="nav-logo">Scholaro<span>Scope</span></a>
        <ul className="nav-links">
          <li><a href="#how">How It Works</a></li>
          <li><a href="#features">Features</a></li>
          <li><a href="#who">Who It&apos;s For</a></li>
          <li><a href="#vision">Vision</a></li>
          <li><Link href="/login" className="nav-btn">Log In <ArrowRight size={13} /></Link></li>
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
          <li><a href="#vision" onClick={() => setMenuOpen(false)}>Vision</a></li>
          <li><Link href="/login" className="nav-btn" onClick={() => setMenuOpen(false)}>Log In <ArrowRight size={13} /></Link></li>
        </ul>
      )}

      {/* HERO */}
      <div className="hero">
        <div className="hero-l">
          <p className="eyebrow"><span className="eyebrow-line" />Academic Execution Engine</p>
          <h1 className="hero-title">Teaching,<br /><em>made measurable.</em></h1>
          <p className="hero-sub">
            ScholaroScope helps teachers record what was taught, track how learners responded,
            and generate reports automatically — from any phone or browser.
          </p>
          <div className="hero-actions">
            <Link href="/login" className="btn-p">Get Started <ArrowRight size={15} /></Link>
            <a href="#how" className="btn-ghost">See how it works <ChevronDown size={14} /></a>
          </div>
          <p className="hero-badge">Version 5 · Under Active Development</p>
        </div>
        <div className="hero-r">
          <div className="stat-grid">
            <div className="stat-card"><div className="stat-num">v5</div><div className="stat-label">Current Build</div></div>
            <div className="stat-card"><div className="stat-num">1K+</div><div className="stat-label">Target Test Teachers</div></div>
            <div className="stat-card"><div className="stat-num">Any</div><div className="stat-label">Curriculum Supported</div></div>
            <div className="stat-card"><div className="stat-num">Free</div><div className="stat-label">For Teachers, Always</div></div>
          </div>
          <blockquote className="hero-quote">
            &ldquo;Not just a tool — a self-improvement loop for every teacher.&rdquo;
          </blockquote>
        </div>
      </div>

      {/* PROBLEM */}
      <section className="problem-s">
        <div className="container">
          <p className="sec-label">The Problem</p>
          <h2 className="sec-title" style={{ color: 'white' }}>Teaching without visibility is guesswork.</h2>
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
          <h2 className="sec-title" style={{ color: 'white' }}>Know what ScholaroScope is — and isn&apos;t.</h2>
          <div className="rule" />
          <div className="dos-grid">
            <div>
              <p className="dos-col-title can-t"><CheckCircle2 size={13} /> You can</p>
              <div className="dos-list">
                {dos.map(item => (
                  <div className="di yes" key={item}>
                    <CheckCircle2 size={14} color="#4ade80" style={{ flexShrink: 0, marginTop: 1 }} />
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
      <section className="plugin-s">
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

      {/* VISION */}
      <section className="vision-s" id="vision">
        <div className="container">
          <p className="sec-label">Philosophy &amp; Vision</p>
          <h2 className="sec-title">Education should be free and accessible.</h2>
          <div className="rule" />
          <p className="sec-desc">
            ScholaroScope is built on the belief that quality teaching tools should not be locked behind
            paywalls. The system will remain free for teachers — globally, without restriction.
            In the future, every teacher will have a verifiable performance profile built from real
            classroom data, not just degrees and certifications.
          </p>
          <blockquote className="vision-quote">
            &ldquo;By helping teachers understand and improve their teaching,
            ScholaroScope aims to improve education at every level.&rdquo;
          </blockquote>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-s">
        <div className="container">
          <p className="sec-label" style={{ textAlign: 'center' }}>Get Started</p>
          <h2 className="sec-title">Ready to bring clarity to your classroom?</h2>
          <div className="rule" style={{ margin: '1.1rem auto' }} />
          <p className="sec-desc">
            Join teachers already using ScholaroScope to record, track, and improve —
            from any device, any curriculum, any scale.
          </p>
          <div className="cta-actions">
            <Link href="/login" className="btn-p">Log In <ArrowRight size={15} /></Link>
            <a href="#how" className="btn-outline">Learn More <ChevronDown size={15} /></a>
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
        </div>
        <p style={{ marginTop: '1rem' }}>Built for teachers. Free, always.</p>
      </footer>
    </>
  );
}