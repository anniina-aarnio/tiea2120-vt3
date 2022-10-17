"use strict";  // pidä tämä ensimmäisenä rivinä
//@ts-check

/* // Alustetaan data, joka on jokaisella sivun latauskerralla erilainen.
// tallennetaan data selaimen localStorageen, josta sitä käytetään seuraavilla
// sivun latauskerroilla. Datan voi resetoida lisäämällä sivun osoitteeseen
// ?reset=1
// jolloin uusi data ladataan palvelimelta
// Tätä saa tarvittaessa lisäviritellä */
function alustus() {
     // luetaan sivun osoitteesta mahdollinen reset-parametri
     // https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams
     const params = new window.URLSearchParams(window.location.search);
     let reset = params.get("reset");
     let data;
     if ( !reset  ) {
       try {
          // luetaan vanha data localStoragesta ja muutetaan merkkijonosta tietorakenteeksi
          // https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
          data = JSON.parse(localStorage.getItem("TIEA2120-vt3-2022s"));
       }
       catch(e) {
         console.log("vanhaa dataa ei ole tallennettu tai tallennusrakenne on rikki", data, e);
       }
       if (data) {
               console.log("Käytetään vanhaa dataa");
	       start( data );
               return;
           }
     }
     // poistetaan sivun osoitteesta ?reset=1, jotta ei koko ajan lataa uutta dataa
     // manipuloidaan samalla selaimen selainhistoriaa
     // https://developer.mozilla.org/en-US/docs/Web/API/History/pushState
     history.pushState({"foo":"bar"}, "VT3", window.location.href.replace("?reset="+reset, ""));
     // ladataan asynkronisesti uusi, jos reset =! null tai tallennettua dataa ei ole
     // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
	fetch('https://appro.mit.jyu.fi/cgi-bin/tiea2120/randomize_json.cgi')
	    .then(response => response.json())
	    .then(function(data) {
               console.log("Ladattiin uusi data", data);
               // tallennetaan data localStorageen. Täytyy muuttaa merkkijonoksi
	       // https://developer.mozilla.org/en-US/docs/Web/API/Storage/setItem
	       localStorage.setItem("TIEA2120-vt3-2022s", JSON.stringify(data));
 	       start( data );
	    }
  	    );
}

// oma sovelluskoodi voidaan sijoittaa tähän funktioon
function start(data) {
  // tänne oma koodi
  console.log(data);
/* tallenna data sen mahdollisten muutosten jälkeen aina localStorageen. 
   localStorage.setItem("TIEA2120-vt3-2022s", JSON.stringify(data));
   kts ylempää mallia
   varmista, että sovellus toimii oikein omien tallennusten jälkeenkin
   eli näyttää sivun uudelleen lataamisen jälkeen edelliset lisäykset ja muutokset
   resetoi rakenne tarvittaessa lisäämällä sivun osoitteen perään ?reset=1
   esim. http://users.jyu.fi/~omatunnus/TIEA2120/vt2/pohja.xhtml?reset=1 */

  // ------ DATAN PYÖRITTELY ------
  // Joukkueen nimet mappiin aakkosjärjestykseen
  let joukkueennimetIsolla = new Set();
  for (let joukkue of Array.from(data.joukkueet).sort(nimiJarjestys)) {
    joukkueennimetIsolla.add(joukkue.nimi.trim().toUpperCase());
  }

  // ------ JOUKKUELISTAUS ALAS ------
  luoJoukkuelista();
  

  // ------ FORMIN PYÖRITTELY ------
  // Joukkueen nimen käsittely
  let jnimiInput = document.querySelector('input[id="joukkueen_nimi"]');
  jnimiInput.addEventListener("input", function(e) {
    let jnimi = e.target.value.trim().toUpperCase();
    if (joukkueennimetIsolla.has(jnimi)) {
      jnimiInput.setCustomValidity("Nimi on jo käytössä, valitse toinen nimi");
    } else {
      jnimiInput.setCustomValidity("");
    }
  });

  // Sarjojen tiedot joukkuekyselyyn
  let aakkossarjat = Array.from(data.sarjat).sort((a, b) => {
    if (a.nimi.trim() < b.nimi.trim()) {
      return -1;
    } else if (b.nimi.trim() < a.nimi.trim()) {
      return 1;
    } else {
      return 0;
    }
  });
  for (let sarja of aakkossarjat) {
    let labeli = document.createElement("label");
    labeli.textContent = sarja.nimi;
    let radioinput = document.createElement("input");
    radioinput.setAttribute("type", "radio");
    radioinput.setAttribute("name", "sarjaradio");
    document.querySelector('span[id="sarjaradiopaikka"]')
      .appendChild(labeli).appendChild(radioinput);
  }
  // asetetaan ensimmäiseen radionappiin checked
  document.querySelector('input[type="radio"]').setAttribute("checked", "checked");

  // Jäsenien tietojen hallinnointi
  let jaseninputit = document.querySelectorAll('input[name^="jasen"]');
  kaikkiJasenetTyhjiaTsekkausMuutoksineen();
  for (let inputti of jaseninputit) {
    inputti.addEventListener("input", muutoksetJaseneen);
  }

  /**
   * Luo jäseninputteihin tarkistuksia,
   * kun on tehty jonkinlainen muutos
   * Jos on pelkkiä whitespce-merkkejä,
   * lisää customvalidityn "Anna nimi kirjaimin"
   * Lisäksi tarkistaa, onko kaikki jäsenet tyhjiä muutoksen jälkeen
   * kaikkiJasenetTyhjiaTsekkausMuutoksineen avulla
   * @param {Event} e 
   */
  function muutoksetJaseneen(e) {
    let inputti = e.target;
    if (inputti.validity.patternMismatch) {
      inputti.setCustomValidity("Anna nimi kirjaimin");
    } else {
      inputti.setCustomValidity("");
    }
    kaikkiJasenetTyhjiaTsekkausMuutoksineen();
  }

  /**
   * Tarkistaa, onko kaikki jäsenet tyhjiä
   * Jos on tyhjiä, lisää kaikkiin "Joukkueella on oltava vähintään yksi jäsen"
   * custom validityyn
   * Jos on vähintään yksi ei-tyhjä, poistaa custom-validityt
   */
  function kaikkiJasenetTyhjiaTsekkausMuutoksineen() {
    let jokinEiTyhja = false;
    for (let inputti of jaseninputit) {
      // jos ei tyhjä (eli edes whitespacea...)
      if (inputti.value != "") {
        jokinEiTyhja = true;
      }
    }
    if (jokinEiTyhja) {
      for (let inputti of jaseninputit) {
        inputti.setCustomValidity("");
      }
    } else {
      for (let inputti of jaseninputit) {
        inputti.setCustomValidity("Joukkueella on oltava vähintään yksi jäsen");
      }
    }
  }

/*   // Tallennusyritys nappia painamalla, ei välttämättä submit-tapahtuma (?)
  document.querySelector('input[type="submit"]').addEventListener("click", function (e) {
    tarkistaJasenet();
  }); */

  // Submit-tapahtuma
  document.forms.joukkuelomake.addEventListener("submit", function(e) {
    e.preventDefault();
    // kokonaistarkistus
    document.forms.joukkuelomake.reportValidity();

    // jos kaikki kunnossa, lisäys dataan ja joukkueennimiin
    // etsitään valittu sarja ja sen perusteella oikea id datasta
    let sarjannimi = "";
    for (let elem of document.forms.joukkuelomake.joukkuekysely.elements) {
      if (elem.checked) {
        sarjannimi = elem.parentElement.textContent;
        break;
      } 
    }
    let sarjanid = "";
    for (let sarja of data.sarjat) {
      if (sarja.nimi == sarjannimi) {
        sarjanid = sarja.id;
        break;
      }
    }

    // lisättävän joukkueen tiedot
    let uusijoukkue = {
      "aika": "00:00:00",
      "jasenet": tarkistaJasenet(),
      "leimaustapa": ["0"],
      "matka": "0",
      "nimi": jnimiInput.value,
      "pisteet": "0",
      "rastileimaukset": [],
      "sarja": sarjanid
    };

    // joukkueen lisäys dataan, joukkueennimiin ja datan päivitys localstorageen
    data.joukkueet.push(uusijoukkue);
    joukkueennimetIsolla.add(jnimiInput.value.trim().toUpperCase());
    localStorage.setItem("TIEA2120-vt3-2022s", JSON.stringify(data));

    // formin tyhjennys alkuperäiseen muotoon
    document.forms.joukkuelomake.reset();
    console.log(data.joukkueet);

    // joukkuelistan päivittäminen
    tyhjennaJoukkuelista();
    luoJoukkuelista();
  });

  /**
   * Tarkistaa jäsenkyselystä kenttien validityt:
   * - jos annettu nimi on tyhjä tai siinä on muu virhe,
   * lisää "Joukkueella on oltava vähintään yksi jäsen" ja palauttaa false
   * - jos annettuja (sopivia) nimiä on vähintään yksi, palauttaa true
   * @returns {Array} jos jäseniä, jäsenien nimien lista, jos ei jäseniä, undefined
   */
  function tarkistaJasenet() {
    let jasenlista = new Set();
    for (let jasen of jaseninputit) {
      // jos tyhjä tai validity on false
      let annettunimi = jasen.value.trim();
      if (annettunimi == "" || jasen.checkValidity() == false) {
        
      } else {
        jasenlista.add(jasen.value.trim());
      }
    }
    if (jasenlista.size > 0) {
      return Array.from(jasenlista);
    } else {
      for (let jasen of jaseninputit) {
        jasen.setCustomValidity("Joukkueella on oltava vähintään yksi jäsen");
      }
      return undefined;
    }
  }

  function tyhjennaJoukkuelista() {
    let emolista = document.getElementById("joukkuelista");
    while (emolista.firstChild) {
      emolista.firstChild.remove();
    }
  }

  function luoJoukkuelista() {
    let emolista = document.getElementById("joukkuelista");
    for (let joukkue of Array.from(data.joukkueet).sort(nimiJarjestys)) {

      // joukkueen nimi ja sarja boldattuna
      let li = document.createElement("li");
      li.textContent = joukkue.nimi + " ";
      
      let sarja = document.createElement("strong");
      for (let s of data.sarjat) {
        if (s.id == joukkue.sarja) {
          sarja.textContent = s.nimi;
          break;
        }
      }
      li.appendChild(sarja);

      // jäsenien lisääminen alalistaksi
      let alaul = document.createElement("ul");
      if (typeof(joukkue.jasenet) === "string") {
        let alali = document.createElement("li");
        alali.textContent = joukkue.jasenet;
        alaul.appendChild(alali);
      } else {
        for (let jasen of Array.from(joukkue.jasenet).sort(jasenJarjestys)) {
          let alali = document.createElement("li");
          alali.textContent = jasen;
          alaul.appendChild(alali);
        }
      }

      // nimi + boldattu sarja ja alalista lisätään emolistaan
      emolista.appendChild(li).appendChild(alaul);
    }
  }
}

/**
 * Järjestysfunktio objektille, jolla on nimi
 * objekti.nimi :ssä
 * @param {Object} a 
 * @param {Object} b 
 * @return {Number} -1 jos a ennen b, 1 jos b ennen a, 0 jos samat
 */
function nimiJarjestys(a,b) {
  if (a.nimi.toUpperCase() < b.nimi.toUpperCase()) {
    return -1;
  }
  if (b.nimi.toUpperCase() < a.nimi.toUpperCase()) {
    return 1;
  }
  return 0;
}

/**
 * Jäsenen nimien vertailu
 * @param {String} a 
 * @param {String} b
 * @return {Number} -1 jos a on ennen b, 1 jos b on ennen a, 0 jos samat
 */
function jasenJarjestys(a,b) {
  if (a.toUpperCase() < b.toUpperCase()) {
    return -1;
  }
  if (b.toUpperCase() < a.toUpperCase()) {
    return 1;
  }
  return 0;
}

window.addEventListener("load", alustus);
