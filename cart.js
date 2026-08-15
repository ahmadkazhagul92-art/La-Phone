let cart=[]; // корзина для продажи нескольких телефонов
// ==================== КОРЗИНА (несколько телефонов) ====================
let cartTradeIns=[]; // сдаваемые клиентом старые телефоны в этой продаже — Вариант Б: общий зачёт против всей корзины
function addToCart(id){
  const p=DB.products.find(x=>x.id===id);
  if(!p||p.sold)return;
  if(cart.find(c=>c.id===id)){showToast('Уже в корзине');return;}
  cart.push(p);
  closeModal();
  showToast('🛒 Добавлено в корзину ('+cart.length+')');
  updateCartFab();
}

function updateCartFab(){
  let fab=document.getElementById('cart-fab');
  if(cart.length===0){if(fab)fab.remove();return;}
  if(!fab){
    fab=document.createElement('button');
    fab.id='cart-fab';fab.className='cart-fab';
    fab.onclick=openCart;
    document.body.appendChild(fab);
  }
  fab.innerHTML='🛒<span class="cart-fab-badge">'+cart.length+'</span>';
}

function cartTradeInTotal(){ return cartTradeIns.reduce((s,t)=>s+(t.value||0),0); }

function openCart(){
  if(cart.length===0){showToast('Корзина пуста');return;}
  const total=cart.reduce((s,p)=>s+p.sell_price,0);
  const tradeTotal=cartTradeInTotal();
  const remainder=Math.max(total-tradeTotal,0);
  document.getElementById('modal-body').innerHTML=`
    <div class="modal-title">🛒 Корзина · ${cart.length} тел.</div>
    <div class="modal-sub">Продажа одному клиенту</div>
    ${cart.map((p,i)=>`<div class="cart-item">
      <div class="prod-thumb">${p.isNew?'✨':'📱'}</div>
      <div class="cart-item-info"><div class="cart-item-name">${p.model} ${p.storage}</div><div class="cart-item-price">${fmt(p.sell_price)}</div></div>
      <div class="cart-item-remove" onclick="removeFromCart(${i})">✕</div>
    </div>`).join('')}
    <div class="section-label" style="margin-top:16px;">🔄 Обменные телефоны клиента</div>
    ${cartTradeIns.length?cartTradeIns.map((t,i)=>`<div class="cart-item">
      <div class="prod-thumb">📴</div>
      <div class="cart-item-info"><div class="cart-item-name">${t.model}</div><div class="cart-item-price" style="color:var(--orange);">−${fmt(t.value)}</div></div>
      <div class="cart-item-remove" onclick="removeCartTradeIn(${i})">✕</div>
    </div>`).join(''):'<div style="font-size:12px;color:var(--gray);padding:8px 0;">Нет сдаваемых телефонов</div>'}
    <button class="modal-btn secondary" style="width:100%;margin-top:8px;background:var(--orange);color:#000;border:none;" onclick="addCartTradeInForm()">➕ Добавить обменный телефон</button>
    <div class="cart-total" style="margin-top:14px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:${tradeTotal?'6px':'0'};"><span style="color:var(--gray);">Итого ${cart.length} телефонов</span><b>${fmt(total)}</b></div>
      ${tradeTotal?`<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;"><span style="color:var(--gray);">Зачёт обменных телефонов</span><b style="color:var(--orange);">−${fmt(tradeTotal)}</b></div><div style="height:1px;background:var(--border2);margin:8px 0;"></div><div style="display:flex;justify-content:space-between;font-size:15px;"><span><b>К оплате</b></span><b style="color:var(--accent);font-family:'Space Grotesk',sans-serif;font-size:18px;">${fmt(remainder)}</b></div>`:''}
    </div>
    <div class="modal-actions">
      <button class="modal-btn primary" onclick="cartCheckout()">✅ Оформить на клиента</button>
      <button class="modal-btn secondary" onclick="closeModal()">Продолжить</button>
    </div>
    <button class="modal-btn secondary" style="width:100%;margin-top:8px;background:var(--red-dim);color:var(--red);border:1px solid var(--red);" onclick="clearCart()">🗑 Очистить корзину</button>`;
  document.getElementById('modal').classList.add('open');
}

function addCartTradeInForm(){
  document.getElementById('modal-body').innerHTML=`
    <div class="modal-title">🔄 Добавить обменный телефон</div>
    <div class="modal-sub">Что сдаёт клиент в зачёт</div>
    <div class="form-group"><label class="form-label">Модель сдаваемого телефона</label><input class="form-input" id="cti-model" placeholder="iPhone 11 128GB"></div>
    <div class="form-group"><label class="form-label">IMEI (если знаешь сейчас)</label><input class="form-input" id="cti-imei" placeholder="35..." inputmode="numeric"></div>
    <div class="form-group"><label class="form-label">Оценка (₸)</label><input class="form-input" id="cti-value" placeholder="40000" inputmode="numeric"></div>
    <div class="modal-actions">
      <button class="modal-btn primary" onclick="saveCartTradeIn()">✅ Добавить в корзину</button>
      <button class="modal-btn secondary" onclick="openCart()">Отмена</button>
    </div>`;
  document.getElementById('modal').classList.add('open');
}
let _savingCartTradeIn=false;
function saveCartTradeIn(){
  if(_savingCartTradeIn)return;
  _savingCartTradeIn=true;
  const modelEl=document.getElementById('cti-model');
  if(!modelEl){_savingCartTradeIn=false;return;}
  const model=modelEl.value.trim();
  const imei=document.getElementById('cti-imei').value.trim();
  const value=parseInt(document.getElementById('cti-value').value)||0;
  if(!model){showToast('⚠️ Укажи модель сдаваемого телефона',true);_savingCartTradeIn=false;return;}
  if(!value){showToast('⚠️ Укажи оценку телефона',true);_savingCartTradeIn=false;return;}
  const cartTotal=cart.reduce((s,p)=>s+p.sell_price,0);
  if(cartTradeInTotal()+value>=cartTotal){showToast('⚠️ Сумма обменных телефонов не может быть больше или равна сумме корзины',true);_savingCartTradeIn=false;return;}
  cartTradeIns.push({model,imei,value});
  openCart();
  _savingCartTradeIn=false;
}
function removeCartTradeIn(i){cartTradeIns.splice(i,1);openCart();}


function removeFromCart(i){cart.splice(i,1);updateCartFab();if(cart.length===0){closeModal();}else openCart();}
function clearCart(){cart=[];cartTradeIns=[];updateCartFab();closeModal();showToast('Корзина очищена');}

function cartCheckout(){
  const total=cart.reduce((s,p)=>s+p.sell_price,0);
  const tradeTotal=cartTradeInTotal();
  const remainder=Math.max(total-tradeTotal,0);
  const hasTradeIn=tradeTotal>0;
  document.getElementById('modal-body').innerHTML=`
    <div class="modal-title">💰 Оплата корзины</div>
    <div class="modal-sub">${cart.length} телефонов · ${hasTradeIn?`к оплате ${fmt(remainder)} (учтён зачёт ${fmt(tradeTotal)})`:fmt(total)}</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      <button class="modal-btn" style="background:var(--green-dim);color:var(--green);border:1px solid var(--green);" onclick="cartClientForm('Наличные')">💵 Наличными</button>
      <button class="modal-btn" style="background:var(--blue-dim);color:var(--blue);border:1px solid var(--blue);" onclick="cartClientForm('Kaspi')">📱 Kaspi перевод</button>
      <button class="modal-btn" style="background:var(--purple-dim);color:var(--purple);border:1px solid var(--purple);" onclick="cartInstallment()">📅 Рассрочка (+21%)${hasTradeIn?' на остаток':''}</button>
      <button class="modal-btn" style="background:#3B82F620;color:#60A5FA;border:1px solid #60A5FA;" onclick="cartMixedPaymentForm()">🔀 Часть сразу + часть в рассрочку</button>
      <button class="modal-btn secondary" onclick="openCart()">Назад</button>
    </div>`;
}

function cartInstallment(){
  window._cInstPercent=window._cInstPercent||21;
  renderCartInstallment();
}
function renderCartInstallment(){
  const total=cart.reduce((s,p)=>s+p.sell_price,0);
  const tradeTotal=cartTradeInTotal();
  const base=Math.max(total-tradeTotal,0);
  const pct=window._cInstPercent||21;
  const withC=Math.round(base*(1+pct/100));
  const m12=Math.round(withC/12),m24=Math.round(withC/24);
  const pctBtn=(v)=>`<button class="pct-opt ${pct===v?'active':''}" onclick="setCartInstPercent(${v})" style="flex:1;padding:10px;border-radius:10px;border:1px solid ${pct===v?'var(--accent)':'var(--border2)'};background:${pct===v?'var(--accent)':'var(--surface2)'};color:${pct===v?'#000':'var(--white)'};font-weight:700;cursor:pointer;font-family:'Space Grotesk',sans-serif;font-size:14px;">${v}%</button>`;
  document.getElementById('modal-body').innerHTML=`
    <div class="modal-title">📅 Рассрочка на корзину</div>
    <div class="modal-sub">${cart.length} телефонов${tradeTotal?' · с учётом обменных телефонов':''}</div>
    <div class="form-group"><label class="form-label">Процент банка</label><div style="display:flex;gap:8px;">${pctBtn(15)}${pctBtn(17)}${pctBtn(21)}</div></div>
    <div style="background:#1A1408;border:1px solid #3A2E15;border-radius:12px;padding:14px;margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;"><span style="color:var(--gray);">Итого товаров</span><b>${fmt(total)}</b></div>
      ${tradeTotal?`<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;"><span style="color:var(--orange);">Зачёт обменных телефонов</span><b style="color:var(--orange);">−${fmt(tradeTotal)}</b></div><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;"><span style="color:var(--gray);">Остаток за нал</span><b>${fmt(base)}</b></div>`:''}
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;"><span style="color:var(--gray);">+${pct}% Kaspi</span><b style="color:var(--orange);">+${fmt(withC-base)}</b></div>
      <div style="height:1px;background:var(--border2);margin:8px 0;"></div>
      <div style="display:flex;justify-content:space-between;font-size:15px;"><span><b>В рассрочку</b></span><b style="color:var(--accent);">${fmt(withC)}</b></div>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:14px;">
      <button class="inst-opt active" id="cinst-12" onclick="pickCartInst(12,${m12},this)" style="flex:1;padding:14px;border-radius:12px;border:1px solid var(--accent);background:var(--accent);color:#000;font-weight:700;cursor:pointer;font-family:'Space Grotesk',sans-serif;"><div style="font-size:16px;">0-0-12</div><div style="font-size:12px;margin-top:3px;">${fmt(m12)}/мес</div></button>
      <button class="inst-opt" id="cinst-24" onclick="pickCartInst(24,${m24},this)" style="flex:1;padding:14px;border-radius:12px;border:1px solid var(--border2);background:var(--surface2);color:var(--white);font-weight:700;cursor:pointer;font-family:'Space Grotesk',sans-serif;"><div style="font-size:16px;">0-0-24</div><div style="font-size:12px;margin-top:3px;">${fmt(m24)}/мес</div></button>
    </div>
    <div class="modal-actions">
      <button class="modal-btn primary" onclick="cartClientForm('Рассрочка')">✅ Дальше</button>
      <button class="modal-btn secondary" onclick="cartCheckout()">Назад</button>
    </div>`;
  window._cInstTerm=12;window._cInstTotal=withC;window._cInstMonthly=m12;
}
function setCartInstPercent(pct){window._cInstPercent=pct;renderCartInstallment();}
function pickCartInst(months,monthly,el){window._cInstTerm=months;window._cInstMonthly=monthly;document.querySelectorAll('.inst-opt').forEach(b=>{b.style.background='var(--surface2)';b.style.color='var(--white)';b.style.borderColor='var(--border2)';});el.style.background='var(--accent)';el.style.color='#000';el.style.borderColor='var(--accent)';}
// ==================== КОРЗИНА: часть сразу + часть в рассрочку (на остаток после зачёта трейд-ина) ====================
function cartMixedPaymentForm(){
  const total=cart.reduce((s,p)=>s+p.sell_price,0);
  const tradeTotal=cartTradeInTotal();
  const afterTrade=Math.max(total-tradeTotal,0);
  window._cartMixedUpfrontType='Наличные';window._cartMixedUpfrontAmount=0;
  document.getElementById('modal-body').innerHTML=`
    <div class="modal-title">🔀 Часть сразу + рассрочка</div>
    <div class="modal-sub">${cart.length} телефонов · ${tradeTotal?`остаток после зачёта ${fmt(afterTrade)}`:`итого ${fmt(afterTrade)}`}</div>
    ${tradeTotal?`<div style="background:var(--surface2);border-radius:12px;padding:14px;margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;"><span style="color:var(--gray);">Итого товаров</span><b>${fmt(total)}</b></div>
      <div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:var(--orange);">Зачёт обменных телефонов</span><b style="color:var(--orange);">−${fmt(tradeTotal)}</b></div>
    </div>`:''}
    <div class="form-group"><label class="form-label">Как клиент платит первую часть</label>
      <div class="cond-pills">
        <div class="cond-pill active" id="cmx-type-cash" onclick="setCartMixedUpfrontType('Наличные')">💵 Наличные</div>
        <div class="cond-pill" id="cmx-type-kaspi" onclick="setCartMixedUpfrontType('Kaspi')">📱 Kaspi перевод</div>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Сумма первой части (₸)</label><input class="form-input" id="cmx-upfront" placeholder="Например 100000" inputmode="numeric" oninput="calcCartMixedRemainder(${afterTrade})"></div>
    <div id="cmx-result" style="background:var(--surface2);border-radius:12px;padding:14px;margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;"><span style="color:var(--gray);">К оплате всего</span><b>${fmt(afterTrade)}</b></div>
      <div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:var(--gray);">Остаток в рассрочку</span><b id="cmx-remainder-val" style="color:var(--accent);">${fmt(afterTrade)}</b></div>
    </div>
    <div class="modal-actions">
      <button class="modal-btn primary" onclick="cartMixedContinueToInstallment(${afterTrade})">✅ Дальше — рассрочка на остаток</button>
      <button class="modal-btn secondary" onclick="cartCheckout()">Назад</button>
    </div>`;
}
function setCartMixedUpfrontType(type){
  window._cartMixedUpfrontType=type;
  document.getElementById('cmx-type-cash').classList.toggle('active',type==='Наличные');
  document.getElementById('cmx-type-kaspi').classList.toggle('active',type==='Kaspi');
}
function calcCartMixedRemainder(afterTrade){
  const up=parseInt(document.getElementById('cmx-upfront').value)||0;
  window._cartMixedUpfrontAmount=up;
  const remainder=Math.max(afterTrade-up,0);
  document.getElementById('cmx-remainder-val').textContent=fmt(remainder);
  document.getElementById('cmx-remainder-val').style.color = up>afterTrade ? 'var(--red)' : 'var(--accent)';
}
function cartMixedContinueToInstallment(afterTrade){
  const up=window._cartMixedUpfrontAmount||0;
  if(up<=0){showToast('⚠️ Укажи сумму первой части',true);return;}
  if(up>=afterTrade){showToast('⚠️ Первая часть не может быть больше или равна остатку — тогда это просто наличные/Kaspi',true);return;}
  window._cartMixedRemainder=afterTrade-up;
  window._cartMixedPercent=window._cartMixedPercent||21;
  renderCartMixedInstallment();
}
function renderCartMixedInstallment(){
  const remainder=window._cartMixedRemainder;
  const pct=window._cartMixedPercent||21;
  const withC=Math.round(remainder*(1+pct/100));
  const m12=Math.round(withC/12),m24=Math.round(withC/24);
  const pctBtn=(v)=>`<button class="pct-opt ${pct===v?'active':''}" onclick="setCartMixedPercent(${v})" style="flex:1;padding:10px;border-radius:10px;border:1px solid ${pct===v?'var(--accent)':'var(--border2)'};background:${pct===v?'var(--accent)':'var(--surface2)'};color:${pct===v?'#000':'var(--white)'};font-weight:700;cursor:pointer;font-family:'Space Grotesk',sans-serif;font-size:14px;">${v}%</button>`;
  document.getElementById('modal-body').innerHTML=`
    <div class="modal-title">📅 Рассрочка на остаток</div>
    <div class="modal-sub">${cart.length} телефонов · остаток ${fmt(remainder)}</div>
    <div style="background:var(--surface2);border-radius:12px;padding:14px;margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;"><span style="color:var(--gray);">${window._cartMixedUpfrontType} сразу</span><b>${fmt(window._cartMixedUpfrontAmount)}</b></div>
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
        <button class="inst-opt active" id="cmxinst-12" onclick="pickCartMixedInst(12,${m12},this)" style="flex:1;padding:14px;border-radius:12px;border:1px solid var(--accent);background:var(--accent);color:#000;font-weight:700;cursor:pointer;font-family:'Space Grotesk',sans-serif;"><div style="font-size:16px;">0-0-12</div><div style="font-size:12px;margin-top:3px;">${fmt(m12)}/мес</div></button>
        <button class="inst-opt" id="cmxinst-24" onclick="pickCartMixedInst(24,${m24},this)" style="flex:1;padding:14px;border-radius:12px;border:1px solid var(--border2);background:var(--surface2);color:var(--white);font-weight:700;cursor:pointer;font-family:'Space Grotesk',sans-serif;"><div style="font-size:16px;">0-0-24</div><div style="font-size:12px;margin-top:3px;">${fmt(m24)}/мес</div></button>
      </div>
    </div>
    <div class="modal-actions">
      <button class="modal-btn primary" onclick="cartClientForm('Смешанная')">✅ Дальше — данные клиента</button>
      <button class="modal-btn secondary" onclick="cartMixedPaymentForm()">Назад</button>
    </div>`;
  window._cartMixedTerm=12;window._cartMixedMonthly=m12;window._cartMixedTotal=withC;
}
function setCartMixedPercent(pct){window._cartMixedPercent=pct;renderCartMixedInstallment();}
function pickCartMixedInst(months,monthly,el){
  window._cartMixedTerm=months;window._cartMixedMonthly=monthly;
  document.querySelectorAll('.inst-opt').forEach(b=>{b.style.background='var(--surface2)';b.style.color='var(--white)';b.style.borderColor='var(--border2)';});
  el.style.background='var(--accent)';el.style.color='#000';el.style.borderColor='var(--accent)';
}

// Визуальная подсказка продавцу: цена телефонов + аксессуары = сумма для озвучивания клиенту.
// Ничего не сохраняется — значение поля cart-acc-amount нигде не читается вне этой функции.
function updateCartAccessoriesCalc(phoneTotal){
  const accEl=document.getElementById('cart-acc-amount');
  const lineEl=document.getElementById('cart-acc-calc-line');
  if(!accEl||!lineEl)return;
  const acc=parseInt(accEl.value)||0;
  lineEl.textContent = acc>0
    ? `Сказать клиенту: ${fmt(phoneTotal)} + ${fmt(acc)} = ${fmt(phoneTotal+acc)}`
    : `Сказать клиенту: ${fmt(phoneTotal)}`;
}

function cartClientForm(payment){
  const total=cart.reduce((s,p)=>s+p.sell_price,0);
  const tradeTotal=cartTradeInTotal();
  const remainder=Math.max(total-tradeTotal,0);
  let info=tradeTotal>0?`к оплате ${fmt(remainder)} (зачёт ${fmt(tradeTotal)})`:fmt(total);
  if(payment==='Рассрочка')info=fmt(window._cInstTotal)+' · '+window._cInstTerm+' мес';
  if(payment==='Смешанная')info=window._cartMixedUpfrontType+' '+fmt(window._cartMixedUpfrontAmount)+' + рассрочка '+fmt(window._cartMixedTotal)+' ('+window._cartMixedTerm+' мес)';
  document.getElementById('modal-body').innerHTML=`
    <div class="modal-title">📝 Данные покупателя</div>
    <div class="modal-sub">${cart.length} телефонов · ${info} · ${payment}</div>
    <div class="form-group"><label class="form-label">🎧 Аксессуары (₸) <span style="color:var(--gray);font-weight:400;">— не сохраняется, только чтобы прикинуть сумму для клиента</span></label><input class="form-input" id="cart-acc-amount" placeholder="Например 20000" inputmode="numeric" oninput="updateCartAccessoriesCalc(${total})"></div>
    <div id="cart-acc-calc-line" style="background:var(--surface2);border-radius:10px;padding:12px;margin-bottom:14px;font-size:13px;color:var(--gray);text-align:center;">Сказать клиенту: ${fmt(total)}</div>
    <div class="form-group"><label class="form-label">Фамилия Имя клиента</label><input class="form-input" id="cl-name" placeholder="Асылбеков Асан"></div>
    <div class="form-group"><label class="form-label">Телефон (WhatsApp)</label><input class="form-input" id="cl-phone" placeholder="+7 701 234 5678" inputmode="tel"></div>
    <div style="background:var(--surface2);border-radius:10px;padding:12px;margin-bottom:14px;font-size:12px;color:var(--gray);text-align:center;">🛡 Гарантия La Phone: 30 дней на каждый телефон</div>
    <div class="modal-actions">
      <button class="modal-btn primary" onclick="cartFinish('${payment}')">✅ Оформить ${cart.length} телефонов</button>
      <button class="modal-btn secondary" onclick="cartCheckout()">Назад</button>
    </div>`;
}

let _cartFinishing=false;
async function cartFinish(payment){
  if(_cartFinishing)return;
  _cartFinishing=true;
  const clientName=document.getElementById('cl-name')?.value.trim()||'—';
  const clientPhone=document.getElementById('cl-phone')?.value.trim()||'';
  const soldItems=[...cart];
  const total=cart.reduce((s,p)=>s+p.sell_price,0);
  const tradeTotal=cartTradeInTotal();
  // Распределяем зачёт обменных телефонов пропорционально цене каждого товара в корзине,
  // последний товар забирает остаток округления, чтобы сумма долей точно равнялась tradeTotal
  let assignedTrade=0;
  const itemsWithShare=cart.map((p,i)=>{
    let share=0;
    if(tradeTotal>0){
      share = (i===cart.length-1) ? (tradeTotal-assignedTrade) : Math.round(p.sell_price/total*tradeTotal);
      assignedTrade+=share;
    }
    return {p,share};
  });
  // Для смешанной оплаты (часть сразу + часть в рассрочку) — распределяем сумму первой части
  // пропорционально доле каждого товара в общем остатке после зачёта трейд-ина, тем же принципом округления
  const afterTradeTotal=Math.max(total-tradeTotal,0);
  let assignedUpfront=0;
  // Оформляем каждый телефон
  for(let idx=0; idx<itemsWithShare.length; idx++){
    const {p,share}=itemsWithShare[idx];
    p.sold=true;
    const sale={id:'S'+Date.now()+Math.random().toString(36).slice(2,5),point:currentUser.point||p.point,seller:currentUser.name,model:p.model+' '+p.storage,sell_price:p.sell_price,buy_price:p.buy_price,payment,created_at:new Date().toISOString(),client_name:clientName,client_phone:clientPhone,warranty_days:30,imei:p.imei,battery:p.battery,condition:p.condition,passport_id:p.id,storage:p.storage,color:p.color};
    if(tradeTotal>0 && payment!=='Смешанная') sale.doplata = p.sell_price - share;
    if(payment==='Рассрочка'){ const pct=window._cInstPercent||21; const taxBase=tradeTotal>0?(p.sell_price-share):p.sell_price; sale.inst_term=window._cInstTerm; sale.inst_total=window._cInstTotal; sale.inst_percent=pct; sale.installment_tax=Math.round(taxBase*(1+pct/100)*0.03); }
    if(payment==='Смешанная'){
      const itemAfterTrade=p.sell_price-share;
      const pct=window._cartMixedPercent||21;
      let itemUpfront=0;
      if(afterTradeTotal>0){
        itemUpfront = (idx===itemsWithShare.length-1) ? (window._cartMixedUpfrontAmount-assignedUpfront) : Math.round(itemAfterTrade/afterTradeTotal*window._cartMixedUpfrontAmount);
        assignedUpfront+=itemUpfront;
      }
      const itemInstBase=itemAfterTrade-itemUpfront;
      const itemInstTotal=Math.round(itemInstBase*(1+pct/100));
      sale.mixed_upfront_type=window._cartMixedUpfrontType;
      sale.mixed_upfront_amount=itemUpfront;
      sale.mixed_remainder=itemInstBase;
      sale.mixed_remainder_is_installment=true;
      sale.mixed_inst_percent=pct;
      sale.mixed_inst_term=window._cartMixedTerm;
      sale.mixed_inst_total=itemInstTotal;
      sale.installment_tax=Math.round(itemInstTotal*0.03);
    }
    DB.sales.push(sale);
    if(cloudMode&&sb){try{await withTimeout(sb.from('products').update({sold:true}).eq('id',p.id));await withTimeout(sb.from('sales').insert([sale]));}catch(e){}}
  }
  saveLocal();
  cart=[];updateCartFab();closeModal();
  if(cartTradeIns.length){
    window._tradeInQueue=[...(window._tradeInQueue||[]),...cartTradeIns.map(t=>({model:t.model, imei:t.imei||'', buy_price:t.value, seller_name:clientName, seller_phone:clientPhone}))];
    cartTradeIns=[];
  }
  showMultiDoc(soldItems,{clientName,clientPhone,payment,total,tradeTotal,date:new Date(),
    instTotal:window._cInstTotal, instTerm:window._cInstTerm,
    mixedUpfrontType:window._cartMixedUpfrontType, mixedUpfrontAmount:window._cartMixedUpfrontAmount,
    mixedInstTotal:window._cartMixedTotal, mixedInstTerm:window._cartMixedTerm});
  if(navigator.vibrate)navigator.vibrate([50,30,50]);
  _cartFinishing=false;
}

function showMultiDoc(items,sale){
  const start=sale.date;
  const end=new Date(start.getTime()+30*86400000);
  const fmtDate=d=>d.toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric'});
  const pt=POINTS.find(x=>x.id===currentUser.point)||POINTS[0];
  const docNum='LP-'+Date.now().toString().slice(-8);
  const pointName=pt.name.split('·')[1]?pt.name.split('·')[1].trim():pt.name;
  const tradeTotal=sale.tradeTotal||0;
  const toPay=Math.max(sale.total-tradeTotal,0);
  let payDetail=sale.payment;
  if(sale.payment==='Рассрочка')payDetail=`Рассрочка Kaspi 0-0-${sale.instTerm} · ${fmt(sale.instTotal)}`+(tradeTotal?' на остаток после зачёта':'');
  if(sale.payment==='Смешанная')payDetail=`${sale.mixedUpfrontType} ${fmt(sale.mixedUpfrontAmount)} + Рассрочка 0-0-${sale.mixedInstTerm} на остаток ${fmt(sale.mixedInstTotal)}`;
  window._multiDoc={items,sale,docNum,pointName,start:fmtDate(start),end:fmtDate(end),payDetail};
  document.getElementById('modal-body').innerHTML=`
    <div class="modal-title">✅ Продано ${items.length} телефонов</div>
    <div class="modal-sub">Единый документ на ${sale.clientName}</div>
    <div class="warranty-doc" id="warranty-doc">
      <div class="wd-header"><div class="wd-logo">La<span>Phone</span></div><div class="wd-doctype">Договор · Гарантия<br>${items.length} телефонов</div></div>
      <div style="text-align:center;font-size:11px;color:var(--gray);margin-bottom:14px;">Документ № ${docNum} · ${fmtDate(start)}</div>
      ${items.map((p,i)=>`<div style="background:var(--surface2);border-radius:10px;padding:12px;margin-bottom:8px;">
        <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${i+1}. ${p.model} ${p.storage}</div>
        <div class="wd-row"><span>IMEI</span><b style="font-size:11px;">${p.imei}</b></div>
        <div class="wd-row"><span>Батарея</span><b>${p.battery}%</b></div>
        <div class="wd-row"><span>Цена</span><b style="color:var(--accent);">${fmt(p.sell_price)}</b></div>
      </div>`).join('')}
      <div class="cart-total">
        <div style="display:flex;justify-content:space-between;"><b>Итого</b><b style="color:var(--accent);font-family:'Space Grotesk',sans-serif;">${fmt(sale.total)}</b></div>
        ${tradeTotal?`<div style="display:flex;justify-content:space-between;margin-top:6px;"><span style="color:var(--orange);">Зачёт обменных телефонов</span><b style="color:var(--orange);">−${fmt(tradeTotal)}</b></div><div style="display:flex;justify-content:space-between;margin-top:6px;"><b>К оплате</b><b style="color:var(--accent);font-family:'Space Grotesk',sans-serif;">${fmt(toPay)}</b></div>`:''}
      </div>
      <div class="wd-section">
        <div class="wd-row"><span>Оплата</span><b style="font-size:11px;max-width:60%;text-align:right;">${payDetail}</b></div>
        <div class="wd-row"><span>Покупатель</span><b>${sale.clientName}</b></div>
        <div class="wd-row"><span>Продавец</span><b>La Phone · ${pointName}</b></div>
        <div class="wd-row"><span>Гарантия</span><b>30 дней до ${fmtDate(end)}</b></div>
      </div>
      <div class="wd-footer">Документ ${docNum} · La Phone Астана<br>Спасибо за покупку! 🤝</div>
    </div>
    <div class="modal-actions"><button class="modal-btn primary" onclick="sendMultiWA()">📱 Отправить клиенту</button></div>
    <button class="modal-btn" style="width:100%;margin-top:8px;background:#3B82F620;color:var(--blue);border:1px solid var(--blue);" onclick="downloadMultiPDF()">📄 Скачать PDF</button>
    <button class="modal-btn secondary" style="width:100%;margin-top:8px;" onclick="processTradeInQueue()">${(window._tradeInQueue&&window._tradeInQueue.length) ? `Готово · принять обменные телефоны (${window._tradeInQueue.length})` : 'Готово'}</button>`;
  document.getElementById('modal').classList.add('open');
}

function sendMultiWA(){
  const d=window._multiDoc;if(!d)return;
  const text=`🛡 *LA PHONE — ДОГОВОР И ГАРАНТИЯ*\nДокумент № ${d.docNum}\n━━━━━━━━━━━━━━━━━━━\n\n*${d.items.length} ТЕЛЕФОНОВ:*\n${d.items.map((p,i)=>`${i+1}. ${p.model} ${p.storage}\n   IMEI: ${p.imei}\n   Батарея: ${p.battery}% · ${fmt(p.sell_price)}`).join('\n\n')}\n\n━━━━━━━━━━━━━━━━━━━\n*Итого: ${fmt(d.sale.total)}*\nОплата: ${d.payDetail||d.sale.payment}\nПокупатель: ${d.sale.clientName}\nПродавец: La Phone · ${d.pointName}\n\n🛡 Гарантия 30 дней до ${d.end}\n\nLa Phone · Астана\nСпасибо за покупку! 🤝`;
  const phone=d.sale.clientPhone.replace(/\D/g,'');
  const url=phone?`https://wa.me/${phone}?text=${encodeURIComponent(text)}`:`https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url,'_blank');
  showToast('📱 Отправляю клиенту...');
}

