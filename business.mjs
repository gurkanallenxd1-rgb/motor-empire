import { stableNumber } from './characters.mjs?v=0.18.4';
import { DAY_MS,HOUR_MS } from './clock.mjs?v=0.16.1';
import { ISTANBUL, provinceOf } from './provinces.mjs?v=0.16.1';

export const BRANCH_TIERS = Object.freeze([
  {name:'Küçük',capacity:2,cost:250000},{name:'Orta',capacity:5,cost:750000},
  {name:'Büyük',capacity:10,cost:1750000},{name:'Premium',capacity:20,cost:4000000},
  {name:'Satış merkezi',capacity:40,cost:10000000},
]);
export const STAFF_ROLES = Object.freeze({
  apprentice:{name:'Çırak',wage:350},technician:{name:'Teknisyen',wage:600},master:{name:'Usta',wage:1000},
  sales:{name:'Satış danışmanı',wage:500},inspector:{name:'Ekspertiz uzmanı',wage:800},manager:{name:'Müdür',wage:1250},
});
export const TRAINING_COST = 1500;
export const TRAINING_TIME = DAY_MS;
export const branchProvince = branch=>branch?.province ?? ISTANBUL;
export const workers = branch=>branch.workers ?? [];
export const staffCount = branch=>branch.staff+workers(branch).length;
export const availableStaff = branch=>workers(branch).filter(worker=>!worker.travel && !worker.training);
export const hasManager = branch=>availableStaff(branch).some(worker=>worker.role==='manager');

export function makeEmployee(id,role) {
  const seed = stableNumber(id);
  const names = ['Deniz','Selin','Bora','Ece','Mert','Aylin','Emir','İpek'];
  return {id,role,name:`${names[seed%names.length]} · ${id.slice(1)}`,experience:seed%9,skill:45+seed%40,
    motivation:65+(seed>>>8)%30,speed:65+(seed>>>12)%35,quality:55+(seed>>>17)%40};
}

export function upgradeOption(branch,legacyCapacity,legacyInvestment) {
  const tier = branch.tier===undefined
    ? BRANCH_TIERS.findIndex(item=>item.capacity>legacyCapacity) : branch.tier+1;
  const next = BRANCH_TIERS[tier];
  if (!next) return null;
  return {...next,tier,increase:next.cost-(branch.tier===undefined ? legacyInvestment : BRANCH_TIERS[branch.tier].cost)};
}

export function validAutomation(config) {
  return config && typeof config.buy==='boolean' && typeof config.sell==='boolean'
    && ['inspect','repair','list','negotiate'].every(key=>config[key]===undefined || typeof config[key]==='boolean')
    && (config.reserve===undefined || Number.isSafeInteger(config.reserve) && config.reserve>=0 && config.reserve<=100000000)
    && ['maxPrice','minProfit','budget'].every(key=>Number.isSafeInteger(config[key]) && config[key]>=0 && config[key]<=100000000)
    && typeof config.brand==='string' && config.brand.length<=35
    && Number.isInteger(config.minCc) && Number.isInteger(config.maxCc) && config.minCc>=0
    && config.maxCc>=config.minCc && config.maxCc<=3000;
}

export function workshopRate(branch,kind) {
  const staff = availableStaff(branch);
  const roles = kind==='internalInspection' ? ['inspector'] : ['master','technician','apprentice'];
  if (kind==='internalRepair' && !staff.some(worker=>worker.role==='master')) return 0;
  return staff.filter(worker=>roles.includes(worker.role)).reduce((sum,worker)=>
    sum+Math.round((worker.speed+worker.skill+worker.motivation+Math.min(100,65+worker.experience*3))/4*(worker.role==='apprentice' ? .45 : 1)),0);
}

export function createOffice(id,province,tier) {
  return {id,name:`${provinceOf(province).name} Şubesi ${id}`,province,tier,level:1,staff:0,workers:[],garage:[]};
}

export function firstWorkshopJob(branch,kind) {
  return branch.garage.filter(item=>item.stage===kind).sort((a,b)=>a.internalJob.order-b.internalJob.order)[0];
}

export const jobWork = hours=>hours*HOUR_MS*100;
