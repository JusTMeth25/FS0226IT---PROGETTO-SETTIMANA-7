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
      new Squadra(
        t.idTeam,
        t.strTeam,
        t.strTeamBadge,
        t.strLeague,
        t.strCountry,
      ),
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
    ultimi: (dataLast.events || []).map(
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






// === Eventi ===
