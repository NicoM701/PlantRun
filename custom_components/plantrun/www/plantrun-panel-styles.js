export const panelStyles = `
  :host {
    display:block;
    min-height:100%;
    color-scheme:dark;
    font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  }
  * { box-sizing:border-box; }
  button,input,select,textarea { font:inherit; }
  button { color:inherit; }
  button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,summary:focus-visible { outline:3px solid var(--focus); outline-offset:3px; }
  .app {
    --radius-work:24px;
    --radius-group:18px;
    --radius-control:12px;
    --bg:#07100c;
    --bg-soft:#0b1711;
    --surface:#101d16;
    --surface-2:#14241b;
    --surface-3:#1a2c21;
    --line:#294033;
    --line-soft:#1e3328;
    --text:#eef4ef;
    --muted:#9eaea3;
    --quiet:#708178;
    --accent:#8ab99b;
    --accent-strong:#b7ddc3;
    --accent-ink:#0a1c11;
    --warning:#e0b86d;
    --danger:#ef8c83;
    --focus:#c5efd1;
    min-height:100vh;
    background:var(--bg);
    color:var(--text);
    display:grid;
    grid-template-columns:118px minmax(0,1fr);
  }
  .app.theme-light {
    color-scheme:light;
    --bg:#edf1ec;
    --bg-soft:#f5f7f3;
    --surface:#fbfcf9;
    --surface-2:#f0f4ef;
    --surface-3:#e5ece6;
    --line:#cbd6cc;
    --line-soft:#dce4dc;
    --text:#142017;
    --muted:#5f6e63;
    --quiet:#7d8980;
    --accent:#426d50;
    --accent-strong:#315d40;
    --accent-ink:#f3fff5;
    --warning:#936622;
    --danger:#a63732;
    --focus:#426d50;
  }
  .desktop-rail {
    position:sticky;
    top:0;
    height:100vh;
    padding:22px 12px;
    background:var(--bg-soft);
    border-right:1px solid var(--line-soft);
    display:flex;
    flex-direction:column;
    align-items:stretch;
    z-index:5;
  }
  .rail-brand,.nav-button,.rail-utility { border:0; background:transparent; cursor:pointer; }
  .rail-brand { position:relative; width:100%; height:100px; padding:4px 0 30px; display:grid; justify-items:center; gap:8px; font-size:12px; font-weight:750; letter-spacing:.02em; perspective:900px; }
  .brand-flip { position:relative; display:block; width:100%; height:44px; transform-style:preserve-3d; transform-origin:center; transition:transform .42s cubic-bezier(.2,.7,.2,1); will-change:transform; }
  .rail-brand.version-peek .brand-flip { transform:rotateY(180deg); }
  .brand-face { position:absolute; inset:0; display:grid; justify-items:center; align-content:start; backface-visibility:hidden; -webkit-backface-visibility:hidden; }
  .brand-front { align-content:start; }
  .brand-back { align-content:center; gap:4px; overflow:hidden; border:1px solid color-mix(in srgb,var(--accent) 70%,var(--line)); border-radius:16px; background:var(--accent-ink); color:var(--accent-strong); box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 12%,transparent); transform:rotateY(180deg); }
  .brand-leaf { width:44px; height:44px; display:grid; place-items:center; border-radius:16px; background:var(--accent); color:var(--accent-ink); }
  .brand-leaf ha-icon { --mdc-icon-size:25px; }
  .brand-version { display:grid; width:100%; height:100%; align-content:center; gap:2px; text-align:center; }
  .brand-version b { font-size:12px; line-height:1; letter-spacing:.03em; }
  .brand-version small { color:var(--muted); font-size:7px; line-height:1; letter-spacing:.06em; text-transform:uppercase; white-space:nowrap; }
  .brand-name { white-space:nowrap; }
  .desktop-rail nav { display:grid; gap:8px; }
  .nav-button { min-height:70px; padding:10px 5px; border-radius:16px; color:var(--muted); display:grid; place-items:center; gap:5px; font-size:11px; }
  .nav-button ha-icon { --mdc-icon-size:23px; }
  .nav-button:hover { background:var(--surface); color:var(--text); }
  .nav-button.selected { background:var(--surface-2); color:var(--accent-strong); }
  .rail-utility { margin-top:auto; min-height:60px; display:grid; place-items:center; gap:4px; color:var(--muted); font-size:10px; border-radius:16px; }
  .page-frame { min-width:0; }
  .topbar { min-height:80px; padding:16px clamp(24px,4vw,64px); border-bottom:1px solid var(--line-soft); display:flex; justify-content:space-between; align-items:center; background:color-mix(in srgb,var(--bg) 90%,transparent); position:sticky; top:0; z-index:4; backdrop-filter:blur(18px); }
  .topbar>div { display:grid; gap:3px; }
  .topbar strong { font-size:14px; }
  .overline { color:var(--accent); font-size:11px; line-height:1.3; font-weight:800; letter-spacing:.12em; text-transform:uppercase; }
  main { width:min(1480px,100%); min-height:calc(100vh - 80px); margin:0 auto; padding:clamp(26px,4vw,60px); }
  h1,h2,h3,p { margin:0; }
  h1 { font-size:clamp(30px,4vw,54px); line-height:1.02; letter-spacing:-.045em; font-weight:720; }
  h2 { font-size:22px; line-height:1.15; letter-spacing:-.025em; }
  h3 { font-size:17px; }
  p { color:var(--muted); line-height:1.55; }
  button { -webkit-tap-highlight-color:transparent; }
  .primary,.secondary,.quiet,.danger-button,.danger-link,.back-button,.journal-direct,.icon-button { border:0; cursor:pointer; }
  .primary,.secondary,.danger-button { min-height:44px; border-radius:var(--radius-control); padding:0 17px; display:inline-flex; align-items:center; justify-content:center; gap:8px; font-weight:750; }
  .primary { background:var(--accent-strong); color:var(--accent-ink); }
  .primary:hover { filter:brightness(1.08); }
  .secondary { background:var(--surface-3); color:var(--text); border:1px solid var(--line); }
  .quiet,.danger-link,.back-button { background:transparent; padding:7px 0; display:inline-flex; align-items:center; gap:7px; color:var(--accent-strong); }
  .danger-link { color:var(--danger); }
  .danger-button { background:var(--danger); color:#240807; }
  .icon-button { width:42px; height:42px; display:grid; place-items:center; border-radius:var(--radius-control); background:var(--surface-2); }
  .icon-button.danger { color:var(--danger); }
  button:disabled { opacity:.45; cursor:not-allowed; }
  .page-heading { display:flex; justify-content:space-between; gap:30px; align-items:end; margin-bottom:28px; }
  .page-heading>div { display:grid; gap:9px; max-width:730px; }
  .page-heading p { max-width:660px; }
  .tent-strip { border-top:1px solid var(--line); border-bottom:1px solid var(--line); display:grid; grid-template-columns:repeat(4,1fr); margin:0 0 34px; }
  .tent-reading { min-width:0; padding:18px 20px; display:grid; gap:5px; border-right:1px solid var(--line); }
  .tent-reading:last-child { border:0; }
  .tent-reading span,.tent-reading small { color:var(--muted); }
  .tent-reading span { font-size:12px; }
  .tent-reading strong { font-size:22px; overflow:hidden; text-overflow:ellipsis; }
  .tent-reading small { font-size:10px; }
  .plant-gallery { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:clamp(20px,3vw,36px); }
  .plant-card { min-width:0; background:var(--surface); border:1px solid var(--line-soft); border-radius:var(--radius-work); overflow:hidden; position:relative; }
  .plant-card-main { width:100%; border:0; padding:0; background:transparent; color:inherit; cursor:pointer; text-align:left; display:grid; grid-template-columns:minmax(180px,42%) 1fr; }
  .plant-card-photo { width:100%; height:330px; object-fit:cover; background:var(--surface-2); }
  .photo-empty { display:grid; place-items:center; align-content:center; gap:10px; color:var(--quiet); }
  .photo-empty ha-icon { --mdc-icon-size:54px; }
  .photo-empty span { font-size:12px; }
  .plant-card-body { padding:30px; display:flex; flex-direction:column; align-items:flex-start; min-width:0; }
  .plant-card-body>strong { font-size:clamp(24px,3vw,38px); line-height:1.05; letter-spacing:-.035em; margin:12px 0 6px; }
  .plant-card-body>small { color:var(--muted); }
  .stage-label { display:inline-flex; align-items:center; min-height:29px; padding:0 10px; border:1px solid color-mix(in srgb,var(--accent) 55%,var(--line)); border-radius:999px; color:var(--accent-strong); font-size:11px; font-weight:800; }
  .plant-card-meta { margin-top:auto; padding-top:25px; border-top:1px solid var(--line); width:100%; display:grid; grid-template-columns:auto 1fr; gap:22px; color:var(--muted); font-size:12px; }
  .plant-card-meta>span:last-child { display:grid; gap:3px; }
  .plant-card-meta b { color:var(--text); font-size:10px; text-transform:uppercase; letter-spacing:.08em; }
  .journal-direct { position:absolute; right:18px; bottom:18px; min-height:39px; padding:0 13px; display:flex; align-items:center; gap:6px; border-radius:var(--radius-control); background:var(--accent-strong); color:var(--accent-ink); font-weight:760; }
  .empty-garden,.system-state,.empty-journal { min-height:360px; border:1px dashed var(--line); border-radius:var(--radius-work); display:grid; align-content:center; justify-items:center; gap:12px; text-align:center; padding:34px; }
  .empty-garden ha-icon,.system-state ha-icon { --mdc-icon-size:52px; color:var(--accent); }
  .empty-garden p,.system-state p,.empty-journal p { max-width:500px; }
  .system-state.error ha-icon { color:var(--danger); }
  .run-workspace { display:grid; gap:26px; }
  .back-button { width:max-content; }
  .workspace-identity { display:grid; grid-template-columns:170px 1fr auto; gap:28px; align-items:center; }
  .workspace-photo { width:170px; height:170px; object-fit:cover; border-radius:var(--radius-group); background:var(--surface-2); }
  .workspace-identity>div:nth-child(2) { display:grid; align-content:center; justify-items:start; gap:8px; }
  .workspace-identity h1 { font-size:clamp(34px,5vw,68px); }
  .lifecycle-panel,.recorder-workspace,.facts-strip,.latest-entry { background:var(--surface); border:1px solid var(--line-soft); border-radius:var(--radius-work); }
  .lifecycle-panel { padding:25px 28px; }
  .lifecycle-panel>header,.chart-heading,.facts-strip>header,.latest-entry>header { display:flex; align-items:end; justify-content:space-between; gap:20px; }
  .lifecycle-panel>header>div,.chart-heading>div,.facts-strip>header,.latest-entry>header>div { display:grid; gap:6px; }
  .lifecycle-panel>header>span { color:var(--muted); font-size:12px; }
  .lifecycle-rail { display:grid; grid-template-columns:repeat(auto-fit,minmax(95px,1fr)); margin-top:27px; }
  .stage-target { position:relative; border:0; border-top:2px solid var(--line); background:transparent; min-height:64px; padding:20px 8px 0; color:var(--muted); cursor:pointer; text-align:left; }
  .stage-target i { position:absolute; top:-7px; left:8px; width:12px; height:12px; border-radius:50%; background:var(--surface); border:2px solid var(--line); }
  .stage-target.past { border-color:color-mix(in srgb,var(--accent) 45%,var(--line)); }
  .stage-target.past i { background:var(--accent); border-color:var(--accent); }
  .stage-target.current { color:var(--accent-strong); font-weight:800; border-color:var(--accent); }
  .stage-target.current i { width:16px; height:16px; top:-9px; left:6px; background:var(--accent-strong); border-color:var(--accent-strong); box-shadow:0 0 0 5px color-mix(in srgb,var(--accent) 15%,transparent); }
  .stage-target:hover { color:var(--text); }
  .recorder-workspace { display:grid; grid-template-columns:250px minmax(0,1fr); overflow:hidden; }
  .environment-list { padding:12px; background:var(--surface-2); border-right:1px solid var(--line); display:grid; align-content:start; gap:3px; }
  .environment-row { width:100%; border:0; border-radius:var(--radius-control); background:transparent; padding:14px 12px; display:grid; grid-template-columns:30px minmax(0,1fr) auto; align-items:center; gap:10px; color:var(--muted); cursor:pointer; text-align:left; }
  .environment-row span { display:grid; gap:2px; }
  .environment-row strong { color:inherit; font-size:13px; }
  .environment-row small { font-size:10px; }
  .environment-row b { color:var(--text); font-size:12px; white-space:nowrap; }
  .environment-row.selected { background:var(--surface-3); color:var(--accent-strong); }
  .chart-panel { min-width:0; padding:28px; }
  .current-reading { display:grid; justify-items:end; gap:5px; }
  .current-reading strong { font-size:28px; }
  .assessment { font-size:11px; color:var(--muted); }
  .assessment.good { color:var(--accent-strong); }
  .assessment.warn { color:var(--warning); }
  .chart-wrap,.chart-state { height:260px; margin-top:23px; border-bottom:1px solid var(--line); }
  .chart-wrap svg { width:100%; height:100%; overflow:visible; }
  .chart-wrap line { stroke:var(--line-soft); stroke-width:1; }
  .chart-wrap path { stroke:var(--accent-strong); stroke-width:3; fill:none; vector-effect:non-scaling-stroke; }
  .chart-state { display:grid; place-content:center; justify-items:center; gap:7px; color:var(--muted); text-align:center; }
  .chart-state ha-icon { animation:spin 1s linear infinite; }
  .chart-state small { color:var(--quiet); }
  .chart-context { display:grid; grid-template-columns:repeat(5,1fr); }
  .chart-context span { padding:18px 12px; display:grid; gap:4px; color:var(--muted); font-size:12px; border-right:1px solid var(--line-soft); }
  .chart-context span:last-child { border:0; }
  .chart-context b { color:var(--text); font-size:10px; letter-spacing:.06em; text-transform:uppercase; }
  .facts-strip { padding:26px 28px; }
  .facts-strip dl { margin:24px 0 0; display:grid; grid-template-columns:repeat(5,1fr); border-top:1px solid var(--line); }
  .facts-strip dl>div { padding:18px 14px 0 0; min-width:0; }
  dt { color:var(--muted); font-size:11px; }
  dd { margin:6px 0 0; color:var(--text); font-size:13px; overflow-wrap:anywhere; }
  .latest-entry { padding:26px 28px; }
  .latest-entry .journal-entry { margin-top:20px; }
  .run-footer { display:flex; justify-content:space-between; align-items:center; color:var(--muted); padding:4px 2px 30px; }
  .journal-screen,.archive-screen { display:grid; }
  .journal-filters { display:flex; gap:12px; border-top:1px solid var(--line); border-bottom:1px solid var(--line); padding:13px 0; margin-bottom:18px; }
  .journal-filters label { display:flex; align-items:center; gap:8px; color:var(--muted); font-size:11px; }
  .journal-filters select { min-height:38px; }
  .journal-history { display:grid; }
  .journal-entry { display:grid; grid-template-columns:180px minmax(0,1fr) auto; gap:24px; padding:24px 4px; border-bottom:1px solid var(--line); }
  .journal-entry.compact { grid-template-columns:180px 1fr; padding-bottom:4px; border-bottom:0; }
  .entry-time { display:grid; align-content:start; gap:5px; }
  .entry-time b { font-size:12px; }
  .entry-time small { color:var(--muted); }
  .entry-copy { min-width:0; display:grid; gap:8px; }
  .entry-copy p { color:var(--text); white-space:pre-wrap; }
  .entry-type { color:var(--accent-strong); font-size:11px; font-weight:800; }
  .entry-copy details { color:var(--muted); font-size:11px; }
  .entry-copy summary { cursor:pointer; }
  .entry-copy dl { display:flex; flex-wrap:wrap; gap:12px; }
  .entry-copy dl div { display:flex; gap:5px; }
  .entry-actions { display:flex; gap:5px; }
  .journal-attachments { display:flex; flex-wrap:wrap; gap:12px; margin-top:5px; }
  .journal-attachment { width:138px; margin:0; display:grid; gap:7px; }
  .journal-attachment>img { width:138px; height:104px; object-fit:cover; border-radius:var(--radius-control); background:var(--surface-2); }
  .journal-attachment figcaption { display:grid; gap:4px; min-width:0; }
  .journal-attachment figcaption>span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text); font-size:11px; }
  .journal-attachment .attachment-meta { color:var(--quiet); font-size:10px; }
  .journal-attachment figcaption .quiet { justify-self:start; padding:0; font-size:10px; }
  .cover-badge { color:var(--accent-strong); font-size:10px; font-weight:800; }
  .archive-list { display:grid; border-top:1px solid var(--line); }
  .archive-list article { border-bottom:1px solid var(--line); }
  .archive-list article>button { width:100%; min-height:92px; border:0; background:transparent; cursor:pointer; display:grid; grid-template-columns:64px minmax(0,1fr) 90px 90px 30px; gap:18px; align-items:center; text-align:left; }
  .archive-photo { width:64px; height:64px; object-fit:cover; border-radius:var(--radius-control); background:var(--surface-2); }
  .archive-photo.photo-empty span { display:none; }
  .archive-photo.photo-empty ha-icon { --mdc-icon-size:25px; }
  .archive-list article>button>span { display:grid; gap:4px; }
  .archive-list small { color:var(--muted); }
  .mobile-nav { display:none; }
  .dialog-layer,.drawer-layer { position:fixed; inset:0; z-index:30; display:grid; place-items:center; padding:20px; }
  .modal-backdrop { position:absolute; inset:0; border:0; background:rgba(0,0,0,.66); backdrop-filter:blur(7px); cursor:pointer; }
  .modal { position:relative; width:min(880px,100%); max-height:calc(100vh - 40px); overflow:auto; border:1px solid var(--line); border-radius:var(--radius-work); background:var(--surface); box-shadow:0 30px 90px rgba(0,0,0,.45); }
  .modal>header,.journal-drawer>header { min-height:82px; padding:20px 24px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--line); }
  .modal>header>div,.journal-drawer>header>div { display:grid; gap:5px; }
  .modal>footer,.journal-drawer>footer { min-height:76px; padding:15px 24px; display:flex; justify-content:space-between; align-items:center; gap:12px; border-top:1px solid var(--line); }
  .create-progress { list-style:none; margin:0; padding:18px 24px; display:grid; grid-template-columns:repeat(3,1fr); border-bottom:1px solid var(--line); }
  .create-progress li { color:var(--quiet); display:flex; align-items:center; gap:8px; font-size:11px; border-top:2px solid var(--line); padding-top:12px; }
  .create-progress li b { width:23px; height:23px; display:grid; place-items:center; border-radius:50%; background:var(--surface-3); }
  .create-progress li.current,.create-progress li.done { color:var(--accent-strong); border-color:var(--accent); }
  .create-body { padding:26px 24px; }
  .create-step { display:grid; gap:23px; }
  .step-copy { display:grid; gap:6px; }
  .search-row,.form-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:15px; }
  .field { display:grid; gap:7px; color:var(--muted); font-size:11px; min-width:0; }
  .field.grow,.field.wide { grid-column:1/-1; }
  .field span>small { color:var(--quiet); }
  input,select,textarea { width:100%; min-height:44px; border:1px solid var(--line); border-radius:var(--radius-control); padding:10px 12px; background:var(--bg-soft); color:var(--text); }
  textarea { resize:vertical; line-height:1.45; }
  .search-state { font-size:12px; }
  .search-state button { border:0; padding:0; background:transparent; color:var(--accent-strong); cursor:pointer; }
  .cultivar-search-results { display:grid; border:1px solid var(--line); border-radius:var(--radius-group); overflow:hidden; }
  .cultivar-search-results button { min-height:58px; border:0; border-bottom:1px solid var(--line); padding:10px 14px; background:transparent; color:inherit; display:flex; justify-content:space-between; align-items:center; text-align:left; cursor:pointer; }
  .cultivar-search-results button:last-child { border:0; }
  .cultivar-search-results button.selected { background:var(--surface-2); color:var(--text); }
  .cultivar-search-results span { display:grid; gap:3px; }
  .cultivar-search-results small { color:var(--muted); }
  .cultivar-preview { border-left:3px solid var(--accent); padding:4px 0 4px 16px; display:grid; gap:6px; }
  .cultivar-preview dl { margin:6px 0; display:grid; gap:5px; }
  .cultivar-preview dl div { display:grid; grid-template-columns:110px 1fr; gap:10px; }
  .cultivar-preview dt { color:var(--muted); }
  .cultivar-preview dd { margin:0; }
  .cultivar-preview button { justify-self:start; }
  .create-step hr { width:100%; border:0; border-top:1px solid var(--line); }
  .stage-choice { border:0; margin:0; padding:0; display:flex; flex-wrap:wrap; gap:8px; }
  .stage-choice legend { color:var(--muted); font-size:11px; margin-bottom:8px; }
  .stage-choice label { position:relative; }
  .stage-choice input { position:absolute; opacity:0; pointer-events:none; }
  .stage-choice span { display:block; border:1px solid var(--line); border-radius:var(--radius-control); padding:9px 12px; cursor:pointer; }
  .stage-choice input:checked+span { background:var(--surface-3); color:var(--accent-strong); border-color:var(--accent); }
  .optional-details,.sensor-context { border:1px solid var(--line); border-radius:var(--radius-group); padding:15px; }
  .optional-details summary,.sensor-context summary { cursor:pointer; font-weight:700; }
  .optional-details .form-grid { margin-top:17px; }
  .sensor-create { display:grid; gap:10px; }
  .sensor-create>header { display:flex; align-items:center; justify-content:space-between; }
  .sensor-create>header span { color:var(--muted); font-size:11px; }
  .sensor-create-row { display:grid; grid-template-columns:150px minmax(190px,1fr) 120px 42px; gap:8px; }
  .review-step dl { margin:0; display:grid; }
  .review-step dl>div { display:grid; grid-template-columns:170px 1fr; gap:12px; padding:14px 0; border-bottom:1px solid var(--line); }
  .dialog-error { margin:0 24px 15px; color:var(--danger); font-size:12px; }
  .compact-modal { width:min(540px,100%); }
  .confirm-body { padding:25px 24px; display:grid; gap:18px; }
  .confirm-body small { color:var(--muted); line-height:1.5; }
  .target-stage { font-size:30px; color:var(--accent-strong); }
  .danger-layer .modal-backdrop { background:rgba(32,5,4,.78); }
  .danger-modal { border-color:color-mix(in srgb,var(--danger) 55%,var(--line)); }
  .drawer-layer { justify-items:end; padding:0; }
  .journal-drawer { position:relative; width:min(470px,100%); height:100vh; background:var(--surface); border-left:1px solid var(--line); box-shadow:-30px 0 90px rgba(0,0,0,.4); display:grid; grid-template-rows:auto minmax(0,1fr) auto; }
  .drawer-body { overflow:auto; padding:22px 24px; display:grid; align-content:start; gap:18px; }
  .entry-types { border:0; margin:0; padding:0; display:flex; flex-wrap:wrap; gap:7px; }
  .entry-types legend { width:100%; color:var(--muted); font-size:11px; margin-bottom:4px; }
  .entry-types button { min-height:39px; border:1px solid var(--line); background:transparent; color:var(--muted); border-radius:var(--radius-control); display:flex; align-items:center; gap:5px; cursor:pointer; }
  .entry-types button.selected { background:var(--surface-3); border-color:var(--accent); color:var(--accent-strong); }
  .journal-media { display:grid; gap:10px; padding-top:2px; border-top:1px solid var(--line); }
  .journal-media-heading { display:flex; justify-content:space-between; align-items:end; gap:12px; }
  .journal-media-heading>div { display:grid; gap:4px; }
  .field-label { color:var(--muted); font-size:11px; }
  .journal-media-heading p { font-size:10px; }
  .attachment-upload { position:relative; display:inline-flex; align-items:center; min-height:38px; padding:0 11px; border:1px solid var(--line); border-radius:var(--radius-control); background:var(--surface-2); color:var(--accent-strong); font-size:11px; font-weight:750; cursor:pointer; white-space:nowrap; }
  .attachment-upload span { display:flex; align-items:center; gap:5px; }
  .attachment-upload input { position:absolute; inset:0; width:100%; height:100%; opacity:0; cursor:pointer; padding:0; min-height:0; }
  .attachment-upload input:disabled { cursor:not-allowed; }
  .journal-attachment-editor { display:grid; gap:8px; }
  .journal-attachment-item { display:grid; grid-template-columns:58px minmax(0,1fr) 36px; gap:9px; align-items:center; }
  .journal-attachment-item>img,.attachment-placeholder { width:58px; height:45px; object-fit:cover; border-radius:var(--radius-control); background:var(--surface-2); }
  .attachment-placeholder { display:grid; place-items:center; color:var(--quiet); }
  .attachment-placeholder ha-icon { --mdc-icon-size:20px; }
  .journal-attachment-item>div { min-width:0; display:grid; gap:3px; }
  .journal-attachment-item input { min-height:36px; padding:7px 9px; font-size:11px; }
  .journal-attachment-item small { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--quiet); font-size:10px; }
  .journal-drawer>footer span { color:var(--muted); font-size:10px; }
  .busy-line { position:fixed; z-index:50; top:12px; left:50%; transform:translateX(-50%); padding:8px 12px; border-radius:999px; background:var(--surface-3); box-shadow:0 8px 30px rgba(0,0,0,.3); color:var(--text); display:flex; gap:8px; align-items:center; font-size:11px; }
  .busy-line span { width:8px; height:8px; border-radius:50%; background:var(--accent); animation:pulse 1s infinite; }
  .toast { position:fixed; z-index:51; right:24px; bottom:24px; background:var(--accent-strong); color:var(--accent-ink); padding:12px 16px; border-radius:var(--radius-control); font-weight:750; box-shadow:0 12px 40px rgba(0,0,0,.35); }
  @keyframes spin { to { transform:rotate(360deg); } }
  @keyframes pulse { 50% { opacity:.35; } }

  @media(max-width:1050px) {
    .plant-card-main { grid-template-columns:1fr; }
    .plant-card-photo { height:240px; }
    .plant-card-body { min-height:260px; }
    .recorder-workspace { grid-template-columns:1fr; }
    .environment-list { border-right:0; border-bottom:1px solid var(--line); grid-template-columns:repeat(5,minmax(0,1fr)); }
    .environment-row { grid-template-columns:24px 1fr; }
    .environment-row b { grid-column:2; }
    .facts-strip dl,.chart-context { grid-template-columns:repeat(3,1fr); }
  }
  @media(max-width:720px) {
    .app { display:block; min-height:100vh; padding-bottom:76px; }
    .desktop-rail { display:none; }
    .topbar { min-height:64px; padding:10px 16px; }
    .topbar .overline { display:none; }
    .topbar .primary { min-height:40px; padding:0 12px; }
    main { min-height:calc(100vh - 140px); padding:22px 16px; }
    .page-heading { display:grid; align-items:start; margin-bottom:22px; }
    .page-heading h1 { font-size:38px; }
    .page-heading .quiet { display:none; }
    .tent-strip { grid-template-columns:repeat(2,1fr); }
    .tent-reading:nth-child(2) { border-right:0; }
    .tent-reading:nth-child(-n+2) { border-bottom:1px solid var(--line); }
    .plant-gallery { grid-template-columns:1fr; }
    .plant-card-main { grid-template-columns:42% 1fr; min-height:245px; }
    .plant-card-photo { height:245px; }
    .plant-card-body { min-height:245px; padding:20px 17px; }
    .plant-card-body>strong { font-size:26px; }
    .plant-card-meta { grid-template-columns:1fr; gap:8px; }
    .journal-direct { right:12px; bottom:12px; }
    .mobile-nav { position:fixed; z-index:12; left:0; right:0; bottom:0; height:70px; display:grid; grid-template-columns:repeat(3,1fr); background:color-mix(in srgb,var(--bg-soft) 92%,transparent); border-top:1px solid var(--line); backdrop-filter:blur(18px); padding:5px 12px max(5px,env(safe-area-inset-bottom)); }
    .mobile-nav .nav-button { min-height:56px; border-radius:12px; padding:5px; }
    .workspace-identity { grid-template-columns:100px 1fr; gap:16px; }
    .workspace-photo { width:100px; height:120px; }
    .workspace-identity .primary { grid-column:1/-1; width:100%; }
    .workspace-identity h1 { font-size:36px; }
    .lifecycle-panel { padding:21px 18px; overflow:hidden; }
    .lifecycle-panel>header { display:grid; }
    .lifecycle-rail { overflow-x:auto; grid-template-columns:repeat(5,120px); padding-bottom:8px; scrollbar-width:none; -ms-overflow-style:none; }
    .environment-list { display:flex; overflow-x:auto; scrollbar-width:none; -ms-overflow-style:none; }
    .lifecycle-rail::-webkit-scrollbar,.environment-list::-webkit-scrollbar { display:none; width:0; height:0; }
    .environment-row { min-width:170px; }
    .chart-panel { padding:22px 17px; }
    .chart-heading { align-items:start; }
    .chart-wrap,.chart-state { height:210px; }
    .chart-context { grid-template-columns:repeat(2,1fr); }
    .facts-strip,.latest-entry { padding:22px 18px; }
    .facts-strip dl { grid-template-columns:repeat(2,1fr); }
    .journal-entry,.journal-entry.compact { grid-template-columns:1fr; gap:10px; }
    .entry-actions { justify-self:end; }
    .journal-media-heading { align-items:start; display:grid; }
    .archive-list article>button { grid-template-columns:54px 1fr 28px; }
    .archive-list article>button>span:nth-of-type(n+2) { display:none; }
    .archive-photo { width:54px; height:54px; }
    .modal { max-height:calc(100vh - 20px); }
    .dialog-layer { padding:10px; align-items:end; }
    .create-modal { border-radius:var(--radius-work) var(--radius-work) 0 0; max-height:calc(100vh - 20px); }
    .create-progress li span { display:none; }
    .search-row,.form-grid { grid-template-columns:1fr; }
    .sensor-create-row { grid-template-columns:1fr 42px; }
    .sensor-create-row select:nth-child(2),.sensor-create-row select:nth-child(3) { grid-column:1; }
    .sensor-create-row .icon-button { grid-column:2; grid-row:1; }
    .review-step dl>div { grid-template-columns:1fr; gap:4px; }
    .journal-drawer { width:100%; border-left:0; }
    .toast { right:12px; bottom:82px; left:12px; text-align:center; }
  }
  @media(max-width:440px) {
    .plant-card-main { grid-template-columns:1fr; }
    .plant-card-photo { height:230px; }
    .plant-card-body { min-height:230px; }
    .tent-reading { padding:14px 10px; }
    .facts-strip dl,.chart-context { grid-template-columns:1fr 1fr; }
  }
  @media(prefers-reduced-motion:reduce) {
    *,*::before,*::after { scroll-behavior:auto!important; animation-duration:.001ms!important; animation-iteration-count:1!important; transition-duration:.001ms!important; }
  }
`;
