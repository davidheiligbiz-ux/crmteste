/* ==========================================================================
   NimbusCRM — lógica da aplicação
   Persistência local via localStorage. Sem dependências externas.
   ========================================================================== */

(function () {
  "use strict";

  const STORAGE_KEY = "nimbuscrm.v1";

  const STAGES = [
    { id: "lead", label: "Lead", color: "#f5a524" },
    { id: "contato", label: "Contato", color: "#3b82f6" },
    { id: "proposta", label: "Proposta", color: "#8b5cf6" },
    { id: "negociacao", label: "Negociação", color: "#5b5ff2" },
    { id: "ganho", label: "Ganho", color: "#1fb37c" },
    { id: "perdido", label: "Perdido", color: "#e5484d" },
  ];

  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const currency = (n) => (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const dateFmt = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };
  const initials = (name) => (name || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || "").join("");
  const escapeHtml = (str) => String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------------------------------------------------------------------
  // Estado / persistência
  // ---------------------------------------------------------------------
  function seedData() {
    const clienteIds = Array.from({ length: 5 }, uid);
    const today = new Date();
    const iso = (offsetDays) => {
      const d = new Date(today);
      d.setDate(d.getDate() + offsetDays);
      return d.toISOString().slice(0, 10);
    };

    const clientes = [
      { id: clienteIds[0], nome: "Marina Souza", empresa: "Aurora Studio", email: "marina@aurorastudio.com", telefone: "(11) 98211-4432", status: "Ativo", origem: "Indicação", notas: "Cliente desde 2023, contrato de design recorrente.", criadoEm: iso(-60) },
      { id: clienteIds[1], nome: "Rafael Lima", empresa: "Construtech", email: "rafael.lima@construtech.com.br", telefone: "(21) 99876-1122", status: "Lead", origem: "Site", notas: "Solicitou proposta para novo módulo.", criadoEm: iso(-12) },
      { id: clienteIds[2], nome: "Bianca Ferreira", empresa: "Verde Orgânicos", email: "bianca@verdeorganicos.com", telefone: "(31) 98765-0099", status: "Ativo", origem: "Evento", notas: "", criadoEm: iso(-140) },
      { id: clienteIds[3], nome: "Thiago Almeida", empresa: "NovaLog Transportes", email: "thiago@novalog.com.br", telefone: "(41) 99222-3311", status: "Inativo", origem: "Redes sociais", notas: "Pausou contrato em janeiro.", criadoEm: iso(-300) },
      { id: clienteIds[4], nome: "Carla Mendes", empresa: "Studio Pixel", email: "carla@studiopixel.design", telefone: "(51) 98123-7788", status: "Lead", origem: "Indicação", notas: "Interessada em plano anual.", criadoEm: iso(-3) },
    ];

    const negocios = [
      { id: uid(), titulo: "Redesign institucional", clienteId: clienteIds[0], valor: 18500, etapa: "negociacao", notas: "Aguardando aprovação do orçamento final.", criadoEm: iso(-20) },
      { id: uid(), titulo: "Módulo de relatórios", clienteId: clienteIds[1], valor: 9200, etapa: "proposta", notas: "", criadoEm: iso(-8) },
      { id: uid(), titulo: "Consultoria de marca", clienteId: clienteIds[2], valor: 6400, etapa: "ganho", notas: "Fechado com 10% de desconto.", criadoEm: iso(-45) },
      { id: uid(), titulo: "Plano de mídia trimestral", clienteId: clienteIds[4], valor: 12800, etapa: "lead", notas: "", criadoEm: iso(-2) },
      { id: uid(), titulo: "Integração logística", clienteId: clienteIds[3], valor: 24000, etapa: "perdido", notas: "Cliente optou por outro fornecedor.", criadoEm: iso(-90) },
      { id: uid(), titulo: "Landing page de vendas", clienteId: clienteIds[1], valor: 5300, etapa: "contato", notas: "", criadoEm: iso(-5) },
    ];

    const tarefas = [
      { id: uid(), titulo: "Ligar para Rafael sobre a proposta", data: iso(1), clienteId: clienteIds[1], done: false },
      { id: uid(), titulo: "Enviar contrato para Marina", data: iso(-1), clienteId: clienteIds[0], done: false },
      { id: uid(), titulo: "Follow-up pós-evento com Bianca", data: iso(3), clienteId: clienteIds[2], done: false },
      { id: uid(), titulo: "Revisar proposta comercial padrão", data: iso(-4), clienteId: "", done: true },
    ];

    return { clientes, negocios, tarefas };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore corrupted data */ }
    const seeded = seedData();
    saveState(seeded);
    return seeded;
  }

  function saveState(s) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }

  let state = loadState();

  function persist() {
    saveState(state);
  }

  // ---------------------------------------------------------------------
  // Helpers de domínio
  // ---------------------------------------------------------------------
  const getCliente = (id) => state.clientes.find(c => c.id === id);
  const clienteNome = (id) => getCliente(id)?.nome || "Sem cliente";

  function statusBadgeClass(status) {
    if (status === "Ativo") return "badge-ativo";
    if (status === "Lead") return "badge-lead";
    return "badge-inativo";
  }

  // ---------------------------------------------------------------------
  // Toast
  // ---------------------------------------------------------------------
  let toastTimer = null;
  function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2400);
  }

  // ---------------------------------------------------------------------
  // Navegação entre views
  // ---------------------------------------------------------------------
  const viewTitles = { dashboard: "Dashboard", clientes: "Clientes", negocios: "Negócios", tarefas: "Tarefas" };

  function switchView(view) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("is-hidden"));
    document.getElementById(`view-${view}`).classList.remove("is-hidden");
    document.querySelectorAll(".nav-item").forEach(btn => btn.classList.toggle("is-active", btn.dataset.view === view));
    document.getElementById("viewTitle").textContent = viewTitles[view];
    closeSidebarMobile();
    renderAll();
  }

  document.getElementById("nav").addEventListener("click", (e) => {
    const btn = e.target.closest(".nav-item");
    if (btn) switchView(btn.dataset.view);
  });

  document.querySelectorAll("[data-view-link]").forEach(btn => {
    btn.addEventListener("click", () => switchView(btn.dataset.viewLink));
  });

  // Mobile sidebar
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");
  document.getElementById("menuBtn").addEventListener("click", () => {
    sidebar.classList.add("is-open");
    overlay.classList.add("is-open");
  });
  overlay.addEventListener("click", closeSidebarMobile);
  function closeSidebarMobile() {
    sidebar.classList.remove("is-open");
    overlay.classList.remove("is-open");
  }

  // ---------------------------------------------------------------------
  // Tema
  // ---------------------------------------------------------------------
  const THEME_KEY = "nimbuscrm.theme";
  function applyTheme(theme) {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      document.getElementById("themeLabel").textContent = "Modo claro";
    } else {
      document.documentElement.removeAttribute("data-theme");
      document.getElementById("themeLabel").textContent = "Modo escuro";
    }
  }
  let currentTheme = localStorage.getItem(THEME_KEY) || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(currentTheme);
  document.getElementById("themeToggle").addEventListener("click", () => {
    currentTheme = currentTheme === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, currentTheme);
    applyTheme(currentTheme);
  });

  // ---------------------------------------------------------------------
  // DASHBOARD
  // ---------------------------------------------------------------------
  function renderDashboard() {
    document.getElementById("statClientes").textContent = state.clientes.length;
    const negociosAtivos = state.negocios.filter(n => n.etapa !== "ganho" && n.etapa !== "perdido");
    document.getElementById("statNegocios").textContent = negociosAtivos.length;
    const valorPipeline = negociosAtivos.reduce((sum, n) => sum + (Number(n.valor) || 0), 0);
    document.getElementById("statValor").textContent = currency(valorPipeline);
    document.getElementById("statGanhos").textContent = state.negocios.filter(n => n.etapa === "ganho").length;

    // Barras por etapa
    const maxCount = Math.max(1, ...STAGES.map(s => state.negocios.filter(n => n.etapa === s.id).length));
    const barsEl = document.getElementById("pipelineBars");
    barsEl.innerHTML = STAGES.map(s => {
      const count = state.negocios.filter(n => n.etapa === s.id).length;
      const pct = Math.round((count / maxCount) * 100);
      return `<div class="bar-row">
        <span class="bar-label">${s.label}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%; background:${s.color}"></div></div>
        <span class="bar-count">${count}</span>
      </div>`;
    }).join("");

    // Atividade recente (últimos clientes + negócios, por data)
    const events = [
      ...state.clientes.map(c => ({ date: c.criadoEm, text: `Cliente <strong>${escapeHtml(c.nome)}</strong> foi cadastrado` })),
      ...state.negocios.map(n => ({ date: n.criadoEm, text: `Negócio <strong>${escapeHtml(n.titulo)}</strong> criado` })),
    ].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 6);

    const activityEl = document.getElementById("activityList");
    activityEl.innerHTML = events.length
      ? events.map(e => `<li><span class="activity-dot"></span><span class="activity-text">${e.text}</span></li>`).join("")
      : `<li class="empty-hint">Nenhuma atividade ainda.</li>`;

    // Próximas tarefas
    const upcoming = state.tarefas.filter(t => !t.done).sort((a, b) => (a.data || "").localeCompare(b.data || "")).slice(0, 5);
    const taskPreviewEl = document.getElementById("taskPreview");
    taskPreviewEl.innerHTML = upcoming.length
      ? upcoming.map(t => `<li><span class="activity-dot" style="background:var(--amber)"></span><span><strong>${escapeHtml(t.titulo)}</strong> — ${dateFmt(t.data)}</span></li>`).join("")
      : `<li class="empty-hint">Nenhuma tarefa pendente.</li>`;
  }

  // ---------------------------------------------------------------------
  // CLIENTES
  // ---------------------------------------------------------------------
  let clientFilterStatus = "all";
  let clientSearchTerm = "";

  function renderClientes() {
    let list = state.clientes.slice();
    if (clientFilterStatus !== "all") list = list.filter(c => c.status === clientFilterStatus);
    if (clientSearchTerm) {
      const q = clientSearchTerm.toLowerCase();
      list = list.filter(c =>
        c.nome.toLowerCase().includes(q) ||
        (c.empresa || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => (b.criadoEm || "").localeCompare(a.criadoEm || ""));

    const tbody = document.getElementById("clientTableBody");
    const emptyEl = document.getElementById("clientEmpty");

    if (!list.length) {
      tbody.innerHTML = "";
      emptyEl.classList.remove("is-hidden");
    } else {
      emptyEl.classList.add("is-hidden");
      tbody.innerHTML = list.map(c => `
        <tr data-id="${c.id}">
          <td>
            <div class="name-cell">
              <div class="avatar">${escapeHtml(initials(c.nome))}</div>
              <div>
                <div class="row-name">${escapeHtml(c.nome)}</div>
                <div class="row-sub">${escapeHtml(c.origem || "")}</div>
              </div>
            </div>
          </td>
          <td>${escapeHtml(c.empresa || "—")}</td>
          <td>
            <div>${escapeHtml(c.email || "—")}</div>
            <div class="row-sub">${escapeHtml(c.telefone || "")}</div>
          </td>
          <td><span class="badge ${statusBadgeClass(c.status)}">${escapeHtml(c.status)}</span></td>
          <td>${dateFmt(c.criadoEm)}</td>
          <td>
            <div class="row-actions">
              <button class="icon-btn edit-cliente" data-id="${c.id}" title="Editar">
                <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `).join("");
    }

    // Popula selects de cliente (negócio/tarefa)
    const options = `<option value="">Sem cliente</option>` + state.clientes.map(c => `<option value="${c.id}">${escapeHtml(c.nome)}</option>`).join("");
    document.getElementById("dealCliente").innerHTML = options;
    document.getElementById("taskClient").innerHTML = options;
  }

  document.getElementById("clientFilters").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    clientFilterStatus = chip.dataset.status;
    document.querySelectorAll("#clientFilters .chip").forEach(c => c.classList.toggle("is-active", c === chip));
    renderClientes();
  });

  document.getElementById("globalSearch").addEventListener("input", (e) => {
    clientSearchTerm = e.target.value;
    if (!document.getElementById("view-clientes").classList.contains("is-hidden")) {
      renderClientes();
    } else {
      switchView("clientes");
      renderClientes();
    }
  });

  document.getElementById("clientTableBody").addEventListener("click", (e) => {
    const btn = e.target.closest(".edit-cliente");
    if (btn) openClienteModal(btn.dataset.id);
  });

  // --- Modal cliente ---
  const clienteModal = document.getElementById("clienteModalBackdrop");
  function openClienteModal(id) {
    const form = document.getElementById("clienteForm");
    form.reset();
    const deleteBtn = document.getElementById("clienteDeleteBtn");
    if (id) {
      const c = getCliente(id);
      document.getElementById("clienteModalTitle").textContent = "Editar cliente";
      document.getElementById("clienteId").value = c.id;
      document.getElementById("clienteNome").value = c.nome;
      document.getElementById("clienteEmpresa").value = c.empresa || "";
      document.getElementById("clienteEmail").value = c.email || "";
      document.getElementById("clienteTelefone").value = c.telefone || "";
      document.getElementById("clienteStatus").value = c.status;
      document.getElementById("clienteOrigem").value = c.origem || "Indicação";
      document.getElementById("clienteNotas").value = c.notas || "";
      deleteBtn.style.display = "";
    } else {
      document.getElementById("clienteModalTitle").textContent = "Novo cliente";
      document.getElementById("clienteId").value = "";
      deleteBtn.style.display = "none";
    }
    clienteModal.classList.remove("is-hidden");
    document.getElementById("clienteNome").focus();
  }
  function closeClienteModal() { clienteModal.classList.add("is-hidden"); }

  document.getElementById("addClienteBtn").addEventListener("click", () => openClienteModal(null));
  document.getElementById("clienteModalClose").addEventListener("click", closeClienteModal);
  document.getElementById("clienteCancelBtn").addEventListener("click", closeClienteModal);
  clienteModal.addEventListener("click", (e) => { if (e.target === clienteModal) closeClienteModal(); });

  document.getElementById("clienteForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("clienteId").value;
    const nome = document.getElementById("clienteNome").value.trim();
    if (!nome) return;
    const data = {
      nome,
      empresa: document.getElementById("clienteEmpresa").value.trim(),
      email: document.getElementById("clienteEmail").value.trim(),
      telefone: document.getElementById("clienteTelefone").value.trim(),
      status: document.getElementById("clienteStatus").value,
      origem: document.getElementById("clienteOrigem").value,
      notas: document.getElementById("clienteNotas").value.trim(),
    };
    if (id) {
      Object.assign(getCliente(id), data);
      showToast("Cliente atualizado com sucesso");
    } else {
      state.clientes.push({ id: uid(), criadoEm: new Date().toISOString().slice(0, 10), ...data });
      showToast("Cliente adicionado com sucesso");
    }
    persist();
    closeClienteModal();
    renderAll();
  });

  document.getElementById("clienteDeleteBtn").addEventListener("click", () => {
    const id = document.getElementById("clienteId").value;
    if (!id) return;
    if (!confirm("Excluir este cliente? Os negócios vinculados perderão a referência.")) return;
    state.clientes = state.clientes.filter(c => c.id !== id);
    state.negocios.forEach(n => { if (n.clienteId === id) n.clienteId = ""; });
    state.tarefas.forEach(t => { if (t.clienteId === id) t.clienteId = ""; });
    persist();
    closeClienteModal();
    showToast("Cliente excluído");
    renderAll();
  });

  // ---------------------------------------------------------------------
  // NEGÓCIOS (Kanban)
  // ---------------------------------------------------------------------
  function renderBoard() {
    const board = document.getElementById("board");
    board.innerHTML = STAGES.map(stage => {
      const deals = state.negocios.filter(n => n.etapa === stage.id);
      const total = deals.reduce((sum, d) => sum + (Number(d.valor) || 0), 0);
      return `
        <div class="col" data-stage="${stage.id}">
          <div class="col-header">
            <span class="col-title"><span class="col-dot" style="background:${stage.color}"></span>${stage.label}</span>
            <span class="col-count">${deals.length}</span>
          </div>
          <div class="col-total">${currency(total)}</div>
          <div class="col-cards">
            ${deals.map(d => `
              <div class="card-deal" draggable="true" data-id="${d.id}">
                <div class="card-deal-title">${escapeHtml(d.titulo)}</div>
                <div class="card-deal-client">
                  <div class="avatar" style="width:20px;height:20px;font-size:9px;">${escapeHtml(initials(clienteNome(d.clienteId)))}</div>
                  ${escapeHtml(clienteNome(d.clienteId))}
                </div>
                <div class="card-deal-value">${currency(d.valor)}</div>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }).join("");

    // Click para editar
    board.querySelectorAll(".card-deal").forEach(card => {
      card.addEventListener("click", () => openDealModal(card.dataset.id));
      card.addEventListener("dragstart", (e) => {
        card.classList.add("is-dragging");
        e.dataTransfer.setData("text/plain", card.dataset.id);
        e.dataTransfer.effectAllowed = "move";
      });
      card.addEventListener("dragend", () => card.classList.remove("is-dragging"));
    });

    // Drop zones
    board.querySelectorAll(".col").forEach(col => {
      col.addEventListener("dragover", (e) => {
        e.preventDefault();
        col.classList.add("is-dragover");
      });
      col.addEventListener("dragleave", () => col.classList.remove("is-dragover"));
      col.addEventListener("drop", (e) => {
        e.preventDefault();
        col.classList.remove("is-dragover");
        const id = e.dataTransfer.getData("text/plain");
        const deal = state.negocios.find(n => n.id === id);
        if (deal && deal.etapa !== col.dataset.stage) {
          deal.etapa = col.dataset.stage;
          persist();
          renderAll();
          showToast(`Negócio movido para "${STAGES.find(s => s.id === col.dataset.stage).label}"`);
        }
      });
    });
  }

  const dealModal = document.getElementById("dealModalBackdrop");
  function openDealModal(id) {
    const form = document.getElementById("dealForm");
    form.reset();
    renderClientes(); // garante selects atualizados
    const deleteBtn = document.getElementById("dealDeleteBtn");
    if (id) {
      const d = state.negocios.find(n => n.id === id);
      document.getElementById("dealModalTitle").textContent = "Editar negócio";
      document.getElementById("dealId").value = d.id;
      document.getElementById("dealTitulo").value = d.titulo;
      document.getElementById("dealCliente").value = d.clienteId || "";
      document.getElementById("dealValor").value = d.valor || "";
      document.getElementById("dealEtapa").value = d.etapa;
      document.getElementById("dealNotas").value = d.notas || "";
      deleteBtn.style.display = "";
    } else {
      document.getElementById("dealModalTitle").textContent = "Novo negócio";
      document.getElementById("dealId").value = "";
      deleteBtn.style.display = "none";
    }
    dealModal.classList.remove("is-hidden");
    document.getElementById("dealTitulo").focus();
  }
  function closeDealModal() { dealModal.classList.add("is-hidden"); }

  document.getElementById("addDealBtn").addEventListener("click", () => openDealModal(null));
  document.getElementById("dealModalClose").addEventListener("click", closeDealModal);
  document.getElementById("dealCancelBtn").addEventListener("click", closeDealModal);
  dealModal.addEventListener("click", (e) => { if (e.target === dealModal) closeDealModal(); });

  document.getElementById("dealForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("dealId").value;
    const titulo = document.getElementById("dealTitulo").value.trim();
    if (!titulo) return;
    const data = {
      titulo,
      clienteId: document.getElementById("dealCliente").value,
      valor: parseFloat(document.getElementById("dealValor").value) || 0,
      etapa: document.getElementById("dealEtapa").value,
      notas: document.getElementById("dealNotas").value.trim(),
    };
    if (id) {
      Object.assign(state.negocios.find(n => n.id === id), data);
      showToast("Negócio atualizado com sucesso");
    } else {
      state.negocios.push({ id: uid(), criadoEm: new Date().toISOString().slice(0, 10), ...data });
      showToast("Negócio adicionado com sucesso");
    }
    persist();
    closeDealModal();
    renderAll();
  });

  document.getElementById("dealDeleteBtn").addEventListener("click", () => {
    const id = document.getElementById("dealId").value;
    if (!id) return;
    if (!confirm("Excluir este negócio?")) return;
    state.negocios = state.negocios.filter(n => n.id !== id);
    persist();
    closeDealModal();
    showToast("Negócio excluído");
    renderAll();
  });

  // ---------------------------------------------------------------------
  // TAREFAS
  // ---------------------------------------------------------------------
  function renderTarefas() {
    const pending = state.tarefas.filter(t => !t.done).sort((a, b) => (a.data || "").localeCompare(b.data || ""));
    const done = state.tarefas.filter(t => t.done).sort((a, b) => (b.data || "").localeCompare(a.data || ""));

    document.getElementById("countPending").textContent = pending.length;
    document.getElementById("countDone").textContent = done.length;

    const todayIso = new Date().toISOString().slice(0, 10);

    const renderItem = (t) => {
      const overdue = !t.done && t.data && t.data < todayIso;
      return `
        <li class="task-item ${t.done ? "is-done" : ""}" data-id="${t.id}">
          <button class="task-check" data-action="toggle" title="Concluir">
            <svg viewBox="0 0 24 24"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
          </button>
          <div class="task-body">
            <div class="task-title">${escapeHtml(t.titulo)}</div>
            <div class="task-meta ${overdue ? "is-overdue" : ""}">
              ${t.data ? `<span>${overdue ? "Atrasada · " : ""}${dateFmt(t.data)}</span>` : ""}
              ${t.clienteId ? `<span>· ${escapeHtml(clienteNome(t.clienteId))}</span>` : ""}
            </div>
          </div>
          <button class="task-remove" data-action="remove" title="Remover">
            <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        </li>`;
    };

    document.getElementById("taskListPending").innerHTML = pending.length ? pending.map(renderItem).join("") : `<li class="empty-hint">Nenhuma tarefa pendente 🎉</li>`;
    document.getElementById("taskListDone").innerHTML = done.length ? done.map(renderItem).join("") : `<li class="empty-hint">Nenhuma tarefa concluída ainda.</li>`;
  }

  document.getElementById("taskForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const titulo = document.getElementById("taskTitle").value.trim();
    if (!titulo) return;
    state.tarefas.push({
      id: uid(),
      titulo,
      data: document.getElementById("taskDate").value,
      clienteId: document.getElementById("taskClient").value,
      done: false,
    });
    persist();
    e.target.reset();
    showToast("Tarefa adicionada");
    renderAll();
  });

  function taskListClick(e) {
    const li = e.target.closest(".task-item");
    if (!li) return;
    const id = li.dataset.id;
    const action = e.target.closest("[data-action]")?.dataset.action;
    if (action === "toggle") {
      const t = state.tarefas.find(x => x.id === id);
      t.done = !t.done;
      persist();
      renderAll();
    } else if (action === "remove") {
      state.tarefas = state.tarefas.filter(x => x.id !== id);
      persist();
      showToast("Tarefa removida");
      renderAll();
    }
  }
  document.getElementById("taskListPending").addEventListener("click", taskListClick);
  document.getElementById("taskListDone").addEventListener("click", taskListClick);

  // ---------------------------------------------------------------------
  // Render geral
  // ---------------------------------------------------------------------
  function renderAll() {
    renderClientes();
    renderDashboard();
    renderBoard();
    renderTarefas();
  }

  renderAll();
})();
