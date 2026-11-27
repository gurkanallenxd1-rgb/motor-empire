import { activeIssues, cleanValue, historicalIssues, listingForecast, PARTS, roadValue } from './damage.mjs?v=0.15.2';
import { verifiedFindings, visibleListing } from './risk.mjs?v=0.15.2';

const money = value => Math.round(value*100)/100;
const ratio = (amount,base) => base ? amount/base : 0;

export function purchaseCosts(bike, price, inspectionFee, delivery) {
  const known = visibleListing(bike);
  const reports = bike.inspections ?? [];
  const feesPaid = reports.reduce((sum,report)=>sum+report.cost,0);
  const intakeFee = reports.some(report=>report.package==='full' && report.result) ? 0 : inspectionFee;
  return {delivery,feesPaid,intakeFee,...listingForecast({...known,price},feesPaid+intakeFee,delivery.fee)};
}

export const inspectionBaseline = bike =>
  bike.inspectionBaseline ?? roadValue(visibleListing(bike,{beforeInspection:true}));

export function purchasePreview(analysis, amount) {
  if (!Number.isFinite(amount) || amount<=0 || !Number.isSafeInteger(Math.round(amount*100))) return null;
  const total = money(amount+analysis.feesPaid+analysis.intakeFee+analysis.delivery.fee+analysis.cost);
  const discount = money(analysis.initialPrice-amount);
  const advantage = money(analysis.beforeValue-amount);
  const profit = money(analysis.afterValue-total);
  return {amount,total,discount,discountShare:ratio(discount,analysis.initialPrice),
    advantage,advantageShare:ratio(advantage,analysis.beforeValue),profit,profitShare:ratio(profit,total)};
}

export function purchaseValuation(bike, meeting, inspectionFee, delivery) {
  const known = visibleListing(bike);
  const verified = verifiedFindings(bike);
  const completed = bike.inspections?.some(report=>report.result) ?? false;
  const pending = bike.inspections?.some(report=>!report.result) ?? false;
  const clean = cleanValue(known);
  const beforeInspection = inspectionBaseline(bike);
  const initialPrice = meeting?.anchor ?? bike.price;
  const offer = meeting?.price ?? bike.price;
  const costs = purchaseCosts(bike,offer,inspectionFee,delivery);

  // Restore verified active parts to condition as they are excluded, then add findings
  // back in stable order. Every row is an incremental share of the existing valuation.
  // This preserves overlapping discounts and the workshop's condition model.
  const faults = activeIssues(known);
  const history = historicalIssues(known);
  const reported = new Set(verified);
  const otherFaults = faults.filter(code=>!reported.has(code));
  const otherHistory = history.filter(code=>!reported.has(code));
  const active = new Set(faults);
  const record = new Set(history);
  let missingGain = verified.reduce((sum,code)=>sum+(active.has(code) ? PARTS[code].gain : 0),0);
  const valueWith = () => roadValue({...known,faults:otherFaults,damageHistory:otherHistory,
    condition:Math.min(100,(known.condition ?? 100)+missingGain)});
  let previous = valueWith();
  const otherLoss = clean-previous;
  const findings = [...verified].sort().map(code=>{
    if (active.has(code)) {
      otherFaults.push(code);
      missingGain -= PARTS[code].gain;
    }
    if (record.has(code)) otherHistory.push(code);
    const next = valueWith();
    const loss = previous-next;
    previous = next;
    return {code,loss,share:ratio(loss,clean)};
  });
  const permanentLoss = clean-roadValue({...known,faults:[],condition:100,damageHistory:history});
  const totalLoss = clean-costs.beforeValue;
  const restoredCondition = Math.min(100,(known.condition ?? 100)+faults.reduce((sum,code)=>sum+PARTS[code].gain,0));
  const wearOnlyValue = roadValue({...known,condition:restoredCondition,faults:[],damageHistory:[]});
  const damageLoss = wearOnlyValue-costs.beforeValue;
  const difference = beforeInspection-costs.beforeValue;
  const discount = money(initialPrice-offer);
  const advantage = money(costs.beforeValue-offer);

  return {...costs,clean,initialPrice,offer,beforeInspection,completed,pending,findings,otherLoss,totalLoss,permanentLoss,
    damageLoss,damageLossShare:ratio(damageLoss,clean),totalLossShare:ratio(totalLoss,clean),permanentLossShare:ratio(permanentLoss,clean),
    difference,differenceShare:ratio(difference,beforeInspection),discount,discountShare:ratio(discount,initialPrice),
    advantage,advantageShare:ratio(advantage,costs.beforeValue),profitShare:ratio(costs.profit,costs.total)};
}
