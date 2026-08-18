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
  workingWeeks:50,
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
let latestResults = {};
let logoDataUrlPromise = null;

const money = (n, compact=false) => new Intl.NumberFormat('en-US', {
  style:'currency',
  currency:'USD',
  maximumFractionDigits:0,
  notation:compact ? 'compact' : 'standard'
}).format(Number.isFinite(n) ? n : 0);

const num = id => Number($(id).value) || 0;

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

  latestResults = {
    equipmentCost, visitsPerWeek, productionPerVisit, workingWeeks, variableRate, downPayment, apr, loanTermYears, loanMonths, staffCostAnnual, currentAge, retirementAge, annualReturn, yearsToRetirement, retirementMonths, financedAmount, monthlyPayment, annualDebtService, annualGrossProduction, annualVariableCost, annualOperatingContribution, monthlyOperatingContribution, annualCashDuringFinancing, annualPostLoanContribution, contributionPerVisit, breakEvenVisits, fiveYearCash, retirementWealth, ratio, cashLabels:[...cashLabels], cashSeries:[...cashSeries], scenarioSummary: $('scenarioSummary').textContent, storyHeadline: $('storyHeadline').textContent, storyCopy: $('storyCopy').textContent, breakEvenExplanation: $('breakEvenExplanation').textContent, utilizationStory: $('utilizationStory').textContent
  };
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
  $('advancedDetails').open = false;
  hasRevealed = false;
  $('results').hidden = true;
  $('results').classList.remove('revealed');
  $('printButton').disabled = true;
  calculate();
  $('unbookedBuilder').scrollIntoView({behavior:'smooth',block:'start'});
}



async function getLogoDataUrl() {
  if (!logoDataUrlPromise) {
    logoDataUrlPromise = fetch('assets/dci-logo-white.png')
      .then(r => r.blob())
      .then(blob => new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      }))
      .catch(() => null);
  }
  return logoDataUrlPromise;
}

function addPdfHeader(doc, title, subtitle) {
  doc.setFillColor(58,109,142);
  doc.rect(36, 32, 540, 64, 'F');
  doc.setTextColor(255,255,255);
  doc.setFont('helvetica','bold');
  doc.setFontSize(9);
  doc.text('THE UNBOOKED OPERATORY', 48, 48);
  doc.setFont('times','bold');
  doc.setFontSize(22);
  doc.text(title, 48, 72);
  doc.setFont('helvetica','normal');
  doc.setFontSize(8.5);
  doc.text(subtitle, 48, 86, {maxWidth: 500});
}

function addPdfFooter(doc, pageNum) {
  doc.setDrawColor(229,231,232);
  doc.line(36, 752, 576, 752);
  doc.setTextColor(110,116,122);
  doc.setFont('helvetica','normal');
  doc.setFontSize(7.5);
  doc.text('DCI • The Power of AND • Illustrative estimate only', 36, 765);
  doc.text(`Page ${pageNum}`, 556, 765, {align:'right'});
}

function drawMetricCard(doc, x, y, w, h, label, value, note, emphasize=false) {
  doc.setDrawColor(204,210,214);
  doc.setFillColor(emphasize ? 247 : 255, emphasize ? 249 : 255, emphasize ? 250 : 255);
  doc.rect(x,y,w,h,'FD');
  doc.setDrawColor(58,109,142);
  doc.line(x,y,x+w,y);
  doc.setTextColor(84,86,91);
  doc.setFont('helvetica','bold');
  doc.setFontSize(7.5);
  doc.text(label.toUpperCase(), x+10, y+14);
  doc.setTextColor(58,109,142);
  doc.setFont('helvetica','bold');
  doc.setFontSize(17);
  doc.text(value, x+10, y+34);
  if (note) {
    doc.setTextColor(110,116,122);
    doc.setFont('helvetica','normal');
    doc.setFontSize(7);
    doc.text(note, x+10, y+h-10, {maxWidth:w-20});
  }
}

function drawChartCard(doc, x, y, w, h, heading, imgData) {
  doc.setDrawColor(204,210,214);
  doc.rect(x, y, w, h);
  doc.setTextColor(58,109,142);
  doc.setFont('helvetica','bold');
  doc.setFontSize(7.5);
  doc.text(heading.toUpperCase(), x+10, y+12);
  if (imgData) doc.addImage(imgData, 'PNG', x+10, y+18, w-20, h-28, undefined, 'FAST');
}

function drawMethodBox(doc, x, y, w, h, title, text) {
  doc.setDrawColor(204,210,214);
  doc.rect(x,y,w,h);
  doc.setTextColor(58,109,142);
  doc.setFont('helvetica','bold');
  doc.setFontSize(10);
  doc.text(title, x+10, y+15);
  doc.setTextColor(84,86,91);
  doc.setFont('helvetica','normal');
  doc.setFontSize(7.6);
  doc.text(text, x+10, y+29, {maxWidth:w-20});
}

async function generatePdfReport() {
  if (!window.jspdf || !latestResults.cashLabels) return;
  const btn = $('printButton');
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Creating PDF…';
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({orientation:'portrait', unit:'pt', format:'letter'});
    const logo = await getLogoDataUrl();

    addPdfHeader(doc, 'The Room Does Not Need To Be Full To Pay For Itself.', latestResults.scenarioSummary);
    if (logo) doc.addImage(logo, 'PNG', 430, 40, 112, 24, undefined, 'FAST');
    doc.setDrawColor(204,210,214);
    doc.rect(36, 112, 540, 92);
    doc.setTextColor(58,109,142); doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.text('BREAK-EVEN UTILIZATION', 48, 126);
    doc.setTextColor(84,86,91); doc.setFont('times','normal'); doc.setFontSize(15); doc.text('This room needs approximately', 48, 146);
    doc.setTextColor(58,109,142); doc.setFont('helvetica','bold'); doc.setFontSize(33); doc.text(Number.isFinite(latestResults.breakEvenVisits)? latestResults.breakEvenVisits.toFixed(1): '—', 48, 182);
    doc.setFontSize(11); doc.text('additional visits per week', 48, 198);
    doc.setTextColor(84,86,91); doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.text(latestResults.breakEvenExplanation, 48, 214, {maxWidth: 180});
    doc.setFont('helvetica','bold'); doc.setTextColor(84,86,91); doc.setFontSize(7.5); doc.text('Break-even:', 300, 146); doc.text(`Entered: ${latestResults.visitsPerWeek.toFixed(1).replace('.0','')}/week`, 428, 146);
    doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.text(latestResults.utilizationStory, 300, 174, {maxWidth: 236});

    // transformation cards
    doc.setDrawColor(204,210,214); doc.rect(36, 218, 220, 124); doc.rect(320, 218, 220, 124);
    doc.setTextColor(84,86,91); doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.text('TODAY', 136, 290, {align:'center'});
    doc.setFont('times','normal'); doc.setFontSize(16); doc.text('Unbooked', 146, 309, {align:'center'});
    doc.setFont('helvetica','bold'); doc.setFontSize(28); doc.text('$0', 146, 339, {align:'center'});
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.text('clinical production from the room', 146, 354, {align:'center'});
    doc.setDrawColor(140,145,150); doc.rect(105, 236, 58, 32); doc.line(115,260,115,246); doc.line(127,260,127,246); doc.line(139,260,139,246); doc.line(151,260,151,246); doc.line(105,260,163,260);
    doc.setFillColor(58,109,142); doc.circle(288, 280, 25, 'F'); doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.text('AND', 288, 284, {align:'center', angle:0});
    doc.setTextColor(58,109,142); doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.text('ACTIVATED', 430, 290, {align:'center'});
    doc.setFont('times','normal'); doc.setFontSize(16); doc.text('Patient-Ready', 430, 309, {align:'center'});
    doc.setFont('helvetica','bold'); doc.setFontSize(28); doc.text(money(latestResults.annualGrossProduction), 430, 339, {align:'center'});
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.text('projected annual production at entered utilization', 430, 354, {align:'center'});
    doc.setDrawColor(58,109,142); doc.rect(390, 236, 80, 32); doc.line(430,268,430,242); doc.line(407,254,453,254); doc.line(420,242,440,242); doc.line(425,242,425,228); doc.line(435,242,435,228); doc.circle(430,225,7);

    const cashImg = $('cashChart').toDataURL('image/png',1.0);
    const monthlyImg = $('monthlyChart').toDataURL('image/png',1.0);

    addPdfFooter(doc,1);

    doc.addPage();
    addPdfHeader(doc, $('storyHeadline').textContent, $('storyCopy').textContent);
    if (logo) doc.addImage(logo, 'PNG', 430, 40, 112, 24, undefined, 'FAST');
    const x1=36, x2=300, cardW=258, cardH=58;
    drawMetricCard(doc, x1, 108, cardW, cardH, 'Monthly equipment payment', money(latestResults.monthlyPayment), latestResults.financedAmount > 0 ? `${money(latestResults.financedAmount)} financed for ${latestResults.loanTermYears} years at ${(latestResults.apr*100).toFixed(2).replace(/\.00$/,'')}% APR` : 'No financed balance under the entered assumptions');
    drawMetricCard(doc, x2, 108, cardW, cardH, 'Annual cash flow during financing', money(latestResults.annualCashDuringFinancing), 'After variable costs, added staffing and scheduled equipment payments');
    drawMetricCard(doc, x1, 172, cardW, cardH, '5-year net cash generated', money(latestResults.fiveYearCash), 'Opening contribution minus down payment and equipment payments during the first five years');
    drawMetricCard(doc, x2, 172, cardW, cardH, 'Potential additional wealth at retirement', money(latestResults.retirementWealth), `If the room contribution continues and net room cash is invested. After loan payoff / year: ${money(latestResults.annualPostLoanContribution)} • Years to retirement: ${latestResults.yearsToRetirement}`, true);

    // story box
    doc.setFillColor(248,249,250); doc.setDrawColor(204,210,214); doc.rect(36, 242, 540, 55, 'FD'); doc.setDrawColor(58,109,142); doc.line(36,242,36,297);
    doc.setTextColor(58,109,142); doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.text('THE NO-BRAINER TEST', 46, 256);
    doc.setFont('times','bold'); doc.setFontSize(17); doc.text($('storyHeadline').textContent, 46, 276);
    doc.setFont('helvetica','bold'); doc.setFontSize(18); doc.text($('breakEvenRatio').textContent, 548, 276, {align:'right'});
    doc.setTextColor(84,86,91); doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.text($('storyCopy').textContent, 46, 290, {maxWidth: 470});

    drawChartCard(doc, 36, 310, 258, 138, 'Five-year view • Cumulative net cash from the room', cashImg);
    drawChartCard(doc, 318, 310, 258, 138, 'Monthly economics • Room contribution vs. equipment payment', monthlyImg);

    drawMethodBox(doc, 36, 462, 540, 200, 'How This Estimate Works', 'The calculator focuses on one room that already exists and asks whether equipping it can create a positive financial return. Annual room production equals additional visits per week multiplied by average production per visit and working weeks per year. Variable clinical costs and any additional staffing are subtracted to estimate annual room contribution. Monthly equipment payment is calculated from the entered down payment, APR and term. Break-even visits per week are the utilization needed for monthly room contribution to cover the monthly equipment payment. Five-year cash generated equals opening down payment plus monthly room net cash during the first 60 months. Potential retirement wealth compounds that room contribution at the entered utilization through retirement. Taxes, collection differences, financing fees, replacement costs and changes in utilization are not modeled. Potential tax deductions or depreciation are intentionally excluded. Consult a qualified tax professional regarding the tax treatment of equipment purchases.');
    addPdfFooter(doc,2);

    doc.save('power-of-and-unbooked-operatory-report.pdf');
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  inputIds.forEach(id => $(id).addEventListener('input', () => {
    if (hasRevealed) calculate();
  }));
  $('revealButton').addEventListener('click', revealResults);
  $('editButton').addEventListener('click', () => $('unbookedBuilder').scrollIntoView({behavior:'smooth',block:'start'}));
  $('resetButton').addEventListener('click', reset);
  $('printButton').addEventListener('click', async () => {
    if (!hasRevealed) revealResults();
    await generatePdfReport();
  });
  $('currentYear').textContent = new Date().getFullYear();
  calculate();
});
