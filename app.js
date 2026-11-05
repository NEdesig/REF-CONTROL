/* =========================================================
   REF CONTROL — APPLICATION
   Кубок России U16
   GitHub Pages / LocalStorage
========================================================= */

(() => {
  "use strict";

  const DATA = window.REF_CONTROL_DATA;

  if (!DATA) {
    console.error("REF_CONTROL_DATA не найден. Проверь подключение data.js");
    return;
  }

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const STORAGE_KEY = "ref-control-save-v1";
  const REQUIRED_LINESMEN = 48;
  const REQUIRED_REFEREES = 48;

  let state = loadState();
  let currentPage = "dashboard";
  let selectionRole = "linesman";
  let selectionSearch = "";
  let selectionRegion = "all";
  let selectionQuality = "all";
  let selectedMatchId = null;
  let toastTimer = null;

  /* =====================================================
     STORAGE
  ===================================================== */

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        if (
          parsed &&
          parsed.version === DATA.version &&
          Array.isArray(parsed.referees) &&
          Array.isArray(parsed.matches)
        ) {
          return parsed;
        }
      }
    } catch (error) {
      console.error("Ошибка загрузки сохранения:", error);
    }

    return DATA.createInitialState();
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      console.error("Ошибка сохранения:", error);
      showToast("Не удалось сохранить данные");
      return false;
    }
  }

  function addActivity(title, description = "") {
    state.activity.unshift({
      id: Date.now() + Math.random(),
      title,
      description,
      date: new Date().toISOString()
    });

    state.activity = state.activity.slice(0, 30);
  }

  /* =====================================================
     HELPERS
  ===================================================== */

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function formatDate(dateString) {
    if (!dateString) return "—";

    const date = new Date(`${dateString}T12:00:00`);

    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  function formatShortDate(dateString) {
    if (!dateString) return "—";

    const date = new Date(`${dateString}T12:00:00`);

    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit"
    });
  }

  function addDays(dateString, days) {
    const date = new Date(`${dateString}T12:00:00`);
    date.setDate(date.getDate() + days);

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function getTeam(teamId) {
    return DATA.teams.find(team => team.id === teamId);
  }

  function getReferee(refereeId) {
    return state.referees.find(ref => ref.id === refereeId);
  }

  function getMatch(matchId) {
    return state.matches.find(match => match.id === matchId);
  }

  function getRoleReferees(role) {
    return state.referees.filter(ref => ref.role === role);
  }

  function getSelectedReferees(role) {
    const ids = role === "linesman"
      ? state.selectedLinesmen
      : state.selectedReferees;

    return ids.map(getReferee).filter(Boolean);
  }

  function isSelectionComplete() {
    return (
      state.selectedLinesmen.length === REQUIRED_LINESMEN &&
      state.selectedReferees.length === REQUIRED_REFEREES
    );
  }

  function getCompletedMatches() {
    return state.matches.filter(match => match.status === "completed");
  }

  function getUpcomingMatches() {
    return state.matches.filter(match => match.status !== "completed");
  }

  function getMatchOfficials(match) {
    return match.officials || {
      referees: [],
      linesmen: [],
      reserveReferee: null,
      reserveLinesman: null
    };
  }

  function getRefereeName(id) {
    const referee = getReferee(id);
    return referee ? referee.fullName : "Не назначен";
  }

  function qualityColor(value) {
    if (value === "green") return "green";
    if (value === "yellow") return "yellow";
    return "red";
  }

  function average(values) {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
  }

  function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2600);
  }

  function getCurrentDate() {
    return new Date().toISOString().slice(0, 10);
  }

  /* =====================================================
     NAVIGATION
  ===================================================== */

  const PAGE_TITLES = {
    dashboard: "Панель управления",
    selection: "Судейский корпус",
    calendar: "Календарь матчей",
    standings: "Турнирные таблицы",
    playoffs: "Второй этап",
    reports: "Инспектирование",
    rankings: "Рейтинг арбитров",
    settings: "Настройки и данные"
  };

  function navigate(page) {
    if (!PAGE_TITLES[page]) return;

    currentPage = page;

    $$(".nav-item[data-page]").forEach(button => {
      button.classList.toggle("active", button.dataset.page === page);
    });

    $("#pageTitle").textContent = PAGE_TITLES[page];

    $("#sidebar").classList.remove("open");

    renderPage();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderPage() {
    const content = $("#appContent");
    if (!content) return;

    const pages = {
      dashboard: renderDashboard,
      selection: renderSelection,
      calendar: renderCalendar,
      standings: renderStandings,
      playoffs: renderPlayoffs,
      reports: renderReports,
      rankings: renderRankings,
      settings: renderSettings
    };

    content.innerHTML = pages[currentPage]();
    updateGlobalCounters();
  }

  function updateGlobalCounters() {
    const counter = $("#selectionNavCount");

    if (counter) {
      counter.textContent =
        `${state.selectedLinesmen.length + state.selectedReferees.length}/96`;
    }
  }

  /* =====================================================
     DASHBOARD
  ===================================================== */

  function renderDashboard() {
    const totalMatches = state.matches.length;
    const completed = getCompletedMatches().length;
    const upcoming = totalMatches - completed;
    const selected = state.selectedLinesmen.length + state.selectedReferees.length;

    const selectionPercent = Math.round(selected / 96 * 100);
    const matchPercent = totalMatches
      ? Math.round(completed / totalMatches * 100)
      : 0;

    const nextMatch = state.matches.find(match => match.status !== "completed");

    const recentActivity = state.activity.slice(0, 6);

    return `
      <div class="page-heading">
        <div>
          <h1>Добро пожаловать в REF CONTROL</h1>
          <p>Управление судейским корпусом и инспектирование Кубка России U16 в Сочи.</p>
        </div>
        <span class="badge badge-orange">ГЛАВНЫЙ ИНСПЕКТОР</span>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-icon">♙</span>
          <div class="stat-label">Судейский корпус</div>
          <div class="stat-value">${selected}<span class="muted">/96</span></div>
          <div class="stat-note">Выбрано арбитров</div>
        </div>

        <div class="stat-card">
          <span class="stat-icon">▦</span>
          <div class="stat-label">Матчи турнира</div>
          <div class="stat-value">${completed}<span class="muted">/${totalMatches || 80}</span></div>
          <div class="stat-note">Завершено матчей</div>
        </div>

        <div class="stat-card">
          <span class="stat-icon">◷</span>
          <div class="stat-label">Предстоящие матчи</div>
          <div class="stat-value">${upcoming}</div>
          <div class="stat-note">Ожидают проведения</div>
        </div>

        <div class="stat-card">
          <span class="stat-icon">◎</span>
          <div class="stat-label">Отчёты</div>
          <div class="stat-value">${state.reports.length}</div>
          <div class="stat-note">Инспекторских отчётов</div>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">ПРОГРЕСС ТУРНИРА</div>
              <div class="card-description">Основные показатели подготовки и проведения</div>
            </div>
            <span class="badge badge-orange">U16</span>
          </div>

          <div class="progress-row">
            <span>Комплектование судейского корпуса</span>
            <b>${selectionPercent}%</b>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width:${selectionPercent}%"></div>
          </div>

          <div class="progress-row">
            <span>Проведение матчей</span>
            <b>${matchPercent}%</b>
          </div>
          <div class="progress-track">
            <div class="progress-fill green-fill" style="width:${matchPercent}%"></div>
          </div>

          <div class="divider"></div>

          <div class="progress-row">
            <span>Линейные арбитры</span>
            <b>${state.selectedLinesmen.length}/48</b>
          </div>
          <div class="progress-track">
            <div class="progress-fill blue-fill" style="width:${state.selectedLinesmen.length / 48 * 100}%"></div>
          </div>

          <div class="progress-row">
            <span>Главные арбитры</span>
            <b>${state.selectedReferees.length}/48</b>
          </div>
          <div class="progress-track">
            <div class="progress-fill blue-fill" style="width:${state.selectedReferees.length / 48 * 100}%"></div>
          </div>

          <div class="divider"></div>

          <button class="btn btn-primary btn-block" data-action="go-selection">
            ${isSelectionComplete() ? "Перейти к турниру" : "Продолжить комплектование корпуса"}
          </button>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">БЛИЖАЙШИЙ МАТЧ</div>
              <div class="card-description">Следующий матч по календарю</div>
            </div>
          </div>

          ${nextMatch ? `
            <div class="small muted">${formatDate(nextMatch.date)} · ${nextMatch.time}</div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin:22px 0">
              <div style="text-align:center;flex:1">
                <div class="team-emblem">${escapeHTML(getTeam(nextMatch.home)?.short || "?")}</div>
                <b class="small">${escapeHTML(getTeam(nextMatch.home)?.name || "—")}</b>
              </div>
              <div class="match-vs">VS</div>
              <div style="text-align:center;flex:1">
                <div class="team-emblem">${escapeHTML(getTeam(nextMatch.away)?.short || "?")}</div>
                <b class="small">${escapeHTML(getTeam(nextMatch.away)?.name || "—")}</b>
              </div>
            </div>
            <div class="assignment-row">
              <span>Арена</span>
              <b>${escapeHTML(nextMatch.arena)}</b>
            </div>
            <div class="assignment-row" style="margin-top:8px">
              <span>Статус</span>
              <b class="yellow">Ожидает проведения</b>
            </div>
            <button class="btn btn-primary btn-block" style="margin-top:14px" data-action="open-match" data-id="${nextMatch.id}">
              Открыть матч
            </button>
          ` : `
            <div class="empty-state">
              <div class="empty-state-icon">▦</div>
              <b>${totalMatches ? "Все матчи завершены" : "Календарь ещё не создан"}</b>
              <p>${totalMatches ? "Можно перейти к итоговым рейтингам." : "Сначала выбери 48 линейных и 48 главных арбитров."}</p>
            </div>
          `}
        </div>
      </div>

      <h2 class="section-title">ПОСЛЕДНИЕ СОБЫТИЯ</h2>

      <div class="card">
        ${recentActivity.length ? `
          <div class="activity-list">
            ${recentActivity.map(item => `
              <div class="activity-item">
                <span class="activity-dot"></span>
                <div>
                  <b>${escapeHTML(item.title)}</b>
                  <small>${escapeHTML(item.description)} · ${new Date(item.date).toLocaleString("ru-RU")}</small>
                </div>
              </div>
            `).join("")}
          </div>
        ` : `
          <div class="empty-state">
            <b>Событий пока нет</b>
            <p>Действия по турниру будут отображаться здесь.</p>
          </div>
        `}
      </div>

      <h2 class="section-title">СТРУКТУРА ТУРНИРА</h2>

      <div class="stats-grid">
        ${DATA.groups.map(group => `
          <div class="card">
            <div class="card-title">ГРУППА ${group}</div>
            <div class="stat-value" style="font-size:23px">5</div>
            <div class="stat-note">Команд · 20 матчей</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  /* =====================================================
     REFEREE SELECTION
  ===================================================== */

  function renderSelection() {
    const role = selectionRole;
    const roleLabel = role === "linesman" ? "линейных" : "главных";
    const selectedIds = role === "linesman"
      ? state.selectedLinesmen
      : state.selectedReferees;

    const selectedCount = selectedIds.length;
    const roleLimit = 48;

    let referees = getRoleReferees(role);

    if (selectionSearch.trim()) {
      const query = selectionSearch.toLowerCase();

      referees = referees.filter(ref =>
        ref.fullName.toLowerCase().includes(query) ||
        ref.city.toLowerCase().includes(query) ||
        ref.region.toLowerCase().includes(query) ||
        String(ref.number).includes(query)
      );
    }

    if (selectionRegion !== "all") {
      referees = referees.filter(ref => ref.region === selectionRegion);
    }

    if (selectionQuality !== "all") {
      referees = referees.filter(ref => ref.qualities.includes(selectionQuality));
    }

    const regions = [...new Set(getRoleReferees(role).map(ref => ref.region))].sort();

    return `
      <div class="page-heading">
        <div>
          <h1>Формирование судейского корпуса</h1>
          <p>Выбери 48 линейных и 48 главных арбитров из общего списка перспективных судей.</p>
        </div>
        <span class="badge badge-orange">225 КАНДИДАТОВ</span>
      </div>

      <div class="selection-counter">
        <div>
          <div class="small muted">ТЕКУЩИЙ ОТБОР</div>
          <strong>${selectedCount}/48</strong>
          <div class="small muted">${roleLabel} арбитров выбрано</div>
        </div>
        <div style="min-width:130px;flex:1;max-width:320px">
          <div class="progress-track">
            <div class="progress-fill" style="width:${selectedCount / 48 * 100}%"></div>
          </div>
          <div class="small muted" style="margin-top:6px">Осталось выбрать: ${48 - selectedCount}</div>
        </div>
        <button class="btn btn-small" data-action="clear-role-selection" data-role="${role}">
          Очистить выбор
        </button>
      </div>

      <div class="selection-tabs">
        <button class="tab-btn ${role === "linesman" ? "active" : ""}" data-action="selection-role" data-role="linesman">
          Линейные · ${state.selectedLinesmen.length}/48
        </button>
        <button class="tab-btn ${role === "referee" ? "active" : ""}" data-action="selection-role" data-role="referee">
          Главные · ${state.selectedReferees.length}/48
        </button>
      </div>

      <div class="selection-toolbar">
        <div class="search-box">
          <input id="refereeSearch" type="search" placeholder="Поиск по фамилии, городу или номеру..." value="${escapeHTML(selectionSearch)}">
        </div>

        <select class="filter-select" id="regionFilter">
          <option value="all">Все регионы</option>
          ${regions.map(region => `
            <option value="${escapeHTML(region)}" ${selectionRegion === region ? "selected" : ""}>
              ${escapeHTML(region)}
            </option>
          `).join("")}
        </select>

        <select class="filter-select" id="qualityFilter">
          <option value="all">Любые качества</option>
          <option value="green" ${selectionQuality === "green" ? "selected" : ""}>Есть сильные стороны</option>
          <option value="yellow" ${selectionQuality === "yellow" ? "selected" : ""}>Есть средние качества</option>
          <option value="red" ${selectionQuality === "red" ? "selected" : ""}>Есть слабые качества</option>
        </select>
      </div>

      <div class="small muted" style="margin-bottom:12px">
        Найдено кандидатов: ${referees.length} · Цветные квадраты показывают уровень семи качеств.
      </div>

      ${referees.length ? `
        <div class="referee-grid">
          ${referees.map(ref => renderRefereeCard(ref, selectedIds.includes(ref.id))).join("")}
        </div>
      ` : `
        <div class="empty-state">
          <div class="empty-state-icon">⌕</div>
          <b>Кандидаты не найдены</b>
          <p>Измени параметры поиска или фильтры.</p>
        </div>
      `}

      <div class="divider"></div>

      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">ОБЩИЙ ПРОГРЕСС ОТБОРА</div>
            <div class="card-description">Для начала турнира необходимо сформировать обе группы судей.</div>
          </div>
          <span class="badge ${isSelectionComplete() ? "badge-green" : "badge-orange"}">
            ${isSelectionComplete() ? "КОМПЛЕКТ ГОТОВ" : "ОТБОР НЕ ЗАВЕРШЁН"}
          </span>
        </div>

        <div class="progress-row">
          <span>Линейные арбитры</span>
          <b>${state.selectedLinesmen.length}/48</b>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${state.selectedLinesmen.length / 48 * 100}%"></div>
        </div>

        <div class="progress-row">
          <span>Главные арбитры</span>
          <b>${state.selectedReferees.length}/48</b>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${state.selectedReferees.length / 48 * 100}%"></div>
        </div>

        <button class="btn btn-primary btn-block" style="margin-top:17px" data-action="generate-tournament" ${isSelectionComplete() ? "" : "disabled"}>
          Сформировать календарь и начать турнир
        </button>
      </div>
    `;
  }

  function renderRefereeCard(ref, selected) {
    const qualities = ref.qualities || [];

    return `
      <article class="referee-card ${selected ? "selected" : ""}">
        <div class="referee-top">
          <div class="referee-number">${ref.number}</div>
          <div class="referee-name">
            <b>${escapeHTML(ref.fullName)}</b>
            <small>${escapeHTML(ref.roleLabel)} · ${ref.age} лет</small>
          </div>
          ${selected ? `<span class="badge badge-green">В СОСТАВЕ</span>` : ""}
        </div>

        <div class="referee-meta">
          <span>${ref.experience} лет опыта</span>
          <span>${escapeHTML(ref.city)}</span>
        </div>

        <div class="small muted">${escapeHTML(ref.region)}</div>

        <div class="qualities-title">ПРОФЕССИОНАЛЬНЫЕ КАЧЕСТВА</div>

        <div class="qualities-grid">
          ${qualities.map((quality, index) => `
            <div class="quality-cell" title="${escapeHTML(DATA.qualityNames[index])}: ${qualityLabel(quality)}">
              <span class="quality-square ${qualityColor(quality)}"></span>
              <small>${escapeHTML(shortQuality(DATA.qualityNames[index]))}</small>
            </div>
          `).join("")}
        </div>

        <div class="referee-card-footer">
          <div class="referee-rating">Потенциал <b>${ref.rating}</b></div>
          <button
            class="btn ${selected ? "btn-danger" : "btn-primary"} btn-small"
            data-action="toggle-referee"
            data-id="${ref.id}"
          >
            ${selected ? "Убрать" : "Добавить"}
          </button>
        </div>
      </article>
    `;
  }

  function qualityLabel(value) {
    if (value === "green") return "Сильная сторона";
    if (value === "yellow") return "Средний уровень";
    return "Слабая сторона";
  }

  function shortQuality(value) {
    const map = {
      "Решения": "Реш.",
      "Внешний вид": "Вид",
      "Контроль": "Контр.",
      "Позиция": "Поз.",
      "Уверенность": "Увер.",
      "Техника": "Тех.",
      "Внимательность": "Вним."
    };

    return map[value] || value;
  }

  function toggleReferee(refereeId) {
    const referee = getReferee(refereeId);

    if (!referee) return;

    const list = referee.role === "linesman"
      ? state.selectedLinesmen
      : state.selectedReferees;

    const index = list.indexOf(refereeId);

    if (index >= 0) {
      list.splice(index, 1);
      referee.selected = false;
      showToast(`${referee.fullName} исключён из состава`);
    } else {
      if (list.length >= 48) {
        showToast("В этой категории уже выбрано 48 судей");
        return;
      }

      list.push(refereeId);
      referee.selected = true;
      showToast(`${referee.fullName} добавлен в состав`);
    }

    saveState();
    renderPage();
  }

  function clearRoleSelection(role) {
    const list = role === "linesman"
      ? state.selectedLinesmen
      : state.selectedReferees;

    list.forEach(id => {
      const referee = getReferee(id);
      if (referee) referee.selected = false;
    });

    if (role === "linesman") {
      state.selectedLinesmen = [];
    } else {
      state.selectedReferees = [];
    }

    saveState();
    renderPage();
    showToast("Выбор очищен");
  }

  /* =====================================================
     TOURNAMENT SCHEDULE
  ===================================================== */

  function generateRoundRobin(teams) {
    const list = [...teams];
    const rounds = [];

    if (list.length % 2 !== 0) {
      list.push(null);
    }

    const count = list.length;

    for (let round = 0; round < count - 1; round++) {
      const games = [];

      for (let i = 0; i < count / 2; i++) {
        const first = list[i];
        const second = list[count - 1 - i];

        if (!first || !second) continue;

        let home = first;
        let away = second;

        if (round % 2 === 1) {
          home = second;
          away = first;
        }

        games.push({ home, away });
      }

      rounds.push(games);

      const fixed = list[0];
      const rest = list.slice(1);

      rest.unshift(rest.pop());

      list.splice(0, list.length, fixed, ...rest);
    }

    return rounds;
  }

  function generateSchedule() {
    const schedule = [];
    let matchNumber = 1;

    const groups = DATA.groups.map(group => ({
      group,
      teams: DATA.teams.filter(team => team.group === group)
    }));

    const groupRounds = groups.map(item => ({
      group: item.group,
      rounds: generateRoundRobin(item.teams.map(team => team.id))
    }));

    const times = ["11:00", "13:30", "16:00", "18:30", "20:00"];
    const arenas = state.tournament.arenas;

    let dayNumber = 0;

    for (let round = 0; round < 10; round++) {
      for (let groupBatch = 0; groupBatch < 2; groupBatch++) {
        const date = addDays(state.tournament.startDate, dayNumber);
        const groupIndexes = groupBatch === 0 ? [0, 1] : [2, 3];

        const dayGames = [];

        groupIndexes.forEach(groupIndex => {
          const groupData = groupRounds[groupIndex];
          const roundIndex = round % 5;

          const games = groupData.rounds[roundIndex].map(game => {
            const reverse = round >= 5;

            return {
              home: reverse ? game.away : game.home,
              away: reverse ? game.home : game.away,
              group: groupData.group
            };
          });

          dayGames.push(...games);
        });

        dayGames.sort(() => Math.random() - 0.5);

        dayGames.forEach((game, index) => {
          const time = times[index % times.length];
          const arena = arenas[index % arenas.length];

          schedule.push({
            id: `match-${matchNumber}`,
            number: matchNumber,
            date,
            time,
            arena,
            group: game.group,
            home: game.home,
            away: game.away,
            status: "scheduled",
            homeScore: null,
            awayScore: null,
            officials: {
              referees: [],
              linesmen: [],
              reserveReferee: null,
              reserveLinesman: null
            },
            reportId: null
          });

          matchNumber++;
        });

        dayNumber++;
      }
    }

    return schedule.sort((a, b) =>
      a.date.localeCompare(b.date) ||
      a.time.localeCompare(b.time)
    );
  }

  function generateTournament() {
    if (!isSelectionComplete()) {
      showToast("Сначала выбери 48 линейных и 48 главных арбитров");
      return;
    }

    if (state.matches.length) {
      const confirmed = confirm(
        "Календарь уже существует. Пересоздать турнир? Текущие результаты и назначения будут удалены."
      );

      if (!confirmed) return;
    }

    state.matches = generateSchedule();

    state.standings = {};

    DATA.groups.forEach(group => {
      state.standings[group] = {};
      DATA.teams.filter(team => team.group === group).forEach(team => {
        state.standings[group][team.id] = {
          played: 0,
          wins: 0,
          regulationWins: 0,
          overtimeWins: 0,
          losses: 0,
          overtimeLosses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          points: 0
        };
      });
    });

    state.playoffs = {
      active: false,
      rounds: [],
      champion: null
    };

    state.reports = [];
    state.trainings = [];
    state.completed = false;
    state.tournament.currentPhase = "group";

    addActivity("Создан календарь турнира", "Сформировано 80 матчей группового этапа");

    saveState();
    navigate("calendar");
    showToast("Календарь из 80 матчей создан");
  }

  /* =====================================================
     CALENDAR
  ===================================================== */

  function renderCalendar() {
    if (!state.matches.length) {
      return `
        <div class="page-heading">
          <div>
            <h1>Календарь матчей</h1>
            <p>Все матчи группового этапа и плей-офф.</p>
          </div>
        </div>
        <div class="empty-state">
          <div class="empty-state-icon">▦</div>
          <b>Календарь ещё не сформирован</b>
          <p>Выбери 48 линейных и 48 главных арбитров, чтобы создать расписание.</p>
          <button class="btn btn-primary" style="margin-top:15px" data-action="go-selection">Перейти к выбору судей</button>
        </div>
      `;
    }

    const dates = [...new Set(state.matches.map(match => match.date))].sort();

    const completed = getCompletedMatches().length;

    return `
      <div class="page-heading">
        <div>
          <h1>Календарь турнира</h1>
          <p>Групповой этап · 4 группы · 20 команд · 80 матчей.</p>
        </div>
        <span class="badge badge-green">${completed}/${state.matches.length} завершено</span>
      </div>

      <div class="selection-toolbar">
        <select class="filter-select" id="calendarGroupFilter">
          <option value="all">Все группы</option>
          ${DATA.groups.map(group => `<option value="${group}">Группа ${group}</option>`).join("")}
        </select>

        <select class="filter-select" id="calendarStatusFilter">
          <option value="all">Все статусы</option>
          <option value="scheduled">Запланированные</option>
          <option value="completed">Завершённые</option>
        </select>
      </div>

      <div id="calendarDays">
        ${dates.map(date => {
          const matches = state.matches.filter(match => match.date === date);

          return `
            <section class="calendar-day" data-date="${date}">
              <div class="calendar-day-header">
                <b>${formatDate(date)}</b>
                <span class="badge">${matches.length} матча</span>
              </div>

              ${matches.map(match => renderCalendarMatch(match)).join("")}
            </section>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderCalendarMatch(match) {
    const home = getTeam(match.home);
    const away = getTeam(match.away);
    const completed = match.status === "completed";

    return `
      <div class="calendar-match" data-group="${match.group}" data-status="${match.status}">
        <div class="match-time">${match.time}</div>

        <div class="match-teams">
          <b>${escapeHTML(home?.name || "—")} — ${escapeHTML(away?.name || "—")}</b>
          <small>Группа ${match.group} · Матч №${match.number}</small>
        </div>

        <div class="match-arena">${escapeHTML(match.arena)}</div>

        <div class="match-score">
          ${completed
            ? `<span class="green">${match.homeScore} : ${match.awayScore}</span>`
            : `<span class="muted">— : —</span>`
          }
          <button class="btn btn-small" data-action="open-match" data-id="${match.id}" style="margin-left:8px">
            ${completed ? "Отчёт" : "Открыть"}
          </button>
        </div>
      </div>
    `;
  }

  /* =====================================================
     MATCH DETAILS AND OFFICIALS
  ===================================================== */

  function openMatch(matchId) {
    const match = getMatch(matchId);
    if (!match) return;

    selectedMatchId = matchId;

    const home = getTeam(match.home);
    const away = getTeam(match.away);
    const officials = getMatchOfficials(match);

    const modal = $("#modal");
    const backdrop = $("#modalBackdrop");

    modal.innerHTML = `
      <div class="modal-header">
        <div>
          <div class="eyebrow">МАТЧ №${match.number} · ГРУППА ${match.group}</div>
          <h2>${escapeHTML(home?.name || "—")} — ${escapeHTML(away?.name || "—")}</h2>
        </div>
        <button class="btn btn-icon" data-action="close-modal">×</button>
      </div>

      <div class="match-hero">
        <div class="small muted">${formatDate(match.date)} · ${match.time} · ${escapeHTML(match.arena)}</div>

        <div class="match-hero-teams">
          <div class="match-hero-team">
            <div class="team-emblem">${escapeHTML(home?.short || "?")}</div>
            <b>${escapeHTML(home?.name || "—")}</b>
          </div>

          <div class="match-vs">
            ${match.status === "completed"
              ? `<div class="match-score-big">${match.homeScore} : ${match.awayScore}</div>`
              : "VS"
            }
          </div>

          <div class="match-hero-team">
            <div class="team-emblem">${escapeHTML(away?.short || "?")}</div>
            <b>${escapeHTML(away?.name || "—")}</b>
          </div>
        </div>

        <div class="small muted" style="text-align:center">
          ${match.status === "completed" ? "Матч завершён" : "Матч ожидает проведения"}
        </div>
      </div>

      <h3 class="section-title">СУДЕЙСКАЯ БРИГАДА</h3>

      <div class="assignment-list">
        ${renderAssignmentLine("Главный арбитр №1", officials.referees[0])}
        ${renderAssignmentLine("Главный арбитр №2", officials.referees[1])}
        ${renderAssignmentLine("Линейный арбитр №1", officials.linesmen[0])}
        ${renderAssignmentLine("Линейный арбитр №2", officials.linesmen[1])}
        ${renderAssignmentLine("Резервный главный", officials.reserveReferee)}
        ${renderAssignmentLine("Резервный линейный", officials.reserveLinesman)}
      </div>

      <div class="divider"></div>

      <div style="display:flex;flex-wrap:wrap;gap:9px">
        <button class="btn btn-primary" data-action="assign-officials" data-id="${match.id}" ${match.status === "completed" ? "disabled" : ""}>
          Назначить бригаду
        </button>

        ${match.status !== "completed" ? `
          <button class="btn btn-success" data-action="complete-match" data-id="${match.id}">
            Провести матч
          </button>
        ` : `
          <button class="btn" data-action="open-report" data-id="${match.id}">
            Открыть отчёт
          </button>
        `}
      </div>
    `;

    backdrop.hidden = false;
  }

  function renderAssignmentLine(label, refereeId) {
    return `
      <div class="assignment-row">
        <span>${label}</span>
        <b>${refereeId ? escapeHTML(getRefereeName(refereeId)) : "Не назначен"}</b>
      </div>
    `;
  }

  function closeModal() {
    $("#modalBackdrop").hidden = true;
    selectedMatchId = null;
  }

  function getAvailableOfficials(role, match) {
    const selected = role === "linesman"
      ? state.selectedLinesmen
      : state.selectedReferees;

    const usedToday = new Set();

    state.matches.forEach(other => {
      if (other.date !== match.date || other.id === match.id) return;
      if (other.status === "completed") return;

      const officials = getMatchOfficials(other);

      officials.referees.forEach(id => usedToday.add(id));
      officials.linesmen.forEach(id => usedToday.add(id));
      if (officials.reserveReferee) usedToday.add(officials.reserveReferee);
      if (officials.reserveLinesman) usedToday.add(officials.reserveLinesman);
    });

    return selected
      .map(getReferee)
      .filter(ref => ref && !usedToday.has(ref.id));
  }

  function assignOfficials(matchId) {
    const match = getMatch(matchId);
    if (!match) return;

    const officials = getMatchOfficials(match);

    const availableReferees = getAvailableOfficials("referee", match);
    const availableLinesmen = getAvailableOfficials("linesman", match);

    if (availableReferees.length < 3 || availableLinesmen.length < 3) {
      showToast("Недостаточно свободных судей на эту дату");
      return;
    }

    const options = (list, current) => `
      <option value="">Не назначен</option>
      ${list.map(ref => `
        <option value="${ref.id}" ${current === ref.id ? "selected" : ""}>
          ${escapeHTML(ref.fullName)} · ${ref.age} лет · ${ref.experience} лет опыта
        </option>
      `).join("")}
    `;

    const modal = $("#modal");

    modal.innerHTML = `
      <div class="modal-header">
        <div>
          <div class="eyebrow">НАЗНАЧЕНИЕ АРБИТРОВ</div>
          <h2>Матч №${match.number}</h2>
        </div>
        <button class="btn btn-icon" data-action="close-modal">×</button>
      </div>

      <p class="small muted">
        ${formatDate(match.date)} · ${match.time}. Один судья не может обслуживать более одного матча в день.
      </p>

      <form id="assignmentForm">
        <div class="form-grid">
          <div class="form-group full">
            <label>Главный арбитр №1</label>
            <select class="form-control" name="referee1" required>
              ${options(availableReferees, officials.referees[0])}
            </select>
          </div>

          <div class="form-group full">
            <label>Главный арбитр №2</label>
            <select class="form-control" name="referee2" required>
              ${options(availableReferees, officials.referees[1])}
            </select>
          </div>

          <div class="form-group full">
            <label>Линейный арбитр №1</label>
            <select class="form-control" name="linesman1" required>
              ${options(availableLinesmen, officials.linesmen[0])}
            </select>
          </div>

          <div class="form-group full">
            <label>Линейный арбитр №2</label>
            <select class="form-control" name="linesman2" required>
              ${options(availableLinesmen, officials.linesmen[1])}
            </select>
          </div>

          <div class="form-group full">
            <label>Резервный главный арбитр</label>
            <select class="form-control" name="reserveReferee" required>
              ${options(availableReferees, officials.reserveReferee)}
            </select>
          </div>

          <div class="form-group full">
            <label>Резервный линейный арбитр</label>
            <select class="form-control" name="reserveLinesman" required>
              ${options(availableLinesmen, officials.reserveLinesman)}
            </select>
          </div>
        </div>

        <button class="btn btn-primary btn-block" style="margin-top:18px" type="submit">
          Сохранить назначение
        </button>
      </form>
    `;

    $("#assignmentForm").addEventListener("submit", event => {
      event.preventDefault();

      const form = new FormData(event.currentTarget);

      const refereeIds = [
        form.get("referee1"),
        form.get("referee2"),
        form.get("reserveReferee")
      ];

      const linesmanIds = [
        form.get("linesman1"),
        form.get("linesman2"),
        form.get("reserveLinesman")
      ];

      if (refereeIds.some(id => !id) || linesmanIds.some(id => !id)) {
        showToast("Заполни все шесть позиций");
        return;
      }

      if (new Set(refereeIds).size !== 3 || new Set(linesmanIds).size !== 3) {
        showToast("Один судья не может занимать две позиции");
        return;
      }

      match.officials = {
        referees: refereeIds.slice(0, 2),
        linesmen: linesmanIds.slice(0, 2),
        reserveReferee: refereeIds[2],
        reserveLinesman: linesmanIds[2]
      };

      addActivity("Назначена судейская бригада", `Матч №${match.number}`);
      saveState();
      openMatch(match.id);
      showToast("Назначение сохранено");
    });
  }

  /* =====================================================
     MATCH COMPLETION AND REPORTS
  ===================================================== */

  function completeMatch(matchId) {
    const match = getMatch(matchId);
    if (!match) return;

    const officials = getMatchOfficials(match);

    if (
      officials.referees.length !== 2 ||
      officials.linesmen.length !== 2 ||
      !officials.reserveReferee ||
      !officials.reserveLinesman
    ) {
      showToast("Сначала назначь всех шестерых арбитров");
      return;
    }

    const allOfficials = [
      ...officials.referees,
      ...officials.linesmen,
      officials.reserveReferee,
      officials.reserveLinesman
    ];

    if (new Set(allOfficials).size !== 6) {
      showToast("В бригаде не должно быть повторяющихся судей");
      return;
    }

    const modal = $("#modal");

    modal.innerHTML = `
      <div class="modal-header">
        <div>
          <div class="eyebrow">ЗАВЕРШЕНИЕ МАТЧА</div>
          <h2>Матч №${match.number}</h2>
        </div>
        <button class="btn btn-icon" data-action="close-modal">×</button>
      </div>

      <form id="resultForm">
        <div class="form-grid">
          <div class="form-group">
            <label>${escapeHTML(getTeam(match.home)?.name || "Хозяева")}</label>
            <input class="form-control" name="homeScore" type="number" min="0" max="30" value="2" required>
          </div>

          <div class="form-group">
            <label>${escapeHTML(getTeam(match.away)?.name || "Гости")}</label>
            <input class="form-control" name="awayScore" type="number" min="0" max="30" value="1" required>
          </div>

          <div class="form-group full">
            <label>Характер результата</label>
            <select class="form-control" name="resultType">
              <option value="regulation">Основное время</option>
              <option value="overtime">Овертайм</option>
              <option value="shootout">Послематчевые броски</option>
            </select>
          </div>
        </div>

        <p class="small muted" style="margin-top:14px">
          После сохранения результата откроется инспекторский отчёт для оценки каждого из шести судей.
        </p>

        <button class="btn btn-primary btn-block" style="margin-top:15px" type="submit">
          Сохранить результат и перейти к отчёту
        </button>
      </form>
    `;

    $("#resultForm").addEventListener("submit", event => {
      event.preventDefault();

      const form = new FormData(event.currentTarget);
      const homeScore = Number(form.get("homeScore"));
      const awayScore = Number(form.get("awayScore"));

      if (
        !Number.isInteger(homeScore) ||
        !Number.isInteger(awayScore) ||
        homeScore < 0 ||
        awayScore < 0 ||
        homeScore === awayScore
      ) {
        showToast("Укажи корректный счёт с победителем");
        return;
      }

      match.homeScore = homeScore;
      match.awayScore = awayScore;
      match.resultType = form.get("resultType");
      match.status = "completed";

      updateStandings(match);

      addActivity(
        "Завершён матч",
        `${getTeam(match.home)?.name} ${homeScore}:${awayScore} ${getTeam(match.away)?.name}`
      );

      saveState();
      openReport(match.id);
    });
  }

  function updateStandings(match) {
    const groupTable = state.standings[match.group];
    if (!groupTable) return;

    const home = groupTable[match.home];
    const away = groupTable[match.away];

    if (!home || !away) return;

    home.played++;
    away.played++;

    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;

    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;

    const homeWon = match.homeScore > match.awayScore;
    const winner = homeWon ? home : away;
    const loser = homeWon ? away : home;

    winner.wins++;
    loser.losses++;

    if (match.resultType === "overtime" || match.resultType === "shootout") {
      winner.overtimeWins++;
      loser.overtimeLosses++;
      winner.points += 2;
      loser.points += 1;
    } else {
      winner.regulationWins++;
      winner.points += 2;
    }
  }

  function openReport(matchId) {
    const match = getMatch(matchId);
    if (!match) return;

    const officials = getMatchOfficials(match);

    const allOfficials = [
      ...officials.referees,
      ...officials.linesmen,
      officials.reserveReferee,
      officials.reserveLinesman
    ].filter(Boolean);

    const existingReport = state.reports.find(report => report.matchId === matchId);

    const reportEntries = existingReport?.evaluations || {};

    $("#modal").innerHTML = `
      <div class="modal-header">
        <div>
          <div class="eyebrow">ИНСПЕКТОРСКИЙ ОТЧЁТ</div>
          <h2>Матч №${match.number}</h2>
        </div>
        <button class="btn btn-icon" data-action="close-modal">×</button>
      </div>

      <div class="small muted">
        ${escapeHTML(getTeam(match.home)?.name)} ${match.homeScore}:${match.awayScore}
        ${escapeHTML(getTeam(match.away)?.name)}
      </div>

      <form id="reportForm">
        <div class="form-group" style="margin-top:17px">
          <label>Общая оценка матча</label>
          <select class="form-control" name="matchQuality">
            <option value="excellent">Отличный матч</option>
            <option value="good">Хороший матч</option>
            <option value="average">Средний матч</option>
            <option value="poor">Сложный матч</option>
          </select>
        </div>

        <h3 class="section-title">ОЦЕНКА СУДЕЙ</h3>

        ${allOfficials.map(id => {
          const referee = getReferee(id);
          const old = reportEntries[id] || {};

          return `
            <div class="card" style="margin-bottom:12px;padding:14px">
              <div class="card-header">
                <div>
                  <div class="card-title">${escapeHTML(referee?.fullName || "Судья")}</div>
                  <div class="card-description">${escapeHTML(referee?.roleLabel || "")}</div>
                </div>
                <span class="badge">${referee?.number ?? "—"}</span>
              </div>

              <div class="form-grid">
                <div class="form-group">
                  <label>Оценка работы (1–5)</label>
                  <select class="form-control" name="rating-${id}" required>
                    ${[1, 2, 3, 4, 5].map(number => `
                      <option value="${number}" ${Number(old.rating || 3) === number ? "selected" : ""}>
                        ${number}
                      </option>
                    `).join("")}
                  </select>
                </div>

                <div class="form-group">
                  <label>Сильная сторона</label>
                  <select class="form-control" name="plus-${id}">
                    ${DATA.qualityNames.map(name => `
                      <option value="${escapeHTML(name)}" ${old.plus === name ? "selected" : ""}>
                        ${escapeHTML(name)}
                      </option>
                    `).join("")}
                  </select>
                </div>

                <div class="form-group full">
                  <label>Недостатки и замечания</label>
                  <textarea class="form-control" name="minus-${id}" placeholder="Опиши ошибки или недостатки...">${escapeHTML(old.minus || "")}</textarea>
                </div>

                <div class="form-group full">
                  <label>Комментарий инспектора</label>
                  <textarea class="form-control" name="comment-${id}" placeholder="Дополнительный комментарий...">${escapeHTML(old.comment || "")}</textarea>
                </div>
              </div>
            </div>
          `;
        }).join("")}

        <div class="form-group">
          <label>Общий комментарий по матчу</label>
          <textarea class="form-control" name="generalComment" placeholder="Итоги инспектирования...">${escapeHTML(existingReport?.generalComment || "")}</textarea>
        </div>

        <button class="btn btn-primary btn-block" style="margin-top:17px" type="submit">
          Сохранить инспекторский отчёт
        </button>
      </form>
    `;

    $("#reportForm").addEventListener("submit", event => {
      event.preventDefault();

      const form = new FormData(event.currentTarget);
      const evaluations = {};

      allOfficials.forEach(id => {
        evaluations[id] = {
          rating: Number(form.get(`rating-${id}`)),
          plus: form.get(`plus-${id}`),
          minus: form.get(`minus-${id}`) || "",
          comment: form.get(`comment-${id}`) || ""
        };

        const referee = getReferee(id);

        if (referee) {
          referee.matchHistory ||= [];

          const oldEntry = referee.matchHistory.find(entry => entry.matchId === match.id);

          const entry = {
            matchId: match.id,
            matchNumber: match.number,
            date: match.date,
            rating: evaluations[id].rating,
            plus: evaluations[id].plus,
            minus: evaluations[id].minus,
            comment: evaluations[id].comment
          };

          if (oldEntry) {
            Object.assign(oldEntry, entry);
          } else {
            referee.matchHistory.push(entry);
          }
        }
      });

      const report = {
        id: existingReport?.id || `report-${Date.now()}`,
        matchId: match.id,
        matchNumber: match.number,
        date: match.date,
        evaluations,
        matchQuality: form.get("matchQuality"),
        generalComment: form.get("generalComment") || "",
        createdAt: new Date().toISOString()
      };

      if (existingReport) {
        Object.assign(existingReport, report);
      } else {
        state.reports.push(report);
      }

      match.reportId = report.id;

      addActivity("Сохранён инспекторский отчёт", `Матч №${match.number}`);
      saveState();

      closeModal();
      renderPage();
      showToast("Отчёт сохранён");
    });
  }

  /* =====================================================
     STANDINGS
  ===================================================== */

  function getSortedStandings(group) {
    const table = state.standings[group] || {};

    return DATA.teams
      .filter(team => team.group === group)
      .map(team => ({
        team,
        stats: table[team.id] || {
          played: 0,
          wins: 0,
          losses: 0,
          overtimeLosses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          points: 0
        }
      }))
      .sort((a, b) =>
        b.stats.points - a.stats.points ||
        (b.stats.goalsFor - b.stats.goalsAgainst) -
        (a.stats.goalsFor - a.stats.goalsAgainst) ||
        b.stats.goalsFor - a.stats.goalsFor
      );
  }

  function renderStandings() {
    if (!state.matches.length) {
      return `
        <div class="page-heading"><h1>Турнирные таблицы</h1></div>
        <div class="empty-state">
          <b>Таблицы пока недоступны</b>
          <p>Сначала сформируй календарь турнира.</p>
          <button class="btn btn-primary" style="margin-top:15px" data-action="go-selection">К выбору судей</button>
        </div>
      `;
    }

    return `
      <div class="page-heading">
        <div>
          <h1>Турнирные таблицы</h1>
          <p>Положение команд после сыгранных матчей группового этапа.</p>
        </div>
        <span class="badge badge-orange">2 ОЧКА ЗА ПОБЕДУ</span>
      </div>

      ${DATA.groups.map(group => {
        const rows = getSortedStandings(group);

        return `
          <section style="margin-bottom:25px">
            <h2 class="section-title">ГРУППА ${group}</h2>

            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>МЕСТО</th>
                    <th>КОМАНДА</th>
                    <th>И</th>
                    <th>В</th>
                    <th>П</th>
                    <th>ПО</th>
                    <th>ШЗ</th>
                    <th>ШП</th>
                    <th>О</th>
                  </tr>
                </thead>

                <tbody>
                  ${rows.map((row, index) => `
                    <tr class="${index < 2 ? "highlight" : ""}">
                      <td><span class="rank-number ${index < 2 ? "top" : ""}">${index + 1}</span></td>
                      <td><b>${escapeHTML(row.team.name)}</b></td>
                      <td>${row.stats.played}</td>
                      <td>${row.stats.wins}</td>
                      <td>${row.stats.losses}</td>
                      <td>${row.stats.overtimeLosses}</td>
                      <td>${row.stats.goalsFor}</td>
                      <td>${row.stats.goalsAgainst}</td>
                      <td><b>${row.stats.points}</b></td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>

            <div class="small muted" style="margin-top:7px">
              Первые две команды выходят во второй этап.
            </div>
          </section>
        `;
      }).join("")}
    `;
  }

  /* =====================================================
     PLAYOFFS
  ===================================================== */

  function createPlayoffs() {
    if (!state.matches.length) {
      showToast("Сначала создай календарь группового этапа");
      return;
    }

    if (getCompletedMatches().length !== state.matches.length) {
      showToast("Не все матчи группового этапа завершены");
      return;
    }

    const qualified = {};

    DATA.groups.forEach(group => {
      qualified[group] = getSortedStandings(group).slice(0, 2).map(row => row.team.id);
    });

    const quarterPairs = [
      [qualified["А"][0], qualified["Б"][1]],
      [qualified["Б"][0], qualified["А"][1]],
      [qualified["В"][0], qualified["Г"][1]],
      [qualified["Г"][0], qualified["В"][1]]
    ];

    state.playoffs = {
      active: true,
      champion: null,
      rounds: [{
        name: "Четвертьфинал",
        bestOf: 3,
        series: quarterPairs.map((pair, index) => ({
          id: `qf-${index + 1}`,
          team1: pair[0],
          team2: pair[1],
          wins1: 0,
          wins2: 0,
          winner: null,
          games: []
        }))
      }, {
        name: "Полуфинал",
        bestOf: 3,
        series: []
      }, {
        name: "Финал",
        bestOf: 3,
        series: []
      }]
    };

    state.tournament.currentPhase = "playoffs";

    addActivity("Сформирован второй этап", "В плей-офф вышли 8 команд");
    saveState();
    renderPage();
    showToast("Сетка плей-офф сформирована");
  }

  function renderPlayoffs() {
    if (!state.playoffs.active) {
      const ready = state.matches.length &&
        getCompletedMatches().length === state.matches.length;

      return `
        <div class="page-heading">
          <div>
            <h1>Второй этап</h1>
            <p>Плей-офф с участием восьми лучших команд. Серии до двух побед.</p>
          </div>
        </div>

        <div class="card">
          <div class="empty-state">
            <div class="empty-state-icon">⌑</div>
            <b>${ready ? "Групповой этап завершён" : "Плей-офф пока недоступен"}</b>
            <p>${ready
              ? "Можно сформировать четвертьфинальные пары."
              : "Для запуска плей-офф необходимо завершить все 80 матчей."
            }</p>
            <button class="btn btn-primary" style="margin-top:15px" data-action="create-playoffs" ${ready ? "" : "disabled"}>
              Сформировать плей-офф
            </button>
          </div>
        </div>
      `;
    }

    return `
      <div class="page-heading">
        <div>
          <h1>Плей-офф</h1>
          <p>Серии best-of-3 · Победитель определяется после двух побед.</p>
        </div>
        <span class="badge badge-orange">8 КОМАНД</span>
      </div>

      <div class="playoff-grid">
        ${state.playoffs.rounds.map((round, roundIndex) => `
          <div class="playoff-round">
            <div class="playoff-round-title">${escapeHTML(round.name).toUpperCase()}</div>

            ${round.series.length ? round.series.map(series => `
              <div class="playoff-match">
                <div class="small muted" style="margin-bottom:9px">${series.games.length} / 3 матчей</div>

                <div class="playoff-team ${series.winner === series.team1 ? "winner" : ""}">
                  <b>${escapeHTML(getTeam(series.team1)?.name || "Ожидает")}</b>
                  <b>${series.wins1}</b>
                </div>

                <div class="playoff-team ${series.winner === series.team2 ? "winner" : ""}">
                  <b>${escapeHTML(getTeam(series.team2)?.name || "Ожидает")}</b>
                  <b>${series.wins2}</b>
                </div>

                ${series.winner
                  ? `<div class="badge badge-green" style="margin-top:9px">Победитель определён</div>`
                  : `<button class="btn btn-small btn-primary btn-block" style="margin-top:9px" data-action="playoff-game" data-round="${roundIndex}" data-series="${series.id}">Добавить матч</button>`
                }
              </div>
            `).join("") : `
              <div class="empty-state">
                <p>Ожидание завершения предыдущего раунда.</p>
              </div>
            `}
          </div>
        `).join("")}
      </div>

      ${state.playoffs.champion ? `
        <div class="card" style="margin-top:20px;text-align:center">
          <div class="eyebrow">ЧЕМПИОН КУБКА РОССИИ U16</div>
          <h2 style="font-family:var(--font-display);color:var(--orange)">
            ${escapeHTML(getTeam(state.playoffs.champion)?.name || "")}
          </h2>
        </div>
      ` : ""}
    `;
  }

  function addPlayoffGame(roundIndex, seriesId) {
    const round = state.playoffs.rounds[roundIndex];
    const series = round?.series.find(item => item.id === seriesId);

    if (!series || series.winner) return;

    const modal = $("#modal");

    modal.innerHTML = `
      <div class="modal-header">
        <h2>Результат матча плей-офф</h2>
        <button class="btn btn-icon" data-action="close-modal">×</button>
      </div>

      <form id="playoffResultForm">
        <div class="form-group">
          <label>${escapeHTML(getTeam(series.team1)?.name || "")}</label>
          <input class="form-control" name="score1" type="number" min="0" max="20" value="3" required>
        </div>

        <div class="form-group" style="margin-top:12px">
          <label>${escapeHTML(getTeam(series.team2)?.name || "")}</label>
          <input class="form-control" name="score2" type="number" min="0" max="20" value="2" required>
        </div>

        <button class="btn btn-primary btn-block" style="margin-top:17px" type="submit">Сохранить результат</button>
      </form>
    `;

    $("#playoffResultForm").addEventListener("submit", event => {
      event.preventDefault();

      const form = new FormData(event.currentTarget);
      const score1 = Number(form.get("score1"));
      const score2 = Number(form.get("score2"));

      if (score1 === score2) {
        showToast("Ничья невозможна");
        return;
      }

      series.games.push({ score1, score2, date: getCurrentDate() });

      if (score1 > score2) series.wins1++;
      else series.wins2++;

      if (series.wins1 === 2) series.winner = series.team1;
      if (series.wins2 === 2) series.winner = series.team2;

      updatePlayoffProgress(roundIndex);

      addActivity("Добавлен результат плей-офф", round.name);
      saveState();
      closeModal();
      renderPage();
    });

    $("#modalBackdrop").hidden = false;
  }

  function updatePlayoffProgress(roundIndex) {
    const rounds = state.playoffs.rounds;
    const current = rounds[roundIndex];

    if (!current || current.series.some(series => !series.winner)) return;

    if (roundIndex === 0) {
      const winners = current.series.map(series => series.winner);

      rounds[1].series = [
        { id: "sf-1", team1: winners[0], team2: winners[1], wins1: 0, wins2: 0, winner: null, games: [] },
        { id: "sf-2", team1: winners[2], team2: winners[3], wins1: 0, wins2: 0, winner: null, games: [] }
      ];
    }

    if (roundIndex === 1) {
      const winners = current.series.map(series => series.winner);

      rounds[2].series = [{
        id: "final-1",
        team1: winners[0],
        team2: winners[1],
        wins1: 0,
        wins2: 0,
        winner: null,
        games: []
      }];
    }

    if (roundIndex === 2) {
      state.playoffs.champion = current.series[0].winner;
      state.completed = true;
    }
  }

  /* =====================================================
     REPORTS PAGE
  ===================================================== */

  function renderReports() {
    const reports = [...state.reports].sort((a, b) =>
      b.date.localeCompare(a.date)
    );

    return `
      <div class="page-heading">
        <div>
          <h1>Инспектирование</h1>
          <p>Отчёты по матчам, оценки судей и индивидуальная работа над ошибками.</p>
        </div>
        <span class="badge badge-orange">${reports.length} ОТЧЁТОВ</span>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Всего отчётов</div>
          <div class="stat-value">${reports.length}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Средняя оценка судей</div>
          <div class="stat-value">${getAllAverageRating() || "—"}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Индивидуальные разборы</div>
          <div class="stat-value">${state.trainings.length}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Матчи без отчёта</div>
          <div class="stat-value">${getCompletedMatches().filter(match => !match.reportId).length}</div>
        </div>
      </div>

      <h2 class="section-title">ОТЧЁТЫ ПО МАТЧАМ</h2>

      ${reports.length ? `
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>МАТЧ</th>
                <th>ДАТА</th>
                <th>КАЧЕСТВО</th>
                <th>ОЦЕНОК</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${reports.map(report => `
                <tr>
                  <td><b>Матч №${report.matchNumber}</b></td>
                  <td>${formatShortDate(report.date)}</td>
                  <td>${escapeHTML(reportQualityLabel(report.matchQuality))}</td>
                  <td>${Object.keys(report.evaluations).length}</td>
                  <td>
                    <button class="btn btn-small" data-action="open-report" data-id="${report.matchId}">Открыть</button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="empty-state">
          <div class="empty-state-icon">◎</div>
          <b>Отчётов пока нет</b>
          <p>После завершения матча можно оценить работу каждого арбитра.</p>
        </div>
      `}

      <h2 class="section-title">ИНДИВИДУАЛЬНАЯ ПОДГОТОВКА</h2>

      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">ИНДИВИДУАЛЬНЫЙ РАЗБОР СУДЬИ</div>
            <div class="card-description">Назначь арбитру работу над конкретным навыком.</div>
          </div>
        </div>

        <form id="trainingForm">
          <div class="form-grid">
            <div class="form-group full">
              <label>Судья</label>
              <select class="form-control" name="refereeId" required>
                <option value="">Выбери арбитра</option>
                ${[...getSelectedReferees("referee"), ...getSelectedReferees("linesman")]
                  .sort((a, b) => a.fullName.localeCompare(b.fullName))
                  .map(ref => `
                    <option value="${ref.id}">${escapeHTML(ref.fullName)} · ${escapeHTML(ref.roleLabel)}</option>
                  `).join("")}
              </select>
            </div>

            <div class="form-group">
              <label>Навык для разбора</label>
              <select class="form-control" name="skill" required>
                ${DATA.qualityNames.map(name => `<option value="${escapeHTML(name)}">${escapeHTML(name)}</option>`).join("")}
              </select>
            </div>

            <div class="form-group">
              <label>Срок выполнения</label>
              <input class="form-control" name="deadline" type="date">
            </div>

            <div class="form-group full">
              <label>Задание инспектора</label>
              <textarea class="form-control" name="task" placeholder="Что необходимо отработать..." required></textarea>
            </div>
          </div>

          <button class="btn btn-primary" style="margin-top:15px" type="submit">
            Назначить разбор
          </button>
        </form>
      </div>

      <h2 class="section-title">НАЗНАЧЕННЫЕ РАЗБОРЫ</h2>

      ${state.trainings.length ? `
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>СУДЬЯ</th>
                <th>НАВЫК</th>
                <th>СРОК</th>
                <th>СТАТУС</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${state.trainings.map(training => `
                <tr>
                  <td>${escapeHTML(getRefereeName(training.refereeId))}</td>
                  <td>${escapeHTML(training.skill)}</td>
                  <td>${training.deadline ? formatShortDate(training.deadline) : "—"}</td>
                  <td><span class="badge ${training.completed ? "badge-green" : "badge-yellow"}">${training.completed ? "Выполнено" : "В работе"}</span></td>
                  <td>
                    <button class="btn btn-small" data-action="toggle-training" data-id="${training.id}">
                      ${training.completed ? "Вернуть" : "Выполнено"}
                    </button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="empty-state">
          <b>Разборов пока нет</b>
          <p>Здесь будут отображаться индивидуальные задания.</p>
        </div>
      `}
    `;
  }

  function reportQualityLabel(value) {
    return ({
      excellent: "Отличный",
      good: "Хороший",
      average: "Средний",
      poor: "Сложный"
    })[value] || "—";
  }

  function getAllAverageRating() {
    const ratings = state.reports.flatMap(report =>
      Object.values(report.evaluations || {}).map(item => Number(item.rating))
    );

    return ratings.length ? average(ratings).toFixed(2) : 0;
  }

  function addTraining(form) {
    const refereeId = form.get("refereeId");
    const skill = form.get("skill");
    const task = form.get("task");

    if (!refereeId || !task) {
      showToast("Заполни все обязательные поля");
      return;
    }

    const training = {
      id: `training-${Date.now()}`,
      refereeId,
      skill,
      task,
      deadline: form.get("deadline"),
      completed: false,
      createdAt: new Date().toISOString()
    };

    state.trainings.push(training);

    const referee = getReferee(refereeId);
    if (referee) {
      referee.individualTrainings ||= [];
      referee.individualTrainings.push(training.id);
    }

    addActivity("Назначен индивидуальный разбор", `${getRefereeName(refereeId)} · ${skill}`);
    saveState();
    renderPage();
    showToast("Индивидуальный разбор назначен");
  }

  /* =====================================================
     REFEREE RANKINGS
  ===================================================== */

  function getRefereePerformance(referee) {
    const history = referee.matchHistory || [];

    return history.length
      ? average(history.map(item => item.rating))
      : 0;
  }

  function renderRankings() {
    const allSelected = [
      ...getSelectedReferees("referee"),
      ...getSelectedReferees("linesman")
    ];

    const sortByPerformance = list => [...list].sort((a, b) =>
      getRefereePerformance(b) - getRefereePerformance(a) ||
      b.rating - a.rating
    );

    const chiefs = sortByPerformance(allSelected.filter(ref => ref.role === "referee"));
    const linesmen = sortByPerformance(allSelected.filter(ref => ref.role === "linesman"));

    return `
      <div class="page-heading">
        <div>
          <h1>Рейтинг арбитров</h1>
          <p>Итоговые оценки, статистика работы и лучшие судьи турнира.</p>
        </div>
        <span class="badge badge-orange">ТОП-10</span>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Главные арбитры</div>
          <div class="stat-value">${chiefs.length}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Линейные арбитры</div>
          <div class="stat-value">${linesmen.length}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Средняя оценка</div>
          <div class="stat-value">${getAllAverageRating() || "—"}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Отчётов</div>
          <div class="stat-value">${state.reports.length}</div>
        </div>
      </div>

      ${renderRankingTable("ТОП-10 ГЛАВНЫХ АРБИТРОВ", chiefs)}
      ${renderRankingTable("ТОП-10 ЛИНЕЙНЫХ АРБИТРОВ", linesmen)}

      <div class="card" style="margin-top:22px">
        <div class="card-header">
          <div>
            <div class="card-title">ИТОГОВЫЕ ОЦЕНКИ ТУРНИРА</div>
            <div class="card-description">Выставь каждому арбитру оценку от 1 до 10.</div>
          </div>
          <button class="btn btn-primary btn-small" data-action="final-ratings">
            Выставить оценки
          </button>
        </div>

        <p class="small muted">
          Итоговая оценка сохраняется в профиле судьи и учитывается в финальном рейтинге.
        </p>
      </div>
    `;
  }

  function renderRankingTable(title, referees) {
    return `
      <h2 class="section-title">${title}</h2>

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>МЕСТО</th>
              <th>АРБИТР</th>
              <th>ГОРОД</th>
              <th>МАТЧИ</th>
              <th>СРЕДНЯЯ ОЦЕНКА</th>
              <th>ИТОГ</th>
            </tr>
          </thead>
          <tbody>
            ${referees.slice(0, 10).map((ref, index) => `
              <tr>
                <td><span class="rank-number ${index < 3 ? "top" : ""}">${index + 1}</span></td>
                <td><b>${escapeHTML(ref.fullName)}</b></td>
                <td>${escapeHTML(ref.city)}</td>
                <td>${(ref.matchHistory || []).length}</td>
                <td>${getRefereePerformance(ref) ? getRefereePerformance(ref).toFixed(2) : "—"}</td>
                <td><b>${ref.finalRating ?? "—"}</b></td>
              </tr>
            `).join("") || `
              <tr><td colspan="6">Нет данных</td></tr>
            `}
          </tbody>
        </table>
      </div>
    `;
  }

  function openFinalRatings() {
    const selected = [
      ...getSelectedReferees("referee"),
      ...getSelectedReferees("linesman")
    ];

    $("#modal").innerHTML = `
      <div class="modal-header">
        <div>
          <div class="eyebrow">ИТОГИ ТУРНИРА</div>
          <h2>Финальные оценки арбитров</h2>
        </div>
        <button class="btn btn-icon" data-action="close-modal">×</button>
      </div>

      <form id="finalRatingForm">
        <div class="small muted" style="margin-bottom:15px">
          Выставь оценку каждому судье по итогам всего турнира.
        </div>

        ${selected.map(ref => `
          <div class="assignment-row" style="margin-bottom:8px">
            <div style="min-width:0;flex:1">
              <b>${escapeHTML(ref.fullName)}</b>
              <div class="small muted">${escapeHTML(ref.roleLabel)} · ${escapeHTML(ref.city)}</div>
            </div>

            <select class="form-control" style="width:75px" name="${ref.id}">
              <option value="">—</option>
              ${Array.from({ length: 10 }, (_, i) => i + 1).map(number => `
                <option value="${number}" ${Number(ref.finalRating) === number ? "selected" : ""}>
                  ${number}
                </option>
              `).join("")}
            </select>
          </div>
        `).join("")}

        <button class="btn btn-primary btn-block" style="margin-top:16px" type="submit">
          Сохранить итоговые оценки
        </button>
      </form>
    `;

    $("#finalRatingForm").addEventListener("submit", event => {
      event.preventDefault();

      const form = new FormData(event.currentTarget);

      selected.forEach(ref => {
        const value = form.get(ref.id);
        ref.finalRating = value ? Number(value) : null;
      });

      addActivity("Выставлены итоговые оценки арбитрам", "Финальное оценивание");
      saveState();
      closeModal();
      renderPage();
      showToast("Итоговые оценки сохранены");
    });

    $("#modalBackdrop").hidden = false;
  }

  /* =====================================================
     SETTINGS AND DATA
  ===================================================== */

  function renderSettings() {
    return `
      <div class="page-heading">
        <div>
          <h1>Настройки и данные</h1>
          <p>Управление сохранением, резервными копиями и параметрами турнира.</p>
        </div>
      </div>

      <div class="settings-grid">
        <div class="card">
          <div class="card-header">
            <div class="card-title">СОХРАНЕНИЕ ДАННЫХ</div>
            <span class="badge badge-green">LOCAL STORAGE</span>
          </div>

          <div class="setting-row">
            <div>
              <b>Автоматическое сохранение</b>
              <small>Данные сохраняются после каждого действия.</small>
            </div>
            <span class="green">Включено</span>
          </div>

          <div class="setting-row">
            <div>
              <b>Всего судей в базе</b>
              <small>Кандидаты главных и линейных арбитров.</small>
            </div>
            <b>${state.referees.length}</b>
          </div>

          <div class="setting-row">
            <div>
              <b>Матчей в календаре</b>
              <small>Групповой этап.</small>
            </div>
            <b>${state.matches.length}</b>
          </div>

          <div class="setting-row">
            <div>
              <b>Инспекторских отчётов</b>
              <small>Сохранённые отчёты.</small>
            </div>
            <b>${state.reports.length}</b>
          </div>

          <button class="btn btn-primary btn-block" style="margin-top:15px" data-action="export-data">
            Экспортировать резервную копию
          </button>

          <button class="btn btn-block" style="margin-top:9px" data-action="import-data">
            Импортировать резервную копию
          </button>

          <input id="importFile" type="file" accept="application/json,.json" hidden>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">ПАРАМЕТРЫ ТУРНИРА</div>
          </div>

          <div class="setting-row">
            <div>
              <b>Турнир</b>
              <small>Название соревнования.</small>
            </div>
            <b>Кубок России U16</b>
          </div>

          <div class="setting-row">
            <div>
              <b>Город</b>
              <small>Место проведения.</small>
            </div>
            <b>Сочи</b>
          </div>

          <div class="setting-row">
            <div>
              <b>Арены</b>
              <small>Основные площадки.</small>
            </div>
            <b>2</b>
          </div>

          <div class="setting-row">
            <div>
              <b>Команды</b>
              <small>Четыре группы по пять команд.</small>
            </div>
            <b>20</b>
          </div>

          <div class="setting-row">
            <div>
              <b>Система очков</b>
              <small>Победа / поражение в овертайме.</small>
            </div>
            <b>2 / 1</b>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">СОСТАВ СУДЕЙ</div>
          </div>

          <div class="setting-row">
            <div><b>Линейные арбитры</b></div>
            <b>${state.selectedLinesmen.length}/48</b>
          </div>

          <div class="setting-row">
            <div><b>Главные арбитры</b></div>
            <b>${state.selectedReferees.length}/48</b>
          </div>

          <button class="btn btn-block" style="margin-top:15px" data-action="go-selection">
            Открыть судейский корпус
          </button>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">ОПАСНАЯ ЗОНА</div>
            <span class="badge badge-red">ВНИМАНИЕ</span>
          </div>

          <p class="small muted">
            Сброс удалит сохранённые результаты, назначения, отчёты, рейтинги и выбранный состав судей.
          </p>

          <button class="btn btn-danger btn-block" style="margin-top:15px" data-action="reset-data">
            Полностью сбросить турнир
          </button>
        </div>
      </div>
    `;
  }

  function exportData() {
    const blob = new Blob(
      [JSON.stringify(state, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `ref-control-backup-${getCurrentDate()}.json`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    showToast("Резервная копия подготовлена");
  }

  function importData(file) {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);

        if (
          imported.version !== DATA.version ||
          !Array.isArray(imported.referees) ||
          !Array.isArray(imported.matches)
        ) {
          throw new Error("Неверный формат резервной копии");
        }

        if (!confirm("Заменить текущие данные импортированной копией?")) {
          return;
        }

        state = imported;
        saveState();
        renderPage();
        showToast("Данные успешно импортированы");
      } catch (error) {
        console.error(error);
        showToast("Не удалось импортировать файл");
      }
    };

    reader.readAsText(file);
  }

  function resetData() {
    const confirmed = confirm(
      "Ты действительно хочешь полностью сбросить турнир? Все результаты и отчёты будут удалены."
    );

    if (!confirmed) return;

    const secondConfirm = confirm(
      "Подтверди сброс. Это действие нельзя отменить без резервной копии."
    );

    if (!secondConfirm) return;

    state = DATA.createInitialState();

    saveState();
    navigate("dashboard");
    showToast("Данные турнира сброшены");
  }

  /* =====================================================
     EVENT HANDLERS
  ===================================================== */

  function handleAction(button) {
    const action = button.dataset.action;
    const id = button.dataset.id;

    switch (action) {
      case "go-selection":
        navigate("selection");
        break;

      case "selection-role":
        selectionRole = button.dataset.role;
        selectionSearch = "";
        selectionRegion = "all";
        selectionQuality = "all";
        renderPage();
        break;

      case "toggle-referee":
        toggleReferee(id);
        break;

      case "clear-role-selection":
        clearRoleSelection(button.dataset.role);
        break;

      case "generate-tournament":
        generateTournament();
        break;

      case "open-match":
        openMatch(id);
        break;

      case "close-modal":
        closeModal();
        break;

      case "assign-officials":
        assignOfficials(id);
        break;

      case "complete-match":
        completeMatch(id);
        break;

      case "open-report":
        openReport(id);
        break;

      case "create-playoffs":
        createPlayoffs();
        break;

      case "playoff-game":
        addPlayoffGame(Number(button.dataset.round), button.dataset.series);
        break;

      case "toggle-training": {
        const training = state.trainings.find(item => item.id === id);
        if (training) {
          training.completed = !training.completed;
          saveState();
          renderPage();
        }
        break;
      }

      case "final-ratings":
        openFinalRatings();
        break;

      case "export-data":
        exportData();
        break;

      case "import-data":
        $("#importFile").click();
        break;

      case "reset-data":
        resetData();
        break;
    }
  }

  document.addEventListener("click", event => {
    const navButton = event.target.closest("[data-page]");

    if (navButton) {
      event.preventDefault();
      navigate(navButton.dataset.page);
      return;
    }

    const actionButton = event.target.closest("[data-action]");

    if (actionButton) {
      handleAction(actionButton);
    }
  });

  document.addEventListener("input", event => {
    if (event.target.id === "refereeSearch") {
      const cursorPosition = event.target.selectionStart;

      selectionSearch = event.target.value;
      renderPage();

      const newInput = $("#refereeSearch");

      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(cursorPosition, cursorPosition);
      }
    }
  });

  document.addEventListener("change", event => {
    if (event.target.id === "regionFilter") {
      selectionRegion = event.target.value;
      renderPage();
    }

    if (event.target.id === "qualityFilter") {
      selectionQuality = event.target.value;
      renderPage();
    }

    if (event.target.id === "calendarGroupFilter" || event.target.id === "calendarStatusFilter") {
      const group = $("#calendarGroupFilter")?.value || "all";
      const status = $("#calendarStatusFilter")?.value || "all";

      $$(".calendar-match").forEach(row => {
        const groupMatch = group === "all" || row.dataset.group === group;
        const statusMatch = status === "all" || row.dataset.status === status;

        row.style.display = groupMatch && statusMatch ? "" : "none";
      });

      $$(".calendar-day").forEach(day => {
        const visible = $$(".calendar-match", day).some(row => row.style.display !== "none");
        day.style.display = visible ? "" : "none";
      });
    }

    if (event.target.id === "importFile") {
      importData(event.target.files?.[0]);
      event.target.value = "";
    }
  });

  document.addEventListener("submit", event => {
    if (event.target.id === "trainingForm") {
      event.preventDefault();
      addTraining(new FormData(event.target));
    }
  });

  $("#mobileMenu")?.addEventListener("click", () => {
    $("#sidebar").classList.toggle("open");
  });

  $("#modalBackdrop")?.addEventListener("click", event => {
    if (event.target.id === "modalBackdrop") {
      closeModal();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeModal();
      $("#sidebar").classList.remove("open");
    }
  });

  /* =====================================================
     INITIALIZATION
  ===================================================== */

  function initialize() {
    const today = new Date();

    $("#todayLabel").textContent =
      `${today.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }).toUpperCase()} · СОЧИ`;

    state.referees.forEach(ref => {
      ref.matchHistory ||= [];
      ref.individualTrainings ||= [];
    });

    if (!Array.isArray(state.selectedLinesmen)) state.selectedLinesmen = [];
    if (!Array.isArray(state.selectedReferees)) state.selectedReferees = [];
    if (!Array.isArray(state.matches)) state.matches = [];
    if (!Array.isArray(state.reports)) state.reports = [];
    if (!Array.isArray(state.trainings)) state.trainings = [];
    if (!Array.isArray(state.activity)) state.activity = [];

    state.referees.forEach(ref => {
      ref.selected =
        state.selectedLinesmen.includes(ref.id) ||
        state.selectedReferees.includes(ref.id);
    });

    saveState();
    navigate("dashboard");
  }

  initialize();

})();
