import { DAY_MS } from './clock.mjs?v=0.15.3';

export const NOTICE_TYPES = Object.freeze({
  purchase:'Motosiklet alımı',sale:'Motosiklet satışı',inspection:'Ekspertiz tamamlandı',repair:'Tamir tamamlandı',
  delivery:'Nakliye tamamlandı',training:'Personel eğitimi tamamlandı',automation:'Otomasyon uyarısı',complaint:'Müşteri şikâyeti',
});
export const MAX_NOTICES = 200;
export const SALE_TOAST_MS = 8000;

export function inbox(state) {
  return state.inbox ?? {sequence:0,items:[],muted:{},sound:false};
}

export function notify(state,type,time,fields) {
  const box = state.inbox ??= inbox(state);
  if (box.muted[type]) return;
  box.items.unshift({id:++box.sequence,type,time,...fields});
  if (box.items.length>MAX_NOTICES) box.items.pop();
}

export function notificationAction(state,action,id,value) {
  const box = state.inbox ??= inbox(state);
  switch (action) {
    case 'notice-read': {
      const item = box.items.find(row=>row.id===id);
      if (item) item.read = true;
      break;
    }
    case 'notices-read-all':
      for (const item of box.items) if (!id || item.type===id) item.read = true;
      break;
    case 'notices-clear':
      box.items = id ? box.items.filter(item=>item.type!==id) : [];
      break;
    case 'notice-type':
      if (!Object.prototype.hasOwnProperty.call(NOTICE_TYPES,id) || typeof value!=='boolean') throw new Error('Geçersiz bildirim ayarı.');
      box.muted[id] = !value;
      break;
    case 'notice-sound':
      if (typeof value!=='boolean') throw new Error('Geçersiz ses ayarı.');
      box.sound = value;
      break;
  }
}

export function noticeTime(time) {
  const minute = Math.floor((time%DAY_MS)*1440/DAY_MS);
  const pad = part=>String(part).padStart(2,'0');
  return `Gün ${Math.floor(time/DAY_MS)+1} · ${pad(Math.floor(minute/60))}:${pad(minute%60)}`;
}

export function saleSnapshot(bike,price,worker) {
  const money = value=>Math.round(value*100)/100;
  const profit = money(price-bike.spent);
  return {
    bike:{name:bike.name,year:bike.year,color:bike.color,paintAccent:bike.paintAccent},
    worker:worker?.name ?? 'Oyuncu · Manuel satış',
    price,total:bike.spent,profit,roi:bike.spent>0 ? profit/bike.spent : null,
    costs:bike.noticeCosts ?? null,
  };
}

export function appendBikeCost(bike,key,amount) {
  if (!bike.noticeCosts) return;
  bike.noticeCosts[key] = Math.round((bike.noticeCosts[key]+amount)*100)/100;
}
