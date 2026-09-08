const cfg = window.GB_BOOKING_CONFIG;
const root = document.getElementById('bookingRoot');
const params = new URLSearchParams(location.search);
const embedMode = params.get('embed') === '1';
const service = document.body.dataset.service || 'simulator';
let state = { duration:120, date:'', time:'', simulator:'' };

function todayISO(){const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)}
function fmtDuration(m){return m%60===0?`${m/60} Hour${m===60?'':'s'}`:`${Math.floor(m/60)}.5 Hours`}
function fmtDate(s){if(!s)return '';const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}
function el(id){return document.getElementById(id)}
function render(html){root.innerHTML=html;requestResize()}
function requestResize(){if(!embedMode)return;setTimeout(()=>parent.postMessage({type:'gb-resize',height:document.documentElement.scrollHeight},'*'),60)}

if(embedMode){document.body.classList.add('embedded');document.querySelectorAll('.standalone-only').forEach(n=>n.hidden=true)}
window.addEventListener('load',requestResize);window.addEventListener('resize',requestResize);

function renderSimulator(){
  render(`<div class="booking-panel">
    <div class="step-label">GOLF SIMULATOR RESERVATION</div>
    <h2>Find an available simulator</h2>
    <p class="intro">Choose your session length and date. You’ll see Simulator 1 and Simulator 2 side-by-side.</p>
    <div class="section-label">Session length</div>
    <div class="duration-grid">${cfg.simulatorDurations.map(m=>`<button type="button" class="choice ${state.duration===m?'active':''}" data-duration="${m}">${m===60?'1 HR':m===90?'1.5 HR':m===120?'2 HR':m===150?'2.5 HR':'3 HR'}</button>`).join('')}</div>
    <div class="field date-field"><label for="simDate">Reservation date</label><input id="simDate" type="date" min="${todayISO()}" value="${state.date}"></div>
    <div id="availability"></div>
  </div>`);
  root.querySelectorAll('[data-duration]').forEach(b=>b.addEventListener('click',()=>{state.duration=+b.dataset.duration;renderSimulator();if(state.date)loadAvailability()}));
  el('simDate').addEventListener('change',e=>{state.date=e.target.value;state.time='';state.simulator='';loadAvailability()});
  if(state.date)loadAvailability();
}

async function loadAvailability(){
  const host=el('availability');host.innerHTML='<p class="small loading">Checking both simulators…</p>';requestResize();
  try{
    const u=new URL(cfg.apiUrl);u.searchParams.set('action','availability');u.searchParams.set('date',state.date);u.searchParams.set('duration',state.duration);u.searchParams.set('resource','simulator');
    const r=await fetch(u);const data=await r.json();if(!data.ok)throw new Error(data.error||'Availability unavailable');
    const rows=(data.times||[]).map(slot=>`<div class="availability-row"><div class="availability-time">${slot.time}</div><button type="button" class="choice sim-slot ${slot.simulator1?'':'unavailable'}" ${slot.simulator1?'':'disabled'} data-time="${slot.time}" data-simulator="simulator1">${slot.simulator1?'Available':'Booked'}</button><button type="button" class="choice sim-slot ${slot.simulator2?'':'unavailable'}" ${slot.simulator2?'':'disabled'} data-time="${slot.time}" data-simulator="simulator2">${slot.simulator2?'Available':'Booked'}</button></div>`).join('');
    host.innerHTML=`<div class="field availability-block"><label>Available start times</label><p class="small availability-help">Select the exact simulator and start time you want.</p><div class="availability-grid"><div class="availability-head"><span>Time</span><span>Simulator 1</span><span>Simulator 2</span></div>${rows||'<p class="small empty">No openings are available for this date.</p>'}</div></div><div id="simContact"></div>`;
    host.querySelectorAll('[data-simulator]').forEach(b=>b.addEventListener('click',()=>{state.time=b.dataset.time;state.simulator=b.dataset.simulator;host.querySelectorAll('[data-simulator]').forEach(x=>x.classList.toggle('active',x===b));renderSimContact()}));requestResize();
  }catch(e){host.innerHTML='<div class="notice error">We could not load live availability. Please call Global Brew at 618.307.5858.</div>';requestResize()}
}

function renderSimContact(){
  const node=el('simContact');node.innerHTML=`<div class="selection-summary"><span>${state.simulator==='simulator1'?'Simulator 1':'Simulator 2'}</span><strong>${fmtDate(state.date)} · ${state.time}</strong><small>${fmtDuration(state.duration)}</small></div>
  <div class="field-grid"><div class="field"><label for="name">Name</label><input id="name" autocomplete="name" required></div><div class="field"><label for="phone">Phone</label><input id="phone" type="tel" autocomplete="tel" required></div><div class="field full"><label for="email">Email</label><input id="email" type="email" autocomplete="email" required></div></div>
  <label class="policy"><input id="simPolicy" type="checkbox"><span>I understand this reservation is for the selected simulator and time and I should contact Global Brew if I need to make a change.</span></label>
  <div class="actions"><button type="button" class="btn primary" id="confirmSim">Confirm reservation</button></div>`;
  el('confirmSim').addEventListener('click',submitSimulator);requestResize();
}

async function submitSimulator(){
  const payload={action:'book',resource:'simulator',simulator:state.simulator,duration:state.duration,date:state.date,time:state.time,name:el('name').value.trim(),phone:el('phone').value.trim(),email:el('email').value.trim()};
  if(!payload.name||!payload.phone||!payload.email)return alert('Please complete your name, phone and email.');
  if(!el('simPolicy').checked)return alert('Please acknowledge the reservation policy.');
  const btn=el('confirmSim');btn.disabled=true;btn.textContent='Booking…';
  try{const r=await fetch(cfg.apiUrl,{method:'POST',body:JSON.stringify(payload)});const data=await r.json();if(!data.ok)throw new Error(data.error||'Could not book');renderSuccess('simulator',payload)}catch(e){alert(e.message||'Could not complete the reservation.');btn.disabled=false;btn.textContent='Confirm reservation'}
}

function renderBarrel(){
  render(`<div class="booking-panel"><div class="step-label">BARREL ROOM PRIVATE EVENT REQUEST</div><h2>Tell us about your event</h2><p class="intro">Complete the form below and our team will review your requested date and time. Submitting this form does not confirm the room.</p>
  <div class="field-grid"><div class="field"><label for="eventDate">Event date</label><input id="eventDate" type="date" min="${todayISO()}" required></div><div class="field"><label for="eventType">Event type</label><select id="eventType"><option>Birthday</option><option>Corporate Event</option><option>Shower</option><option>Reunion</option><option>Celebration</option><option>Other</option></select></div><div class="field"><label for="startTime">Start time</label><input id="startTime" type="time" required></div><div class="field"><label for="endTime">End time</label><input id="endTime" type="time" required></div><div class="field"><label for="guests">Estimated guests</label><input id="guests" type="number" min="1" max="60" placeholder="40"></div><div class="field"><label for="bName">Name</label><input id="bName" autocomplete="name" required></div><div class="field"><label for="bPhone">Phone</label><input id="bPhone" type="tel" autocomplete="tel" required></div><div class="field"><label for="bEmail">Email</label><input id="bEmail" type="email" autocomplete="email" required></div><div class="field full"><label for="notes">Event notes</label><textarea id="notes" placeholder="Tell us anything we should know about your event."></textarea></div></div>
  <div class="notice">The Barrel Room accommodates approximately ${cfg.barrelRoomCapacity} guests. Global Brew will review your request and follow up. Any Toast invoice or card authorization is handled separately after your event details are approved.</div>
  <div class="actions"><button type="button" class="btn primary" id="submitBarrel">Submit request</button></div></div>`);
  el('submitBarrel').addEventListener('click',submitBarrel);requestResize();
}

async function submitBarrel(){
  const required=['eventDate','startTime','endTime','bName','bPhone','bEmail'];if(required.some(id=>!el(id).value))return alert('Please complete the required fields.');if(el('endTime').value<=el('startTime').value)return alert('End time must be later than start time.');
  const payload={action:'request',resource:'barrel',date:el('eventDate').value,startTime:el('startTime').value,endTime:el('endTime').value,eventType:el('eventType').value,guests:el('guests').value,name:el('bName').value.trim(),phone:el('bPhone').value.trim(),email:el('bEmail').value.trim(),notes:el('notes').value.trim()};
  const btn=el('submitBarrel');btn.disabled=true;btn.textContent='Sending…';
  try{const r=await fetch(cfg.apiUrl,{method:'POST',body:JSON.stringify(payload)});const data=await r.json();if(!data.ok)throw new Error(data.error||'Could not send request');renderSuccess('barrel',payload)}catch(e){alert(e.message||'Could not submit the request.');btn.disabled=false;btn.textContent='Submit request'}
}

function renderSuccess(type,p){
  const instant=type==='simulator';render(`<div class="booking-panel success"><div class="check">✓</div><div class="step-label">${instant?'RESERVATION CONFIRMED':'REQUEST RECEIVED'}</div><h2>${instant?'You’re booked.':'We’ve got it.'}</h2><p class="intro">${instant?`Your <strong>${p.simulator==='simulator1'?'Simulator 1':'Simulator 2'}</strong> reservation is confirmed for <strong>${fmtDate(p.date)}</strong> at <strong>${p.time}</strong> for <strong>${fmtDuration(p.duration)}</strong>.`:`Your Barrel Room request for <strong>${fmtDate(p.date)}</strong> has been submitted. Global Brew will review it and follow up with you.`}</p><p class="small">A confirmation has been sent to <strong>${p.email}</strong>.</p></div>`)
}

service==='barrel'?renderBarrel():renderSimulator();
