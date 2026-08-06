function fmt(n){return (n||0).toLocaleString('ru-RU')+' ₸';}

// Разбивает сумму продажи по факту оплаты (нал/Kaspi/рассрочка) — учитывает Смешанную оплату
// Если у продажи есть doplata (частичный трейд-ин, в т.ч. из корзины) — реальные деньги считаются по doplata, а не по полной sell_price
function splitSaleByMethod(sale){
  const cashAmt = sale.doplata!=null ? sale.doplata : sale.sell_price;
  if(sale.payment==='Наличные') return {cash:cashAmt, kaspi:0, inst:0};
  if(sale.payment==='Kaspi') return {cash:0, kaspi:cashAmt, inst:0};
  if(sale.payment==='Рассрочка') return {cash:0, kaspi:0, inst:cashAmt};
  if(sale.payment==='Смешанная'){
    const r={cash:0,kaspi:0,inst:0};
    if(sale.mixed_upfront_type==='Наличные') r.cash+=(sale.mixed_upfront_amount||0);
    else r.kaspi+=(sale.mixed_upfront_amount||0);
    if(sale.mixed_remainder_is_installment) r.inst+=(sale.mixed_remainder||0);
    else if(sale.mixed_remainder_type==='Наличные') r.cash+=(sale.mixed_remainder||0);
    else r.kaspi+=(sale.mixed_remainder||0);
    return r;
  }
  if(sale.payment==='Трейд-ин') return {cash:cashAmt, kaspi:0, inst:0};
  // Прочее (на всякий случай, если появится новый тип оплаты) — считаем как наличные
  return {cash:cashAmt, kaspi:0, inst:0};
}
// Является ли продажа хоть частично "в рассрочку" — для налога 3%
function isInstallmentTaxable(sale){
  return sale.payment==='Рассрочка' || (sale.payment==='Смешанная' && sale.mixed_remainder_is_installment);
}
// Сумма, которая реально пошла в рассрочку (для Смешанной — только остаток, не вся цена телефона)
function getInstallmentBase(sale){
  if(sale.payment==='Рассрочка') return sale.doplata!=null ? sale.doplata : sale.sell_price;
  if(sale.payment==='Смешанная' && sale.mixed_remainder_is_installment) return sale.mixed_remainder||0;
  return 0;
}
// Сумма с накруткой банка (база для налога)
function getInstallmentWithMarkup(sale){
  if(sale.payment==='Рассрочка') return Math.round(getInstallmentBase(sale)*(1+(sale.inst_percent||21)/100));
  if(sale.payment==='Смешанная' && sale.mixed_remainder_is_installment) return sale.mixed_inst_total||Math.round((sale.mixed_remainder||0)*1.21);
  return 0;
}
function isToday(dateStr){
  const d=new Date(dateStr),now=new Date();
  return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth() && d.getDate()===now.getDate();
}
function isThisMonth(dateStr){
  const d=new Date(dateStr),now=new Date();
  return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth();
}
function currentHalfYearRange(){
  const now=new Date();
  const startMonth = now.getMonth()<6 ? 0 : 6;
  const start=new Date(now.getFullYear(),startMonth,1);
  const end=new Date(now.getFullYear(),startMonth+6,1);
  const label = startMonth===0 ? `1 полугодие ${now.getFullYear()}` : `2 полугодие ${now.getFullYear()}`;
  return {start,end,label};
}
function inRange(dateStr,start,end){
  const d=new Date(dateStr);
  return d>=start && d<end;
}

// ==================== UTILS ====================
function closeModal(e){
  if(e && e.target.classList.contains('modal-overlay') && window._tradeInQueue && window._tradeInQueue.length){
    showToast('⚠️ Сначала прими обменный телефон — заполни форму до конца',true);
    return;
  }
  if(!e||e.target.classList.contains('modal-overlay'))document.getElementById('modal').classList.remove('open');
}
function showToast(msg,err){const t=document.getElementById('toast');t.textContent=msg;t.className='toast show'+(err?' error':'');setTimeout(()=>t.classList.remove('show'),2500);}
