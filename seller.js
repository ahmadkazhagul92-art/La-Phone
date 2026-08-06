// ==================== SELLER ====================
function buildSellerTabs(){
  document.getElementById('tabs').innerHTML=`
    <div class="tab active" onclick="sellerTab('home',this)">🏠 Касса</div>
    <div class="tab" onclick="sellerTab('intake',this)">📥 Приёмка</div>
    <div class="tab" onclick="sellerTab('stock',this)">📦 Склад</div>
    <div class="tab" onclick="sellerTab('returns',this)">↩️ Возврат</div>
    <div class="tab" onclick="sellerTab('report',this)">📊 Отчёт</div>`;
  sellerHome();
}
function sellerTab(name,el){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));el.classList.add('active');
  if(name!=='intake') stopScanner();
  ({home:sellerHome,intake:sellerIntake,stock:sellerStock,returns:sellerReturns,report:sellerReport})[name]();
}
function mySales(){return DB.sales.filter(s=>s.point===currentUser.point);}

async function sellerHome(){const _t=++tabToken;if(cloudMode&&sb){await loadFromCloud();if(_t!==tabToken)return;}
  const s=mySales().filter(x=>!x.returned && isToday(x.created_at));const rev=s.reduce((a,b)=>a+b.sell_price,0);
  const marginToday=s.reduce((a,b)=>a+(b.sell_price-b.buy_price),0);
  const earnedToday=Math.round(marginToday*0.10);
  const sMonth=mySales().filter(x=>!x.returned && isThisMonth(x.created_at));
  const marginMonth=sMonth.reduce((a,b)=>a+(b.sell_price-b.buy_price),0);
  const earnedMonth=Math.round(marginMonth*0.10);
  const pt=POINTS.find(p=>p.id===currentUser.point);
  document.getElementById('main').innerHTML=`
    <div class="hero-stat"><div class="hs-label">Моя выручка · сегодня</div><div class="hs-value">${fmt(rev)}</div><div class="hs-change">↑ ${s.length} продаж · ${pt.name.split('·')[0].trim()}</div></div>
    <div class="stats-grid">
      <div class="stat-card" style="border-left:3px solid var(--accent);"><div class="stat-card-label">💼 Мой заработок сегодня</div><div class="stat-card-val accent">${fmt(earnedToday)}</div></div>
      <div class="stat-card" style="border-left:3px solid var(--gold);"><div class="stat-card-label">💼 Заработок за месяц</div><div class="stat-card-val" style="color:var(--gold);">${fmt(earnedMonth)}</div></div>
    </div>
    <div style="font-size:11px;color:var(--gray2);text-align:center;margin-bottom:14px;">10% от твоей маржи · обновляется сразу после каждой продажи</div>
    <button class="scan-big" onclick="document.querySelectorAll('.tab')[1].click()"><span class="scan-big-icon">📷</span>Сканировать и принять телефон</button>
    <div class="quick-actions">
      <div class="qa" onclick="document.querySelectorAll('.tab')[2].click()"><div class="qa-icon">📦</div><div class="qa-label">Склад сети</div></div>
      <div class="qa" onclick="document.querySelectorAll('.tab')[4].click()"><div class="qa-icon">📊</div><div class="qa-label">Мой отчёт</div></div>
    </div>
    <div class="section-label">Мои продажи сегодня</div>
    ${s.length?s.slice().reverse().map(x=>{const c=x.payment==='Наличные'?'var(--green)':x.payment==='Kaspi'?'var(--blue)':'var(--purple)';return `<div class="prod-item"><div class="prod-thumb">📱</div><div class="prod-info"><div class="prod-name">${x.model}</div><div class="prod-meta" style="color:${c};">● ${x.payment}</div></div><div class="prod-right"><div class="prod-price">${fmt(x.sell_price)}</div></div></div>`;}).join(''):'<div class="empty"><div class="empty-icon">🧾</div><div class="empty-text">Продаж пока нет</div></div>'}`;
}

// СКЛАД СЕТИ — продавец видит ВСЕ телефоны всех точек
let stockFilter='all';
function sellerStock(){const _t=++tabToken;renderFullStock('seller');if(cloudMode&&sb){loadFromCloud().then(()=>{if(_t===tabToken)renderFullStock('seller');});}}

function renderFullStock(mode){
  const main=document.getElementById('main');
  const stock=DB.products.filter(p=>p.sold!==true);
  main.innerHTML=`
    <div style="display:flex;gap:8px;margin-bottom:8px;">
      <div class="search-bar" style="flex:1;margin-bottom:0;"><span>🔍</span><input id="stock-search" placeholder="Поиск по модели или IMEI" oninput="filterStock()"></div>
      <button onclick="refreshStock('${mode}')" style="background:var(--surface2);border:1px solid var(--border2);border-radius:12px;padding:0 14px;color:var(--accent);font-size:18px;cursor:pointer;">🔄</button>
    </div>
    <div class="filter-pills" id="stock-pills">
      <div class="pill active" onclick="setStockFilter('all',this)">Все (${stock.length})</div>
      <div class="pill" onclick="setStockFilter('new',this)">✨ Новые (${stock.filter(p=>p.isNew).length})</div>
      <div class="pill" onclick="setStockFilter('used',this)">📲 Б/У (${stock.filter(p=>!p.isNew).length})</div>
      ${POINTS.map(p=>`<div class="pill" onclick="setStockFilter('${p.id}',this)">${p.seller}</div>`).join('')}
    </div>
    <div class="section-label">${mode==='seller'?'Общий склад La Phone · продавай любой':'Весь склад'}</div>
    <div id="stock-list"></div>`;
  stockFilter='all';
  renderStockList();
}

function setStockFilter(f,el){stockFilter=f;document.querySelectorAll('#stock-pills .pill').forEach(p=>p.classList.remove('active'));el.classList.add('active');renderStockList();}
function filterStock(){renderStockList();}

async function refreshStock(mode){
  if(!cloudMode||!sb){showToast('Облако не подключено');return;}
  const _t=++tabToken;
  showToast('🔄 Обновляю...');
  await loadFromCloud();
  if(_t!==tabToken)return; // пользователь уже ушёл на другую вкладку — не перерисовываем поверх неё
  renderFullStock(mode||'seller');
  showToast('✅ Склад обновлён');
}

function renderStockList(){
  const q=(document.getElementById('stock-search')?.value||'').toLowerCase();
  // Если идёт активный поиск — ищем по ВСЕМ телефонам (включая уже проданные), это нужно
  // для случая "приходит полиция и спрашивает про телефон, который мы уже продали"
  let items = q ? DB.products.slice() : DB.products.filter(p=>p.sold!==true);
  if(!q){
    if(stockFilter==='new')items=items.filter(p=>p.isNew);
    else if(stockFilter==='used')items=items.filter(p=>!p.isNew);
    else if(stockFilter!=='all')items=items.filter(p=>p.point===stockFilter);
  }
  if(q)items=items.filter(p=>
    p.model.toLowerCase().includes(q)||
    p.imei.includes(q)||
    (p.seller_name||'').toLowerCase().includes(q)||
    (p.seller_phone||'').includes(q)||
    (p.seller_iin||'').includes(q)
  );
  const list=document.getElementById('stock-list');
  if(items.length===0){list.innerHTML='<div class="empty"><div class="empty-icon">📦</div><div class="empty-text">Ничего не найдено</div></div>';return;}
  const pn=(pid)=>POINTS.find(p=>p.id===pid)?.name||pid;
  list.innerHTML=items.map(p=>{
    const isMine=currentUser.role==='seller'&&p.point===currentUser.point;
    return `<div class="prod-item" onclick="openProduct('${p.id}')">
      <div class="prod-thumb">${p.isNew?'✨':'📱'}</div>
      <div class="prod-info"><div class="prod-name">${p.model} ${p.storage}${p.isNew?' <span style=\"font-size:9px;background:var(--accent);color:#000;padding:1px 6px;border-radius:10px;font-weight:700;\">NEW</span>':''}${p.sold?' <span style=\"font-size:9px;background:var(--red-dim);color:var(--red);padding:1px 6px;border-radius:10px;font-weight:700;\">ПРОДАН</span>':''}</div><div class="prod-meta">🔋${p.battery}% · ${p.condition}${p.seller_name?' · сдал: '+p.seller_name:''}</div><div class="prod-point">📍 ${pn(p.point)}${isMine?' · моя точка':''}</div></div>
      <div class="prod-right"><div class="prod-price">${fmt(p.sell_price)}</div><div class="prod-stock ${isMine?'mine':'in'}">${p.sold?'продан':(isMine?'моя точка':'доступен')}</div></div>
    </div>`;
  }).join('');
}

function openProduct(id){
  const p=DB.products.find(x=>x.id===id);if(!p)return;
  const pn=(pid)=>POINTS.find(p=>p.id===pid)?.name||pid;
  const isMine=p.point===currentUser.point;
  const canSell=currentUser.role==='seller'; // любой продавец может продать любой телефон
  document.getElementById('modal-body').innerHTML=`
    <div class="modal-title">${p.model} ${p.storage}</div>
    <div class="modal-sub">${p.color} · 📍 ${pn(p.point)}${isMine?' · моя точка':''}</div>
    <div class="detail-rows">
      <div class="detail-row"><div class="detail-key">IMEI</div><div class="detail-val">${p.imei}</div></div>
      <div class="detail-row"><div class="detail-key">Батарея</div><div class="detail-val green">${p.battery}%</div></div>
      <div class="detail-row"><div class="detail-key">Состояние</div><div class="detail-val">${p.condition}</div></div>
      ${p.defects?`<div class="detail-row"><div class="detail-key">Дефекты</div><div class="detail-val" style="color:var(--orange);font-size:11px;text-align:right;max-width:60%;">${p.defects}</div></div>`:''}
      <div class="detail-row"><div class="detail-key">💸 Себестоимость</div><div class="detail-val">${fmt(p.buy_price)}</div></div>
      <div class="detail-row"><div class="detail-key">💰 Цена продажи</div><div class="detail-val accent">${fmt(p.sell_price)}</div></div>
      <div class="detail-row"><div class="detail-key">📈 Маржа</div><div class="detail-val green">+${fmt(p.sell_price-p.buy_price)} (${p.buy_price?Math.round((p.sell_price-p.buy_price)/p.buy_price*100):0}%)</div></div>
    </div>
    
    ${p.seller_name?`<div class="section-label">🪪 У кого купили телефон</div>
    <div class="detail-rows">
      <div class="detail-row"><div class="detail-key">Фамилия Имя</div><div class="detail-val">${p.seller_name}</div></div>
      <div class="detail-row"><div class="detail-key">Телефон</div><div class="detail-val">${p.seller_phone||'—'}</div></div>
      <div class="detail-row"><div class="detail-key">ИИН</div><div class="detail-val">${p.seller_iin||'—'}</div></div>
    </div>`:''}
    ${p.sold?(()=>{
      const sale=DB.sales.find(s=>s.passport_id===p.id);
      return sale?`<div class="section-label">👤 Кому продали</div>
      <div class="detail-rows">
        <div class="detail-row"><div class="detail-key">Фамилия Имя</div><div class="detail-val">${sale.client_name||'—'}</div></div>
        <div class="detail-row"><div class="detail-key">Телефон</div><div class="detail-val">${sale.client_phone||'—'}</div></div>
        <div class="detail-row"><div class="detail-key">Дата продажи</div><div class="detail-val">${new Date(sale.created_at).toLocaleDateString('ru-RU')}</div></div>
      </div>`:'';
    })():''}
    ${!isMine&&currentUser.role==='seller'&&!p.sold?`<div style="background:#1A1408;border:1px solid #3A2E15;border-radius:10px;padding:10px;margin-top:14px;font-size:12px;color:var(--gold);text-align:center;">📍 Телефон на точке "${pn(p.point).split('·')[0].trim()}" — забери оттуда или договорись о переносе</div>`:''}
    ${p.sold?`<div style="background:var(--red-dim);border:1px solid var(--red);border-radius:10px;padding:12px;margin-top:14px;font-size:12px;color:var(--red);text-align:center;">🔒 Этот телефон уже продан — найден по поиску для справки (например, по запросу правоохранительных органов)</div><button class="modal-btn secondary" style="width:100%;margin-top:12px;" onclick="closeModal()">Закрыть</button>`:
      canSell?`<div class="modal-actions"><button class="modal-btn primary" onclick="sellPhone('${p.id}')">💰 Продать сразу</button><button class="modal-btn" style="background:var(--blue-dim);color:var(--blue);border:1px solid var(--blue);" onclick="addToCart('${p.id}')">🛒 В корзину</button></div><button class="modal-btn secondary" style="width:100%;margin-top:8px;" onclick="closeModal()">Закрыть</button>`:
      `<div class="modal-actions"><button class="modal-btn primary" onclick="sellPhone('${p.id}')">💰 Продать</button><button class="modal-btn" style="background:#3B82F620;color:var(--blue);border:1px solid var(--blue);" onclick="editPriceAdmin('${p.id}')">✏️ Цены</button><button class="modal-btn" style="background:var(--red-dim);color:var(--red);border:1px solid var(--red);" onclick="deleteProductAdmin('${p.id}')">🗑</button></div><button class="modal-btn secondary" style="width:100%;margin-top:8px;" onclick="closeModal()">Закрыть</button>`}`;
  document.getElementById('modal').classList.add('open');
}
async function sellerReport(){const _t=++tabToken;if(cloudMode&&sb){await loadFromCloud();if(_t!==tabToken)return;}
  const s=mySales().filter(x=>!x.returned && isToday(x.created_at));
  const rev=s.reduce((a,b)=>a+b.sell_price,0);
  const cost=s.reduce((a,b)=>a+b.buy_price,0);
  const margin=rev-cost;
  const cashTotal=s.reduce((a,b)=>a+splitSaleByMethod(b).cash,0);
  const cashCount=s.filter(x=>splitSaleByMethod(x).cash>0).length;
  const onlineTotal=s.reduce((a,b)=>a+splitSaleByMethod(b).kaspi,0);
  const onlineCount=s.filter(x=>splitSaleByMethod(x).kaspi>0).length;
  const instTotal=s.reduce((a,b)=>a+splitSaleByMethod(b).inst,0);
  const instCount=s.filter(x=>splitSaleByMethod(x).inst>0).length;
  const returns=mySales().filter(x=>x.returned && isToday(x.return_date||x.created_at));
  const sMonthR=mySales().filter(x=>!x.returned && isThisMonth(x.created_at));
  const marginMonthR=sMonthR.reduce((a,b)=>a+(b.sell_price-b.buy_price),0);
  const earnedMonthR=Math.round(marginMonthR*0.10);
  const earnedTodayR=Math.round(margin*0.10);
  document.getElementById('main').innerHTML=`
    <div class="section-label">Мой отчёт · сегодня</div>
    <div class="stats-grid"><div class="stat-card"><div class="stat-card-label">Продаж</div><div class="stat-card-val accent">${s.length}</div></div><div class="stat-card"><div class="stat-card-label">Выручка</div><div class="stat-card-val white">${fmt(rev)}</div></div></div>
    <div class="stats-grid"><div class="stat-card"><div class="stat-card-label">💸 Себестоимость</div><div class="stat-card-val blue">${fmt(cost)}</div></div><div class="stat-card"><div class="stat-card-label">📈 Маржа</div><div class="stat-card-val green">+${fmt(margin)}</div></div></div>
    <div class="stats-grid"><div class="stat-card" style="border-left:3px solid var(--accent);"><div class="stat-card-label">💼 Заработал сегодня</div><div class="stat-card-val accent">${fmt(earnedTodayR)}</div></div><div class="stat-card" style="border-left:3px solid var(--gold);"><div class="stat-card-label">💼 Заработал за месяц</div><div class="stat-card-val" style="color:var(--gold);">${fmt(earnedMonthR)}</div></div></div>
    <div class="section-label">💵 Инкассация — что в кассе</div>
    <div class="payment-breakdown">
      <div class="pay-card cash"><div class="pay-icon">💵</div><div class="pay-info"><div class="pay-label">Наличными — сдать в кассу</div><div class="pay-val">${fmt(cashTotal)}</div><div class="pay-sub">${cashCount} продаж · физические деньги</div></div></div>
      <div class="pay-card online"><div class="pay-icon">📱</div><div class="pay-info"><div class="pay-label">Онлайн Kaspi</div><div class="pay-val">${fmt(onlineTotal)}</div><div class="pay-sub">${onlineCount} · на счёт</div></div></div>
      <div class="pay-card installment"><div class="pay-icon">📅</div><div class="pay-info"><div class="pay-label">Рассрочка</div><div class="pay-val">${fmt(instTotal)}</div><div class="pay-sub">${instCount} · Kaspi</div></div></div>
    </div>
    <div class="section-label">🧾 Мои продажи · возврат по гарантии</div>
    ${s.length?s.slice().reverse().map(x=>{
      const si=DB.sales.indexOf(x);
      return `<div class="prod-item">
        <div class="prod-thumb">📱</div>
        <div class="prod-info"><div class="prod-name">${x.model}</div><div class="prod-meta">${x.payment} · ${x.client_name||'клиент'}</div><div class="prod-point">закуп ${fmt(x.buy_price)} · маржа <span style="color:var(--green);">+${fmt(x.sell_price-x.buy_price)}</span></div></div>
        <div class="prod-right"><div class="prod-price">${fmt(x.sell_price)}</div><button onclick="returnSale(${si})" style="margin-top:4px;font-size:10px;padding:4px 10px;border-radius:8px;border:1px solid var(--red);background:var(--red-dim);color:var(--red);cursor:pointer;">↩️ Возврат</button></div>
      </div>`;
    }).join(''):'<div class="empty"><div class="empty-text">Продаж пока нет</div></div>'}
    ${returns.length?`<div class="section-label">↩️ Возвраты сегодня (${returns.length})</div>${returns.map(x=>`<div class="prod-item" style="opacity:0.6;" onclick="openReturnDetail(${DB.sales.indexOf(x)})"><div class="prod-thumb">↩️</div><div class="prod-info"><div class="prod-name">${x.model}</div><div class="prod-meta" style="color:var(--red);">Возврат · ${x.client_name||''}</div></div><div class="prod-right"><div class="prod-price" style="color:var(--red);">−${fmt(x.sell_price)}</div></div></div>`).join('')}`:''}
    <div style="background:var(--surface2);border-radius:12px;padding:16px;margin-top:14px;text-align:center;font-size:13px;color:var(--gray);line-height:1.6;">✅ Все твои продажи автоматически видит владелец в своей панели в реальном времени</div>`;
}

// ==================== ВКЛАДКА ВОЗВРАТ ====================
async function sellerReturns(){const _t=++tabToken;if(cloudMode&&sb){await loadFromCloud();if(_t!==tabToken)return;}
  const allSold=mySales().filter(x=>x.passport_id && !x.returned);
  const returns=mySales().filter(x=>x.returned);
  document.getElementById('main').innerHTML=`
    <div class="section-label" style="margin-top:2px;">↩️ Возврат телефона по гарантии</div>
    <div style="background:var(--surface2);border-radius:12px;padding:14px;margin-bottom:14px;font-size:13px;color:var(--gray);line-height:1.6;">
      Если телефон неисправен в течение гарантии (30 дней) — найди продажу и оформи возврат. Телефон вернётся на склад, выручка пересчитается.
    </div>
    <div class="search-bar"><span>🔍</span><input id="ret-search" placeholder="Поиск по IMEI, клиенту или модели" oninput="filterReturns()"></div>
    <div class="section-label">Проданные телефоны</div>
    <div id="returns-list">${renderReturnsList(allSold)}</div>
    ${returns.length?`<div class="section-label">↩️ Уже возвращено (${returns.length})</div>${returns.slice().reverse().map(x=>`<div class="prod-item" style="opacity:0.55;" onclick="openReturnDetail(${DB.sales.indexOf(x)})"><div class="prod-thumb">↩️</div><div class="prod-info"><div class="prod-name">${x.model}</div><div class="prod-meta" style="color:var(--red);">${x.return_reason||'Возврат'} · ${x.client_name||''}</div></div><div class="prod-right"><div class="prod-price" style="color:var(--red);">−${fmt(x.sell_price)}</div></div></div>`).join('')}`:''}
  `;
}

function renderReturnsList(items){
  if(items.length===0)return '<div class="empty"><div class="empty-icon">📭</div><div class="empty-text">Нет проданных телефонов<br>для возврата</div></div>';
  return items.slice().reverse().map(x=>{
    const si=DB.sales.indexOf(x);
    return `<div class="prod-item" onclick="returnSale(${si})">
      <div class="prod-thumb">📱</div>
      <div class="prod-info"><div class="prod-name">${x.model}</div><div class="prod-meta">${x.client_name||'клиент'} · ${x.payment}</div><div class="prod-point">IMEI ...${(x.imei||'').slice(-6)} · ${new Date(x.created_at).toLocaleDateString('ru-RU')}</div></div>
      <div class="prod-right"><div class="prod-price">${fmt(x.sell_price)}</div><div class="prod-stock" style="background:var(--red-dim);color:var(--red);">↩️ вернуть</div></div>
    </div>`;
  }).join('');
}

function openReturnDetail(si){
  const s=DB.sales[si];
  if(!s)return;
  const prod=DB.products.find(p=>p.id===s.passport_id);
  document.getElementById('modal-body').innerHTML=`
    <div class="modal-title">↩️ ${s.model}</div>
    <div class="modal-sub">История телефона · возврат оформлен</div>
    <div class="section-label" style="margin-top:0;">📱 Паспорт телефона</div>
    <div class="detail-rows">
      <div class="detail-row"><div class="detail-key">IMEI</div><div class="detail-val">${s.imei||prod?.imei||'—'}</div></div>
      <div class="detail-row"><div class="detail-key">Память</div><div class="detail-val">${s.storage||prod?.storage||'—'}</div></div>
      <div class="detail-row"><div class="detail-key">Батарея</div><div class="detail-val green">${s.battery||prod?.battery||'—'}%</div></div>
      <div class="detail-row"><div class="detail-key">Состояние</div><div class="detail-val">${s.condition||prod?.condition||'—'}</div></div>
    </div>
    ${prod?.seller_name?`<div class="section-label">🪪 У кого куплен телефон (приёмка)</div>
    <div class="detail-rows">
      <div class="detail-row"><div class="detail-key">Фамилия Имя</div><div class="detail-val">${prod.seller_name}</div></div>
      <div class="detail-row"><div class="detail-key">Телефон</div><div class="detail-val">${prod.seller_phone||'—'}</div></div>
      <div class="detail-row"><div class="detail-key">ИИН</div><div class="detail-val">${prod.seller_iin||'—'}</div></div>
    </div>`:''}
    <div class="section-label">👤 Кому продан</div>
    <div class="detail-rows">
      <div class="detail-row"><div class="detail-key">Клиент</div><div class="detail-val">${s.client_name||'—'}</div></div>
      <div class="detail-row"><div class="detail-key">Телефон клиента</div><div class="detail-val">${s.client_phone||'—'}</div></div>
      <div class="detail-row"><div class="detail-key">Сумма продажи</div><div class="detail-val">${fmt(s.sell_price)}</div></div>
      <div class="detail-row"><div class="detail-key">Дата продажи</div><div class="detail-val">${new Date(s.created_at).toLocaleDateString('ru-RU')}</div></div>
    </div>
    <div class="section-label">↩️ Возврат</div>
    <div class="detail-rows">
      <div class="detail-row"><div class="detail-key">Причина</div><div class="detail-val" style="color:var(--red);">${s.return_reason||'Возврат'}</div></div>
      <div class="detail-row"><div class="detail-key">Дата возврата</div><div class="detail-val">${s.return_date?new Date(s.return_date).toLocaleDateString('ru-RU'):'—'}</div></div>
    </div>
    <div style="font-size:12px;color:var(--gray);margin-top:12px;">Телефон возвращён на склад и снова доступен для продажи.</div>
    <button class="modal-btn secondary" style="width:100%;margin-top:14px;" onclick="closeModal()">Закрыть</button>`;
  document.getElementById('modal').classList.add('open');
}

function filterReturns(){
  const q=(document.getElementById('ret-search').value||'').toLowerCase();
  const all=mySales().filter(x=>x.passport_id && !x.returned);
  const f=all.filter(x=>(x.imei||'').includes(q)||(x.client_name||'').toLowerCase().includes(q)||(x.model||'').toLowerCase().includes(q));
  document.getElementById('returns-list').innerHTML=renderReturnsList(f);
}

function returnSale(idx){
  const s=DB.sales[idx];
  if(!s)return;
  document.getElementById('modal-body').innerHTML=`
    <div class="modal-title">↩️ Возврат по гарантии</div>
    <div class="modal-sub">${s.model} · ${fmt(s.sell_price)}</div>
    <div style="background:#1A0D0D;border:1px solid #3A1A1A;border-radius:12px;padding:14px;margin-bottom:14px;font-size:13px;color:var(--gray);line-height:1.6;">
      Клиент: <b style="color:var(--white);">${s.client_name||'не указан'}</b><br>
      IMEI: ${s.imei||'—'}<br>
      Оплата была: ${s.payment}
    </div>
    <div class="form-group"><label class="form-label">Причина возврата</label>
      <select class="form-select" id="ret-reason">
        <option>Неисправность по гарантии</option>
        <option>Брак экрана</option>
        <option>Проблема с батареей</option>
        <option>Не включается</option>
        <option>Передумал клиент</option>
        <option>Другое</option>
      </select>
    </div>
    <div style="background:var(--surface2);border-radius:10px;padding:12px;margin-bottom:14px;font-size:12px;color:var(--gray);">
      После возврата:<br>
      • Телефон вернётся на склад<br>
      • Выручка уменьшится на ${fmt(s.sell_price)}<br>
      • ${s.payment==='Наличные'?'Вернуть клиенту нал из кассы':'Вернуть на Kaspi / отменить рассрочку'}
    </div>
    <div class="modal-actions">
      <button class="modal-btn" style="background:var(--red);color:#fff;" onclick="confirmReturn(${idx})">↩️ Подтвердить возврат</button>
      <button class="modal-btn secondary" onclick="closeModal()">Отмена</button>
    </div>`;
  document.getElementById('modal').classList.add('open');
}

let _confirmingReturn=false;
async function confirmReturn(idx){
  if(_confirmingReturn)return;
  _confirmingReturn=true;
  const s=DB.sales[idx];
  if(!s){_confirmingReturn=false;return;}
  const reason=document.getElementById('ret-reason')?.value||'Возврат';
  // Возвращаем телефон на склад
  const existing=DB.products.find(p=>p.id===s.passport_id);
  let returnedProduct=null;
  if(existing){
    existing.sold=false;
    returnedProduct=existing;
  } else {
    returnedProduct={id:s.passport_id||'LP'+Date.now(),point:s.point,model:s.model.replace(/\s+(128GB|256GB|512GB|64GB|1TB)/g,'').trim(),storage:s.storage||'',color:s.color||'—',imei:s.imei||'',buy_price:s.buy_price,sell_price:s.sell_price,battery:s.battery||85,condition:s.condition||'Б/у',isNew:false,sold:false,created_at:new Date().toISOString()};
    DB.products.push(returnedProduct);
    s.passport_id=returnedProduct.id; // фиксируем id, чтобы не потерять связь при следующей загрузке
  }
  // Помечаем продажу возвращённой
  s.returned=true;s.return_reason=reason;s.return_date=new Date().toISOString();
  saveLocal();
  if(cloudMode&&sb){
    try{
      await withTimeout(sb.from('sales').update({returned:true,return_reason:reason,return_date:s.return_date,passport_id:s.passport_id}).eq('id',s.id));
      // Всегда upsert (не update) — гарантированно возвращает телефон на склад,
      // даже если в облаке этой записи раньше не было (например, из-за старых багов синхронизации)
      const r=await withTimeout(sb.from('products').upsert([returnedProduct]));
      if(r.error){ showToast('⚠️ Возврат: телефон не сохранился в облако — '+r.error.message,true); console.error('RETURN UPSERT ERROR:',r.error); }
    }catch(e){ showToast('⚠️ Возврат сохранён локально, ошибка облака',true); }
  }
  closeModal();
  showToast('↩️ Возврат оформлен · −'+fmt(s.sell_price));
  if(currentUser.role==='seller'&&typeof sellerReturns==='function'){sellerReturns();}
  if(navigator.vibrate)navigator.vibrate(100);
  _confirmingReturn=false;
}

// sendReport удалён — все отчёты видны в админке

