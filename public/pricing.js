document.addEventListener("DOMContentLoaded", () => {
  const orderButtons = document.querySelectorAll(".order-btn");

  orderButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();

      const card = btn.closest(".card");
      const service = card.querySelector(".card-title").innerText.trim();
      const priceText = card.querySelector("h2").innerText.trim();
      const price = priceText.replace("$", "").trim();

      
      const paymentUrl = `payment.html?service=${encodeURIComponent(service)}&price=${encodeURIComponent(price)}`;
      window.location.href = paymentUrl;
    });
  });
});
