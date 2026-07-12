export const panelStyles = () => `
  :host { display:block; min-height:100%; position:relative; color-scheme:light dark; }
  * { box-sizing:border-box; }
  button, input, select, textarea { font:inherit; }
  button { cursor:pointer; }
  .app { --green:#4db96d; --green-strong:#237a45; --lime:#dff49d; --ink:#183126; --muted:#718078; --canvas:#f3f1e9; --paper:#fffefa; --soft:#e8eee5; --line:rgba(38,73,53,.13); min-height:100vh; padding:18px; color:var(--ink); background:var(--canvas); font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; transition:background .2s ease,color .2s ease; }
  .app.theme-light { --canvas:#f2f0e8; --paper:#fffefa; --soft:#e9eee5; --ink:#173126; --muted:#6f7d76; --line:rgba(38,73,53,.13); --shadow:0 18px 50px rgba(37,62,47,.08); }
  .app.theme-dark { --canvas:#111915; --paper:#18221d; --soft:#202d26; --ink:#edf4ee; --muted:#98a99f; --line:rgba(220,240,226,.1); --lime:#364b2b; --green:#62c77e; --shadow:0 22px 55px rgba(0,0,0,.24); }
  .shell { max-width:1440px; margin:0 auto; }
  .topbar { height:66px; display:flex; align-items:center; justify-content:space-between; gap:16px; padding:0 8px 16px; }
  .brand { display:flex; align-items:center; gap:11px; padding:0; border:0; background:transparent; color:inherit; text-align:left; }
  .brand-mark { display:grid; place-items:center; width:39px; height:39px; border-radius:14px; color:var(--paper); background:var(--green-strong); }
  .brand-mark svg { width:25px; height:25px; }
  .brand strong,.brand span { display:block; }
  .brand strong { font-family:Georgia,"Times New Roman",serif; font-size:20px; letter-spacing:-.02em; }
  .brand div span { margin-top:1px; color:var(--muted); font-size:11px; }
  .top-actions,.hero-actions,.block-head,.sensor-head,.sensor-actions,.note-actions { display:flex; align-items:center; gap:8px; }
  main { min-height:calc(100vh - 102px); }
  h1,h2,p { margin-top:0; }
  h1,h2 { font-family:Georgia,"Times New Roman",serif; font-weight:600; letter-spacing:-.035em; }
  .eyebrow { display:block; margin-bottom:7px; color:var(--green-strong); font-size:10px; font-weight:850; letter-spacing:.17em; text-transform:uppercase; }
  .theme-dark .eyebrow { color:var(--green); }
  .welcome-row { display:flex; align-items:end; justify-content:space-between; gap:30px; padding:clamp(24px,4vw,56px) clamp(18px,4vw,58px) 34px; }
  .welcome-row h1 { max-width:850px; margin-bottom:12px; font-size:clamp(40px,5.5vw,76px); line-height:.98; }
  .welcome-row p { max-width:620px; margin:0; color:var(--muted); font-size:15px; line-height:1.6; }
  .overview-strip { display:grid; grid-template-columns:repeat(4,1fr); gap:1px; overflow:hidden; border:1px solid var(--line); border-radius:24px; background:var(--line); box-shadow:var(--shadow); }
  .overview-stat { min-height:124px; padding:22px 24px; background:var(--paper); }
  .overview-stat.accent { background:var(--lime); color:#213723; }
  .overview-stat span,.overview-stat small,.overview-stat strong { display:block; }
  .overview-stat span { color:var(--muted); font-size:11px; }
  .overview-stat.accent span,.overview-stat.accent small { color:#607054; }
  .theme-dark .overview-stat.accent { color:var(--ink); background:#294833; }
  .theme-dark .overview-stat.accent span,.theme-dark .overview-stat.accent small { color:#b4c6b9; }
  .overview-stat strong { margin:9px 0 6px; overflow:hidden; font-family:Georgia,"Times New Roman",serif; font-size:27px; text-overflow:ellipsis; white-space:nowrap; }
  .overview-stat small { color:var(--muted); font-size:11px; }
  .section-heading { display:flex; align-items:end; justify-content:space-between; gap:20px; margin:38px 3px 17px; }
  .section-heading h2 { margin:0; font-size:31px; }
  .segmented { display:flex; padding:4px; border-radius:999px; background:var(--soft); }
  .segmented button { min-height:34px; padding:0 15px; border:0; border-radius:999px; color:var(--muted); background:transparent; font-size:12px; text-transform:capitalize; }
  .segmented button.active { color:var(--ink); background:var(--paper); box-shadow:0 5px 18px rgba(31,63,43,.1); }
  .run-gallery { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:15px; }
  .run-card { --hero-image:none; position:relative; min-height:330px; overflow:hidden; display:flex; flex-direction:column; justify-content:space-between; padding:18px; border:1px solid var(--line); border-radius:28px; color:var(--ink); text-align:left; background:linear-gradient(145deg,#dcebcf,#f0f4e8); box-shadow:var(--shadow); isolation:isolate; transition:transform .2s ease,box-shadow .2s ease; }
  .theme-dark .run-card { background:linear-gradient(145deg,#263a2c,#1c2922); color:var(--ink); }
  .run-card.flower { background:linear-gradient(145deg,#eee2c5,#f8f3e9); }
  .theme-dark .run-card.flower { background:linear-gradient(145deg,#3b3422,#24251d); }
  .run-card.has-image { background-image:linear-gradient(180deg,rgba(13,30,19,.14),rgba(11,26,16,.82)),var(--hero-image); background-size:cover; background-position:center; color:white; }
  .run-card:hover { transform:translateY(-4px); box-shadow:0 25px 60px rgba(37,62,47,.15); }
  .run-card-top,.run-card-foot { position:relative; z-index:2; display:flex; align-items:center; justify-content:space-between; gap:12px; }
  .run-card-copy { position:relative; z-index:2; display:grid; margin-top:auto; }
  .run-card-copy small { opacity:.7; font-size:11px; }
  .run-card-copy strong { margin:7px 0 4px; font-family:Georgia,"Times New Roman",serif; font-size:30px; line-height:1; }
  .run-card-copy span,.run-card-foot { font-size:12px; opacity:.8; }
  .run-card-foot { margin-top:22px; padding-top:14px; border-top:1px solid currentColor; }
  .run-art { position:absolute; right:-18px; top:42px; z-index:0; color:rgba(43,109,64,.17); pointer-events:none; }
  .run-art ha-icon { --mdc-icon-size:170px; transform:rotate(-9deg); }
  .has-image .run-art { color:rgba(255,255,255,.16); }
  .phase-pill { display:inline-flex; align-items:center; gap:6px; width:max-content; padding:7px 10px; border:1px solid rgba(255,255,255,.25); border-radius:999px; background:rgba(255,255,255,.72); color:#24482e; font-size:10px; font-weight:800; backdrop-filter:blur(10px); }
  .theme-dark .phase-pill,.has-image .phase-pill { background:rgba(21,39,28,.7); color:#eef5ee; }
  .ring { display:grid; place-items:center; width:44px; height:44px; border-radius:50%; background:radial-gradient(circle,var(--paper) 55%,transparent 57%),conic-gradient(var(--green-strong) calc(var(--progress)*1%),rgba(255,255,255,.45) 0); color:var(--ink); font-size:9px; font-weight:850; }
  .has-image .ring { background:radial-gradient(circle,rgba(17,35,23,.92) 55%,transparent 57%),conic-gradient(var(--green) calc(var(--progress)*1%),rgba(255,255,255,.35) 0); color:white; }
  .back-link { display:inline-flex; align-items:center; gap:7px; margin:8px 0 16px 4px; padding:0; border:0; color:var(--muted); background:transparent; font-weight:700; }
  .workspace-hero { --hero-image:none; position:relative; min-height:300px; overflow:hidden; display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:28px; padding:clamp(24px,4vw,52px); border-radius:32px; background:linear-gradient(125deg,#d6e6c9,#eef3e5 62%,#d9e8ce); box-shadow:var(--shadow); isolation:isolate; }
  .workspace-hero.flower { background:linear-gradient(125deg,#ecdfc1,#f7f2e8 62%,#eadfc9); }
  .theme-dark .workspace-hero { background:linear-gradient(125deg,#203528,#1a281f 62%,#2b3d2e); }
  .workspace-hero.has-image,.hero.has-image { background-image:linear-gradient(90deg,rgba(13,31,20,.86),rgba(12,28,18,.62),rgba(12,25,17,.76)),var(--hero-image); background-size:cover; background-position:center; color:white; }
  .hero-copy,.hero-progress,.hero-actions { position:relative; z-index:2; }
  .hero-copy h1 { margin:17px 0 8px; font-size:clamp(44px,6vw,80px); line-height:.92; }
  .hero-copy p { margin-bottom:18px; color:var(--muted); }
  .has-image .hero-copy p { color:rgba(255,255,255,.72); }
  .plant-chips { display:flex; flex-wrap:wrap; gap:7px; }
  .plant-chips span { display:inline-flex; align-items:center; gap:5px; padding:7px 10px; border-radius:999px; background:rgba(255,255,255,.55); font-size:11px; }
  .theme-dark .plant-chips span,.has-image .plant-chips span { background:rgba(10,30,18,.42); }
  .hero-progress { display:grid; place-items:center; padding-right:48px; }
  .progress-orbit { display:grid; place-items:center; align-content:center; width:150px; height:150px; border-radius:50%; background:radial-gradient(circle,var(--paper) 58%,transparent 59%),conic-gradient(var(--green) calc(var(--progress)*1%),rgba(255,255,255,.38) 0); color:var(--ink); box-shadow:0 12px 30px rgba(34,61,43,.12); }
  .progress-orbit strong { font-family:Georgia,"Times New Roman",serif; font-size:31px; }
  .progress-orbit small { margin-top:2px; color:var(--muted); font-size:10px; }
  .hero-actions { position:absolute; right:22px; top:22px; }
  .stage-glyph { position:absolute; right:185px; bottom:-55px; color:rgba(53,115,69,.1); pointer-events:none; }
  .stage-glyph ha-icon { --mdc-icon-size:220px; transform:rotate(-9deg); }
  .phase-band,.intelligence-block,.journal-block { margin-top:15px; padding:24px; border:1px solid var(--line); border-radius:28px; background:var(--paper); box-shadow:var(--shadow); }
  .block-head { justify-content:space-between; }
  .block-head h2 { margin:0; font-size:27px; }
  .subtle-copy,.hint { color:var(--muted); font-size:12px; line-height:1.55; }
  .phase-rail { display:grid; grid-template-columns:repeat(auto-fit,minmax(115px,1fr)); gap:0; margin:28px 0 8px; }
  .phase-step { position:relative; display:grid; justify-items:center; gap:7px; padding:0 8px; border:0; color:var(--muted); background:transparent; text-align:center; }
  .phase-step:not(:last-child):before { content:""; position:absolute; z-index:0; top:23px; left:50%; width:100%; height:2px; background:var(--line); }
  .phase-step.done:not(:last-child):before { background:var(--green); }
  .phase-node { position:relative; z-index:1; display:grid; place-items:center; width:47px; height:47px; border:2px solid var(--line); border-radius:50%; background:var(--paper); }
  .phase-step.done .phase-node { border-color:var(--green); color:white; background:var(--green); }
  .phase-step.current .phase-node { border-color:var(--green); color:var(--green-strong); box-shadow:0 0 0 6px rgba(77,185,109,.12); }
  .phase-step strong { color:var(--ink); font-size:12px; }
  .phase-step small { font-size:10px; }
  .custom-phase-control { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:end; gap:10px; max-width:620px; margin:24px auto 0; padding-top:18px; border-top:1px solid var(--line); }
  .workspace-grid { display:grid; grid-template-columns:minmax(0,1.45fr) minmax(300px,.55fr); gap:15px; }
  .sensor-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:11px; margin-top:18px; }
  .sensor-tile { position:relative; min-height:250px; padding:17px; overflow:hidden; border:1px solid var(--line); border-radius:23px; background:linear-gradient(180deg,var(--paper),var(--soft)); touch-action:manipulation; user-select:none; transition:transform .18s ease,border-color .18s ease; }
  .sensor-tile:hover,.sensor-tile.pulse { transform:translateY(-2px); border-color:var(--green); }
  .sensor-head { justify-content:space-between; margin-bottom:17px; }
  .metric-badge { display:grid; place-items:center; width:36px; height:36px; border-radius:13px; color:var(--green-strong); background:var(--lime); }
  .live-dot { margin-right:auto; color:var(--green-strong); font-size:9px; font-weight:850; text-transform:uppercase; }
  .live-dot:before { content:""; display:inline-block; width:6px; height:6px; margin-right:5px; border-radius:50%; background:#7bd000; }
  .sensor-tile>small,.sensor-tile>strong,.sensor-state { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .sensor-tile>small { color:var(--muted); }
  .sensor-state { margin:5px 0 4px; font-family:Georgia,"Times New Roman",serif; font-size:31px; }
  .sensor-tile>strong { font-size:11px; }
  .recorder-link { display:flex; justify-content:space-between; gap:8px; margin-top:9px; padding-top:10px; border-top:1px solid var(--line); color:var(--muted); font-size:9px; }
  .recorder-link span,.recorder-link strong { display:flex; align-items:center; gap:4px; }
  .recorder-link strong { color:var(--green-strong); }
  .note-list { position:relative; display:grid; gap:0; margin-top:18px; }
  .note-list:before { content:""; position:absolute; left:8px; top:8px; bottom:8px; width:1px; background:var(--line); }
  .note { position:relative; display:grid; grid-template-columns:18px minmax(0,1fr) auto; gap:10px; padding:10px 0 15px; }
  .note-marker { z-index:1; width:9px; height:9px; margin-top:4px; border:2px solid var(--paper); border-radius:50%; background:var(--green); box-shadow:0 0 0 1px var(--green); }
  .note-copy small { color:var(--muted); font-size:9px; }
  .note-copy p { margin:5px 0 0; line-height:1.45; white-space:pre-wrap; }
  .empty-panel,.empty-detail,.empty-inline { display:grid; place-items:center; align-content:center; gap:9px; min-height:220px; padding:30px; border:1px dashed var(--line); border-radius:24px; color:var(--muted); text-align:center; }
  .plant-mark { display:grid; place-items:center; width:58px; height:58px; border-radius:20px; color:var(--green-strong); background:var(--lime); }
  button.primary,button.ghost,.icon-button,button.danger { min-height:39px; display:inline-flex; align-items:center; justify-content:center; gap:7px; border:1px solid var(--line); border-radius:999px; color:inherit; background:var(--paper); transition:transform .15s ease,box-shadow .15s ease; }
  button.primary { padding:0 17px; border-color:transparent; color:white; background:var(--green-strong); font-weight:800; box-shadow:0 10px 24px rgba(35,122,69,.19); }
  button.primary.large { min-height:48px; padding:0 22px; }
  button.ghost { padding:0 14px; }
  .icon-button { flex:0 0 auto; width:39px; padding:0; }
  .sensor-actions .icon-button,.note-actions .icon-button { width:29px; min-height:29px; }
  button:hover { transform:translateY(-1px); }
  button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible { outline:3px solid rgba(77,185,109,.3); outline-offset:2px; }
  button:disabled { cursor:not-allowed; opacity:.4; transform:none; }
  .danger { color:#bf4a45 !important; }
  .finish-action { color:var(--green-strong) !important; }
  input,select,textarea,.ha-entity-selector { width:100%; min-height:43px; padding:10px 12px; border:1px solid var(--line); border-radius:13px; color:var(--ink); background:var(--soft); outline:none; }
  textarea { min-height:100px; resize:vertical; }
  label { display:grid; gap:7px; color:var(--muted); font-size:12px; font-weight:700; }
  label em { color:var(--green-strong); font-size:9px; font-style:normal; letter-spacing:.08em; text-transform:uppercase; }
  .overlay { position:fixed; inset:0; z-index:20; display:grid; place-items:center; padding:22px; }
  .overlay-backdrop { position:absolute; inset:0; border:0; border-radius:0; background:rgba(15,27,20,.43); backdrop-filter:blur(10px); }
  .modal { position:relative; z-index:1; width:min(760px,100%); max-height:calc(100vh - 44px); overflow:auto; padding:24px; border:1px solid var(--line); border-radius:28px; color:var(--ink); background:var(--paper); box-shadow:0 30px 90px rgba(0,0,0,.25); }
  .modal.compact { width:min(600px,100%); }
  .modal header,.modal footer { display:flex; align-items:center; justify-content:space-between; gap:12px; }
  .modal h2 { margin:0; font-size:29px; }
  .modal footer { justify-content:flex-end; margin-top:20px; }
  .wizard-progress { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin:22px 0; }
  .wizard-progress div { display:flex; align-items:center; gap:7px; color:var(--muted); font-size:10px; }
  .wizard-progress div:not(:last-child):after { content:""; flex:1; height:1px; background:var(--line); }
  .wizard-progress span { display:grid; place-items:center; width:27px; height:27px; flex:0 0 auto; border:1px solid var(--line); border-radius:50%; }
  .wizard-progress .current span,.wizard-progress .done span { border-color:var(--green); color:white; background:var(--green); }
  .step-intro { display:flex; gap:12px; padding:14px; border-radius:18px; background:var(--soft); }
  .step-intro p { margin:4px 0 0; color:var(--muted); font-size:12px; line-height:1.5; }
  .step-icon { display:grid; place-items:center; width:39px; height:39px; flex:0 0 auto; border-radius:13px; color:var(--green-strong); background:var(--lime); }
  .form-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin-top:16px; }
  .form-grid.single-column { grid-template-columns:1fr; }
  .wide,.search-field { grid-column:1/-1; }
  .hint { margin:12px 0 0; }
  .form-error { padding:10px 12px; border-radius:13px; color:#b84642; background:rgba(194,70,65,.1); }
  .setup-columns { display:grid; grid-template-columns:1fr 1fr; gap:22px; margin-top:18px; }
  .setup-columns section,.stacked-fields,.binding-editor,.suggestions { display:grid; gap:9px; }
  .field-title { color:var(--muted); font-size:11px; font-weight:800; text-transform:uppercase; }
  .inline-field,.binding-edit-row { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; }
  .binding-edit-row { grid-template-columns:145px minmax(0,1fr) auto; align-items:center; }
  .editable-chips { display:flex; flex-wrap:wrap; gap:6px; }
  .editable-chip { display:inline-flex; align-items:center; padding:6px 8px; border-radius:999px; background:var(--soft); font-size:11px; }
  .editable-chip button { display:grid; place-items:center; width:20px; height:20px; padding:0; border:0; color:var(--muted); background:transparent; }
  .suggestions button { display:grid; gap:2px; padding:10px; border:0; border-radius:13px; color:inherit; text-align:left; background:var(--soft); }
  .suggestion-state,.recorder-callout,.history-window-pill { padding:12px; border-radius:14px; background:var(--soft); }
  .recorder-callout { display:flex; gap:10px; color:var(--green-strong); }
  .recorder-callout strong,.recorder-callout span { display:block; }
  .recorder-callout span { color:var(--muted); font-size:11px; }
  .history-summary { display:grid; gap:9px; margin-top:14px; }
  .history-summary p { margin:0; line-height:1.5; }
  .history-window-pill { display:flex; align-items:center; flex-wrap:wrap; gap:7px; }
  .history-status { width:max-content; max-width:100%; padding:7px 10px; border-radius:999px; font-size:11px; }
  .history-status.bound { color:var(--green-strong); background:rgba(77,185,109,.12); }
  .history-status.orphaned { color:#b47827; background:rgba(210,146,56,.13); }
  .entity-fallback { display:none; }
  .ha-entity-selector:not(:defined)+.entity-fallback { display:block; }
  .ha-entity-selector:not(:defined) { display:none; }
  /* 0.5 experience: quiet, plant-first and truthful about data. */
  .app { --radius-xl:30px; --radius-lg:22px; --radius-md:16px; --accent-soft:#dff1cf; padding:14px 20px 40px; }
  .app.theme-light { --canvas:#f5f4ed; --paper:#fff; --soft:#eef2e9; --ink:#17251e; --muted:#718078; --line:rgba(23,55,36,.1); --shadow:0 14px 40px rgba(41,67,49,.07); }
  .app.theme-dark { --canvas:#101612; --paper:#18201b; --soft:#202a23; --ink:#edf4ee; --muted:#9aa99f; --line:rgba(225,242,230,.1); --accent-soft:#263a2b; --shadow:0 18px 48px rgba(0,0,0,.24); }
  .shell { max-width:1240px; }
  .topbar { position:sticky; top:0; z-index:12; height:62px; padding:8px 4px; background:color-mix(in srgb,var(--canvas) 88%,transparent); backdrop-filter:blur(18px); }
  .brand-mark { border-radius:50%; }
  .welcome-row { align-items:center; padding:clamp(32px,6vw,76px) 4px clamp(28px,4vw,48px); }
  .welcome-row h1 { max-width:780px; font-size:clamp(38px,5vw,66px); line-height:1; }
  .welcome-row p { max-width:650px; }
  .focus-section,.plant-section,.runs-section { margin-top:34px; }
  .compact-heading { margin-bottom:14px; }
  .section-caption { max-width:420px; color:var(--muted); font-size:12px; text-align:right; }
  .attention-row { display:grid; grid-template-columns:repeat(auto-fit,minmax(250px,1fr)); gap:10px; }
  .attention-card { min-height:78px; display:grid; grid-template-columns:44px minmax(0,1fr) auto; align-items:center; gap:12px; padding:13px; border:1px solid var(--line); border-radius:20px; color:inherit; background:var(--paper); text-align:left; box-shadow:var(--shadow); }
  .attention-card .signal-icon,.calm-banner>span { display:grid; place-items:center; width:44px; height:44px; border-radius:15px; color:#b37824; background:#fff2d7; }
  .theme-dark .attention-card .signal-icon { background:#463a22; }
  .attention-card span,.attention-card strong,.attention-card small { min-width:0; display:block; }
  .attention-card small { margin-top:4px; color:var(--muted); }
  .calm-banner { display:flex; align-items:center; gap:14px; min-height:80px; padding:14px 16px; border:1px solid var(--line); border-radius:20px; background:linear-gradient(120deg,var(--paper),var(--soft)); }
  .calm-banner>span { color:var(--green-strong); background:var(--accent-soft); }
  .calm-banner strong,.calm-banner small { display:block; }
  .calm-banner small { margin-top:4px; color:var(--muted); }
  .plant-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(235px,1fr)); gap:10px; }
  .plant-card { display:flex; align-items:center; gap:8px; min-width:0; padding:8px; border:1px solid var(--line); border-radius:20px; background:var(--paper); box-shadow:var(--shadow); }
  .plant-open { min-width:0; flex:1; display:flex; align-items:center; gap:11px; padding:0; border:0; color:inherit; background:transparent; text-align:left; }
  .plant-avatar { --hero-image:none; width:64px; height:64px; flex:0 0 auto; display:grid; place-items:center; overflow:hidden; border-radius:15px; color:var(--green-strong); background-color:var(--soft); background-image:var(--hero-image); background-size:cover; background-position:center; }
  .plant-avatar img { width:82px; height:82px; object-fit:contain; transform:translateY(7px); }
  .plant-copy { min-width:0; display:grid; }
  .plant-copy small,.plant-copy span { overflow:hidden; color:var(--muted); font-size:10px; text-overflow:ellipsis; white-space:nowrap; }
  .plant-copy strong { margin:3px 0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .plant-card.attention .plant-copy span { color:#b37824; }
  .water-action { width:42px; height:42px; display:grid; place-items:center; flex:0 0 auto; padding:0; border:0; border-radius:14px; color:#2679b8; background:#e5f3ff; }
  .theme-dark .water-action { background:#203645; }
  .water-action span { display:none; }
  .run-gallery { grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; }
  .run-card { min-height:0; display:grid; grid-template-rows:180px auto auto; padding:0; border-radius:24px; background:var(--paper)!important; }
  .run-card:hover { transform:translateY(-2px); }
  .run-image { --hero-image:none; position:relative; overflow:hidden; display:block; background-image:linear-gradient(180deg,transparent,rgba(10,27,17,.18)),var(--hero-image),linear-gradient(145deg,#dbe9cf,#eef3e7); background-size:cover; background-position:center; }
  .theme-dark .run-image { background-image:linear-gradient(180deg,transparent,rgba(10,27,17,.28)),var(--hero-image),linear-gradient(145deg,#2b3d2f,#202b24); }
  .run-image .phase-pill { position:absolute; left:14px; top:14px; z-index:2; }
  .run-image .ring { position:absolute; right:14px; top:14px; z-index:2; }
  .run-image .run-art { right:-10px; top:25px; }
  .stage-plant-card { position:absolute; z-index:1; right:0; bottom:-34px; width:88%; height:220px; object-fit:contain; object-position:right bottom; filter:drop-shadow(0 18px 22px rgba(15,37,22,.17)); pointer-events:none; }
  .run-image:has(.stage-plant-card) { background-image:radial-gradient(circle at 72% 28%,rgba(255,255,255,.58),transparent 48%),linear-gradient(145deg,#dcebcf,#f3f5ec); }
  .theme-dark .run-image:has(.stage-plant-card) { background-image:radial-gradient(circle at 72% 25%,rgba(99,177,112,.18),transparent 50%),linear-gradient(145deg,#293b2e,#1d2821); }
  .run-card.has-image .run-image { background-image:linear-gradient(90deg,rgba(12,30,19,.8),rgba(12,30,19,.18)),var(--hero-image),linear-gradient(145deg,#dcebcf,#f3f5ec); }
  .stage-plant-card.photo-backed { width:76%; opacity:.88; }
  .run-card-copy { padding:17px 17px 8px; }
  .run-card-copy strong { margin:8px 0 4px; font-size:25px; }
  .run-card-copy>span:not(.status-line),.run-card-copy small { color:var(--muted); }
  .run-card-copy small { margin-top:8px; }
  .status-line { display:flex!important; align-items:center; gap:6px; color:var(--muted); font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.08em; }
  .status-line i { width:7px; height:7px; border-radius:50%; background:#68b979; }
  .status-line.attention i { background:#dc9132; }
  .status-line.setup i { background:#8e9b93; }
  .run-card-foot { margin:4px 17px 0; padding:13px 0 15px; }
  .layout-list { grid-template-columns:1fr; }
  .layout-list .run-card { grid-template-columns:150px minmax(0,1fr) auto; grid-template-rows:auto; align-items:stretch; }
  .layout-list .run-image { min-height:142px; }
  .layout-list .run-card-foot { align-self:center; margin-right:17px; border-top:0; }
  .workspace-hero { min-height:270px; border-radius:var(--radius-xl); }
  .workspace-hero:not(.has-image) { overflow:hidden; background:linear-gradient(120deg,var(--accent-soft),var(--soft)); }
  .hero-plant-asset { position:absolute; z-index:1; right:10%; bottom:-35%; width:430px; height:430px; object-fit:contain; filter:drop-shadow(0 28px 34px rgba(18,45,27,.18)); opacity:.92; pointer-events:none; }
  .hero-plant-asset.photo-backed { right:14%; bottom:-40%; opacity:.72; }
  .workspace-hero:not(.has-image) .hero-copy,.workspace-hero:not(.has-image) .hero-progress,.workspace-hero:not(.has-image) .hero-actions { z-index:3; }
  .workspace-hero.has-image .finish-action { color:#e8f8eb!important; border-color:rgba(232,248,235,.32); background:rgba(8,28,16,.38); }
  .completion-card { display:grid; grid-template-columns:58px minmax(0,1fr) auto; gap:18px; align-items:start; margin-top:14px; padding:22px; border:1px solid var(--line); border-radius:24px; background:var(--paper); box-shadow:var(--shadow); }
  .completion-mark { display:grid; place-items:center; width:58px; height:58px; border-radius:18px; color:var(--green-strong); background:var(--accent-soft); }
  .completion-card h2 { margin-bottom:7px; font-size:27px; }
  .completion-card p { margin:0; color:var(--muted); }
  .completion-facts { display:flex; flex-wrap:wrap; gap:24px; margin-top:18px; }
  .completion-facts small,.completion-facts strong { display:block; }
  .completion-facts small { color:var(--muted); font-size:10px; }
  .workspace-nav { position:sticky; top:70px; z-index:10; width:max-content; max-width:100%; display:flex; gap:4px; margin:15px auto 0; padding:5px; border:1px solid var(--line); border-radius:999px; background:color-mix(in srgb,var(--paper) 92%,transparent); backdrop-filter:blur(16px); box-shadow:var(--shadow); }
  .workspace-nav button { min-height:38px; display:flex; align-items:center; gap:6px; padding:0 15px; border:0; border-radius:999px; color:var(--muted); background:transparent; }
  .workspace-nav button.active { color:white; background:var(--green-strong); }
  .workspace-content { margin-top:0; }
  .overview-columns { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:12px; }
  .fact-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:12px; }
  .fact-panel { overflow:hidden; border:1px solid var(--line); border-radius:23px; background:var(--paper); box-shadow:var(--shadow); }
  .fact-title { display:flex; align-items:center; gap:12px; min-height:58px; border-bottom:1px solid var(--line); }
  .fact-title>span { width:8px; align-self:stretch; background:var(--green-strong); }
  .grow-facts .fact-title>span { background:#e37836; }
  .fact-title h2 { margin:0; font-family:inherit; font-size:20px; letter-spacing:-.02em; }
  .fact-list { display:grid; grid-template-columns:1fr 1fr; gap:0; padding:12px 18px 18px; }
  .fact-list>div { min-width:0; display:grid; grid-template-columns:32px minmax(0,1fr); align-items:center; gap:9px; padding:10px 4px; }
  .fact-icon { display:grid; place-items:center; width:30px; height:30px; border-radius:10px; color:var(--green-strong); background:var(--soft); }
  .grow-facts .fact-icon { color:#c66a32; }
  .fact-list small,.fact-list strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .fact-list small { color:var(--muted); font-size:9px; text-transform:uppercase; letter-spacing:.08em; }
  .fact-list strong { margin-top:2px; font-size:13px; }
  .quiet-card { padding:22px; border:1px solid var(--line); border-radius:23px; background:var(--paper); box-shadow:var(--shadow); }
  .quiet-card h2 { margin-bottom:7px; font-size:24px; }
  .quiet-card p { margin:0; color:var(--muted); }
  .intelligence-block,.journal-block { margin-top:15px; }
  .sensor-tile { min-height:190px; background:var(--paper); }
  .sensor-tile:focus-visible { outline:3px solid color-mix(in srgb,var(--green) 50%,transparent); outline-offset:2px; }
  .sensor-tile.unavailable .live-dot { color:#b47827; }
  .sensor-tile.unavailable .live-dot:before { background:#d29a4c; }
  .recorder-link { margin-top:22px; }
  .personalize-modal { max-width:520px; }
  .history-modal { width:min(900px,calc(100vw - 30px)); max-width:900px; }
  .history-modal header p { margin:5px 0 0; color:var(--muted); font-size:12px; }
  .recorder-chart { margin-top:18px; padding:14px 14px 9px; overflow:hidden; border:1px solid var(--line); border-radius:22px; color:var(--green); background:linear-gradient(180deg,color-mix(in srgb,var(--soft) 60%,transparent),transparent); }
  .recorder-chart svg { display:block; width:100%; height:auto; min-height:250px; }
  .chart-gridline { stroke:var(--line); stroke-width:1; }
  .chart-line { fill:none; stroke:currentColor; stroke-width:3; stroke-linecap:round; stroke-linejoin:round; vector-effect:non-scaling-stroke; }
  .chart-area { fill:url(#history-fill); }
  .chart-dot { fill:var(--paper); stroke:currentColor; stroke-width:3; vector-effect:non-scaling-stroke; }
  .chart-axis { display:flex; align-items:center; justify-content:space-between; gap:10px; color:var(--muted); font-size:10px; }
  .chart-axis span:nth-child(2) { text-align:center; }
  .chart-empty { min-height:290px; display:grid; place-items:center; align-content:center; gap:8px; margin-top:18px; padding:30px; border:1px dashed var(--line); border-radius:22px; color:var(--muted); text-align:center; background:var(--soft); }
  .chart-empty ha-icon { --mdc-icon-size:38px; color:var(--green); }
  .chart-empty strong { color:var(--ink); }
  .chart-empty.loading ha-icon { animation:spin 1.1s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  .chart-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-top:10px; }
  .chart-stats>span { padding:12px; border:1px solid var(--line); border-radius:16px; background:var(--soft); }
  .chart-stats small,.chart-stats strong { display:block; }
  .chart-stats small { color:var(--muted); font-size:9px; text-transform:uppercase; letter-spacing:.08em; }
  .chart-stats strong { margin-top:4px; font-size:16px; }
  .preference-group { display:grid; gap:10px; margin-top:20px; }
  .layout-choice { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .layout-choice button { min-height:54px; display:flex; align-items:center; justify-content:center; gap:8px; border:1px solid var(--line); border-radius:16px; color:inherit; background:var(--soft); }
  .layout-choice button.active { border-color:var(--green); color:var(--green-strong); background:var(--accent-soft); }
  .preference-list { display:grid; gap:8px; margin-top:18px; }
  .preference-list>button { display:flex; align-items:center; justify-content:space-between; gap:15px; padding:14px; border:1px solid var(--line); border-radius:17px; color:inherit; background:var(--paper); text-align:left; }
  .preference-list strong,.preference-list small { display:block; }
  .preference-list small { margin-top:4px; color:var(--muted); }
  .toggle-visual { position:relative; width:42px; height:24px; flex:0 0 auto; border-radius:999px; background:var(--soft); transition:background .18s ease; }
  .toggle-visual i { position:absolute; left:3px; top:3px; width:18px; height:18px; border-radius:50%; background:white; box-shadow:0 2px 7px rgba(0,0,0,.18); transition:transform .18s ease; }
  .toggle-visual.on { background:var(--green); }
  .toggle-visual.on i { transform:translateX(18px); }
  @media(max-width:980px){ .run-gallery { grid-template-columns:1fr 1fr; } .workspace-hero { grid-template-columns:1fr auto; } .hero-progress { padding:0; } .fact-grid { grid-template-columns:1fr; } .hero-plant-asset { right:3%; opacity:.48; } }
  @media(max-width:660px){ .app { padding:8px 10px 28px; } .topbar { min-height:58px; } .brand div span { display:none; } .top-actions { gap:3px; } .top-actions .primary { width:40px; padding:0; font-size:0; } .welcome-row { align-items:flex-start; flex-direction:column; padding:34px 4px 20px; } .welcome-row h1 { font-size:39px; } .section-heading { align-items:flex-start; flex-direction:column; margin-top:28px; } .section-caption { text-align:left; } .run-gallery { grid-template-columns:1fr; } .run-card { grid-template-columns:112px minmax(0,1fr); grid-template-rows:auto auto; min-height:142px; } .run-image { grid-row:1/3; min-height:100%; } .run-image .ring { display:none; } .stage-plant-card { right:-14px; bottom:-15px; width:135%; height:160px; } .run-card-copy { padding:15px 14px 5px; } .run-card-copy strong { font-size:22px; } .run-card-foot { grid-column:2; margin:0 14px; padding:8px 0 13px; } .layout-list .run-card { grid-template-columns:112px minmax(0,1fr); } .layout-list .run-card-foot { grid-column:2; margin:0 14px; border-top:1px solid currentColor; } .plant-grid { grid-template-columns:1fr; } .workspace-hero { min-height:400px; grid-template-columns:1fr; padding:24px 20px; } .hero-plant-asset { right:-25%; bottom:-14%; width:380px; height:380px; opacity:.3; } .hero-copy h1 { font-size:43px; } .hero-progress { justify-items:start; } .progress-orbit { width:105px; height:105px; } .hero-actions { position:relative; inset:auto; } .completion-card { grid-template-columns:48px 1fr; padding:17px; } .completion-mark { width:48px; height:48px; } .completion-card>button { grid-column:1/-1; } .workspace-nav { top:62px; width:100%; justify-content:center; } .workspace-nav button { flex:1; justify-content:center; padding:0 8px; font-size:12px; } .overview-columns { grid-template-columns:1fr; } .fact-list { grid-template-columns:1fr; } .phase-band,.intelligence-block,.journal-block { padding:17px; border-radius:22px; } .phase-rail { grid-template-columns:repeat(2,1fr); gap:20px 0; } .phase-step:nth-child(2n):before { display:none; } .custom-phase-control,.form-grid,.setup-columns,.binding-edit-row { grid-template-columns:1fr; } .sensor-grid { grid-template-columns:1fr; } .modal { padding:18px; border-radius:23px; } .history-modal { width:calc(100vw - 16px); padding:14px; } .recorder-chart { padding:8px 8px 6px; } .recorder-chart svg { min-height:190px; } .chart-stats { grid-template-columns:1fr 1fr; } .wizard-progress small { display:none; } }
  @media(prefers-reduced-motion:reduce){ *,*:before,*:after { scroll-behavior:auto!important; transition:none!important; animation:none!important; } }
`;
