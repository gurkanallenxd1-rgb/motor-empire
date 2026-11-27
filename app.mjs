import { purchasePreview } from './valuation.mjs?v=0.12.3';
import { METHODS, PACKAGES, POLICY_TYPES, SYSTEMS, activePolicy, legacyDamageRecords,
  policyQuote, serviceQuote, verifiedFindings, visibleListing } from './risk.mjs?v=0.12.3';
import { DAY_MS, HOUR_MS, deliveryTime, gameTime, projectedOffset, startClock } from './clock.mjs?v=0.12.3';
import { createTimeStore, saveLock } from './time-store.mjs?v=0.12.3';
import { createFinanceView } from './finance-view.mjs?v=0.12.3';
import { dailyCashMovement } from './finance.mjs?v=0.12.3';
import { PROVINCES, provinceName } from './provinces.mjs?v=0.12.3';
import {
  BRANCH_COST, DAILY_WAGE, GARAGE_LEVELS, INSPECTION_FEE, LOAN_LIMIT, PARTS, RENTAL_DAYS,
  assets, branchCapacity, estimatedListingProfit, newGame, nextRiskEvent, operatingCost,
  perform, purchaseAnalysis, purchaseForecast, rentalRate, repairCapacity, repairPartCost, roadValue, STORAGE_KEY,
} from './game.mjs?v=0.12.3';
import { createGarageRenderer } from './art.mjs?v=0.12.3';
import { catalog, categoryLabel, filterListings, gradeLabel, listingGrade, modelOf, segmentLabel, specsFor } from './bikes.mjs?v=0.12.3';

import { MAX_ROUNDS, isActive, tradeSummary } from './trade.mjs?v=0.12.3';
import { loadSprite, renderSprite, spriteFor } from './sprite.mjs?v=0.12.3';

import { ISSUE_KIND_LABELS, SELLER_URGENCY, activeIssues, historicalIssues,
  repairForecast } from './damage.mjs?v=0.12.3';

const byId = id => document.getElementById(id);
let drawGarage;
const numeric = new Intl.NumberFormat('tr-TR');
const money = value => `${numeric.format(value)} TL`;
const signed = value => value > 0 ? `+${money(value)}` : money(value);
const stages = {
  unchecked: 'Ekspertiz bekliyor', inspected: 'Tamir bekliyor',
  repairing: 'Tamirde', ready: 'Satışa hazır', listed: 'Satışta', rented: 'Kirada', shipping: 'Yolda', claiming:'Kasko onayı bekliyor', riding:'Test sürüşünde',
};

let state;
let branchId = 1;
let bayPage = 0;
let currentPage = 'home';
let meetingView;
let sellerReturn;
let listingDetailId;
let archiveLimit = 20;
let marketPage = 0;
const LISTINGS_PER_PAGE = 10;
const deliveryLabel = delivery => delivery.days ? `${delivery.days} oyun günü` : 'Aynı gün';
const activeBranch = () => state.branches.find(branch => branch.id === branchId);
let saveAvailable = true;

function notice(message, error = false) {
  byId('notice').textContent = message;
  byId('notice').dataset.error = error;
  byId('notice').dataset.active = Boolean(message);
}

function updateSave() {
  byId('save').textContent = saveAvailable ? '● Otomatik kayıt açık' : '● Kayıt kullanılamıyor';
  byId('save').dataset.error = !saveAvailable;
}

let transact;
let timer;
let ticking = false;
let busy = false;

function stopSaving(error) {
  saveAvailable = false;
  clearInterval(timer);
  updateSave();
  notice(error?.message ? `Kayıt kullanılamıyor · ${error.message}` : 'Kayıt kullanılamıyor.',true);
}

function timedText(bike) {
  if (bike.stage === 'shipping') {
    const remaining = Math.max(0,deliveryTime(bike)-gameTime(state.day,projectedOffset(state.clock,Date.now())));
    const hours = Math.ceil(remaining/HOUR_MS);
    return `${provinceName(bike.province)} → İstanbul · Kalan ${Math.floor(hours/24)} gün ${hours%24} sa · Teslimat: Gün ${bike.shipping.arrivalDay}`;
  }
  if (bike.stage==='claiming' || bike.stage==='riding') {
    return countdownText(bike.claim?.due ?? bike.ride.end);
  }
  if (bike.readyDay) return `Teslim · Gün ${bike.readyDay}`;
  const branch = activeBranch();
  const elapsed = projectedOffset(state.clock,Date.now())-state.clock.offset;
  const free = Math.max(0,repairCapacity(branch)*HOUR_MS-(branch.workMs ?? 0));
  const ahead = branch.garage.filter(item=>item.stage==='repairing' && !item.readyDay
    && (item.repairOrder ?? 0)<(bike.repairOrder ?? 0))
    .reduce((total,item)=>total+item.remainingHours*HOUR_MS-(item.repairProgress ?? 0),0);
  const work = Math.max(0,Math.min(free,elapsed*(1+branch.staff))-ahead);
  const remaining = Math.max(0,bike.remainingHours*HOUR_MS-(bike.repairProgress ?? 0)-work);
  const minutes = Math.ceil(remaining*60/HOUR_MS);
  return `Kalan işçilik · ${Math.floor(minutes/60)} sa ${minutes%60} dk`;
}

function countdownText(due) {
  const remaining = Math.max(0,due-gameTime(state.day,projectedOffset(state.clock,Date.now())));
  const minutes = Math.ceil(remaining*60/HOUR_MS);
  return `Kalan ${Math.floor(minutes/60)} sa ${minutes%60} dk`;
}

function clockDisplay(now = Date.now()) {
  if (!state?.clock) return;
  const offset = projectedOffset(state.clock,now);
  const minute = Math.min(1439,Math.floor(offset*1440/DAY_MS));
  const pad = value => String(value).padStart(2,'0');
  byId('clock-time').textContent = `Gün ${state.day} · ${pad(Math.floor(minute/60))}:${pad(minute%60)}`;
  byId('clock-countdown').textContent = state.clock.paused ? 'Duraklatıldı' : `Yeni güne ${Math.ceil((DAY_MS-offset)/1000)} sn`;
  byId('clock-progress').value = offset;
  byId('toggle-clock').textContent = state.clock.paused ? 'Devam et' : 'Duraklat';
  const inspection = byId('listing-inspections').querySelector('[data-due]');
  if (inspection) inspection.textContent = countdownText(Number(inspection.dataset.due));
  if (currentPage === 'garage') for (const node of byId('garage').querySelectorAll('[data-timed-bike]')) {
    const bike = activeBranch().garage.find(item=>item.id === node.dataset.timedBike);
    if (bike && ['shipping','repairing','claiming','riding'].includes(bike.stage)) node.textContent = timedText(bike);
  }
}

function showOffline(summary) {
  if (!summary || document.hidden || !(summary.days || summary.completed || summary.delivered || summary.inspected || summary.approved || summary.rides || summary.complaints)) return;
  const dialog = byId('offline-summary');
  byId('offline-totals').replaceChildren(
    metric('Geçen oyun günü',summary.days),metric('Tamamlanan tamir',summary.completed),
    metric('Teslim edilen nakliye',summary.delivered),metric('Dönen kiralık',summary.returned),
    metric('Gelen müşteri',summary.visits),metric('Hazır ekspertiz',summary.inspected),
    metric('Onaylanan kasko',summary.approved),metric('Kaza',summary.accidents),
    metric('Müşteri şikâyeti',summary.complaints),metric('Gelir',money(summary.income)),metric('Gider',money(summary.expenses)));
  byId('offline-limit').hidden = !summary.capped;
  if (!dialog.open) dialog.showModal();
}

function renderComplaints() {
  const panel = byId('complaint-notices');
  const unread = state.sales.filter(sale=>sale.complaintResult && !sale.complaintResult.seen);
  const shortcut = byId('complaint-shortcut');
  shortcut.hidden = !unread.length;
  shortcut.textContent = `Şikâyetler · ${unread.length}`;
  const heading = byId('complaint-heading');
  const header = `Yeni müşteri şikâyeti · ${unread.length}`;
  if (heading.textContent!==header) heading.textContent = header;
  panel.hidden = !unread.length;
  if (!unread.length) return;
  byId('complaint-list').replaceChildren(...unread.map(sale=>{
    const {outcome,day,amount,reputationLoss,destination} = sale.complaintResult;
    const row = element('article','','complaint-entry');
    const outcomeText = outcome==='refund' ? `İade · ${money(amount)}` : `Tazminat · ${money(amount)}`;
    const location = destination==='waiting' ? ' · Garaj dolu, teslim bekliyor'
      : destination==='garage' ? ' · Motosiklet garaja döndü' : '';
    row.append(element('h3',sale.name),element('p',`Gün ${day} · ${outcomeText} · İtibar −${reputationLoss}${location}`,'spec'),
      actionButton('Okundu','acknowledge-complaint',sale.id));
    return row;
  }));
}

function acceptTime(next) {
  const refresh = !state || next.day !== state.day || next.clock?.revision !== state.clock?.revision;
  const y = window.scrollY;
  state = next;
  if (refresh) {
    render();
    window.scrollTo(0,y);
    if (byId('meeting').open) updateMeeting();
    if (byId('listing-detail').open && listingDetailId) {
      if (next.listings.some(item=>item.id===listingDetailId)) openListing(listingDetailId);
      else {
        byId('listing-detail').close();
        notice('İlanın süresi doldu.');
      }
    }
  }
  clockDisplay();
}

function clockIsDue(now) {
  const offset = projectedOffset(state.clock,now);
  if (offset >= DAY_MS || nextRiskEvent(state)<=gameTime(state.day,offset)) return true;
  return state.branches.some(branch=>{
    const activeWork = Math.min((offset-state.clock.offset)*(1+branch.staff),
      Math.max(0,repairCapacity(branch)*HOUR_MS-(branch.workMs ?? 0)));
    const head = branch.garage.filter(bike=>bike.stage === 'repairing' && !bike.readyDay)
      .sort((a,b)=>(a.repairOrder ?? 0)-(b.repairOrder ?? 0))[0];
    return (head && activeWork >= head.remainingHours*HOUR_MS-(head.repairProgress ?? 0))
      || branch.garage.some(bike=>bike.stage === 'shipping' && deliveryTime(bike) <= gameTime(state.day,offset));
  });
}

async function tickClock(background = false) {
  if (!state || !saveAvailable || ticking || (busy && !background) || (document.hidden && !background)) return;
  ticking = true;
  try {
    if (background || clockIsDue(Date.now())) {
      const result = await transact();
      acceptTime(result.state);
      if (background) showOffline(result.summary);
    } else clockDisplay();
  } catch (error) { stopSaving(error); }
  finally { ticking = false; }
}

function startTicker() {
  clearInterval(timer);
  if (saveAvailable && !document.hidden && !state.clock.paused) timer = setInterval(()=>tickClock(),1000);
}

async function startGame() {
  try {
    transact = createTimeStore(window.localStorage,saveLock(navigator,window.indexedDB));
    const result = await transact();
    acceptTime(result.state);
    showOffline(result.summary);
  } catch (error) {
    // A failed shared save stays read-only so another tab's progress cannot be overwritten.
    state ??= {...newGame(),clock:{...startClock(Date.now()),paused:true}};
    render();
    clockDisplay();
    stopSaving(error);
  }
  startTicker();
}


function actionButton(label, action, id, disabled = false, index) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.dataset.action = action;
  if (id !== undefined) button.dataset.id = id;
  button.disabled = disabled;
  if (index !== undefined) button.dataset.index = index;
  return button;
}

function element(tag, text, className = '') {
  const node = document.createElement(tag);
  node.textContent = text;
  node.className = className;
  return node;
}

function issueDetails(bike,{active=true}={}) {
  const details = element('div','','damage-details');
  const faults = activeIssues(bike);
  if (active && !faults.length) details.append(element('p','Aktif arıza veya hasar kaydı yok.','spec'));
  for (const [kind,label] of Object.entries(ISSUE_KIND_LABELS)) {
    const items = active ? faults.filter(code=>PARTS[code].kind === kind) : [];
    if (!items.length) continue;
    const list = element('ul','','parts');
    for (const code of items) {
      const part = PARTS[code];
      list.append(element('li',`${part.name} · ${money(repairPartCost(bike,code))} · ${part.hours} sa. · +${part.gain} kondisyon`));
    }
    details.append(element('h3',label),list);
  }
  const history = legacyDamageRecords(bike);
  if (history.length) {
    const sources = {unknown:'Kayıt kaynağı bilinmiyor',private:'Özel servis kaydı',authorized:'Yetkili servis kaydı',
      insured:'Sigorta kaydı',unrepaired:'Yeni kaza'};
    details.append(element('h3','Kalıcı hasar geçmişi'));
    const groups = [
      ['Sigorta kayıtlı hasarlar',history.filter(record=>record.source==='insured')],
      ['Servis ve diğer hasar kayıtları',history.filter(record=>record.source!=='insured')],
    ];
    for (const [title,records] of groups) {
      if (!records.length) continue;
      const list = element('ul','','parts');
      for (const record of records) {
        const status = record.method ? 'Onarılmış' : 'Aktif hasar';
        const labels = record.codes.map(code=>({agir:'Ağır hasar kaydı',pert:'Pert geçmişi'})[code] ?? PARTS[code].name);
        const date = record.date ?? (record.day ? `Gün ${record.day}` : 'Tarih bilinmiyor');
        const cost = record.amount == null ? 'Tutar bilinmiyor' : `${record.estimated ? 'Tahmini ' : ''}${money(record.amount)}`;
        const method = METHODS[record.method]?.label ?? (record.method==='unknown' ? 'Yöntem bilinmiyor' : '');
        list.append(element('li',[`${status} · ${labels.join(', ')}`,date,cost,sources[record.source],method].filter(Boolean).join(' · ')));
      }
      details.append(element('p',title,'spec'),list);
    }
  }
  return details;
}

function repairComparison(report,label) {
  const section = element('div','','repair-comparison');
  section.append(element('h3',label),
    element('p',`Kondisyon · %${report.beforeCondition} → %${report.afterCondition}`,'spec'),
    element('p',`Piyasa değeri · ${money(report.beforeValue)} → ${money(report.afterValue)}`,'spec'),
    element('p',`Tamir masrafı · ${money(report.cost)}`,'spec'));
  return section;
}

function reportCard(report) {
  const details = element('details','','risk-panel');
  details.append(element('summary',`${report.title ?? PACKAGES[report.package].label+' ekspertiz'} · ${report.result ? 'Rapor hazır' : 'İnceleniyor'}`));
  if (!report.result) {
    details.open = true;
    const due = element('p',countdownText(report.due),'spec');
    due.dataset.due = report.due;
    details.append(due);
    return details;
  }
  const list = element('ul','','parts');
  for (const area of report.result) {
    const result = !area.checked ? 'Paket kapsamı dışında' : area.codes.length
      ? area.codes.map(code=>PARTS[code].name).join(', ') : 'Bulgu yok';
    list.append(element('li',`${SYSTEMS[area.area]} · ${result}`));
  }
  details.append(list);
  return details;
}

function inspectionControls(bike) {
  const node = byId('listing-inspections');
  const expanded = new Set([...node.querySelectorAll('details[open]')].map(item=>item.dataset.report));
  const reports = bike.inspections ?? [];
  const panel = element('details','','risk-panel');
  panel.dataset.report = 'packages';
  panel.open = !reports.length || expanded.has('packages');
  panel.append(element('summary','Satın alma öncesi ekspertiz'));
  for (const [id,plan] of Object.entries(PACKAGES)) {
    const button = actionButton(`${plan.label} · ${money(plan.cost)} · ${plan.hours} sa`,'pre-inspect',bike.id,
      state.cash<plan.cost || reports.some(report=>!report.result || report.cost>=plan.cost),id);
    const coverage = plan.areas.map(area=>SYSTEMS[area]).join(', ');
    panel.append(button,element('p',coverage,'spec'));
  }
  const rendered = reports.map(report=>{
    const card = reportCard(report);
    card.dataset.report = report.id;
    card.open = !report.result || expanded.has(report.id) || report===reports.at(-1);
    return card;
  });
  if (reports.length && reports.every(report=>report.result) && reports.some(report=>!report.closed)) {
    panel.append(actionButton('Alımdan vazgeç · Ekspertizi gider kaydet','close-inspection',bike.id));
  }
  node.replaceChildren(panel,...rendered);
}

function insuranceControls(bike) {
  const details = element('details','','risk-panel');
  details.append(element('summary','Sigorta ve poliçeler'));
  const time = gameTime(state.day,projectedOffset(state.clock,Date.now()));
  for (const [type,plan] of Object.entries(POLICY_TYPES)) {
    const current = activePolicy(bike,type,time);
    const quote = current ?? policyQuote(bike,type);
    details.append(element('h3',plan.label),element('p',plan.coverage,'spec'),
      element('p',`Prim ${money(quote.premium)} · Süre ${quote.days} gün · Limit ${money(quote.limit)} · Muafiyet ${money(quote.deductible)}`,'spec'));
    if (current) details.append(element('p',`Başlangıç: Gün ${Math.floor(current.start/DAY_MS)+1} · Bitiş: Gün ${Math.floor(current.end/DAY_MS)+1}`,'spec'));
    else if (['unchecked','inspected','ready'].includes(bike.stage)) details.append(
      actionButton(`${plan.label} al · ${money(quote.premium)}`,'policy',bike.id,state.cash<quote.premium,type));
  }
  for (const policy of bike.policies ?? []) {
    if (policy.end>time) continue;
    details.append(element('p',`${POLICY_TYPES[policy.type].label} · Süresi doldu · Gün ${Math.floor(policy.end/DAY_MS)+1} · ${money(policy.premium)}`,'spec'));
  }
  return details;
}

function garageCard(slot) {
  const bike = activeBranch().garage.find(item => item.slot === slot);
  const card = element('article', '', bike ? 'card' : 'empty');
  card.append(element('p', `BÖLME ${String(slot + 1).padStart(2, '0')}`, 'slot'));
  if (!bike) {
    card.append(element('h3', 'Boş bölme'), element('p', 'Pazardan motosiklet satın al.', 'muted'));
    return card;
  }

  card.append(element('h3', bike.name), element('p', `${stages[bike.stage]} · ${numeric.format(bike.km)} km · Kondisyon %${bike.condition}`, 'spec'),
    element('p', `Toplam maliyet · ${money(bike.spent)}`, 'spec'));
  if (bike.stage === 'shipping') {
    const countdown = element('p',timedText(bike),'spec');
    countdown.dataset.timedBike = bike.id;
    card.append(countdown,
      element('p',`Nakliye · ${money(bike.shipping.fee)} · ${numeric.format(bike.shipping.km)} km`,'spec'));
    return card;
  }
  const representation = element('span','Temsili görsel','representative-label');
  representation.hidden = Boolean(spriteFor(bike));
  if (representation.hidden) loadSprite(bike).then(asset=>{ representation.hidden = !asset?.representative; });
  card.append(representation);
  if (['unchecked','inspected'].includes(bike.stage)) {
    const media = element('div','','inspection-media');
    const canvas = element('canvas','');
    canvas.setAttribute('role','img');
    canvas.setAttribute('aria-label',bike.name + ' ekspertiz görseli');
    const missing = element('p','Görsel yüklenemedi','muted');
    media.append(canvas,missing);
    renderSprite(canvas,missing,bike);
    card.append(media);
  }
  for (const report of bike.inspections ?? []) if (report.result) card.append(reportCard(report));
  if (bike.garageInspection) card.append(reportCard(bike.garageInspection));
  if (bike.lastRepair) card.append(repairComparison(bike.lastRepair,`Tamir sonucu · Gün ${bike.lastRepair.day}`));
  if (bike.stage === 'unchecked') {
    if (historicalIssues(bike).length) card.append(issueDetails(bike,{active:false}));
    card.append(actionButton(`Ekspertiz · ${money(INSPECTION_FEE)}`, 'inspect', bike.id, state.cash < INSPECTION_FEE));
  } else if (bike.stage === 'inspected') {
    const quote = repairForecast(bike);
    const options = element('details','','risk-panel');
    options.open = true;
    options.append(element('summary','Onarım seçenekleri'));
    for (const [id,method] of Object.entries(METHODS)) {
      const service = serviceQuote(bike,id);
      if (id==='insured' && !service.eligible) continue;
      options.append(actionButton(`${method.label} · ${money(service.cost)}`,'repair',bike.id,state.cash<service.cost,id),
        element('p',`${service.hours} sa işçilik${id==='private' ? '' : ' · Daha az kalıcı değer kaybı'}${service.payout
          ? ` · 4 sa onay · ${money(service.payout)} ödeme · Net ${money(service.cost-service.payout)}` : ''}`,'spec'));
    }
    card.append(issueDetails(bike),repairComparison(quote,'Tamir tahmini'),options);
  } else if (bike.stage === 'claiming' || bike.stage === 'riding') {
    const countdown = element('p',timedText(bike),'spec');
    countdown.dataset.timedBike = bike.id;
    card.append(countdown);
  } else if (bike.stage === 'repairing') {
    const progress = element('p',timedText(bike),'spec');
    progress.dataset.timedBike = bike.id;
    card.append(progress,repairComparison(repairForecast(bike),'Tamir tahmini'));
  } else if (bike.stage === 'ready') {
    const time = gameTime(state.day,projectedOffset(state.clock,Date.now()));
    const traffic = activePolicy(bike,'traffic',time);
    const rentActions = element('div', '', 'quick-actions rent-actions');
    rentActions.setAttribute('aria-label','Kiralama süresi');
    rentActions.setAttribute('role','group');
    for (const days of RENTAL_DAYS) {
      const button = actionButton(`${days} gün`, 'rent', bike.id, !(traffic?.end>=gameTime(state.day+days)), days);
      button.setAttribute('aria-label', `${bike.name} · ${days} gün kirala`);
      rentActions.append(button);
    }
    const ask = element('label', 'İlan fiyatı (TL)', 'ask-price');
    const input = element('input', '');
    input.type = 'number';
    input.min = '1';
    input.step = '.01';
    input.inputMode = 'decimal';
    input.value = roadValue(bike);
    ask.append(input);
    card.append(ask);
    card.append(actionButton(historicalIssues(bike).length ? 'Hasarı açıklayarak satışa çıkar' : 'Satışa çıkar','list',bike.id));
    if (historicalIssues(bike).length) {
      const disclosure = element('details','','risk-panel');
      disclosure.append(element('summary','Hasarı açıklamadan satış'),
        element('p','Şikâyet, iade, tazminat ve itibar kaybı riski.','spec'),
        actionButton('Hasarı açıklamadan ilana ver','list-quiet',bike.id));
      card.append(disclosure);
    }
    card.append(element('p',`Kiralama · ${money(rentalRate(bike))} / gün${traffic ? '' : ' · Trafik poliçesi gerekiyor'}`,'spec rental-rate'),
      rentActions,actionButton('Test sürüşü · 1 sa','ride',bike.id,!(traffic?.end>=time+HOUR_MS)));
  } else if (bike.stage === 'rented') {
    card.append(element('p', `Dönüş · Gün ${bike.rental.endDay} · ${money(bike.rental.rate)} / gün`, 'spec'));
  } else if (bike.stage === 'listed') {
    const active = bike.meetings.filter(isActive);
    card.append(element('p',`İstenen fiyat · ${money(bike.ask)}`,'spec'));
    if (!active.length) card.append(element('p','Müşteri bekleniyor. Yeni günde talep yeniden hesaplanır.','muted'));
    for (const meeting of active) {
      const row = element('div','','offer');
      const details = element('div','');
      details.append(element('b',meeting.profile.name),
        element('p',`${meeting.profile.type} · ${money(meeting.price)}`,'spec'));
      row.append(details,actionButton('Görüş', 'open-buyer', bike.id, false, meeting.id));
      card.append(row);
    }
    card.append(actionButton('Satış ilanını kaldır', 'unlist', bike.id));
  }
  if (!['unchecked','inspected'].includes(bike.stage) && historicalIssues(bike).length) {
    card.append(issueDetails(bike,{active:false}));
  }
  card.append(insuranceControls(bike));
  return card;
}

function bikeSpecs(bike) {
  const model = specsFor(bike);
  const specs = [String(bike.year), `${numeric.format(bike.km)} km`, `Kondisyon %${bike.condition ?? 100}`];
  if (model) specs.unshift(`${numeric.format(model.cc)} cc`, `${numeric.format(model.hp)} bg`);
  if (bike.colorName) specs.push(bike.colorName);
  return specs.join(' · ');
}

function openBike(bike) {
  const model = modelOf(bike);
  byId('detail-image').setAttribute('aria-label',bike.name + ' model görseli');
  renderSprite(byId('detail-image'),byId('detail-image-missing'),bike,byId('detail-representative'));
  byId('detail-name').textContent = bike.name;
  byId('detail-class').textContent = categoryLabel[model?.category] ?? '';
  byId('detail-spec').textContent = `${bikeSpecs(bike)} · ${stages[bike.stage]}`;
  byId('bike-detail').showModal();
}

const lazyMarketImages = new WeakMap();
const marketObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries=>{
  for (const {target,isIntersecting} of entries) {
    if (!isIntersecting) continue;
    marketObserver.unobserve(target);
    const job = lazyMarketImages.get(target);
    if (job && target.isConnected) renderSprite(...job);
    lazyMarketImages.delete(target);
  }
},{rootMargin:'96px 0px'}) : null;

function listingClass(listing) {
  const model = modelOf(listing);
  return [categoryLabel[model?.category],segmentLabel[model?.segment],gradeLabel[listingGrade(listing)]].filter(Boolean).join(' · ');
}

function marketCard(listing) {
  const card = actionButton('', 'open-listing',listing.id);
  card.className = 'listing-row';
  card.setAttribute('aria-label',`${listing.name} · ${provinceName(listing.province)} · ${money(listing.price)} · İlan detayı`);
  const media = element('span','','listing-media');
  const image = document.createElement('canvas');
  image.hidden = true;
  image.setAttribute('aria-hidden','true');
  const fallback = element('span','Görsel yok','missing-image');
  fallback.hidden = true;
  const label = element('span','Temsili görsel','representative-label');
  label.hidden = true;
  media.append(image,fallback,label);
  if (marketObserver) {
    lazyMarketImages.set(media,[image,fallback,listing,label]);
    marketObserver.observe(media);
  } else renderSprite(image,fallback,listing,label);

  const forecast = purchaseForecast(listing);
  const details = element('span','','listing-details');
  details.append(element('strong',listing.name,'listing-name'),
    element('span',`${listing.year} · ${numeric.format(listing.km)} km · ${listing.colorName || 'Renk belirtilmedi'}`,'spec listing-meta'),
    element('span',provinceName(listing.province),'spec listing-meta'),
    element('span',`Kondisyon %${listing.condition ?? 100} · ${gradeLabel[listingGrade(listing)]}`,'spec listing-meta'));
  const values = element('span','','listing-values');
  values.append(element('strong',money(listing.price),'price'),
    element('span',`Nakliye ${money(forecast.delivery.fee)} · ${deliveryLabel(forecast.delivery)}`,'spec'),
    element('span',`Tahmini net ${forecast.profit < 0 ? 'zarar' : 'kâr'} ${signed(forecast.profit)}`,'spec'));
  card.append(media,details,values);
  return card;
}

const percentage = new Intl.NumberFormat('tr-TR',{style:'percent',maximumFractionDigits:2});

function signedRatio(amount,ratio) {
  return `${signed(amount)} · ${percentage.format(ratio || 0)}`;
}

function refreshOfferPreview(view) {
  const preview = purchasePreview(view.analysis,view.draft);
  const input = byId('player-offer');
  const range = byId('player-offer-range');
  const offerAccepted = Boolean(preview && input.validity.valid && view.draft<=view.analysis.offer);
  byId('meeting-negotiate').disabled = !view.canNegotiate || !offerAccepted;
  byId('offer-warning').textContent = preview && view.draft>view.analysis.offer
    ? 'Gönderilecek teklif satıcının fiyatını aşamaz.' : '';
  range.setAttribute('aria-valuetext',money(range.valueAsNumber));
  for (const [id,amount,ratio,colored] of [
    ['live-advantage',preview?.advantage,preview?.advantageShare,true],
    ['live-potential-discount',preview?.discount,preview?.discountShare,true],
    ['live-total-cost',preview?.total,null,false],
    ['live-sale-profit',preview?.profit,preview?.profitShare,true],
  ]) {
    const output = byId(id);
    output.textContent = amount === undefined ? '—' : ratio === null ? money(amount) : signedRatio(amount,ratio);
    output.classList.toggle('negative',colored && amount<0);
    output.classList.toggle('positive',colored && amount>0);
  }
}

function showOfferEditor(view,analysis,meeting,canNegotiate) {
  const input = byId('player-offer');
  const range = byId('player-offer-range');
  const maximum = Math.min(Number.MAX_SAFE_INTEGER/100,Math.max(analysis.initialPrice,analysis.offer)*2);
  input.max = range.max = String(maximum);
  if (view.draft === undefined) {
    view.draft = meeting.playerOffer ?? analysis.offer;
    input.value = String(view.draft);
    range.value = String(view.draft);
  }
  view.analysis = analysis;
  view.canNegotiate = canNegotiate;
  input.disabled = range.disabled = meeting.status!=='open';
  if (meeting.status==='agreed' && view.draft!==analysis.offer) {
    view.draft = analysis.offer;
    input.value = range.value = String(analysis.offer);
  }
  const values = {
    'live-start-price':money(analysis.initialPrice),
    'live-seller-price':money(analysis.offer),
    'live-before-value':money(analysis.beforeInspection),
    'live-after-value':analysis.completed ? money(analysis.beforeValue) : '—',
    'live-inspection-difference':analysis.completed ? signedRatio(-analysis.difference,-analysis.differenceShare) : '—',
    'live-seller-discount':signedRatio(analysis.discount,analysis.discountShare),
    'live-damage-loss':signedRatio(-analysis.damageLoss,-analysis.damageLossShare),
  };
  for (const [id,value] of Object.entries(values)) byId(id).textContent = value;
  refreshOfferPreview(view);
}

for (const id of ['player-offer','player-offer-range']) {
  byId(id).addEventListener('input',event=>{
    if (!meetingView?.analysis) return;
    const amount = event.target.valueAsNumber;
    if (id==='player-offer-range') byId('player-offer').value = event.target.value;
    else if (Number.isFinite(amount)) byId('player-offer-range').value = event.target.value;
    meetingView.draft = amount;
    refreshOfferPreview(meetingView);
  });
}

function renderPurchaseAnalysis(container, analysis) {
  const pair = (label,value,tone = '')=>{
    const row = element('div','','valuation-row');
    row.append(element('dt',label),element('dd',value,tone));
    return row;
  };
  const share = ratio=>percentage.format(ratio);
  const loss = (amount,ratio)=>`${money(amount)} · ${share(ratio)}`;
  const delta = amount=>amount ? signed(amount) : money(0);
  const advantage = analysis.advantage > 0 ? 'Teklif avantajı' : analysis.advantage < 0 ? 'Teklif dezavantajı' : 'Piyasayla fiyat farkı';
  const comparison = element('dl','','valuation-list');
  comparison.append(
    pair('Hasarsız piyasa değeri',money(analysis.clean)),
    pair('Satıcının başlangıç fiyatı',money(analysis.initialPrice)),
    pair('Ekspertiz öncesi tahmini piyasa değeri',money(analysis.beforeInspection)),
    pair('Ekspertiz sonrası güncellenmiş piyasa değeri',analysis.completed ? money(analysis.beforeValue) : analysis.pending ? 'Rapor bekleniyor' : 'Ekspertiz yapılmadı'),
    pair('Ekspertiz öncesi ve sonrası fark',analysis.completed ? signedRatio(-analysis.difference,-analysis.differenceShare) : '—'),
    pair('Satıcının güncel teklifi',money(analysis.offer)),
    pair('Satıcının pazarlık indirimi',loss(analysis.discount,analysis.discountShare)),
    pair(advantage,loss(Math.abs(analysis.advantage),Math.abs(analysis.advantageShare)),
      analysis.advantage < 0 ? 'negative' : analysis.advantage > 0 ? 'positive' : ''));

  const damage = element('details','','valuation-group');
  const depreciation = element('dl','','valuation-list');
  depreciation.append(...analysis.findings.map(item=>pair(PARTS[item.code].name,loss(item.loss,item.share))));
  depreciation.append(pair('Diğer beyan edilen hasar ve yıpranma',money(analysis.otherLoss)),
    pair('Toplam değer kaybı',loss(analysis.totalLoss,analysis.totalLossShare)),
    pair('Onarım sonrası kalıcı değer kaybı',loss(analysis.permanentLoss,analysis.permanentLossShare)));
  damage.append(element('summary','Hasar bazında değer kaybı'),depreciation,
    element('p','Bulguların katkısı birlikte hesaplanır. Bir hasarın etkisi başka bir bulgunun içinde kalıyorsa satırda 0 TL gösterilir.','spec'));

  const costs = element('dl','','valuation-list');
  const margin = analysis.profit < 0 ? 'Tahmini satış zararı' : 'Tahmini satış kârı';
  costs.append(pair('Ödenen ekspertiz',money(analysis.feesPaid)),
    pair('Garaj ekspertizi tahmini',money(analysis.intakeFee)),
    pair('Nakliye ücreti',money(analysis.delivery.fee)),
    pair('Tahmini tamir maliyeti',money(analysis.cost)),
    pair('Tamir sonrası tahmini piyasa değeri',money(analysis.afterValue)),
    pair('Tahmini toplam maliyet',money(analysis.total)),
    pair(margin,`${delta(analysis.profit)} · ${share(analysis.profitShare)}`,analysis.profit < 0 ? 'negative' : 'positive'));
  const preserveExpanded = container.querySelector('.valuation-group')?.open;
  damage.open = Boolean(preserveExpanded);
  container.replaceChildren(comparison,damage,costs);
}

function openListing(id) {
  const listing = state.listings.find(item=>item.id === id);
  if (!listing) return;
  listingDetailId = id;
  const previous = visibleListing(listing);
  const pending = listing.inspections?.some(report=>!report.result);
  const dialog = byId('listing-detail');
  byId('listing-name').textContent = listing.name;
  byId('listing-class').textContent = listingClass(previous);
  byId('listing-spec').textContent = `${bikeSpecs(previous)} · ${provinceName(listing.province)}`;
  byId('listing-error').hidden = true;
  byId('listing-image').setAttribute('aria-label',listing.name);
  renderSprite(byId('listing-image'),byId('listing-image-missing'),listing,byId('listing-representative'));
  const analysis = purchaseAnalysis(listing,isActive(listing.seller) ? listing.seller : undefined);
  const payable = listing.price + analysis.delivery.fee;
  byId('listing-prices').replaceChildren(
    metric('İlan fiyatı',money(listing.price)),
    metric('Bilinen piyasa değeri',money(analysis.beforeValue)),
    metric('Nakliye ücreti',money(analysis.delivery.fee)),
    metric('Teslimat',deliveryLabel(analysis.delivery)),
    metric('Beyan edilen kondisyon',`%${listing.disclosure?.condition ?? listing.condition ?? 100}`),
    metric('Bilinen kondisyon',`%${analysis.beforeCondition}`)
  );
  renderPurchaseAnalysis(byId('listing-analysis-content'),analysis);
  const urgency = SELLER_URGENCY[listing.urgency];
  byId('listing-urgency').textContent = urgency ? `Satıcı aciliyeti · ${urgency.label}` : '';
  const trust = listing.disclosure?.trust;
  const verdict = trust === undefined ? 'Bilinmiyor' : trust>=.7 ? 'Yüksek' : trust>=.23 ? 'Orta' : 'Düşük';
  byId('listing-trust').textContent = `Satıcı geçmişi · ${verdict}`;
  byId('listing-damage').replaceChildren(issueDetails(previous));
  inspectionControls(listing);
  const branch = activeBranch();
  const reason = pending ? 'Ekspertiz bekleniyor' : branch.garage.length >= branchCapacity(branch) ? 'Garaj dolu'
    : state.cash < payable ? 'Yetersiz bakiye' : '';
  const buy = actionButton(reason || 'Satın al · '+money(payable),'buy',id,Boolean(reason));
  buy.classList.add('primary');
  const canNegotiate = !pending && (!listing.seller || isActive(listing.seller));
  const talk = actionButton(isActive(listing.seller) ? 'Görüşmeye dön'
    : canNegotiate ? 'Satıcıyla pazarlık' : pending ? 'Ekspertiz bekleniyor' : 'Görüşme kapandı','meet-seller',id,!canNegotiate);
  byId('listing-detail-actions').replaceChildren(talk,buy);
  if (!dialog.open) {
    dialog.showModal();
    dialog.scrollTop = 0;
  }
}

function renderMarket() {
  const current = state.listings.filter(listing=>listing.inspections?.some(report=>!report.closed) || isActive(listing.seller));
  const follow = byId('inspection-follow');
  follow.hidden = !current.length;
  byId('inspection-follow-list').replaceChildren(...current.map(listing=>{
    const group = element('div','','inspection-shortcut');
    const pending = listing.inspections?.some(report=>!report.result);
    const status = pending ? 'Ekspertiz sürüyor' : isActive(listing.seller) ? 'Açık satıcı görüşmesi' : 'Ekspertiz raporu hazır';
    group.append(element('p',`${listing.name} · ${status}`,'spec'),actionButton('İlanı aç','open-listing',listing.id));
    if (!pending && (!listing.seller || isActive(listing.seller))) group.append(
      actionButton(isActive(listing.seller) ? 'Görüşmeye dön' : 'Satıcıyla pazarlık','meet-seller',listing.id));
    return group;
  }));
  byId('inspection-archive').hidden = !state.inspectionArchive?.length;
  const records = (state.inspectionArchive ?? []).slice(0,archiveLimit).map(item=>{
    const detail = element('details','','risk-panel');
    detail.append(element('summary',`${item.name} · Gün ${item.day}`),...(item.reports ?? []).map(reportCard));
    if (item.listing) detail.append(actionButton('İlanı yeniden aç','resume-inspection',item.id),
      actionButton('Satıcıyla pazarlık','meet-seller',item.id));
    return detail;
  });
  byId('inspection-history').replaceChildren(...records);
  byId('more-inspections').hidden = (state.inspectionArchive?.length ?? 0)<=archiveLimit;
  const readLimit = id => {
    const field = byId(id);
    return field.value === '' ? null : field.valueAsNumber;
  };
  const listings = filterListings(state.listings.map(listing=>visibleListing(listing)), {
    province: Number(byId('filter-province').value),
    brand: byId('filter-brand').value,
    modelId: byId('filter-model').value,
    color: byId('filter-color').value,
    search: byId('market-search').value,
    category: byId('filter-category').value,
    grade: byId('filter-grade').value,
    minYear: readLimit('filter-year'),
    maxYear: readLimit('filter-year-max'),
    sort: byId('filter-sort').value,
    minPrice: readLimit('filter-price-min'),
    maxPrice: readLimit('filter-price'),
    minKm: readLimit('filter-km-min'),
    maxKm: readLimit('filter-km'),
    minCc: readLimit('filter-cc-min'),
    maxCc: readLimit('filter-cc'),
  },estimatedListingProfit);
  byId('market-count').textContent = `${listings.length} / ${state.listings.length} İLAN`;
  const pages = Math.max(1,Math.ceil(listings.length / LISTINGS_PER_PAGE));
  marketPage = Math.min(marketPage,pages - 1);
  byId('market-pagination').hidden = pages < 2;
  byId('market-page-number').textContent = `${marketPage + 1} / ${pages}`;
  byId('market-prev').disabled = marketPage === 0;
  byId('market-next').disabled = marketPage + 1 === pages;
  const first = marketPage * LISTINGS_PER_PAGE;
  marketObserver?.disconnect();
  byId('market').replaceChildren(...(listings.length
    ? listings.slice(first,first + LISTINGS_PER_PAGE).map(marketCard)
    : [element('p', 'Filtrelere uyan ilan bulunamadı.', 'muted')]));
}

function metric(label, value) {
  const card = element('div', '', 'metric');
  card.append(element('span', label, 'spec'), element('strong', value));
  return card;
}

function renderGarage(branch, action, bike) {
  drawGarage ??= createGarageRenderer(byId('garage-scene'), openBike);
  const offset = bayPage * 2;
  const capacity = branchCapacity(branch);
  byId('bay-pages').hidden = capacity <= 2;
  byId('bay-range').textContent = `Bölmeler ${offset + 1}–${offset + 2} / ${capacity}`;
  byId('bays-prev').disabled = bayPage === 0;
  byId('bays-next').disabled = offset + 2 >= capacity;
  const inFrame = bike => bike.slot >= offset && bike.slot < offset + 2;
  const visibleBikes = branch.garage.filter(item => inFrame(item) && !['rented','shipping'].includes(item.stage));
  byId('garage').dataset.occupied = branch.garage.some(inFrame);
  byId('garage').replaceChildren(garageCard(offset), garageCard(offset + 1));
  byId('garage-returns').replaceChildren(...(state.waitingReturns ?? []).filter(item=>item.branchId===branch.id)
    .map(item=>actionButton(`İade bekliyor · ${item.bike.name}`,'take-return',item.bike.id,branch.garage.length>=capacity)));
  drawGarage(visibleBikes, action, bike && bike.stage !== 'shipping' && inFrame(bike) ? bike : undefined, offset, branch.id);
}

function renderBusiness() {
  const cards = state.branches.map(branch => {
    const card = element('article', '', 'card business-card');
    const upgrade = GARAGE_LEVELS[branch.level];
    const controls = element('div', '', 'quick-actions');
    controls.append(actionButton('Usta işe al', 'hire', branch.id),
      actionButton('Ustayı çıkar', 'fire', branch.id, branch.staff === 0));
    card.append(element('h3', branch.name),
      element('p', `Seviye ${branch.level} · ${branch.garage.length} / ${branchCapacity(branch)} motosiklet`, 'spec'),
      element('p', `${branch.staff} usta · ${repairCapacity(branch)} saat/gün · ${money(operatingCost(branch))}/gün`, 'spec'),
      controls, upgrade
        ? actionButton(`${upgrade.capacity} bölmeye yükselt · ${money(upgrade.cost)}`, 'upgrade', branch.id, state.cash < upgrade.cost)
        : element('p', 'En yüksek garaj seviyesi', 'spec'));
    return card;
  });
  const expansion = element('article', '', 'card business-card');
  expansion.append(element('h3', 'İstanbul’da yeni şube'),
    element('p', `Seviye 1 ile başlar · Usta maaşı ${money(DAILY_WAGE)}/gün`, 'spec'),
    actionButton(`Şube aç · ${money(BRANCH_COST)}`, 'open-branch', undefined, state.cash < BRANCH_COST));
  byId('business').replaceChildren(...cards, expansion);
}

const renderFinance = createFinanceView({byId,element,metric,money,signed,repairForecast,
  inspectionFee:INSPECTION_FEE,loanLimit:LOAN_LIMIT,tradeSummary,issueDetails,reportCard});

function render(action, animationBike) {
  const branch = activeBranch();
  const cashChange = dailyCashMovement(state.ledger,state.day);
  const worth = assets(state);
  byId('cash').textContent = money(state.cash);
  byId('day').textContent = String(state.day).padStart(2, '0');
  byId('capacity').textContent = `${branch.garage.length} / ${branchCapacity(branch)}`;
  byId('profit').textContent = signed(cashChange);
  byId('profit').className = cashChange < 0 ? 'negative' : cashChange > 0 ? 'positive' : '';
  const select = byId('branch');
  if (select.options.length !== state.branches.length) {
    select.replaceChildren(...state.branches.map(item => new Option(item.name, item.id)));
  }
  select.value = branchId;
  if (currentPage === 'home') {
    byId('home-summary').replaceChildren(metric('Toplam varlık', money(worth.total)),
      metric('Borç bakiyesi', money(state.debt)), metric('Aktif şube iş kapasitesi', `${repairCapacity(branch)} saat/gün`),
      metric('Toplam şube sayısı', state.branches.length),metric('İşletme itibarı',`${state.trade.reputation} / 100`));
  }
  if (currentPage === 'garage') renderGarage(branch, action, animationBike);
  if (currentPage === 'market') {
    refreshMarketColors();
    renderMarket();
  }
  if (currentPage === 'business') renderBusiness();
  if (currentPage === 'finance') renderFinance(state,worth);
  renderComplaints();
  updateSave();
}

function showPage(page) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(section => { section.hidden = section.id !== `${page}-page`; });
  document.querySelectorAll('.bottom-nav button').forEach(button => {
    if (button.dataset.page === page) button.setAttribute('aria-current','page');
    else button.removeAttribute('aria-current');
  });
  window.scrollTo(0,0);
}

async function runAction(action, id, amount, targetBranch = branchId) {
  if (!state || !saveAvailable || busy) return false;
  busy = true;
  const oldBike = action === 'sell' ? activeBranch().garage.find(bike=>bike.id === id) : undefined;
  try {
    const result = await transact(action,id,amount,targetBranch);
    if (result.error) {
      acceptTime(result.state);
      throw result.error;
    }
    if (action === 'toggle-clock' || action === 'hold-buyer') {
      acceptTime(result.state);
      if (action === 'toggle-clock') startTicker();
      return true;
    }
    state = result.state;
    const isPurchase = ['buy','buy-negotiated'].includes(action);
    const animationBike = isPurchase
      ? state.branches.find(branch=>branch.id===targetBranch).garage.find(bike=>bike.id===id) : oldBike;
    if (isPurchase) {
      if (byId('listing-detail').open) byId('listing-detail').close();
      branchId = targetBranch;
      bayPage = Math.floor(animationBike.slot/2);
      showPage('garage');
    }
    render(isPurchase && animationBike.stage !== 'shipping' ? 'buy' : action,animationBike);
    notice(result.message);
    clockDisplay();
    return true;
  } catch (error) {
    notice(error.message,true);
    if (action === 'borrow' || action === 'repay') byId('credit-message').textContent = error.message;
    if (byId('meeting').open) {
      byId('meeting-error').textContent = error.message;
      byId('meeting-error').hidden = false;
    } else if (byId('listing-detail').open) {
      byId('listing-error').textContent = error.message;
      byId('listing-error').hidden = false;
    }
    return false;
  } finally { busy = false; }
}

document.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!state || !button || button.disabled) return;
  const { page, action, id, index } = button.dataset;
  if (page) {
    showPage(page);
    render();
    if (page === 'market') byId('market-title').scrollIntoView({block:'start'});
  } else if (action === 'show-complaints') {
    const panel = byId('complaint-notices');
    panel.open = true;
    panel.scrollIntoView({block:'start'});
  } else if (action === 'more-inspections') {
    archiveLimit += 20;
    renderMarket();
  } else if (action === 'open-listing') {
    openListing(id);
  } else if (action === 'open-buyer') {
    if (await runAction('hold-buyer',id,index)) openMeeting(id,index,'sale');
  } else if (action === 'meet-seller') {
    if (await runAction(action,id)) {
      const seller = state.listings.find(item=>item.id===id)?.seller;
      if (!seller) return;
      sellerReturn = id;
      if (byId('listing-detail').open) byId('listing-detail').close();
      openMeeting(id,seller.id,'purchase');
    }
  } else if (action) {
    const isBranchAction = ['hire','fire','upgrade'].includes(action);
    const amount = ['list','list-quiet'].includes(action) ? button.closest('.card').querySelector('.ask-price input').valueAsNumber
      : ['policy','pre-inspect','repair'].includes(action) ? index : Number(index);
    if (await runAction(action,id,amount,isBranchAction ? Number(id) : branchId)
        && ['pre-inspect','close-inspection','resume-inspection'].includes(action)) openListing(id);
  }
});

function openMeeting(bikeId,meetingId,kind) {
  meetingView = {bikeId,meetingId,kind,branchId};
  updateMeeting();
  if (!byId('meeting').open) byId('meeting').showModal();
}

function updateMeeting() {
  const view = meetingView;
  const isSale = view.kind === 'sale';
  const bike = isSale
    ? state.branches.find(branch=>branch.id === view.branchId)?.garage.find(item=>item.id === view.bikeId)
    : state.listings.find(item=>item.id === view.bikeId);
  const meeting = isSale ? bike?.meetings?.find(item=>item.id === view.meetingId) : bike?.seller;
  if (!meeting) { byId('meeting').close(); return; }
  const {profile} = meeting;
  byId('meeting-title').textContent = isSale ? 'Müşteri görüşmesi' : 'Satıcı görüşmesi';
  byId('meeting-role').textContent = isSale ? profile.type : 'İKİNCİ EL PAZARI';
  byId('meeting-avatar').textContent = profile.avatar;
  byId('meeting-name').textContent = profile.name;
  byId('meeting-job').textContent = `${profile.age} yaş · ${profile.job}`;
  byId('meeting-speech').textContent = meeting.speech;
  const evidence = byId('meeting-evidence');
  const concealed = isSale && bike.disclosureMode==='conceal';
  const reports = bike.inspections?.filter(report=>report.result) ?? [];
  const verified = !isSale ? verifiedFindings(bike) : [];
  evidence.hidden = isSale ? !meeting.request && (concealed || !historicalIssues(bike).length) : !reports.length;
  evidence.replaceChildren();
  if (!evidence.hidden) {
    const details = element('details','','risk-panel');
    const title = !isSale ? 'Pazarlıkta ekspertiz bulguları'
      : meeting.request==='inspection' ? 'Müşteri ekspertiz istedi' : 'Müşteri hasar kaydını inceliyor';
    details.append(element('summary',title));
    if (!isSale) {
      details.open = true;
      const findings = verified.map(code=>PARTS[code].name).join(', ');
      details.append(element('p',findings || 'İncelenen alanlarda hasar tespit edilmedi.','spec'));
      for (const report of reports) details.append(reportCard(report));
    } else if (concealed) details.append(element('p','Hasar bilgisi paylaşılmadı.','spec'));
    else {
      details.append(issueDetails(bike,{active:false}));
      for (const report of bike.inspections ?? []) if (report.result) details.append(reportCard(report));
      if (bike.garageInspection) details.append(reportCard(bike.garageInspection));
      if (bike.lastRepair) details.append(repairComparison(bike.lastRepair,'Son onarım'));
    }
    evidence.append(details);
  }
  const rights = Math.min(MAX_ROUNDS - meeting.round,meeting.patience);
  byId('meeting-round').textContent = `Sabır ${meeting.patience}/${profile.patience} · Kalan hak ${meeting.status === 'open' ? rights : 0}`;
  byId('meeting-patience').max = profile.patience;
  byId('meeting-patience').value = meeting.patience;
  byId('meeting-bike').textContent = bike.name;
  byId('meeting-spec').textContent = bikeSpecs(isSale ? bike : visibleListing(bike));
  byId('meeting-image').setAttribute('aria-label',bike.name);
  renderSprite(byId('meeting-image'),byId('meeting-image-missing'),bike,byId('meeting-representative'));
  const value = roadValue(isSale ? bike : visibleListing(bike));
  const cost = isSale ? bike.spent : bike.price;
  const margin = meeting.price - cost;
  byId('meeting-price-label').textContent = isSale ? 'Müşteri teklifi' : 'Satıcının fiyatı';
  byId('meeting-price').textContent = money(meeting.price);
  const forecast = isSale ? null : purchaseAnalysis(bike,meeting);
  const profit = isSale ? Math.round(margin*100)/100 : forecast.profit;
  byId('meeting-analysis').hidden = isSale;
  if (forecast) renderPurchaseAnalysis(byId('meeting-analysis-content'),forecast);
  byId('meeting-metrics').replaceChildren(
    metric(isSale ? 'Toplam maliyet' : 'İlan fiyatı',money(cost)),
    metric('Piyasa değeri',money(value)),
    metric(`${isSale ? 'Net' : 'Tahmini net'} ${profit < 0 ? 'zarar' : 'kâr'}`,signed(profit)),
    ...(forecast?.delivery.days ? [metric(`Nakliye · ${deliveryLabel(forecast.delivery)}`,money(forecast.delivery.fee))] : []));
  const scale = Math.max(meeting.price,cost,value,1);
  const bars = byId('meeting-bars');
  const markers = [[isSale ? 'Maliyet' : 'İlan fiyatı',cost],['Piyasa',value],['Teklif',meeting.price]];
  bars.setAttribute('aria-label',markers.map(([name,amount])=>`${name} ${money(amount)}`).join(' · '));
  const axis = element('div','','price-axis');
  const legend = element('div','','price-legend');
  markers.forEach(([name,amount],index)=>{
    const marker = element('span','','price-marker marker-' + index);
    marker.style.left = `${Math.max(2,Math.min(98,amount / scale * 100))}%`;
    axis.append(marker);
    const key = element('span',name,'legend-' + index);
    legend.append(key);
  });
  bars.replaceChildren(axis,legend);
  byId('meeting-error').hidden = true;
  const active = isActive(meeting);
  const canNegotiate = meeting.status==='open' && rights>0 && (isSale || !bike.inspections?.some(report=>!report.result));
  byId('live-purchase-prices').hidden = isSale;
  const negotiateButton = byId('meeting-negotiate');
  negotiateButton.textContent = isSale ? 'Pazarlık yap' : 'Teklifi gönder';
  negotiateButton.disabled = !canNegotiate;
  if (!isSale) showOfferEditor(view,forecast,meeting,canNegotiate);
  byId('meeting-reject').hidden = !active;
  byId('meeting-confirm').hidden = !active;
  byId('meeting-confirm').textContent = `${isSale ? 'Sat' : 'Satın al'} · ${money(meeting.price+(forecast?.delivery.fee ?? 0))}`;
}

async function meetingAction(action,amount) {
  const view = meetingView;
  if (!view || !await runAction(action,view.bikeId,amount,view.branchId)) return;
  if (action === 'sell' || action === 'buy-negotiated') byId('meeting').close();
  else updateMeeting();
}

byId('meeting-negotiate').addEventListener('click',()=>{
  const view = meetingView;
  if (!view) return;
  if (view.kind==='sale') meetingAction('negotiate',view.meetingId);
  else meetingAction('offer-purchase',{meetingId:view.meetingId,price:view.draft});
});
byId('meeting-reject').addEventListener('click',()=>meetingAction('reject',meetingView.meetingId));
byId('meeting-confirm').addEventListener('click',()=>meetingAction(meetingView.kind === 'sale' ? 'sell' : 'buy-negotiated',meetingView.meetingId));

byId('meeting').addEventListener('close',()=>{
  const id = sellerReturn;
  sellerReturn = undefined;
  if (id && currentPage === 'market') openListing(id);
});

byId('branch').addEventListener('change', event => {
  branchId = Number(event.target.value);
  bayPage = 0;
  render();
});
byId('bays-prev').addEventListener('click', () => { bayPage -= 1; render(); });
byId('bays-next').addEventListener('click', () => { bayPage += 1; render(); });
byId('credit-form').addEventListener('submit', async event => {
  event.preventDefault();
  const amount = byId('credit-amount');
  byId('credit-message').textContent = '';
  if (event.submitter && await runAction(event.submitter.value, undefined, amount.valueAsNumber)) amount.value = '';
});

const brands = [...new Set(catalog.map(model=>model.brand))].sort((a,b)=>a.localeCompare(b,'tr'));
byId('filter-brand').append(...brands.map(brand=>new Option(brand,brand)));
byId('filter-category').append(...Object.entries(categoryLabel).map(([id,label])=>new Option(label,id)));
byId('dev-audit-link').hidden = new URLSearchParams(location.search).get('dev') !== '1';

function updateFilterModels() {
  const brand = byId('filter-brand').value;
  const select = byId('filter-model');
  const selected = select.value;
  const options = catalog.filter(model=>!brand || model.brand === brand)
    .sort((a,b)=>a.name.localeCompare(b.name,'tr'));
  select.replaceChildren(new Option('Tümü',''),...options.map(model=>new Option(model.name,model.id)));
  select.value = options.some(model=>model.id === selected) ? selected : '';
}

function refreshMarketColors() {
  const select = byId('filter-color');
  const current = select.value;
  const colors = [...new Set(state.listings.map(item=>item.colorName).filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b,'tr'));
  if (current && !colors.includes(current)) colors.push(current);
  select.replaceChildren(new Option('Tümü',''),...colors.map(color=>new Option(color,color)));
  select.value = colors.includes(current) ? current : '';
}

function resetMarketPage() {
  marketPage = 0;
  if (state) renderMarket();
}

const provinceSelect = byId('filter-province');
provinceSelect.append(...[...PROVINCES].sort((a,b)=>a.name.localeCompare(b.name,'tr'))
  .map(province=>new Option(province.name,String(province.id))));
provinceSelect.addEventListener('change',resetMarketPage);
updateFilterModels();
byId('filter-toggle').addEventListener('click',()=>{
  const panel = byId('market-filters');
  panel.hidden = !panel.hidden;
  byId('filter-toggle').setAttribute('aria-expanded',String(!panel.hidden));
});
byId('market-search').addEventListener('input',resetMarketPage);
byId('market-filters').addEventListener('input',event=>{
  if (event.target === byId('filter-brand')) updateFilterModels();
  resetMarketPage();
});
byId('market-filters').addEventListener('reset',()=>setTimeout(()=>{
  byId('market-search').value = '';
  provinceSelect.value = '';
  updateFilterModels();
  resetMarketPage();
},0));
byId('market-filters').addEventListener('submit',event=>event.preventDefault());
for (const [id,delta] of [['market-prev',-1],['market-next',1]]) {
  byId(id).addEventListener('click',()=>{
    marketPage += delta;
    renderMarket();
    byId('market-title').scrollIntoView({block:'start'});
  });
}

window.addEventListener('storage',async event=>{
  if (event.key !== STORAGE_KEY || !transact || !state || document.hidden) return;
  try {
    const result = await transact('refresh');
    acceptTime(result.state);
    startTicker();
  } catch (error) { stopSaving(error); }
});
document.addEventListener('visibilitychange',async ()=>{
  clearInterval(timer);
  if (document.hidden || !state) return;
  await tickClock(true);
  startTicker();
});
window.addEventListener('pageshow',async event=>{
  if (event.persisted && state) {
    await tickClock(true);
    startTicker();
  }
});
startGame();
