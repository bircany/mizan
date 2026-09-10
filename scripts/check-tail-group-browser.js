(async () => {
  const assert = (ok, text) => {
    if (!ok) throw new Error(text);
  };
  const tick = () => new Promise((r) => setTimeout(r, 40));
  const set = async (name, value) => {
    const el = document.querySelector(`[name="${name}"]`);
    Object.getOwnPropertyDescriptor(
      el.tagName === "TEXTAREA"
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype,
      "value",
    ).set.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
  };
  document.querySelector("button").click();
  await tick();
  assert(document.querySelector("dialog").open, "dialog opens");
  const submit = () => document.querySelector("button[type=submit]");
  assert(submit().disabled, "requires explicit consent");
  await set("count0", "4");
  assert(submit().disabled, "wrong total blocked");
  await set("count1", "3");
  assert(
    document.body.innerText.includes("bu gruba taşınacak"),
    "member movement preview",
  );
  await set("price0", "2100");
  await set("price1", "2200");
  await set("reason", "Test dağılım düzeltmesi");
  document.querySelector("[name=confirmed]").click();
  await tick();
  assert(!submit().disabled, "valid confirmed plan can save");
  await set("price0", "2200");
  assert(
    !document.querySelector("[name=confirmed]").checked,
    "price edits revoke old consent",
  );
  document.querySelector("[name=confirmed]").click();
  await tick();
  submit().click();
  submit().click();
  await new Promise((r) => setTimeout(r, 300));
  assert(window.tailSaves.length === 1, "double click only saves once");
  assert(
    window.tailSaves[0].count0 === "4" && window.tailSaves[0].count1 === "3",
    "exact 4+3 payload",
  );
  assert(document.querySelector("fieldset").disabled, "saved form locked");
  assert(!document.body.innerText.includes("SECRET"), "no internal details");
  return "PASS: preview, 4+3 member movement, explicit consent, consent reset, exact payload, duplicate-click guard.";
})();
