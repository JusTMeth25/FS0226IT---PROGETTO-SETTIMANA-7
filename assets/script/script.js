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
  constructor(id, nome, logo, lega, paese) {
    this.id = id;
    this.nome = nome;
    this.logo = logo;
    this.lega = lega;
    this.paese = paese;
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
}

// === API ===

// funzione async cercaSquadre(query) che chiama /searchteams.php
async function cercaSquadre(query) {
  const url = `${API_BASE}searchteams.php?t=${query}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Errore HTTP ${res.status}`);
  const data = await res.json();
  if (!data.teams) return [];
  return data.teams.map(
    (t) =>
      new Squadra(t.idTeam, t.strTeam, t.strBadge, t.strLeague, t.strCountry),
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

// === Render ===
function $(sel) {
  return document.querySelector(sel);
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
function mostraErrore(messagio) {
  const container = $("#risultati-content");
  if (!container) return;
  container.innerHTML = "";
  container.appendChild(creaAlert(messaggio));
}

// funzione render squadre
function renderCardSquadre(squadre) {
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
    card.className = "squadra-card";
    card.dataset.id = s.id;

    const logoSrc = s.logo;

    card.innerHTML = `
    <img src="${logoSrc}" alt="${s.nome}" class="badge-img" loading="lazy">
    <div class="card-title">${s.nome}</div>
    <div class="card-subtitle">${s.lega || "Campionato ND"}</div>
    <div class="card-text">${s.paese || ""}</div>
    <button class="btn btn-sm btn-outline-primary dettagli-btn">Dettagli</button>
    `;

    card.querySelector(".dettagli-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      mostraDettagli(s.id, s.nome, logoSrc);
    });

    grid.appendChild(card);
  }
  container.appendChild(grid);
}

// funzione mostra dettagli squadra
async function mostraDettagli(idTeam, nome, logoSrc) {
  const detSection = $("#dettagli-section");
  const detContent = $("#dettagli-content");
  if (!detSection || !detContent) return;

  // nasconde i risultati, mostra i dettagli
  $("#risultati-section").hidden = true;
  detSection.hidden = false;

  // svuota e mostra lo spinner
  detContent.innerHTML = "";
  detContent.appendChild(creaSpinner());

  try {
    const { prossimi, ultimi } = await caricaDettagli(idTeam);
    detContent.innerHTML = "";

    // Intestazione squadra
    const header = document.createElement("div");
    header.className = "squadra-header fade-in";

    const img = document.createElement("img");
    img.src = logoSrc;
    img.alt = nome;
    img.className = "badge-img";
    header.appendChild(img);

    const infoDiv = document.createElement("div");
    infoDiv.className = "info";
    const h2 = document.createElement("h2");
    h2.textContent = nome;
    infoDiv.appendChild(h2);
    header.appendChild(infoDiv);

    detContent.appendChild(header);

    // Prossimi eventi
    const prossimiSection = document.createElement("div");
    prossimiSection.className = "eventi-section fade-in";

    const h3Next = document.createElement("h3");
    h3Next.innerHTML =
      '<i class="bi bi-calendar-event text-primary"></i> Prossimi eventi';
    prossimiSection.appendChild(h3Next);

    if (prossimi.length === 0) {
      const p = document.createElement("p");
      p.className = "empty-message";
      p.textContent = "Nessun evento in programma";
      prossimiSection.appendChild(p);
    } else {
      for (const e of prossimi) {
        prossimiSection.appendChild(creaCardEvento(e));
      }
    }
    detContent.appendChild(prossimiSection);

    // Ultimi risultati
    const ultimiSection = document.createElement("div");
    ultimiSection.className = "eventi-section fade-in mt-4";

    const h3Last = document.createElement("h3");
    h3Last.innerHTML =
      '<i class="bi bi-trophy text-warning"></i> Ultimi risultati';
    ultimiSection.appendChild(h3Last);

    if (ultimi.length === 0) {
      const p = document.createElement("p");
      p.className = "empty-message";
      p.textContent = "Nessun risultato disponibile";
      ultimiSection.appendChild(p);
    } else {
      for (const e of ultimi) {
        ultimiSection.appendChild(creaCardEvento(e));
      }
    }
    detContent.appendChild(ultimiSection);
  } catch (err) {
    detContent.innerHTML = "";
    detContent.appendChild(creaAlert(`Errore nel caricamento: ${err.message}`));
  }
}

// crea una card evento con DOM
function creaCardEvento(evento) {
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
  punteggio.className = "punteggio";
  punteggio.textContent = evento.getPunteggio();
  card.appendChild(punteggio);

  return card;
}

// funzione che nasconde i dettagli e torna ai risultati
function nascondiDettagli() {
  const detSection = $("#dettagli-section");
  const risSection = $("#risultati-section");

  if (detSection) detSection.hidden = true;
  if (risSection) risSection.hidden = false;
}

// === Eventi ===

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = $("#searchInput");
  const searchBtn = $("#searchBtn");
  const tornaBtn = $("#tornaBtn");

  async function eseguiRicerca() {
    const query = searchInput.value.trim();
    if (!query) return;

    mostraCaricamento();

    try {
      const squadre = await cercaSquadre(query);
      renderCardSquadre(squadre);
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

  tornaBtn?.addEventListener("click", nascondiDettagli);
});
