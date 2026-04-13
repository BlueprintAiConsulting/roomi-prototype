import { useEffect, useRef } from 'react';
import './Landing.css';

export default function Landing({ onNavigate, onOpenOnboarding }) {
  const heroRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) entry.target.classList.add('in-view');
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing" id="landing-page">

      {/* ─── Hero ─── */}
      <section className="hero" ref={heroRef}>
        <div className="hero-bg">
          <div className="hero-orb hero-orb--amber" />
          <div className="hero-orb hero-orb--teal" />
          <div className="hero-grid" />
        </div>

        <div className="container hero-content">

          <div className="hero-fox-container reveal">
            <div className="hero-fox">
              <div className="hero-fox-glow" />
              <img src={`${import.meta.env.BASE_URL}roomi-logo-wide.png`} alt="ROOMI" className="hero-fox-logo" />
            </div>
          </div>

          <h1 className="hero-title reveal">
            Meet <span className="text-gradient">ROOMI</span>
          </h1>

          <p className="hero-subtitle reveal">
            Your co-pilot for everyday independence.
          </p>

          <p className="hero-description reveal">
            Not a chatbot. Not a tracker. Not a system. ROOMI is the daily companion that shows up for people with intellectual and developmental differences — knowing their name, their pace, and what a good day actually looks like for them.
          </p>

          <div className="hero-actions reveal">
            <button className="btn btn-primary btn-lg" onClick={onOpenOnboarding} id="hero-get-started">
              Meet your ROOMI
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => onNavigate('chat')} id="hero-try-demo">
              See it in action
            </button>
          </div>

          <div className="hero-social-proof reveal">
            <div className="hero-proof-item">
              <span className="hero-proof-number">Independence</span>
              <span className="hero-proof-label">at your pace</span>
            </div>
            <div className="hero-proof-divider" />
            <div className="hero-proof-item">
              <span className="hero-proof-number">Privacy</span>
              <span className="hero-proof-label">by design</span>
            </div>
            <div className="hero-proof-divider" />
            <div className="hero-proof-item">
              <span className="hero-proof-number">Dignity</span>
              <span className="hero-proof-label">always first</span>
            </div>
          </div>

          <div className="hero-scroll-cue reveal">
            <div className="scroll-line" />
            <span>Scroll to explore</span>
          </div>
        </div>
      </section>

      {/* ─── Mission ─── */}
      <section className="section mission" id="mission">
        <div className="container">
          <div className="mission-card glass-card reveal">
            <div className="mission-eyebrow">Our belief</div>
            <h2 className="mission-title">
              The right kind of support<br />
              <span className="text-gradient-teal">doesn't make you need it forever.</span>
            </h2>
            <p className="mission-text">
              ROOMI isn't a monitoring tool, a therapy app, or a safety net. It's a companion that shows up every day — helping people build routines, navigate hard moments, and grow into the independence they're already capable of.
            </p>
            <div className="mission-values">
              <div className="mission-value">
                <span className="mission-value-icon">🤝</span>
                <span>Partners, not patients</span>
              </div>
              <div className="mission-value">
                <span className="mission-value-icon">🔒</span>
                <span>Privacy by design</span>
              </div>
              <div className="mission-value">
                <span className="mission-value-icon">💪</span>
                <span>Built to step back</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="section how-it-works" id="how-it-works">
        <div className="container">
          <h2 className="section-title reveal">
            How <span className="text-gradient">ROOMI</span> shows up
          </h2>
          <p className="section-subtitle reveal">
            Every day, in the moments that matter most
          </p>

          <div className="hiw-grid">
            {[
              {
                n: '01', icon: '🌅', title: 'Morning Check-In',
                desc: 'ROOMI greets you by name, looks at the day ahead with you, and helps you start on your own terms. No pressure. Just a plan.',
              },
              {
                n: '02', icon: '💊', title: 'Reminders That Fit Your Life',
                desc: 'Meds, meals, appointments — ROOMI holds the thread so you don\'t have to. When it\'s time, it says so. Once. Warmly.',
              },
              {
                n: '03', icon: '💙', title: 'When Things Get Hard',
                desc: 'Sometimes a day gets overwhelming. ROOMI doesn\'t panic, doesn\'t lecture. It slows down with you, offers options, and lets you decide what\'s next.',
              },
              {
                n: '04', icon: '🌙', title: 'End-of-Day Reflection',
                desc: 'Before you close the day, ROOMI asks how it went — in your words. Not to measure. Just to listen, and remind you what you actually did.',
              },
            ].map((card, i) => (
              <div key={card.n} className="hiw-card glass-card reveal" style={{ transitionDelay: `${i * 0.08}s` }}>
                <div className="hiw-number">{card.n}</div>
                <div className="hiw-icon">{card.icon}</div>
                <h3>{card.title}</h3>
                <p>{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Demo Chat Preview ─── */}
      <section className="section demo-section" id="demo-section">
        <div className="container">
          <h2 className="section-title reveal">
            See ROOMI in <span className="text-gradient-teal">action</span>
          </h2>
          <p className="section-subtitle reveal">
            A real moment between Cassie and her ROOMI
          </p>

          <div className="demo-chat-preview glass-card reveal">
            <div className="demo-chat-header">
              <span className="demo-chat-fox">🦊</span>
              <div>
                <div className="demo-chat-name">ROOMI</div>
                <div className="demo-chat-status">
                  <span className="demo-chat-status-dot" />
                  with Cassie · this morning
                </div>
              </div>
            </div>
            <div className="demo-chat-messages">
              <div className="demo-msg demo-msg--roomi">
                <div className="demo-msg-avatar">🦊</div>
                <div className="demo-msg-bubble">Good morning, Cass. 🌅 Glad you're up. How are you feeling so far?</div>
              </div>
              <div className="demo-msg demo-msg--user">
                <div className="demo-msg-bubble">pretty good tbh</div>
              </div>
              <div className="demo-msg demo-msg--roomi">
                <div className="demo-msg-avatar">🦊</div>
                <div className="demo-msg-bubble">Love that. Quick look at today — meds at 8, drawing at 9, video call at 10:30. Want to start with meds now or take a few minutes first?</div>
              </div>
              <div className="demo-msg demo-msg--user">
                <div className="demo-msg-bubble">give me a few</div>
              </div>
              <div className="demo-msg demo-msg--roomi">
                <div className="demo-msg-avatar">🦊</div>
                <div className="demo-msg-bubble">Of course. I'll be here at 8:00. Enjoy your morning, Cass. 🦊</div>
              </div>
            </div>
            <div className="demo-chat-cta">
              <button className="btn btn-primary" onClick={() => onNavigate('chat')} id="demo-try-full">
                Try the full demo
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Relationship ─── */}
      <section className="section relationship" id="relationship-section">
        <div className="container">
          <h2 className="section-title reveal">
            Two views. <span className="text-gradient">One circle of trust.</span>
          </h2>
          <p className="section-subtitle reveal">
            ROOMI serves both the individual and their trusted support — without compromising either.
          </p>

          <div className="relationship-grid reveal">
            <div className="rel-card glass-card rel-card--individual">
              <div className="rel-card-icon">🧑</div>
              <h3>Individual</h3>
              <p>Your co-pilot. ROOMI knows your name, your pace, and what a good morning looks like for you. It's there every day — not to manage you, but to move with you.</p>
              <ul className="rel-features">
                <li>Morning &amp; evening check-ins</li>
                <li>Medication reminders</li>
                <li>Emotional support</li>
                <li>Schedule guidance</li>
                <li>Daily reflection</li>
              </ul>
            </div>

            <div className="rel-connector">
              <div className="rel-connector-line" />
              <div className="rel-connector-icon">🤝</div>
              <div className="rel-connector-label">Trust Bridge</div>
              <div className="rel-connector-line" />
            </div>

            <div className="rel-card glass-card rel-card--anchor">
              <div className="rel-card-icon">🏠</div>
              <h3>Anchor</h3>
              <p>Peace of mind without overreach. Anchors (caregivers, family, POA) see daily summaries — never live transcripts or surveillance.</p>
              <ul className="rel-features">
                <li>Daily summary view</li>
                <li>Medication log status</li>
                <li>Mood trends, not transcripts</li>
                <li>Quiet flags, not alarms</li>
                <li>Progress celebrations</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="section cta-section" id="cta-section">
        <div className="container">
          <div className="cta-card reveal">
            <div className="cta-glow" />
            <img src={`${import.meta.env.BASE_URL}roomi-logo-wide.png`} alt="ROOMI" className="cta-fox-img" />
            <h2>Ready when you are.</h2>
            <p>ROOMI doesn't rush. It doesn't push. It shows up every morning, remembers what matters to you, and gets a little better at being yours over time.</p>
            <div className="cta-actions">
              <button className="btn btn-primary btn-lg" onClick={onOpenOnboarding} id="cta-get-started">
                Start with ROOMI
              </button>
              <button className="btn btn-secondary btn-lg" onClick={() => onNavigate('anchor')} id="cta-anchor">
                I'm an Anchor — a family member or trusted support
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <img src={`${import.meta.env.BASE_URL}roomi-logo-wide.png`} alt="ROOMI" className="footer-logo" />
          </div>
          <div className="footer-tagline-row">
            Companion. Co-pilot. Partner.
          </div>
          <div className="footer-copy">
            © 2026 ROOMI · Built with dignity and care.
          </div>
        </div>
      </footer>
    </div>
  );
}
