// Keep page content aligned below the fixed responsive header.
function syncHeaderHeight() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  document.documentElement.style.setProperty('--header-height', `${Math.ceil(header.getBoundingClientRect().height)}px`);
}

syncHeaderHeight();
window.addEventListener('load', syncHeaderHeight);
window.addEventListener('resize', syncHeaderHeight);
if ('ResizeObserver' in window) {
  const header = document.querySelector('.site-header');
  if (header) new ResizeObserver(syncHeaderHeight).observe(header);
}

const $ = id => document.getElementById(id);
const inputIds = ['dciRooms','dciCost','altRooms','altCost','revenuePerRoom','margin','growth','delayYears','currentAge','retirementAge','returnRate'];
const defaults = {dciRooms:3,dciCost:24000,altRooms:2,altCost:36000,revenuePerRoom:250000,margin:35,growth:1.5,delayYears:'1.5',currentAge:35,retirementAge:65,returnRate:7};
let costChart, profitChart;
let hasRevealed = false;
let printChartMode = false;

const money = (n, compact=false) => new Intl.NumberFormat('en-US', {
  style:'currency', currency:'USD', maximumFractionDigits:0,
  notation:compact ? 'compact' : 'standard'
}).format(Math.abs(n) || 0);
const num = id => Number(String($(id).value).replace(/,/g,'')) || 0;

function formatMoneyField(el) {
  if (!el) return;
  const original = String(el.value);
  const caret = typeof el.selectionStart === 'number' ? el.selectionStart : original.length;
  const digitsBeforeCaret = (original.slice(0, caret).match(/\d/g) || []).length;
  const digits = original.replace(/\D/g, '');

  if (!digits) {
    el.value = '';
    return;
  }

  const formatted = Number(digits).toLocaleString('en-US');
  el.value = formatted;

  if (document.activeElement === el && typeof el.setSelectionRange === 'function') {
    let newCaret = 0;
    let seenDigits = 0;
    while (newCaret < formatted.length && seenDigits < digitsBeforeCaret) {
      if (/\d/.test(formatted[newCaret])) seenDigits++;
      newCaret++;
    }
    el.setSelectionRange(newCaret, newCaret);
  }
}

function formatAllMoneyFields() {
  document.querySelectorAll('.formatted-money').forEach(formatMoneyField);
}

function setupMoneyFieldFormatting() {
  document.querySelectorAll('.formatted-money').forEach(el => {
    formatMoneyField(el);
    el.addEventListener('input', () => formatMoneyField(el));
    el.addEventListener('blur', () => formatMoneyField(el));
  });
}

const plural = (n, one, many=`${one}s`) => Math.abs(n) === 1 ? one : many;

function alternativeRoomsAtSnapshot(timeYears, startingRooms, targetRooms, delay) {
  if (startingRooms >= targetRooms) return startingRooms;
  if (delay === 'never') return startingRooms;
  return timeYears >= Number(delay) ? targetRooms : startingRooms;
}

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

  let totalProfitAdvantage = 0;
  const capitalFutureValue = signedCapitalDifference * Math.pow(1 + annualReturn, yearsToRetire);
  let profitFutureValue = 0;
  const chartLabels = ['Today'];
  const chartSeries = [0];
  let cumulativeAdvantage = 0;

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
  $('timelineCaption').textContent = delay === 'never' ? 'Alternative never reaches the DCI Edge room count' : `Catch-up occurs at the end of year ${delay}`;

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

function chartFont() {
  return "'Bernina Sans Condensed','Arial Narrow',Arial,sans-serif";
}

function preparePrintCanvas(id, width=300, height=145) {
  const canvas = $(id);
  if (!canvas || !printChartMode) return;
  canvas.width = width;
  canvas.height = height;
}

function updateCharts(dciTotal, altTotal, labels, profitSeries) {
  if (typeof Chart === 'undefined') return;
  const styles = getComputedStyle(document.documentElement);
  const dciBlue = styles.getPropertyValue('--dci-blue').trim() || '#3a6d8e';
  const dciGray = styles.getPropertyValue('--dci-gray').trim() || '#54565b';
  const printMode = printChartMode;

  if (printMode) {
    preparePrintCanvas('costChart');
    preparePrintCanvas('profitChart');
  }

  const common = {
    responsive:!printMode,
    maintainAspectRatio:false,
    animation: printMode ? false : undefined,
    layout: printMode ? {padding:{top:2,right:7,bottom:8,left:3}} : {},
    plugins:{
      legend:{
        labels:{
          usePointStyle:true,
          boxWidth:8,
          font:{family:chartFont(),size:printMode ? 9 : 13},
          padding:printMode ? 8 : 10
        }
      },
      tooltip:{enabled:!printMode,titleFont:{family:chartFont()},bodyFont:{family:chartFont()},callbacks:{label:c=>`${c.dataset.label}: ${money(c.raw)}`}}
    },
    scales:{
      y:{
        ticks:{callback:v=>money(v,true),font:{family:chartFont(),size:printMode ? 8 : 12},maxTicksLimit:printMode ? 6 : undefined},
        grid:{color:'#e5e7e8'}
      },
      x:{
        ticks:{
          font:{family:chartFont(),size:printMode ? 8 : 12},
          autoSkip:true,
          maxTicksLimit:printMode ? 6 : undefined,
          maxRotation:0,
          minRotation:0,
          padding:printMode ? 4 : 3
        },
        grid:{display:false}
      }
    }
  };

  if (costChart) costChart.destroy();
  costChart = new Chart($('costChart'), {
    type:'bar',
    data:{labels:printMode ? ['DCI Edge','Alternative'] : ['DCI Edge','Alternative Brand'],datasets:[{label:'Equipment investment',data:[dciTotal,altTotal],backgroundColor:[dciBlue,dciGray],borderRadius:2,maxBarThickness:printMode ? 74 : undefined}]},
    options:{...common,plugins:{...common.plugins,legend:{display:false}}}
  });

  if (profitChart) profitChart.destroy();
  profitChart = new Chart($('profitChart'), {
    type:'line',
    data:{labels,datasets:[{label:'Cumulative additional operating profit',data:profitSeries,borderColor:dciBlue,backgroundColor:'rgba(58,109,142,.12)',fill:true,tension:.22,pointRadius:printMode ? 1.5 : 2}]},
    options:common
  });
}

function prepareChartsForPrint() {
  printChartMode = true;
  document.documentElement.classList.add('print-prep');
  calculate();
}

function restoreChartsAfterPrint() {
  if (!printChartMode) return;
  printChartMode = false;
  document.documentElement.classList.remove('print-prep');
  calculate();
}

function revealResults() {
  calculate();
  hasRevealed = true;
  $('results').hidden = false;
  $('results').classList.remove('revealed');
  void $('results').offsetWidth;
  $('results').classList.add('revealed');
  $('printButton').disabled = false;
  $('results').scrollIntoView({behavior:'smooth',block:'start'});
}

function reset() {
  Object.entries(defaults).forEach(([key,value]) => $(key).value = value);
  formatAllMoneyFields();
  hasRevealed = false;
  $('results').hidden = true;
  $('results').classList.remove('revealed');
  $('printButton').disabled = true;
  calculate();
  $('builder').scrollIntoView({behavior:'smooth',block:'start'});
}

window.addEventListener('DOMContentLoaded', () => {
  setupMoneyFieldFormatting();
  inputIds.forEach(id => $(id).addEventListener('input', () => {
    if (hasRevealed) calculate();
  }));
  $('revealButton').addEventListener('click', revealResults);
  $('editButton').addEventListener('click', () => $('builder').scrollIntoView({behavior:'smooth',block:'start'}));
  $('resetButton').addEventListener('click', reset);
  $('printButton').addEventListener('click', () => {
    if (!hasRevealed) revealResults();
    prepareChartsForPrint();
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  });
  window.addEventListener('afterprint', restoreChartsAfterPrint);
  $('currentYear').textContent = new Date().getFullYear();
  calculate();
});
