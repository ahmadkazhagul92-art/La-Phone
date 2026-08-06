// ==================== ADMIN ====================
function buildAdminTabs(){
  document.getElementById('tabs').innerHTML=`
    <div class="tab active" onclick="adminTab('overview',this)">📊 Обзор</div>
    <div class="tab" onclick="adminTab('analytics',this)">📈 Аналитика</div>
    <div class="tab" onclick="adminTab('points',this)">🏪 Точки</div>
    <div class="tab" onclick="adminTab('rating',this)">🏆 Рейтинг</div>
    <div class="tab" onclick="adminTab('compare',this)">⚖️ Сравнение</div>
    <div class="tab" onclick="adminTab('clients',this)">👥 Клиенты</div>
    <div class="tab" onclick="adminTab('finance',this)">💰 Финансы</div>
    <div class="tab" onclick="adminTab('stock',this)">📦 Склад</div>
    <div class="tab" onclick="adminTab('settings',this)">⚙️ Настройки</div>`;
  adminOverview();
}
function adminTab(name,el){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));el.classList.add('active');
  ({overview:adminOverview,analytics:adminAnalytics,points:adminPoints,rating:adminRating,compare:adminCompare,clients:adminClients,finance:adminFinance,stock:adminStock,settings:adminSettings})[name]();
}

async function adminOverview(){
  const _t=++tabToken; if(cloudMode&&sb){await loadFromCloud(); if(_t!==tabToken)return;}
  const s=DB.sales.filter(x=>!x.returned && isToday(x.created_at));
  const rev=s.reduce((a,b)=>a+b.sell_price,0);
  const profit=s.reduce((a,b)=>a+(b.sell_price-b.buy_price),0);
  const stock=DB.products.filter(p=>!p.sold);
  const cashTotal=s.reduce((a,b)=>a+splitSaleByMethod(b).cash,0);
  const cashCount=s.filter(x=>splitSaleByMethod(x).cash>0).length;
  const onlineTotal=s.reduce((a,b)=>a+splitSaleByMethod(b).kaspi,0);
  const onlineCount=s.filter(x=>splitSaleByMethod(x).kaspi>0).length;
  const instTotal=s.reduce((a,b)=>a+splitSaleByMethod(b).inst,0);
  const instCount=s.filter(x=>splitSaleByMethod(x).inst>0).length;
  // Чистая прибыль за месяц = валовая маржа − зарплаты (ФОТ) − налог с рассрочки, всё за текущий месяц
  // Возвраты уже исключены фильтром !x.returned — при возврате эта карточка пересчитается сама при следующем открытии
  const sMonthAll=DB.sales.filter(x=>!x.returned && isThisMonth(x.created_at));
  const marginMonthAll=sMonthAll.reduce((a,b)=>a+(b.sell_price-b.buy_price),0);
  const salaryMonthAll=Math.round(marginMonthAll*0.10);
  const calcTaxMonth=(sales)=>sales.reduce((a,b)=>a+(b.installment_tax!=null?b.installment_tax:Math.round((b.inst_total||Math.round(b.sell_price*1.21))*0.03)),0);
  const taxMonthAll=calcTaxMonth(sMonthAll.filter(x=>isInstallmentTaxable(x)));
  const netProfitMonth=marginMonthAll-salaryMonthAll-taxMonthAll;
  document.getElementById('main').innerHTML=`
    <div class="hero-stat"><div class="hs-label">Выручка всей сети · сегодня</div><div class="hs-value">${fmt(rev)}</div><div class="hs-change">↑ ${s.length} продаж по 3 точкам</div></div>
    <div class="stat-card" style="border-left:3px solid ${netProfitMonth>=0?'var(--accent)':'var(--red)'};margin-bottom:14px;"><div class="stat-card-label">💰 Моя чистая прибыль за месяц</div><div class="stat-card-val" style="color:${netProfitMonth>=0?'var(--accent)':'var(--red)'};font-size:26px;">${netProfitMonth>=0?'+':''}${fmt(netProfitMonth)}</div><div class="stat-card-sub">Маржа ${fmt(marginMonthAll)} − ЗП ${fmt(salaryMonthAll)} − налог ${fmt(taxMonthAll)}</div></div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-card-label">Чистая прибыль</div><div class="stat-card-val green">+${fmt(profit)}</div></div>
      <div class="stat-card"><div class="stat-card-label">Средний чек</div><div class="stat-card-val accent">${fmt(s.length?Math.round(rev/s.length):0)}</div></div>
      <div class="stat-card"><div class="stat-card-label">Телефонов</div><div class="stat-card-val white">${stock.length}</div></div>
      <div class="stat-card"><div class="stat-card-label">Стоимость склада</div><div class="stat-card-val blue">${fmt(stock.reduce((a,p)=>a+p.buy_price,0))}</div></div>
    </div>
    <div class="section-label">💵 Разбивка по оплатам</div>
    <div class="payment-breakdown">
      <div class="pay-card cash"><div class="pay-icon">💵</div><div class="pay-info"><div class="pay-label">Наличными в кассах</div><div class="pay-val">${fmt(cashTotal)}</div><div class="pay-sub">${cashCount} продаж · контроль</div></div></div>
      <div class="pay-card online"><div class="pay-icon">📱</div><div class="pay-info"><div class="pay-label">Онлайн Kaspi</div><div class="pay-val">${fmt(onlineTotal)}</div><div class="pay-sub">${onlineCount} продаж</div></div></div>
      <div class="pay-card installment"><div class="pay-icon">📅</div><div class="pay-info"><div class="pay-label">Рассрочка</div><div class="pay-val">${fmt(instTotal)}</div><div class="pay-sub">${instCount} продаж</div></div></div>
    </div>
    <div class="chart-card"><div class="chart-title">Выручка по точкам</div><div class="bar-chart" id="ov-chart"></div></div>
    <div class="section-label">💼 Зарплата точек · 10% от маржи · сегодня</div>
    <div class="payment-breakdown">
      ${(()=>{
        let totalToday=0;
        const rows=POINTS.map(p=>{
          const ps=s.filter(x=>x.point===p.id);
          const margin=ps.reduce((a,b)=>a+(b.sell_price-b.buy_price),0);
          const salary=Math.round(margin*0.10);
          totalToday+=salary;
          return `<div class="pay-card" style="border-left-color:var(--accent);"><div class="pay-icon">💼</div><div class="pay-info"><div class="pay-label">${p.name.split('·')[0].trim()} · ${p.seller}</div><div class="pay-val">${fmt(salary)}</div><div class="pay-sub">маржа сегодня ${fmt(margin)} · ${ps.length} продаж</div></div></div>`;
        }).join('');
        return rows + `<div class="pay-card" style="border-left-color:var(--gold);background:var(--surface2);"><div class="pay-icon">🏆</div><div class="pay-info"><div class="pay-label">Итого по 3 точкам · сегодня</div><div class="pay-val" style="color:var(--gold);">${fmt(totalToday)}</div></div></div>`;
      })()}
    </div>
    <div style="font-size:11px;color:var(--gray2);text-align:center;margin-bottom:14px;">Копится каждый день · итог за месяц смотри во вкладке "Финансы"</div>
    ${(()=>{
      const taxByOwner=(owner)=>{
        const pointIds=POINTS.filter(p=>(p.owner||'me')===owner).map(p=>p.id);
        const inst=s.filter(x=>isInstallmentTaxable(x) && pointIds.includes(x.point));
        const tax=inst.reduce((a,b)=>a+(b.installment_tax!=null?b.installment_tax:Math.round((b.inst_total||Math.round(b.sell_price*1.21))*0.03)),0);
        return {inst,tax};
      };
      const mine=taxByOwner('me'), partner=taxByOwner('partner');
      const hasPartner=POINTS.some(p=>(p.owner||'me')==='partner');
      return `<div class="section-label">🧾 Налог с рассрочки · 3% от суммы с накруткой · сегодня</div>
      <div class="stat-card" style="border-left:3px solid var(--orange);margin-bottom:${hasPartner?'10px':'14px'};"><div class="stat-card-label">👑 Мой налог сегодня</div><div class="stat-card-val" style="color:var(--orange);">${fmt(mine.tax)}</div><div class="stat-card-sub">${mine.inst.length} продаж в рассрочку · только мои точки</div></div>
      ${hasPartner?`<div class="stat-card" style="border-left:3px solid var(--blue);margin-bottom:14px;"><div class="stat-card-label">🤝 Налог партнёра сегодня</div><div class="stat-card-val" style="color:var(--blue);">${fmt(partner.tax)}</div><div class="stat-card-sub">${partner.inst.length} продаж в рассрочку · его точки</div></div>`:''}`;
    })()}
    ${(()=>{
      const returnsToday=DB.sales.filter(x=>x.returned && isToday(x.return_date||x.created_at));
      if(!returnsToday.length) return '';
      const totalReturned=returnsToday.reduce((a,b)=>a+b.sell_price,0);
      return `<div class="section-label">↩️ Возвраты сегодня (${returnsToday.length} шт · −${fmt(totalReturned)})</div>`+
        returnsToday.map(x=>{
          const prod=DB.products.find(p=>p.id===x.passport_id);
          const brandModel=prod?.brand?`${prod.brand} · ${x.model}`:x.model;
          return `<div class="prod-item" onclick="openReturnDetail(${DB.sales.indexOf(x)})"><div class="prod-thumb">↩️</div><div class="prod-info"><div class="prod-name">${brandModel}</div><div class="prod-meta" style="color:var(--red);">Возврат · IMEI ${(x.imei||'').slice(-6)}</div></div><div class="prod-right"><div class="prod-price" style="color:var(--red);">−${fmt(x.sell_price)}</div></div></div>`;
        }).join('');
    })()}`;
  const bp=POINTS.map(p=>({name:p.name.split('·')[0].trim(),cls:p.cls,rev:s.filter(x=>x.point===p.id).reduce((a,b)=>a+b.sell_price,0)}));
  const mx=Math.max(...bp.map(x=>x.rev),1);const co={p1:'var(--accent)',p2:'var(--blue)',p3:'var(--purple)'};
  document.getElementById('ov-chart').innerHTML=bp.map(p=>`<div class="bar-col"><div class="bar-val">${Math.round(p.rev/1000)}к</div><div class="bar" style="height:${(p.rev/mx)*100}%;background:${co[p.cls]};"></div><div class="bar-label">${p.name}</div></div>`).join('');
}

async function adminPoints(){const _t=++tabToken;if(cloudMode&&sb){await loadFromCloud();if(_t!==tabToken)return;}
  const s=DB.sales.filter(x=>!x.returned && isToday(x.created_at));
  document.getElementById('main').innerHTML='<div class="section-label">Все точки сети</div>'+POINTS.map(p=>{
    const ps=s.filter(x=>x.point===p.id);const rev=ps.reduce((a,b)=>a+b.sell_price,0);const profit=ps.reduce((a,b)=>a+(b.sell_price-b.buy_price),0);
    const stock=DB.products.filter(x=>x.point===p.id&&!x.sold).length;const pct=Math.min(Math.round(rev/p.target*100),100);
    const co={p1:'var(--accent)',p2:'var(--blue)',p3:'var(--purple)'};
    return `<div class="point-card ${p.cls}" onclick="adminOpenPoint('${p.id}')"><div class="point-header"><div><div class="point-name">${p.name}</div><div class="point-seller"><span class="point-seller-dot"></span>${p.seller}</div></div><div class="point-revenue"><div class="point-revenue-val">${fmt(rev)}</div><div class="point-revenue-label">сегодня</div></div></div><div class="point-metrics"><div class="pm"><div class="pm-val accent">${ps.length}</div><div class="pm-label">продаж</div></div><div class="pm"><div class="pm-val green">+${Math.round(profit/1000)}к</div><div class="pm-label">прибыль</div></div><div class="pm"><div class="pm-val">${stock}</div><div class="pm-label">склад</div></div></div><div class="point-progress"><div class="pp-track"><div class="pp-fill" style="width:${pct}%;background:${co[p.cls]};"></div></div><div class="pp-info"><span>План ${fmt(p.target)}</span><span>${pct}%</span></div></div></div>`;
  }).join('');
}

function adminOpenPoint(id){
  const p=POINTS.find(x=>x.id===id);const ps=DB.sales.filter(s=>s.point===id && !s.returned);
  const cash=ps.reduce((a,b)=>a+splitSaleByMethod(b).cash,0);
  const online=ps.reduce((a,b)=>a+splitSaleByMethod(b).kaspi,0);
  const inst=ps.reduce((a,b)=>a+splitSaleByMethod(b).inst,0);
  document.getElementById('modal-body').innerHTML=`<div class="modal-title">${p.name}</div><div class="modal-sub">Продавец: ${p.seller}</div>
    <div class="section-label" style="margin-top:0;">💵 Инкассация</div>
    <div class="payment-breakdown">
      <div class="pay-card cash"><div class="pay-icon">💵</div><div class="pay-info"><div class="pay-label">Нал в кассе</div><div class="pay-val">${fmt(cash)}</div></div></div>
      <div class="pay-card online"><div class="pay-icon">📱</div><div class="pay-info"><div class="pay-label">Онлайн</div><div class="pay-val">${fmt(online)}</div></div></div>
      <div class="pay-card installment"><div class="pay-icon">📅</div><div class="pay-info"><div class="pay-label">Рассрочка</div><div class="pay-val">${fmt(inst)}</div></div></div>
    </div>
    <div class="section-label">Продажи</div>
    ${ps.length?ps.map(s=>{const c=s.payment==='Наличные'?'var(--green)':s.payment==='Kaspi'?'var(--blue)':'var(--purple)';return `<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);"><div><div style="font-size:13px;font-weight:600;">${s.model}</div><div style="font-size:11px;color:${c};">● ${s.payment}</div></div><div style="font-family:'Space Grotesk',sans-serif;font-weight:700;color:var(--accent);">${fmt(s.sell_price)}</div></div>`;}).join(''):'<div class="empty"><div class="empty-text">Продаж нет</div></div>'}`;
  document.getElementById('modal').classList.add('open');
}

async function adminRating(){const _t=++tabToken;if(cloudMode&&sb){await loadFromCloud();if(_t!==tabToken)return;}
  const bs={};POINTS.forEach(p=>bs[p.seller]={name:p.seller,point:p.name.split('·')[0].trim(),rev:0,count:0});
  DB.sales.filter(x=>!x.returned && isToday(x.created_at)).forEach(s=>{if(bs[s.seller]){bs[s.seller].rev+=s.sell_price;bs[s.seller].count++;}});
  const r=Object.values(bs).sort((a,b)=>b.rev-a.rev);const m=['rank-1','rank-2','rank-3'];
  document.getElementById('main').innerHTML='<div class="section-label">Рейтинг продавцов · сегодня</div>'+r.map((x,i)=>`<div class="rank-item"><div class="rank-medal ${m[i]||'rank-other'}">${i+1}</div><div class="rank-info"><div class="rank-name">${x.name}</div><div class="rank-point">${x.point}</div></div><div><div class="rank-revenue">${fmt(x.rev)}</div><div class="rank-count">${x.count} продаж</div></div></div>`).join('');
}

async function adminCompare(){
  const _t=++tabToken; if(cloudMode&&sb){await loadFromCloud(); if(_t!==tabToken)return;}
  const s=DB.sales.filter(x=>!x.returned);const co={p1:'var(--accent)',p2:'var(--blue)',p3:'var(--purple)'};
  const d=POINTS.map(p=>({name:p.name.split('·')[0].trim(),cls:p.cls,rev:s.filter(x=>x.point===p.id).reduce((a,b)=>a+b.sell_price,0),cnt:s.filter(x=>x.point===p.id).length}));
  const mr=Math.max(...d.map(x=>x.rev),1);const mc=Math.max(...d.map(x=>x.cnt),1);
  document.getElementById('main').innerHTML=`<div class="section-label">Выручка точек</div><div class="chart-card">${d.map(x=>`<div class="compare-row"><div class="compare-name">${x.name}</div><div class="compare-bar-track"><div class="compare-bar-fill" style="width:${Math.max(x.rev/mr*100,18)}%;background:${co[x.cls]};">${Math.round(x.rev/1000)}к</div></div></div>`).join('')}</div><div class="section-label">Кол-во продаж</div><div class="chart-card">${d.map(x=>`<div class="compare-row"><div class="compare-name">${x.name}</div><div class="compare-bar-track"><div class="compare-bar-fill" style="width:${Math.max(x.cnt/mc*100,18)}%;background:${co[x.cls]};">${x.cnt}</div></div></div>`).join('')}</div>`;
}

function adminStock(){const _t=++tabToken;renderFullStock('admin');if(cloudMode&&sb){loadFromCloud().then(()=>{if(_t===tabToken)renderFullStock('admin');});}}

// ==================== АНАЛИТИКА ====================
async function adminAnalytics(){const _t=++tabToken;if(cloudMode&&sb){await loadFromCloud();if(_t!==tabToken)return;}
  const s=DB.sales.filter(x=>!x.returned);
  // Топ моделей по продажам
  const byModel={};
  s.forEach(x=>{const key=x.model.replace(/\s+(128GB|256GB|512GB|64GB|1TB)/g,'').trim();if(!byModel[key])byModel[key]={count:0,revenue:0,profit:0};byModel[key].count++;byModel[key].revenue+=x.sell_price;byModel[key].profit+=(x.sell_price-x.buy_price);});
  const topModels=Object.entries(byModel).sort((a,b)=>b[1].count-a[1].count).slice(0,5);
  const profitModels=Object.entries(byModel).sort((a,b)=>b[1].profit-a[1].profit).slice(0,5);
  // По брендам — определяем из названия модели
  const byModelStock={};
  DB.products.filter(p=>p.sold!==true).forEach(p=>{
    const key=p.model.trim()+(p.storage?' '+p.storage.trim():'');
    if(!byModelStock[key])byModelStock[key]={count:0, batterySum:0};
    byModelStock[key].count++;
    byModelStock[key].batterySum += (p.battery||0);
  });
  const co={p1:'var(--accent)',p2:'var(--blue)',p3:'var(--purple)'};
  document.getElementById('main').innerHTML=`
    <div class="section-label" style="margin-top:2px;">🔥 Самые продаваемые модели</div>
    ${topModels.length?topModels.map((m,i)=>`
      <div class="rank-item"><div class="rank-medal ${['rank-1','rank-2','rank-3'][i]||'rank-other'}">${i+1}</div>
      <div class="rank-info"><div class="rank-name">${m[0]}</div><div class="rank-point">${m[1].count} продаж</div></div>
      <div><div class="rank-revenue">${fmt(m[1].revenue)}</div><div class="rank-count">оборот</div></div></div>`).join(''):'<div class="empty"><div class="empty-text">Пока нет данных</div></div>'}

    <div class="section-label">💎 Самые прибыльные модели</div>
    ${profitModels.length?profitModels.map((m,i)=>`
      <div class="rank-item"><div class="rank-medal ${['rank-1','rank-2','rank-3'][i]||'rank-other'}">${i+1}</div>
      <div class="rank-info"><div class="rank-name">${m[0]}</div><div class="rank-point">маржа ${m[1].count} шт</div></div>
      <div><div class="rank-revenue" style="color:var(--green);">+${fmt(m[1].profit)}</div><div class="rank-count">прибыль</div></div></div>`).join(''):'<div class="empty"><div class="empty-text">Пока нет данных</div></div>'}

    <div class="section-label">📦 Склад по моделям</div>
    <div class="chart-card">
      ${Object.keys(byModelStock).length?Object.entries(byModelStock).sort((a,b)=>b[1].count-a[1].count).map(([m,d])=>{
        const max=Math.max(...Object.values(byModelStock).map(x=>x.count),1);
        const avgBattery=d.count?Math.round(d.batterySum/d.count):0;
        return `<div class="compare-row"><div class="compare-name">${m}</div><div class="compare-bar-track"><div class="compare-bar-fill" style="width:${Math.max(d.count/max*100,18)}%;background:var(--accent);">${d.count} шт · 🔋${avgBattery}%</div></div></div>`;
      }).join(''):'<div class="empty"><div class="empty-text">Склад пуст — всё распродано 🎉</div></div>'}
    </div>

    <div class="section-label">📅 Продажи по дням недели</div>
    <div class="chart-card"><div class="bar-chart" id="days-chart"></div></div>
  `;
  // График дней (демо данные распределим)
  const days=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  // Реальные продажи по дням недели из дат
  const dayData=[0,0,0,0,0,0,0];
  s.forEach(sale=>{
    const d=new Date(sale.created_at);
    const wd=(d.getDay()+6)%7; // Пн=0 ... Вс=6
    dayData[wd]++;
  });
  const max=Math.max(...dayData,1);
  document.getElementById('days-chart').innerHTML=dayData.map((v,i)=>`<div class="bar-col"><div class="bar-val">${v}</div><div class="bar" style="height:${v/max*100}%;background:var(--accent);"></div><div class="bar-label">${days[i]}</div></div>`).join('');
}

// ==================== CRM КЛИЕНТЫ ====================
function getClients(){
  // Собираем клиентов из продаж
  const clients={};
  DB.sales.filter(x=>!x.returned).forEach(s=>{
    if(!s.client_name||s.client_name==='—')return;
    const key=s.client_phone||s.client_name;
    if(!clients[key])clients[key]={name:s.client_name,phone:s.client_phone||'',purchases:0,total:0,items:[],lastDate:s.created_at};
    clients[key].purchases++;
    clients[key].total+=s.sell_price;
    clients[key].items.push({model:s.model,price:s.sell_price,imei:s.imei,date:s.created_at,warranty:s.warranty_days});
    if(s.created_at>clients[key].lastDate)clients[key].lastDate=s.created_at;
  });
  return Object.values(clients).sort((a,b)=>b.total-a.total);
}

async function adminClients(){const _t=++tabToken;if(cloudMode&&sb){await loadFromCloud();if(_t!==tabToken)return;}
  const clients=getClients();
  document.getElementById('main').innerHTML=`
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-card-label">Всего клиентов</div><div class="stat-card-val accent">${clients.length}</div></div>
      <div class="stat-card"><div class="stat-card-label">Повторных</div><div class="stat-card-val green">${clients.filter(c=>c.purchases>1).length}</div></div>
    </div>
    <div class="search-bar"><span>🔍</span><input id="client-search" placeholder="Поиск по имени или телефону" oninput="filterClients()"></div>
    <div class="section-label">База клиентов</div>
    <div id="clients-list">${renderClients(clients)}</div>
  `;
}

function renderClients(clients){
  if(clients.length===0)return '<div class="empty"><div class="empty-icon">👥</div><div class="empty-text">Клиенты появятся после продаж<br>с заполненными данными покупателя</div></div>';
  return clients.map((c,i)=>{
    const isVip=c.total>200000||c.purchases>=3;
    const key=encodeURIComponent(c.phone||c.name);
    return `<div class="prod-item" onclick="openClient('${key}')">
      <div class="prod-thumb">${isVip?'⭐':'👤'}</div>
      <div class="prod-info"><div class="prod-name">${c.name}${isVip?' · VIP':''}</div><div class="prod-meta">${c.phone||'без телефона'}</div><div class="prod-point">${c.purchases} покупок</div></div>
      <div class="prod-right"><div class="prod-price">${fmt(c.total)}</div><div class="prod-stock in">всего</div></div>
    </div>`;
  }).join('');
}

function filterClients(){
  const q=(document.getElementById('client-search').value||'').toLowerCase();
  const all=getClients();
  const filtered=all.filter(c=>c.name.toLowerCase().includes(q)||(c.phone||'').includes(q));
  document.getElementById('clients-list').innerHTML=renderClients(filtered);
}

function openClient(key){
  const target=decodeURIComponent(key);
  const c=getClients().find(x=>(x.phone||x.name)===target);
  if(!c)return;
  const isVip=c.total>200000||c.purchases>=3;
  const fmtD=d=>new Date(d).toLocaleDateString('ru-RU');
  document.getElementById('modal-body').innerHTML=`
    <div class="modal-title">${isVip?'⭐ ':''}${c.name}</div>
    <div class="modal-sub">${c.phone||'телефон не указан'}</div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-card-label">Покупок</div><div class="stat-card-val accent">${c.purchases}</div></div>
      <div class="stat-card"><div class="stat-card-label">Сумма</div><div class="stat-card-val green">${fmt(c.total)}</div></div>
    </div>
    <div class="detail-rows">
      <div class="detail-row"><div class="detail-key">Средний чек</div><div class="detail-val">${fmt(Math.round(c.total/c.purchases))}</div></div>
      <div class="detail-row"><div class="detail-key">Статус</div><div class="detail-val ${isVip?'accent':''}">${isVip?'⭐ VIP клиент':'Обычный'}</div></div>
      <div class="detail-row"><div class="detail-key">Последняя покупка</div><div class="detail-val">${fmtD(c.lastDate)}</div></div>
    </div>
    <div class="section-label">История покупок</div>
    ${c.items.map(it=>`<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);"><div><div style="font-size:13px;font-weight:600;">${it.model}</div><div style="font-size:11px;color:var(--gray);">IMEI ${(it.imei||'').slice(-6)} · ${fmtD(it.date)}</div></div><div style="font-family:'Space Grotesk',sans-serif;font-weight:700;color:var(--accent);">${fmt(it.price)}</div></div>`).join('')}
    ${c.phone?`<button class="modal-btn primary" style="width:100%;margin-top:14px;" onclick="window.open('https://wa.me/${c.phone.replace(/\\D/g,'')}','_blank')">📱 Написать в WhatsApp</button>`:''}
  `;
  document.getElementById('modal').classList.add('open');
}

// ==================== ФИНАНСЫ ====================
async function adminFinance(){const _t=++tabToken;if(cloudMode&&sb){await loadFromCloud();if(_t!==tabToken)return;}
  const s=DB.sales.filter(x=>!x.returned && isToday(x.created_at));
  const revenue=s.reduce((a,b)=>a+b.sell_price,0);
  const grossProfit=s.reduce((a,b)=>a+(b.sell_price-b.buy_price),0);

  // Считаем зарплаты точек один раз — используем и в расходах, и в блоке зарплат ниже
  let salaryTotalToday=0, salaryTotalMonth=0;
  const pointSalaries=POINTS.map(p=>{
    const psMonth=DB.sales.filter(x=>x.point===p.id && !x.returned && isThisMonth(x.created_at));
    const marginMonth=psMonth.reduce((a,b)=>a+(b.sell_price-b.buy_price),0);
    const salaryMonth=Math.round(marginMonth*0.10);
    const psToday=DB.sales.filter(x=>x.point===p.id && !x.returned && isToday(x.created_at));
    const marginToday=psToday.reduce((a,b)=>a+(b.sell_price-b.buy_price),0);
    const salaryToday=Math.round(marginToday*0.10);
    salaryTotalToday+=salaryToday; salaryTotalMonth+=salaryMonth;
    return {p,psMonth,salaryMonth,psToday,salaryToday};
  });

  const totalExp=salaryTotalMonth; // ФОТ автоматически = сумма зарплат точек за текущий месяц
  const dailyExp=salaryTotalToday; // расход "сегодня" — реальная зарплата, начисленная сегодня
  const netToday=grossProfit-dailyExp;
  document.getElementById('main').innerHTML=`
    <div class="hero-stat"><div class="hs-label">Чистая прибыль сегодня</div><div class="hs-value" style="color:${netToday>=0?'var(--accent)':'var(--red)'}">${netToday>=0?'+':''}${fmt(netToday)}</div><div class="hs-change">Валовая ${fmt(grossProfit)} − зарплаты сегодня ${fmt(dailyExp)}</div></div>

    <div class="section-label">💰 Доходы сегодня</div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-card-label">Выручка</div><div class="stat-card-val white">${fmt(revenue)}</div></div>
      <div class="stat-card"><div class="stat-card-label">Валовая прибыль</div><div class="stat-card-val green">${fmt(grossProfit)}</div></div>
    </div>

    <div class="section-label">📉 Расходы · ФОТ (авто)</div>
    <div class="intake-section">
      <div class="detail-rows">
        <div class="detail-row"><div class="detail-key">Зарплаты сегодня</div><div class="detail-val" style="color:var(--red);">−${fmt(dailyExp)}</div></div>
        <div class="detail-row"><div class="detail-key">Зарплаты с начала месяца</div><div class="detail-val" style="color:var(--red);">−${fmt(totalExp)}</div></div>
      </div>
      <div style="font-size:11px;color:var(--gray2);text-align:center;margin-top:10px;line-height:1.5;">Считается автоматически из реальных продаж по точкам (10% от маржи) — ручной ввод не нужен.</div>
    </div>

    <div class="section-label">👥 Зарплаты точек · 10% от маржи</div>
    ${pointSalaries.map(({p,psMonth,salaryMonth,psToday,salaryToday})=>{
      return `<div class="pay-card" style="border-left-color:var(--accent);"><div class="pay-icon">💼</div><div class="pay-info"><div class="pay-label">${p.name.split('·')[0].trim()} · ${p.seller}</div>
        <div style="display:flex;gap:16px;margin-top:2px;">
          <div><div style="font-size:10px;color:var(--gray);">СЕГОДНЯ</div><div class="pay-val" style="font-size:17px;">${fmt(salaryToday)}</div></div>
          <div><div style="font-size:10px;color:var(--gray);">ЗА МЕСЯЦ</div><div class="pay-val" style="font-size:17px;">${fmt(salaryMonth)}</div></div>
        </div>
        <div class="pay-sub">${psToday.length} продаж сегодня · ${psMonth.length} за месяц</div></div></div>`;
    }).join('')}
    <div class="pay-card" style="border-left-color:var(--gold);background:var(--surface2);"><div class="pay-icon">🏆</div><div class="pay-info"><div class="pay-label">Итого по 3 точкам</div>
      <div style="display:flex;gap:16px;margin-top:2px;">
        <div><div style="font-size:10px;color:var(--gray);">СЕГОДНЯ</div><div class="pay-val" style="font-size:19px;color:var(--gold);">${fmt(salaryTotalToday)}</div></div>
        <div><div style="font-size:10px;color:var(--gray);">ЗА МЕСЯЦ</div><div class="pay-val" style="font-size:19px;color:var(--gold);">${fmt(salaryTotalMonth)}</div></div>
      </div></div></div>
    <div style="font-size:11px;color:var(--gray2);text-align:center;margin-bottom:14px;line-height:1.5;">Месяц копится с 1 числа автоматически, сегодня — только текущие сутки.</div>

    <div class="section-label">🧾 Налог с рассрочки · 3% от суммы с накруткой банка</div>
    ${(()=>{
      const {start,end,label}=currentHalfYearRange();
      const hasPartner=POINTS.some(p=>(p.owner||'me')==='partner');
      const calcTax=(sales)=>sales.reduce((a,b)=>a+(b.installment_tax!=null?b.installment_tax:Math.round((b.inst_total||Math.round(b.sell_price*1.21))*0.03)),0);
      const breakdown=(owner)=>{
        const pointIds=POINTS.filter(p=>(p.owner||'me')===owner).map(p=>p.id);
        const base=DB.sales.filter(x=>isInstallmentTaxable(x) && !x.returned && pointIds.includes(x.point));
        const instToday=base.filter(x=>isToday(x.created_at));
        const instMonth=base.filter(x=>isThisMonth(x.created_at));
        const instHalf=base.filter(x=>inRange(x.created_at,start,end));
        return {
          today:{list:instToday,tax:calcTax(instToday)},
          month:{list:instMonth,tax:calcTax(instMonth)},
          half:{list:instHalf,tax:calcTax(instHalf),
            totalGoods:instHalf.reduce((a,b)=>a+getInstallmentBase(b),0),
            totalWithMarkup:instHalf.reduce((a,b)=>a+getInstallmentWithMarkup(b),0)}
        };
      };
      const renderBlock=(title,d)=>`
        <div class="stats-grid">
          <div class="stat-card"><div class="stat-card-label">${title} · сегодня</div><div class="stat-card-val" style="color:var(--orange);">${fmt(d.today.tax)}</div><div class="stat-card-sub">${d.today.list.length} продаж</div></div>
          <div class="stat-card"><div class="stat-card-label">${title} · за месяц</div><div class="stat-card-val" style="color:var(--orange);">${fmt(d.month.tax)}</div><div class="stat-card-sub">${d.month.list.length} продаж</div></div>
        </div>
        <div class="stat-card" style="border-left:3px solid var(--orange);margin-bottom:14px;"><div class="stat-card-label">${title} · ${label}</div><div class="stat-card-val" style="color:var(--orange);">${fmt(d.half.tax)}</div><div class="stat-card-sub">${d.half.list.length} продаж за полугодие</div></div>
        <div class="intake-section">
          <div class="detail-rows">
            <div class="detail-row"><div class="detail-key">Сумма товаров за полугодие (цена за нал)</div><div class="detail-val">${fmt(d.half.totalGoods)}</div></div>
            <div class="detail-row"><div class="detail-key">Сумма с накруткой банка (база налога)</div><div class="detail-val accent">${fmt(d.half.totalWithMarkup)}</div></div>
            <div class="detail-row"><div class="detail-key">Налог к уплате за полугодие (3%)</div><div class="detail-val" style="color:var(--orange);">${fmt(d.half.tax)}</div></div>
          </div>
        </div>`;
      let out=`<div style="font-size:12px;color:var(--accent);font-weight:700;margin-bottom:8px;">👑 МОЙ НАЛОГ (мои точки)</div>` + renderBlock('Мой налог',breakdown('me'));
      if(hasPartner){
        out+=`<div style="font-size:12px;color:var(--blue);font-weight:700;margin:16px 0 8px;">🤝 НАЛОГ ПАРТНЁРА</div>` + renderBlock('Налог партнёра',breakdown('partner'));
      }
      out+=`<div style="font-size:11px;color:var(--gray2);text-align:center;margin-bottom:14px;line-height:1.5;">Считается только с оплат "Рассрочка", от суммы с накруткой банка (нал и Kaspi-перевод не облагаются). Разделено по точкам — кто чья точка меняется во вкладке "Настройки". Полугодие сбрасывается после уплаты раз в 6 месяцев.</div>`;
      return out;
    })()}
  `;
}

// ==================== НАСТРОЙКИ ====================
function adminSettings(){
  ++tabToken; // отменяем висящие перерисовки других вкладок
  const sellerKeys=['daniyar','aigerim','erlan'];
  document.getElementById('main').innerHTML=`
    <div class="section-label" style="margin-top:2px;">⚙️ Управление аккаунтами</div>

    <div class="intake-section">
      <div style="font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:700;margin-bottom:14px;">👑 Владелец</div>
      <div class="form-group"><label class="form-label">Имя</label><input class="form-input" id="set-owner-name" value="${USERS.owner.name}"></div>
      <div style="font-size:11px;color:var(--gray2);line-height:1.5;">Пароль меняется иконкой 🔒 в шапке приложения — из своего же аккаунта.</div>
    </div>

    ${sellerKeys.map((k,i)=>{
      const u=USERS[k];const pt=POINTS.find(p=>p.id===u.point);
      const owner=pt.owner||'me';
      return `<div class="intake-section">
        <div style="font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:700;margin-bottom:4px;">🛒 Продавец ${i+1}</div>
        <div style="font-size:11px;color:var(--gray);margin-bottom:14px;">${pt.name}</div>
        <div class="form-group"><label class="form-label">Имя продавца</label><input class="form-input" id="set-${k}-name" value="${u.name}"></div>
        <div class="form-group"><label class="form-label">Название точки</label><input class="form-input" id="set-${k}-point" value="${pt.name}"></div>
        <div class="form-group"><label class="form-label">Чья это точка (для налога)</label>
          <div class="cond-pills">
            <div class="cond-pill ${owner==='me'?'active':''}" onclick="setPointOwner('${pt.id}','me',this)">👑 Моя (мой ИП)</div>
            <div class="cond-pill ${owner==='partner'?'active':''}" onclick="setPointOwner('${pt.id}','partner',this)">🤝 Партнёра</div>
          </div>
        </div>
        <div style="font-size:11px;color:var(--gray2);line-height:1.5;">Пароль продавец меняет сам, зайдя под своим аккаунтом (⚙️ появится только у себя) — владелец пароли других менять из приложения не может, это защита от кражи ключа с GitHub. Забыл пароль — сбрасывается в панели Supabase → Authentication.</div>
      </div>`;
    }).join('')}

    <button class="modal-btn primary" style="width:100%;margin-top:8px;" onclick="saveAllSettings()">✅ Сохранить настройки</button>
    <button class="modal-btn secondary" style="width:100%;margin-top:8px;" onclick="resetSettings()">↺ Сбросить к стандартным</button>

    <div class="section-label">💾 Резервная копия</div>
    <div class="intake-section">
      <div style="font-size:13px;color:var(--gray);margin-bottom:14px;line-height:1.5;">Скачает весь склад и все продажи в файл на этот телефон. Делай раз в неделю — если что-то случится с облаком, данные останутся у тебя.</div>
      <button class="modal-btn primary" style="width:100%;" onclick="exportBackup()">💾 Скачать бэкап (склад + продажи)</button>
      <button class="modal-btn secondary" style="width:100%;margin-top:8px;" onclick="document.getElementById('backup-file-input').click()">📂 Восстановить из бэкапа</button>
      <input type="file" id="backup-file-input" accept=".json" style="display:none;" onchange="importBackup(this)">
    </div>

    <div class="section-label">⚠️ Опасная зона</div>
    <div class="intake-section" style="border-color:var(--red);">
      <div style="font-size:13px;color:var(--gray);margin-bottom:14px;line-height:1.5;">Удалит ВСЕ телефоны и продажи (включая демо-данные) из облака и локально. Настройки имён и паролей не затронет. Действие необратимо.</div>
      <button class="modal-btn" style="width:100%;background:var(--red-dim);color:var(--red);border:1px solid var(--red);" onclick="clearDemoData()">🗑 Очистить все товары и продажи</button>
    </div>

    <div style="font-size:11px;color:var(--gray2);text-align:center;margin-top:14px;line-height:1.5;">После сохранения продавцы будут входить с новыми паролями.<br>Имена обновятся во всех отчётах и рейтингах.</div>
  `;
}

function clearDemoData(){
  document.getElementById('modal-body').innerHTML=`
    <div class="modal-title">🗑 Очистить всё?</div>
    <div class="modal-sub">Удалятся ВСЕ телефоны и продажи</div>
    <div style="background:#1A0D0D;border:1px solid #3A1A1A;border-radius:12px;padding:14px;margin-bottom:14px;font-size:13px;color:var(--gray);line-height:1.6;">
      Это удалит:<br>
      • Все телефоны со склада (включая демо)<br>
      • Всю историю продаж<br>
      • Всех клиентов в CRM (строится из продаж)<br><br>
      <b style="color:var(--red);">Отменить будет нельзя.</b><br>
      Имена, пароли и точки останутся как есть.
    </div>
    <div class="modal-actions">
      <button class="modal-btn" style="background:var(--red);color:#fff;" onclick="confirmClearDemo()">🗑 Да, удалить всё</button>
      <button class="modal-btn secondary" onclick="closeModal()">Отмена</button>
    </div>`;
  document.getElementById('modal').classList.add('open');
}

async function confirmClearDemo(){
  DB.products=[];
  DB.sales=[];
  saveLocal();
  if(cloudMode&&sb){
    try{
      await withTimeout(sb.from('sales').delete().neq('id',''));
      await withTimeout(sb.from('products').delete().neq('id',''));
    }catch(e){}
  }
  closeModal();
  showToast('🗑 Склад и продажи очищены');
  adminSettings();
}

async function exportBackup(){
  // Перед бэкапом подтягиваем свежие данные из облака, чтобы бэкап был полным
  if(cloudMode&&sb){ showToast('🔄 Загружаю свежие данные...'); await loadFromCloud(); }
  const backup={
    app:'LaPhone',
    version:1,
    exported_at:new Date().toISOString(),
    products:DB.products,
    sales:DB.sales,
    points:POINTS
  };
  const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  const d=new Date();
  a.href=url;
  a.download='LaPhone_backup_'+d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+'.json';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('💾 Бэкап скачан: '+backup.products.length+' тел. · '+backup.sales.length+' продаж');
}

function importBackup(input){
  const file=input.files[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=(e)=>{
    try{
      const backup=JSON.parse(e.target.result);
      if(backup.app!=='LaPhone'||!Array.isArray(backup.products)||!Array.isArray(backup.sales)){
        showToast('❌ Это не файл бэкапа La Phone',true);return;
      }
      window._pendingBackup=backup;
      document.getElementById('modal-body').innerHTML=`
        <div class="modal-title">📂 Восстановить из бэкапа?</div>
        <div class="modal-sub">от ${new Date(backup.exported_at).toLocaleString('ru-RU')}</div>
        <div style="background:#1A1408;border:1px solid #3A2E15;border-radius:12px;padding:14px;margin-bottom:14px;font-size:13px;color:var(--gray);line-height:1.6;">
          В бэкапе:<br>
          • Телефонов: <b style="color:var(--white);">${backup.products.length}</b><br>
          • Продаж: <b style="color:var(--white);">${backup.sales.length}</b><br><br>
          <b style="color:var(--gold);">Текущие данные будут ПОЛНОСТЬЮ заменены</b> данными из бэкапа — и локально, и в облаке.
        </div>
        <div class="modal-actions">
          <button class="modal-btn" style="background:var(--gold);color:#000;" onclick="confirmImportBackup()">📂 Да, восстановить</button>
          <button class="modal-btn secondary" onclick="closeModal();window._pendingBackup=null;">Отмена</button>
        </div>`;
      document.getElementById('modal').classList.add('open');
    }catch(err){ showToast('❌ Файл повреждён или не читается',true); }
    input.value='';
  };
  reader.readAsText(file);
}

async function confirmImportBackup(){
  const backup=window._pendingBackup;
  if(!backup)return;
  DB.products=backup.products;
  DB.sales=backup.sales;
  if(backup.points)POINTS=backup.points;
  saveLocal();
  saveSettings();
  if(cloudMode&&sb){
    showToast('🔄 Загружаю в облако...');
    try{
      await withTimeout(sb.from('sales').delete().neq('id',''),15000);
      await withTimeout(sb.from('products').delete().neq('id',''),15000);
      // Загружаем порциями по 100 записей, чтобы не упереться в лимиты
      for(let i=0;i<DB.products.length;i+=100){ await withTimeout(sb.from('products').insert(DB.products.slice(i,i+100)),15000); }
      for(let i=0;i<DB.sales.length;i+=100){ await withTimeout(sb.from('sales').insert(DB.sales.slice(i,i+100)),15000); }
      showToast('✅ Восстановлено и загружено в облако');
    }catch(e){ showToast('⚠️ Восстановлено локально, облако не ответило',true); }
  }else{
    showToast('✅ Восстановлено локально');
  }
  window._pendingBackup=null;
  closeModal();
  adminSettings();
}

function setPointOwner(pointId,owner,el){
  const pt=POINTS.find(p=>p.id===pointId);
  if(!pt)return;
  pt.owner=owner;
  el.parentElement.querySelectorAll('.cond-pill').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
  saveSettings();
  showToast(owner==='me'?'👑 Точка отмечена как своя':'🤝 Точка отмечена как партнёрская');
}

function saveAllSettings(){
  USERS.owner.name=document.getElementById('set-owner-name').value.trim()||'Артём';
  ['daniyar','aigerim','erlan'].forEach(k=>{
    const u=USERS[k];
    const newName=document.getElementById('set-'+k+'-name').value.trim();
    const newPoint=document.getElementById('set-'+k+'-point').value.trim();
    if(newName){
      const oldName=u.name;
      u.name=newName;
      // Обновим имя в точке и в продажах
      const pt=POINTS.find(p=>p.id===u.point);
      if(pt){pt.seller=newName;if(newPoint)pt.name=newPoint;}
      DB.sales.forEach(s=>{if(s.seller===oldName)s.seller=newName;});
    }
  });
  saveSettings();
  saveLocal();
  showToast('✅ Настройки сохранены');
  if(navigator.vibrate)navigator.vibrate(50);
}

function resetSettings(){
  if(!confirm('Сбросить имена и пароли к стандартным?'))return;
  USERS=JSON.parse(JSON.stringify(DEFAULT_USERS));
  POINTS=JSON.parse(JSON.stringify(DEFAULT_POINTS));
  saveSettings();
  showToast('↺ Сброшено к стандартным');
  adminSettings();
}

// Удаление телефона админом
function deleteProductAdmin(id){
  const p=DB.products.find(x=>x.id===id);if(!p)return;
  document.getElementById('modal-body').innerHTML=`
    <div class="modal-title">🗑 Удалить телефон?</div>
    <div class="modal-sub">${p.model} ${p.storage} · ${fmt(p.sell_price)}</div>
    <div style="background:#1A0D0D;border:1px solid #3A1A1A;border-radius:12px;padding:14px;margin-bottom:14px;font-size:13px;color:var(--gray);line-height:1.6;">
      IMEI: ${p.imei}<br>
      Точка: ${POINTS.find(pt=>pt.id===p.point)?.name||p.point}<br><br>
      Телефон будет удалён со склада навсегда. Стоимость склада пересчитается.
    </div>
    <div class="modal-actions">
      <button class="modal-btn" style="background:var(--red);color:#fff;" onclick="confirmDelete('${id}')">🗑 Да, удалить</button>
      <button class="modal-btn secondary" onclick="openProduct('${id}')">Отмена</button>
    </div>`;
}

async function confirmDelete(id){
  DB.products=DB.products.filter(p=>p.id!==id);
  saveLocal();
  if(cloudMode&&sb){try{await withTimeout(sb.from('products').delete().eq('id',id));}catch(e){}}
  closeModal();
  showToast('🗑 Телефон удалён со склада');
  // Перерисовываем склад в зависимости от роли
  if(currentUser.role==='admin'){adminStock();}
  else{sellerStock();}
}

// Админ меняет цены независимо
function editPriceAdmin(id){
  const p=DB.products.find(x=>x.id===id);if(!p)return;
  document.getElementById('modal-body').innerHTML=`
    <div class="modal-title">✏️ Изменить цены</div>
    <div class="modal-sub">${p.model} ${p.storage}</div>
    <div class="form-group"><label class="form-label">💸 Себестоимость (закуп)</label><input class="form-input" id="ep-buy" type="number" value="${p.buy_price}" inputmode="numeric" oninput="updMargin()"></div>
    <div class="form-group"><label class="form-label">💰 Цена продажи</label><input class="form-input" id="ep-sell" type="number" value="${p.sell_price}" inputmode="numeric" oninput="updMargin()"></div>
    <div id="ep-margin" style="background:#0D1A0D;border:1px solid #1A3A1A;border-radius:12px;padding:14px;margin-bottom:14px;text-align:center;">
      <div style="font-size:11px;color:var(--gray);margin-bottom:4px;">Маржа</div>
      <div style="font-family:'Space Grotesk',sans-serif;font-size:24px;font-weight:800;color:var(--green);">+${fmt(p.sell_price-p.buy_price)}</div>
      <div style="font-size:11px;color:var(--accent);margin-top:2px;">${p.buy_price?Math.round((p.sell_price-p.buy_price)/p.buy_price*100):0}%</div>
    </div>
    <div class="modal-actions">
      <button class="modal-btn primary" onclick="savePriceAdmin('${id}')">✅ Сохранить</button>
      <button class="modal-btn secondary" onclick="openProduct('${id}')">Назад</button>
    </div>`;
}
function updMargin(){
  const b=parseInt(document.getElementById('ep-buy').value)||0;
  const s=parseInt(document.getElementById('ep-sell').value)||0;
  document.getElementById('ep-margin').innerHTML=`<div style="font-size:11px;color:var(--gray);margin-bottom:4px;">Маржа</div><div style="font-family:'Space Grotesk',sans-serif;font-size:24px;font-weight:800;color:${s-b>=0?'var(--green)':'var(--red)'};">${s-b>=0?'+':''}${fmt(s-b)}</div><div style="font-size:11px;color:var(--accent);margin-top:2px;">${b?Math.round((s-b)/b*100):0}%</div>`;
}
async function savePriceAdmin(id){
  const p=DB.products.find(x=>x.id===id);if(!p)return;
  p.buy_price=parseInt(document.getElementById('ep-buy').value)||p.buy_price;
  p.sell_price=parseInt(document.getElementById('ep-sell').value)||p.sell_price;
  saveLocal();
  if(cloudMode&&sb){try{await withTimeout(sb.from('products').update({buy_price:p.buy_price,sell_price:p.sell_price}).eq('id',id));}catch(e){}}
  showToast('💰 Цены обновлены');
  openProduct(id);
}

