// SportsHub — Week Project Settimana VII
//
// Devi fare 4 cose per la Versione Base:
// 1. Definire le classi Squadra ed Evento (mappano i dati di TheSportsDB)
// 2. Funzione async cercaSquadre(query) che chiama /searchteams.php
// 3. Funzione async caricaDettagli(idTeam) che chiama in parallelo
//    eventsnext.php + eventslast.php usando Promise.all
// 4. Render dinamico: card squadre, lista prossimi eventi, lista risultati
//
// Endpoint base: https://www.thesportsdb.com/api/v1/json/3/
// Il `3` nell'URL è la chiave API pubblica di test di TheSportsDB: gratis, non serve registrarsi.
//
// Per le versioni Intermedia/Avanzata: localStorage preferiti, debounce, Promise.all multi.
const API_BASE = "https://www.thesportsdb.com/api/v1/json/3/";

// === Classi ===
class Squadra {
  constructor(id, nome, logo, lega, paese, sport) {
    this.id = id;
    this.nome = nome;
    this.logo = logo;
    this.lega = lega;
    this.paese = paese;
    this.sport = sport;
  }
}

// classe Evento che mappa i dati di TheSportsDB
class Evento {
  constructor(id, data, casa, trasferta, punteggioCasa, punteggioTrasferta) {
    this.id = id;
    this.data = data;
    this.casa = casa;
    this.trasferta = trasferta;
    this.punteggioCasa = punteggioCasa;
    this.punteggioTrasferta = punteggioTrasferta;
  }

  // formattare la data in modo leggibile
  getDataFormattata() {
    if (!this.data) return "Data non disponibile";
    try {
      const d = new Date(this.data);
      if (isNaN(d.getTime())) return this.data;
      return d.toLocaleDateString("it-IT");
    } catch {
      return this.data;
    }
  }

  // generare il punteggio formattato
  getPunteggio() {
    if (this.punteggioCasa !== null && this.punteggioTrasferta !== null) {
      return `${this.punteggioCasa} - ${this.punteggioTrasferta}`;
    }
    return "VS";
  }

  // esito ("vittoria" | "pareggio" | "sconfitta") dal punto di vista di nomeSquadra
  // null se la partita non è ancora stata giocata (nessun punteggio)
  getEsito(nomeSquadra) {
    if (this.punteggioCasa === null || this.punteggioTrasferta === null)
      return null;
    if (this.punteggioCasa === this.punteggioTrasferta) return "pareggio";
    const haVintoCasa = this.punteggioCasa > this.punteggioTrasferta;
    const giocaInCasa = this.casa === nomeSquadra;
    const haVinto = giocaInCasa ? haVintoCasa : !haVintoCasa;
    return haVinto ? "vittoria" : "sconfitta";
  }
}

// === API ===

// funzione async cercaSquadre(query) che chiama /searchteams.php
async function cercaSquadre(query, sport = "") {
  let url = `${API_BASE}searchteams.php?t=${query}`;
  if (sport) url += `&s=${sport}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Errore HTTP ${res.status}`);
  const data = await res.json();
  if (!data.teams) return [];
  return data.teams.map(
    (t) =>
      new Squadra(t.idTeam, t.strTeam, t.strBadge, t.strLeague, t.strCountry, t.strSport),
  );
}

// funzione async caricaDettagli(idTeam) che chiama in parallelo
async function caricaDettagli(idTeam) {
  const urlNext = `${API_BASE}eventsnext.php?id=${idTeam}`;
  const urlLast = `${API_BASE}eventslast.php?id=${idTeam}`;

  const [resNext, resLast] = await Promise.all([
    fetch(urlNext),
    fetch(urlLast),
  ]);

  if (!resNext.ok || !resLast.ok)
    throw new Error(`Errore HTTP ${resNext.status} ${resLast.status}`);

  const [dataNext, dataLast] = await Promise.all([
    resNext.json(),
    resLast.json(),
  ]);

  return {
    prossimi: (dataNext.events || []).map(
      (e) =>
        new Evento(
          e.idEvent,
          e.dateEvent || e.strDate || "",
          e.strHomeTeam || "Sconosciuta",
          e.strAwayTeam || "Sconosciuta",
          e.intHomeScore != null ? e.intHomeScore : null,
          e.intAwayScore != null ? e.intAwayScore : null,
        ),
    ),
    ultimi: (dataLast.results || []).map(
      (e) =>
        new Evento(
          e.idEvent,
          e.dateEvent || e.strDate || "",
          e.strHomeTeam || "Sconosciuta",
          e.strAwayTeam || "Sconosciuta",
          e.intHomeScore != null ? e.intHomeScore : null,
          e.intAwayScore != null ? e.intAwayScore : null,
        ),
    ),
  };
}

// === Stato ===

let preferiti = caricaPreferiti();
let squadraSelezionataId =
  localStorage.getItem("sportshub_squadra_selezionata") || null;
let sportSelezionato = "";

function caricaPreferiti() {
  try {
    return JSON.parse(localStorage.getItem("sportshub_preferiti") || "[]");
  } catch {
    return [];
  }
}

function salvaPreferiti() {
  const daSalvare = preferiti.map((p) => ({
    id: p.id,
    nome: p.nome,
    logo: p.logo,
    lega: p.lega,
    paese: p.paese,
    sport: p.sport,
  }));
  localStorage.setItem("sportshub_preferiti", JSON.stringify(daSalvare));
}

// ricorda quale squadra ha i dettagli aperti, così rimangono visibili al refresh
function salvaSquadraSelezionata(id) {
  squadraSelezionataId = id;
  if (id) {
    localStorage.setItem("sportshub_squadra_selezionata", id);
  } else {
    localStorage.removeItem("sportshub_squadra_selezionata");
  }
}

// === Render ===
function $(sel) {
  return document.querySelector(sel);
}

// funzione debounce per ritardo ricerca
function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// funzione creaspinner
function creaSpinner() {
  const div = document.createElement("div");
  div.className = "spinner-container";
  div.innerHTML = `<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Caricamento...</span></div>`;
  return div;
}

// funzione alert in caso di errore nella ricerca
function creaAlert(messaggio, tipo = "danger") {
  const div = document.createElement("div");
  div.className = `alert alert-${tipo} mt-3`;
  div.textContent = messaggio;
  return div;
}

// funzione mostra caricamento alla ricerca
function mostraCaricamento() {
  const container = $("#risultati-content");
  if (!container) return;
  container.innerHTML = "";
  container.appendChild(creaSpinner());
}

// funzione mostra errore (messaggio)
function mostraErrore(messaggio) {
  const container = $("#risultati-content");
  if (!container) return;
  container.innerHTML = "";
  container.appendChild(creaAlert(messaggio));
}

// crea una card evento; se nomeSquadra è fornito, colora il punteggio in base all'esito
function creaCardEvento(evento, nomeSquadra) {
  const card = document.createElement("div");
  card.className = "evento-card";

  const left = document.createElement("div");
  const squadre = document.createElement("div");
  squadre.className = "squadre";
  squadre.textContent = `${evento.casa} VS ${evento.trasferta}`;
  left.appendChild(squadre);

  const info = document.createElement("div");
  info.className = "info";
  info.textContent = evento.getDataFormattata();
  left.appendChild(info);

  card.appendChild(left);

  const punteggio = document.createElement("div");
  const esito = nomeSquadra ? evento.getEsito(nomeSquadra) : null;
  punteggio.className = esito ? `punteggio punteggio-${esito}` : "punteggio";
  punteggio.textContent = evento.getPunteggio();
  card.appendChild(punteggio);

  return card;
}

// mostra prossimi eventi + ultimi risultati di una squadra
async function mostraDettagliSquadra(squadra) {
  const container = $("#dettagli-squadra-content");
  if (!container) return;

  salvaSquadraSelezionata(squadra.id);

  container.innerHTML = "";
  const card = document.createElement("div");
  card.className = "risultato-card fade-in";
  card.innerHTML = `
    <div class="risultato-header">
      <img src="${squadra.logo}" alt="${squadra.nome}" class="badge-img">
      <div class="info">
        <h3>${squadra.nome}</h3>
        <p>${squadra.lega || "Campionato ND"} - ${squadra.paese || ""}</p>
      </div>
    </div>
    <div class="eventi-colonne">
      <div>
        <h4>Prossimi eventi</h4>
        <div class="lista-prossimi"></div>
      </div>
      <div>
        <h4>Ultimi risultati</h4>
        <div class="lista-ultimi"></div>
      </div>
    </div>
  `;
  card.querySelector(".lista-prossimi").appendChild(creaSpinner());
  card.querySelector(".lista-ultimi").appendChild(creaSpinner());
  container.appendChild(card);

  try {
    const { prossimi, ultimi } = await caricaDettagli(squadra.id);
    const prossimiDiv = card.querySelector(".lista-prossimi");
    const ultimiDiv = card.querySelector(".lista-ultimi");

    prossimiDiv.innerHTML = prossimi.length
      ? ""
      : '<p class="empty-message">Nessun evento in programma</p>';
    prossimi.forEach((e) =>
      prossimiDiv.appendChild(creaCardEvento(e, squadra.nome)),
    );

    ultimiDiv.innerHTML = ultimi.length
      ? ""
      : '<p class="empty-message">Nessun risultato disponibile</p>';
    ultimi.forEach((e) =>
      ultimiDiv.appendChild(creaCardEvento(e, squadra.nome)),
    );
  } catch {
    card.querySelector(".lista-prossimi").innerHTML =
      '<p class="empty-message">Errore nel caricamento</p>';
    card.querySelector(".lista-ultimi").innerHTML =
      '<p class="empty-message">Errore nel caricamento</p>';
  }
}

// render squadre trovate: solo card con logo/nome/lega/paese + bottone preferiti
function renderRisultati(squadre) {
  const container = $("#risultati-content");
  if (!container) return;
  container.innerHTML = "";

  if (squadre.length === 0) {
    container.innerHTML = `<p class="empty-message">Nessuna squadra trovata.</p>`;
    return;
  }

  const grid = document.createElement("div");
  grid.className = "grid-card";

  for (const s of squadre) {
    const card = document.createElement("div");
    card.className = "squadra-card fade-in";

    const giaPreferita = preferiti.some((p) => p.id === s.id);

    card.innerHTML = `
      <img src="${s.logo}" alt="${s.nome}" class="badge-img" loading="lazy">
      <div class="card-title">${s.nome}</div>
      <div class="card-subtitle">${s.lega || "Campionato ND"}</div>
      <div class="card-text">${s.paese || ""}</div>
      <button class="btn btn-sm btn-outline-primary preferito-btn" ${giaPreferita ? "disabled" : ""}>
        ${giaPreferita ? "✓ Nei preferiti" : "⭐ Aggiungi ai preferiti"}
      </button>
    `;

    const btn = card.querySelector(".preferito-btn");
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      aggiungiAPreferiti(s);
      btn.disabled = true;
      btn.textContent = "✓ Nei preferiti";
      mostraDettagliSquadra(s);
    });

    grid.appendChild(card);
  }
  container.appendChild(grid);
}

function aggiungiAPreferiti(squadra) {
  if (preferiti.some((p) => p.id === squadra.id)) return;
  preferiti.push({
    id: squadra.id,
    nome: squadra.nome,
    logo: squadra.logo,
    lega: squadra.lega,
    paese: squadra.paese,
    sport: squadra.sport,
  });
  salvaPreferiti();
  renderPreferiti();
}

// render preferiti: card semplice, click sulla card mostra i dettagli sotto "Squadre trovate"
function renderPreferiti() {
  const container = $("#preferiti-content");
  if (!container) return;
  container.innerHTML = "";

  if (preferiti.length === 0) {
    container.innerHTML =
      '<p class="text-secondary mb-4 fst-italic">Non hai ancora salvato nessuna squadra. Cercane una qui sopra e aggiungila ai preferiti.</p>';
    return;
  }

  const preferitiFiltrati = sportSelezionato
    ? preferiti.filter((p) => p.sport === sportSelezionato)
    : preferiti;

  if (preferitiFiltrati.length === 0) {
    container.innerHTML =
      '<p class="empty-message">Nessuna squadra preferita per questo sport.</p>';
    return;
  }

  const grid = document.createElement("div");
  grid.className = "grid-card";

  for (const p of preferitiFiltrati) {
    const card = document.createElement("div");
    card.className = "squadra-card fade-in";
    if (p.id === squadraSelezionataId) card.classList.add("selezionata");

    card.innerHTML = `
      <img src="${p.logo}" alt="${p.nome}" class="badge-img">
      <div class="card-title">${p.nome}</div>
      <div class="card-subtitle">${p.lega || "Campionato ND"}</div>
      <div class="card-text">${p.paese || ""}</div>
      <button class="btn btn-rimuovi-card"><i class="bi bi-trash"></i> Rimuovi</button>
    `;

    card.addEventListener("click", () => mostraDettagliSquadra(p));

    card.querySelector(".btn-rimuovi-card").addEventListener("click", (e) => {
      e.stopPropagation();
      preferiti = preferiti.filter((x) => x.id !== p.id);
      salvaPreferiti();
      if (squadraSelezionataId === p.id) {
        salvaSquadraSelezionata(null);
        const dettagli = $("#dettagli-squadra-content");
        if (dettagli) dettagli.innerHTML = "";
      }
      renderPreferiti();
    });

    grid.appendChild(card);
  }
  container.appendChild(grid);
}

// === Eventi ===

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = $("#searchInput");
  const searchBtn = $("#searchBtn");
  const filtriBtn = document.querySelectorAll(".btn-filtro");

  async function eseguiRicerca() {
    const query = searchInput.value.trim();
    if (!query) return;

    mostraCaricamento();

    try {
      const squadre = await cercaSquadre(query, sportSelezionato);
      renderRisultati(squadre);
    } catch (err) {
      mostraErrore(err.message);
    }
  }

  searchBtn?.addEventListener("click", eseguiRicerca);

  searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      eseguiRicerca();
    }
  });

  const eseguiRicercaDebounce = debounce(eseguiRicerca, 400);

  searchInput?.addEventListener("input", () => {
    const query = searchInput.value.trim();
    if (!query) {
      $("#risultati-content").innerHTML =
        '<p class="text-secondary mb-4 fst-italic">Inizia cercando una squadra qui sopra.</p>';
      return;
    }
    eseguiRicercaDebounce();
  });

  filtriBtn.forEach((btn) => {
    btn.addEventListener("click", () => {
      sportSelezionato = btn.dataset.sport;
      filtriBtn.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // se i dettagli aperti appartengono a una squadra di un altro sport, nascondili
      const squadraAperta = preferiti.find(
        (p) => p.id === squadraSelezionataId,
      );
      if (
        squadraAperta &&
        sportSelezionato &&
        squadraAperta.sport !== sportSelezionato
      ) {
        salvaSquadraSelezionata(null);
        const dettagli = $("#dettagli-squadra-content");
        if (dettagli) dettagli.innerHTML = "";
      }

      renderPreferiti();
      if (searchInput.value.trim()) eseguiRicerca();
    });
  });

  renderPreferiti();

  // se al refresh era aperta una squadra preferita, mostra di nuovo i suoi dettagli
  const preferitaSelezionata = preferiti.find(
    (p) => p.id === squadraSelezionataId,
  );
  if (preferitaSelezionata) {
    mostraDettagliSquadra(preferitaSelezionata);
  }
});
