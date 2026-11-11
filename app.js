const $ = (id) => document.getElementById(id);
const state = { name: localStorage.getItem('chatblox-name') || '', room: null, messages: [], channel: null, adminSessionVerified: false };
const reservedName = 'jergan';
let toastTimer;
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2300)}
function safeName(value){return value.trim().replace(/[<>]/g,'').slice(0,20)}
function saveDisplayName(){
  const requested=safeName($('displayName').value);
  if(!requested){toast('Choose a display name first.');return}
  if(requested.toLowerCase()===reservedName && !state.adminSessionVerified){$('adminPassword').value='';$('adminError').textContent='';$('adminDialog').showModal();return}
  if(state.name.toLowerCase()===reservedName && requested.toLowerCase()!==reservedName){state.isAdmin=false}
  state.name=requested;localStorage.setItem('chatblox-name',requested);$('displayName').value=requested;renderPeople();toast('Name updated.')
}
$('displayName').value=state.name;
$('saveName').addEventListener('click',saveDisplayName);
$('nameButton').addEventListener('click',()=>{$('displayName').focus();$('displayName').scrollIntoView({behavior:'smooth',block:'center'})});
$('closeAdmin').addEventListener('click',()=>$('adminDialog').close());
$('adminForm').addEventListener('submit',async(e)=>{
  e.preventDefault();$('adminError').textContent='';
  try{
    const response=await fetch('/api/admin-login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:$('adminPassword').value})});
    if(!response.ok)throw new Error(response.status===404?'Admin verification needs the server setup.':'That password was not accepted.');
    const result=await response.json();if(!result.ok)throw new Error('That password was not accepted.');
    state.name=reservedName;state.isAdmin=true;state.adminSessionVerified=true;localStorage.setItem('chatblox-name',reservedName);$('displayName').value=reservedName;$('adminDialog').close();renderPeople();toast('Admin name verified.')
  }catch(err){$('adminError').textContent=err.message}
});
function makeCode(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let code='';for(let i=0;i<6;i++)code+=chars[Math.floor(Math.random()*chars.length)];return code}
function roomKey(code){return 'chatblox-room-'+code}
function openRoom(code){
  if(!state.name){toast('Choose a display name before joining.');$('displayName').focus();return}
  state.room=code;state.messages=JSON.parse(localStorage.getItem(roomKey(code))||'[]');
  $('homeScreen').classList.add('hidden');$('chatScreen').classList.remove('hidden');$('roomTitle').textContent='Room '+code;$('copyCode').textContent=code+' ⧉';renderMessages();renderPeople();
  if(state.channel)state.channel.close();state.channel=new BroadcastChannel('chatblox-'+code);state.channel.onmessage=(event)=>{if(event.data?.type==='message'){state.messages.push(event.data.message);renderMessages()}};
}
$('createRoom').addEventListener('click',()=>{if(!state.name){toast('Choose a display name first.');$('displayName').focus();return}let code=makeCode();while(localStorage.getItem(roomKey(code)+'-created'))code=makeCode();localStorage.setItem(roomKey(code)+'-created','1');openRoom(code);toast('Room created. Share the code!')});
$('joinRoom').addEventListener('click',()=>{const code=$('roomCodeInput').value.trim().toUpperCase();if(!/^[A-Z0-9]{6}$/.test(code)){toast('Enter a valid 6-character room code.');return}if(!localStorage.getItem(roomKey(code)+'-created')){toast('Room not found in this browser demo.');return}openRoom(code)});
$('roomCodeInput').addEventListener('keydown',e=>{if(e.key==='Enter')$('joinRoom').click()});
$('copyCode').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(state.room);toast('Room code copied.')}catch{toast('Room code: '+state.room)}});
function renderMessages(){
  const box=$('messages');box.innerHTML='';
  if(!state.messages.length){box.innerHTML='<div class="empty-chat"><span>✦</span><b>It’s quiet in here.</b><p>Say hey and start the conversation.</p></div>';return}
  for(const item of state.messages){const article=document.createElement('article');article.className='message';const meta=document.createElement('div');meta.className='message-meta';const name=document.createElement('b');name.textContent=item.name;const time=document.createElement('time');time.textContent=new Date(item.time).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});const body=document.createElement('p');body.textContent=item.text;meta.append(name,time);article.append(meta,body);box.append(article)}
  box.scrollTop=box.scrollHeight;
}
function renderPeople(){
  $('peopleCount').textContent='1';$('peopleList').innerHTML='';
  const person=document.createElement('div');person.className='person';const avatar=document.createElement('span');avatar.className='avatar';avatar.textContent=(state.name||'?').slice(0,1).toUpperCase();const label=document.createElement('div');label.textContent=state.name||'Guest';const sub=document.createElement('small');sub.textContent=state.isAdmin?'Administrator':'You';label.append(sub);person.append(avatar,label);$('peopleList').append(person);
}
$('messageForm').addEventListener('submit',e=>{e.preventDefault();const text=$('messageInput').value.trim();if(!text||!state.room)return;const message={name:state.name,text,time:Date.now()};state.messages.push(message);localStorage.setItem(roomKey(state.room),JSON.stringify(state.messages.slice(-200)));state.channel?.postMessage({type:'message',message});$('messageInput').value='';renderMessages()});
$('leaveRoom').addEventListener('click',()=>{state.channel?.close();state.channel=null;state.room=null;$('chatScreen').classList.add('hidden');$('homeScreen').classList.remove('hidden')});
