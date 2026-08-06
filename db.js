function saveSettings(){
  localStorage.setItem('lp_users',JSON.stringify(USERS));
  localStorage.setItem('lp_points',JSON.stringify(POINTS));
  if(cloudMode && sb){
    sb.from('settings').upsert({id:'main', users:USERS, points:POINTS}).then(()=>{}).catch(()=>{});
  }
}

async function loadSettingsFromCloud(){
  if(!cloudMode || !sb) return;
  try{
    const {data} = await sb.from('settings').select('*').eq('id','main').maybeSingle();
    if(data){
      if(data.users) USERS = data.users;
      if(data.points) POINTS = data.points;
      localStorage.setItem('lp_users',JSON.stringify(USERS));
      localStorage.setItem('lp_points',JSON.stringify(POINTS));
    } else {
      // Таблица пустая или нет записи — сохраняем дефолтные настройки
      await sb.from('settings').upsert({id:'main', users:USERS, points:POINTS});
    }
  }catch(e){
    // Таблица settings ещё не создана — это нормально при первом запуске
    console.log('settings not ready yet:', e.message);
  }
}
let sb = null; window._sb = null;
let cloudMode = false;
let DB = {products:[], sales:[]};
// ==================== ОБЛАКО ====================
async function initCloud(){
  if(SUPABASE_URL && SUPABASE_KEY && window.supabase){
    try{
      sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY); window._sb = sb;
      cloudMode = true;
      showCloud('online','☁️ Облако подключено');
      return true;
    }catch(e){
      cloudMode = false;
      showCloud('offline','📴 Работа локально');
      return false;
    }
  }
  cloudMode = false;
  return false;
}

function showCloud(type, msg){
  const el = document.getElementById('cloud-status');
  el.className = 'cloud-status show '+type;
  el.textContent = msg;
  setTimeout(()=>el.classList.remove('show'), 3000);
}

function loadDBSync(){
  // Всегда работает мгновенно — берёт из localStorage или дефолтные
  DB.products = JSON.parse(localStorage.getItem('lp_products')||'null') || defaultProducts();
  DB.sales = JSON.parse(localStorage.getItem('lp_sales')||'null') || defaultSales();
  saveLocal();
  // Если облако подключено — подтянем свежие данные в фоне
  if(cloudMode && sb){ loadFromCloud(); }
}

function withTimeout(promise, ms=5000){
  return Promise.race([promise, new Promise((_,reject)=>setTimeout(()=>reject(new Error('timeout '+ms+'ms')),ms))]);
}

async function loadFromCloud(){
  try{
    await Promise.race([
      (async()=>{
        const {data:products} = await sb.from('products').select('*');
        const {data:sales} = await sb.from('sales').select('*');
        if(products){
          // Защита от гонки: если товар добавлен только что (последние 2 минуты)
          // и облако ещё не успело его вернуть (задержка сети/кэша) — не стираем
          // его с экрана, ждём следующего обновления, пока данные точно долетят
          const cloudIds = new Set(products.map(p=>p.id));
          const RECENT_MS = 2*60*1000;
          const now = Date.now();
          const localOnly = DB.products.filter(p=>{
            if(cloudIds.has(p.id)) return false;
            const created = new Date(p.created_at||0).getTime();
            return (now-created) < RECENT_MS;
          });
          DB.products = [...products, ...localOnly];
        }
        if(sales){ DB.sales = sales; }
        await loadSettingsFromCloud();
      })(),
      new Promise((_,reject)=>setTimeout(()=>reject(new Error('cloud timeout 6s')),6000))
    ]);
  }catch(e){ console.log('cloud load error',e); showToast('⚠️ Облако не ответило — показаны сохранённые данные',true); }
}

function defaultProducts(){ return []; }
function defaultSales(){ return []; }


function saveLocal(){
  try{
    localStorage.setItem('lp_products',JSON.stringify(DB.products));
    localStorage.setItem('lp_sales',JSON.stringify(DB.sales));
  }catch(e){
    // Переполнение — чистим и сохраняем только продажи
    try{localStorage.setItem('lp_sales',JSON.stringify(DB.sales));}catch(_){}
    if(typeof showToast==='function')showToast('⚠️ Память заполнена — подключи облако',true);
  }
}
