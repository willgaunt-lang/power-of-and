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

const inputIds = [
  'equipmentCost','visitsPerWeek','productionPerVisit','workingWeeks','variableCostPct',
  'downPayment','apr','loanTermYears','staffCost','currentAge','retirementAge','returnRate'
];

const defaults = {
  equipmentCost:50000,
  visitsPerWeek:4,
  productionPerVisit:200,
  workingWeeks:49,
  variableCostPct:9,
  downPayment:0,
  apr:6.5,
  loanTermYears:5,
  staffCost:0,
  currentAge:42,
  retirementAge:65,
  returnRate:7
};

let hasRevealed = false;
let cashChart;
let monthlyChart;
let printChartMode = false;

const money = (n, compact=false) => new Intl.NumberFormat('en-US', {
  style:'currency',
  currency:'USD',
  maximumFractionDigits:0,
  notation:compact ? 'compact' : 'standard'
}).format(Number.isFinite(n) ? n : 0);

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


function monthlyLoanPayment(principal, annualRate, months) {
  if (principal <= 0 || months <= 0) return 0;
  const monthlyRate = annualRate / 12;
  if (monthlyRate <= 0) return principal / months;
  return principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months));
}

function calculate() {
  const equipmentCost = Math.max(0, num('equipmentCost'));
  const visitsPerWeek = Math.max(0, num('visitsPerWeek'));
  const productionPerVisit = Math.max(0, num('productionPerVisit'));
  const workingWeeks = Math.min(52, Math.max(1, num('workingWeeks')));
  const variableRate = Math.min(1, Math.max(0, num('variableCostPct') / 100));
  const downPayment = Math.min(equipmentCost, Math.max(0, num('downPayment')));
  const apr = Math.max(0, num('apr') / 100);
  const loanTermYears = Math.max(0, num('loanTermYears'));
  const loanMonths = Math.round(loanTermYears * 12);
  const staffCostAnnual = Math.max(0, num('staffCost'));
  const currentAge = Math.max(18, num('currentAge'));
  const retirementAge = Math.max(currentAge, num('retirementAge'));
  const annualReturn = Math.max(0, num('returnRate') / 100);
  const yearsToRetirement = Math.max(0, retirementAge - currentAge);
  const retirementMonths = Math.round(yearsToRetirement * 12);

  const financedAmount = Math.max(0, equipmentCost - downPayment);
  const monthlyPayment = monthlyLoanPayment(financedAmount, apr, loanMonths);
  const annualDebtService = monthlyPayment * 12;

  const annualGrossProduction = visitsPerWeek * productionPerVisit * workingWeeks;
  const annualVariableCost = annualGrossProduction * variableRate;
  const annualOperatingContribution = annualGrossProduction - annualVariableCost - staffCostAnnual;
  const monthlyOperatingContribution = annualOperatingContribution / 12;
  const annualCashDuringFinancing = annualOperatingContribution - annualDebtService;
  const annualPostLoanContribution = annualOperatingContribution;

  const contributionPerVisit = productionPerVisit * (1 - variableRate);
  let breakEvenVisits = Infinity;
  if (contributionPerVisit > 0 && workingWeeks > 0) {
    breakEvenVisits = (annualDebtService + staffCostAnnual) / (contributionPerVisit * workingWeeks);
  }

  const fiveYearMonths = 60;
  let fiveYearCash = -downPayment;
  const cashLabels = ['Today'];
  const cashSeries = [fiveYearCash];
  for (let month = 1; month <= fiveYearMonths; month++) {
    const debtPayment = month <= loanMonths ? monthlyPayment : 0;
    fiveYearCash += monthlyOperatingContribution - debtPayment;
    if (month % 12 === 0) {
      cashLabels.push(`Year ${month/12}`);
      cashSeries.push(fiveYearCash);
    }
  }

  const monthlyInvestmentReturn = annualReturn > 0 ? Math.pow(1 + annualReturn, 1/12) - 1 : 0;
  let retirementWealth = -downPayment * Math.pow(1 + monthlyInvestmentReturn, retirementMonths);
  for (let month = 1; month <= retirementMonths; month++) {
    const debtPayment = month <= loanMonths ? monthlyPayment : 0;
    const monthlyNetCash = monthlyOperatingContribution - debtPayment;
    const remainingMonths = retirementMonths - month;
    retirementWealth += monthlyNetCash * Math.pow(1 + monthlyInvestmentReturn, remainingMonths);
  }

  const ratio = Number.isFinite(breakEvenVisits) && breakEvenVisits > 0 ? visitsPerWeek / breakEvenVisits : 0;

  $('breakEvenVisits').textContent = Number.isFinite(breakEvenVisits) ? breakEvenVisits.toFixed(1) : '—';
  $('enteredVisitsLabel').textContent = `Entered: ${visitsPerWeek.toFixed(1).replace('.0','')}/week`;
  $('annualProductionVisual').textContent = money(annualGrossProduction);
  $('monthlyPayment').textContent = money(monthlyPayment);
  $('financingNote').textContent = financedAmount > 0
    ? `${money(financedAmount)} financed for ${loanTermYears} years at ${(apr*100).toFixed(2).replace(/\.00$/,'')}% APR`
    : 'No financed balance under the entered assumptions';
  $('annualCashFlow').textContent = money(annualCashDuringFinancing);
  $('fiveYearCash').textContent = money(fiveYearCash);
  $('retirementWealth').textContent = money(retirementWealth);
  $('postLoanContribution').textContent = `${money(annualPostLoanContribution)}/yr`;
  $('yearsToRetirement').textContent = `${yearsToRetirement}`;
  $('breakEvenRatio').textContent = ratio > 0 ? `${ratio.toFixed(1)}×` : '—';

  if (Number.isFinite(breakEvenVisits)) {
    $('breakEvenExplanation').textContent = `to cover approximately ${money(monthlyPayment)} per month in equipment payments plus the entered incremental staffing cost.`;
    $('scenarioSummary').textContent = `At ${visitsPerWeek.toFixed(1).replace('.0','')} additional visits per week and ${money(productionPerVisit)} of average production per visit, this room is projected to produce ${money(annualGrossProduction)} per year.`;
  } else {
    $('breakEvenExplanation').textContent = 'Break-even cannot be calculated until the average production per visit is greater than the variable cost of providing that care.';
    $('scenarioSummary').textContent = 'Adjust the production and variable-cost assumptions to calculate the room opportunity.';
  }

  if (!Number.isFinite(breakEvenVisits)) {
    $('utilizationStory').textContent = 'Enter a positive contribution per visit to calculate break-even utilization.';
  } else if (breakEvenVisits === 0) {
    $('utilizationStory').textContent = 'With no equipment payment or incremental staffing cost, every additional productive visit contributes positive cash flow under these assumptions.';
  } else if (visitsPerWeek >= breakEvenVisits) {
    const excessVisits = Math.max(0, visitsPerWeek - breakEvenVisits);
    $('utilizationStory').textContent = `Your entered utilization is ${ratio.toFixed(1)}× break-even — about ${excessVisits.toFixed(1)} additional visits per week beyond the level needed to cover the entered equipment and staffing costs.`;
  } else {
    $('utilizationStory').textContent = `The entered utilization is below break-even. The room would need about ${(breakEvenVisits - visitsPerWeek).toFixed(1)} more visits per week, higher production per visit, lower incremental costs, or a different financing structure to cover itself.`;
  }

  const gaugeMax = Math.max(1, visitsPerWeek * 1.2, Number.isFinite(breakEvenVisits) ? breakEvenVisits * 1.4 : 1);
  const enteredPct = Math.min(100, Math.max(0, visitsPerWeek / gaugeMax * 100));
  const breakEvenPct = Number.isFinite(breakEvenVisits) ? Math.min(100, Math.max(0, breakEvenVisits / gaugeMax * 100)) : 100;
  $('enteredVisitsBar').style.width = `${enteredPct}%`;
  $('breakEvenMarker').style.left = `${breakEvenPct}%`;

  if (Number.isFinite(breakEvenVisits) && visitsPerWeek >= breakEvenVisits && annualCashDuringFinancing >= 0) {
    $('storyHeadline').textContent = `The room does not need to be busy all week to justify the investment.`;
    $('storyCopy').textContent = `At the entered assumptions, ${breakEvenVisits.toFixed(1)} visits per week cover the equipment and incremental staffing costs. At ${visitsPerWeek.toFixed(1).replace('.0','')} visits per week, the room is projected to generate about ${money(annualCashDuringFinancing)} of annual cash flow during financing and about ${money(annualPostLoanContribution)} per year after the loan is paid off.`;
  } else if (Number.isFinite(breakEvenVisits)) {
    $('storyHeadline').textContent = `Use the break-even number to find a realistic operating plan.`;
    $('storyCopy').textContent = `At the entered assumptions, the room needs approximately ${breakEvenVisits.toFixed(1)} additional visits per week to cover its equipment and incremental staffing costs. Adjust utilization, production or financing until the scenario reflects what the practice can realistically achieve.`;
  } else {
    $('storyHeadline').textContent = 'Build a realistic room scenario.';
    $('storyCopy').textContent = 'The calculator needs a positive contribution per visit before it can estimate break-even utilization.';
  }

  updateCharts(cashLabels, cashSeries, monthlyOperatingContribution, monthlyPayment);
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

function updateCharts(cashLabels, cashSeries, monthlyContribution, monthlyPayment) {
  if (typeof Chart === 'undefined') return;
  const styles = getComputedStyle(document.documentElement);
  const dciBlue = styles.getPropertyValue('--dci-blue').trim() || '#3a6d8e';
  const dciGray = styles.getPropertyValue('--dci-gray').trim() || '#54565b';
  const softGrid = '#e5e7e8';
  const printMode = printChartMode;

  if (printMode) {
    preparePrintCanvas('cashChart');
    preparePrintCanvas('monthlyChart');
  }

  const common = {
    responsive:!printMode,
    maintainAspectRatio:false,
    animation: printMode ? false : undefined,
    layout: printMode ? {padding:{top:2,right:7,bottom:9,left:3}} : {},
    plugins:{
      legend:{labels:{usePointStyle:true,boxWidth:8,font:{family:chartFont(),size:printMode ? 9 : 13},padding:printMode ? 8 : 10}},
      tooltip:{enabled:!printMode,titleFont:{family:chartFont()},bodyFont:{family:chartFont()},callbacks:{label:c=>`${c.dataset.label}: ${money(c.raw)}`}}
    },
    scales:{
      y:{ticks:{callback:v=>money(v,true),font:{family:chartFont(),size:printMode ? 8 : 12},maxTicksLimit:printMode ? 6 : undefined},grid:{color:softGrid}},
      x:{ticks:{font:{family:chartFont(),size:printMode ? 8 : 12},autoSkip:true,maxTicksLimit:printMode ? 6 : undefined,maxRotation:0,minRotation:0,padding:printMode ? 5 : 3},grid:{display:false}}
    }
  };

  if (cashChart) cashChart.destroy();
  cashChart = new Chart($('cashChart'), {
    type:'line',
    data:{labels:cashLabels,datasets:[{
      label:'Cumulative net cash',
      data:cashSeries,
      borderColor:dciBlue,
      backgroundColor:'rgba(58,109,142,.12)',
      fill:true,
      tension:.2,
      pointRadius:printMode ? 1.5 : 3
    }]},
    options:common
  });

  if (monthlyChart) monthlyChart.destroy();
  monthlyChart = new Chart($('monthlyChart'), {
    type:'bar',
    data:{
      labels:printMode ? ['Room contribution','Payment'] : ['Monthly room contribution','Equipment payment'],
      datasets:[{label:'Monthly amount',data:[monthlyContribution,monthlyPayment],backgroundColor:[dciBlue,dciGray],borderRadius:2,maxBarThickness:printMode ? 70 : undefined}]
    },
    options:{...common,plugins:{...common.plugins,legend:{display:false}}}
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
  $('advancedDetails').open = false;
  hasRevealed = false;
  $('results').hidden = true;
  $('results').classList.remove('revealed');
  $('printButton').disabled = true;
  calculate();
  $('unbookedBuilder').scrollIntoView({behavior:'smooth',block:'start'});
}

window.addEventListener('DOMContentLoaded', () => {
  setupMoneyFieldFormatting();
  inputIds.forEach(id => $(id).addEventListener('input', () => {
    if (hasRevealed) calculate();
  }));
  $('revealButton').addEventListener('click', revealResults);
  $('editButton').addEventListener('click', () => $('unbookedBuilder').scrollIntoView({behavior:'smooth',block:'start'}));
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
