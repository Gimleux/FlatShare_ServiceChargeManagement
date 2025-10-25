const tenantForm = document.getElementById('tenantForm');
const tenantList = document.getElementById('tenantList');
const additionalCostForm = document.getElementById('additionalCostForm');
const additionalCostList = document.getElementById('additionalCostList');
const billingForm = document.getElementById('billingForm');
const billingList = document.getElementById('billingList');
const calculateButton = document.getElementById('calculateButton');
const resultDiv = document.getElementById('resultDiv');
document.getElementById('exportButton').addEventListener('click', exportData);
document.getElementById('importButton').addEventListener('click', () => document.getElementById('importFile').click());
document.getElementById('importFile').addEventListener('change', importData);
document.getElementById('removeAllDataButton').addEventListener('click', removeAllData);
window.addEventListener('load', loadDataFromLocalStorage);

const NO_END_DATE_STRING = 'unlimited';

// Data
let listOfRegisteredTenants = []
let listOfRegisteredAdditionalCosts = {}
let listOfRegisteredBilling = []

function removeAllData() {
  listOfRegisteredTenants = [];
  listOfRegisteredAdditionalCosts = {};
  listOfRegisteredBilling = [];
  updateTenantList();
  updateAdditionalCostList();
  updateBillingList();
  resultDiv.innerHTML = '';
}

function updateAll(data) {
  if (data) {
    listOfRegisteredTenants = data.tenants;
    listOfRegisteredAdditionalCosts = data.additionalCosts;
    listOfRegisteredBilling = data.billing;
  }
  updateTenantList();
  updateAdditionalCostList();
  updateBillingList();
  handleCalculateButtonClick();
  saveDataToLocalStorage();
}

// delete
function deleteTenant(index) {
  listOfRegisteredTenants.splice(index, 1);
  updateTenantList();
}

function deleteAdditionalCost(category) {
  delete listOfRegisteredAdditionalCosts[category];
  updateAdditionalCostList();
}

function deleteIndividualCost(category, index) {
  listOfRegisteredAdditionalCosts[category].splice(index, 1);
  if (listOfRegisteredAdditionalCosts[category].length === 0) {
    delete listOfRegisteredAdditionalCosts[category];
  }
  updateAdditionalCostList();
}

function deleteBilling(index) {
  listOfRegisteredBilling.splice(index, 1);
  updateBillingList();
}

// Event handlers
function handleFormSubmit(event, action, update) {
  event.preventDefault();
  action();
  update();
}

tenantForm.addEventListener('submit', (event) => handleFormSubmit(event, () => {
  const name = document.getElementById('tenantName').value;
  const dateMoveIn = document.getElementById('dateMoveIn').value;
  const dateMoveOut = document.getElementById('dateMoveOut').value || NO_END_DATE_STRING;
  addTenant(name, dateMoveIn, dateMoveOut);
}, updateTenantList));

additionalCostForm.addEventListener('submit', (event) => handleFormSubmit(event, () => {
  const category = document.getElementById('expenseCategory').value;
  const realCost = parseDecimalInput(document.getElementById('realAmount').value);
  const bufferCost = parseDecimalInput(document.getElementById('bufferAmount').value);
  const startMonth = document.getElementById('startMonth').value;
  addAdditionalCost(category, realCost, bufferCost, startMonth);
}, updateAdditionalCostList));

billingForm.addEventListener('submit', (event) => handleFormSubmit(event, () => {
  const category = document.getElementById('billingCategory').value;
  const pendingPayments = parseDecimalInput(document.getElementById('pendingAmount').value);
  const start = document.getElementById('billingStart').value;
  const end = document.getElementById('billingEnd').value;
  addBilling(category, pendingPayments, start, end);
}, updateBillingList));

calculateButton.addEventListener('click', handleCalculateButtonClick);

// Calculation and display logic
function handleCalculateButtonClick() {
  resultDiv.innerHTML = '';
  
  // Sort billing by category to group same categories together
  const sortedBilling = [...listOfRegisteredBilling].sort((a, b) => {
    // First sort by category name
    const categoryCompare = a.category.localeCompare(b.category);
    if (categoryCompare !== 0) return categoryCompare;
    // If same category, sort by start date
    return a.start.localeCompare(b.start);
  });
  
  sortedBilling.forEach(bill => {
    const div = document.createElement('div');
    div.className = 'dynamic-container';
    
    const headerDiv = document.createElement('div');
    headerDiv.className = 'result-header';
    
    const title = document.createElement('h3');
    title.className = 'dynamic-heading';
    title.textContent = bill.category;
    
    const dateRange = document.createElement('span');
    dateRange.className = 'date-range';
    dateRange.textContent = `${bill.start} - ${bill.end}`;
    
    headerDiv.appendChild(title);
    headerDiv.appendChild(dateRange);
    div.appendChild(headerDiv);
    
    calculateAndDisplayBilling(bill, div);
    resultDiv.appendChild(div);
  });
}

// Data management functions
function addTenant(name, dateMoveIn, dateMoveOut = NO_END_DATE_STRING) {
  listOfRegisteredTenants.push({name, dateMoveIn, dateMoveOut});
  saveDataToLocalStorage();
}

function addAdditionalCost(category, realCost, bufferCost, startMonth) {
  if (!stringIsNumber(realCost) || !stringIsNumber(bufferCost)) {
    alert("Please enter a valid number for the cost fields.");
    return;
  }
  if (!listOfRegisteredAdditionalCosts[category]) {
    listOfRegisteredAdditionalCosts[category] = [];
  }
  listOfRegisteredAdditionalCosts[category].push({realCost, bufferCost, startMonth});
  saveDataToLocalStorage();
}

function addBilling(category, pendingPayments, start, end) {
  if (!stringIsNumber(pendingPayments)) {
    alert("Please enter a valid number for the pending payments field.");
    return;
  }
  listOfRegisteredBilling.push({category, pendingPayments, start, end});
  saveDataToLocalStorage();
}

// DOM update functions
function updateList(element, items, formatter) {
  element.innerHTML = '';
  items.map(formatter).forEach(item => {
    if (item instanceof Element) {
      element.appendChild(item);
    } else {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = item;
      element.appendChild(wrapper.firstChild);
    }
  });
}

function updateTenantList() {
  updateList(
      tenantList,
      listOfRegisteredTenants,
      (tenant, index) => {
        const li = document.createElement('li');
        li.textContent = `${tenant.name} (${tenant.dateMoveIn} - ${tenant.dateMoveOut})`;

        const deleteButton = document.createElement('button');
        deleteButton.classList.add('dynamic-btn');
        deleteButton.innerHTML = '🗑️ Delete Tenant';

        deleteButton.addEventListener('click', () => {
          deleteTenant(index);
        });

        li.appendChild(deleteButton);
        return li;
      }
  );
  saveDataToLocalStorage();
}

function updateAdditionalCostList() {
  additionalCostList.innerHTML = '';
  Object.keys(listOfRegisteredAdditionalCosts).forEach((category, index) => {
    const costs = listOfRegisteredAdditionalCosts[category];
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'dynamic-container';

    const categoryHeading = document.createElement('strong');
    const collapsibleContent = document.createElement('div');
    collapsibleContent.className = 'collapsible-content';
    categoryHeading.className = 'dynamic-heading';
    categoryHeading.textContent = category;
    categoryHeading.addEventListener('click', () => {
      collapsibleContent.classList.toggle('show');
    });
    categoryDiv.appendChild(categoryHeading);

    const deleteCategoryButton = document.createElement('button');
    deleteCategoryButton.className = 'dynamic-btn';
    deleteCategoryButton.innerHTML = '🗑️ Delete Category';
    deleteCategoryButton.addEventListener('click', () => {
      deleteAdditionalCost(category);
    });
    categoryDiv.appendChild(deleteCategoryButton);

    costs.forEach((cost, costIndex) => {
      const costInfo = `From ${cost.startMonth}:\nReal: ${cost.realCost}, Buffer: ${cost.bufferCost}\nTotal: ${cost.realCost + cost.bufferCost}`;
      appendToElement(collapsibleContent, costInfo, 'p', 'dynamic-text');

      const deleteButton = document.createElement('button');
      deleteButton.className = 'dynamic-btn';
      deleteButton.innerHTML = '🗑️ Delete Cost Segment';
      deleteButton.addEventListener('click', () => {
        deleteIndividualCost(category, costIndex);
      });
      collapsibleContent.appendChild(deleteButton);
    });

    categoryDiv.appendChild(collapsibleContent);
    additionalCostList.appendChild(categoryDiv);
  });
  saveDataToLocalStorage();
}



function updateBillingList() {
  updateList(
      billingList,
      listOfRegisteredBilling,
      (bill, index) => {
        const li = document.createElement('li');
        li.textContent = `${bill.category}: Pending payments of ${bill.pendingPayments} from ${bill.start} to ${bill.end}`;

        const deleteButton = document.createElement('button');
        deleteButton.classList.add('dynamic-btn');
        deleteButton.innerHTML = '🗑️ Delete Billing';

        deleteButton.addEventListener('click', () => {
          deleteBilling(index);
        });

        li.appendChild(deleteButton);
        return li;
      }
  );
  saveDataToLocalStorage();
}


function appendToElement(parent, text, tagName = 'p', className = "dynamic-text") {
  const element = document.createElement(tagName);
  element.textContent = text;
  element.className = className;
  parent.appendChild(element);
}

// Calculation logic
function calculateAndDisplayBilling(bill, div) {
  const billingTotalMonths = calculateTotalMonths(bill.start, bill.end);
  const sortedExpenseDurations = getSortedExpenseDurations(bill.category);
  const monthlyDetails = generateMonthlyDetails(bill.start, billingTotalMonths, sortedExpenseDurations);
  const tenantsBillingInformation = initializeTenantsBillingInformation();

  updateTenantsBillingInformation(monthlyDetails, tenantsBillingInformation);
  const { sumOfAdvanceExpensePayments, sumOfBufferPayments, pendingPaymentsPerMonth } = calculatePayments(monthlyDetails, tenantsBillingInformation, bill.pendingPayments);
  const tenantResults = calculateTenantResults(tenantsBillingInformation);

  displayResults(div, sumOfAdvanceExpensePayments, sumOfBufferPayments, bill.pendingPayments, pendingPaymentsPerMonth, tenantResults);
}

function calculateTotalMonths(billingStart, billingEnd) {
  const billingStartDate = new Date(billingStart);
  const billingEndDate = new Date(billingEnd);
  return (billingEndDate.getFullYear() - billingStartDate.getFullYear()) * 12 + billingEndDate.getMonth() - billingStartDate.getMonth() + 1;
}

function getSortedExpenseDurations(billingCategory) {
  return listOfRegisteredAdditionalCosts[billingCategory].sort((a, b) => a.startMonth.localeCompare(b.startMonth)).reverse();
}

function generateMonthlyDetails(billingStart, billingTotalMonths, sortedExpenseDurations) {
  const monthlyDetails = {};

  for (let i = 0; i < billingTotalMonths; i++) {
    const month = new Date(billingStart);
    month.setMonth(month.getMonth() + i);

    const monthsExpenseDetails = sortedExpenseDurations.find(duration => dateIsBeforeOrEqual(new Date(duration.startMonth), month));
    if (monthsExpenseDetails) {
      monthlyDetails[formatDate(month)] = {
        cost: monthsExpenseDetails,
        month: month
      };
    }
  }

  return monthlyDetails;
}

function initializeTenantsBillingInformation() {
  const tenantsBillingInformation = {};
  listOfRegisteredTenants.forEach(tenant => {
    tenantsBillingInformation[tenant.name] = {months: {}, rates: {}, buffer: 0, pendingPaymentsWhole: 0};
  });
  return tenantsBillingInformation;
}

function updateTenantsBillingInformation(monthlyDetails, tenantsBillingInformation) {
  Object.values(monthlyDetails).forEach(monthData => {
    const tenantsInThisMonth = getTenantsInMonth(monthData.month);
    tenantsInThisMonth.forEach(tenant => {
      tenantsBillingInformation[tenant.name].months[formatDate(monthData.month)] = {affected: true};
      if (!tenantsBillingInformation[tenant.name]?.rates[monthData.cost.realCost]) {
        tenantsBillingInformation[tenant.name].rates[monthData.cost.realCost] = 0;
      }
      tenantsBillingInformation[tenant.name].rates[monthData.cost.realCost] += 1;
    });
    monthData.numberOfTenants = tenantsInThisMonth.length;
  });
}

function getTenantsInMonth(month) {
  return listOfRegisteredTenants.filter(tenant => {
    const moveIn = new Date(tenant.dateMoveIn);
    const moveOut = tenant.dateMoveOut === NO_END_DATE_STRING || !tenant.dateMoveOut ? new Date() : new Date(tenant.dateMoveOut);
    return dateIsBetween(month, moveIn, moveOut, tenant.name);
  });
}

function calculatePayments(monthlyDetails, tenantsBillingInformation, pendingPayments) {
  let sumOfAdvanceExpensePayments = 0;
  let sumOfBufferPayments = 0;
  const pendingPaymentsPerMonth = pendingPayments / Object.keys(monthlyDetails).length;

  Object.entries(monthlyDetails).forEach(([month, monthData]) => {
    const {cost, numberOfTenants, month: monthDate} = monthData;
    sumOfAdvanceExpensePayments += cost.realCost;
    sumOfBufferPayments += cost.bufferCost;

    Object.values(tenantsBillingInformation).forEach(tenant => {
      if (tenant.months[month] && tenant.months[month].affected) {
        tenant.buffer += cost.bufferCost / numberOfTenants;
        const pendingPaymentsThisMonth = pendingPaymentsPerMonth / numberOfTenants;
        tenant.pendingPaymentsWhole += pendingPaymentsThisMonth;
        tenant.months[month].pending = pendingPaymentsThisMonth;
      }
    });
  });

  return { sumOfAdvanceExpensePayments, sumOfBufferPayments, pendingPaymentsPerMonth };
}

function calculateTenantResults(tenantsBillingInformation) {
  const tenantResults = {};

  Object.entries(tenantsBillingInformation).forEach(([tenant, data]) => {
    const affectedMonths = Object.keys(data.months).length;
    const rates = {};
    Object.entries(data.rates).forEach(([rate, count]) => {
      rates[rate] = count;
    });
    const pendingText = calculatePendingText(data.months);
    const totalPendingPaymentsNet = roundToTwoDecimals(data.pendingPaymentsWhole - data.buffer);

    tenantResults[tenant] = {
      affectedMonths,
      rates,
      pendingText,
      totalPendingPaymentsNet
    };
  });

  return tenantResults;
}

function calculateRatesText(rates) {
  let ratesText = "Rates: Affected ";
  Object.entries(rates).forEach(([rate, count]) => {
    ratesText = ratesText.concat(`${count} month/s with rate ${rate}, `);
  });
  return ratesText;
}

function calculatePendingText(months) {
  let pendingText = "";
  Object.entries(months).forEach(([month, monthData]) => {
    if (monthData.pending) {
      pendingText = pendingText.concat(`${roundToTwoDecimals(monthData.pending)} for ${month}, `);
    }
  });
  return pendingText;
}

function displayResults(div, sumOfAdvanceExpensePayments, sumOfBufferPayments, totalPendingPayments, pendingPaymentsPerMonth, tenantResults) {
  // Calculate total payment/refund
  const totalPaymentRefund = Object.values(tenantResults).reduce((sum, tenant) => sum + tenant.totalPendingPaymentsNet, 0);
  
  // Summary Section
  const summaryDiv = document.createElement('div');
  summaryDiv.className = 'summary-section';
  
  const summaryGrid = document.createElement('div');
  summaryGrid.className = 'summary-grid';
  
  const advanceBox = createSummaryBox('💰 Advance Payments', `${roundToTwoDecimals(sumOfAdvanceExpensePayments)} €`, 'summary-box-blue');
  const bufferBox = createSummaryBox('🔒 Buffer Payments', `${roundToTwoDecimals(sumOfBufferPayments)} €`, 'summary-box-teal');
  
  const pendingBox = createSummaryBox(
    '💳 Pending Payments', 
    `${roundToTwoDecimals(totalPendingPayments)} €`, 
    totalPendingPayments > 0 ? 'summary-box-orange' : 'summary-box-green'
  );
  
  const monthlyBox = createSummaryBox(
    '📅 Per Month', 
    `${roundToTwoDecimals(pendingPaymentsPerMonth)} €`, 
    pendingPaymentsPerMonth > 0 ? 'summary-box-orange' : 'summary-box-green'
  );
  const totalBox = createSummaryBox(
    totalPaymentRefund > 0 ? '💸 Total Payment' : (totalPaymentRefund < 0 ? '💵 Total Refund' : '✅ Balanced'), 
    `${totalPaymentRefund > 0 ? '+' : ''}${roundToTwoDecimals(totalPaymentRefund)} €`, 
    totalPaymentRefund > 0 ? 'summary-box-orange' : 'summary-box-green'
  );
  
  summaryGrid.appendChild(advanceBox);
  summaryGrid.appendChild(bufferBox);
  summaryGrid.appendChild(pendingBox);
  summaryGrid.appendChild(monthlyBox);
  summaryGrid.appendChild(totalBox);
  summaryDiv.appendChild(summaryGrid);
  div.appendChild(summaryDiv);

  // Tenants Section
  const tenantsHeading = document.createElement('h3');
  tenantsHeading.className = 'tenants-heading collapsible';
  tenantsHeading.textContent = '👥 Tenant Overview';
  tenantsHeading.style.cursor = 'pointer';
  
  const tenantsContainer = document.createElement('div');
  tenantsContainer.className = 'tenants-container collapsible-content';
  
  tenantsHeading.addEventListener('click', () => {
    tenantsContainer.classList.toggle('show');
    tenantsHeading.classList.toggle('expanded');
  });
  
  div.appendChild(tenantsHeading);

  // Sort tenants: affected first, then unaffected
  const sortedTenants = Object.entries(tenantResults).sort(([, a], [, b]) => {
    if (a.affectedMonths === 0 && b.affectedMonths === 0) return 0;
    if (a.affectedMonths === 0) return 1;
    if (b.affectedMonths === 0) return -1;
    return 0;
  });

  sortedTenants.forEach(([tenant, data]) => {
    const tenantCard = document.createElement('div');
    tenantCard.className = 'tenant-card';
    
    const tenantHeader = document.createElement('div');
    tenantHeader.className = 'tenant-header';
    const tenantName = document.createElement('h4');
    tenantName.textContent = tenant;
    tenantHeader.appendChild(tenantName);
    
    const totalBadge = document.createElement('div');
    totalBadge.className = data.totalPendingPaymentsNet >= 0 ? 'total-badge payment' : 'total-badge refund';
    totalBadge.textContent = `${data.totalPendingPaymentsNet >= 0 ? '+' : ''}${data.totalPendingPaymentsNet} €`;
    tenantHeader.appendChild(totalBadge);
    
    tenantCard.appendChild(tenantHeader);
    
    const tenantDetails = document.createElement('div');
    tenantDetails.className = 'tenant-details';
    
    const monthsInfo = document.createElement('div');
    monthsInfo.className = 'info-row';
    monthsInfo.innerHTML = `<span class="info-label">📆 Affected Months:</span> <span class="info-value">${data.affectedMonths}</span>`;
    tenantDetails.appendChild(monthsInfo);
    
    if (Object.keys(data.rates).length > 0) {
      const ratesInfo = document.createElement('div');
      ratesInfo.className = 'info-row';
      ratesInfo.innerHTML = `<span class="info-label">📊 Rates:</span>`;
      const ratesList = document.createElement('ul');
      ratesList.className = 'rates-list';
      Object.entries(data.rates).forEach(([rate, count]) => {
        const rateItem = document.createElement('li');
        rateItem.textContent = `${count} month(s) with ${rate} €`;
        ratesList.appendChild(rateItem);
      });
      ratesInfo.appendChild(ratesList);
      tenantDetails.appendChild(ratesInfo);
    }
    
    if (data.pendingText) {
      const pendingSection = document.createElement('div');
      pendingSection.className = 'pending-section';
      
      const pendingHeader = document.createElement('div');
      pendingHeader.className = 'pending-header';
      pendingHeader.textContent = '💳 Pending Payments per Month';
      pendingHeader.style.cursor = 'pointer';
      
      const pendingContent = document.createElement('div');
      pendingContent.className = 'pending-content';
      
      const pendingList = document.createElement('ul');
      pendingList.className = 'pending-list';
      const pendingEntries = data.pendingText.split(', ').filter(entry => entry.trim());
      pendingEntries.forEach(entry => {
        const pendingItem = document.createElement('li');
        pendingItem.textContent = entry;
        pendingList.appendChild(pendingItem);
      });
      pendingContent.appendChild(pendingList);
      
      pendingHeader.addEventListener('click', () => {
        pendingContent.classList.toggle('show');
        pendingHeader.classList.toggle('expanded');
      });
      
      pendingSection.appendChild(pendingHeader);
      pendingSection.appendChild(pendingContent);
      tenantDetails.appendChild(pendingSection);
    }
    
    tenantCard.appendChild(tenantDetails);
    tenantsContainer.appendChild(tenantCard);
  });

  div.appendChild(tenantsContainer);
}

function createSummaryBox(label, value, className) {
  const box = document.createElement('div');
  box.className = `summary-box ${className}`;
  
  const labelEl = document.createElement('div');
  labelEl.className = 'summary-label';
  labelEl.textContent = label;
  
  const valueEl = document.createElement('div');
  valueEl.className = 'summary-value';
  valueEl.textContent = value;
  
  box.appendChild(labelEl);
  box.appendChild(valueEl);
  
  return box;
}

// local storage
function saveDataToLocalStorage() {
  const data = {
    tenants: listOfRegisteredTenants,
    additionalCosts: listOfRegisteredAdditionalCosts,
    billing: listOfRegisteredBilling
  };
  localStorage.setItem('expensesData', JSON.stringify(data));
}

function loadDataFromLocalStorage() {
  const data = localStorage.getItem('expensesData');
  if (data) {
    const parsedData = JSON.parse(data);
    updateAll(parsedData);
  }
}


// Export and import logic
function exportData() {
  const data = {
    tenants: listOfRegisteredTenants,
    additionalCosts: listOfRegisteredAdditionalCosts,
    billing: listOfRegisteredBilling
  };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", "expenses_data.json");
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

function importData(event) {
  const fileReader = new FileReader();
  fileReader.onload = function(fileLoadedEvent) {
    const textFromFileLoaded = fileLoadedEvent.target.result;
    const importedData = JSON.parse(textFromFileLoaded);
    updateAll(importedData);
  };
  fileReader.readAsText(event.target.files[0], "UTF-8");
}

function compareDatesByYearAndMonth(date1, date2, name) {
  const year1 = date1.getFullYear();
  const month1 = date1.getMonth();

  const year2 = date2.getFullYear();
  const month2 = date2.getMonth();
  let returnValue;
  if (year1 === year2 && month1 === month2) {
    returnValue = 0;
  } else if (year1 < year2 || (year1 === year2 && month1 < month2)) {
    returnValue = -1;
  } else {
    returnValue = 1;
  }
  return returnValue;
}

function dateIsBeforeOrEqual(date1, date2, name) {
  return compareDatesByYearAndMonth(date1, date2, name) <= 0;
}

function dateIsAfterOrEqual(date1, date2, name) {
  return compareDatesByYearAndMonth(date1, date2, name) >= 0;
}

function dateIsBefore(date1, date2) {
  return compareDatesByYearAndMonth(date1, date2) < 0;
}

function dateIsAfter(date1, date2) {
  return compareDatesByYearAndMonth(date1, date2) > 0;
}

function dateIsBetween(date, startDate, endDate, name) {
  return dateIsAfterOrEqual(date, startDate, name) && dateIsBeforeOrEqual(date, endDate, name);
}

function formatDate(date) {
  return `${date.getMonth() + 1}/${date.getFullYear()}`;
}

function roundToTwoDecimals(number) {
  return Math.round(number * 100) / 100;
}

function parseDecimalInput(input) {
  let cleanedInput = input;
  if (input.split('').filter(char => char === ',' || char === ".").length > 1) {
    const parts = input.split(/[,.]/g);
    cleanedInput = parts.reduce((acc, char, currentIndex, array) => {
      if (currentIndex === array.length - 1) {
        return acc.concat('.').concat(char);
      }
      return acc.concat(char);
    },"")
  }
  const decimalInput = cleanedInput.replace(/,/g, '.');
  return parseFloat(decimalInput);
}

function stringIsNumber(string) {
  return /^-?[0-9.,]+$/.test(string);
}