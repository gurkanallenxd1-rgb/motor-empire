import {markToMarket} from './economy.mjs?v=0.16.1';
import {roadValue} from './damage.mjs?v=0.16.1';
import {ISTANBUL,shippingQuote} from './provinces.mjs?v=0.16.1';
import {isActive,MAX_ROUNDS} from './trade.mjs?v=0.18.4';
import {purchaseCosts} from './valuation.mjs?v=0.16.1';

export const INTAKE_FEE=450;

export function purchaseForecast(bike, price = bike.price, destination = ISTANBUL, economy) {
  return purchaseCosts(bike,price,INTAKE_FEE,shippingQuote(bike.province,destination),
    economy ? markToMarket({...bike},economy,destination) : bike);
}

export function managedAsking(bike,minProfit,day,reprice=false) {
  const age=Math.max(0,day-((reprice?bike.listedDay:bike.stockDay)??day));
  const markdown=reprice?Math.min(.10,age*.0035):Math.min(.045,age*.0015);
  return Math.max(1,Math.ceil(bike.spent+minProfit),Math.round(roadValue(bike)*(1-markdown)));
}

export function managedOffer(meetings,target) {
  const stalled=offer=>offer.price<target && (offer.round>=MAX_ROUNDS || !offer.patience);
  return meetings.filter(offer=>isActive(offer) && !offer.held && (!offer.round || offer.staffHandled))
    .sort((a,b)=>Number(stalled(a))-Number(stalled(b)) || b.price-a.price)[0];
}

export function shouldNegotiate(offer,target,quality) {
  return offer.status==='open' && offer.round<MAX_ROUNDS && offer.patience>0
    && (offer.price<target || quality>.68 && !offer.round);
}

export function nextManagedVisit(bike,day) {
  const wait=bike.marketTerms?Math.max(2,Math.round(bike.marketTerms.days*.44)):1;
  return day+wait+Number(bike.ask>roadValue(bike)*1.22);
}
