/* =============================================
   Cr@ckFlow Pricing Page — pricing.js
   ============================================= */

document.addEventListener("DOMContentLoaded", () => {

    const orderButtons = document.querySelectorAll(".order-btn");

    console.log("Order buttons found:", orderButtons.length);

    orderButtons.forEach((btn) => {

        btn.addEventListener("click", (e) => {

            e.preventDefault();
            e.stopPropagation();

            console.log("Order Now clicked");

            const card = btn.closest(".pricing-card");

            if (!card) {
                console.error("Pricing card not found.");
                return;
            }

            const serviceElement = card.querySelector("h3");
            const amountElement = card.querySelector(".price-amount");
            const centsElement = card.querySelector(".price-cents");

            if (!serviceElement || !amountElement || !centsElement) {
                console.error("Service or price information is missing.");
                return;
            }

            const service = serviceElement.innerText.trim();

            const amount = amountElement.innerText
                .replace(/[^0-9.]/g, "")
                .trim();

            const cents = centsElement.innerText
                .replace(/[^0-9]/g, "")
                .padStart(2, "0");

            const price = `${amount}.${cents}`;

            console.log("Selected service:", service);
            console.log("Selected price:", price);

            // Save order information
            localStorage.setItem("selectedService", service);
            localStorage.setItem("selectedPrice", price);

            // Redirect
            window.location.href =
                `payment.html?service=${encodeURIComponent(service)}&price=${encodeURIComponent(price)}`;
        });

    });

});