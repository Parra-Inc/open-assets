/**
 * The template-to-assets fan-out from assets/banner.html, ported to JSX so it
 * stays crisp at any size. Authored on a fixed 620x640 canvas; the wrapper
 * scales it with CSS `zoom` per breakpoint (see .art-frame in globals.css).
 */
export default function HeroArt() {
  return (
    <div className="art-frame" aria-hidden="true">
      <div className="art">
        <svg className="connectors" width="620" height="640" viewBox="0 0 620 640" fill="none">
          <defs>
            <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="rgba(167,139,250,0.05)" />
              <stop offset="0.5" stopColor="rgba(167,139,250,0.45)" />
              <stop offset="1" stopColor="rgba(167,139,250,0.7)" />
            </linearGradient>
            <linearGradient id="lineDown" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="rgba(167,139,250,0.05)" />
              <stop offset="1" stopColor="rgba(167,139,250,0.7)" />
            </linearGradient>
          </defs>
          <path className="flow" d="M 218 288 C 300 288, 310 210, 388 210" stroke="url(#line)" strokeWidth="1.5" />
          <path className="flow" d="M 218 312 C 268 316, 250 466, 292 472" stroke="url(#line)" strokeWidth="1.5" />
          <path className="flow" d="M 218 300 C 330 306, 340 488, 420 490" stroke="url(#line)" strokeWidth="1.5" />
          <path className="flow" d="M 110 352 C 108 396, 106 432, 104 462" stroke="url(#lineDown)" strokeWidth="1.5" />
          <circle cx="388" cy="210" r="3" fill="#a78bfa" />
          <circle cx="292" cy="472" r="3" fill="#a78bfa" />
          <circle cx="420" cy="490" r="3" fill="#a78bfa" />
          <circle cx="104" cy="464" r="3" fill="#a78bfa" />
        </svg>

        <div className="code-card">
          <div className="code-chrome">
            <span className="dot dot-r" />
            <span className="dot dot-y" />
            <span className="dot dot-g" />
            <span className="code-filename">01-hero.html</span>
          </div>
          <div className="code-body">
            <span className="c-tag">&lt;h1</span> <span className="c-attr">class</span>
            <span className="c-dim">=</span>
            <span className="c-str">&quot;hero&quot;</span>
            <span className="c-tag">&gt;</span>
            {'\n  '}
            <span className="c-txt">{'{{headline}}'}</span>
            {'\n'}
            <span className="c-tag">&lt;/h1&gt;</span>
            {'\n'}
            <span className="c-tag">&lt;img</span> <span className="c-attr">src</span>
            <span className="c-dim">=</span>
            <span className="c-str">&quot;app.png&quot;</span>
            <span className="c-tag">/&gt;</span>
          </div>
        </div>

        <div className="phone-stack">
          <div className="phone-ghost phone-ghost-1" />
          <div className="phone-ghost phone-ghost-2" />
          <div className="phone">
            <div className="phone-headline">
              Hello, <span className="phone-highlight">App Store</span>
            </div>
            <div className="phone-screen">
              <div className="app-row">
                <div className="app-avatar" />
                <div className="app-line" style={{ width: '60%' }} />
              </div>
              <div className="app-card app-card-tall" />
              <div className="app-card">
                <div className="app-line" style={{ width: '80%', marginBottom: 5 }} />
                <div className="app-line" style={{ width: '50%' }} />
              </div>
              <div className="app-card">
                <div className="app-line" style={{ width: '70%' }} />
              </div>
            </div>
          </div>
        </div>
        <div className="out-label" style={{ left: 392, top: 382 }}>
          iphone-6.9 · 1320×2868
        </div>
        <div className="locales">
          <span className="locale-pill">EN</span>
          <span className="locale-pill">日本語</span>
          <span className="locale-pill">عربي</span>
          <span className="locale-pill">+33</span>
        </div>

        <div className="icon-out">
          <div className="icon-sun" />
          <div className="icon-mtn-back" />
          <div className="icon-mtn-front" />
        </div>
        <div className="out-label" style={{ left: 296, top: 532 }}>
          AppIcon · 1024
        </div>

        <div className="favicon-row">
          {['fav-48', 'fav-32', 'fav-20'].map((size) => (
            <div key={size} className={`fav ${size}`}>
              <div className="fav-dot" />
              <div className="fav-mtn" />
            </div>
          ))}
        </div>
        <div className="out-label" style={{ left: 52, top: 532 }}>
          favicon · 48 · 32 · 16
        </div>

        <div className="og-out">
          <div className="og-mark" />
          <div className="og-line" style={{ width: '85%' }} />
          <div className="og-line og-line-2" />
        </div>
        <div className="out-label" style={{ left: 424, top: 554 }}>
          og · 1200×630
        </div>
      </div>
    </div>
  )
}
