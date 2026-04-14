/** Auto-submit POST form (eSewa ePay v2) and navigate to payment host. */
export function submitEsewaFormPost(formUrl, fields) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = formUrl;
  form.style.display = 'none';
  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value == null ? '' : String(value);
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
}
