const $ = id => document.getElementById(id);
const inputIds = ['dciRooms','dciCost','altRooms','altCost','revenuePerRoom','margin','growth','delayYears','currentAge','retirementAge','returnRate'];
const defaults = {dciRooms:5,dciCost:22000,altRooms:3,altCost:37000,revenuePerRoom:250000,margin:35,growth:3,delayYears:'2',currentAge:42,retirementAge:65,returnRate:7};
let costChart, profitChart;

const money = (n, compact=false) => new Intl.NumberFormat('en-US', {
  style:'currency', currency:'USD', maximumFractionDigits:0,
  notation:compact ? 'compact' : 'standard'
}).format(Math.abs(n) || 0);
const num = id => Number($(id).value) || 0;
const plural = (n, one, many=`${one}s`) => Math.abs(n) === 1 ? one : many;

// Snapshot logic: at the exact selected time, the alternative has just caught up.
function alternativeRoomsAtSnapshot(timeYears, startingRooms, targetRooms, delay) {
  if (startingRooms >= targetRooms) return startingRooms;
  if (delay === 'never') return startingRooms;
  return timeYears >= Number(delay) ? targetRooms : startingRooms;
}

// Production-period logic: a 3-year selection includes the full period ending at year 3.
function alternativeRoomsDuringPeriod(periodEndYears, startingRooms, targetRooms, delay) {
  if (startingRooms >= targetRooms) return startingRooms;
  if (delay === 'never') return startingRooms;
  return periodEndYears <= Number(delay) ? startingRooms : targetRooms;
}

function calculate() {
  const dciRooms = Math.max(1, num('dciRooms'));
  const altRooms = Math.max(1, num('altRooms'));
  const dciCost = num('dciCost');
  const altCost = num('altCost');
  const revenue = num('revenuePerRoom');
  const margin = num('margin') / 100;
  const growth = num('growth') / 100;
  const delay = $('delayYears').value;
  const currentAge = num('currentAge');
  const retirementAge = Math.max(currentAge, num('retirementAge'));
  const annualReturn = num('returnRate') / 100;
  const yearsToRetire = Math.max(0, retirementAge - currentAge);

  const dciTotal = dciRooms * dciCost;
  const altTotal = altRooms * altCost;
  const signedCapitalDifference = altTotal - dciTotal;
  const roomAdvantage = dciRooms - altRooms;
  const currentAnnualProfitAdvantage = roomAdvantage * revenue * margin;

  const comparisonYears = delay === 'never' ? yearsToRetire : Math.min(Number(delay), yearsToRetire);
  const periods = Math.max(0, Math.round(comparisonYears * 2));
  const halfYearReturn = Math.pow(1 + annualReturn, 0.5) - 1;

  let totalProfitAdvantage = 0;
  const capitalFutureValue = signedCapitalDifference * Math.pow(1 + annualReturn, yearsToRetire);
  let profitFutureValue = 0;
  const chartLabels = ['Today'];
  const chartSeries = [0];
  let cumulativeAdvantage = 0;

  // Model each six-month production period and invest its profit at period end.
  for (let period = 1; period <= periods; period++) {
    const periodEndYears = period / 2;
    const periodStartYears = periodEndYears - 0.5;
    const altRoomsInService = alternativeRoomsDuringPeriod(periodEndYears, altRooms, dciRooms, delay);
    const revenueGrowthFactor = Math.pow(1 + growth, periodStartYears);
    const halfYearProfitDifference = (dciRooms - altRoomsInService) * revenue * revenueGrowthFactor * margin * 0.5;

    totalProfitAdvantage += halfYearProfitDifference;
    cumulativeAdvantage += halfYearProfitDifference;

    const remainingYears = Math.max(0, yearsToRetire - periodEndYears);
    profitFutureValue += halfYearProfitDifference * Math.pow(1 + annualReturn, remainingYears);

    chartLabels.push(periodEndYears % 1 === 0 ? `Year ${periodEndYears}` : `${periodEndYears} yr`);
    chartSeries.push(cumulativeAdvantage);
  }

  const retirementValue = capitalFutureValue + profitFutureValue;

  $('roomAdvantage').textContent = roomAdvantage > 0 ? `+${roomAdvantage}` : String(roomAdvantage);
  $('capitalDifference').textContent = `${signedCapitalDifference >= 0 ? '+' : '−'}${money(signedCapitalDifference)}`;
  $('capitalDifferenceNote').textContent = signedCapitalDifference >= 0
    ? 'Capital retained with the DCI Edge configuration'
    : 'Additional upfront investment for the DCI Edge configuration';
  $('profitDifference').textContent = `${totalProfitAdvantage >= 0 ? '+' : '−'}${money(totalProfitAdvantage)}`;
  $('retirementDifference').textContent = `${retirementValue >= 0 ? '+' : '−'}${money(retirementValue)}`;
  $('capitalFutureValue').textContent = `${capitalFutureValue >= 0 ? '+' : '−'}${money(capitalFutureValue)}`;
  $('profitFutureValue').textContent = `${profitFutureValue >= 0 ? '+' : '−'}${money(profitFutureValue)}`;
  $('annualProfitAdvantage').textContent = `${currentAnnualProfitAdvantage >= 0 ? '+' : '−'}${money(currentAnnualProfitAdvantage)}/yr`;

  const delayText = delay === 'never' ? 'never catches up' : `catches up at the end of ${delay} ${plural(Number(delay), 'year')}`;
  if (roomAdvantage > 0) {
    $('scenarioSummary').textContent = `DCI Edge opens with ${dciRooms} operatories versus ${altRooms} with the alternative. The alternative ${delayText}.`;
    $('storyHeadline').textContent = `Put ${roomAdvantage} more ${plural(roomAdvantage, 'operatory', 'operatories')} to work from day one.`;
    $('storyCopy').textContent = `At the selected production and margin assumptions, those rooms represent approximately ${money(currentAnnualProfitAdvantage)} in additional annual operating profit while the room advantage remains.`;
  } else if (roomAdvantage === 0) {
    $('scenarioSummary').textContent = `Both options open with ${dciRooms} operatories, so the comparison is driven by the equipment-package investment.`;
    $('storyHeadline').textContent = 'The room count is the same in both scenarios.';
    $('storyCopy').textContent = 'Adjust either operatory count to model the growth impact of putting more rooms into service at opening.';
  } else {
    $('scenarioSummary').textContent = `The alternative opens with ${Math.abs(roomAdvantage)} more ${plural(roomAdvantage, 'operatory', 'operatories')} than the DCI Edge scenario.`;
    $('storyHeadline').textContent = 'The alternative begins with more rooms in this scenario.';
    $('storyCopy').textContent = 'Adjust the room counts or pricing to build the comparison you want to demonstrate.';
  }

  $('profitPeriodLabel').textContent = delay === 'never'
    ? `Modeled from today through retirement at age ${retirementAge}`
    : `Includes the full ${delay}-year production advantage`;
  $('timelineCaption').textContent = delay === 'never' ? 'Alternative never reaches the DCI room count' : `Catch-up occurs at the end of year ${delay}`;

  renderTimeline(dciRooms, altRooms, delay);
  updateCharts(dciTotal, altTotal, chartLabels, chartSeries);
}

function renderTimeline(dciRooms, altRooms, delay) {
  const root = $('timeline');
  root.innerHTML = '';
  const maxYears = delay === 'never' ? 5 : Math.min(5, Math.ceil(Number(delay)));
  const points = [0];
  for (let t = 0.5; t <= maxYears; t += 0.5) points.push(t);

  points.forEach(time => {
    const altInService = time === 0 ? altRooms : alternativeRoomsAtSnapshot(time, altRooms, dciRooms, delay);
    const maxRooms = Math.max(dciRooms, altRooms, 1);
    const row = document.createElement('div');
    row.className = 'timeline-row';
    row.innerHTML = `
      <span class="timeline-label">${time === 0 ? 'Today' : time % 1 === 0 ? `Year ${time}` : `${time} yr`}</span>
      <div class="op-track" title="DCI Edge: ${dciRooms} rooms"><div class="op-bar dci" style="width:${Math.max(8, dciRooms/maxRooms*100)}%">DCI Edge · ${dciRooms}</div></div>
      <div class="op-track" title="Alternative: ${altInService} rooms"><div class="op-bar alt" style="width:${Math.max(8, altInService/maxRooms*100)}%">Alternative · ${altInService}</div></div>`;
    root.appendChild(row);
  });
}

function updateCharts(dciTotal, altTotal, labels, profitSeries) {
  const common = {
    responsive:true,
    maintainAspectRatio:false,
    plugins:{
      legend:{labels:{usePointStyle:true,boxWidth:8,font:{family:'Inter'}}},
      tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${money(c.raw)}`}}
    },
    scales:{
      y:{ticks:{callback:v=>money(v,true)},grid:{color:'#e8eef1'}},
      x:{grid:{display:false}}
    }
  };

  if (costChart) costChart.destroy();
  costChart = new Chart($('costChart'), {
    type:'bar',
    data:{labels:['DCI Edge','Alternative Brand'],datasets:[{label:'Equipment investment',data:[dciTotal,altTotal],backgroundColor:['#063b63','#8799a6'],borderRadius:8}]},
    options:{...common,plugins:{...common.plugins,legend:{display:false}}}
  });

  if (profitChart) profitChart.destroy();
  profitChart = new Chart($('profitChart'), {
    type:'line',
    data:{labels,datasets:[{label:'Cumulative additional operating profit',data:profitSeries,borderColor:'#063b63',backgroundColor:'rgba(6,59,99,.12)',fill:true,tension:.25,pointRadius:2}]},
    options:common
  });
}

function reset() {
  Object.entries(defaults).forEach(([key,value]) => $(key).value = value);
  calculate();
}

window.addEventListener('DOMContentLoaded', () => {
  inputIds.forEach(id => $(id).addEventListener('input', calculate));
  $('resetButton').addEventListener('click', reset);
  $('printButton').addEventListener('click', () => window.print());
  $('currentYear').textContent = new Date().getFullYear();
  calculate();
});
