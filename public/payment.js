
const urlParams = new URLSearchParams(window.location.search);
const service = urlParams.get('service') || 'Unknown Service';
const price = urlParams.get('price') || '0.00';


document.getElementById('serviceName').innerText = service;
document.getElementById('servicePrice').innerText = '$' + price;
document.getElementById('amountInput').value = price;
document.getElementById('serviceInput').value = service;


document.getElementById('paymentForm').addEventListener('submit', function(e) {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const paymentMethod = document.getElementById('paymentMethod').value;
  const amount = document.getElementById('amountInput').value;
  const serviceName = document.getElementById('serviceInput').value;

  if (!paymentMethod) {
    alert('Please select a payment method');
    return;
  }


  if (paymentMethod === 'paypal') {
    const paypalLink = `https://www.paypal.com/paypalme/sajibroyal`;
    window.open(paypalLink, '_blank');
  }


  else if (paymentMethod === 'skrill') {
    const skrillName = encodeURIComponent('Sajib Deb');
    const skrillKey = 'W9stdajqn8wUTVs1o-Hat9PYecv';

    const skrillLink = `https://skrill.me/rq/${skrillName}/${amount}/USD?key=${skrillKey}&note=${encodeURIComponent(serviceName)}`;

    alert('Redirecting to Skrill for secure payment...');
    window.location.href = skrillLink;
  }
});
