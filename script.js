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
const defaults = {dciRooms:5,dciCost:22000,altRooms:3,altCost:37000,revenuePerRoom:250000,margin:35,growth:3,delayYears:'2',currentAge:42,retirementAge:65,returnRate:7};
let costChart, profitChart;
let hasRevealed = false;
let printChartMode = false;
let latestResults = {};
let logoDataUrlPromise = null;

const money = (n, compact=false) => new Intl.NumberFormat('en-US', {
  style:'currency', currency:'USD', maximumFractionDigits:0,
  notation:compact ? 'compact' : 'standard'
}).format(Math.abs(n) || 0);
const num = id => Number($(id).value) || 0;
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

  latestResults = {
    dciRooms, altRooms, dciCost, altCost, revenue, margin, growth, delay, currentAge, retirementAge, annualReturn, yearsToRetire,
    dciTotal, altTotal, signedCapitalDifference, roomAdvantage, currentAnnualProfitAdvantage, totalProfitAdvantage,
    capitalFutureValue, profitFutureValue, retirementValue, comparisonYears, delayText, scenarioSummary: $('scenarioSummary').textContent, storyHeadline: $('storyHeadline').textContent, storyCopy: $('storyCopy').textContent, annualProfitAdvantageText: $('annualProfitAdvantage').textContent, chartLabels:[...chartLabels], chartSeries:[...chartSeries],
    timelinePoints: (function(){ const pts=[0]; const maxYears = delay === 'never' ? 5 : Math.min(5, Math.ceil(Number(delay))); for (let t=0.5; t<=maxYears; t+=0.5) pts.push(t); return pts.map(time => ({
      label: time === 0 ? 'Today' : (time % 1 === 0 ? `Year ${time}` : `${time} yr`),
      dci:dciRooms, alt: time === 0 ? altRooms : alternativeRoomsAtSnapshot(time, altRooms, dciRooms, delay)
    })); })()
  };
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
  hasRevealed = false;
  $('results').hidden = true;
  $('results').classList.remove('revealed');
  $('printButton').disabled = true;
  calculate();
  $('builder').scrollIntoView({behavior:'smooth',block:'start'});
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
  doc.text('THE POWER OF AND', 48, 48);
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

function drawValueCard(doc, x, y, w, h, label, value, note, emphasized=false) {
  doc.setDrawColor(204,210,214);
  doc.setFillColor(emphasized ? 247 : 255, emphasized ? 249 : 255, emphasized ? 250 : 255);
  doc.rect(x, y, w, h, 'FD');
  doc.setDrawColor(58,109,142);
  doc.setLineWidth(1);
  doc.line(x, y, x+w, y);
  doc.setTextColor(84,86,91);
  doc.setFont('helvetica','bold');
  doc.setFontSize(7.5);
  doc.text(label.toUpperCase(), x+10, y+14);
  doc.setTextColor(58,109,142);
  doc.setFont('helvetica','bold');
  doc.setFontSize(20);
  doc.text(value, x+10, y+37);
  if (note) {
    doc.setTextColor(110,116,122);
    doc.setFont('helvetica','normal');
    doc.setFontSize(7);
    doc.text(note, x+10, y+h-10, {maxWidth: w-20});
  }
}

function drawSectionBand(doc, x, y, w, title, rightText='', body='') {
  doc.setFillColor(248,249,250);
  doc.setDrawColor(204,210,214);
  doc.rect(x, y, w, 44, 'FD');
  doc.setDrawColor(58,109,142);
  doc.setLineWidth(1);
  doc.line(x, y, x, y+44);
  doc.setTextColor(58,109,142);
  doc.setFont('helvetica','bold');
  doc.setFontSize(8);
  doc.text('THE SAME-BUDGET STORY', x+10, y+12);
  doc.setFont('times','bold');
  doc.setFontSize(16);
  doc.text(title, x+10, y+29);
  if (rightText) {
    doc.setFont('helvetica','bold');
    doc.setFontSize(16);
    doc.text(rightText, x+w-10, y+29, {align:'right'});
  }
  if (body) {
    doc.setTextColor(84,86,91);
    doc.setFont('helvetica','normal');
    doc.setFontSize(7.4);
    doc.text(body, x+10, y+39, {maxWidth: w-120});
  }
}

function drawChartCard(doc, x, y, w, h, heading, imgData) {
  doc.setDrawColor(204,210,214);
  doc.rect(x, y, w, h);
  doc.setTextColor(58,109,142);
  doc.setFont('helvetica','bold');
  doc.setFontSize(7.5);
  doc.text(heading.toUpperCase(), x+10, y+12);
  if (imgData) {
    doc.addImage(imgData, 'PNG', x+10, y+18, w-20, h-28, undefined, 'FAST');
  }
}

function drawMiniTable(doc, x, y, rows, col1, col2, col3) {
  doc.setTextColor(58,109,142);
  doc.setFont('helvetica','bold');
  doc.setFontSize(7.5);
  doc.text(col1, x, y); doc.text(col2, x+110, y); doc.text(col3, x+285, y);
  let yy = y + 14;
  doc.setFont('helvetica','normal');
  doc.setTextColor(84,86,91);
  doc.setFontSize(8);
  rows.forEach(r => {
    doc.text(String(r[0]), x, yy);
    doc.text(String(r[1]), x+110, yy);
    doc.text(String(r[2]), x+285, yy);
    doc.setDrawColor(229,231,232);
    doc.line(x, yy+4, x+500, yy+4);
    yy += 16;
  });
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
  if (!window.jspdf || !latestResults.chartLabels) return;
  const btn = $('printButton');
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Creating PDF…';
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({orientation:'portrait', unit:'pt', format:'letter'});
    const pageW = 612;
    const logo = await getLogoDataUrl();

    addPdfHeader(doc, 'What Becomes Possible?', latestResults.scenarioSummary || $('scenarioSummary').textContent);
    if (logo) doc.addImage(logo, 'PNG', 430, 40, 112, 24, undefined, 'FAST');
    const x1=36, x2=300, cardW=258, cardH=56;
    drawValueCard(doc, x1, 108, cardW, cardH, 'More operatories on day one', `${latestResults.roomAdvantage > 0 ? '+' : ''}${latestResults.roomAdvantage}`, 'Difference between the two opening configurations');
    drawValueCard(doc, x2, 108, cardW, cardH, 'Initial investment difference', `${latestResults.signedCapitalDifference >= 0 ? '+' : '−'}${money(latestResults.signedCapitalDifference)}`, latestResults.signedCapitalDifference >= 0 ? 'Capital retained with the DCI configuration' : 'Additional investment for the DCI configuration');
    drawValueCard(doc, x1, 170, cardW, cardH, 'Additional profit before catch-up', `${latestResults.totalProfitAdvantage >= 0 ? '+' : '−'}${money(latestResults.totalProfitAdvantage)}`, latestResults.delay === 'never' ? 'Modeled through retirement' : `Includes the full ${latestResults.delay}-year production advantage`);
    drawValueCard(doc, x2, 170, cardW, cardH, 'Potential additional wealth at retirement', `${latestResults.retirementValue >= 0 ? '+' : '−'}${money(latestResults.retirementValue)}`, `Future value of upfront capital (${money(latestResults.capitalFutureValue)}) plus added operatory profit (${money(latestResults.profitFutureValue)}).`, true);

    drawSectionBand(doc, 36, 236, 540, $('storyHeadline').textContent, $('annualProfitAdvantage').textContent, $('storyCopy').textContent);

    const costImg = $('costChart').toDataURL('image/png',1.0);
    const profitImg = $('profitChart').toDataURL('image/png',1.0);
    drawChartCard(doc, 36, 292, 258, 138, 'Upfront decision • Total equipment investment', costImg);
    drawChartCard(doc, 318, 292, 258, 138, 'Practice impact • Cumulative operating profit advantage', profitImg);

    doc.setTextColor(84,86,91);
    doc.setFont('helvetica','normal');
    doc.setFontSize(8);
    doc.text(`DCI Edge: ${latestResults.dciRooms} operatories at ${money(latestResults.dciCost)} per room`, 36, 450);
    doc.text(`Alternative: ${latestResults.altRooms} operatories at ${money(latestResults.altCost)} per room`, 36, 464);
    doc.text(`Revenue per operatory: ${money(latestResults.revenue)} • Operating margin: ${(latestResults.margin*100).toFixed(0)}% • Annual growth: ${(latestResults.growth*100).toFixed(1)}%`, 36, 478);
    doc.text(`Current age: ${latestResults.currentAge} • Retirement age: ${latestResults.retirementAge} • Investment return: ${(latestResults.annualReturn*100).toFixed(1)}%`, 36, 492);

    addPdfFooter(doc,1);

    doc.addPage();
    addPdfHeader(doc, 'Operatories In Service', `Alternative ${latestResults.delayText}. The table below shows how the room count compares over time.`);
    if (logo) doc.addImage(logo, 'PNG', 430, 40, 112, 24, undefined, 'FAST');
    const tableRows = latestResults.timelinePoints.map(p => [p.label, `DCI Edge • ${p.dci}`, `Alternative • ${p.alt}`]);
    drawMiniTable(doc, 48, 120, tableRows, 'Snapshot', 'DCI Edge', 'Alternative');
    let baseY = 120 + 14 + tableRows.length*16 + 24;
    doc.setTextColor(58,109,142);
    doc.setFont('helvetica','bold');
    doc.setFontSize(10);
    doc.text('Assumptions', 48, baseY);
    doc.setFont('helvetica','normal');
    doc.setTextColor(84,86,91);
    doc.setFontSize(8);
    const assumptions = [
      ['DCI Edge operatories', String(latestResults.dciRooms)],
      ['Alternative operatories', String(latestResults.altRooms)],
      ['DCI cost per operatory', money(latestResults.dciCost)],
      ['Alternative cost per operatory', money(latestResults.altCost)],
      ['Revenue per operatory', money(latestResults.revenue)],
      ['Operating margin', `${(latestResults.margin*100).toFixed(0)}%`],
      ['Annual production growth', `${(latestResults.growth*100).toFixed(1)}%`],
      ['Catch-up timing', latestResults.delay === 'never' ? 'Never' : `${latestResults.delay} years`],
      ['Years to retirement', String(latestResults.yearsToRetire)],
      ['Investment return', `${(latestResults.annualReturn*100).toFixed(1)}%`]
    ];
    let ax=48, ay=baseY+18;
    assumptions.forEach((a, idx) => {
      const col = idx < 5 ? 0 : 1;
      const row = idx % 5;
      const x = ax + col*260;
      const y = ay + row*20;
      doc.setFont('helvetica','bold'); doc.text(`${a[0]}:`, x, y);
      doc.setFont('helvetica','normal'); doc.text(String(a[1]), x+120, y);
    });
    drawMethodBox(doc, 36, 520, 540, 170, 'How This Estimate Works', 'This calculator compares two ways to put more operatories to work. The investment difference between the two scenarios is treated as capital preserved or additional capital required on day one. If DCI Edge opens with more rooms, the model also calculates the additional operating profit created while that room advantage exists. Those cash flows are then compounded to the selected retirement age at the entered investment return. The results are illustrative only and do not include financing, taxes, personal withdrawals or practice-specific overhead differences.');
    addPdfFooter(doc,2);

    doc.save('power-of-and-more-rooms-report.pdf');
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
  $('editButton').addEventListener('click', () => $('builder').scrollIntoView({behavior:'smooth',block:'start'}));
  $('resetButton').addEventListener('click', reset);
  $('printButton').addEventListener('click', async () => {
    if (!hasRevealed) revealResults();
    await generatePdfReport();
  });
  $('currentYear').textContent = new Date().getFullYear();
  calculate();
});
