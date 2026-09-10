(async()=>{
  const assert=(condition,message)=>{if(!condition)throw new Error(message)};
  const settle=()=>new Promise(r=>setTimeout(r,80));
  const button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===text);
  const click=async text=>{button(text).click();await settle()};
  const set=async(name,value)=>{
    const el=document.querySelector(`[name="${name}"]`);
    Object.getOwnPropertyDescriptor(el.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(el,value);
    el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));await settle();
  };
  assert(Array.isArray(window.manualCalls),'Only use isolated fixture');
  await click('Bağış kaydı');await set('campaignId','1');await set('quantity','3');await set('receivedAmount','5500');
  assert(button('Ödeme alındı — kaydet').disabled,'Underpayment must disable save');
  assert(document.body.innerText.includes('eksik'),'Missing amount must be visible');
  await set('receivedAmount','6000');await set('phone','05551234567');
  document.querySelector('[name="phone"]').focus();document.querySelector('[name="donorName"]').focus();await settle();
  assert(document.querySelector('[name="donorName"]').value==='Kayıtlı Bağışçı','Known name should autofill');
  await set('donorName','Düzenlenmiş İsim');document.querySelector('[name="contactConsent"]').click();await settle();
  const save=button('Ödeme alındı — kaydet');save.click();save.click();await new Promise(r=>setTimeout(r,200));
  assert(window.manualCalls.length===1,'Double click creates one request');
  const data=window.manualCalls[0];assert(data.expectedAmount==='6000.00' && data.quantity==='3','Share calculation');
  assert(data.donorName==='Düzenlenmiş İsim','Edited name retained');
  assert(!('file' in data),'No file bytes sent with payment');
  assert(document.querySelector('fieldset').disabled,'Saved payment fields must lock');
  await click('Dekontu ekle / tekrar dene');assert(window.manualCalls.length===1,'Proof retry must not create another donation');
  return 'PASS: underpayment blocked, amount calculation, phone-name autofill/edit, double-click protection, no proof required, saved state locked and proof retry does not recreate payment.';
})()
