// One sample order, seen through three of the platform's views.
// null means the view doesn't return that column.
const VIEWS = { customer: 'v_customer_order_history', owner: 'v_restaurant_order_queue', admin: 'v_admin_order_overview' };
const ROWS = [
  ['Order',                { customer: '1042, ready', owner: '1042, ready', admin: '1042, ready' }],
  ['Customer',             { customer: null, owner: 'Dana W.', admin: 'Dana Whitfield' }],
  ['Dish',                 { customer: null, owner: '2 × shrimp and grits', admin: null }],
  ['Special instructions', { customer: null, owner: 'No onions', admin: null }],
  ['Order total',          { customer: '$37.69', owner: null, admin: '$37.69' }],
  ['Platform commission',  { customer: null, owner: null, admin: '$4.50' }],
  ['Driver',               { customer: 'Marcus', owner: null, admin: 'Marcus Bell' }],
  ['Driver’s vehicle',     { customer: 'Scooter', owner: null, admin: null }],
  ['Delivery address',     { customer: null, owner: null, admin: null }],
  ['Password hash',        { customer: null, owner: null, admin: null }],
];

const list = document.getElementById('order');
const viewName = document.getElementById('view');

function show(role) {
  viewName.textContent = VIEWS[role];
  list.replaceChildren(...ROWS.map(([name, values]) => {
    const row = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    const value = values[role];
    dt.textContent = name;
    dd.textContent = value ?? 'Not in this view';
    if (value === null) row.className = 'hidden-row';
    row.append(dt, dd);
    return row;
  }));
}

document.querySelectorAll('input[name="role"]').forEach((input) => {
  input.addEventListener('change', () => show(input.value));
});
show(document.querySelector('input[name="role"]:checked').value);
