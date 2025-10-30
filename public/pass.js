
document.addEventListener('DOMContentLoaded', function () {
  const newPwd = document.getElementById('newPassword');
  const confirmPwd = document.getElementById('confirmPassword');
  const form = document.getElementById('resetForm');


  const msg = document.createElement('div');
  msg.id = 'pwMismatchMsg';
  msg.setAttribute('role', 'alert');
  msg.className = 'mt-2 text-danger';
  msg.style.display = 'none';
  msg.textContent = 'Your password did not match!! Please retype your password correctly';

 
  confirmPwd.parentNode.insertBefore(msg, confirmPwd.nextSibling);

  function checkMatch(showIfEmpty = false) {
    const a = newPwd.value;
    const b = confirmPwd.value;
 
    if ((b !== '' || showIfEmpty) && a !== b) {
      msg.style.display = 'block';
      return false;
    } else {
      msg.style.display = 'none';
      return true;
    }
  }


  newPwd.addEventListener('input', () => checkMatch());
  confirmPwd.addEventListener('input', () => checkMatch());

 
  form.addEventListener('submit', function (e) {
    if (!checkMatch(true)) { 
      e.preventDefault();
      confirmPwd.focus();
    }
  });
});

