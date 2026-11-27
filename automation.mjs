import { modelOf } from './bikes.mjs?v=0.15.4';
import { availableStaff, firstWorkshopJob, hasManager, workshopRate } from './business.mjs?v=0.15.4';
import { DAY_MS, gameTime } from './clock.mjs?v=0.15.4';
import { isYusufListing } from './easter-eggs.mjs?v=0.15.4';
import { visibleListing } from './risk.mjs?v=0.15.4';

export const AUTO_STEPS = {
  buy:'Alım',inspect:'Ekspertiz',repair:'Tamir',list:'İlan açma',negotiate:'Müşteri görüşmesi',sell:'Satış',
};

export const stepEnabled = (config,step)=>Boolean(step==='list' ? (config?.list ?? config?.sell) : config?.[step]);
export const staffQuality = worker => (worker.skill+worker.quality+Math.min(100,worker.experience*10))/300;

export function bestStaff(branch,role) {
  return availableStaff(branch).filter(person=>person.role===role).sort((a,b)=>staffQuality(b)-staffQuality(a))[0];
}

export function rankMarket(listings,config,forecast,inspector,manager) {
  const candidates = [];
  const rejected = [];
  for (const item of listings) {
    const model = modelOf(item);
    const reject = reason=>rejected.push({id:item.id,name:item.name,reason});
    if (isYusufListing(item)) reject('Özel ilan');
    else if (item.seller || item.inspections?.length) reject('Oyuncunun açık işlemi var');
    else if (!model || config.brand && model.brand!==config.brand || model.cc<config.minCc || model.cc>config.maxCc) reject('Marka veya motor hacmi tercihi');
    else if (item.price>config.maxPrice) reject('Alış fiyatı sınırı');
    else {
      const known = visibleListing(item);
      if ((known.faults.length || known.damageHistory?.length) && !config.repair) {
        reject('Hasarlı stok için otomatik tamir kapalı');
        continue;
      }
      const estimate = forecast(item);
      const total = estimate.total-(inspector ? estimate.intakeFee : 0);
      const profit = estimate.profit+(inspector ? estimate.intakeFee : 0);
      if (profit<config.minProfit) {
        reject('Tahmini kâr alt sınırı');
        continue;
      }
      const roi = profit/Math.max(1,total);
      const demand = (model.demand ?? .08)*100;
      const costs = estimate.cost+estimate.delivery.fee;
      const experience = manager ? staffQuality(manager) : .5;
      const score = profit/1000 + roi*(60+40*experience) + demand + known.condition*.15 - costs/2000;
      candidates.push({item,total,profit,roi,score});
    }
  }
  candidates.sort((a,b)=>b.score-a.score || b.profit-a.profit || a.item.id.localeCompare(b.item.id));
  return {candidates,rejected};
}

export function shopStatus(branch,state) {
  if (!Object.keys(AUTO_STEPS).some(step=>stepEnabled(branch.automation,step))) return 'Otomasyon kapalı';
  if (!hasManager(branch)) return 'Görevde müdür yok';
  if (state.clock?.paused) return 'Oyun duraklatıldı';
  return branch.autoReport?.status ?? 'İlk otomatik işlem bekleniyor';
}

export function nextOfficeAction(branch,state) {
  if (!hasManager(branch) || state.clock?.paused || !Object.keys(AUTO_STEPS).some(step=>stepEnabled(branch.automation,step))) return null;
  const now = gameTime(state.day,state.clock?.offset);
  const deadlines = [gameTime(state.day+1)];
  for (const bike of branch.garage) if (bike.stage==='shipping' && !bike.autoPaused) deadlines.push(bike.shipping.arrivalMs ?? gameTime(bike.shipping.arrivalDay));
  for (const kind of ['internalInspection','internalRepair']) {
    const job = firstWorkshopJob(branch,kind);
    const rate = workshopRate(branch,kind);
    if (job && rate) deadlines.push(now+Math.ceil(job.internalJob.remaining/rate));
  }
  return Math.max(0,Math.min(...deadlines)-now);
}

export function workerAssignment(branch,person) {
  if (person.travel || person.training) return person.travel ? 'Transferde' : 'Eğitimde';
  const job = person.role==='inspector' ? firstWorkshopJob(branch,'internalInspection')
    : ['master','technician','apprentice'].includes(person.role) ? firstWorkshopJob(branch,'internalRepair') : null;
  if (job && workshopRate(branch,job.stage)) return job.name+' · '+(job.stage==='internalInspection' ? 'Ekspertiz' : 'Tamir');
  if (person.role==='manager' && Object.keys(AUTO_STEPS).some(step=>stepEnabled(branch.automation,step))) return 'Otomasyon yönetimi';
  const last = branch.autoReport?.history.find(entry=>entry.worker===person.name);
  return last ? `Son görev: ${AUTO_STEPS[last.step]} · ${last.name}` : 'Görev bekliyor';
}

export function gameDuration(ms) {
  if (ms===null) return '—';
  const hours = Math.ceil(ms/(DAY_MS/24));
  return hours>=24 ? `${Math.floor(hours/24)} gün ${hours%24} sa.` : `${hours} sa.`;
}
