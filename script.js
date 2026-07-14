const $ = id => document.getElementById(id);
const inputIds = ['rooms','dciCost','altCost','technology','revenuePerRoom','margin','growth','altInitialRooms','delayYears','projectionYears','currentAge','retirementAge','returnRate','savingsRate','annualSavings'];
const defaults = {rooms:8,dciCost:22000,altCost:38000,technology:75000,revenuePerRoom:250000,margin:35,growth:3,altInitialRooms:7,delayYears:'2',projectionYears:'10',currentAge:42,retirementAge:65,returnRate:7,savingsRate:50,annualSavings:100000};
let costChart, profitChart;
const money = (n,compact=false) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0,notation:compact?'compact':'standard'}).format(Math.max(0,n)||0);
const num = id => Number($(id).value)||0;
function roomsForAlt(year,target,initial,delay){if(delay==='never')return Math.min(initial,target);return year>=Number(delay)?target:Math.min(initial,target)}
function calculate(){
 const rooms=Math.max(1,num('rooms')), dciCost=num('dciCost'), altCost=num('altCost'), technology=num('technology');
 const revenue=num('revenuePerRoom'), margin=num('margin')/100, growth=num('growth')/100, initial=Math.min(num('altInitialRooms'),rooms);
 const delay=$('delayYears').value, years=num('projectionYears'), currentAge=num('currentAge'), retirementAge=Math.max(currentAge,num('retirementAge'));
 const rate=num('returnRate')/100, savingsRate=num('savingsRate')/100, annualSavings=Math.max(1,num('annualSavings'));
 const dciTotal=rooms*dciCost, altTotal=rooms*altCost, capital=Math.max(0,altTotal-dciTotal);
 let cumDci=0,cumAlt=0,incrementalProfit=0; const labels=[],dciSeries=[],altSeries=[],yearlyDiff=[];
 for(let y=1;y<=years;y++){
   const revPerRoom=revenue*Math.pow(1+growth,y-1), dciProfit=rooms*revPerRoom*margin, altRooms=roomsForAlt(y,rooms,initial,delay), altProfit=altRooms*revPerRoom*margin;
   cumDci+=dciProfit;cumAlt+=altProfit;incrementalProfit+=dciProfit-altProfit;yearlyDiff.push(dciProfit-altProfit);labels.push(`Year ${y}`);dciSeries.push(cumDci);altSeries.push(cumAlt);
 }
 const yearsToRetire=Math.max(0,retirementAge-currentAge);
 let retirement=capital*Math.pow(1+rate,yearsToRetire);
 yearlyDiff.forEach((diff,index)=>{const yearsRemaining=Math.max(0,yearsToRetire-(index+1));retirement+=diff*savingsRate*Math.pow(1+rate,yearsRemaining)});
 const workYears=retirement/annualSavings;
 const availableAfterTech=Math.max(0,capital-technology);
 $('capitalDifference').textContent=money(capital);$('profitDifference').textContent=money(incrementalProfit);$('retirementDifference').textContent=money(retirement);$('workYears').textContent=workYears<0.1?'Less than 0.1 years':`${workYears.toFixed(1)} years`;
 $('profitPeriodLabel').textContent=`Across ${years} years of modeled practice performance`;
 const gap=rooms-initial; $('scenarioSummary').textContent=gap>0?(delay==='never'?`The alternative scenario begins with ${gap} fewer ${gap===1?'operatory':'operatories'} and never reaches the ${rooms}-room target.`:`The alternative scenario begins with ${gap} fewer ${gap===1?'operatory':'operatories'} and reaches the ${rooms}-room target after ${delay} ${Number(delay)===1?'year':'years'}.`):'Both scenarios begin with the same number of operatories; the comparison reflects equipment cost and retirement compounding.';
 if(capital>=technology&&technology>0){$('technologyHeadline').textContent='Fund technology and keep capital available.';$('technologyCopy').textContent=`After allocating ${money(technology)} to additional technology, the modeled upfront difference leaves:`;$('availableAfterTech').textContent=money(availableAfterTech)}else if(technology>0){$('technologyHeadline').textContent='Offset the cost of your technology plan.';$('technologyCopy').textContent=`The modeled capital difference could cover ${Math.min(100,capital/technology*100).toFixed(0)}% of a ${money(technology)} technology investment.`;$('availableAfterTech').textContent=money(capital)}else{$('technologyHeadline').textContent='Preserve capital for your next priority.';$('technologyCopy').textContent='Use the retained capital for technology, staffing, marketing, working capital, or future expansion.';$('availableAfterTech').textContent=money(capital)}
 $('timelineCaption').textContent=delay==='never'?'Alternative brand remains below target':delay==='0'?'No expansion delay':`${delay}-year expansion delay`;
 renderTimeline(rooms,initial,delay,Math.min(years,5)); updateCharts(dciTotal,altTotal,labels,dciSeries,altSeries);
}
function renderTimeline(target,initial,delay,years){const root=$('timeline');root.innerHTML='';for(let y=0;y<=years;y++){const alt=y===0?initial:roomsForAlt(y,target,initial,delay);const row=document.createElement('div');row.className='timeline-row';row.innerHTML=`<span class="timeline-label">${y===0?'Today':`Year ${y}`}</span><div class="op-track" title="DCI Edge: ${target} rooms"><div class="op-bar dci" style="width:${target/target*100}%">DCI Edge · ${target}</div></div><div class="op-track" title="Alternative: ${alt} rooms"><div class="op-bar alt" style="width:${Math.max(8,alt/target*100)}%">Alternative · ${alt}</div></div>`;root.appendChild(row)}}
function updateCharts(dciTotal,altTotal,labels,dciSeries,altSeries){
 const common={responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{usePointStyle:true,boxWidth:8,font:{family:'Inter'}}},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${money(c.raw)}`}}},scales:{y:{ticks:{callback:v=>money(v,true)},grid:{color:'#e8eef1'}},x:{grid:{display:false}}}};
 if(costChart)costChart.destroy();costChart=new Chart($('costChart'),{type:'bar',data:{labels:['DCI Edge','Alternative Brand'],datasets:[{label:'Equipment investment',data:[dciTotal,altTotal],backgroundColor:['#063b63','#8799a6'],borderRadius:8}]},options:{...common,plugins:{...common.plugins,legend:{display:false}}}});
 if(profitChart)profitChart.destroy();profitChart=new Chart($('profitChart'),{type:'line',data:{labels,datasets:[{label:'DCI Edge scenario',data:dciSeries,borderColor:'#063b63',backgroundColor:'#063b63',tension:.3,pointRadius:2},{label:'Alternative scenario',data:altSeries,borderColor:'#8799a6',backgroundColor:'#8799a6',tension:.3,pointRadius:2}]},options:common});
}
function reset(){Object.entries(defaults).forEach(([k,v])=>$(k).value=v);calculate()}
window.addEventListener('DOMContentLoaded',()=>{inputIds.forEach(id=>$(id).addEventListener('input',calculate));$('resetButton').addEventListener('click',reset);$('printButton').addEventListener('click',()=>window.print());$('currentYear').textContent=new Date().getFullYear();calculate()});
