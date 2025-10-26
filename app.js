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
  
  // Calculate totals for overview
  let totalAdvancePayments = 0;
  let totalBufferPayments = 0;
  let totalPendingPayments = 0;
  let allTenantResults = {};
  
  // First pass: calculate all values
  const calculatedBillings = [];
  
  listOfRegisteredBilling.forEach(bill => {
    const billingTotalMonths = calculateTotalMonths(bill.start, bill.end);
    const sortedExpenseDurations = getSortedExpenseDurations(bill.category);
    const monthlyDetails = generateMonthlyDetails(bill.start, billingTotalMonths, sortedExpenseDurations);
    const tenantsBillingInformation = initializeTenantsBillingInformation();
    
    updateTenantsBillingInformation(monthlyDetails, tenantsBillingInformation);
    const { sumOfAdvanceExpensePayments, sumOfBufferPayments, pendingPaymentsPerMonth } = calculatePayments(monthlyDetails, tenantsBillingInformation, bill.pendingPayments);
    const tenantResults = calculateTenantResults(tenantsBillingInformation);
    
    // Accumulate totals
    totalAdvancePayments += sumOfAdvanceExpensePayments;
    totalBufferPayments += sumOfBufferPayments;
    totalPendingPayments += bill.pendingPayments;
    
    // Merge tenant results
    Object.keys(tenantResults).forEach(tenantName => {
      if (!allTenantResults[tenantName]) {
        allTenantResults[tenantName] = {
          totalPendingPaymentsNet: 0,
          affectedMonths: 0
        };
      }
      allTenantResults[tenantName].totalPendingPaymentsNet += tenantResults[tenantName].totalPendingPaymentsNet;
      allTenantResults[tenantName].affectedMonths += tenantResults[tenantName].affectedMonths;
    });
    
    calculatedBillings.push({
      bill,
      sumOfAdvanceExpensePayments,
      sumOfBufferPayments,
      pendingPaymentsPerMonth,
      tenantResults
    });
  });
  
  // Create general overview ONCE at the top
  if (calculatedBillings.length > 0) {
    createGeneralOverview(resultDiv, totalAdvancePayments, totalBufferPayments, totalPendingPayments, allTenantResults);
  }
  
  // Sort billing by category to group same categories together
  const sortedBilling = calculatedBillings.sort((a, b) => {
    // First sort by category name
    const categoryCompare = a.bill.category.localeCompare(b.bill.category);
    if (categoryCompare !== 0) return categoryCompare;
    // If same category, sort by start date
    return a.bill.start.localeCompare(b.bill.start);
  });
  
  // Second pass: display results for each billing
  sortedBilling.forEach(({ bill, sumOfAdvanceExpensePayments, sumOfBufferPayments, pendingPaymentsPerMonth, tenantResults }) => {
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
    
    displayResults(div, sumOfAdvanceExpensePayments, sumOfBufferPayments, bill.pendingPayments, pendingPaymentsPerMonth, tenantResults);
    resultDiv.appendChild(div);
  });
}

// Create general overview section
function createGeneralOverview(container, totalAdvancePayments, totalBufferPayments, totalPendingPayments, allTenantResults) {
  const totalPaymentRefund = Object.values(allTenantResults).reduce((sum, tenant) => sum + tenant.totalPendingPaymentsNet, 0);
  const totalTenants = Object.keys(allTenantResults).length;
  const affectedTenants = Object.values(allTenantResults).filter(t => t.affectedMonths > 0).length;
  const totalExpenses = totalAdvancePayments + totalBufferPayments;
  
  const overviewDiv = document.createElement('div');
  overviewDiv.className = 'general-overview';
  overviewDiv.style.background = 'linear-gradient(135deg, #5568d3 0%, #6a3d99 100%)';
  overviewDiv.style.padding = '24px';
  overviewDiv.style.borderRadius = '12px';
  overviewDiv.style.marginBottom = '32px';
  overviewDiv.style.color = 'white';
  overviewDiv.style.boxShadow = '0 4px 12px rgba(85, 104, 211, 0.3)';
  
  const overviewTitle = document.createElement('h3');
  overviewTitle.textContent = '📊 Overall Summary';
  overviewTitle.style.margin = '0 0 20px 0';
  overviewTitle.style.fontSize = '22px';
  overviewTitle.style.fontWeight = '700';
  
  const overviewGrid = document.createElement('div');
  overviewGrid.style.display = 'grid';
  overviewGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(180px, 1fr))';
  overviewGrid.style.gap = '16px';
  
  const createOverviewItem = (label, value, icon) => {
    const item = document.createElement('div');
    item.style.background = 'rgba(255, 255, 255, 0.15)';
    item.style.padding = '16px';
    item.style.borderRadius = '10px';
    item.style.backdropFilter = 'blur(10px)';
    item.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    
    item.innerHTML = `
      <div style="font-size: 12px; opacity: 0.9; margin-bottom: 6px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">${icon} ${label}</div>
      <div style="font-size: 24px; font-weight: 700;">${value}</div>
    `;
    return item;
  };
  
  overviewGrid.appendChild(createOverviewItem('Total Expenses', `${roundToTwoDecimals(totalExpenses)} €`, '💰'));
  overviewGrid.appendChild(createOverviewItem('Advance Payments', `${roundToTwoDecimals(totalAdvancePayments)} €`, '📋'));
  overviewGrid.appendChild(createOverviewItem('Buffer Payments', `${roundToTwoDecimals(totalBufferPayments)} €`, '🔒'));
  overviewGrid.appendChild(createOverviewItem('Pending Total', `${roundToTwoDecimals(totalPendingPayments)} €`, '💳'));
  
  const netResultLabel = totalPaymentRefund > 0 ? 'Net Payment' : (totalPaymentRefund < 0 ? 'Net Refund' : 'Balanced');
  const netResultIcon = totalPaymentRefund > 0 ? '↑' : (totalPaymentRefund < 0 ? '↓' : '✓');
  overviewGrid.appendChild(createOverviewItem(netResultLabel, `${netResultIcon} ${Math.abs(totalPaymentRefund).toFixed(2)} €`, '💸'));
  
  overviewDiv.appendChild(overviewTitle);
  overviewDiv.appendChild(overviewGrid);
  container.appendChild(overviewDiv);
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
  tenantList.innerHTML = '';
  
  if (listOfRegisteredTenants.length === 0) {
    return;
  }
  
  // Create a grid container for tenants
  const gridContainer = document.createElement('div');
  gridContainer.className = 'tenant-grid';
  gridContainer.style.display = 'grid';
  gridContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';
  gridContainer.style.gap = '16px';
  gridContainer.style.marginTop = '16px';
  
  listOfRegisteredTenants.forEach((tenant, index) => {
    const tenantCard = document.createElement('div');
    tenantCard.className = 'tenant-input-card';
    tenantCard.style.background = 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)';
    tenantCard.style.padding = '20px';
    tenantCard.style.borderRadius = '12px';
    tenantCard.style.border = '2px solid #e5e7eb';
    tenantCard.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
    tenantCard.style.transition = 'all 0.3s ease';
    
    const nameDiv = document.createElement('div');
    nameDiv.style.marginBottom = '12px';
    nameDiv.innerHTML = `<div style="color: #6b7280; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Tenant Name</div><div style="color: #1f2937; font-size: 18px; font-weight: 700;">${tenant.name}</div>`;
    
    const datesDiv = document.createElement('div');
    datesDiv.style.display = 'grid';
    datesDiv.style.gridTemplateColumns = '1fr 1fr';
    datesDiv.style.gap = '12px';
    datesDiv.style.marginBottom = '16px';
    datesDiv.style.paddingTop = '12px';
    datesDiv.style.borderTop = '1px solid #e5e7eb';
    
    const moveInDiv = document.createElement('div');
    moveInDiv.innerHTML = `<div style="color: #6b7280; font-size: 11px; font-weight: 600; margin-bottom: 4px;">Move In</div><div style="color: #0891b2; font-size: 14px; font-weight: 600;">${tenant.dateMoveIn}</div>`;
    
    const moveOutDiv = document.createElement('div');
    moveOutDiv.innerHTML = `<div style="color: #6b7280; font-size: 11px; font-weight: 600; margin-bottom: 4px;">Move Out</div><div style="color: #d97706; font-size: 14px; font-weight: 600;">${tenant.dateMoveOut}</div>`;
    
    datesDiv.appendChild(moveInDiv);
    datesDiv.appendChild(moveOutDiv);
    
    tenantCard.appendChild(nameDiv);
    tenantCard.appendChild(datesDiv);

    const deleteButton = document.createElement('button');
    deleteButton.classList.add('dynamic-btn');
    deleteButton.innerHTML = '🗑️ Delete Tenant';
    deleteButton.style.width = '100%';

    deleteButton.addEventListener('click', () => {
      deleteTenant(index);
    });

    tenantCard.appendChild(deleteButton);
    
    // Add hover effect
    tenantCard.addEventListener('mouseenter', () => {
      tenantCard.style.transform = 'translateY(-4px)';
      tenantCard.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
      tenantCard.style.borderColor = '#5568d3';
    });
    
    tenantCard.addEventListener('mouseleave', () => {
      tenantCard.style.transform = 'translateY(0)';
      tenantCard.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
      tenantCard.style.borderColor = '#e5e7eb';
    });
    
    gridContainer.appendChild(tenantCard);
  });
  
  tenantList.appendChild(gridContainer);
  saveDataToLocalStorage();
}

function updateAdditionalCostList() {
  additionalCostList.innerHTML = '';
  Object.keys(listOfRegisteredAdditionalCosts).forEach((category, index) => {
    const costs = listOfRegisteredAdditionalCosts[category];
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'dynamic-container';

    // Create collapsible header with clear visual indicator
    const categoryHeader = document.createElement('div');
    categoryHeader.className = 'expense-category-header';
    categoryHeader.style.display = 'flex';
    categoryHeader.style.justifyContent = 'space-between';
    categoryHeader.style.alignItems = 'center';
    categoryHeader.style.padding = '16px 20px';
    categoryHeader.style.background = 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)';
    categoryHeader.style.borderRadius = '10px';
    categoryHeader.style.cursor = 'pointer';
    categoryHeader.style.userSelect = 'none';
    categoryHeader.style.transition = 'all 0.3s ease';
    categoryHeader.style.marginBottom = '12px';
    
    const headerLeft = document.createElement('div');
    headerLeft.style.display = 'flex';
    headerLeft.style.alignItems = 'center';
    headerLeft.style.gap = '12px';
    
    const toggleIcon = document.createElement('span');
    toggleIcon.className = 'toggle-icon';
    toggleIcon.textContent = '▼';
    toggleIcon.style.fontSize = '16px';
    toggleIcon.style.color = 'white';
    toggleIcon.style.transition = 'transform 0.3s ease';
    toggleIcon.style.fontWeight = 'bold';
    
    const categoryHeading = document.createElement('strong');
    categoryHeading.className = 'dynamic-heading';
    categoryHeading.textContent = category;
    categoryHeading.style.color = 'white';
    categoryHeading.style.margin = '0';
    
    const clickHint = document.createElement('span');
    clickHint.textContent = 'Click to expand';
    clickHint.style.fontSize = '12px';
    clickHint.style.color = 'rgba(255,255,255,0.8)';
    clickHint.style.fontWeight = '500';
    
    headerLeft.appendChild(toggleIcon);
    headerLeft.appendChild(categoryHeading);
    categoryHeader.appendChild(headerLeft);
    categoryHeader.appendChild(clickHint);
    
    const collapsibleContent = document.createElement('div');
    collapsibleContent.className = 'collapsible-content-expense';
    collapsibleContent.style.maxHeight = '0';
    collapsibleContent.style.overflow = 'hidden';
    collapsibleContent.style.transition = 'max-height 0.4s ease';
    collapsibleContent.style.paddingTop = '0';
    
    let isExpanded = false;
    
    categoryHeader.addEventListener('click', (e) => {
      e.stopPropagation();
      isExpanded = !isExpanded;
      if (isExpanded) {
        collapsibleContent.style.maxHeight = '3000px';
        collapsibleContent.style.paddingTop = '12px';
        toggleIcon.style.transform = 'rotate(180deg)';
        clickHint.textContent = 'Click to collapse';
        categoryHeader.style.background = 'linear-gradient(135deg, #5558e0 0%, #7c4fe5 100%)';
      } else {
        collapsibleContent.style.maxHeight = '0';
        collapsibleContent.style.paddingTop = '0';
        toggleIcon.style.transform = 'rotate(0deg)';
        clickHint.textContent = 'Click to expand';
        categoryHeader.style.background = 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)';
      }
    });
    
    categoryHeader.addEventListener('mouseenter', () => {
      categoryHeader.style.transform = 'translateY(-2px)';
      categoryHeader.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)';
    });
    
    categoryHeader.addEventListener('mouseleave', () => {
      categoryHeader.style.transform = 'translateY(0)';
      categoryHeader.style.boxShadow = 'none';
    });
    
    categoryDiv.appendChild(categoryHeader);

    const deleteCategoryButton = document.createElement('button');
    deleteCategoryButton.className = 'dynamic-btn';
    deleteCategoryButton.innerHTML = '🗑️ Delete Category';
    deleteCategoryButton.style.marginBottom = '16px';
    deleteCategoryButton.addEventListener('click', () => {
      deleteAdditionalCost(category);
    });
    collapsibleContent.appendChild(deleteCategoryButton);

    costs.forEach((cost, costIndex) => {
      const costCard = document.createElement('div');
      costCard.className = 'cost-card';
      costCard.style.background = '#ffffff';
      costCard.style.padding = '16px';
      costCard.style.borderRadius = '8px';
      costCard.style.marginBottom = '12px';
      costCard.style.border = '1px solid #e5e7eb';
      
      const startLabel = document.createElement('div');
      startLabel.style.marginBottom = '8px';
      startLabel.innerHTML = `<span style="color: #6b7280; font-size: 13px; font-weight: 600;">START MONTH:</span> <span style="color: #1f2937; font-size: 14px;">${cost.startMonth}</span>`;
      
      const costsGrid = document.createElement('div');
      costsGrid.style.display = 'grid';
      costsGrid.style.gridTemplateColumns = '1fr 1fr';
      costsGrid.style.gap = '12px';
      costsGrid.style.marginBottom = '12px';
      
      const realCostDiv = document.createElement('div');
      realCostDiv.innerHTML = `<div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">Real Amount</div><div style="color: #0891b2; font-size: 16px; font-weight: 700;">${cost.realCost.toFixed(2)} €</div>`;
      
      const bufferCostDiv = document.createElement('div');
      bufferCostDiv.innerHTML = `<div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">Buffer Amount</div><div style="color: #6366f1; font-size: 16px; font-weight: 700;">${cost.bufferCost.toFixed(2)} €</div>`;
      
      costsGrid.appendChild(realCostDiv);
      costsGrid.appendChild(bufferCostDiv);
      
      const totalDiv = document.createElement('div');
      totalDiv.style.borderTop = '2px solid #e5e7eb';
      totalDiv.style.paddingTop = '12px';
      totalDiv.innerHTML = `<div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">Total Monthly</div><div style="color: #1f2937; font-size: 18px; font-weight: 700;">${(cost.realCost + cost.bufferCost).toFixed(2)} €</div>`;

      costCard.appendChild(startLabel);
      costCard.appendChild(costsGrid);
      costCard.appendChild(totalDiv);

      const deleteButton = document.createElement('button');
      deleteButton.className = 'dynamic-btn';
      deleteButton.innerHTML = '🗑️ Delete Cost Segment';
      deleteButton.style.marginTop = '12px';
      deleteButton.addEventListener('click', () => {
        deleteIndividualCost(category, costIndex);
      });
      costCard.appendChild(deleteButton);
      
      collapsibleContent.appendChild(costCard);
    });

    categoryDiv.appendChild(collapsibleContent);
    additionalCostList.appendChild(categoryDiv);
  });
  saveDataToLocalStorage();
}



function updateBillingList() {
  billingList.innerHTML = '';
  
  if (listOfRegisteredBilling.length === 0) {
    return;
  }
  
  // Create a grid container for billing
  const gridContainer = document.createElement('div');
  gridContainer.className = 'billing-grid';
  gridContainer.style.display = 'grid';
  gridContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(320px, 1fr))';
  gridContainer.style.gap = '16px';
  gridContainer.style.marginTop = '16px';
  
  listOfRegisteredBilling.forEach((bill, index) => {
    const billingCard = document.createElement('div');
    billingCard.className = 'billing-input-card';
    billingCard.style.background = '#ffffff';
    billingCard.style.padding = '16px';
    billingCard.style.borderRadius = '12px';
    billingCard.style.border = '2px solid #e5e7eb';
    billingCard.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
    billingCard.style.transition = 'all 0.3s ease';
    
    // Top row: Category and Period side by side
    const topRow = document.createElement('div');
    topRow.style.display = 'grid';
    topRow.style.gridTemplateColumns = '1fr 1fr';
    topRow.style.gap = '16px';
    topRow.style.marginBottom = '12px';
    topRow.style.paddingBottom = '12px';
    topRow.style.borderBottom = '1px solid #e5e7eb';
    
    const categoryDiv = document.createElement('div');
    categoryDiv.innerHTML = `<div style="color: #6b7280; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Type</div><div style="color: #5568d3; font-size: 15px; font-weight: 700;">${bill.category}</div>`;
    
    const periodDiv = document.createElement('div');
    periodDiv.innerHTML = `<div style="color: #6b7280; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Period</div><div style="color: #1f2937; font-size: 13px; font-weight: 600;">${bill.start} - ${bill.end}</div>`;
    
    topRow.appendChild(categoryDiv);
    topRow.appendChild(periodDiv);
    
    // Amount row: Compact badge
    // Treat 0 as positive/neutral (like in the results output)
    const isRefund = bill.pendingPayments < 0;
    const isZero = bill.pendingPayments === 0;
    const isPayment = bill.pendingPayments > 0;
    
    let amountColor, amountBg, amountLabel, amountIcon;
    
    if (isZero) {
      // Zero is positive/neutral - use cyan/green
      amountColor = '#14b8a6';
      amountBg = 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)';
      amountLabel = 'Balanced';
      amountIcon = '✓';
    } else if (isRefund) {
      // Negative (refund to tenants)
      amountColor = '#14b8a6';
      amountBg = 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)';
      amountLabel = 'Refund';
      amountIcon = '↓';
    } else {
      // Positive (payment needed)
      amountColor = '#d97706';
      amountBg = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
      amountLabel = 'Payment';
      amountIcon = '↑';
    }
    
    const amountRow = document.createElement('div');
    amountRow.style.display = 'flex';
    amountRow.style.justifyContent = 'space-between';
    amountRow.style.alignItems = 'center';
    amountRow.style.marginBottom = '12px';
    
    const amountBadge = document.createElement('div');
    amountBadge.style.background = amountBg;
    amountBadge.style.padding = '8px 14px';
    amountBadge.style.borderRadius = '8px';
    amountBadge.style.flex = '1';
    amountBadge.innerHTML = `<div style="color: rgba(255,255,255,0.85); font-size: 10px; font-weight: 600; text-transform: uppercase; margin-bottom: 2px;">${amountLabel}</div><div style="color: white; font-size: 18px; font-weight: 700;">${amountIcon} ${Math.abs(bill.pendingPayments).toFixed(2)} €</div>`;
    
    amountRow.appendChild(amountBadge);
    
    billingCard.appendChild(topRow);
    billingCard.appendChild(amountRow);

    const deleteButton = document.createElement('button');
    deleteButton.classList.add('dynamic-btn');
    deleteButton.innerHTML = '🗑️ Delete';
    deleteButton.style.width = '100%';
    deleteButton.style.padding = '8px';
    deleteButton.style.fontSize = '11px';

    deleteButton.addEventListener('click', () => {
      deleteBilling(index);
    });

    billingCard.appendChild(deleteButton);
    
    // Add hover effect
    billingCard.addEventListener('mouseenter', () => {
      billingCard.style.transform = 'translateY(-4px)';
      billingCard.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
      billingCard.style.borderColor = '#5568d3';
    });
    
    billingCard.addEventListener('mouseleave', () => {
      billingCard.style.transform = 'translateY(0)';
      billingCard.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
      billingCard.style.borderColor = '#e5e7eb';
    });
    
    gridContainer.appendChild(billingCard);
  });
  
  billingList.appendChild(gridContainer);
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
  
  // Summary Section (per category)
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