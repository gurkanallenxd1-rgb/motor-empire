import {
  BRANCH_COST, DAILY_WAGE, GARAGE_LEVELS, INSPECTION_FEE, LOAN_LIMIT, PARTS, RENTAL_DAYS,
  assets, branchCapacity, dailyTotals, estimatedListingProfit, loadGame, newGame, operatingCost,
  perform, rentalRate, repairCapacity, repairPartCost, repairQuote, realizedSales, roadValue, saveGame,
} from './game.mjs?v=0.7.1';
import { createGarageRenderer } from './art.mjs?v=0.7.1';
import { catalog, categoryLabel, filterListings, gradeLabel, listingGrade, modelOf, segmentLabel, specsFor } from './bikes.mjs?v=0.7.1';

import { MAX_ROUNDS, isActive, tradeSummary } from './trade.mjs?v=0.7.1';
import { loadSprite, renderSprite, spriteFor } from './sprite.mjs?v=0.7.1';

const byId = id => document.getElementById(id);
let drawGarage;
const numeric = new Intl.NumberFormat('tr-TR');
const money = value => `${numeric.format(value)} TL`;
const signed = value => value > 0 ? `+${money(value)}` : money(value);
const stages = {
  unchecked: 'Ekspertiz bekliyor', inspected: 'Tamir bekliyor',
  repairing: 'Tamirde', ready: 'Satışa hazır', listed: 'Satışta', rented: 'Kirada',
};

let state;
let branchId = 1;
let bayPage = 0;
let currentPage = 'home';
let historyLimit = 30;
let meetingView;
let sellerReturn;
let marketPage = 0;
const LISTINGS_PER_PAGE = 10;
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

try {
  state = loadGame(window.localStorage);
  saveGame(window.localStorage, state);
} catch {
  state ??= newGame();
  saveAvailable = false;
  notice('Kayıt okunamadı veya yazılamadı. Bu oturumun ilerlemesi kaydedilmeyecek.', true);
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
  if (bike.stage === 'unchecked') {
    card.append(actionButton(`Ekspertiz · ${money(INSPECTION_FEE)}`, 'inspect', bike.id, state.cash < INSPECTION_FEE));
  } else if (bike.stage === 'inspected') {
    const quote = repairQuote(bike);
    const list = element('ul', '', 'parts');
    for (const fault of bike.faults) {
      const part = PARTS[fault];
      list.append(element('li', `${part.name} · ${money(repairPartCost(bike,fault))} · ${part.hours} sa.`));
    }
    card.append(list, element('p', `Toplam işçilik · ${quote.hours} saat`, 'spec'),
      actionButton(`Tamire başla · ${money(quote.cost)}`, 'repair', bike.id, state.cash < quote.cost));
  } else if (bike.stage === 'repairing') {
    const progress = bike.readyDay ? `Teslim · Gün ${bike.readyDay}` : `Kalan işçilik · ${bike.remainingHours} saat`;
    card.append(element('p', progress, 'spec'));
  } else if (bike.stage === 'ready') {
    const rentActions = element('div', '', 'quick-actions rent-actions');
    rentActions.setAttribute('aria-label','Kiralama süresi');
    rentActions.setAttribute('role','group');
    for (const days of RENTAL_DAYS) {
      const button = actionButton(`${days} gün`, 'rent', bike.id, false, days);
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
    card.append(actionButton('Satışa çıkar', 'list', bike.id),
      element('p', `Kiralama · ${money(rentalRate(bike))} / gün`, 'spec rental-rate'), rentActions);
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
  card.setAttribute('aria-label',`${listing.name} · ${money(listing.price)} · İlan detayı`);
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

  const details = element('span','','listing-details');
  details.append(element('strong',listing.name,'listing-name'),
    element('span',`${listing.year} · ${numeric.format(listing.km)} km · ${listing.colorName || 'Renk belirtilmedi'}`,'spec listing-meta'),
    element('span',`Kondisyon %${listing.condition ?? 100} · ${gradeLabel[listingGrade(listing)]}`,'spec listing-meta'));
  const values = element('span','','listing-values');
  values.append(element('strong',money(listing.price),'price'),
    element('span',`Tahmini satış ${money(roadValue(listing))}`,'spec'));
  card.append(media,details,values);
  return card;
}

function openListing(id) {
  const listing = state.listings.find(item=>item.id === id);
  if (!listing) return;
  const dialog = byId('listing-detail');
  byId('listing-name').textContent = listing.name;
  byId('listing-class').textContent = listingClass(listing);
  byId('listing-spec').textContent = bikeSpecs(listing);
  byId('listing-error').hidden = true;
  byId('listing-image').setAttribute('aria-label',listing.name);
  renderSprite(byId('listing-image'),byId('listing-image-missing'),listing,byId('listing-representative'));
  byId('listing-prices').replaceChildren(metric('İlan fiyatı',money(listing.price)),
    metric('Tahmini satış',money(roadValue(listing))),metric('Tahmini kâr',signed(estimatedListingProfit(listing))));
  const branch = activeBranch();
  const reason = branch.garage.length >= branchCapacity(branch) ? 'Garaj dolu'
    : state.cash < listing.price ? 'Yetersiz bakiye' : '';
  const buy = actionButton(reason || 'Satın al · '+money(listing.price),'buy',id,Boolean(reason));
  buy.classList.add('primary');
  const canNegotiate = !listing.seller || isActive(listing.seller);
  const talk = actionButton(isActive(listing.seller) ? 'Görüşmeye dön'
    : canNegotiate ? 'Satıcıyla pazarlık' : 'Görüşme kapandı','meet-seller',id,!canNegotiate);
  byId('listing-detail-actions').replaceChildren(talk,buy);
  if (!dialog.open) {
    dialog.showModal();
    dialog.scrollTop = 0;
  }
}

function renderMarket() {
  const readLimit = id => {
    const field = byId(id);
    return field.value === '' ? null : field.valueAsNumber;
  };
  const listings = filterListings(state.listings, {
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
  const visibleBikes = branch.garage.filter(item => inFrame(item) && item.stage !== 'rented');
  byId('garage').dataset.occupied = branch.garage.some(inFrame);
  byId('garage').replaceChildren(garageCard(offset), garageCard(offset + 1));
  drawGarage(visibleBikes, action, bike && inFrame(bike) ? bike : undefined, offset, branch.id);
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

function historyRow(label, description, amount, style = '') {
  const row = element('div', '', 'sale');
  const detail = element('div', '');
  detail.append(element('b', label), element('p', description, 'spec'));
  row.append(detail, element('strong', amount, style));
  return row;
}

function renderFinance(today, worth) {
  const salesToday = realizedSales(state.sales,state.day);
  byId('finance-summary').replaceChildren(
    metric('Bugünkü gelir', money(today.income)), metric('Bugünkü gider', money(today.expenses)),
    metric('Bugünkü nakit farkı', signed(today.net)),
    metric('Bugünkü satış geliri',money(salesToday.revenue)), metric('Bugünkü satış kârı',signed(salesToday.profit)),
    metric('Toplam varlık', money(worth.total)),
    metric('Net varlık', money(worth.net)), metric('Borç bakiyesi', money(state.debt)),
    metric('Motosiklet stoku', money(worth.inventory)), metric('Şube yatırımları', money(worth.equipment)));
  const summary = tradeSummary(state.trade);
  byId('finance-summary').append(metric('İtibar',`${state.trade.reputation} / 100`),
    metric('Satış başarı oranı',summary.success === null ? '—' : `%${summary.success}`),
    metric('Müşteri memnuniyeti',summary.average === null ? '—' : `%${summary.average}`));
  const outcomes = { sold:'Satıldı', bought:'Satın alındı', rejected:'Reddedildi', left:'Görüşme kesildi', expired:'Süresi doldu' };
  const history = state.trade.history.slice(0,historyLimit).map(item => historyRow(item.name,
    `Gün ${item.day} · ${item.person} · ${outcomes[item.outcome]} · ${item.rounds} tur`,money(item.price)));
  byId('trade-history').replaceChildren(...(history.length ? history : [element('p','Henüz görüşme tamamlanmadı.','muted')]));

  const available = Math.max(0, LOAN_LIMIT - state.debt);
  byId('credit-available').textContent = `Kullanılabilir borç limiti · ${money(available)}`;
  byId('borrow').disabled = available === 0;
  byId('repay').disabled = !state.debt || !state.cash;

  const days = [...new Set([...state.ledger.slice(0,historyLimit),...state.sales.slice(0,historyLimit)].map(entry=>entry.day))].sort((a,b)=>b-a);
  byId('daily-history').replaceChildren(...(days.length ? days.map(day => {
    const totals = dailyTotals(state.ledger, day);
    const salesOnDay = realizedSales(state.sales,day);
    return historyRow(`Gün ${day} · Nakit farkı`, `Gelir ${money(totals.income)} · Gider ${money(totals.expenses)} · Satış kârı ${signed(salesOnDay.profit)}`,
      signed(totals.net), totals.net < 0 ? 'negative' : 'positive');
  }) : [element('p', 'Henüz günlük finans hareketi yok.', 'muted')]));
  const branches = new Map(state.branches.map(branch => [branch.id, branch.name]));
  const labels = { income: 'Gelir', expense: 'Gider', loan: 'Borç', repayment: 'Borç ödemesi' };
  const transactions = state.ledger.slice(0, historyLimit).map(entry => historyRow(entry.label,
    `Gün ${entry.day} · ${branches.get(entry.branchId) ?? 'Genel kasa'} · ${labels[entry.kind]}`,
    signed(['expense', 'repayment'].includes(entry.kind) ? -entry.amount : entry.amount)));
  byId('transactions').replaceChildren(...(transactions.length ? transactions : [element('p', 'Henüz işlem yok.', 'muted')]));
  byId('more-history').hidden = Math.max(state.ledger.length,state.trade.history.length) <= historyLimit;

  const sales = state.sales.map(sale => {
    const profit = realizedSales([sale]).profit;
    return historyRow(sale.name, `Gün ${sale.day} · Satış ${money(sale.price)} · Maliyet ${money(sale.spent)}`,
      signed(profit), profit < 0 ? 'negative' : 'positive');
  });
  byId('sales').replaceChildren(...(sales.length ? sales : [element('p', 'Henüz satış yapılmadı.', 'muted')]));
}

function render(action, animationBike) {
  const branch = activeBranch();
  const today = dailyTotals(state.ledger, state.day);
  const worth = assets(state);
  byId('cash').textContent = money(state.cash);
  byId('day').textContent = String(state.day).padStart(2, '0');
  byId('capacity').textContent = `${branch.garage.length} / ${branchCapacity(branch)}`;
  byId('profit').textContent = signed(today.net);
  byId('profit').className = today.net < 0 ? 'negative' : today.net > 0 ? 'positive' : '';
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
  if (currentPage === 'finance') renderFinance(today, worth);
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

function runAction(action, id, amount, targetBranch = branchId) {
  let result;
  try {
    result = perform(state, action, id, amount, targetBranch);
  } catch (error) {
    notice(error.message,true);
    if (byId('meeting').open) {
      byId('meeting-error').textContent = error.message;
      byId('meeting-error').hidden = false;
    } else if (byId('listing-detail').open) {
      byId('listing-error').textContent = error.message;
      byId('listing-error').hidden = false;
    }
    return false;
  }

  const isPurchase = ['buy','buy-negotiated'].includes(action);
  const animationBike = isPurchase
    ? result.state.branches.find(branch => branch.id === branchId).garage.find(bike => bike.id === id)
    : action === 'sell' ? activeBranch().garage.find(bike => bike.id === id) : undefined;
  state = result.state;
  if (action === 'advance') marketPage = 0;
  if (isPurchase) {
    if (byId('listing-detail').open) byId('listing-detail').close();
    bayPage = Math.floor(animationBike.slot / 2);
    showPage('garage');
  }
  if (saveAvailable) {
    try {
      saveGame(window.localStorage, state);
    } catch {
      saveAvailable = false;
    }
  }
  const warning = saveAvailable ? '' : ' İlerleme kaydedilemedi.';
  render(isPurchase ? 'buy' : action, animationBike);
  notice(result.message + warning, !saveAvailable);
  return true;
}

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  const { page, action, id, index } = button.dataset;
  if (page) {
    showPage(page);
    render();
    if (page === 'market') byId('market-title').scrollIntoView({block:'start'});
  } else if (action === 'open-listing') {
    openListing(id);
  } else if (action === 'open-buyer') {
    openMeeting(id,index,'sale');
  } else if (action === 'meet-seller') {
    if (runAction(action,id)) {
      sellerReturn = id;
      if (byId('listing-detail').open) byId('listing-detail').close();
      openMeeting(id,state.listings.find(item=>item.id===id).seller.id,'purchase');
    }
  } else if (action) {
    const isBranchAction = ['hire','fire','upgrade'].includes(action);
    const amount = action === 'list' ? button.closest('.card').querySelector('.ask-price input').valueAsNumber : Number(index);
    runAction(action,id,amount,isBranchAction ? Number(id) : branchId);
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
  const rights = Math.min(MAX_ROUNDS - meeting.round,meeting.patience);
  byId('meeting-round').textContent = `Sabır ${meeting.patience}/${profile.patience} · Kalan hak ${meeting.status === 'open' ? rights : 0}`;
  byId('meeting-patience').max = profile.patience;
  byId('meeting-patience').value = meeting.patience;
  byId('meeting-bike').textContent = bike.name;
  byId('meeting-spec').textContent = bikeSpecs(bike);
  byId('meeting-image').setAttribute('aria-label',bike.name);
  renderSprite(byId('meeting-image'),byId('meeting-image-missing'),bike,byId('meeting-representative'));
  const value = roadValue(bike);
  const cost = isSale ? bike.spent : bike.price;
  const margin = meeting.price - cost;
  byId('meeting-price-label').textContent = isSale ? 'Müşteri teklifi' : 'Satıcının fiyatı';
  byId('meeting-price').textContent = money(meeting.price);
  const profit = Math.round((isSale ? margin : value-meeting.price)*100)/100;
  byId('meeting-metrics').replaceChildren(
    metric(isSale ? 'Toplam maliyet' : 'İlan fiyatı',money(cost)),
    metric('Piyasa değeri',money(value)),
    metric(isSale ? (profit < 0 ? 'Net zarar' : 'Net kâr') : 'Piyasaya göre fark',signed(profit)));
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
  byId('meeting-negotiate').disabled = meeting.status !== 'open' || rights <= 0;
  byId('meeting-reject').hidden = !active;
  byId('meeting-confirm').hidden = !active;
  byId('meeting-confirm').textContent = `${isSale ? 'Sat' : 'Satın al'} · ${money(meeting.price)}`;
}

function meetingAction(action,amount) {
  const view = meetingView;
  if (!view || !runAction(action,view.bikeId,amount,view.branchId)) return;
  if (action === 'sell' || action === 'buy-negotiated') byId('meeting').close();
  else updateMeeting();
}

byId('meeting-negotiate').addEventListener('click',()=>meetingAction('negotiate',meetingView.meetingId));
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
byId('more-history').addEventListener('click', () => { historyLimit += 30; render(); });
byId('credit-form').addEventListener('submit', event => {
  event.preventDefault();
  const amount = byId('credit-amount');
  if (event.submitter && runAction(event.submitter.value, undefined, amount.valueAsNumber)) amount.value = '';
});

render();

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
  renderMarket();
}

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
