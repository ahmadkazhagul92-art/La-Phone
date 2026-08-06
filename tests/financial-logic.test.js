// Регрессионные тесты финансовой логики La Phone.
//
// Как это работает: реальные src/utils.js и src/cart.js — это классические
// <script>-файлы (без module.exports), которые в браузере делят один
// global scope с остальными модулями. Чтобы тестировать РЕАЛЬНЫЙ код (а не
// его пересказ), мы грузим оба файла как есть через vm.runInContext в
// песочницу с минимальными DOM/DB-заглушками и дальше дёргаем реальные
// функции (addToCart, saveCartTradeIn, cartInstallment, cartFinish и т.д.) —
// ровно те же вызовы, что делает браузер по кликам. Если кто-то сломает
// формулу в cart.js или utils.js, эти тесты упадут.
//
// Запуск: node --test tests/financial-logic.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// В этом репозитории (GitHub) файлы приложения лежат в корне, без папки src/ —
// в отличие от рабочей копии на локальной машине, где они лежат в src/.
const UTILS_SRC = fs.readFileSync(path.join(__dirname, '..', 'utils.js'), 'utf8');
const CART_SRC = fs.readFileSync(path.join(__dirname, '..', 'cart.js'), 'utf8');

// document-заглушка: у каждого id — один и тот же объект при повторном
// getElementById (нужно, чтобы можно было заранее выставить .value поля
// формы и чтобы код внутри cart.js прочитал именно его — так же, как в
// реальном DOM).
function makeDocumentStub() {
  const registry = new Map();
  function el() {
    return {
      value: '', textContent: '', innerHTML: '', className: '',
      style: {},
      classList: { add(){}, remove(){}, contains(){ return false; }, toggle(){} },
      remove(){},
    };
  }
  return {
    getElementById(id) {
      if (!registry.has(id)) registry.set(id, el());
      return registry.get(id);
    },
    querySelectorAll() { return []; },
  };
}

// Создаёт свежую песочницу с загруженными utils.js + cart.js.
// Свежий контекст на каждый тест — чтобы состояние (cart, cartTradeIns,
// guard-флаги) одного теста не протекало в другой.
function createCartSandbox() {
  const sandbox = {
    console,
    setTimeout,
    navigator: {},
    document: makeDocumentStub(),
    cloudMode: false,
    sb: null,
    DB: { products: [], sales: [] },
    currentUser: { point: 'p1', name: 'ТЕСТ ПРОДАВЕЦ', role: 'seller' },
    POINTS: [{ id: 'p1', name: 'Точка 1 · Тест', seller: 'ТЕСТ ПРОДАВЕЦ', cls: 'p1', target: 0, owner: 'me' }],
    saveLocal() {},
  };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  new vm.Script(UTILS_SRC, { filename: 'utils.js' }).runInContext(ctx);
  new vm.Script(CART_SRC, { filename: 'cart.js' }).runInContext(ctx);
  return ctx;
}

function addTestProduct(ctx, product) {
  ctx.DB.products.push(product);
}

function fillTradeInForm(ctx, { model, imei = '', value }) {
  ctx.addCartTradeInForm();
  ctx.document.getElementById('cti-model').value = model;
  ctx.document.getElementById('cti-imei').value = imei;
  ctx.document.getElementById('cti-value').value = String(value);
  ctx.saveCartTradeIn();
}

test('Рассрочка на остаток после трейд-ина: 500000 - 300000 = 200000, +21% = 242000, налог 3% = 7260', async () => {
  const ctx = createCartSandbox();
  addTestProduct(ctx, {
    id: 'p-test-1', model: 'Test Phone', storage: '256GB',
    sell_price: 500000, buy_price: 300000, imei: '000000000000001',
    battery: 90, condition: 'Отличное', point: 'p1', color: 'Black',
    isNew: false, sold: false,
  });
  ctx.addToCart('p-test-1');
  fillTradeInForm(ctx, { model: 'Старый телефон', value: 300000 });

  // Экран калькулятора рассрочки — та же функция, что рисует реальный UI
  ctx.cartInstallment();
  assert.equal(ctx._cInstTotal, 242000, 'renderCartInstallment должен посчитать 200000*1.21=242000');

  await ctx.cartFinish('Рассрочка');

  assert.equal(ctx.DB.sales.length, 1);
  const sale = ctx.DB.sales[0];
  assert.equal(sale.doplata, 200000, 'остаток после зачёта трейд-ина');
  assert.equal(sale.inst_total, 242000, 'сумма в рассрочку с накруткой банка');
  assert.equal(sale.installment_tax, 7260, 'налог 3% с базы рассрочки (не с полной цены телефона)');

  // Кросс-проверка: те же цифры должны получаться и через utils.js —
  // независимая формула, которой пользуются отчёты в admin.js/Финансы.
  assert.equal(ctx.isInstallmentTaxable(sale), true);
  assert.equal(ctx.getInstallmentBase(sale), 200000);
  assert.equal(ctx.getInstallmentWithMarkup(sale), 242000);
  assert.equal(Math.round(ctx.getInstallmentWithMarkup(sale) * 0.03), 7260);
});

test('Смешанная оплата в корзине: 2 товара, трейд-ин 150000, upfront 100000 — доли upfront=100000, instBase=250000', async () => {
  const ctx = createCartSandbox();
  addTestProduct(ctx, {
    id: 'p-test-2a', model: 'Test Phone A', storage: '128GB',
    sell_price: 300000, buy_price: 200000, imei: '000000000000002',
    battery: 92, condition: 'Отличное', point: 'p1', color: 'Black',
    isNew: false, sold: false,
  });
  addTestProduct(ctx, {
    id: 'p-test-2b', model: 'Test Phone B', storage: '256GB',
    sell_price: 200000, buy_price: 120000, imei: '000000000000003',
    battery: 88, condition: 'Отличное', point: 'p1', color: 'White',
    isNew: false, sold: false,
  });
  ctx.addToCart('p-test-2a');
  ctx.addToCart('p-test-2b');
  fillTradeInForm(ctx, { model: 'Старый телефон', value: 150000 });

  const total = 500000;
  const tradeTotal = 150000;
  const afterTrade = total - tradeTotal; // 350000

  // Тот же путь, что реальный UI: форма "часть сразу" -> ввод суммы ->
  // "дальше" -> экран рассрочки на остаток.
  ctx.cartMixedPaymentForm();
  ctx.document.getElementById('cmx-upfront').value = '100000';
  ctx.calcCartMixedRemainder(afterTrade);
  assert.equal(ctx._cartMixedUpfrontAmount, 100000);

  ctx.cartMixedContinueToInstallment(afterTrade);
  assert.equal(ctx._cartMixedRemainder, 250000, 'остаток после первой части: 350000-100000');

  ctx.renderCartMixedInstallment();

  await ctx.cartFinish('Смешанная');

  assert.equal(ctx.DB.sales.length, 2);
  const [saleA, saleB] = ctx.DB.sales;

  const upfrontSum = saleA.mixed_upfront_amount + saleB.mixed_upfront_amount;
  const instBaseSum = saleA.mixed_remainder + saleB.mixed_remainder;

  assert.equal(upfrontSum, 100000, 'сумма долей первой части по товарам должна точно равняться введённой сумме');
  assert.equal(instBaseSum, 250000, 'сумма долей остатка в рассрочку должна точно равняться 350000-100000');

  // Точные доли по каждому товару (пропорционально его цене в корзине)
  assert.equal(saleA.mixed_upfront_amount, 60000, 'товар A (300000 из 500000 после вычета трейд-ина = 210000 из 350000)');
  assert.equal(saleA.mixed_remainder, 150000);
  assert.equal(saleB.mixed_upfront_amount, 40000, 'товар B — последний, забирает остаток округления доли upfront');
  assert.equal(saleB.mixed_remainder, 100000, 'товар B — последний, забирает остаток округления доли трейд-ина/базы рассрочки');

  // doplata для "Смешанная" не ставится (это поле только для чистого Трейд-ина/Рассрочки, см. cartFinish)
  assert.equal(saleA.doplata, undefined);
  assert.equal(saleB.doplata, undefined);

  // Ни тенге не должно потеряться или задвоиться при округлении долей:
  // upfront + instBase каждого товара должен точно равняться его цене минус доля трейд-ина
  assert.equal(saleA.mixed_upfront_amount + saleA.mixed_remainder, 300000 - 90000);
  assert.equal(saleB.mixed_upfront_amount + saleB.mixed_remainder, 200000 - 60000);
});
