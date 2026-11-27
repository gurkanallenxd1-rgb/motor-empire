// Restoration costs are gameplay data in TL. The loss remains after a working repair.
const issue = (name,kind,cost,hours,gain,grade,loss=0,group) =>
  Object.freeze({name,kind,cost,hours,gain,grade,loss,group});

export const PARTS = Object.freeze({
  yag: issue('Yağ ve filtre','maintenance',980,1,2,'neglected'),
  fren: issue('Fren balataları','maintenance',2100,3,4,'neglected'),
  zincir: issue('Zincir ve dişli seti','maintenance',1650,2,5,'neglected'),
  lastik: issue('Lastik takımı','maintenance',5800,3,6,'neglected'),
  akü: issue('Akü','maintenance',1850,1,3,'neglected'),
  debriyaj: issue('Debriyaj seti','maintenance',4350,5,7,'neglected'),
  grenaj: issue('Çizik veya kırık grenaj','accident',2400,3,5,'light',.025),
  manet: issue('Kırık manet','accident',780,1,2,'light',.006),
  ayna: issue('Kırık ayna','accident',1050,1,2,'light',.007),
  sinyal: issue('Kırık sinyal','accident',900,1,2,'light',.008),
  ayaklik: issue('Kırık ayaklık','accident',1250,2,3,'light',.011),
  depo: issue('Depo göçüğü','accident',5200,4,8,'moderate',.065),
  jant: issue('Eğilmiş jant','accident',6200,5,10,'moderate',.055),
  masa: issue('Eğilmiş ön maşa','accident',9800,8,15,'moderate',.095),
  radyator: issue('Radyatör hasarı','accident',6900,6,11,'moderate',.05),
  saseIslem: issue('Şase işlemli','accident',13400,11,22,'heavy',.19,'structure'),
  saseDegisim: issue('Şase değişmiş','accident',21600,18,32,'heavy',.28,'structure'),
  motor: issue('Motor bloğu hasarı','mechanical',15400,12,24,'heavy',.18),
  sanziman: issue('Şanzıman arızası','mechanical',11200,10,18,'moderate',.12),
  agir: issue('Ağır hasar onarımı','accident',19800,16,34,'heavy',.32,'structure'),
  pert: issue('Pert geçmişli araç restorasyonu','accident',27500,24,45,'totaled',.50,'structure'),
});

export const ISSUE_KIND_LABELS = Object.freeze({
  maintenance:'Bakım eksikleri', mechanical:'Mekanik arızalar', accident:'Kaza ve yapısal hasar',
});

export const DAMAGE_DISCOUNTS = Object.freeze({
  clean:Object.freeze([0,0]), neglected:Object.freeze([.05,.20]), light:Object.freeze([.10,.25]),
  moderate:Object.freeze([.20,.40]), heavy:Object.freeze([.40,.60]), totaled:Object.freeze([.50,.75]),
});

export const GRADE_LABELS = Object.freeze({
  clean:'Temiz', neglected:'Bakımsız', light:'Hafif hasarlı', moderate:'Orta hasarlı',
  heavy:'Ağır hasarlı', totaled:'Pert geçmişli',
});

export const SELLER_URGENCY = Object.freeze({
  urgent:Object.freeze({label:'Acil',range:[.69,.84]}),
  normal:Object.freeze({label:'Normal',range:[.87,1.03]}),
  patient:Object.freeze({label:'Acele etmiyor',range:[1.01,1.12]}),
});

const ranks = Object.keys(DAMAGE_DISCOUNTS);
const clamp = (n,min,max) => Math.min(max,Math.max(min,n));
const roundMoney = n => Math.round(n * 100) / 100;
export const knownPart = code => Object.prototype.hasOwnProperty.call(PARTS,code);
export const activeIssues = bike => [...new Set(bike.faults ?? [])].filter(knownPart);
export const historicalIssues = bike => [...new Set([...(bike.damageHistory ?? []),...activeIssues(bike)])]
  .filter(code=>knownPart(code) && PARTS[code].kind !== 'maintenance');

function highestGrade(codes) {
  return ranks[Math.max(0,...codes.map(code=>ranks.indexOf(PARTS[code].grade)))];
}

export function damageGrade(bike) {
  const faults = activeIssues(bike);
  const history = historicalIssues(bike);
  const grade = highestGrade([...faults,...history]);
  return grade === 'clean' && (bike.condition ?? 100) < 86 ? 'neglected' : grade;
}

export function repairPartCost(bike,code) {
  return Math.round(PARTS[code].cost * (bike.serviceFactor ?? 1) * (bike.marketTerms?.parts ?? 1));
}

export function repairQuote(bike) {
  return activeIssues(bike).reduce((total,code)=>({
    cost:total.cost + repairPartCost(bike,code),
    hours:total.hours + PARTS[code].hours,
  }),{cost:0,hours:0});
}

// Legacy value already includes model year and odometer. New cleanBase is year-adjusted only.
export function cleanValue(bike) {
  if (bike.cleanBase === undefined) return Math.round(bike.value);
  return Math.round(bike.cleanBase * (bike.marketTerms?.value ?? 1) * (1 - clamp(bike.km / 500000,0,.42)));
}

export function permanentDiscount(bike) {
  const groups = new Map();
  for (const code of historicalIssues(bike)) {
    const {loss,group=code} = PARTS[code];
    const records = bike.damageRecords?.filter(record=>record.codes.includes(code));
    const factor = records?.length ? Math.max(...records.map(record=>record.lossFactor ?? 1)) : 1;
    groups.set(group,Math.max(groups.get(group) ?? 0,loss*factor));
  }
  return 1 - [...groups.values()].reduce((factor,loss)=>factor * (1 - loss),1);
}

export function conditionBreakdown(bike) {
  const groups = {visual:0,mechanical:0,structural:0};
  const structural = new Set(['masa','jant','saseIslem','saseDegisim','agir','pert']);
  const visual = new Set(['grenaj','manet','ayna','sinyal','ayaklik','depo']);
  for (const code of activeIssues(bike)) {
    const group = structural.has(code) ? 'structural' : visual.has(code) ? 'visual' : 'mechanical';
    groups[group] += PARTS[code].gain;
  }
  const base = Math.min(100,(bike.condition ?? 100)+groups.visual+groups.mechanical+groups.structural);
  const residual = historicalIssues(bike).filter(code=>structural.has(code) && !bike.faults.includes(code))
    .reduce((max,code)=>Math.max(max,PARTS[code].loss*100),0);
  return {visual:clamp(base-groups.visual+(bike.cosmeticPresentation ? 12 : 0),0,100),
    mechanical:clamp(base-groups.mechanical,0,100),structural:clamp(Math.round(base-groups.structural-residual),0,100)};
}

export function roadValue(bike) {
  const faults = activeIssues(bike);
  const grade = highestGrade(faults);
  const [low,high] = DAMAGE_DISCOUNTS[grade];
  const gain = faults.reduce((total,code)=>total + PARTS[code].gain,0);
  const activeDiscount = low + (high-low)*clamp(gain/50,0,1);
  const wear = 1 - (bike.condition ?? 100) / 100;
  // A damaged bike's condition and active grade can describe the same loss.
  const permanent = permanentDiscount(bike);
  const discount = clamp(Math.max(wear,activeDiscount,permanent),0,.75);
  const proof = bike.documented ? Math.min(.02,Math.max(0,discount-permanent)) : 0;
  return Math.max(1,Math.round(cleanValue(bike) * (1-discount+proof)));
}

export function repairForecast(bike) {
  const fixed = activeIssues(bike);
  const beforeCondition = bike.condition ?? 100;
  const afterCondition = Math.min(100,beforeCondition + fixed.reduce((total,code)=>total + PARTS[code].gain,0));
  return {...repairQuote(bike),fixed,beforeCondition,afterCondition,beforeValue:roadValue(bike),
    afterValue:roadValue({...bike,condition:afterCondition,faults:[],damageHistory:historicalIssues(bike)})};
}

export function completeRepair(bike,day) {
  const report = repairForecast(bike);
  bike.damageHistory = historicalIssues(bike);
  bike.condition = report.afterCondition;
  bike.faults = [];
  bike.lastRepair = {...report,day};
}

export function listingForecast(bike,inspectionFee,shippingFee = 0) {
  const repair = repairForecast(bike);
  const total = roundMoney(bike.price + inspectionFee + repair.cost + shippingFee);
  return {...repair,total,profit:roundMoney(repair.afterValue-total)};
}

export function askingPrice(bike,random = Math.random) {
  const [low,high] = SELLER_URGENCY[bike.urgency].range;
  // Seller urgency is independent of damage. Current value already includes damage.
  return Math.max(3000,Math.round(roadValue(bike)*(low+(high-low)*random())/50)*50);
}
