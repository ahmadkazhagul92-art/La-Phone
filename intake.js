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
    <button class="modal-btn primary" style="width:100%;margin-top:8px;" onclick="${saveFn}('${imei}')">✅ Принять на склад</button></div>`;
}
function renderIntakeForm(imei){
  document.getElementById('intake-form').innerHTML = buildIntakeFormHTML(imei, {saveFnName:'saveIntake'});
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
}
