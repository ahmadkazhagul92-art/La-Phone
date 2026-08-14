// ==================== ПРОВЕРКА IMEI — СПРАВОЧНИК САЙТОВ (данные, не логика) ====================
// Список проверок и сайтов — 1:1 перенос из laphone_imei_check_preview_v3.html.
// Позже переедет на загрузку из Supabase (таблица настроек) без переписывания
// остального кода блока проверки — см. renderImeiCheckBlock ниже.
const IMEI_CHECKS = {
  rfs:{
    title:'Реестр РК', req:true,
    desc:'Легальность в Казахстане + сколько номеров привязано. Капчу пройдёшь сам.',
    okLabel:'✅ Верифицирован', badLabel:'⚠️ Не верифиц.',
    sites:[
      {name:'imei.rfs.gov.kz', url:'https://imei.rfs.gov.kz/', note:'основной · капча'},
      {name:'gov.kz', url:'https://egov.kz/', note:'та же база'},
      {name:'eGov Mobile', url:'https://egov.kz/', note:'приложение'},
    ],
  },
  icloud:{
    title:'Скрытый iCloud', req:true,
    desc:'Привязка к чужому Apple ID (Find My iPhone). Капчи нет — результат сразу.',
    okLabel:'✅ Чистый (FMI OFF)', badLabel:'🛑 Скрытый iCloud',
    sites:[
      {name:'iunlocker.com', url:'https://iunlocker.com/check/icloud-status/', note:'основной'},
      {name:'imeicheck.com', url:'https://imeicheck.com/icloud-check', note:'запасной'},
      {name:'imeipro.info', url:'https://www.imeipro.info/free-icloud-check.html', note:'запасной'},
      {name:'itoolab.com', url:'https://itoolab.com/icloud-lock-check/', note:'запасной'},
    ],
  },
  carrier:{
    title:'Контракт / Knox', req:true,
    desc:'Залочен ли под оператора, есть ли Knox Guard (блок при рассрочке). Капчи нет.',
    okLabel:'✅ Чистый', badLabel:'🛑 Контракт/Knox',
    sites:[
      {name:'samfw.com', url:'https://samfw.com/imei', note:'основной'},
      {name:'imeicheck.com', url:'https://imeicheck.com/samsung-imei-check', note:'запасной'},
      {name:'imei.info', url:'https://www.imei.info/', note:'запасной'},
      {name:'imeipro.info', url:'https://www.imeipro.info/samsung_imei_check.html', note:'запасной'},
    ],
  },
  blacklist:{
    title:'Чёрный список (украден/утерян)', req:false,
    desc:'GSMA-реестр: не в розыске ли телефон. Отдельно от iCloud — нужны обе проверки.',
    okLabel:'✅ Чистый', badLabel:'🛑 В розыске',
    sites:[
      {name:'swappa.com', url:'https://swappa.com/imei', note:'основной · без регистрации'},
      {name:'imei24.com', url:'https://imei24.com/blacklist_check/', note:'запасной'},
      {name:'imei.io', url:'https://www.imei.io/free-blacklist-checker', note:'запасной'},
    ],
  },
};
const IMEI_CHECK_FLOW = { iphone:['rfs','icloud'], android:['rfs','carrier'], other:['rfs'] };

// ==================== ПРИЁМКА + СКАНЕР ====================
let scannedIMEI='';let intakeCondition='Отличное';
let html5Scanner=null;let scanMode='barcode';

function sellerIntake(){
  ++tabToken; // отменяем висящие перерисовки других вкладок
  scannedIMEI='';intakeCondition='Отличное';
  document.getElementById('main').innerHTML=`
    <div class="section-label" style="margin-top:0;">📥 Приёмка телефона на склад</div>
    <div class="scan-mode-tabs">
      <div class="smt active" id="smt-barcode" onclick="setScanMode('barcode')">📷 Штрих-код IMEI</div>
      <div class="smt" id="smt-ocr" onclick="setScanMode('ocr')">🔢 С экрана</div>
    </div>
    <div class="scan-hint" id="scan-hint">Наведи камеру на штрих-код IMEI на коробке или под крышкой телефона</div>
    <div class="scanner-wrap"><div id="reader"></div><div class="scan-overlay"><div class="scan-frame"><div class="scan-line"></div></div></div></div>
    <div id="scan-result"></div>
    <div style="text-align:center;margin:10px 0;color:var(--gray);font-size:12px;">— или —</div>
    <div class="form-group"><input class="form-input" id="manual-imei" placeholder="Ввести IMEI вручную" inputmode="numeric" onchange="useManualIMEI()"></div>
    <div id="intake-form"></div>`;
  startScanner();
}
function setScanMode(mode){
  scanMode=mode;
  document.getElementById('smt-barcode').classList.toggle('active',mode==='barcode');
  document.getElementById('smt-ocr').classList.toggle('active',mode==='ocr');
  document.getElementById('scan-hint').textContent=mode==='barcode'?'Наведи камеру на штрих-код IMEI на коробке или под крышкой телефона':'Набери на телефоне *#06# — наведи камеру на штрих-код IMEI с экрана';
  stopScanner();setTimeout(startScanner,300);
}
function startScanner(){
  if(html5Scanner)return;
  if(!window.Html5Qrcode){document.getElementById('reader').innerHTML='<div style="padding:40px 20px;text-align:center;color:var(--gray);font-size:13px;">📷 Открой на ТЕЛЕФОНЕ чтобы работала камера.<br>На компьютере — вводи IMEI вручную ниже 👇</div>';return;}
  html5Scanner=new Html5Qrcode("reader");
  html5Scanner.start({facingMode:"environment"},{fps:10,qrbox:{width:280,height:120}},
    (text)=>{onScanSuccess(text);},()=>{}
  ).catch(()=>{document.getElementById('reader').innerHTML='<div style="padding:40px 20px;text-align:center;color:var(--gray);font-size:13px;">📷 Разреши доступ к камере или вводи IMEI вручную 👇</div>';});
}
function stopScanner(){
  if(html5Scanner){
    const s=html5Scanner;
    html5Scanner=null; // сразу освобождаем ссылку — следующий скан не должен ждать асинхронный ответ камеры
    try{ s.stop().then(()=>{ try{s.clear();}catch(e){} }).catch(()=>{}); }catch(e){}
  }
}
function onScanSuccess(text){
  const d=text.replace(/\D/g,'');
  if(d.length>=14&&d.length<=16){stopScanner();scannedIMEI=d.slice(0,15);showImeiFound(scannedIMEI);if(navigator.vibrate)navigator.vibrate(100);}
}
function useManualIMEI(){const v=document.getElementById('manual-imei').value.replace(/\D/g,'');if(v.length>=10){scannedIMEI=v;stopScanner();showImeiFound(v);}}
function showImeiFound(imei){
  const exists=DB.products.find(p=>p.imei===imei&&!p.sold);
  document.getElementById('scan-result').innerHTML=`<div class="scan-result-box"><div class="srb-label">✓ IMEI считан</div><div class="srb-imei">${imei}</div></div>`;
  if(exists){document.getElementById('intake-form').innerHTML=`<div style="background:#1A1408;border:1px solid #3A2E15;border-radius:12px;padding:14px;font-size:13px;color:var(--gold);">⚠️ Уже на складе: ${exists.model}</div>`;return;}
  renderIntakeForm(imei);
}
function buildIntakeFormHTML(imei, opts={}){
  const pre = opts.prefill || {};
  intakeCondition = pre.condition || 'Отличное';
  const conds=['Новый','Отличное','Хорошее','Удовлетв.'];
  const condPills = conds.map(c=>`<div class="cond-pill ${c===intakeCondition?'active':''}" onclick="setCond('${c}',this)">${c}</div>`).join('');
  const storages=['64GB','128GB','256GB','512GB','1TB'];
  const storageSel = pre.storage || '256GB';
  const storageOpts = storages.map(s=>`<option ${s===storageSel?'selected':''}>${s}</option>`).join('');
  const battery = pre.battery!=null?pre.battery:90;
  const saveFn = opts.saveFnName || 'saveIntake';
  const imeiBlock = opts.editableImei
    ? `<div class="form-group"><label class="form-label">IMEI телефона</label><input class="form-input" id="in-imei-manual" value="${imei||''}" placeholder="35xxxxxxxxxxxxx" inputmode="numeric"></div>`
    : `<div class="intake-imei-display"><div class="ii-icon">📲</div><div><div class="ii-label">IMEI телефона</div><div class="ii-val">${imei}</div></div></div>`;
  return `<div class="intake-section">
    ${imeiBlock}
    <div id="imei-check-block-${imei}"></div>
    <div class="form-group"><label class="form-label">Модель</label><input class="form-input" id="in-model" value="${pre.model||''}" placeholder="iPhone 13" list="models-list">
      <datalist id="models-list"><option>iPhone 11</option><option>iPhone 12</option><option>iPhone 13</option><option>iPhone 13 Pro</option><option>iPhone 14</option><option>iPhone 14 Pro</option><option>iPhone 15</option><option>iPhone 15 Pro</option><option>Samsung Galaxy S23</option><option>Samsung Galaxy S24</option><option>Xiaomi 13</option><option>Redmi Note 13</option></datalist></div>
    <div class="form-row"><div class="form-group"><label class="form-label">Память</label><select class="form-select" id="in-storage">${storageOpts}</select></div>
      <div class="form-group"><label class="form-label">Цвет</label><input class="form-input" id="in-color" value="${pre.color||''}" placeholder="Black"></div></div>
    <div class="form-group"><label class="form-label">Ёмкость батареи</label><div class="battery-display"><div class="battery-val" id="in-bat-val">${battery}%</div><input type="range" min="50" max="100" value="${battery}" id="in-battery" oninput="document.getElementById('in-bat-val').textContent=this.value+'%'"></div></div>
    <div class="form-group"><label class="form-label">Состояние</label><div class="cond-pills" id="cond-pills">${condPills}</div></div>
    <div class="form-group"><label class="form-label">Дефекты</label><textarea class="form-textarea" id="in-defects" placeholder="Царапина на корпусе, скол снизу...">${pre.defects||''}</textarea></div>
    <div class="form-row"><div class="form-group"><label class="form-label">💸 Цена закупа</label><input class="form-input" id="in-buy" value="${pre.buy_price||''}" placeholder="70000" inputmode="numeric"></div>
      <div class="form-group"><label class="form-label">💰 Цена продажи</label><input class="form-input" id="in-sell" value="${pre.sell_price||''}" placeholder="87000" inputmode="numeric"></div></div>
    <div style="background:#1A1408;border:1px solid #3A2E15;border-radius:12px;padding:14px;margin:14px 0;">
      <div style="font-family:'Space Grotesk',sans-serif;font-size:14px;font-weight:700;color:var(--gold);margin-bottom:4px;">🪪 Данные того, у кого купили телефон</div>
      <div style="font-size:11px;color:var(--gray);margin-bottom:12px;line-height:1.5;">Обязательно — это твоя защита, если телефон окажется краденым. Записывается один раз и хранится всегда вместе с этим IMEI.</div>
      <div class="form-group"><label class="form-label">Фамилия Имя продавца</label><input class="form-input" id="in-seller-name" value="${pre.seller_name||''}" placeholder="Асылбеков Асан"></div>
      <div class="form-group"><label class="form-label">Номер телефона продавца</label><input class="form-input" id="in-seller-phone" value="${pre.seller_phone||''}" placeholder="+7 701 234 5678" inputmode="tel"></div>
      <div class="form-group"><label class="form-label">ИИН продавца</label><input class="form-input" id="in-seller-iin" value="${pre.seller_iin||''}" placeholder="123456789012" inputmode="numeric" maxlength="12"></div>
    </div>
    <button class="modal-btn primary btn-locked" style="width:100%;margin-top:8px;" onclick="${saveFn}('${imei}')" disabled>✅ Принять на склад</button></div>`;
}
function renderIntakeForm(imei){
  document.getElementById('intake-form').innerHTML = buildIntakeFormHTML(imei, {saveFnName:'saveIntake'});
  renderImeiCheckBlock(imei, null, {editableImei:false});
}
function setCond(c,el){intakeCondition=c;document.querySelectorAll('#cond-pills .cond-pill').forEach(p=>p.classList.remove('active'));el.classList.add('active');}
// Читает и валидирует общие поля формы приёмки (используется и обычной приёмкой, и приёмкой обменного телефона)
function readIntakeFormFields(editableImei){
  const imei = editableImei ? (document.getElementById('in-imei-manual')?.value||'').replace(/\D/g,'') : null;
  const model=document.getElementById('in-model').value.trim();
  const sell=parseInt(document.getElementById('in-sell').value)||0;
  const buy=parseInt(document.getElementById('in-buy').value)||0;
  const sellerName=document.getElementById('in-seller-name').value.trim();
  const sellerPhone=document.getElementById('in-seller-phone').value.trim();
  const sellerIin=document.getElementById('in-seller-iin').value.trim();
  if(editableImei && imei.length<10){showToast('⚠️ Укажи корректный IMEI',true);return null;}
  if(!model){showToast('⚠️ Укажи модель',true);return null;}
  if(!sell){showToast('⚠️ Укажи цену продажи',true);return null;}
  if(!sellerName){showToast('⚠️ Укажи фамилию и имя продавца',true);return null;}
  if(!sellerPhone){showToast('⚠️ Укажи номер телефона продавца',true);return null;}
  if(!sellerIin){showToast('⚠️ Укажи ИИН продавца',true);return null;}
  if(!/^\d{12}$/.test(sellerIin)){showToast('⚠️ ИИН должен быть из 12 цифр, без пробелов и дефисов',true);return null;}
  let brand='Другое';const ml=model.toLowerCase();
  if(ml.includes('iphone'))brand='iPhone';else if(ml.includes('samsung'))brand='Samsung';else if(ml.includes('xiaomi')||ml.includes('redmi'))brand='Xiaomi';
  return {imei,model,brand,sell,buy,sellerName,sellerPhone,sellerIin,
    storage:document.getElementById('in-storage').value,
    color:document.getElementById('in-color').value||'—',
    battery:parseInt(document.getElementById('in-battery').value),
    defects:document.getElementById('in-defects').value||''};
}
let _savingIntake=false;
async function saveIntake(imei){
  if(_savingIntake)return;
  _savingIntake=true;
  const f=readIntakeFormFields(false);
  if(!f){_savingIntake=false;return;}
  const np={id:'LP'+Date.now(),point:currentUser.point,model:f.model,brand:f.brand,storage:f.storage,color:f.color,imei,buy_price:f.buy,sell_price:f.sell,battery:f.battery,condition:intakeCondition,isNew:intakeCondition==='Новый',defects:f.defects,seller_name:f.sellerName,seller_phone:f.sellerPhone,seller_iin:f.sellerIin,sold:false,created_at:new Date().toISOString()};
  DB.products.push(np);
  if(cloudMode&&sb){
    try{
      const r=await withTimeout(sb.from('products').insert([np]));
      if(r.error){showToast('❌ Ошибка облака: '+r.error.message,true);console.error('INSERT ERROR:',r.error);}
      else{showToast('☁️ Телефон сохранён в облако ✅');}
    }catch(e){showToast('❌ Ошибка: '+e.message,true);console.error('INSERT CATCH:',e);}
  } else {
    showToast('⚠️ Сохранено локально — облако недоступно',true);
  }
  saveLocal();
  showToast('✅ '+f.model+' принят на склад!');
  if(navigator.vibrate)navigator.vibrate([50,30,50]);
  _savingIntake=false;
  sellerIntake();
}

// Полноценная приёмка обменного (трейд-ин) телефона — та же форма и валидация, что и у обычной приёмки
// Очередь обменных телефонов на приёмку — используется и при одиночной продаже, и при продаже из корзины
window._tradeInQueue = window._tradeInQueue || [];
let _savingQueuedTradeIn=false;
async function saveQueuedTradeIn(placeholderImei){
  if(_savingQueuedTradeIn)return;
  _savingQueuedTradeIn=true;
  const f=readIntakeFormFields(true);
  if(!f){_savingQueuedTradeIn=false;return;}
  if(DB.products.find(p=>p.imei===f.imei && !p.sold)){showToast('⚠️ Телефон с таким IMEI уже на складе',true);_savingQueuedTradeIn=false;return;}
  const np={id:'LP'+Date.now()+Math.random().toString(36).slice(2,4),point:currentUser.point,model:f.model,brand:f.brand,storage:f.storage,color:f.color,imei:f.imei,buy_price:f.buy,sell_price:f.sell,battery:f.battery,condition:intakeCondition,isNew:intakeCondition==='Новый',defects:f.defects,seller_name:f.sellerName,seller_phone:f.sellerPhone,seller_iin:f.sellerIin,sold:false,created_at:new Date().toISOString()};
  DB.products.push(np);
  if(cloudMode&&sb){
    try{
      const r=await withTimeout(sb.from('products').insert([np]));
      if(r.error){showToast('⚠️ Телефон сохранён локально, ошибка облака: '+r.error.message,true);}
      else{showToast('📦 Обменный телефон принят на склад ✅');}
    }catch(e){showToast('⚠️ Телефон сохранён локально (нет связи с облаком)',true);}
  } else {
    showToast('⚠️ Сохранено локально — облако недоступно',true);
  }
  saveLocal();
  window._tradeInQueue.shift();
  if(navigator.vibrate)navigator.vibrate([50,30,50]);
  _savingQueuedTradeIn=false;
  processTradeInQueue();
}
function processTradeInQueue(){
  const queue=window._tradeInQueue||[];
  if(queue.length===0){ closeModal(); document.querySelectorAll('.tab')[0].click(); return; }
  const t=queue[0];
  document.getElementById('modal-body').innerHTML=`
    <div class="modal-title">📥 Приёмка обменного телефона</div>
    <div class="modal-sub">${queue.length>1?`Осталось принять: ${queue.length} · `:''}Заполни полную приёмку, как обычно</div>
    ${buildIntakeFormHTML(t.imei, {editableImei:true, saveFnName:'saveQueuedTradeIn', prefill:{model:t.model, buy_price:t.buy_price, seller_name:t.seller_name, seller_phone:t.seller_phone}})}
  `;
  document.getElementById('modal').classList.add('open');
  renderImeiCheckBlock(t.imei, guessImeiCheckBrand(t.model), {editableImei:true});
}

// ==================== ПРОВЕРКА IMEI — БЛОК В ФОРМЕ ПРИЁМКИ ====================
// Полностью независимый блок: не трогает readIntakeFormFields/saveIntake/saveQueuedTradeIn/
// renderIntakeForm/showImeiFound/setCond/сканер. Логика 1:1 перенесена из
// laphone_imei_check_preview_v3.html. Блокировка кнопки "Принять на склад" делается
// только через DOM (disabled/класс btn-locked) — сама кнопка и её onclick не менялись.

// Угадывает бренд по названию модели — используется только чтобы предвыбрать вкладку
// iPhone/Android в блоке проверки, ни на что больше не влияет
function guessImeiCheckBrand(model){
  const m=(model||'').trim().toLowerCase();
  if(!m)return null;
  if(m.includes('iphone'))return'iphone';
  if(m.includes('samsung')||m.includes('galaxy')||m.includes('xiaomi')||m.includes('redmi')||m.includes('poco')||m.includes('huawei')||m.includes('honor')||m.includes('oppo')||m.includes('vivo')||m.includes('oneplus')||m.includes('pixel')||m.includes('realme'))return'android';
  return null;
}

let imeiCheckState = null;

function renderImeiCheckBlock(imei, brandHint, opts={}){
  const editableImei = !!opts.editableImei;
  const container = document.getElementById('imei-check-block-'+imei);
  if(!container)return;
  imeiCheckState = {
    imei, editableImei,
    brand: brandHint==='android'?'android':(brandHint==='other'?'other':'iphone'),
    status:{}, reason:{}, cache:null,
  };
  container.innerHTML = buildImeiCheckBlockHTML();
  renderImeiCheckSteps();
  updateImeiCheckVerdict();
  imeiCheckLookupCache();
  if(editableImei){
    const inp=document.getElementById('in-imei-manual');
    if(inp && !inp._imeiCheckBound){
      inp.addEventListener('input', imeiCheckLookupCache);
      inp._imeiCheckBound = true;
    }
  }
}

function buildImeiCheckBlockHTML(){
  const s=imeiCheckState;
  const brandLabels={iphone:'📱 iPhone', android:'🤖 Android', other:'📟 Другой'};
  const brandPills=['iphone','android','other'].map(b=>
    `<div class="cond-pill ${s.brand===b?'active':''}" onclick="setImeiCheckBrand('${b}')">${brandLabels[b]}</div>`
  ).join('');
  const bl=IMEI_CHECKS.blacklist;
  return `
    <div class="section-label" style="margin-top:22px;">🔍 Проверка IMEI</div>
    <div class="ic-cache-hit" id="ic-cache-hit"></div>
    <div class="form-group"><label class="form-label">Бренд</label><div class="cond-pills" id="ic-brand-pills">${brandPills}</div></div>
    <div id="ic-steps"></div>
    <div class="ic-step ic-info-step">
      <div class="ic-step-head"><div class="ic-num ic-num-info">i</div><div class="ic-title">${bl.title}</div><div class="ic-badge ic-badge-optional">Необязательно</div></div>
      <div class="ic-desc">GSMA-реестр краж/пропаж по всему миру. В Казахстане на это не реагируют — тут важна только легальность в РК (шаг «Реестр РК» выше). Кнопка чисто для любопытства, ни на что не влияет.</div>
      <div class="ic-body"><button type="button" class="ic-open-btn" onclick="openImeiCheckSite('${bl.sites[0].url}')">${bl.sites[0].name} <span class="ic-tag">без регистрации</span></button></div>
    </div>
    <div class="ic-verdict" id="ic-verdict"></div>
    <div class="ic-lock-note" id="ic-lock-note"></div>`;
}

function setImeiCheckBrand(b){
  const s=imeiCheckState; if(!s)return;
  s.brand=b; s.status={}; s.reason={};
  document.querySelectorAll('#ic-brand-pills .cond-pill').forEach(p=>p.classList.remove('active'));
  const idx={iphone:0,android:1,other:2}[b];
  const el=document.querySelectorAll('#ic-brand-pills .cond-pill')[idx];
  if(el)el.classList.add('active');
  renderImeiCheckSteps();
  updateImeiCheckVerdict();
}

function imeiCheckRequiredSteps(){
  const s=imeiCheckState; if(!s)return[];
  return (IMEI_CHECK_FLOW[s.brand]||[]).filter(k=>IMEI_CHECKS[k].req);
}

function renderImeiCheckSteps(){
  const s=imeiCheckState; if(!s)return;
  const cont=document.getElementById('ic-steps'); if(!cont)return;
  cont.innerHTML='';
  (IMEI_CHECK_FLOW[s.brand]||[]).forEach((key,i)=>{
    const c=IMEI_CHECKS[key];
    const main=c.sites[0], backups=c.sites.slice(1);
    const backupHTML=backups.map(site=>`<div class="ic-mini-btn" onclick="openImeiCheckSite('${site.url}')">${site.name}<span class="ic-mb-note">${site.note}</span></div>`).join('');
    const reqBadge=c.req?`<div class="ic-badge ic-badge-req">Обязательно</div>`:`<div class="ic-badge ic-badge-optional">Желательно</div>`;
    cont.insertAdjacentHTML('beforeend',`
      <div class="ic-step" id="ic-step-${key}">
        <div class="ic-step-head"><div class="ic-num" id="ic-num-${key}">${i+1}</div><div class="ic-title">${c.title}</div>${reqBadge}</div>
        <div class="ic-desc">${c.desc}</div>
        <div class="ic-body">
          <div class="ic-sites-label">Сайты проверки — если лимит, жми следующий</div>
          <button type="button" class="ic-open-btn" onclick="openImeiCheckSite('${main.url}')">${main.name} <span class="ic-tag">старт</span></button>
          <div class="ic-backup-row">${backupHTML}</div>
          <div class="ic-pick-label">Что показал сайт:</div>
          <div class="ic-pills" data-step="${key}">
            <div class="ic-pill" data-v="ok" onclick="pickImeiCheckResult(this)">${c.okLabel}</div>
            <div class="ic-pill" data-v="bad" onclick="pickImeiCheckResult(this)">${c.badLabel}</div>
          </div>
          <div class="ic-escape">
            <span class="ic-escape-link" onclick="toggleImeiCheckEscape('${key}')">Нигде не смог проверить?</span>
            <div class="ic-escape-panel" id="ic-esc-${key}">
              <div class="ic-escape-label">Все сайты залимитили или недоступны? Отметь причину — телефон примется с пометкой «не проверено»:</div>
              <div class="ic-reason-pills" data-step="${key}">
                <div class="ic-reason" onclick="skipImeiCheckStep(this,'${key}')">Везде лимит исчерпан</div>
                <div class="ic-reason" onclick="skipImeiCheckStep(this,'${key}')">Сайты недоступны / нет интернета</div>
                <div class="ic-reason" onclick="skipImeiCheckStep(this,'${key}')">Уже проверяли на другой точке</div>
              </div>
            </div>
          </div>
        </div>
      </div>`);
  });
}

function imeiCheckCurrentImei(){
  const s=imeiCheckState; if(!s)return'';
  if(s.editableImei){
    const inp=document.getElementById('in-imei-manual');
    return inp?inp.value.replace(/\D/g,''):'';
  }
  return s.imei||'';
}

function openImeiCheckSite(url){
  const imei=imeiCheckCurrentImei();
  if(imei){try{navigator.clipboard.writeText(imei);}catch(e){}}
  showToast(imei?('IMEI '+imei+' скопирован — вставь на сайте'):'Открываю сайт проверки');
  try{window.open(url,'_blank');}catch(e){}
}

function pickImeiCheckResult(el){
  const s=imeiCheckState; if(!s)return;
  const step=el.closest('.ic-pills').dataset.step, v=el.dataset.v;
  el.closest('.ic-pills').querySelectorAll('.ic-pill').forEach(p=>p.className='ic-pill');
  el.classList.add(v==='ok'?'sel-ok':'sel-bad');
  s.status[step]=v; s.reason[step]=null;
  const esc=document.getElementById('ic-esc-'+step); if(esc)esc.classList.remove('open');
  document.querySelectorAll('.ic-reason-pills[data-step="'+step+'"] .ic-reason').forEach(r=>r.classList.remove('on'));
  markImeiCheckStep(step);
  updateImeiCheckVerdict();
  maybeSaveImeiCheckCache();
}

function toggleImeiCheckEscape(step){
  const el=document.getElementById('ic-esc-'+step); if(el)el.classList.toggle('open');
}

function skipImeiCheckStep(el,step){
  const s=imeiCheckState; if(!s)return;
  el.parentElement.querySelectorAll('.ic-reason').forEach(r=>r.classList.remove('on'));
  el.classList.add('on');
  s.status[step]='skip'; s.reason[step]=el.textContent;
  const pillsWrap=document.querySelector('.ic-pills[data-step="'+step+'"]');
  if(pillsWrap)pillsWrap.querySelectorAll('.ic-pill').forEach(p=>p.className='ic-pill');
  markImeiCheckStep(step);
  updateImeiCheckVerdict();
  maybeSaveImeiCheckCache();
}

function markImeiCheckStep(step){
  const s=imeiCheckState; if(!s)return;
  const e=document.getElementById('ic-step-'+step); if(!e)return;
  e.classList.remove('ok','skip','bad');
  if(s.status[step]==='ok')e.classList.add('ok');
  else if(s.status[step]==='bad')e.classList.add('bad');
  else if(s.status[step]==='skip')e.classList.add('skip');
}

function updateImeiCheckVerdict(){
  const s=imeiCheckState; if(!s)return;
  const req=imeiCheckRequiredSteps();
  const vb=document.getElementById('ic-verdict');
  const lockNote=document.getElementById('ic-lock-note');
  if(!vb)return;
  const anyBad=req.some(k=>s.status[k]==='bad');
  const anyNull=req.some(k=>!s.status[k]);
  const anySkip=req.some(k=>s.status[k]==='skip');
  const allOk=req.length>0 && req.every(k=>s.status[k]==='ok');
  let cls='wait', icon='⏳', title='Заверши обязательные проверки', sub='Отметь результаты обязательных шагов.';
  if(anyBad){
    cls='stop'; icon='🛑'; title='Не принимать без согласования';
    sub='Проверка выявила блокировку. Решение о приёме — за владельцем.';
  }else if(anyNull){
    const left=req.filter(k=>!s.status[k]).length;
    sub='Осталось отметить: '+left+'. Отметь результат сайта или «нигде не смог».';
  }else if(anySkip){
    cls='warn'; icon='⚠️'; title='Можно принять с пометкой «не проверено»';
    const sk=req.filter(k=>s.status[k]==='skip').map(k=>IMEI_CHECKS[k].title);
    sub='Не проверено: '+sk.join(', ')+'. Причина запишется в лог.';
  }else if(allOk){
    cls='go'; icon='✅'; title='Можно принимать';
    sub='Все обязательные проверки чистые. Результат сохранится в базу для всех точек.';
  }
  vb.className='ic-verdict '+cls;
  vb.innerHTML=`<div class="ic-vb-icon">${icon}</div><div class="ic-vb-text"><div class="ic-vb-title">${title}</div><div class="ic-vb-sub">${sub}</div></div>`;

  const btn=document.querySelector('.intake-section .modal-btn.primary');
  if(btn){
    const ready = req.length>0 && req.every(k=>s.status[k]==='ok'||s.status[k]==='skip') && !anyBad;
    btn.disabled = !ready;
    btn.classList.toggle('btn-locked', !ready);
  }
  if(lockNote){
    if(anyBad){
      lockNote.textContent='🔒 Нужно согласование с владельцем — пока владелец не решит, телефон не сохранён.';
      lockNote.style.display='block';
    }else if(anyNull){
      lockNote.textContent='🔒 Заверши обязательные проверки IMEI, чтобы разблокировать приём.';
      lockNote.style.display='block';
    }else{
      lockNote.style.display='none';
    }
  }
}

// Кэш результатов проверки IMEI (Supabase) — необязательный слой: если облако недоступно,
// просто не показываем плашку и ничего не ломаем в остальной форме.
// Сетевой запрос дебаунсится (см. imeiCheckLookupCacheRequest) — при ручном посимвольном
// вводе IMEI не долбим Supabase на каждое нажатие клавиши.
let _imeiCheckLookupTimer=null;
function imeiCheckLookupCache(){
  const s=imeiCheckState; if(!s)return;
  const cacheEl=document.getElementById('ic-cache-hit'); if(!cacheEl)return;
  const imei=imeiCheckCurrentImei();
  cacheEl.classList.remove('show'); cacheEl.innerHTML=''; s.cache=null;
  clearTimeout(_imeiCheckLookupTimer);
  if(!imei||imei.length<10)return;
  if(!cloudMode||!sb)return;
  _imeiCheckLookupTimer=setTimeout(()=>imeiCheckLookupCacheRequest(imei), 450);
}
async function imeiCheckLookupCacheRequest(imei){
  const cacheEl=document.getElementById('ic-cache-hit'); if(!cacheEl)return;
  try{
    const r=await withTimeout(sb.from('imei_checks').select('*').eq('imei',imei).maybeSingle());
    if(!imeiCheckState || imeiCheckCurrentImei()!==imei)return; // пока ждали ответ — IMEI сменился или форму закрыли
    if(r.error||!r.data)return;
    const row=r.data;
    imeiCheckState.cache=row;
    const dateStr=row.checked_at?new Date(row.checked_at).toLocaleDateString('ru-RU'):'—';
    const pointName=(typeof POINTS!=='undefined'&&POINTS.find(p=>p.id===row.point)?.name)||row.point||'—';
    const rfsTxt=row.rfs_status==='ok'?'RFS чисто':'RFS — не проверено ('+(row.rfs_reason||'—')+')';
    const secondTxt=row.second_status==='ok'?'вторая проверка чисто':'вторая проверка — не проверено ('+(row.second_reason||'—')+')';
    cacheEl.innerHTML=`<div class="ic-ch-top">✓ Этот IMEI уже проверяли</div>
      <div class="ic-ch-body">Проверяли <b>${dateStr}</b> · ${pointName} · ${row.checked_by||'—'}<br>Статус: <b>${rfsTxt}</b>, <b>${secondTxt}</b></div>
      <button type="button" class="ic-ch-btn" onclick="useImeiCheckCache()">Использовать результат — не проверять заново</button>`;
    cacheEl.classList.add('show');
  }catch(e){ /* нет связи с облаком — просто не показываем плашку */ }
}

function useImeiCheckCache(){
  const s=imeiCheckState; if(!s||!s.cache)return;
  const row=s.cache;
  const req=imeiCheckRequiredSteps();
  const secondKey = s.brand==='iphone'?'icloud':(s.brand==='android'?'carrier':null);
  req.forEach(key=>{
    if(key==='rfs')s.status.rfs = row.rfs_status==='skip'?'skip':'ok';
    else if(key===secondKey)s.status[key] = row.second_status==='skip'?'skip':'ok';
    markImeiCheckStep(key);
    const pillsWrap=document.querySelector('.ic-pills[data-step="'+key+'"]');
    if(pillsWrap&&s.status[key]==='ok'){
      pillsWrap.querySelectorAll('.ic-pill').forEach(p=>{ if(p.dataset.v==='ok')p.className='ic-pill sel-ok'; });
    }
  });
  const cacheEl=document.getElementById('ic-cache-hit'); if(cacheEl)cacheEl.classList.remove('show');
  showToast('Результат взят из базы — проверка не нужна');
  updateImeiCheckVerdict();
}

// Как только все обязательные шаги закрыты (ok/skip, без bad) — сохраняем в кэш сразу,
// не дожидаясь нажатия "Принять на склад" (см. ЧАСТЬ 2.4 ТЗ)
let _imeiCheckSaving=false;
async function maybeSaveImeiCheckCache(){
  const s=imeiCheckState; if(!s)return;
  if(!cloudMode||!sb)return;
  const req=imeiCheckRequiredSteps();
  if(req.length===0)return;
  const anyBad=req.some(k=>s.status[k]==='bad');
  const allSet=req.every(k=>s.status[k]==='ok'||s.status[k]==='skip');
  if(anyBad||!allSet)return;
  const imei=imeiCheckCurrentImei();
  if(!imei||imei.length<10)return;
  if(_imeiCheckSaving)return;
  _imeiCheckSaving=true;
  const secondKey = s.brand==='iphone'?'icloud':(s.brand==='android'?'carrier':null);
  const row={
    imei, brand:s.brand,
    rfs_status:s.status.rfs, rfs_reason:s.reason.rfs||null,
    second_status: secondKey?s.status[secondKey]:null,
    second_reason: secondKey?(s.reason[secondKey]||null):null,
    checked_by: currentUser?currentUser.name:null,
    point: currentUser?currentUser.point:null,
    checked_at: new Date().toISOString(),
  };
  try{
    const r=await withTimeout(sb.from('imei_checks').upsert([row]));
    if(r.error)console.error('imei_checks upsert error:',r.error);
  }catch(e){ console.log('imei_checks upsert error', e); }
  _imeiCheckSaving=false;
}
