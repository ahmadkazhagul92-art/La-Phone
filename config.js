// ============================================================
//  LA PHONE · ПОЛНОЦЕННОЕ ПРИЛОЖЕНИЕ С ОБЛАКОМ
// ============================================================
//
//  ⚙️ НАСТРОЙКА ОБЛАКА (Supabase) — 10 минут:
//  1. Зайди на supabase.com → создай бесплатный проект
//  2. Создай таблицы products и sales (инструкция в чате)
//  3. Вставь сюда свои ключи ↓
//
const SUPABASE_URL = 'https://zafnvzhnrxjggpbmcpdb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphZm52emhucnhqZ2dwYm1jcGRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MTc4MzAsImV4cCI6MjA5ODI5MzgzMH0.KADWU3gkOL-4fYYQee0fgbAce7a4N2ClOx9RoWkU-Wc';
//
//  Пока ключи пустые — работает локально на этом устройстве.
//  Как вставишь ключи — автоматически синхронизируется
//  между ВСЕМИ телефонами в реальном времени.
// ============================================================

// ПОЛЬЗОВАТЕЛИ (в реальном приложении — в облаке с хешами паролей)
const DEFAULT_USERS = {
  owner:   {role:'admin', name:'Артём', point:null},
  daniyar: {role:'seller', name:'Бутик 2', point:'p1'},
  aigerim: {role:'seller', name:'Бутик 24', point:'p2'},
  erlan:   {role:'seller', name:'Бутик 80', point:'p3'},
};
// Почта для входа в Supabase Auth — привязана к логину, не обязательно настоящая
const AUTH_EMAILS = {
  owner:'owner@laphone.local',
  daniyar:'butik2@laphone.local',
  aigerim:'butik24@laphone.local',
  erlan:'butik80@laphone.local',
};
const DEFAULT_POINTS = [
  {id:'p1', name:'Точка 1 · Сотовый Мир', seller:'Бутик 2', cls:'p1', target:500000, owner:'me'},
  {id:'p2', name:'Точка 2 · Вход', seller:'Бутик 24', cls:'p2', target:450000, owner:'me'},
  {id:'p3', name:'Точка 3 · Bay Bars', seller:'Бутик 80', cls:'p3', target:400000, owner:'me'},
];

// Загружаем настройки из памяти (имена и пароли можно менять)
let USERS = JSON.parse(localStorage.getItem('lp_users')||'null') || JSON.parse(JSON.stringify(DEFAULT_USERS));
let POINTS = JSON.parse(localStorage.getItem('lp_points')||'null') || JSON.parse(JSON.stringify(DEFAULT_POINTS));
let tabToken = 0; // защита от гонки: старая вкладка не должна перерисовать новую
