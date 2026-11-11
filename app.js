const $ = (id) => document.getElementById(id);
const state = { name: localStorage.getItem('chatblox-name') || '', room: null, messages: [], adminSessionVerified: false, pollTimer: null, loadingMessages: false };
const reservedName = 'jergan';
let toastTimer;
function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2800);
}
function safeName(value) { return value.trim().replace(/[<>]/g, '').slice(0, 20); }
async function chatApi(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Chat server request failed.');
  return data;
}
function saveDisplayName() {
  const requested = safeName($('displayName').value);
  if (!requested) { toast('Choose a display name first.'); return; }
  if (requested.toLowerCase() === reservedName && !state.adminSessionVerified) {
    $('adminPassword').value = ''; $('adminError').textContent = ''; $('adminDialog').showModal(); return;
  }
  state.name = requested;
  localStorage.setItem('chatblox-name', requested);
  $('displayName').value = requested;
  renderPeople();
  toast('Name updated.');
}
$('displayName').value = state.name;
$('saveName').addEventListener('click', saveDisplayName);
$('nameButton').addEventListener('click', () => { $('displayName').focus(); $('displayName').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
$('closeAdmin').addEventListener('click', () => $('adminDialog').close());
$('adminForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  $('adminError').textContent = '';
  try {
    const response = await fetch('/api/admin-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: $('adminPassword').value }) });
    if (!response.ok) throw new Error(response.status === 503 ? 'Admin login is not configured in Vercel.' : 'That password was not accepted.');
    const result = await response.json();
    if (!result.ok) throw new Error('That password was not accepted.');
    state.name = reservedName;
    state.adminSessionVerified = true;
    localStorage.setItem('chatblox-name', reservedName);
    $('displayName').value = reservedName;
    $('adminDialog').close();
    renderPeople();
    toast('Admin name verified.');
  } catch (error) { $('adminError').textContent = error.message; }
});
async function openRoom(code) {
  if (!state.name) { toast('Choose and save a display name first.'); $('displayName').focus(); return; }
  state.room = code;
  state.messages = [];
  $('homeScreen').classList.add('hidden');
  $('chatScreen').classList.remove('hidden');
  $('roomTitle').textContent = 'Room ' + code;
  $('copyCode').textContent = code + ' ⧉';
  $('messages').innerHTML = '<div class="empty-chat"><b>Connecting to room…</b></div>';
  renderPeople();
  if (state.pollTimer) clearInterval(state.pollTimer);
  await loadMessages();
  state.pollTimer = setInterval(loadMessages, 1800);
  $('messageInput').focus();
}
async function loadMessages() {
  if (!state.room || state.loadingMessages) return;
  state.loadingMessages = true;
  try {
    const data = await chatApi('/api/chat?room=' + encodeURIComponent(state.room));
    if (state.room === data.room) {
      state.messages = Array.isArray(data.messages) ? data.messages : [];
      renderMessages();
    }
  } catch (error) {
    if (error.message !== 'Room not found.') toast(error.message);
  } finally { state.loadingMessages = false; }
}
$('createRoom').addEventListener('click', async () => {
  if (!state.name) { toast('Choose and save a display name first.'); $('displayName').focus(); return; }
  const button = $('createRoom');
  button.disabled = true;
  try {
    const data = await chatApi('/api/chat', { method: 'POST', body: JSON.stringify({ action: 'create' }) });
    await openRoom(data.room);
    toast('Room created. Share the code!');
  } catch (error) { toast(error.message); }
  finally { button.disabled = false; }
});
$('joinRoom').addEventListener('click', async () => {
  const code = $('roomCodeInput').value.trim().toUpperCase();
  if (!state.name) { toast('Choose and save a display name first.'); $('displayName').focus(); return; }
  if (!/^[A-Z0-9]{6}$/.test(code)) { toast('Enter a valid 6-character room code.'); return; }
  try {
    await chatApi('/api/chat', { method: 'POST', body: JSON.stringify({ action: 'join', room: code }) });
    await openRoom(code);
    toast('Joined room ' + code + '.');
  } catch (error) { toast(error.message); }
});
$('roomCodeInput').addEventListener('keydown', event => { if (event.key === 'Enter') $('joinRoom').click(); });
$('copyCode').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(state.room); toast('Room code copied.'); }
  catch { toast('Room code: ' + state.room); }
});
function renderMessages() {
  const box = $('messages');
  box.innerHTML = '';
  if (!state.messages.length) {
    box.innerHTML = '<div class="empty-chat"><span>✦</span><b>It’s quiet in here.</b><p>Say hey and start the conversation.</p></div>';
    return;
  }
  for (const item of state.messages) {
    const article = document.createElement('article');
    article.className = 'message';
    const meta = document.createElement('div');
    meta.className = 'message-meta';
    const name = document.createElement('b');
    name.textContent = item.name;
    const time = document.createElement('time');
    time.textContent = new Date(item.time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const body = document.createElement('p');
    body.textContent = item.text;
    meta.append(name, time);
    article.append(meta, body);
    box.append(article);
  }
  box.scrollTop = box.scrollHeight;
}
function renderPeople() {
  $('peopleCount').textContent = '1';
  $('peopleList').innerHTML = '';
  const person = document.createElement('div');
  person.className = 'person';
  const avatar = document.createElement('span');
  avatar.className = 'avatar';
  avatar.textContent = (state.name || '?').slice(0, 1).toUpperCase();
  const label = document.createElement('div');
  label.textContent = state.name || 'Guest';
  const sub = document.createElement('small');
  sub.textContent = state.adminSessionVerified ? 'Administrator' : 'You';
  label.append(sub);
  person.append(avatar, label);
  $('peopleList').append(person);
}
$('messageForm').addEventListener('submit', async event => {
  event.preventDefault();
  const text = $('messageInput').value.trim();
  if (!text || !state.room) return;
  const input = $('messageInput');
  const sendButton = $('messageForm').querySelector('button[type="submit"]');
  input.disabled = true;
  sendButton.disabled = true;
  try {
    await chatApi('/api/chat', { method: 'POST', body: JSON.stringify({ action: 'send', room: state.room, name: state.name, text }) });
    input.value = '';
    await loadMessages();
  } catch (error) { toast(error.message); }
  finally { input.disabled = false; sendButton.disabled = false; input.focus(); }
});
$('leaveRoom').addEventListener('click', () => {
  if (state.pollTimer) clearInterval(state.pollTimer);
  state.pollTimer = null;
  state.room = null;
  $('chatScreen').classList.add('hidden');
  $('homeScreen').classList.remove('hidden');
});
