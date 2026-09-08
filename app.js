const cfg = window.GB_BOOKING_CONFIG;
const dialog = document.getElementById('bookingDialog');
const modalContent = document.getElementById('stepContent');
const embedShell = document.getElementById('embeddedBooking');
const embeddedContent = document.getElementById('embeddedContent');
const params = new URLSearchParams(location.search);
const embedMode = params.get('embed') === '1';
const initialService = ['simulator','barrel'].includes(params.get('service')) ? params.get('service') : null;
let activeHost = modalContent;
let state = { type:null, duration:120, date:'', time:'', simulator:'' };

function todayISO(){const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10)}
function fmtDuration(m){return m%60===0?`${m/60} Hour${m===60?'':'s'}`:`${Math.floor(m/60)}.5 Hours`}
function fmtTime(h,m){const d=new Date(2020,0,1,h,m);return d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}).replace(':00','')}
function fmtDate(s){if(!s)return '';const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}
function el(id){return document.getElementById(id)}
function setHost(html){activeHost.innerHTML=html; requestResize()}
function requestResize(){if(!embedMode)return;setTimeout(()=>parent.postMessage({type:'gb-resize',height:document.documentElement.scrollHeight},'*'),40)}
window.addEventListener('load',requestResize); window.addEventListener('resize',requestResize);

function openService(type){
  state={type,duration:120,date:'',time:'',simulator:''};
  if(embedMode){activeHost=embeddedContent;embedShell.hidden=false;renderStart();}
  else{activeHost=modalContent;dialog.showModal();renderStart();}
}

document.querySelectorAll('[data-open]').forEach(btn=>btn.addEventListener('click',()=>openService(btn.dataset.open)));

if(embedMode){
  document.body.classList.add('embedded');
  document.querySelectorAll('.standalone-only').forEach(n=>n.hidden=true);
  openService(initialService || 'simulator');
}

function renderStart(){state.type==='simulator'?renderSimulator():renderBarrel()}

function renderSimulator(){
 setHost(`<div class="booking-panel"><div class="step-label">GOLF SIMULATOR</div><h3>Book your simulator</h3><p class="intro">Choose your session length and date. We'll show only times that can fit your entire session.</p>
 <div class="duration-grid">${cfg.simulatorDurations.map(m=>`<button type="button" class="choice ${state.duration===m?'active':''}" data-duration="${m}">${m===60?'1 HR':m===90?'1.5 HR':m===120?'2 HR':m===150?'2.5 HR':'3 HR'}</button>`).join('')}</div>
 <div class="field"><label for="simDate">Reservation Date</label><input id="simDate" type="date" min="${todayISO()}" value="${state.date}"></div>
 <div id="availability"></div></div>`);
 document.querySelectorAll('[data-duration]').forEach(b=>b.onclick=()=>{state.duration=+b.dataset.duration;renderSimulator();if(state.date)loadAvailability()});
 el('simDate').onchange=e=>{state.date=e.target.value;state.time='';loadAvailability()};
 if(state.date)loadAvailability();
}

async function loadAvailability(){
 const host=el('availability'); host.innerHTML='<p class="small loading">Checking both simulators…</p>'; requestResize();
 let availability=[]; let demo=false;
 try{
   if(cfg.apiUrl){
     const u=new URL(cfg.apiUrl);
     u.searchParams.set('action','availability');
     u.searchParams.set('date',state.date);
     u.searchParams.set('duration',state.duration);
     u.searchParams.set('resource','simulator');
     const r=await fetch(u);
     const data=await r.json();
     if(!data.ok)throw new Error(data.error||'Availability unavailable');
     availability=data.times||[];
   } else {
     availability=demoTimes().map(time=>({time,simulator1:true,simulator2:true}));
     demo=true;
   }
 }catch(e){
   host.innerHTML='<div class="notice error">We could not load live availability. Please call Global Brew at 618.307.5858.</div>';
   requestResize();return;
 }
 const rows=availability.length?availability.map(slot=>`<div class="availability-row"><div class="availability-time">${slot.time}</div><button type="button" class="choice sim-slot ${slot.simulator1?'':'unavailable'}" ${slot.simulator1?'':'disabled'} data-time="${slot.time}" data-simulator="simulator1">${slot.simulator1?'Simulator 1':'Booked'}</button><button type="button" class="choice sim-slot ${slot.simulator2?'':'unavailable'}" ${slot.simulator2?'':'disabled'} data-time="${slot.time}" data-simulator="simulator2">${slot.simulator2?'Simulator 2':'Booked'}</button></div>`).join(''):'<p class="small">No simulator openings are available for this date.</p>';
 host.innerHTML=`${demo?'<div class="demo-banner">DEMO MODE — connect Google Calendar before launch.</div>':''}<div class="field"><label>Available Start Times</label><p class="small availability-help">Choose the simulator and start time you want to reserve.</p><div class="availability-grid"><div class="availability-head"><span>Time</span><span>Simulator 1</span><span>Simulator 2</span></div>${rows}</div></div><div id="simContact"></div>`;
 host.querySelectorAll('[data-simulator]').forEach(b=>b.onclick=()=>{
   state.time=b.dataset.time;
   state.simulator=b.dataset.simulator;
   host.querySelectorAll('[data-simulator]').forEach(x=>x.classList.toggle('active',x===b));
   renderSimContact();
 });
 requestResize();
}
function demoTimes(){let arr=[];for(let mins=cfg.simulatorStartHour*60;mins<=cfg.simulatorEndHour*60-state.duration;mins+=cfg.simulatorStepMinutes){arr.push(fmtTime(Math.floor(mins/60),mins%60))}return arr}
function renderSimContact(){
 const node=el('simContact');node.innerHTML=`<div class="notice"><strong>${state.simulator==='simulator1'?'Simulator 1':'Simulator 2'}</strong><br><strong>${fmtDate(state.date)}</strong><br>${state.time} · ${fmtDuration(state.duration)}</div>
 <div class="field-grid"><div class="field"><label for="name">Name</label><input id="name" autocomplete="name" required></div><div class="field"><label for="phone">Phone</label><input id="phone" type="tel" autocomplete="tel" required></div><div class="field full"><label for="email">Email</label><input id="email" type="email" autocomplete="email" required></div></div>
 <label class="policy"><input id="simPolicy" type="checkbox"> <span>I understand my reservation is for the selected time and I should contact Global Brew if I need to make a change.</span></label>
 <div class="actions"><button type="button" class="btn secondary" id="backToTimes">Change Selection</button><button type="button" class="btn primary" id="confirmSim">Confirm Booking</button></div>`;
 el('backToTimes').onclick=renderSimulator;el('confirmSim').onclick=submitSimulator;requestResize();
}

async function submitSimulator(){
 const payload={action:'book',resource:'simulator',simulator:state.simulator,duration:state.duration,date:state.date,time:state.time,name:el('name').value.trim(),phone:el('phone').value.trim(),email:el('email').value.trim()};
 if(!payload.simulator)return alert('Please select Simulator 1 or Simulator 2.');
 if(!payload.name||!payload.phone||!payload.email)return alert('Please complete your name, phone and email.');
 if(!el('simPolicy').checked)return alert('Please acknowledge the reservation policy.');
 if(!cfg.apiUrl)return alert('The live calendar backend has not been connected yet.');
 const btn=el('confirmSim');btn.disabled=true;btn.textContent='Booking…';
 try{const r=await fetch(cfg.apiUrl,{method:'POST',body:JSON.stringify(payload)});const data=await r.json();if(!data.ok)throw new Error(data.error||'Could not book');renderSuccess('simulator',payload,data)}catch(e){alert(e.message||'Could not complete the reservation.');btn.disabled=false;btn.textContent='Confirm Booking'}
}

function renderBarrel(){
 setHost(`<div class="booking-panel"><div class="step-label">THE BARREL ROOM</div><h3>Request the Barrel Room</h3><p class="intro">Tell us about your event. This request is reviewed by Global Brew before the room is confirmed.</p>
 <div class="field-grid"><div class="field"><label for="eventDate">Event Date</label><input id="eventDate" type="date" min="${todayISO()}" required></div><div class="field"><label for="eventType">Event Type</label><select id="eventType"><option>Birthday</option><option>Corporate Event</option><option>Shower</option><option>Reunion</option><option>Celebration</option><option>Other</option></select></div>
 <div class="field"><label for="startTime">Start Time</label><input id="startTime" type="time" required></div><div class="field"><label for="endTime">End Time</label><input id="endTime" type="time" required></div>
 <div class="field"><label for="guests">Estimated Guests</label><input id="guests" type="number" min="1" max="60" placeholder="40"></div><div class="field"><label for="bName">Name</label><input id="bName" autocomplete="name" required></div>
 <div class="field"><label for="bPhone">Phone</label><input id="bPhone" type="tel" autocomplete="tel" required></div><div class="field"><label for="bEmail">Email</label><input id="bEmail" type="email" autocomplete="email" required></div>
 <div class="field full"><label for="notes">Event Notes</label><textarea id="notes" placeholder="Tell us anything we should know about your event."></textarea></div></div>
 <div class="notice">Submitting this form does not confirm the Barrel Room. Global Brew will review the request and follow up. Toast invoicing/card authorization is handled separately when needed.</div>
 <div class="actions end"><button type="button" class="btn primary" id="submitBarrel">Submit Request</button></div></div>`);
 el('submitBarrel').onclick=submitBarrel;requestResize();
}

async function submitBarrel(){
 const required=['eventDate','startTime','endTime','bName','bPhone','bEmail'];if(required.some(id=>!el(id).value))return alert('Please complete the required fields.');
 if(el('endTime').value<=el('startTime').value)return alert('End time must be later than start time.');
 const payload={action:'request',resource:'barrel',date:el('eventDate').value,startTime:el('startTime').value,endTime:el('endTime').value,eventType:el('eventType').value,guests:el('guests').value,name:el('bName').value.trim(),phone:el('bPhone').value.trim(),email:el('bEmail').value.trim(),notes:el('notes').value.trim()};
 if(!cfg.apiUrl)return alert('The live calendar backend has not been connected yet.');
 const btn=el('submitBarrel');btn.disabled=true;btn.textContent='Sending…';
 try{const r=await fetch(cfg.apiUrl,{method:'POST',body:JSON.stringify(payload)});const data=await r.json();if(!data.ok)throw new Error(data.error||'Could not send request');renderSuccess('barrel',payload,data)}catch(e){alert(e.message||'Could not submit the request.');btn.disabled=false;btn.textContent='Submit Request'}
}

function renderSuccess(type,p,data){
 const instant=type==='simulator';setHost(`<div class="booking-panel success"><div class="check">✓</div><div class="step-label">${instant?'RESERVATION CONFIRMED':'REQUEST RECEIVED'}</div><h3>${instant?'You’re booked.':'We’ve got it.'}</h3><p class="intro">${instant?`Your <strong>${p.simulator==='simulator1'?'Simulator 1':'Simulator 2'}</strong> reservation is confirmed for <strong>${fmtDate(p.date)}</strong> at <strong>${p.time}</strong> for <strong>${fmtDuration(p.duration)}</strong>.`:`Your Barrel Room request for <strong>${fmtDate(p.date)}</strong> has been submitted. Global Brew will review it and follow up with you.`}</p><p class="small">A confirmation has been sent to <strong>${p.email}</strong>.</p>${embedMode?'':`<button type="submit" class="btn primary">Done</button>`}</div>`);requestResize();
}
