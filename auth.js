let currentUser = null;
// ==================== ЛОГИН ====================
// Строим кнопки входа из текущих настроек
function renderLoginButtons(){
  const colors={p1:'var(--accent)',p2:'var(--blue)',p3:'var(--purple)'};
  let html=`
    <button onclick="quickLogin('owner')" style="display:flex;align-items:center;gap:14px;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#000;border:none;border-radius:16px;padding:18px;cursor:pointer;text-align:left;">
      <div style="font-size:28px;">👑</div>
      <div style="flex:1;"><div style="font-family:'Space Grotesk',sans-serif;font-size:17px;font-weight:800;">Владелец</div><div style="font-size:11px;opacity:0.7;">${USERS.owner.name} · всё под контролем</div></div>
      <div style="font-size:22px;">›</div>
    </button>`;
  ['daniyar','aigerim','erlan'].forEach(k=>{
    const u=USERS[k];const pt=POINTS.find(p=>p.id===u.point);
    html+=`<button onclick="quickLogin('${k}')" style="display:flex;align-items:center;gap:14px;background:var(--surface2);color:var(--white);border:1px solid var(--border2);border-left:3px solid ${colors[u.point]};border-radius:16px;padding:16px;cursor:pointer;text-align:left;">
      <div style="font-size:24px;">🛒</div>
      <div style="flex:1;"><div style="font-family:'Space Grotesk',sans-serif;font-size:16px;font-weight:700;">${u.name}</div><div style="font-size:11px;color:var(--gray);">${pt.name}</div></div>
      <div style="font-size:20px;color:var(--gray);">›</div>
    </button>`;
  });
  document.getElementById('login-buttons').innerHTML=html;
}

function quickLogin(userId){
  const u=USERS[userId];
  document.getElementById('modal-body').innerHTML=`
    <div class="modal-title">🔒 ${u.name}</div>
    <div class="modal-sub">Введи пароль, чтобы войти</div>
    <div class="form-group"><input class="form-input" id="login-pass-input" type="password" placeholder="Пароль" autocomplete="current-password"></div>
    <div id="login-pass-err" style="display:none;color:var(--red);font-size:13px;text-align:center;margin-bottom:10px;">❌ Неверный пароль</div>
    <div class="modal-actions">
      <button class="modal-btn primary" id="login-submit-btn" onclick="confirmQuickLogin('${userId}')">Войти</button>
      <button class="modal-btn secondary" onclick="closeModal()">Отмена</button>
    </div>`;
  document.getElementById('modal').classList.add('open');
  setTimeout(()=>{
    const inp=document.getElementById('login-pass-input');
    if(inp){
      inp.focus();
      inp.onkeydown=(e)=>{ if(e.key==='Enter') confirmQuickLogin(userId); };
    }
  },150);
}

let loginToken = 0; // защита от гонки: устаревшая попытка логина не должна применить свой результат поверх новой
async function confirmQuickLogin(userId){
  const myToken = ++loginToken;
  const u=USERS[userId];
  const entered=document.getElementById('login-pass-input').value;
  if(!entered){ return; }
  if(!cloudMode || !sb){
    document.getElementById('login-pass-err').textContent='❌ Нет связи с облаком — проверь интернет';
    document.getElementById('login-pass-err').style.display='block';
    return;
  }
  const btn=document.getElementById('login-submit-btn');
  if(btn){btn.textContent='Проверяю...';btn.disabled=true;}
  try{
    const {data,error} = await withTimeout(sb.auth.signInWithPassword({email:AUTH_EMAILS[userId], password:entered}), 6000);
    if(myToken!==loginToken)return; // пока ждали ответ, пользователь уже начал другую попытку логина — эта устарела
    if(error || !data?.session){
      const errEl=document.getElementById('login-pass-err');
      if(errEl){errEl.textContent='❌ Неверный пароль';errEl.style.display='block';}
      if(navigator.vibrate)navigator.vibrate(200);
      const inp=document.getElementById('login-pass-input');
      if(inp){inp.value='';inp.focus();}
      if(btn){btn.textContent='Войти';btn.disabled=false;}
      return;
    }
    currentUser={...u,id:userId};
    closeModal();
    startApp();
  }catch(e){
    if(myToken!==loginToken)return;
    const errEl=document.getElementById('login-pass-err');
    if(errEl){errEl.textContent='⚠️ Не удалось проверить пароль — попробуй ещё раз';errEl.style.display='block';}
    if(btn){btn.textContent='Войти';btn.disabled=false;}
  }
}

async function logout(){
  currentUser=null;
  cart=[];
  if(typeof stopScanner==='function')stopScanner();
  const fab=document.getElementById('cart-fab');if(fab)fab.remove();
  if(cloudMode&&sb){ try{ await withTimeout(sb.auth.signOut(), 6000); }catch(e){} }
  document.getElementById('app').classList.remove('active');
  document.getElementById('login').style.display='flex';
  renderLoginButtons();
}

function changeMyPasswordForm(){
  if(!currentUser){return;}
  document.getElementById('modal-body').innerHTML=`
    <div class="modal-title">🔒 Сменить пароль</div>
    <div class="modal-sub">${currentUser.name}</div>
    <div class="form-group"><label class="form-label">Новый пароль</label><input class="form-input" id="new-pass-1" type="password" placeholder="Минимум 6 символов" autocomplete="new-password"></div>
    <div class="form-group"><label class="form-label">Повтори новый пароль</label><input class="form-input" id="new-pass-2" type="password" placeholder="Ещё раз" autocomplete="new-password"></div>
    <div id="new-pass-err" style="display:none;color:var(--red);font-size:13px;text-align:center;margin-bottom:10px;"></div>
    <div class="modal-actions">
      <button class="modal-btn primary" onclick="confirmChangeMyPassword()">✅ Сохранить новый пароль</button>
      <button class="modal-btn secondary" onclick="closeModal()">Отмена</button>
    </div>`;
  document.getElementById('modal').classList.add('open');
}

async function confirmChangeMyPassword(){
  const p1=document.getElementById('new-pass-1').value;
  const p2=document.getElementById('new-pass-2').value;
  const errEl=document.getElementById('new-pass-err');
  if(p1.length<6){ errEl.textContent='⚠️ Пароль должен быть минимум 6 символов'; errEl.style.display='block'; return; }
  if(p1!==p2){ errEl.textContent='⚠️ Пароли не совпадают'; errEl.style.display='block'; return; }
  if(!cloudMode||!sb){ errEl.textContent='⚠️ Нет связи с облаком — попробуй позже'; errEl.style.display='block'; return; }
  try{
    const {error} = await withTimeout(sb.auth.updateUser({password:p1}), 6000);
    if(error){ errEl.textContent='❌ '+error.message; errEl.style.display='block'; return; }
    closeModal();
    showToast('✅ Пароль изменён');
  }catch(e){
    errEl.textContent='⚠️ Не удалось сменить пароль — попробуй ещё раз';
    errEl.style.display='block';
  }
}

function startApp(){
  document.getElementById('login').style.display='none';
  document.getElementById('app').classList.add('active');
  // Загружаем данные (не блокируем вход если облако висит)
  try{ loadDBSync(); }catch(e){ console.log('load error',e); }
  const badge=document.getElementById('nav-badge');
  const sub=document.getElementById('nav-sub');
  if(currentUser.role==='admin'){
    badge.className='nav-badge admin';badge.innerHTML='👑 '+currentUser.name;
    sub.textContent='Командный центр';
    buildAdminTabs();
  } else {
    badge.className='nav-badge seller';badge.innerHTML='🛒 '+currentUser.name;
    const pt=POINTS.find(p=>p.id===currentUser.point);
    sub.textContent=pt.name.split('·')[1]?pt.name.split('·')[1].trim():pt.name;
    buildSellerTabs();
  }
}
