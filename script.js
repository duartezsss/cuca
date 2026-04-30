const OFFERS = {
  1: { label: "1 par", amount: 3478, price: "R$ 34,78", oldPrice: "R$ 49,90", discount: "-30% OFF" },
  2: { label: "2 pares", amount: 6288, price: "R$ 62,88", oldPrice: "R$ 99,80", discount: "-37% OFF" },
  3: { label: "3 pares", amount: 8963, price: "R$ 89,63", oldPrice: "R$ 149,70", discount: "-40% OFF" },
  4: { label: "4 pares", amount: 12431, price: "R$ 124,31", oldPrice: "R$ 199,60", discount: "-37% OFF" }
};

const COLORS = ["Rose", "Cinza", "Preto", "Azul Marinho"];
const SIZES = Array.from({ length: 12 }, (_, index) => String(index + 32));
const PRODUCT_IMAGES = {
  "Rose": "assets/Produtos/rose.webp",
  "Cinza": "assets/Produtos/cinza1.webp",
  "Preto": "assets/Produtos/preto1.webp",
  "Azul Marinho": "assets/Produtos/azulmarinho.webp"
};

const feedbackImages = [
  "assets/Feedbacks/br-11134103-7r98o-mdj5e2150us14f.webp",
  "assets/Feedbacks/br-11134103-81z1k-mgmhu7x0i687a5.webp",
  "assets/Feedbacks/br-11134103-81z1k-mgvsafxoljwk84.webp",
  "assets/Feedbacks/br-11134103-81z1k-mig2byub1ern38.webp",
  "assets/Feedbacks/br-11134103-81ztc-mj5qq3cj0yyqfb.webp",
  "assets/Feedbacks/br-11134103-81zte-mkqvvlxkjzsx10.webp",
  "assets/Feedbacks/br-11134103-81zts-mks4i169dz411e.webp",
  "assets/Feedbacks/br-11134103-81ztw-mkphom37liipf2.webp"
];

const testimonials = [
  ["Maria Aparecida", "São Paulo/SP", "Antes eu sentia muita dor no pé no fim do dia, comprei sem muita fé e melhorou MUITO kkk"],
  ["Renata Oliveira", "Curitiba/PR", "Gente, sério, que sapatilha confortável, uso o dia inteiro no trabalho."],
  ["Joana Martins", "Belo Horizonte/MG", "Chegou super rápido, antes do prazo ainda, gostei demais."],
  ["Cláudia Pereira", "Salvador/BA", "Comprei pra minha mãe e ela não tira do pé agora kkk."],
  ["Ana Paula", "Campinas/SP", "Muito mais bonita pessoalmente do que na foto e bem leve."],
  ["Simone Ribeiro", "Rio de Janeiro/RJ", "Trabalho em pé o dia todo e ajudou bastante na dor."],
  ["Luciana Costa", "Goiânia/GO", "Peguei 2 pares e me arrependi de não ter pego logo 3."],
  ["Patrícia Alves", "Recife/PE", "Tenho fascite plantar e ajudou bastante. Muito macia por dentro."]
];

const state = {
  quantity: 1,
  selectedPairs: [],
  pixHash: "",
  statusInterval: null,
  timerInterval: null
};

const moneyFromCents = cents => (cents / 100).toLocaleString("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const onlyDigits = value => String(value || "").replace(/\D/g, "");

function captureUtms() {
  const params = new URLSearchParams(window.location.search);
  const keys = [
    "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
    "src", "sck", "gclid", "fbclid", "wbraid", "gbraid"
  ];
  const stored = JSON.parse(localStorage.getItem("sapatilha_utms") || "{}");
  const current = {};

  keys.forEach(key => {
    const value = params.get(key);
    if (value) current[key] = value;
  });

  const merged = { ...stored, ...current };
  localStorage.setItem("sapatilha_utms", JSON.stringify(merged));
  return merged;
}

function getUtms() {
  return JSON.parse(localStorage.getItem("sapatilha_utms") || "{}");
}

function renderPairSelectors() {
  const container = document.querySelector("#pairSelectors");
  const previous = state.selectedPairs;
  state.selectedPairs = Array.from({ length: state.quantity }, (_, index) => previous[index] || { color: "", size: "" });

  container.innerHTML = state.selectedPairs.map((pair, index) => `
    <div class="pair-card">
      <h3>Par ${index + 1}</h3>
      <div class="pair-controls">
        <label>Cor
          <select name="color-${index}" data-pair="${index}" data-field="color" required>
            <option value="">Selecione a cor</option>
            ${COLORS.map(color => `<option value="${color}" ${pair.color === color ? "selected" : ""}>${color}</option>`).join("")}
          </select>
        </label>
        <label>Tamanho
          <select name="size-${index}" data-pair="${index}" data-field="size" required>
            <option value="">Selecione o tamanho</option>
            ${SIZES.map(size => `<option value="${size}" ${pair.size === size ? "selected" : ""}>${size}</option>`).join("")}
          </select>
        </label>
      </div>
    </div>
  `).join("");
}

function updateOffer(quantity) {
  state.quantity = Number(quantity);
  const offer = OFFERS[state.quantity];
  document.querySelector("#currentPrice").textContent = offer.price;
  document.querySelector("#oldPrice").textContent = offer.oldPrice;
  document.querySelector("#discountBadge").textContent = offer.discount;
  document.querySelector("#priceNote").textContent = `ou em até 5x no cartão • PIX por ${offer.price}`;
  document.querySelectorAll(".offer-card").forEach(card => {
    card.classList.toggle("active", card.querySelector("input").value === String(state.quantity));
  });
  renderPairSelectors();
}

function validatePairs() {
  const selects = [...document.querySelectorAll("#pairSelectors select")];
  const invalid = selects.find(select => !select.value);
  if (invalid) {
    invalid.focus();
    invalid.reportValidity();
    return false;
  }
  return true;
}

function syncPairsFromForm() {
  document.querySelectorAll("#pairSelectors select").forEach(select => {
    const index = Number(select.dataset.pair);
    const field = select.dataset.field;
    state.selectedPairs[index][field] = select.value;
  });
}

function openCheckout() {
  const modal = document.querySelector("#checkoutModal");
  updateSummary();
  showStep(1);
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeCheckout() {
  const modal = document.querySelector("#checkoutModal");
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function showStep(step) {
  document.querySelectorAll(".checkout-step").forEach(section => {
    section.classList.toggle("active", section.dataset.step === String(step));
  });
  document.querySelectorAll(".step-dot").forEach(dot => {
    dot.classList.toggle("active", Number(dot.dataset.stepDot) <= Number(step));
  });
}

function stepIsValid(step) {
  const fields = [...document.querySelectorAll(`[data-step="${step}"] input[required]`)];
  const invalid = fields.find(field => !field.checkValidity());
  if (invalid) {
    invalid.reportValidity();
    return false;
  }
  return true;
}

function updateSummary() {
  const offer = OFFERS[state.quantity];
  const items = state.selectedPairs.map((pair, index) => `Par ${index + 1}: ${pair.color}, tamanho ${pair.size}`).join("<br>");
  document.querySelector("#orderSummary").innerHTML = `
    <strong>Sapatilha Ortopédica</strong><br>
    ${offer.label} - <strong>${offer.price}</strong><br>
    ${items}
  `;
}

async function fillAddressByCep(cep) {
  const cleanCep = onlyDigits(cep);
  if (cleanCep.length !== 8) return;

  const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
  const data = await response.json();
  if (data.erro) return;

  const form = document.querySelector("#checkoutForm");
  form.street.value = data.logradouro || "";
  form.neighborhood.value = data.bairro || "";
  form.city.value = data.localidade || "";
  form.state.value = data.uf || "";
}

function buildPayload() {
  const form = document.querySelector("#checkoutForm");
  const formData = new FormData(form);
  const customer = {
    name: formData.get("name"),
    email: formData.get("email"),
    phone_number: formData.get("phone_number"),
    document: formData.get("document")
  };
  const address = {
    zip: formData.get("zip"),
    street: formData.get("street"),
    number: formData.get("number"),
    complement: formData.get("complement"),
    neighborhood: formData.get("neighborhood"),
    city: formData.get("city"),
    state: formData.get("state")
  };

  return {
    product: "Sapatilha Ortopédica",
    quantity: state.quantity,
    amount: OFFERS[state.quantity].amount,
    customer,
    address,
    items: state.selectedPairs,
    utms: getUtms(),
    checkoutUrl: window.location.href
  };
}

async function createPix() {
  const payload = buildPayload();
  const submit = document.querySelector('.checkout-step[data-step="3"] .buy-button');
  submit.disabled = true;
  submit.textContent = "Gerando Pix...";

  try {
    const response = await fetch("api/pix-proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || "Não foi possível gerar o Pix.");
    renderPix(data);
  } catch (error) {
    alert(error.message || "Erro ao gerar pagamento Pix.");
  } finally {
    submit.disabled = false;
    submit.textContent = "Gerar Pix";
  }
}

function renderPix(data) {
  state.pixHash = data.hash || "";
  const pixCode = data?.pix?.pix_qr_code || data?.pix_qr_code || data?.qr_code || "";
  const result = document.querySelector("#pixResult");
  const copy = document.querySelector("#pixCopy");
  const qrCode = document.querySelector("#qrCode");

  result.hidden = false;
  copy.value = pixCode;
  qrCode.innerHTML = "";

  if (/^data:image|^https?:\/\//.test(pixCode)) {
    const img = document.createElement("img");
    img.src = pixCode;
    img.alt = "QR Code Pix";
    qrCode.appendChild(img);
  } else if (window.QRCode && pixCode) {
    new QRCode(qrCode, {
      text: pixCode,
      width: 236,
      height: 236,
      correctLevel: QRCode.CorrectLevel.M
    });
  } else {
    qrCode.textContent = "Use o código Pix copia e cola abaixo.";
  }

  startTimer(data?.pix?.expiration_date);
  startStatusPolling();
}

function startTimer(expirationDate) {
  clearInterval(state.timerInterval);
  const fallbackEnd = Date.now() + (5 * 60 * 1000);
  const apiEnd = expirationDate ? new Date(expirationDate).getTime() : 0;
  const end = Number.isFinite(apiEnd) && apiEnd > Date.now() ? apiEnd : fallbackEnd;

  function tick() {
    const remaining = Math.max(0, end - Date.now());
    const minutes = String(Math.floor(remaining / 60000)).padStart(2, "0");
    const seconds = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");
    document.querySelector("#pixTimer").textContent = `${minutes}:${seconds}`;
    if (remaining <= 0) {
      clearInterval(state.timerInterval);
      document.querySelector("#paymentStatus").textContent = "Pix expirado. Gere um novo código.";
    }
  }

  tick();
  state.timerInterval = setInterval(tick, 1000);
}

function startStatusPolling() {
  clearInterval(state.statusInterval);
  if (!state.pixHash) return;

  async function check() {
    try {
      const response = await fetch(`api/pix-proxy?action=check_status&hash=${encodeURIComponent(state.pixHash)}`);
      const data = await response.json();
      const status = data.payment_status || data.status || "";
      if (status === "paid" || status === "approved") {
        clearInterval(state.statusInterval);
        document.querySelector("#paymentStatus").textContent = "Pagamento aprovado!";
        if (data.upsell_url) {
          window.location.href = data.upsell_url;
        } else {
          document.querySelector("#qrCode").innerHTML = "<strong>Pagamento aprovado. Obrigado pela compra!</strong>";
        }
      }
    } catch (error) {
      document.querySelector("#paymentStatus").textContent = "Verificando pagamento...";
    }
  }

  check();
  state.statusInterval = setInterval(check, 5000);
}

function renderTestimonials() {
  const grid = document.querySelector("#testimonialGrid");
  grid.innerHTML = testimonials.map((item, index) => `
    <article class="testimonial-card">
      <img src="${feedbackImages[index]}" alt="Feedback de ${item[0]}">
      <div class="stars">★★★★★</div>
      <p>"${item[2]}"</p>
      <footer>
        <strong>${item[0]}</strong>
        <small>${item[1]}</small>
      </footer>
    </article>
  `).join("");
}

function bindEvents() {
  document.querySelectorAll(".thumb").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelector("#mainImage").src = button.dataset.image;
      document.querySelectorAll(".thumb").forEach(thumb => thumb.classList.remove("active"));
      button.classList.add("active");
    });
  });

  document.querySelectorAll('input[name="quantity"]').forEach(input => {
    input.addEventListener("change", () => updateOffer(input.value));
  });

  document.querySelector("#pairSelectors").addEventListener("change", event => {
    if (!event.target.matches("select")) return;
    syncPairsFromForm();
    if (event.target.dataset.field === "color" && PRODUCT_IMAGES[event.target.value]) {
      document.querySelector("#mainImage").src = PRODUCT_IMAGES[event.target.value];
    }
  });

  document.querySelector("#productForm").addEventListener("submit", event => {
    event.preventDefault();
    syncPairsFromForm();
    if (!validatePairs()) return;
    openCheckout();
  });

  document.querySelector("#closeCheckout").addEventListener("click", closeCheckout);
  document.querySelector("#checkoutModal").addEventListener("click", event => {
    if (event.target.id === "checkoutModal") closeCheckout();
  });

  document.querySelectorAll("[data-next]").forEach(button => {
    button.addEventListener("click", () => {
      const current = Number(button.closest(".checkout-step").dataset.step);
      if (stepIsValid(current)) {
        updateSummary();
        showStep(button.dataset.next);
      }
    });
  });

  document.querySelectorAll("[data-prev]").forEach(button => {
    button.addEventListener("click", () => showStep(button.dataset.prev));
  });

  document.querySelector('#checkoutForm input[name="zip"]').addEventListener("blur", event => {
    fillAddressByCep(event.target.value).catch(() => {});
  });

  document.querySelector("#checkoutForm").addEventListener("submit", event => {
    event.preventDefault();
    if (stepIsValid(3)) createPix();
  });

  document.querySelector("#copyPix").addEventListener("click", async () => {
    const code = document.querySelector("#pixCopy").value;
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(code);
    } else {
      const textarea = document.querySelector("#pixCopy");
      textarea.select();
      document.execCommand("copy");
    }
    document.querySelector("#copyPix").textContent = "Código copiado";
    setTimeout(() => document.querySelector("#copyPix").textContent = "Copiar código Pix", 1800);
  });
}

captureUtms();
renderTestimonials();
renderPairSelectors();

let reviewPopupTimeout = null;

function openReviewPopup() {
  const modal = document.querySelector("#reviewPopupModal");
  if (!modal) return;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  
  clearTimeout(reviewPopupTimeout);
  reviewPopupTimeout = setTimeout(closeReviewPopup, 10000);
}

function closeReviewPopup() {
  const modal = document.querySelector("#reviewPopupModal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  clearTimeout(reviewPopupTimeout);
}

document.querySelector(".review-button")?.addEventListener("click", openReviewPopup);
document.querySelector("#closeReviewPopup")?.addEventListener("click", closeReviewPopup);
bindEvents();
