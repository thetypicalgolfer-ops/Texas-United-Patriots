(function () {
  var P = window.TUP_PRODUCTS, G = window.TUP_GALLERY, cur = 0, size = null, qty = 1;
  var $ = function (id) { return document.getElementById(id); };
  var BAG = "tup_bag_v1";
  function bag() { try { return JSON.parse(localStorage.getItem(BAG)) || []; } catch (e) { return []; } }
  function save(b) { try { localStorage.setItem(BAG, JSON.stringify(b)); } catch (e) {} }
  function price(p, s) { return (p.prices && s && p.prices[s]) || p.price; }
  function render() {
    var p = P[cur];
    $("pName").textContent = p.name; $("pColor").textContent = p.color; $("pDetail").textContent = p.detail;
    if (p.sizes.length === 1) size = p.sizes[0]; else if (p.sizes.indexOf(size) < 0) size = null;
    $("pPrice").textContent = (p.prices && !size) ? "From $" + Math.min.apply(null, Object.keys(p.prices).map(function (k) { return p.prices[k]; })) : "$" + price(p, size);
    $("sizes").innerHTML = p.sizes.map(function (s) {
      var on = s === size;
      return '<button type="button" data-size="' + s + '" class="min-w-14 h-12 px-4 border-2 font-headline font-bold text-lg ' + (on ? "border-on-surface bg-on-surface text-white" : "border-slate-300 hover:border-on-surface") + '">' + s + "</button>";
    }).join("");
    $("fitBtn").style.display = p.apparel ? "" : "none";
    document.querySelectorAll(".prod-btn").forEach(function (b, i) { b.className = b.className.replace(/border-(on-surface|slate-200)/, i === cur ? "border-on-surface" : "border-slate-200"); });
    $("sizeErr").classList.add("hidden");
  }
  document.querySelectorAll(".prod-btn").forEach(function (b) { b.addEventListener("click", function () { cur = +b.dataset.prod; render(); }); });
  $("sizes").addEventListener("click", function (e) { var b = e.target.closest("[data-size]"); if (!b) return; size = b.dataset.size; render(); });
  $("qMinus").onclick = function () { qty = Math.max(1, qty - 1); $("qty").textContent = qty; };
  $("qPlus").onclick = function () { qty = Math.min(10, qty + 1); $("qty").textContent = qty; };
  $("fitBtn").onclick = function () { var d = document.querySelectorAll("details")[1]; d.open = true; d.scrollIntoView({ behavior: "smooth", block: "center" }); };
  document.querySelectorAll("[data-thumb]").forEach(function (t) {
    t.addEventListener("click", function () {
      $("mainImg").src = "./" + G[+t.dataset.thumb];
      document.querySelectorAll("[data-thumb]").forEach(function (x) { x.className = x.className.replace(/border-(on-surface|transparent)/, x === t ? "border-on-surface" : "border-transparent"); });
    });
  });
  // Bag drawer
  var d = document.createElement("div");
  d.innerHTML = '<button type="button" id="bagFab" class="fixed bottom-6 right-6 z-[60] bg-on-surface text-white font-headline font-black uppercase tracking-wider px-6 h-14 shadow-xl">Bag (<span id="bagN">0</span>)</button>' +
    '<div id="bagShade" class="fixed inset-0 z-[70] bg-black/50 hidden"></div>' +
    '<aside id="bagDrawer" class="fixed top-0 right-0 z-[80] h-full w-full max-w-md bg-white shadow-2xl translate-x-full transition-transform duration-300 flex flex-col" aria-label="Your bag">' +
    '<div class="flex items-center justify-between border-b border-slate-200 px-6 h-20"><h2 class="font-headline font-black text-2xl uppercase">Your Bag</h2><button type="button" id="bagClose" class="text-3xl" aria-label="Close">&times;</button></div>' +
    '<div id="bagList" class="flex-1 overflow-y-auto px-6 divide-y divide-slate-200"></div>' +
    '<div class="border-t border-slate-200 p-6"><div class="flex justify-between font-headline font-black text-xl uppercase"><span>Subtotal</span><span id="bagSub">$0</span></div>' +
    '<p class="mt-1 font-body text-base text-on-surface-variant">Shipping and tax are calculated at checkout.</p>' +
    '<div id="ckForm"><button type="button" id="ckBtn" class="mt-5 w-full bg-primary hover:bg-primary-container text-white font-headline font-black text-lg uppercase tracking-[0.08em] h-14">Checkout</button></div></div></aside>';
  document.body.appendChild(d);
  function open(o) { $("bagDrawer").style.transform = o ? "translateX(0)" : ""; $("bagShade").classList.toggle("hidden", !o); }
  function draw() {
    var b = bag(), n = 0, sub = 0;
    $("bagList").innerHTML = b.length ? b.map(function (it, i) {
      n += it.qty; sub += it.qty * it.price;
      return '<div class="py-5 flex gap-4"><img src="./' + it.img + '" alt="" class="w-20 h-20 object-cover"/><div class="flex-1 min-w-0"><p class="font-headline font-bold text-lg uppercase leading-tight">' + it.name + '</p><p class="font-body text-base text-on-surface-variant">' + it.color + " · " + it.size + " · Qty " + it.qty + '</p><p class="font-headline font-bold text-lg">$' + it.qty * it.price + '</p></div><button type="button" data-rm="' + i + '" class="self-start font-headline text-base uppercase underline">Remove</button></div>';
    }).join("") : '<p class="py-10 font-body text-lg text-on-surface-variant">Your bag is empty.</p>';
    $("bagN").textContent = n; $("bagSub").textContent = "$" + sub;
  }
  $("bagList").addEventListener("click", function (e) { var r = e.target.closest("[data-rm]"); if (!r) return; var b = bag(); b.splice(+r.dataset.rm, 1); save(b); draw(); });
  $("bagFab").onclick = function () { draw(); open(true); };
  $("bagClose").onclick = $("bagShade").onclick = function () { open(false); };
  $("addBtn").onclick = function () {
    var p = P[cur];
    if (!size) { $("sizeErr").classList.remove("hidden"); return; }
    var b = bag(), k = p.id + "|" + size, f = b.filter(function (x) { return x.k === k; })[0];
    if (f) f.qty = Math.min(10, f.qty + qty); else b.push({ k: k, id: p.id, name: p.name, color: p.color, size: size, qty: qty, price: price(p, size), img: G[G.length - 1] });
    save(b); draw(); open(true);
  };
  // Checkout: the store takes orders once a payment processor is connected; until then, hold the bag and get the email.
  $("ckBtn").onclick = function () {
    if (!bag().length) return;
    $("ckForm").innerHTML = '<p class="mt-5 font-body text-lg">Online checkout opens soon. Leave your name and email and we will hold your bag and email you the moment it opens.</p>' +
      '<input id="ckName" placeholder="Name" class="mt-3 w-full border border-slate-300 px-4 h-12 font-body text-lg"/><input id="ckEmail" type="email" placeholder="Email" class="mt-2 w-full border border-slate-300 px-4 h-12 font-body text-lg"/>' +
      '<p id="ckErr" class="mt-2 font-headline text-lg text-primary"></p><button type="button" id="ckSend" class="mt-2 w-full bg-primary text-white font-headline font-black text-lg uppercase tracking-[0.08em] h-14">Hold My Bag</button>';
    $("ckSend").onclick = function () {
      var nm = $("ckName").value.trim(), em = $("ckEmail").value.trim();
      if (!nm || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { $("ckErr").textContent = "Please enter your name and a valid email."; return; }
      var items = bag().map(function (x) { return x.qty + " x " + x.name + " (" + x.color + ", " + x.size + ")"; }).join("; ");
      fetch("https://script.google.com/macros/s/AKfycbywh83BRIfdpq0jUO3uDIk2W09aNIaw4xvs3IxvJVWrBWJ8nm0UczIur_DVKRIidMW9/exec", { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ name: nm, email: em, source: "gear-preorder", article: items, referrer: location.pathname }) }).catch(function () {});
      $("ckForm").innerHTML = '<p class="mt-5 font-headline font-black text-xl uppercase">Your bag is saved.</p><p class="mt-1 font-body text-lg text-on-surface-variant">We will email ' + em.replace(/</g, "") + ' the moment checkout opens.</p>';
    };
  };
  render(); draw();
})();
