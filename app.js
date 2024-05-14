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

// delete
function deleteTenant(index) {
  listOfRegisteredTenants.splice(index, 1);
  console.log(listOfRegisteredTenants)
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
  const realCost = parseFloat(document.getElementById('realAmount').value);
  const bufferCost = parseFloat(document.getElementById('bufferAmount').value);
  const startMonth = document.getElementById('startMonth').value;
  addAdditionalCost(category, realCost, bufferCost, startMonth);
}, updateAdditionalCostList));

billingForm.addEventListener('submit', (event) => handleFormSubmit(event, () => {
  const category = document.getElementById('billingCategory').value;
  const pendingPayments = parseFloat(document.getElementById('pendingAmount').value);
  const start = document.getElementById('billingStart').value;
  const end = document.getElementById('billingEnd').value;
  addBilling(category, pendingPayments, start, end);
}, updateBillingList));

calculateButton.addEventListener('click', handleCalculateButtonClick);

// Calculation and display logic
function handleCalculateButtonClick() {
  resultDiv.innerHTML = '';
  listOfRegisteredBilling.forEach(bill => {
    const div = document.createElement('div');
    div.className = 'dynamic-container';
    div.innerHTML = `<h3 class="dynamic-heading">${bill.category}</h3>`;
    calculateAndDisplayBilling(bill, div);
    resultDiv.appendChild(div);
  });
}

// Data management functions
function addTenant(name, dateMoveIn, dateMoveOut = NO_END_DATE_STRING) {
  listOfRegisteredTenants.push({name, dateMoveIn, dateMoveOut});
}

function addAdditionalCost(category, realCost, bufferCost, startMonth) {
  if (!listOfRegisteredAdditionalCosts[category]) {
    listOfRegisteredAdditionalCosts[category] = [];
  }
  listOfRegisteredAdditionalCosts[category].push({realCost, bufferCost, startMonth});
}

function addBilling(category, pendingPayments, start, end) {
  listOfRegisteredBilling.push({category, pendingPayments, start, end});
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
        deleteButton.textContent = 'Delete';

        deleteButton.addEventListener('click', () => {
          deleteTenant(index);
        });

        li.appendChild(deleteButton);
        return li;
      }
  );
}

function updateAdditionalCostList() {
  additionalCostList.innerHTML = '';
  Object.keys(listOfRegisteredAdditionalCosts).forEach((category, index) => {
    const costs = listOfRegisteredAdditionalCosts[category];
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'dynamic-container';

    const categoryHeading = document.createElement('strong');
    categoryHeading.className = 'dynamic-heading';
    categoryHeading.textContent = category;
    categoryDiv.appendChild(categoryHeading);

    const deleteCategoryButton = document.createElement('button');
    deleteCategoryButton.className = 'dynamic-btn';
    deleteCategoryButton.textContent = 'Delete Category';
    deleteCategoryButton.addEventListener('click', () => {
      deleteAdditionalCost(category);
    });
    categoryDiv.appendChild(deleteCategoryButton);

    costs.forEach((cost, costIndex) => {
      const costInfo = `From ${cost.startMonth}:\nReal: ${cost.realCost}, Buffer: ${cost.bufferCost}\nTotal: ${cost.realCost + cost.bufferCost}`;
      appendToElement(categoryDiv, costInfo, 'p', 'dynamic-text');

      const deleteButton = document.createElement('button');
      deleteButton.className = 'dynamic-btn';
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', () => {
        deleteIndividualCost(category, costIndex);
      });
      categoryDiv.appendChild(deleteButton);
    });

    additionalCostList.appendChild(categoryDiv);
  });
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
        deleteButton.textContent = 'Delete';

        deleteButton.addEventListener('click', () => {
          deleteBilling(index);
        });

        li.appendChild(deleteButton);
        return li;
      }
  );
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

  displayResults(div, sumOfAdvanceExpensePayments, sumOfBufferPayments, pendingPaymentsPerMonth, tenantResults);
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
    const ratesText = calculateRatesText(data.rates);
    const pendingText = calculatePendingText(data.months);
    const totalPendingPaymentsNet = roundToTwoDecimals(data.pendingPaymentsWhole - data.buffer);

    tenantResults[tenant] = {
      affectedMonths,
      ratesText,
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

function displayResults(div, sumOfAdvanceExpensePayments, sumOfBufferPayments, pendingPaymentsPerMonth, tenantResults) {
  appendToElement(div, `Advance expense payments: ${sumOfAdvanceExpensePayments}`);
  appendToElement(div, `Buffer payments: ${sumOfBufferPayments}`);
  appendToElement(div, `Pending payments per month: ${roundToTwoDecimals(pendingPaymentsPerMonth)}`);
  appendToElement(div, `Tenants:`);

  Object.entries(tenantResults).forEach(([tenant, data]) => {
    appendToElement(div, `${tenant}:`, 'h4');
    appendToElement(div, `Affected months: ${data.affectedMonths}`);
    appendToElement(div, data.ratesText);
    appendToElement(div, "Pending payments per Month: ");
    appendToElement(div, data.pendingText);
    appendToElement(div, `Total pending payments net: ${data.totalPendingPaymentsNet}`, 'strong');
  });
}


// Export and import logic
function exportData() {
  console.log(listOfRegisteredAdditionalCosts)
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
    listOfRegisteredTenants = importedData.tenants;
    listOfRegisteredAdditionalCosts = importedData.additionalCosts;
    listOfRegisteredBilling = importedData.billing;
    updateTenantList();
    updateAdditionalCostList();
    updateBillingList();
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
