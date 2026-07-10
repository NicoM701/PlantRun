export const panelStyles = String.raw`
        :host { display:block; min-height:100%; color:var(--primary-text-color,#e8ece8); font-family:var(--primary-font-family, system-ui, sans-serif); position:relative; }
        * { box-sizing:border-box; }
        button, input, select, textarea { font:inherit; }
        button { cursor:pointer; }
        .app.theme-dark {
          --primary-background-color:#121615;
          --card-background-color:#1a201e;
          --primary-text-color:#f1f5f1;
          --secondary-text-color:#a4aea7;
          --divider-color:#44504b;
          --success-color:#6cdb83;
          --surface-strong:#222a27;
          --surface-soft:#1c2421;
          --surface-raised:#27312d;
          --border-strong:#59665f;
          color-scheme:dark;
        }
        .app.theme-light {
          --primary-background-color:#f1f4ef;
          --card-background-color:#fbfcfa;
          --primary-text-color:#172019;
          --secondary-text-color:#5e6b61;
          --divider-color:#c6cec6;
          --success-color:#299447;
          --surface-strong:#ffffff;
          --surface-soft:#eef3eb;
          --surface-raised:#f3f7f1;
          --border-strong:#97a997;
          --hero-text:#102114;
          --hero-muted:#274430;
          color-scheme:light;
        }
        .shell { min-height:100vh; padding:20px clamp(12px,2vw,28px) 32px; background:
          radial-gradient(circle at 18% 0%, color-mix(in srgb, var(--success-color,#2fc46b) 18%, transparent), transparent 32%),
          linear-gradient(180deg, color-mix(in srgb, var(--card-background-color,#171b1c) 92%, #123021), var(--primary-background-color,#111416)); }
        .app.theme-light .shell { background:
          radial-gradient(circle at 12% 0%, rgba(80, 170, 95, .18), transparent 34%),
          radial-gradient(circle at 100% 0%, rgba(255,255,255,.7), transparent 28%),
          linear-gradient(180deg, #fafbf9 0%, var(--primary-background-color,#f1f4ef) 54%, #e9eee8 100%); }
        .topbar { display:grid; grid-template-columns:minmax(220px,1fr) auto minmax(220px,1fr); align-items:center; gap:16px; max-width:1360px; margin:0 auto 16px; }
        .brand, .top-actions, nav, .hero-actions, .block-head, .inline-form, .sensor-head { display:flex; align-items:center; gap:10px; }
        .brand { min-width:0; }
        .brand-mark, .plant-mark { display:grid; place-items:center; width:42px; height:42px; border-radius:14px; background:color-mix(in srgb, var(--success-color,#31c76b) 18%, var(--card-background-color,#1b2020)); color:var(--success-color,#31c76b); box-shadow:inset 0 1px rgba(255,255,255,.16); overflow:hidden; }
        .brand-mark svg { width:22px; height:22px; overflow:visible; }
        .brand-mark .sprout-stem, .brand-mark .sprout-left, .brand-mark .sprout-right, .brand-mark .sprout-leaf { transform-origin:center; transition:transform .35s cubic-bezier(.2,.9,.2,1), opacity .25s ease; }
        .brand:hover .brand-mark .sprout-left { transform:rotate(-12deg) translate(-1px, -1px); }
        .brand:hover .brand-mark .sprout-right { transform:rotate(12deg) translate(1px, -1px); }
        .brand:hover .brand-mark .sprout-stem { transform:translateY(-1px) scaleY(1.04); }
        .brand:hover .brand-mark .sprout-leaf { transform:translateY(-1px) scale(1.04); }
        .brand-mark .accent { opacity:.72; }
        .brand strong { display:block; font-size:19px; }
        .brand span:last-child, .hint, small, .run-row-main span, .eyebrow { color:var(--secondary-text-color,#98a29a); }
        nav { justify-content:center; padding:4px; border-radius:999px; background:color-mix(in srgb, var(--card-background-color,#1f2424) 82%, transparent); border:1px solid color-mix(in srgb, var(--divider-color,#4b5551) 55%, transparent); }
        nav button { border:0; border-radius:999px; padding:8px 13px; background:transparent; color:var(--secondary-text-color,#98a29a); text-transform:capitalize; display:flex; align-items:center; gap:7px; }
        nav button small { display:grid; place-items:center; min-width:20px; height:20px; padding:0 6px; border-radius:999px; background:color-mix(in srgb, currentColor 10%, transparent); color:inherit; font-size:10px; font-weight:800; }
        nav button.active { color:var(--primary-text-color,#fff); background:color-mix(in srgb, var(--primary-text-color,#fff) 10%, transparent); }
        .top-actions { justify-content:flex-end; }
        main { max-width:1360px; margin:0 auto; display:grid; grid-template-columns:286px minmax(0,1fr); gap:16px; }
        .sidebar, .detail, .panel-block, .modal { border:1px solid color-mix(in srgb, var(--divider-color,#4b5551) 55%, transparent); background:color-mix(in srgb, var(--card-background-color,#1c2121) 88%, transparent); box-shadow:0 18px 50px rgba(0,0,0,.18); backdrop-filter:blur(18px); }
        .app.theme-light .sidebar, .app.theme-light .detail, .app.theme-light .panel-block, .app.theme-light .modal { background:rgba(255,255,255,.92); border-color:color-mix(in srgb, var(--border-strong,#97a997) 72%, white); }
        .sidebar { min-height:calc(100vh - 106px); border-radius:24px; padding:10px; display:flex; flex-direction:column; gap:8px; }
        .run-list-head { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:8px 8px 10px; border-bottom:1px solid color-mix(in srgb, var(--divider-color,#52605a) 38%, transparent); margin-bottom:2px; }
        .run-list-head strong, .run-list-head span { display:block; }
        .run-row { width:100%; border:0; display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:12px; text-align:left; padding:12px; border-radius:18px; background:transparent; color:inherit; transition:transform .18s ease, background .18s ease; }
        .run-row:hover { transform:translateY(-1px); background:color-mix(in srgb, var(--primary-text-color,#fff) 7%, transparent); }
        .run-row.selected { background:color-mix(in srgb, var(--success-color,#31c76b) 16%, transparent); }
        .run-row-main { min-width:0; }
        .run-row-main strong, .run-row-main span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:block; }
        .stage-dot { width:12px; height:32px; border-radius:999px; background:#7fdb83; box-shadow:0 0 20px rgba(88,210,116,.45); }
        .stage-dot.veg { background:#35b968; } .stage-dot.flower { background:#d9b45d; } .stage-dot.harvest { background:#b98d68; }
        .ring { --progress:0; display:grid; place-items:center; width:48px; height:48px; border-radius:50%; font-size:11px; font-weight:700; background:conic-gradient(var(--success-color,#31c76b) calc(var(--progress) * 1%), color-mix(in srgb, var(--divider-color,#52605a) 50%, transparent) 0); position:relative; }
        .ring:after { content:""; position:absolute; inset:5px; border-radius:inherit; background:var(--card-background-color,#1c2121); z-index:-0; }
        .ring { isolation:isolate; }
        .detail { min-height:calc(100vh - 106px); border-radius:26px; padding:12px; overflow:hidden; }
        .hero { position:relative; min-height:188px; border-radius:20px; padding:22px; display:flex; justify-content:space-between; gap:20px; overflow:hidden; background:linear-gradient(135deg, color-mix(in srgb, var(--success-color,#31c76b) 20%, #101615), color-mix(in srgb, var(--card-background-color,#202524) 90%, #223928)); }
        .hero.flower { background:linear-gradient(135deg, rgba(95,73,34,.72), color-mix(in srgb, var(--card-background-color,#202524) 92%, #2b2416)); }
        .hero.has-image { background-image:linear-gradient(135deg, rgba(9,18,11,.72), rgba(12,25,15,.42) 52%, rgba(8,15,10,.78)), var(--hero-image); background-size:cover, cover; background-position:center, center; background-repeat:no-repeat, no-repeat; }
        .hero.has-image.flower { background-image:linear-gradient(135deg, rgba(48,34,12,.68), rgba(67,52,23,.36) 52%, rgba(34,23,9,.74)), var(--hero-image); }
        .app.theme-light .hero { background:linear-gradient(135deg, #d9efdc 0%, #edf7ee 48%, #e3efe2 100%); color:var(--hero-text,#102114); border:1px solid rgba(116, 149, 118, .28); box-shadow:inset 0 1px rgba(255,255,255,.9); }
        .app.theme-light .hero.flower { background:linear-gradient(135deg, #f1e3c8 0%, #faf4e9 52%, #ecdfc1 100%); }
        .app.theme-light .hero.has-image { background-image:linear-gradient(135deg, rgba(241,248,242,.72), rgba(230,241,232,.46) 48%, rgba(217,232,219,.8)), var(--hero-image); }
        .app.theme-light .hero.has-image.flower { background-image:linear-gradient(135deg, rgba(248,242,233,.74), rgba(242,232,214,.48) 48%, rgba(233,220,193,.82)), var(--hero-image); }
        .hero h1 { margin:8px 0; font-size:clamp(32px,3.2vw,52px); line-height:1; letter-spacing:-.035em; max-width:780px; }
        .hero p { margin:0; color:color-mix(in srgb, var(--primary-text-color,#fff) 72%, transparent); font-size:16px; }
        .app.theme-light .hero p, .app.theme-light .hero .eyebrow { color:var(--hero-muted,#274430); }
        .hero-actions { align-self:flex-start; flex-wrap:wrap; justify-content:flex-end; z-index:1; }
        .stage-glyph { position:absolute; right:18px; bottom:-34px; color:rgba(255,255,255,.09); --mdc-icon-size:176px; transform:rotate(-8deg); pointer-events:none; }
        .app.theme-light .stage-glyph { color:rgba(41, 86, 51, .14); }
        .stat-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin:12px 0; }
        .stat-grid div { padding:15px 16px; border-radius:18px; background:color-mix(in srgb, var(--primary-text-color,#fff) 6%, transparent); }
        .app.theme-light .stat-grid div { background:rgba(255,255,255,.78); border:1px solid rgba(126, 150, 127, .18); }
        .stat-grid span { display:block; color:var(--secondary-text-color,#98a29a); font-size:12px; margin-bottom:4px; }
        .stat-grid strong { font-size:20px; }
        .content-grid { display:grid; grid-template-columns:1.35fr .65fr; gap:12px; align-items:start; margin-top:12px; }
        .panel-block { border-radius:22px; padding:18px; }
        .panel-block h2, .modal h2 { margin:2px 0 0; font-size:18px; }
        .eyebrow { text-transform:uppercase; letter-spacing:.12em; font-size:11px; font-weight:800; }
        .sensor-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(205px,1fr)); gap:10px; margin-top:12px; }
        .sensor-tile { border-radius:20px; padding:14px; background:linear-gradient(180deg, color-mix(in srgb, var(--primary-text-color,#fff) 7%, transparent), color-mix(in srgb, var(--primary-text-color,#fff) 4%, transparent)); border:1px solid color-mix(in srgb, var(--divider-color,#52605a) 38%, transparent); transition:transform .18s ease, border-color .18s ease, box-shadow .18s ease; user-select:none; touch-action:manipulation; box-shadow:inset 0 1px rgba(255,255,255,.06); }
        .app.theme-light .sensor-tile { background:linear-gradient(180deg, #ffffff 0%, var(--surface-raised,#f3f7f1) 100%); border-color:rgba(126, 150, 127, .26); box-shadow:0 10px 24px rgba(40, 69, 44, .08), inset 0 1px rgba(255,255,255,.95); }
        .sensor-tile:hover, .sensor-tile.pulse { transform:translateY(-2px); border-color:color-mix(in srgb, var(--success-color,#31c76b) 52%, transparent); box-shadow:0 14px 28px rgba(0,0,0,.16), inset 0 1px rgba(255,255,255,.08); }
        .app.theme-light .sensor-tile:hover, .app.theme-light .sensor-tile.pulse { box-shadow:0 16px 30px rgba(40, 69, 44, .13), inset 0 1px rgba(255,255,255,.95); }
        .metric-badge { display:grid; place-items:center; width:34px; height:34px; border-radius:12px; background:color-mix(in srgb, var(--success-color,#31c76b) 16%, transparent); color:var(--success-color,#31c76b); }
        .sensor-tile strong, .sensor-tile small, .sensor-state { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .sensor-state { margin-top:8px; font-size:26px; font-weight:800; letter-spacing:-.03em; }
        .recorder-link { display:grid; gap:6px; margin-top:16px; padding-top:12px; border-top:1px solid color-mix(in srgb, var(--divider-color,#52605a) 38%, transparent); color:var(--secondary-text-color,#98a29a); font-size:11px; }
        .recorder-link span, .recorder-link strong { display:flex; align-items:center; gap:6px; }
        .recorder-link strong { color:var(--success-color,#31c76b); font-size:12px; }
        .sensor-meta { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:10px; color:var(--secondary-text-color,#98a29a); font-size:12px; }
        .sensor-meta span:last-child { display:inline-flex; align-items:center; gap:5px; }
        .spark { height:54px; display:flex; align-items:end; gap:4px; margin-top:12px; }
        .spark span { flex:1; min-width:4px; border-radius:999px 999px 4px 4px; background:linear-gradient(180deg, var(--success-color,#31c76b), rgba(49,199,107,.22)); }
        .phase-list, .binding-editor { display:grid; gap:12px; }
        .note-list { display:grid; gap:14px; margin-top:10px; }
        .phase-stepper { display:grid; gap:10px; margin-top:6px; }
        .phase-step { width:100%; display:grid; grid-template-columns:38px minmax(0,1fr); gap:12px; align-items:center; padding:12px 14px; border-radius:18px; border:1px solid color-mix(in srgb, var(--divider-color,#52605a) 45%, transparent); background:color-mix(in srgb, var(--primary-text-color,#fff) 5%, transparent); color:inherit; text-align:left; }
        .app.theme-light .phase-step, .app.theme-light .note { border-color:rgba(126, 150, 127, .24); box-shadow:0 6px 16px rgba(40, 69, 44, .05); }
        .phase-step span { display:grid; place-items:center; width:38px; height:38px; border-radius:50%; font-weight:800; background:color-mix(in srgb, var(--primary-text-color,#fff) 9%, transparent); }
        .app.theme-light .phase-step span { background:#eef4ec; color:#294232; }
        .phase-step.done span, .phase-step.current span { background:color-mix(in srgb, var(--success-color,#31c76b) 22%, transparent); color:var(--success-color,#31c76b); }
        .phase-step.current { border-color:color-mix(in srgb, var(--success-color,#31c76b) 45%, transparent); box-shadow:0 0 0 1px color-mix(in srgb, var(--success-color,#31c76b) 24%, transparent); }
        .phase-step small { display:block; margin-top:3px; color:var(--secondary-text-color,#98a29a); }
        .custom-phase-control { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:10px; align-items:end; margin-top:14px; padding-top:14px; border-top:1px solid color-mix(in srgb, var(--divider-color,#52605a) 38%, transparent); }
        .note { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:14px; align-items:start; padding:18px 18px 16px; border-radius:22px; background:color-mix(in srgb, var(--primary-text-color,#fff) 5%, transparent); }
        .note-copy { display:grid; gap:10px; }
        .note p { margin:0; line-height:1.55; white-space:pre-wrap; }
        .note small { display:block; }
        .note-actions { display:flex; gap:8px; }
        .notes-block { grid-column:1 / -1; margin-top:4px; }
        .density-compact .hero { min-height:154px; }
        .density-compact .panel-block { padding:14px; }
        .density-compact .sensor-tile { padding:12px; }
        .density-compact .stat-grid div { padding:11px 13px; }
        .empty-panel, .empty-detail, .empty-inline { display:grid; place-items:center; align-content:center; gap:12px; min-height:220px; text-align:center; color:var(--secondary-text-color,#98a29a); padding:22px; }
        .empty-inline { min-height:130px; border:1px dashed color-mix(in srgb, var(--divider-color,#52605a) 60%, transparent); border-radius:18px; }
        button.primary, button.ghost, .icon-button { border:1px solid color-mix(in srgb, var(--divider-color,#52605a) 55%, transparent); min-height:38px; border-radius:14px; display:inline-flex; align-items:center; justify-content:center; gap:8px; color:inherit; transition:transform .16s ease, background .16s ease, border-color .16s ease, box-shadow .16s ease; }
        button.primary { background:linear-gradient(180deg, color-mix(in srgb, var(--success-color,#31c76b) 88%, white 12%), var(--success-color,#31c76b)); color:#07110b; border-color:transparent; font-weight:800; padding:0 15px; box-shadow:0 10px 24px rgba(49,199,107,.22); }
        button.ghost { background:color-mix(in srgb, var(--primary-text-color,#fff) 7%, transparent); padding:0 13px; }
        .icon-button { width:38px; background:color-mix(in srgb, var(--primary-text-color,#fff) 7%, transparent); padding:0; }
        .app.theme-light button.ghost, .app.theme-light .icon-button, .app.theme-light input, .app.theme-light select, .app.theme-light textarea, .app.theme-light .history-row, .app.theme-light .history-window-pill, .app.theme-light .phase-step, .app.theme-light .note, .app.theme-light .run-row:hover { background:var(--surface-strong,#fff); }
        .app.theme-light button.ghost, .app.theme-light .icon-button, .app.theme-light input, .app.theme-light select, .app.theme-light textarea { border-color:rgba(126, 150, 127, .32); color:var(--primary-text-color,#18211a); box-shadow:0 4px 14px rgba(40, 69, 44, .06); }
        .app.theme-light .hero-actions button.ghost, .app.theme-light .hero-actions .icon-button { background:rgba(255,255,255,.86); border-color:rgba(116, 149, 118, .34); }
        .app.theme-light nav { background:var(--surface-soft,#edf3ec); }
        .app.theme-light nav button { color:#41523f; }
        .app.theme-light nav button.active, .app.theme-light .run-row.selected { background:color-mix(in srgb, var(--success-color,#41c85f) 18%, var(--surface-strong,#fff)); color:#19341f; }
        .app.theme-light .panel-block, .app.theme-light .detail, .app.theme-light .sidebar, .app.theme-light .modal { box-shadow:0 14px 34px rgba(44,70,51,.08); }
        button:hover { transform:translateY(-1px); }
        button:disabled { opacity:.45; cursor:not-allowed; transform:none; }
        .danger { color:var(--error-color,#ef5350); }
        .finish-action { color:var(--success-color,#31c76b); }
        .animated ha-icon { transition:transform .28s cubic-bezier(.2,.8,.2,1); }
        .animated:hover ha-icon { transform:rotate(-18deg) scale(1.08); }
        input, select, textarea { width:100%; border:1px solid color-mix(in srgb, var(--divider-color,#52605a) 55%, transparent); border-radius:14px; min-height:42px; padding:10px 12px; background:var(--surface-strong, color-mix(in srgb, var(--primary-text-color,#fff) 7%, transparent)); color:var(--primary-text-color,#fff); outline:none; }
        select, option, optgroup { background:var(--surface-strong,#232928); color:var(--primary-text-color,#edf2ec); }
        select:hover, textarea:hover, input:hover { border-color:color-mix(in srgb, var(--success-color,#31c76b) 28%, var(--divider-color,#52605a)); }
        textarea { min-height:90px; resize:vertical; }
        input:focus, select:focus, textarea:focus { border-color:var(--success-color,#31c76b); box-shadow:0 0 0 3px color-mix(in srgb, var(--success-color,#31c76b) 18%, transparent); }
        .overlay { position:absolute; inset:0; z-index:20; display:grid; place-items:center; padding:22px; }
        .overlay-backdrop { position:absolute; inset:0; border:0; background:rgba(0,0,0,.34); backdrop-filter:blur(8px); }
        .modal { width:min(760px,100%); max-height:min(820px,calc(100vh - 44px)); overflow:auto; border-radius:26px; padding:18px; }
        .wizard-modal { width:min(700px,100%); }
        .modal.compact { width:min(560px,100%); }
        .modal, .detail, .sidebar, .panel-block { position:relative; z-index:1; }
        .modal header, .modal footer { display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .modal footer { margin-top:16px; justify-content:flex-end; }
        .form-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin-top:16px; }
        .form-grid.single-column { grid-template-columns:1fr; }
        label { display:grid; gap:7px; color:var(--secondary-text-color,#98a29a); font-size:13px; font-weight:700; }
        label em { margin-left:6px; color:var(--success-color,#31c76b); font-size:10px; font-style:normal; text-transform:uppercase; letter-spacing:.08em; }
        label input, label select, label textarea, label .ha-entity-selector { color:var(--primary-text-color,#fff); font-weight:500; }
        .app.theme-light label input, .app.theme-light label select, .app.theme-light label textarea, .app.theme-light label .ha-entity-selector { color:var(--primary-text-color,#18211a); }
        .field-hint { margin:6px 2px 0; color:var(--secondary-text-color,#98a29a); font-size:12px; font-weight:600; }
        .field-hint.warning { color:#f4b25e; }
        label.wide, .search-field { grid-column:1 / -1; }
        .suggestions { display:grid; gap:6px; }
        .suggestion-state { padding:10px 12px; border-radius:14px; background:color-mix(in srgb, var(--success-color,#31c76b) 10%, transparent); color:var(--secondary-text-color,#98a29a); font-size:13px; font-weight:700; }
        .suggestions button { border:0; border-radius:14px; padding:10px 12px; background:color-mix(in srgb, var(--success-color,#31c76b) 12%, transparent); color:inherit; text-align:left; display:grid; gap:2px; transition:transform .14s ease, background .14s ease; }
        .suggestions button:hover { transform:translateY(-1px); background:color-mix(in srgb, var(--success-color,#31c76b) 18%, transparent); }
        .binding-edit-row { display:grid; grid-template-columns:160px minmax(0,1fr) 38px; gap:10px; align-items:center; }
        .wizard-progress { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin:18px 0; }
        .wizard-progress div { position:relative; display:flex; align-items:center; gap:8px; color:var(--secondary-text-color,#98a29a); }
        .wizard-progress div:not(:last-child):after { content:""; height:1px; flex:1; background:color-mix(in srgb, var(--divider-color,#52605a) 55%, transparent); }
        .wizard-progress span { display:grid; place-items:center; width:28px; height:28px; flex:0 0 auto; border-radius:50%; background:var(--surface-soft,#1c2221); border:1px solid color-mix(in srgb, var(--divider-color,#52605a) 55%, transparent); font-size:11px; font-weight:800; }
        .wizard-progress .current, .wizard-progress .done { color:var(--primary-text-color,#fff); }
        .wizard-progress .current span, .wizard-progress .done span { background:var(--success-color,#31c76b); color:#07110b; border-color:transparent; }
        .step-intro { display:flex; align-items:flex-start; gap:13px; padding:14px; border-radius:18px; background:color-mix(in srgb, var(--success-color,#31c76b) 9%, transparent); }
        .step-intro p { margin:4px 0 0; color:var(--secondary-text-color,#98a29a); line-height:1.45; font-size:13px; }
        .step-icon { display:grid; place-items:center; width:38px; height:38px; flex:0 0 auto; border-radius:13px; background:color-mix(in srgb, var(--success-color,#31c76b) 18%, transparent); color:var(--success-color,#31c76b); }
        .form-error { display:flex; align-items:center; gap:8px; margin:12px 0 0; padding:10px 12px; border-radius:12px; background:color-mix(in srgb, var(--error-color,#ef5350) 12%, transparent); color:var(--error-color,#ef5350); font-size:13px; font-weight:700; }
        .recorder-callout { display:flex; align-items:center; gap:12px; padding:14px; border-radius:16px; background:color-mix(in srgb, var(--success-color,#31c76b) 9%, transparent); color:var(--success-color,#31c76b); }
        .recorder-callout > ha-icon { --mdc-icon-size:30px; }
        .recorder-callout strong, .recorder-callout span { display:block; }
        .recorder-callout span { margin-top:3px; color:var(--secondary-text-color,#98a29a); font-size:12px; }
        .confirm-copy { margin:16px 0 0; color:var(--secondary-text-color,#98a29a); line-height:1.5; }
        .history-modal { display:grid; gap:14px; }
        .history-summary { display:grid; gap:8px; }
        .phase-confirm-modal { display:grid; gap:16px; }
        .history-summary p { margin:0; }
        .history-window-pill { display:flex; align-items:center; flex-wrap:wrap; gap:8px; padding:10px 12px; border-radius:14px; background:color-mix(in srgb, var(--primary-text-color,#fff) 6%, transparent); }
        .app.theme-light .history-window-pill { border:1px solid rgba(126, 150, 127, .22); }
        .history-window-pill span { display:inline-flex; align-items:center; gap:6px; }
        .history-status { display:inline-flex; align-items:center; width:max-content; max-width:100%; padding:7px 10px; border-radius:999px; font-size:12px; font-weight:700; }
        .history-status.bound { background:rgba(49,199,107,.12); color:var(--success-color,#31c76b); }
        .history-status.orphaned { background:rgba(255,167,38,.14); color:#f4b25e; }
        .error-text { color:#f4b25e; }
        .history-list { display:grid; gap:8px; max-height:280px; overflow:auto; }
        .history-modal footer { display:flex; flex-wrap:wrap; gap:10px; }
        .history-row { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:11px 12px; border-radius:14px; background:color-mix(in srgb, var(--primary-text-color,#fff) 5%, transparent); }
        .entity-fallback { display:none; }
        .entity-fallback, .ha-entity-selector { background:var(--surface-strong,#232928); color:var(--primary-text-color,#edf2ec); }
        .app.theme-light .entity-fallback, .app.theme-light .ha-entity-selector, .app.theme-light select, .app.theme-light option, .app.theme-light optgroup { background:var(--surface-strong,#fff); color:var(--primary-text-color,#18211a); }
        .ha-entity-selector:not(:defined) + .entity-fallback { display:block; }
        .ha-entity-selector:not(:defined) { display:none; }
        @media (max-width: 960px) {
          .shell { padding:10px; }
          .topbar, main, .content-grid, .stat-grid { grid-template-columns:1fr; }
          nav { order:3; width:100%; }
          .top-actions { justify-content:flex-start; flex-wrap:wrap; }
          .sidebar, .detail { min-height:auto; }
          .hero { min-height:220px; flex-direction:column; }
          .form-grid, .binding-edit-row, .custom-phase-control { grid-template-columns:1fr; }
        }
        @media (max-width: 620px) {
          .topbar { gap:12px; }
          .brand span:last-child, .top-actions [data-action="toggle-sound"] { display:none; }
          nav { overflow:auto; justify-content:flex-start; }
          .hero { min-height:210px; padding:18px; }
          .stat-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
          .sensor-grid { grid-template-columns:1fr; }
          .wizard-progress small { display:none; }
          .wizard-progress div { gap:4px; }
          .modal { border-radius:22px; padding:16px; }
        }`;

