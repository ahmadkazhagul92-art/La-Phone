function sellPhone(id){
  const p=DB.products.find(x=>x.id===id);
  if(!p){closeModal();showToast('Телефон уже продан или удалён',true);return;}
  document.getElementById('modal-body').innerHTML=`
    <div class="modal-title">💰 Способ оплаты</div><div class="modal-sub">${p.model} · ${fmt(p.sell_price)}</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      <button class="modal-btn" style="background:var(--green-dim);color:var(--green);border:1px solid var(--green);" onclick="clientForm('${id}','Наличные')">💵 Наличными — в кассу</button>
      <button class="modal-btn" style="background:var(--blue-dim);color:var(--blue);border:1px solid var(--blue);" onclick="clientForm('${id}','Kaspi')">📱 Kaspi перевод</button>
      <button class="modal-btn" style="background:var(--purple-dim);color:var(--purple);border:1px solid var(--purple);" onclick="installmentForm('${id}')">📅 Рассрочка Kaspi (+21%)</button>
      <button class="modal-btn" style="background:#F9731620;color:var(--orange);border:1px solid var(--orange);" onclick="tradeInForm('${id}')">🔄 Трейд-ин</button>
      <button class="modal-btn" style="background:#3B82F620;color:#60A5FA;border:1px solid #60A5FA;" onclick="mixedPaymentForm('${id}')">🔀 Часть сразу + часть в рассрочку</button>
      <button class="modal-btn secondary" onclick="openProduct('${id}')">Назад</button>
    </div>`;
}

// РАССРОЧКА с +21% и расчётом
function installmentForm(id){
  window._instPercent=21;window._instId=id;
  renderInstallmentForm(id);
}
function renderInstallmentForm(id){
  const p=DB.products.find(x=>x.id===id);
  const pct=window._instPercent||21;
  const withCommission=Math.round(p.sell_price*(1+pct/100));
  const m12=Math.round(withCommission/12);
  const m24=Math.round(withCommission/24);
  const pctBtn=(v)=>`<button class="pct-opt ${pct===v?'active':''}" onclick="setInstPercent('${id}',${v})" style="flex:1;padding:10px;border-radius:10px;border:1px solid ${pct===v?'var(--accent)':'var(--border2)'};background:${pct===v?'var(--accent)':'var(--surface2)'};color:${pct===v?'#000':'var(--white)'};font-weight:700;cursor:pointer;font-family:'Space Grotesk',sans-serif;font-size:14px;">${v}%</button>`;
  document.getElementById('modal-body').innerHTML=`
    <div class="modal-title">📅 Рассрочка Kaspi</div>
    <div class="modal-sub">${p.model} · цена за нал ${fmt(p.sell_price)}</div>
    <div class="form-group"><label class="form-label">Процент банка</label><div style="display:flex;gap:8px;">${pctBtn(15)}${pctBtn(17)}${pctBtn(21)}</div></div>
    <div style="background:#1A1408;border:1px solid #3A2E15;border-radius:12px;padding:14px;margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;"><span style="color:var(--gray);">Цена за наличные</span><b>${fmt(p.sell_price)}</b></div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;"><span style="color:var(--gray);">Комиссия Kaspi +${pct}%</span><b style="color:var(--orange);">+${fmt(withCommission-p.sell_price)}</b></div>
      <div style="height:1px;background:var(--border2);margin:8px 0;"></div>
      <div style="display:flex;justify-content:space-between;font-size:15px;"><span><b>Сумма в рассрочку</b></span><b style="color:var(--accent);">${fmt(withCommission)}</b></div>
    </div>
    <div class="form-group"><label class="form-label">Выбери срок</label>
      <div style="display:flex;gap:8px;">
        <button class="inst-opt active" id="inst-12" onclick="pickInst(12,${m12},this)" style="flex:1;padding:14px;border-radius:12px;border:1px solid var(--accent);background:var(--accent);color:#000;font-weight:700;cursor:pointer;font-family:'Space Grotesk',sans-serif;">
          <div style="font-size:16px;">0-0-12</div><div style="font-size:12px;margin-top:3px;">${fmt(m12)}/мес</div>
        </button>
        <button class="inst-opt" id="inst-24" onclick="pickInst(24,${m24},this)" style="flex:1;padding:14px;border-radius:12px;border:1px solid var(--border2);background:var(--surface2);color:var(--white);font-weight:700;cursor:pointer;font-family:'Space Grotesk',sans-serif;">
          <div style="font-size:16px;">0-0-24</div><div style="font-size:12px;margin-top:3px;">${fmt(m24)}/мес</div>
        </button>
      </div>
    </div>
    <div style="font-size:11px;color:var(--gray);text-align:center;margin-bottom:14px;">Клиент платит банку ${fmt(withCommission)} · ты получаешь ${fmt(p.sell_price)} чистыми</div>
    <div class="modal-actions">
      <button class="modal-btn primary" onclick="clientForm('${id}','Рассрочка')">✅ Дальше — данные клиента</button>
      <button class="modal-btn secondary" onclick="sellPhone('${id}')">Назад</button>
    </div>`;
  window._instTerm=12;window._instMonthly=m12;window._instTotal=withCommission;window._instPercentUsed=pct;
}
function setInstPercent(id,pct){window._instPercent=pct;renderInstallmentForm(id);}
function pickInst(months,monthly,el){
  window._instTerm=months;window._instMonthly=monthly;
  document.querySelectorAll('.inst-opt').forEach(b=>{b.style.background='var(--surface2)';b.style.color='var(--white)';b.style.borderColor='var(--border2)';});
  el.style.background='var(--accent)';el.style.color='#000';el.style.borderColor='var(--accent)';
}

// ОБМЕН С ДОПЛАТОЙ
// СМЕШАННАЯ ОПЛАТА: часть сразу (нал/Kaspi-перевод) + часть в рассрочку
function mixedPaymentForm(id){
  const p=DB.products.find(x=>x.id===id);
  window._mixedId=id;window._mixedUpfrontType='Наличные';
  document.getElementById('modal-body').innerHTML=`
    <div class="modal-title">🔀 Часть сразу + рассрочка</div>
    <div class="modal-sub">${p.model} · всего ${fmt(p.sell_price)}</div>
    <div class="form-group"><label class="form-label">Как клиент платит первую часть</label>
      <div class="cond-pills">
        <div class="cond-pill active" id="mx-type-cash" onclick="setMixedUpfrontType('Наличные')">💵 Наличные</div>
        <div class="cond-pill" id="mx-type-kaspi" onclick="setMixedUpfrontType('Kaspi')">📱 Kaspi перевод</div>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Сумма первой части (₸)</label><input class="form-input" id="mx-upfront" placeholder="Например 100000" inputmode="numeric" oninput="calcMixedRemainder(${p.sell_price})"></div>
    <div id="mx-result" style="background:var(--surface2);border-radius:12px;padding:14px;margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;"><span style="color:var(--gray);">Всего за телефон</span><b>${fmt(p.sell_price)}</b></div>
      <div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:var(--gray);">Остаток в рассрочку</span><b id="mx-remainder-val" style="color:var(--accent);">${fmt(p.sell_price)}</b></div>
    </div>
    <div class="modal-actions">
      <button class="modal-btn primary" onclick="mixedContinueToInstallment('${id}')">✅ Дальше — рассрочка на остаток</button>
      <button class="modal-btn secondary" onclick="sellPhone('${id}')">Назад</button>
    </div>`;
  window._mixedUpfrontAmount=0;
}
function setMixedUpfrontType(type){
  window._mixedUpfrontType=type;
  document.getElementById('mx-type-cash').classList.toggle('active',type==='Наличные');
  document.getElementById('mx-type-kaspi').classList.toggle('active',type==='Kaspi');
}
function calcMixedRemainder(price){
  const up=parseInt(document.getElementById('mx-upfront').value)||0;
  window._mixedUpfrontAmount=up;
  const remainder=Math.max(price-up,0);
  document.getElementById('mx-remainder-val').textContent=fmt(remainder);
  document.getElementById('mx-remainder-val').style.color = up>price ? 'var(--red)' : 'var(--accent)';
}
function mixedContinueToInstallment(id){
  const p=DB.products.find(x=>x.id===id);
  const up=window._mixedUpfrontAmount||0;
  if(up<=0){showToast('⚠️ Укажи сумму первой части',true);return;}
  if(up>=p.sell_price){showToast('⚠️ Первая часть не может быть больше или равна полной цене — тогда это просто наличные/Kaspi',true);return;}
  window._mixedRemainder=p.sell_price-up;
  mixedChooseRemainderType(id);
}
function mixedChooseRemainderType(id){
  const p=DB.products.find(x=>x.id===id);
  const remainder=window._mixedRemainder;
  document.getElementById('modal-body').innerHTML=`
    <div class="modal-title">🔀 Как оплатит остаток?</div>
    <div class="modal-sub">${p.model} · остаток ${fmt(remainder)}</div>
    <div style="background:var(--surface2);border-radius:12px;padding:14px;margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;"><span style="color:var(--gray);">${window._mixedUpfrontType} сразу</span><b>${fmt(window._mixedUpfrontAmount)}</b></div>
      <div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:var(--gray);">Остаток</span><b style="color:var(--accent);">${fmt(remainder)}</b></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      <button class="modal-btn" style="background:var(--green-dim);color:var(--green);border:1px solid var(--green);" onclick="mixedRemainderSimple('${id}','Наличные')">💵 Остаток тоже наличными</button>
      <button class="modal-btn" style="background:var(--blue-dim);color:var(--blue);border:1px solid var(--blue);" onclick="mixedRemainderSimple('${id}','Kaspi')">📱 Остаток Kaspi переводом</button>
      <button class="modal-btn" style="background:var(--purple-dim);color:var(--purple);border:1px solid var(--purple);" onclick="mixedRemainderInstallment('${id}')">📅 Остаток в рассрочку Kaspi</button>
      <button class="modal-btn secondary" onclick="mixedPaymentForm('${id}')">Назад</button>
    </div>`;
}
function mixedRemainderSimple(id,type){
  window._mixedRemainderType=type;
  window._mixedRemainderIsInstallment=false;
  clientForm(id,'Смешанная');
}
function mixedRemainderInstallment(id){
  window._mixedRemainderIsInstallment=true;
  window._mixedPercent=21;
  renderMixedInstallment(id);
}
function renderMixedInstallment(id){
  const p=DB.products.find(x=>x.id===id);
  const remainder=window._mixedRemainder;
  const pct=window._mixedPercent||21;
  const withC=Math.round(remainder*(1+pct/100));
  const m12=Math.round(withC/12),m24=Math.round(withC/24);
  const pctBtn=(v)=>`<button class="pct-opt ${pct===v?'active':''}" onclick="setMixedPercent('${id}',${v})" style="flex:1;padding:10px;border-radius:10px;border:1px solid ${pct===v?'var(--accent)':'var(--border2)'};background:${pct===v?'var(--accent)':'var(--surface2)'};color:${pct===v?'#000':'var(--white)'};font-weight:700;cursor:pointer;font-family:'Space Grotesk',sans-serif;font-size:14px;">${v}%</button>`;
  document.getElementById('modal-body').innerHTML=`
    <div class="modal-title">📅 Рассрочка на остаток</div>
    <div class="modal-sub">${p.model} · остаток ${fmt(remainder)} из ${fmt(p.sell_price)}</div>
    <div style="background:var(--surface2);border-radius:12px;padding:14px;margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;"><span style="color:var(--gray);">${window._mixedUpfrontType} сразу</span><b>${fmt(window._mixedUpfrontAmount)}</b></div>
      <div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:var(--gray);">Остаток в рассрочку</span><b>${fmt(remainder)}</b></div>
    </div>
    <div class="form-group"><label class="form-label">Процент банка на остаток</label><div style="display:flex;gap:8px;">${pctBtn(15)}${pctBtn(17)}${pctBtn(21)}</div></div>
    <div style="background:#1A1408;border:1px solid #3A2E15;border-radius:12px;padding:14px;margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;"><span style="color:var(--gray);">Остаток</span><b>${fmt(remainder)}</b></div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;"><span style="color:var(--gray);">Комиссия Kaspi +${pct}%</span><b style="color:var(--orange);">+${fmt(withC-remainder)}</b></div>
      <div style="height:1px;background:var(--border2);margin:8px 0;"></div>
      <div style="display:flex;justify-content:space-between;font-size:15px;"><span><b>Сумма в рассрочку</b></span><b style="color:var(--accent);">${fmt(withC)}</b></div>
    </div>
    <div class="form-group"><label class="form-label">Срок</label>
      <div style="display:flex;gap:8px;">
        <button class="inst-opt active" id="mxinst-12" onclick="pickMixedInst(12,${m12},this)" style="flex:1;padding:14px;border-radius:12px;border:1px solid var(--accent);background:var(--accent);color:#000;font-weight:700;cursor:pointer;font-family:'Space Grotesk',sans-serif;"><div style="font-size:16px;">0-0-12</div><div style="font-size:12px;margin-top:3px;">${fmt(m12)}/мес</div></button>
        <button class="inst-opt" id="mxinst-24" onclick="pickMixedInst(24,${m24},this)" style="flex:1;padding:14px;border-radius:12px;border:1px solid var(--border2);background:var(--surface2);color:var(--white);font-weight:700;cursor:pointer;font-family:'Space Grotesk',sans-serif;"><div style="font-size:16px;">0-0-24</div><div style="font-size:12px;margin-top:3px;">${fmt(m24)}/мес</div></button>
      </div>
    </div>
    <div class="modal-actions">
      <button class="modal-btn primary" onclick="clientForm('${id}','Смешанная')">✅ Дальше — данные клиента</button>
      <button class="modal-btn secondary" onclick="mixedChooseRemainderType('${id}')">Назад</button>
    </div>`;
  window._mixedTerm=12;window._mixedMonthly=m12;window._mixedTotal=withC;
}
function setMixedPercent(id,pct){window._mixedPercent=pct;renderMixedInstallment(id);}
function pickMixedInst(months,monthly,el){
  window._mixedTerm=months;window._mixedMonthly=monthly;
  document.querySelectorAll('.inst-opt').forEach(b=>{b.style.background='var(--surface2)';b.style.color='var(--white)';b.style.borderColor='var(--border2)';});
  el.style.background='var(--accent)';el.style.color='#000';el.style.borderColor='var(--accent)';
}

function tradeInForm(id){
  const p=DB.products.find(x=>x.id===id);
  document.getElementById('modal-body').innerHTML=`
    <div class="modal-title">🔄 Трейд-ин</div>
    <div class="modal-sub">${p.model} · ${fmt(p.sell_price)}</div>
    <div class="form-group"><label class="form-label">Что сдаёт клиент (модель)</label><input class="form-input" id="ti-model" placeholder="iPhone 11 128GB"></div>
    <div class="form-group"><label class="form-label">IMEI старого телефона</label><input class="form-input" id="ti-imei" placeholder="35..." inputmode="numeric"></div>
    <div class="form-group"><label class="form-label">Оценка старого телефона (₸)</label><input class="form-input" id="ti-value" placeholder="40000" inputmode="numeric" oninput="calcTrade(${p.sell_price})"></div>
    <div id="ti-result" style="background:var(--surface2);border-radius:12px;padding:14px;margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;"><span style="color:var(--gray);">Цена нового</span><b>${fmt(p.sell_price)}</b></div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;"><span style="color:var(--gray);">Минус старый</span><b style="color:var(--orange);">−0 ₸</b></div>
      <div style="height:1px;background:var(--border2);margin:8px 0;"></div>
      <div style="display:flex;justify-content:space-between;font-size:15px;"><span><b>Доплата клиента</b></span><b style="color:var(--accent);" id="ti-doplata">${fmt(p.sell_price)}</b></div>
    </div>
    <div class="modal-actions">
      <button class="modal-btn primary" onclick="saveTradeAndContinue('${id}')">✅ Дальше — данные клиента</button>
      <button class="modal-btn secondary" onclick="sellPhone('${id}')">Назад</button>
    </div>`;
  window._tradeValue=0;
}
function saveTradeAndContinue(id){
  const p=DB.products.find(x=>x.id===id);
  const model=document.getElementById('ti-model')?.value.trim()||'';
  if(!model){showToast('⚠️ Укажи модель телефона, который сдаёт клиент',true);return;}
  const tradeValue=parseInt(document.getElementById('ti-value')?.value)||0;
  if(p && tradeValue>=p.sell_price){showToast('⚠️ Оценка старого телефона не может быть больше или равна цене нового',true);return;}
  window._tradeModel=model;
  window._tradeImei=document.getElementById('ti-imei')?.value||'';
  window._tradeValue=tradeValue;
  clientForm(id,'Трейд-ин');
}
function calcTrade(price){
  const v=parseInt(document.getElementById('ti-value').value)||0;
  window._tradeValue=v;
  const dop=price-v;
  document.getElementById('ti-result').innerHTML=`
    <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;"><span style="color:var(--gray);">Цена нового</span><b>${fmt(price)}</b></div>
    <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;"><span style="color:var(--gray);">Минус старый</span><b style="color:var(--orange);">−${fmt(v)}</b></div>
    <div style="height:1px;background:var(--border2);margin:8px 0;"></div>
    <div style="display:flex;justify-content:space-between;font-size:15px;"><span><b>Доплата клиента</b></span><b style="color:${dop>=0?'var(--accent)':'var(--red)'};">${fmt(dop)}</b></div>`;
}

function clientForm(id, payment){
  const p=DB.products.find(x=>x.id===id);
  let priceInfo=fmt(p.sell_price);
  if(payment==='Рассрочка')priceInfo=fmt(window._instTotal)+' · '+window._instTerm+' мес';
  if(payment==='Трейд-ин')priceInfo='доплата '+fmt(p.sell_price-(window._tradeValue||0));
  if(payment==='Смешанная'){
    if(window._mixedRemainderIsInstallment){
      priceInfo=window._mixedUpfrontType+' '+fmt(window._mixedUpfrontAmount)+' + рассрочка '+fmt(window._mixedTotal)+' ('+window._mixedTerm+' мес)';
    }else{
      priceInfo=window._mixedUpfrontType+' '+fmt(window._mixedUpfrontAmount)+' + '+window._mixedRemainderType+' '+fmt(window._mixedRemainder);
    }
  }
  document.getElementById('modal-body').innerHTML=`
    <div class="modal-title">📝 Данные покупателя</div>
    <div class="modal-sub">${p.model} · ${priceInfo} · ${payment}</div>
    <div class="form-group"><label class="form-label">Фамилия Имя клиента</label><input class="form-input" id="cl-name" placeholder="Асылбеков Асан"></div>
    <div class="form-group"><label class="form-label">Телефон (WhatsApp)</label><input class="form-input" id="cl-phone" placeholder="+7 701 234 5678" inputmode="tel"></div>
    <input type="hidden" id="cl-warranty" value="30">
    <div style="background:var(--surface2);border-radius:10px;padding:12px;margin-bottom:14px;font-size:12px;color:var(--gray);text-align:center;">🛡 Гарантия La Phone: 30 дней (1 месяц)</div>
    <div class="modal-actions">
      <button class="modal-btn primary" onclick="finishSale('${id}','${payment}')">✅ Оформить и создать документ</button>
      <button class="modal-btn secondary" onclick="sellPhone('${id}')">Назад</button>
    </div>`;
}

let _finishingSale=false;
async function finishSale(id,payment){
  if(_finishingSale)return;
  _finishingSale=true;
  const p=DB.products.find(x=>x.id===id);
  const clientName=document.getElementById('cl-name')?.value.trim()||'—';
  const clientPhone=document.getElementById('cl-phone')?.value.trim()||'';
  const warrantyDays=30; // гарантия всегда месяц
  const saleData={clientName,clientPhone,warrantyDays,payment,date:new Date()};
  // Данные рассрочки
  if(payment==='Рассрочка'){saleData.instTerm=window._instTerm;saleData.instMonthly=window._instMonthly;saleData.instTotal=window._instTotal;saleData.instPercent=window._instPercentUsed||21;}
  // Данные обмена
  if(payment==='Трейд-ин'){saleData.tradeModel=window._tradeModel||'';saleData.tradeImei=window._tradeImei||'';saleData.tradeValue=window._tradeValue||0;saleData.doplata=p.sell_price-(window._tradeValue||0);}
  // Данные смешанной оплаты (часть сразу + остаток нал/Kaspi/рассрочка)
  if(payment==='Смешанная'){
    saleData.mixedUpfrontType=window._mixedUpfrontType;
    saleData.mixedUpfrontAmount=window._mixedUpfrontAmount;
    saleData.mixedRemainder=window._mixedRemainder;
    saleData.mixedRemainderIsInstallment=window._mixedRemainderIsInstallment;
    if(window._mixedRemainderIsInstallment){
      saleData.mixedInstPercent=window._mixedPercent;
      saleData.mixedInstTerm=window._mixedTerm;
      saleData.mixedInstTotal=window._mixedTotal;
    }else{
      saleData.mixedRemainderType=window._mixedRemainderType;
    }
  }

  // Строим ПОЛНЫЙ объект продажи СРАЗУ, одним куском — без пост-патчинга,
  // чтобы в облако улетали client_name, imei, passport_id и данные обмена/рассрочки
  p.sold = true;
  const sale = {
    id:'S'+Date.now(),
    point:currentUser.point||p.point,
    seller:currentUser.name,
    model:p.model+' '+p.storage,
    sell_price:p.sell_price,
    buy_price:p.buy_price,
    payment,
    created_at:new Date().toISOString(),
    client_name:clientName,
    client_phone:clientPhone,
    warranty_days:warrantyDays,
    imei:p.imei,
    battery:p.battery,
    condition:p.condition,
    passport_id:p.id
  };
  if(payment==='Рассрочка'){ sale.inst_term=saleData.instTerm; sale.inst_total=saleData.instTotal; sale.inst_percent=saleData.instPercent; sale.installment_tax=Math.round(saleData.instTotal*0.03); }
  if(payment==='Трейд-ин'){ sale.trade_model=saleData.tradeModel; sale.trade_value=saleData.tradeValue; sale.doplata=saleData.doplata; }
  if(payment==='Смешанная'){
    sale.mixed_upfront_type=saleData.mixedUpfrontType;
    sale.mixed_upfront_amount=saleData.mixedUpfrontAmount;
    sale.mixed_remainder=saleData.mixedRemainder;
    sale.mixed_remainder_is_installment=saleData.mixedRemainderIsInstallment;
    if(saleData.mixedRemainderIsInstallment){
      sale.mixed_inst_percent=saleData.mixedInstPercent;
      sale.mixed_inst_term=saleData.mixedInstTerm;
      sale.mixed_inst_total=saleData.mixedInstTotal;
      // Налог 3% считается ТОЛЬКО с той части, что реально пошла в рассрочку — не со всей суммы телефона
      sale.installment_tax=Math.round(saleData.mixedInstTotal*0.03);
    }else{
      sale.mixed_remainder_type=saleData.mixedRemainderType;
    }
  }

  DB.sales.push(sale);

  if(cloudMode && sb){
    showCloud('syncing','🔄 Сохранение...');
    try{
      await withTimeout(sb.from('products').update({sold:true}).eq('id',p.id));
      await withTimeout(sb.from('sales').insert([sale]));
      showCloud('online','☁️ Сохранено в облако');
    }catch(e){ showCloud('offline','📴 Сохранено локально'); }
  }

  // Обмен: старый телефон НЕ создаём автоматом — запоминаем данные,
  // полноценную приёмку сделаем после того, как продавец закроет документ по проданному телефону
  if(payment==='Трейд-ин' && saleData.tradeModel){
    window._tradeInQueue=[...(window._tradeInQueue||[]),{model:saleData.tradeModel, imei:saleData.tradeImei||'', buy_price:saleData.tradeValue, seller_name:clientName, seller_phone:clientPhone}];
  }

  saveLocal();
  closeModal();
  showWarrantyDoc(p, saleData);
  if(navigator.vibrate)navigator.vibrate([50,30,50]);
  _finishingSale=false;
}

// ==================== ЕДИНЫЙ ДОКУМЕНТ: ДОГОВОР + ГАРАНТИЯ + ПАСПОРТ ====================
function showWarrantyDoc(p, sale){
  const start=sale.date;
  const end=new Date(start.getTime()+sale.warrantyDays*86400000);
  const fmtDate=d=>d.toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric'});
  const pt=POINTS.find(x=>x.id===currentUser.point)||POINTS[0];
  const docNum='LP-'+Date.now().toString().slice(-8);
  // payment детали
  let payDetail=sale.payment;
  if(sale.payment==='Рассрочка')payDetail=`Рассрочка Kaspi 0-0-${sale.instTerm} · ${fmt(sale.instTotal)} (${fmt(sale.instMonthly)}/мес)`;
  if(sale.payment==='Трейд-ин')payDetail=`Обмен: сдал ${sale.tradeModel} (${fmt(sale.tradeValue)}) + доплата ${fmt(sale.doplata)}`;
  if(sale.payment==='Смешанная'){
    if(sale.mixedRemainderIsInstallment){
      payDetail=`${sale.mixedUpfrontType} ${fmt(sale.mixedUpfrontAmount)} + Рассрочка 0-0-${sale.mixedInstTerm} на остаток ${fmt(sale.mixedInstTotal)}`;
    }else{
      payDetail=`${sale.mixedUpfrontType} ${fmt(sale.mixedUpfrontAmount)} + ${sale.mixedRemainderType} ${fmt(sale.mixedRemainder)}`;
    }
  }
  window._warrantyData={
    model:p.model,storage:p.storage,color:p.color,imei:p.imei,battery:p.battery,
    condition:p.condition,defects:p.defects||'',pid:p.id,docNum,
    name:sale.clientName,phone:sale.clientPhone,
    payment:payDetail,price:fmt(p.sell_price),start:fmtDate(start),end:fmtDate(end),
    point:pt.name.split('·')[1]?pt.name.split('·')[1].trim():pt.name
  };
  document.getElementById('modal-body').innerHTML=`
    <div class="modal-title">✅ Продажа оформлена</div>
    <div class="modal-sub">Договор + Гарантия + Паспорт — единый документ</div>
    <div class="warranty-doc" id="warranty-doc">
      <div class="wd-header">
        <div class="wd-logo">La<span>Phone</span></div>
        <div class="wd-doctype">Договор · Гарантия<br>Паспорт телефона</div>
      </div>
      <div style="text-align:center;font-size:11px;color:var(--gray);margin-bottom:14px;">Документ № ${docNum} · ${fmtDate(start)}</div>

      <div class="wd-phone-name">${p.model} ${p.storage}</div>
      <div class="wd-phone-sub">${p.color} · ${p.condition}</div>

      <div style="font-size:10px;color:var(--accent);text-transform:uppercase;letter-spacing:1px;margin:14px 0 8px;">📱 Паспорт телефона</div>
      <div class="wd-section">
        <div class="wd-row"><span>IMEI</span><b>${p.imei}</b></div>
        <div class="wd-row"><span>Батарея</span><b>${p.battery}%</b></div>
        <div class="wd-row"><span>Состояние</span><b>${p.condition}</b></div>
        ${p.defects?`<div class="wd-row"><span>Дефекты</span><b style="font-size:11px;">${p.defects}</b></div>`:''}
      </div>

      <div class="wd-divider"></div>
      <div style="font-size:10px;color:var(--accent);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">📄 Договор купли-продажи</div>
      <div class="wd-section">
        <div class="wd-row"><span>Цена</span><b>${fmt(p.sell_price)}</b></div>
        <div class="wd-row"><span>Оплата</span><b style="font-size:11px;max-width:60%;">${payDetail}</b></div>
        <div class="wd-row"><span>Продавец</span><b>La Phone · ${window._warrantyData.point}</b></div>
        <div class="wd-row"><span>Покупатель</span><b>${sale.clientName}</b></div>
        ${sale.clientPhone?`<div class="wd-row"><span>Телефон</span><b>${sale.clientPhone}</b></div>`:''}
      </div>

      <div class="wd-divider"></div>
      <div style="font-size:10px;color:var(--accent);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">🛡 Гарантийный талон</div>
      <div class="wd-section">
        <div class="wd-row"><span>Дата продажи</span><b>${fmtDate(start)}</b></div>
        <div class="wd-row"><span>Срок гарантии</span><b>30 дней (1 месяц)</b></div>
        <div class="wd-row"><span>Действует до</span><b style="color:#C8F135;">${fmtDate(end)}</b></div>
      </div>

      <div class="wd-footer">Документ ${docNum} · Паспорт ${p.id}<br>La Phone · Астана · Спасибо за покупку! 🤝</div>
    </div>
    <div class="modal-actions">
      <button class="modal-btn primary" onclick="sharePDF()">📄 Скачать / поделиться PDF</button>
    </div>
    <button class="modal-btn" style="width:100%;margin-top:8px;background:#25D36620;color:#25D366;border:1px solid #25D366;" onclick="sendWarrantyWA()">📱 Отправить текстом в WhatsApp</button>
    <button class="modal-btn secondary" style="width:100%;margin-top:8px;" onclick="processTradeInQueue()">${(window._tradeInQueue&&window._tradeInQueue.length) ? 'Готово · принять обменный телефон' : 'Готово'}</button>`;
  document.getElementById('modal').classList.add('open');
}

function sendWarrantyWA(){
  const d=window._warrantyData;
  if(!d)return;
  const text=
`🛡 *LA PHONE*
*ДОГОВОР · ГАРАНТИЯ · ПАСПОРТ*
Документ № ${d.docNum}
━━━━━━━━━━━━━━━━━━━

📱 *${d.model} ${d.storage}*
${d.color} · ${d.condition}

*ПАСПОРТ ТЕЛЕФОНА:*
• IMEI: ${d.imei}
• Батарея: ${d.battery}%
• Состояние: ${d.condition}${d.defects?`\n• Дефекты: ${d.defects}`:''}

*ДОГОВОР:*
• Цена: ${d.price}
• Оплата: ${d.payment}
• Продавец: La Phone · ${d.point}
• Покупатель: ${d.name}

*ГАРАНТИЯ:*
• Дата продажи: ${d.start}
• Срок: 30 дней (1 месяц)
• Действует до: ${d.end}

━━━━━━━━━━━━━━━━━━━
La Phone · Астана
Спасибо за покупку! 🤝`;
  const phone=d.phone.replace(/\D/g,'');
  const url=phone?`https://wa.me/${phone}?text=${encodeURIComponent(text)}`:`https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url,'_blank');
  showToast('📱 Отправляю клиенту...');
}

// Генерация настоящего PDF документа — рендерим готовый DOM-блок через html2canvas,
// чтобы кириллица не превращалась в иероглифы (встроенные шрифты jsPDF не знают кириллицу)
async function renderDocToPdf(elementId, filenamePrefix, docNum){
  const el=document.getElementById(elementId);
  if(!el){showToast('Нет данных',true);return;}
  if(!window.jspdf || !window.html2canvas){showToast('PDF доступен на телефоне/после публикации',true);return;}
  try{
    showToast('📄 Готовлю PDF...');
    const canvas=await html2canvas(el,{backgroundColor:'#0A0A0A',scale:2,useCORS:true});
    const imgData=canvas.toDataURL('image/jpeg',0.92);
    const {jsPDF}=window.jspdf;
    const pageWidthMm=105; // A5 ширина
    const imgWidthMm=pageWidthMm-20;
    const imgHeightMm=imgWidthMm*canvas.height/canvas.width;
    const doc=new jsPDF({unit:'mm',format:[pageWidthMm,Math.max(imgHeightMm+20,148)]});
    doc.setFillColor(10,10,10);
    doc.rect(0,0,pageWidthMm,doc.internal.pageSize.getHeight(),'F');
    doc.addImage(imgData,'JPEG',10,10,imgWidthMm,imgHeightMm);
    const filename=filenamePrefix+'_'+docNum+'.pdf';
    if(navigator.share && navigator.canShare){
      const blob=doc.output('blob');
      const file=new File([blob],filename,{type:'application/pdf'});
      if(navigator.canShare({files:[file]})){
        navigator.share({files:[file],title:'La Phone — документ'}).then(()=>showToast('📄 Отправлено')).catch(()=>doc.save(filename));
        return;
      }
    }
    doc.save(filename);
    showToast('📄 PDF скачан');
  }catch(e){console.error('PDF error',e);showToast('PDF: ошибка генерации',true);}
}

function sharePDF(){
  const d=window._warrantyData;
  if(!d){showToast('Нет данных',true);return;}
  renderDocToPdf('warranty-doc','LaPhone',d.docNum);
}

function downloadMultiPDF(){
  const d=window._multiDoc;
  if(!d){showToast('Нет данных',true);return;}
  renderDocToPdf('warranty-doc','LaPhone_Multi',d.docNum);
}

