const el = (id) => document.getElementById(id);
    const mod = (n, m) => ((n % m) + m) % m;

const THEME_KEY = "doomsday_theme";
const THEME_LIGHT = "light";
const THEME_DARK = "dark";

function readTheme(){
  try{
    const saved = localStorage.getItem(THEME_KEY);
    return (saved === THEME_LIGHT || saved === THEME_DARK) ? saved : THEME_LIGHT;
  }catch(_){
    return THEME_LIGHT;
  }
}
function saveTheme(theme){
  try{ localStorage.setItem(THEME_KEY, theme); }catch(_){}
}
function applyTheme(theme){
  const isLight = theme === THEME_LIGHT;
  document.body.classList.toggle("light", isLight);
  const btn = el("btnTheme");
  if(btn){
    btn.textContent = isLight ? "\uD83C\uDF19" : "\u2600\uFE0F";
    btn.title = isLight ? "Passer en mode sombre" : "Passer en mode clair";
    btn.setAttribute("aria-label", btn.title);
  }
}
function toggleTheme(){
  const next = document.body.classList.contains("light") ? THEME_DARK : THEME_LIGHT;
  applyTheme(next);
  saveTheme(next);
}
    const uiDays = [
      {label:"Lun", name:"lundi", code:1},
      {label:"Mar", name:"mardi", code:2},
      {label:"Mer", name:"mercredi", code:3},
      {label:"Jeu", name:"jeudi", code:4},
      {label:"Ven", name:"vendredi", code:5},
      {label:"Sam", name:"samedi", code:6},
      {label:"Dim", name:"dimanche", code:0},
    ];

    function isLeapYear(y){
      return (y % 4 === 0) && (y % 100 !== 0 || y % 400 === 0);
    }
    function daysInMonth(year, month1){
      if([1,3,5,7,8,10,12].includes(month1)) return 31;
      if([4,6,9,11].includes(month1)) return 30;
      return isLeapYear(year) ? 29 : 28;
    }
    function weekdayCodeUTC(year, month1, day){
      return new Date(Date.UTC(year, month1 - 1, day)).getUTCDay(); // 0=dim..6=sam
    }
    function computeParts(year){
      const C = Math.floor(year / 100);
      const K = mod(5 * mod(C, 4) + 2, 7);
      const y = mod(year, 100);
      const a = Math.floor(y / 12);
      const b = mod(y, 12);
      const c = Math.floor(b / 4);
      const D = mod(a + b + c + K, 7);
      return { year, K, a, b, c, D };
    }
    function pad2(n){ return String(n).padStart(2, "0"); }
    function formatDateFR(d,m,y){ return `${pad2(d)}/${pad2(m)}/${y}`; }

    let current = null;
    let attempts = 0;
    let perfects = 0;
    let locked = false;
    let startMs = 0;
    let timerIntervalId = null;
    let lastElapsedMs = 0;
    let hasStarted = false;
    let competMode = false;
    let competScore = 0;
    let avgGood = 0;
    let avgTotalMs = 0;

    const picks = { K:null, a:null, b:null, c:null, doomsday:null, dateDay:null };

    function setScore(){
      if(competMode){
        el("pillScore").textContent = `Score ${competScore}`;
      } else {
        el("pillScore").textContent = `${perfects} / ${attempts}`;
      }
    }
    function setAverage(){
      if(avgGood === 0){
        el("pillAvg").textContent = "Moy --";
        return;
      }
      el("pillAvg").textContent = `Moy ${formatElapsed(avgTotalMs / avgGood)}`;
    }
    function resetClassicScore(){
      perfects = 0;
      attempts = 0;
      setScore();
    }
    function resetAverage(){
      avgGood = 0;
      avgTotalMs = 0;
      setAverage();
    }
    function resetCompetRun(){
      competScore = 0;
      setScore();
    }
    function setCompetMode(v){
      competMode = v;
      document.body.classList.toggle("compet", competMode);
      const b = el("btnCompet");
      b.classList.toggle("on", competMode);
      b.setAttribute("aria-pressed", competMode ? "true" : "false");
      b.textContent = competMode ? "Comp\u00E9t ON" : "Comp\u00E9t OFF";
      resetCompetRun();
      resetClassicScore();
      resetAverage();
    }
    function setLocked(v){
      locked = v;
      el("card").classList.toggle("locked", locked);
    }
    function formatElapsed(ms){
      return `${(ms / 1000).toFixed(2)}s`;
    }
    function setTimer(ms){
      if(!hasStarted){
        setTimerIdle();
        return;
      }
      el("pillTimer").textContent = `\u23F1 ${formatElapsed(ms)}`;
    }
    function clearTimerState(){
      el("pillTimer").classList.remove("ok","bad","warn");
    }
    function setTimerState(kind){
      clearTimerState();
      if(kind) el("pillTimer").classList.add(kind);
    }
    function setTimerIdle(){
      el("pillTimer").textContent = "\u23F1 --";
      clearTimerState();
    }
    function startTimer(){
      if(timerIntervalId) clearInterval(timerIntervalId);
      timerIntervalId = setInterval(() => {
        if(locked) return;
        lastElapsedMs = performance.now() - startMs;
        setTimer(lastElapsedMs);
      }, 50);
    }
    function stopTimer(){
      if(timerIntervalId){
        clearInterval(timerIntervalId);
        timerIntervalId = null;
      }
    }

    function showResult(kind, text){
      const p = el("pillResult");
      p.style.display = "inline-flex";
      p.classList.remove("ok","bad","warn");
      p.classList.add(kind);
      p.textContent = text;
    }
    function hideResult(){
      const p = el("pillResult");
      p.style.display = "none";
      p.textContent = "\u2014";
      p.classList.remove("ok","bad","warn");
    }

    function clearMarks(){
      ["chipsK","chipsA","chipsB","chipsC"].forEach(id => {
        [...el(id).children].forEach(ch => ch.classList.remove("ok","bad","miss"));
      });
      ["daysDoomsday","daysDate"].forEach(id => {
        [...el(id).children].forEach(btn => btn.classList.remove("ok","bad","miss"));
      });
    }

    function resetSelections(){
      for(const k of Object.keys(picks)) picks[k] = null;
      ["chipsK","chipsA","chipsB","chipsC"].forEach(id => {
        [...el(id).children].forEach(ch => ch.dataset.selected = "false");
      });
      ["daysDoomsday","daysDate"].forEach(id => {
        [...el(id).children].forEach(btn => btn.dataset.selected = "false");
      });
    }

    function buildChipsRange(containerId, key, from, to){
      const wrap = el(containerId);
      wrap.innerHTML = "";
      for(let v=from; v<=to; v++){
        const d = document.createElement("div");
        d.className = "chip";
        d.textContent = v;
        d.dataset.value = String(v);
        d.dataset.selected = "false";
        d.addEventListener("click", () => {
          if(locked) return;
          picks[key] = v;
          [...wrap.children].forEach(ch => {
            ch.dataset.selected = (Number(ch.dataset.value) === v) ? "true" : "false";
          });
        });
        wrap.appendChild(d);
      }
    }

    function buildDays(containerId, pickKey, onPick){
      const wrap = el(containerId);
      wrap.innerHTML = "";
      uiDays.forEach(dy => {
        const b = document.createElement("div");
        b.className = "daybtn";
        b.dataset.value = String(dy.code);
        b.dataset.selected = "false";
        b.innerHTML = `${dy.label}<small>${dy.name}</small>`;
        b.addEventListener("click", () => {
          if(locked) return;
          picks[pickKey] = dy.code;
          [...wrap.children].forEach(btn => {
            btn.dataset.selected = (Number(btn.dataset.value) === dy.code) ? "true" : "false";
          });
          if(typeof onPick === "function") onPick();
        });
        wrap.appendChild(b);
      });
    }

    function anyChosen(){
      return Object.values(picks).some(v => v !== null);
    }

    function markGroup(containerId, picked, correct){
      const children = [...el(containerId).children];

      if(picked === null){
        const c = children.find(x => Number(x.dataset.value) === correct);
        if(c) c.classList.add("miss");
        return { answered:false, correct:true };
      }

      const p = children.find(x => Number(x.dataset.value) === picked);
      if(p) p.classList.add(picked === correct ? "ok" : "bad");

      if(picked !== correct){
        const c = children.find(x => Number(x.dataset.value) === correct);
        if(c) c.classList.add("ok");
      }

      return { answered:true, correct: picked === correct };
    }

    function validateNow(){
      if(!current || locked) return;

      if(!anyChosen()){
        showResult("warn", "Donne au moins 1 r\u00E9ponse");
        attempts++;
        lastElapsedMs = performance.now() - startMs;
        setTimer(lastElapsedMs);
        stopTimer();
        setScore();
        setLocked(true);
        hideResult();
        setTimerState("bad");
        return;
      }

      attempts++;

      const sol = current;

      clearMarks();
      hideResult();

      const rK   = markGroup("chipsK",       picks.K,        sol.K);
      const rA   = markGroup("chipsA",       picks.a,        sol.a);
      const rB   = markGroup("chipsB",       picks.b,        sol.b);
      const rC   = markGroup("chipsC",       picks.c,        sol.c);
      const rD   = markGroup("daysDoomsday", picks.doomsday, sol.D);
      const rDay = markGroup("daysDate",     picks.dateDay,  sol.dateDow);

      const results = [rK,rA,rB,rC,rD,rDay];
      const allAnsweredCorrect = results.filter(r => r.answered).every(r => r.correct);
      lastElapsedMs = performance.now() - startMs;
      setTimer(lastElapsedMs);
      stopTimer();

      if(allAnsweredCorrect){
        perfects++;
        avgGood++;
        avgTotalMs += lastElapsedMs;
        setAverage();
        if(competMode){
          competScore++;
          showResult("ok", `OK - ${formatElapsed(lastElapsedMs)}`);
        } else {
          hideResult();
          setTimerState("ok");
        }
      } else {
        hideResult();
        setTimerState("bad");
      }

      setScore();
      setLocked(true);

      if(competMode && allAnsweredCorrect){
        setTimeout(() => {
          if(competMode){
            chooseRandomDate(false);
          }
        }, 260);
      }
    }

    function chooseRandomDate(resetCompet = false){
      hasStarted = true;
      if(competMode && resetCompet){
        resetCompetRun();
      }
      const min = 1583, max = 2400;
      const year = Math.floor(Math.random() * (max - min + 1)) + min;

      const base = computeParts(year);
      const month = Math.floor(Math.random() * 12) + 1;
      const day = Math.floor(Math.random() * daysInMonth(year, month)) + 1;
      const dow = weekdayCodeUTC(year, month, day);

      current = { ...base, dateDay: day, dateMonth: month, dateDow: dow };

      el("dateInput").value = formatDateFR(day, month, year);

      setLocked(false);
      clearMarks();
      hideResult();
      resetSelections();

      startMs = performance.now();
      lastElapsedMs = 0;
      clearTimerState();
      setTimer(0);
      startTimer();
    }

    // Tabs: toggle sections
    const tabButtons = [...document.querySelectorAll(".tabBtn")];
    const sections = [...document.querySelectorAll(".sec")];

    function setSecVisible(secKey, visible){
      const btn = tabButtons.find(b => b.dataset.sec === secKey);
      const sec = sections.find(s => s.dataset.sec === secKey);
      if(btn) btn.classList.toggle("on", visible);
      if(sec) sec.classList.toggle("on", visible);
      refreshToggleAllLabel();
    }

    function areAllHidden(){ return sections.every(s => !s.classList.contains("on")); }
    function refreshToggleAllLabel(){
      el("btnToggleAll").textContent = areAllHidden() ? "Tout d\u00E9plier" : "Tout replier";
    }
    function setHelpOpen(v){
      el("helpPanel").classList.toggle("on", v);
      el("btnHelp").setAttribute("aria-expanded", v ? "true" : "false");
      el("helpHandle").setAttribute("aria-expanded", v ? "true" : "false");
    }
    function toggleHelp(){
      const now = el("helpPanel").classList.contains("on");
      setHelpOpen(!now);
    }

    tabButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.sec;
        const sec = sections.find(s => s.dataset.sec === key);
        const now = sec ? sec.classList.contains("on") : false;
        setSecVisible(key, !now);
      });
    });

    el("btnToggleAll").addEventListener("click", () => {
      const openAll = areAllHidden();
      sections.forEach(s => setSecVisible(s.dataset.sec, openAll));
    });
    el("btnHelp").addEventListener("click", toggleHelp);
    el("helpHandle").addEventListener("click", toggleHelp);

    // Build UI
    buildChipsRange("chipsK","K",0,6);
    buildChipsRange("chipsA","a",0,8);
    buildChipsRange("chipsB","b",0,11);
    buildChipsRange("chipsC","c",0,2);

    buildDays("daysDoomsday","doomsday");
    buildDays("daysDate","dateDay", validateNow); // auto-validate here

    el("btnNew").addEventListener("click", () => chooseRandomDate(true));
    el("btnTheme").addEventListener("click", toggleTheme);
    el("btnCompet").addEventListener("click", () => {
      const next = !competMode;
      setCompetMode(next);
      stopTimer();
      hasStarted = false;
      current = null;
      setLocked(true);
      clearMarks();
      resetSelections();
      hideResult();
      setTimerIdle();
      el("dateInput").value = "--/--/----";
    });

    // Init
    applyTheme(THEME_LIGHT);
    setCompetMode(false);
    setLocked(true);
    hideResult();
    setTimerIdle();
    setAverage();
    setHelpOpen(false);
    refreshToggleAllLabel();
    setScore();
