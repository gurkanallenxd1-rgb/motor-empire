import { CAPACITY, INSPECTION_FEE, PARTS, loadGame, newGame, perform, repairQuote, saveGame } from './game.mjs';
import { createGarageRenderer } from './art.mjs';
import { categoryLabel, categoryOf, spriteUrl } from './bikes.mjs';

const byId = id => document.getElementById(id);
const drawGarage = createGarageRenderer(byId('garage-scene'), openBike);
const numeric = new Intl.NumberFormat('tr-TR');
const money = value => `${numeric.format(value)} TL`;
const signed = value => value > 0 ? `+${money(value)}` : money(value);
const stages = {
  unchecked: 'Ekspertiz bekliyor', inspected: 'Tamir bekliyor',
  repairing: 'Tamirde', ready: 'Satışa hazır', listed: 'Satışta',
};

let state;
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
  button.dataset.id = id;
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
  const bike = state.garage.find(item => item.slot === slot);
  const card = element('article', '', bike ? 'card' : 'empty');
  card.append(element('p', `BÖLME ${String(slot + 1).padStart(2, '0')}`, 'slot'));
  if (!bike) {
    card.append(element('h3', 'Boş bölme'), element('p', 'Pazardan motosiklet satın al.', 'muted'));
    return card;
  }

  card.append(element('h3', bike.name), element('p', stages[bike.stage], 'spec'),
    element('p', `Toplam maliyet · ${money(bike.spent)}`, 'spec'));
  if (bike.stage === 'unchecked') {
    card.append(actionButton(`Ekspertiz · ${money(INSPECTION_FEE)}`, 'inspect', bike.id, state.cash < INSPECTION_FEE));
  } else if (bike.stage === 'inspected') {
    const quote = repairQuote(bike);
    const list = element('ul', '', 'parts');
    for (const fault of bike.faults) {
      const part = PARTS[fault];
      list.append(element('li', `${part.name} · ${money(part.cost)} · ${part.hours} sa.`));
    }
    card.append(list, element('p', `Toplam işçilik · ${quote.hours} saat`, 'spec'),
      actionButton(`Tamire başla · ${money(quote.cost)}`, 'repair', bike.id, state.cash < quote.cost));
  } else if (bike.stage === 'repairing') {
    card.append(element('p', `Teslim · Gün ${bike.readyDay}`, 'spec'));
  } else if (bike.stage === 'ready') {
    card.append(actionButton('Satışa çıkar', 'list', bike.id));
  } else if (bike.stage === 'listed') {
    bike.offers.forEach((offer, index) => {
      const row = element('div', '', 'offer');
      const details = element('div', '');
      const profit = offer.price - bike.spent;
      details.append(element('b', offer.name), element('p', money(offer.price)),
        element('p', signed(profit), profit < 0 ? 'negative spec' : 'positive spec'));
      const button = actionButton('Kabul et', 'sell', bike.id, false, index);
      button.setAttribute('aria-label', `${offer.name} teklifini kabul et: ${money(offer.price)}`);
      row.append(details, button);
      card.append(row);
    });
  }
  return card;
}

function openBike(bike) {
  const category = categoryOf(bike);
  byId('detail-image').src = spriteUrl(category);
  byId('detail-image').alt = categoryLabel[category];
  byId('detail-name').textContent = bike.name;
  byId('detail-class').textContent = categoryLabel[category];
  byId('detail-spec').textContent = `${bike.year} · ${numeric.format(bike.km)} km · ${stages[bike.stage]}`;
  byId('bike-detail').showModal();
}

function marketCard(listing) {
  const card = element('article', '', 'card listing');
  const image = document.createElement('img');
  image.src = spriteUrl(categoryOf(listing));
  image.alt = '';
  image.decoding = 'async';
  const details = element('div', '', 'listing-details');
  details.append(element('span', categoryLabel[categoryOf(listing)], 'category'), element('h3', listing.name),
    element('p', `${listing.year} · ${numeric.format(listing.km)} km`, 'spec'),
    element('p', money(listing.price), 'price'));
  const reason = state.garage.length >= CAPACITY ? 'Garaj dolu' : state.cash < listing.price ? 'Yetersiz bakiye' : '';
  const button = actionButton(reason || 'Satın al', 'buy', listing.id, Boolean(reason));
  button.setAttribute('aria-label', `${listing.name} · ${button.textContent}`);
  card.append(image, details, button);
  return card;
}

function render(action, animationBike) {
  byId('cash').textContent = money(state.cash);
  byId('day').textContent = String(state.day).padStart(2, '0');
  byId('capacity').textContent = `${state.garage.length} / ${CAPACITY}`;
  const profit = state.sales.reduce((total, sale) => total + sale.price - sale.spent, 0);
  byId('profit').textContent = signed(profit);
  byId('profit').className = profit < 0 ? 'negative' : profit > 0 ? 'positive' : '';
  byId('market-count').textContent = `${state.listings.length} İLAN`;
  byId('garage').dataset.occupied = state.garage.length > 0;
  byId('garage').replaceChildren(...Array.from({ length: CAPACITY }, (_, slot) => garageCard(slot)));
  byId('market').replaceChildren(...state.listings.map(marketCard));

  const sales = state.sales.map(sale => {
    const row = element('div', '', 'sale');
    const profit = sale.price - sale.spent;
    const details = element('div', '');
    details.append(element('b', sale.name),
      element('p', `Gün ${sale.day} · Satış ${money(sale.price)} · Maliyet ${money(sale.spent)}`, 'spec'));
    row.append(details, element('strong', signed(profit), profit < 0 ? 'negative' : 'positive'));
    return row;
  });
  byId('sales').replaceChildren(...(sales.length ? sales : [element('p', 'Henüz satış yapılmadı.', 'muted')]));
  drawGarage(state.garage, action, animationBike);
  updateSave();
}

document.querySelector('main').addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button || button.disabled) return;
  const { action, id, index } = button.dataset;
  let result;
  try {
    result = perform(state, action, id, Number(index));
  } catch (error) {
    notice(error.message, true);
    return;
  }

  const animationBike = action === 'buy' ? result.state.garage.find(bike => bike.id === id)
    : action === 'sell' ? state.garage.find(bike => bike.id === id) : undefined;
  state = result.state;
  if (saveAvailable) {
    try {
      saveGame(window.localStorage, state);
    } catch {
      saveAvailable = false;
    }
  }
  const warning = saveAvailable ? '' : ' İlerleme kaydedilemedi.';
  render(action, animationBike);
  notice(result.message + warning, !saveAvailable);
});

render();
