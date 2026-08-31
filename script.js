(() => {
  const USER = {
    name: "João",
    balance: 1240,
    debt: 3200,
    income: 2400,
    essentials: 1600,
    minPayment: 480
  };

  const state = {
    currentScreen: "chatScreen",
    history: [],
    monthlyPayment: 400,
    months: 8,
    simpleMode: false,
    chatStep: "start"
  };

  const screens = [...document.querySelectorAll(".screen")];
  const chatFeed = document.getElementById("chatFeed");
  const quickActions = document.getElementById("quickActions");
  const typingIndicator = document.getElementById("typingIndicator");
  const backBtn = document.getElementById("backBtn");
  const contextStrip = document.getElementById("contextStrip");
  const toast = document.getElementById("toast");
  const appPhone = document.getElementById("appPhone");

  const formatBRL = (value) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

  function saveState() {
    try {
      localStorage.setItem("financeAssistantPrototypeState", JSON.stringify({
        monthlyPayment: state.monthlyPayment,
        months: state.months,
        simpleMode: state.simpleMode
      }));
    } catch (e) {}
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem("financeAssistantPrototypeState") || "{}");
      if (saved.monthlyPayment) state.monthlyPayment = saved.monthlyPayment;
      if (saved.months) state.months = saved.months;
      if (typeof saved.simpleMode === "boolean") state.simpleMode = saved.simpleMode;
    } catch (e) {}
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.remove("hidden");
    setTimeout(() => toast.classList.add("hidden"), 1600);
  }

  function showScreen(id, pushHistory = true) {
    if (id === state.currentScreen) return;
    if (pushHistory) state.history.push(state.currentScreen);

    screens.forEach(screen => screen.classList.toggle("active", screen.id === id));
    state.currentScreen = id;

    backBtn.classList.toggle("hidden", id === "chatScreen");
    contextStrip.classList.toggle("hidden", ["successScreen", "trackingScreen", "helpScreen"].includes(id));

    const scroll = document.querySelector(`#${id} .screen-scroll`);
    if (scroll) scroll.scrollTop = 0;
  }

  function goBack() {
    const prev = state.history.pop();
    if (prev) {
      screens.forEach(screen => screen.classList.toggle("active", screen.id === prev));
      state.currentScreen = prev;
      backBtn.classList.toggle("hidden", prev === "chatScreen");
      contextStrip.classList.toggle("hidden", ["successScreen", "trackingScreen", "helpScreen"].includes(prev));
    } else {
      showScreen("chatScreen", false);
    }
  }

  function speak(text) {
    if (!("speechSynthesis" in window)) {
      showToast("Áudio não disponível neste navegador.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[^\p{L}\p{N}\s.,!?$%R]/gu, " "));
    utterance.lang = "pt-BR";
    utterance.rate = state.simpleMode ? 0.86 : 0.95;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  function addMessage(role, html, canSpeak = false) {
    const row = document.createElement("div");
    row.className = `message ${role}`;

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.innerHTML = html;

    if (role === "assistant" && canSpeak) {
      const speakBtn = document.createElement("button");
      speakBtn.className = "speak-message";
      speakBtn.innerHTML = "🔊 Ouvir resposta";
      speakBtn.addEventListener("click", () => {
        const text = bubble.innerText.replace("🔊 Ouvir resposta", "").trim();
        speak(text);
      });
      bubble.appendChild(speakBtn);
    }

    row.appendChild(bubble);
    chatFeed.appendChild(row);
    setTimeout(() => chatFeed.scrollTop = chatFeed.scrollHeight, 30);
  }

  function showTyping(duration = 650) {
    typingIndicator.classList.remove("hidden");
    chatFeed.scrollTop = chatFeed.scrollHeight;
    return new Promise(resolve => {
      setTimeout(() => {
        typingIndicator.classList.add("hidden");
        resolve();
      }, duration);
    });
  }

  function setQuickActions(actions) {
    quickActions.innerHTML = "";
    actions.forEach(action => {
      const btn = document.createElement("button");
      btn.textContent = action.label;
      if (action.primary) btn.classList.add("primary-choice");
      btn.addEventListener("click", () => action.onClick(btn));
      quickActions.appendChild(btn);
    });
  }

  async function assistantReply(html, actions = [], speakable = true) {
    setQuickActions([]);
    await showTyping(540);
    addMessage("assistant", html, speakable);
    setQuickActions(actions);
  }

  function resetChat() {
    chatFeed.innerHTML = "";
    state.chatStep = "start";
    state.history = [];
    addMessage("assistant", `
      <p>Oi, João 👋</p>
      <p>Estou aqui para te ajudar com seu dinheiro.</p>
      <p>Vi que você tem uma dívida no cartão.</p>
      <p><strong>Quer que eu te explique?</strong></p>
    `, true);

    setQuickActions([
      { label: "Sim", primary: true, onClick: () => explainInChat() },
      { label: "Ver minha dívida", onClick: () => showScreen("debtScreen") },
      { label: "Agora não", onClick: () => laterReply() }
    ]);
  }

  async function explainInChat() {
    addMessage("user", "<p>Sim</p>");
    state.chatStep = "explained";
    await assistantReply(`
      <p>Hoje sua dívida é de <strong>R$ 3.200</strong>.</p>
      <p>Isso significa que você usou um dinheiro que ainda precisa devolver ao banco.</p>
      <p>Se você demorar para pagar, o valor pode aumentar por causa dos <button class="inline-help dynamic-help">juros <span>?</span></button>.</p>
      <p><strong>Mas calma.</strong> Vamos descobrir juntos uma forma de pagar que cabe no seu bolso.</p>
    `, [
      { label: "Montar meu plano", primary: true, onClick: () => showScreen("planScreen") },
      { label: "Ver minha dívida", onClick: () => showScreen("debtScreen") }
    ]);

    document.querySelectorAll(".dynamic-help").forEach(btn => btn.addEventListener("click", openInterestModal));
  }

  async function laterReply() {
    addMessage("user", "<p>Agora não</p>");
    await assistantReply(`
      <p>Tudo bem.</p>
      <p>Quando quiser, eu posso explicar sua dívida em poucas frases ou ajudar a montar um plano.</p>
    `, [
      { label: "Ver minha dívida", primary: true, onClick: () => showScreen("debtScreen") },
      { label: "Entender agora", onClick: () => explainInChat() }
    ]);
  }

  function openInterestModal() {
    document.getElementById("helpModal").classList.remove("hidden");
  }

  function closeModal() {
    document.getElementById("helpModal").classList.add("hidden");
  }

  function selectAmount(value) {
    state.monthlyPayment = Number(value);
    document.querySelectorAll("#amountGrid button").forEach(btn => {
      btn.classList.toggle("selected", Number(btn.dataset.value) === state.monthlyPayment);
    });
    document.getElementById("customAmount").value = "";
    document.getElementById("continuePlanBtn").disabled = false;
    saveState();
  }

  function selectGoalMonths(months) {
    state.months = Number(months);
    state.monthlyPayment = Math.ceil(USER.debt / state.months);

    document.querySelectorAll("#goalOptions button").forEach(btn => {
      btn.classList.toggle("selected", Number(btn.dataset.months) === state.months);
    });
    document.getElementById("goalDate").value = "";
    document.getElementById("confirmGoalBtn").disabled = false;
    saveState();
  }

  function updateBudgetScreen() {
    const availableBeforeDebt = USER.income - USER.essentials;
    const remaining = availableBeforeDebt - state.monthlyPayment;
    const installment = formatBRL(state.monthlyPayment);

    document.getElementById("budgetInstallment").textContent = installment;
    document.getElementById("budgetRemaining").textContent = formatBRL(remaining);

    const card = document.getElementById("assessmentCard");
    const title = document.getElementById("assessmentTitle");
    const text = document.getElementById("assessmentText");
    const icon = card.querySelector(".assessment-icon");

    if (remaining >= 250) {
      card.classList.remove("warning");
      icon.textContent = "✓";
      title.textContent = "Esse plano parece caber no seu orçamento.";
      text.textContent = "Você ainda mantém uma margem para outros gastos do mês.";
    } else {
      card.classList.add("warning");
      icon.textContent = "!";
      title.textContent = "Essa parcela pode apertar seu orçamento.";
      text.textContent = "Que tal escolher um valor menor para proteger suas contas essenciais?";
    }

    document.getElementById("acceptBudgetBtn").textContent = remaining >= 250 ? "Continuar" : "Continuar mesmo assim";
  }

  function updateDealScreens() {
    const monthly = formatBRL(state.monthlyPayment);
    const planText = `${state.months}x de ${monthly}`;

    document.getElementById("dealPlan").textContent = planText;
    document.getElementById("reviewInstallment").textContent = monthly;
    document.getElementById("reviewMonths").textContent = `${state.months} meses`;
    document.getElementById("successPlan").textContent = planText;
    document.getElementById("nextPaymentAmount").textContent = monthly;
  }

  function startPlanFromSelectedAmount() {
    const exactMonths = Math.max(1, Math.ceil(USER.debt / state.monthlyPayment));
    state.months = exactMonths;
    document.querySelectorAll("#goalOptions button").forEach(btn => {
      btn.classList.toggle("selected", Number(btn.dataset.months) === exactMonths);
    });
    document.getElementById("confirmGoalBtn").disabled = false;
    saveState();
    showScreen("goalScreen");
  }

  function handleCustomDate(value) {
    if (!value) return;
    const [year, month] = value.split("-").map(Number);
    const start = new Date(2026, 8, 1); // Sep/2026
    const target = new Date(year, month - 1, 1);
    let diff = (target.getFullYear() - start.getFullYear()) * 12 + target.getMonth() - start.getMonth() + 1;
    diff = Math.max(1, diff);
    state.months = diff;
    state.monthlyPayment = Math.ceil(USER.debt / diff);

    document.querySelectorAll("#goalOptions button").forEach(btn => btn.classList.remove("selected"));
    document.getElementById("confirmGoalBtn").disabled = false;
    saveState();
  }

  function handleUserText(text) {
    if (!text.trim()) return;
    addMessage("user", `<p>${escapeHtml(text)}</p>`);
    document.getElementById("messageInput").value = "";

    const lowered = text.toLowerCase();
    if (lowered.includes("dívida") || lowered.includes("divida")) {
      assistantReply(`
        <p>Sua dívida fictícia atual é de <strong>R$ 3.200</strong> no cartão de crédito.</p>
        <p>Posso explicar o que isso significa ou ajudar a montar um plano.</p>
      `, [
        { label: "Entender essa dívida", primary: true, onClick: () => showScreen("explainScreen") },
        { label: "Montar um plano", onClick: () => showScreen("planScreen") }
      ]);
    } else if (lowered.includes("pagar") || lowered.includes("plano")) {
      assistantReply(`
        <p>Vamos fazer isso juntos.</p>
        <p>Primeiro, precisamos escolher um valor mensal que não atrapalhe suas contas essenciais.</p>
      `, [
        { label: "Montar meu plano", primary: true, onClick: () => showScreen("planScreen") }
      ]);
    } else if (lowered.includes("juros")) {
      assistantReply(`
        <p><strong>Juros</strong> são um valor extra que pode ser cobrado quando uma dívida demora para ser paga.</p>
        <p>Por isso, a dívida pode ficar maior com o tempo.</p>
      `, [
        { label: "Entendi", primary: true, onClick: () => explainInChat() }
      ]);
    } else {
      assistantReply(`
        <p>Posso te ajudar com sua dívida de forma simples.</p>
        <p>Você pode escolher uma das opções abaixo.</p>
      `, [
        { label: "Ver minha dívida", primary: true, onClick: () => showScreen("debtScreen") },
        { label: "Montar um plano", onClick: () => showScreen("planScreen") }
      ]);
    }
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, match => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[match]));
  }

  function setupVoiceInput() {
    const micBtn = document.getElementById("micBtn");
    const input = document.getElementById("messageInput");
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      micBtn.addEventListener("click", () => showToast("Entrada por voz não disponível neste navegador."));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    micBtn.addEventListener("click", () => {
      try {
        recognition.start();
        micBtn.classList.add("listening");
        showToast("Estou ouvindo...");
      } catch (e) {}
    });

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      input.value = transcript;
      micBtn.classList.remove("listening");
      handleUserText(transcript);
    };

    recognition.onerror = () => {
      micBtn.classList.remove("listening");
      showToast("Não consegui entender. Tente novamente.");
    };

    recognition.onend = () => micBtn.classList.remove("listening");
  }

  function restartDemo() {
    window.speechSynthesis?.cancel();
    state.currentScreen = "chatScreen";
    state.history = [];
    state.monthlyPayment = 400;
    state.months = 8;
    screens.forEach(screen => screen.classList.toggle("active", screen.id === "chatScreen"));
    backBtn.classList.add("hidden");
    contextStrip.classList.remove("hidden");

    document.querySelectorAll(".selected").forEach(el => el.classList.remove("selected"));
    document.getElementById("customAmount").value = "";
    document.getElementById("goalDate").value = "";
    document.getElementById("continuePlanBtn").disabled = true;
    document.getElementById("confirmGoalBtn").disabled = true;
    document.getElementById("simulationCheck").checked = false;
    document.getElementById("simulateBtn").disabled = true;
    document.getElementById("supportMessage").classList.add("hidden");
    document.getElementById("adjustPlanBtn").classList.add("hidden");
    resetChat();
    showToast("Demonstração reiniciada.");
  }

  loadState();
  document.getElementById("simpleModeToggle").checked = state.simpleMode;
  appPhone.classList.toggle("simple-mode", state.simpleMode);

  resetChat();
  setupVoiceInput();

  backBtn.addEventListener("click", goBack);
  document.getElementById("openDebtBtn").addEventListener("click", () => showScreen("debtScreen"));
  document.getElementById("restartDemoBtn").addEventListener("click", restartDemo);
  document.getElementById("restartBtnSuccess").addEventListener("click", restartDemo);

  document.querySelectorAll(".app-action").forEach(btn => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      if (action === "explainDebt") showScreen("explainScreen");
      if (action === "startPlan") showScreen("planScreen");
      if (action === "payDebt") showScreen("planScreen");
    });
  });

  document.querySelectorAll("[data-help='interest']").forEach(btn => btn.addEventListener("click", openInterestModal));
  document.querySelectorAll("[data-close-modal]").forEach(el => el.addEventListener("click", closeModal));

  document.getElementById("listenExplanationBtn").addEventListener("click", () => {
    speak("Você deve três mil e duzentos reais. Se não pagar, o banco pode cobrar juros. Juros são um valor extra que pode ser cobrado quando uma dívida demora para ser paga. Mas calma. Vamos encontrar uma forma de pagar que caiba no seu bolso.");
  });

  document.querySelectorAll("#amountGrid button").forEach(btn => {
    btn.addEventListener("click", () => selectAmount(btn.dataset.value));
  });

  document.getElementById("customAmount").addEventListener("input", (e) => {
    const value = Number(e.target.value);
    document.querySelectorAll("#amountGrid button").forEach(btn => btn.classList.remove("selected"));
    if (value >= 100) {
      state.monthlyPayment = value;
      document.getElementById("continuePlanBtn").disabled = false;
      saveState();
    } else {
      document.getElementById("continuePlanBtn").disabled = true;
    }
  });

  document.getElementById("continuePlanBtn").addEventListener("click", startPlanFromSelectedAmount);

  document.querySelectorAll("#goalOptions button").forEach(btn => {
    btn.addEventListener("click", () => selectGoalMonths(btn.dataset.months));
  });

  document.getElementById("goalDate").addEventListener("change", (e) => handleCustomDate(e.target.value));

  document.getElementById("confirmGoalBtn").addEventListener("click", () => {
    updateBudgetScreen();
    showScreen("budgetScreen");
  });

  document.getElementById("acceptBudgetBtn").addEventListener("click", () => {
    updateDealScreens();
    showToast("Plano atualizado.");
    showScreen("dealScreen");
  });

  document.getElementById("reviewDealBtn").addEventListener("click", () => {
    updateDealScreens();
    showScreen("reviewScreen");
  });

  document.getElementById("simulationCheck").addEventListener("change", (e) => {
    document.getElementById("simulateBtn").disabled = !e.target.checked;
  });

  document.getElementById("simulateBtn").addEventListener("click", () => {
    updateDealScreens();
    showScreen("successScreen");
  });

  document.getElementById("openTrackingBtn").addEventListener("click", () => {
    updateDealScreens();
    showScreen("trackingScreen");
  });

  document.getElementById("needHelpBtn").addEventListener("click", () => showScreen("helpScreen"));

  document.querySelectorAll(".help-options button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".help-options button").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      document.getElementById("supportMessage").classList.remove("hidden");
      document.getElementById("adjustPlanBtn").classList.remove("hidden");
      showToast("Entendi. Vamos ajustar.");
    });
  });

  document.getElementById("adjustPlanBtn").addEventListener("click", () => {
    showScreen("planScreen");
    showToast("Escolha uma parcela mais confortável.");
  });

  document.getElementById("simpleModeToggle").addEventListener("change", (e) => {
    state.simpleMode = e.target.checked;
    appPhone.classList.toggle("simple-mode", state.simpleMode);
    saveState();
    showToast(state.simpleMode ? "Modo simples ativado." : "Modo simples desativado.");
  });

  document.getElementById("sendBtn").addEventListener("click", () => {
    handleUserText(document.getElementById("messageInput").value);
  });

  document.getElementById("messageInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleUserText(e.target.value);
  });

  document.addEventListener("click", (e) => {
    if (e.target.matches(".dynamic-help")) openInterestModal();
  });
})();
