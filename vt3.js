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
  // Joukkueen nimet settiin aakkosjärjestykseen
  let joukkueennimetIsolla = new Set();
  for (let joukkue of Array.from(data.joukkueet).sort(nimiJarjestys)) {
    joukkueennimetIsolla.add(joukkue.nimi.trim().toUpperCase());
  }

  // ------ JOUKKUELISTAUS ALAS ------
  luoJoukkuelista();
  let leimaustapaSet = new Set();

  // ------ LEIMAUSTAPAFORMIN PYÖRITTELY ------
  let leimaustavatIsolla = new Set();
  for (let lt of Array.from(data.leimaustavat).sort()) {
    leimaustavatIsolla.add(lt.trim().toUpperCase());
  }
  let ltNimiInput = document.forms.leimaustapalomake.leimaustapa_nimi;
  ltNimiInput.addEventListener("input", function(e) {
    let nimi = ltNimiInput.value.trim().toUpperCase();
    if (leimaustavatIsolla.has(nimi)) {
      ltNimiInput.setCustomValidity("Nimi on jo käytössä");
    } else {
      ltNimiInput.setCustomValidity("");
    }
  });

  document.forms.leimaustapalomake.addEventListener("submit", leimaustapaTallennus);

  /**
   * Tarkistaa leimaustavan oikeellisuuden:
   * - vähintään 2 merkkiä (jotka ei ole whitespacea)
   * - uniikki
   * @param {Event} e 
   */
  function leimaustapaTallennus(e) {
    e.preventDefault();
    // jos kaikki kunnossa
    if (document.forms.leimaustapalomake.reportValidity()) {
      // tallenna leimaustapoihin
      data.leimaustavat.push(ltNimiInput.value.trim());
      leimaustavatIsolla.add(ltNimiInput.value.trim().toUpperCase());

      // tallenna data
      localStorage.setItem("TIEA2120-vt3-2022s", JSON.stringify(data));

      // tyhjennä tämä formi
      document.forms.leimaustapalomake.reset();

      // täydennä joukkueformiin tieto
      uusiLeimaustapakysely();
    }
  }

  function uusiLeimaustapakysely() {
    // tyhjennetään leimaustavat
    for (let input of document.forms.joukkuelomake.querySelectorAll('input[type="checkbox"]')) {
      input.parentNode.remove();
    }

    taytaLeimaustavatJoukkuekyselyyn();
  }


  // ------ JOUKKUEFORMIN PYÖRITTELY ------

  // Tallennusnappiin tieto, onko kyseessä uusi joukkue (null) vai muokattava joukkue (joukkueen viite)
  let tallennusnappi = document.forms.joukkuelomake.tallenna_joukkue;
  tallennusnappi.joukkue = null;

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

  // Leimaustapojen tiedot joukkuekyselyyn
  taytaLeimaustavatJoukkuekyselyyn();

  /**
   * Täyttää joukkuelomakkeessa leimaustavat
   */
  function taytaLeimaustavatJoukkuekyselyyn() {
    let aakkosleimaustavat = Array.from(data.leimaustavat).sort(merkkijonoJarjestys);
    for (let leimaustapa of aakkosleimaustavat) {
      let labeli = document.createElement("label");
      labeli.textContent = leimaustapa;
      let checkboxinput = document.createElement("input");
      checkboxinput.setAttribute("type", "checkbox");
      let indeksi;
      for (let i = 0; i < data.leimaustavat.length; i++) {
        if (data.leimaustavat[i] == leimaustapa) {
          indeksi = String(i);
          break;
        }
      }
      checkboxinput.value = indeksi;
      checkboxinput.addEventListener("change", lisaaSettiin);
      document.querySelector('span[id="leimaustapapaikka"]')
        .appendChild(labeli).appendChild(checkboxinput);
    }
    asetaValiditytJokaiseenCheckboxiin();
  }


  /**
   * Jos change-tapahtumassa valittiin uusi leimaustapa,
   * lisää valitun leimaustapaSetiin ja poistaa validity-huomautukset
   * Jos poistaa leimaustavan, tarkistaa pitääkö lisätä validity-huomautukset
   * kaikkiin ja lisää jos tarvitsee.
   * @param {Event} e checkattu/uncheckattu checkbox
   */
  function lisaaSettiin(e) {
    let leimaust = e.target;
    if (leimaust.checked) {
        leimaustapaSet.add(leimaust.value);
    } else {
        leimaustapaSet.delete(leimaust.value);
    }

    asetaValiditytJokaiseenCheckboxiin();
  }

  /**
   * Tarkistaa checkboxit:
   * - jos edes yksi on valittuna, poistaa customvalidityt kaikista checkboxeista
   * - jos ei yhtään ole valittuna, lisää kaikkiin checkboxeihin customvalidityn
   */
  function asetaValiditytJokaiseenCheckboxiin() {
    if (leimaustapaSet.size > 0) {
        for (let input of document.querySelectorAll('input[type="checkbox"]')) {
            input.setCustomValidity("");
        }
    } else {
        for (let input of document.querySelectorAll('input[type="checkbox"]')) {
            input.setCustomValidity("Valitse vähintään yksi kurssi");
        }
    }
  }

  // Sarjojen tiedot joukkuekyselyyn
  let aakkossarjat = Array.from(data.sarjat).sort(nimiJarjestys);
  for (let sarja of aakkossarjat) {
    let labeli = document.createElement("label");
    labeli.textContent = sarja.nimi;
    let radioinput = document.createElement("input");
    radioinput.setAttribute("type", "radio");
    radioinput.setAttribute("name", "sarjaradio");
    radioinput.value = sarja.id;
    document.querySelector('span[id="sarjaradiopaikka"]')
      .appendChild(labeli).appendChild(radioinput);
  }
  // asetetaan ensimmäiseen radionappiin checked
  document.querySelector('input[type="radio"]').setAttribute("checked", "checked");


  // Jäsenien tietojen hallinnointi
  let jaseninputit = document.querySelectorAll('input[name^="jasen"]');
  kaikkiJasenetTyhjiaJaUniikkejaTsekkausMuutoksineen();
  for (let inputti of jaseninputit) {
    inputti.addEventListener("input", muutoksetJaseneen);
  }

  /**
   * Lisää ja poistaa jäsenkenttiä siten,
   * että on aina yksi tyhjä jäsenkenttä.
   * Luo jäseninputteihin tarkistuksia,
   * kun on tehty jonkinlainen muutos
   * Jos on pelkkiä whitespce-merkkejä,
   * lisää customvalidityn "Anna nimi kirjaimin"
   * Lisäksi tarkistaa, onko kaikki jäsenet tyhjiä muutoksen jälkeen
   * kaikkiJasenetTyhjiaTsekkausMuutoksineen avulla
   * @param {Event} e 
   */
  function muutoksetJaseneen(e) {
    // lisää ja poistaa jäsenkenttiä siten, että on yksi tyhjä jäsenkenttä
    let tyhja = false;

    // onko tämä dynaaminen ?? tarvitaanko täälläkin vaikka jo kerran funktion ulkopuolella?
    jaseninputit = document.forms.joukkuelomake.jasenkysely.getElementsByTagName("input");
    for (let i = jaseninputit.length-1; i >= 0; i--) {
      let input = jaseninputit[i];
      
      // jos tyhjä ja on jo aiemmin löydetty tyhjä niin poistetaan
      if (input.value.trim() == "" && tyhja) {
        // jasenlabel + input poistetaan
        jaseninputit[i].parentNode.remove();
      }

      // onko tyhjä?
      if (input.value.trim() == "") {
        tyhja = true;
      }
    }

    // jos ei ollut tyhjiä kenttiä niin lisätään yksi
    // tai jos jaseninput lyheni vain yhteen
    if (!tyhja || jaseninputit.length < 2) {
      let label = document.createElement("label");
      label.textContent = "Jäsen";
      let input = document.createElement("input");
      input.setAttribute("type", "text");
      input.setAttribute("pattern", ".*\\S+.*\\S+.*");
      input.addEventListener("input", muutoksetJaseneen);
      document.forms["joukkuelomake"]["jasenkysely"].appendChild(label).appendChild(input);
    }

    // tehdään jäsenille numerointi
    for (let i= 0; i < jaseninputit.length; i++) {
      let label = jaseninputit[i].parentNode;
      label.firstChild.nodeValue = "Jäsen " + (i+1);
    }

    // validitypuoli
    let inputti = e.target;
    if (inputti.validity.patternMismatch) {
      inputti.setCustomValidity("Anna nimi kirjaimin");
    } else {
      inputti.setCustomValidity("");
    }
    kaikkiJasenetTyhjiaJaUniikkejaTsekkausMuutoksineen();
  }

  /**
   * Tarkistaa, onko kaikki jäsenet tyhjiä
   * Jos on tyhjiä, lisää kaikkiin "Joukkueella on oltava vähintään kaksi jäsentä"
   * custom validityyn
   * Jos on vähintään kaksi ei-tyhjää, poistaa custom-validityt
   */
  function kaikkiJasenetTyhjiaJaUniikkejaTsekkausMuutoksineen() {
    let eiTyhjia = 0;

    for (let inputti of jaseninputit) {
      // jos ei tyhjä (eli edes whitespacea...)
      if (inputti.value != "") {
        eiTyhjia += 1;
      }
    }
    if (eiTyhjia >= 2) {
      for (let inputti of jaseninputit) {
        inputti.setCustomValidity("");
      }
    } else {
      for (let inputti of jaseninputit) {
        inputti.setCustomValidity("Joukkueella on oltava vähintään kaksi jäsentä");
      }
    }
  }

  /**
   * Täyttää klikatun joukkueen tiedot lomakkeeseen
   * @param {*} joukkue viite joukkueen dataan, jolloin joukkuetta helpompi muokata 
   */
  function muokkaaJoukkuetta(joukkue) {
    // lisätään olemassaolevat tiedot joukkueeseen
    let formi = document.forms.joukkuelomake;

    // joukkueen nimi 
    formi.joukkueen_nimi.value = joukkue.nimi;
    
    // etsitään valituksi leimaustavat
    leimaustapaSet.clear();
    for (let leima of formi.querySelectorAll('input[type="checkbox"]')) {
      for (let nro of joukkue.leimaustapa) {
        if (leima.value === nro || leimaustapaSet.has(leima.value)) {
          leimaustapaSet.add(nro);
          leima.checked = true;
        } 
      }
    }
    asetaValiditytJokaiseenCheckboxiin();

    // sarja
    for (let s of formi.querySelectorAll('input[name="sarjaradio"]')) {
      if (s.value == joukkue.sarja) {
        s.setAttribute("checked", "checked");
      } else {
        s.removeAttribute("checked");
      }
    }

    // tyhjennetään edelliset jäsenet
    // lisätään joukkueen jäsenet ja yksi tyhjä
    let jasenkysely = formi.jasenkysely;
    for (let i = jasenkysely.elements.length-1; i >= 0; i--) {
      let input = jasenkysely.elements[i];
      input.parentNode.remove();
    }
    // jäseninputteja vähintään 2 tai sitten jäsenien lukumäärä + 1
    let jasenia = Math.max(joukkue.jasenet.length, (2-1));
    for (let i = 0; i <= jasenia; i++) {
      let label = document.createElement("label");
      label.textContent = "Jäsen " + (i+1);
      let input = document.createElement("input");
      input.setAttribute("type", "text");
      input.setAttribute("pattern", ".*\\S+.*");
      if (jasenia < 2) {
        input.setCustomValidity("Joukkueella on oltava vähintään kaksi jäsentä");
      }
      input.addEventListener("input", muutoksetJaseneen);
      let jasen = joukkue.jasenet[i];
      if (jasen) {
        input.value = jasen;
      } else {
        input.value = "";
      }
      document.forms["joukkuelomake"]["jasenkysely"].appendChild(label).appendChild(input);
    }

    tallennusnappi.joukkue = joukkue;
  }

  // Submit-tapahtuma
  document.forms.joukkuelomake.addEventListener("submit", tallennusTapahtuma);

  /**
   * Tallennustapahtuma, jossa tarkistetaan lomakkeen validityt
   * Jos kaikki ok:
   * - lisätään joukkueen tiedot dataan
   * - tyhjennetään lomake
   * Jos jotain vialla, palataan
   * @param {Event} e 
   * @returns palaaminen, jos jokin validityistä hajoilee
   */
  function tallennusTapahtuma(e) {
    e.preventDefault();
    let lisattavatjasenet = tarkistaJasenet();
    // kokonaistarkistus
    let ok = document.forms.joukkuelomake.reportValidity();

    if (!ok) {
      return;
    }
    // jos kaikki kunnossa, lisäys dataan ja joukkueennimiin
    // etsitään valittu sarja ja sen perusteella oikea id datasta
    let sarjanid = document.forms.joukkuelomake.querySelector('input[name="sarjaradio"]:checked').value;

    // etsitään valitut leimaustavat ja sen perusteella oikea
    let uudenJoukkueenLeimaustavat = [];
    for (let lt of document.forms.joukkuelomake.querySelectorAll('input[type="checkbox"]:checked')) {
      uudenJoukkueenLeimaustavat.push(lt.value);
    }

    // jos joukkue on muokattava joukkue
    if (tallennusnappi.joukkue != null) {
      // poistetaan vanha nimi setistä ja lisätään uusi
      let joukkueennimiIsolla = tallennusnappi.joukkue.nimi.trim().toUpperCase();
      joukkueennimetIsolla.delete(joukkueennimiIsolla);

      let muokattavaJoukkue;
      for (let joukkue of data.joukkueet) {
        if (joukkue == tallennusnappi.joukkue) {
          muokattavaJoukkue = joukkue;
          break;
        }
      }
      muokattavaJoukkue.jasenet = lisattavatjasenet;
      muokattavaJoukkue.leimaustapa = uudenJoukkueenLeimaustavat;
      muokattavaJoukkue.nimi = jnimiInput.value;
      muokattavaJoukkue.sarja = sarjanid;
    } else {
      // lisättävän joukkueen tiedot
      let uusijoukkue = {
        "aika": "00:00:00",
        "jasenet": lisattavatjasenet,
        "leimaustapa": uudenJoukkueenLeimaustavat,
        "matka": "0",
        "nimi": jnimiInput.value,
        "pisteet": "0",
        "rastileimaukset": [],
        "sarja": sarjanid
      };
      // uuden joukkueen lisäys dataan
      data.joukkueet.push(uusijoukkue);
    }

    // joukkueen lisäys joukkueennimiin ja datan päivitys localstorageen
    joukkueennimetIsolla.add(jnimiInput.value.trim().toUpperCase());
    localStorage.setItem("TIEA2120-vt3-2022s", JSON.stringify(data));

    // formin tyhjennys alkuperäiseen muotoon
    document.forms.joukkuelomake.reset();
    leimaustavatkinTyhjaksi();
    tallennusnappi.joukkue = null;
    forminJasenetJaValiditytResetissäUusiksi();

    console.log(data.joukkueet);

    // joukkuelistan päivittäminen
    tyhjennaJoukkuelista();
    luoJoukkuelista();
  }

  function leimaustavatkinTyhjaksi() {
    leimaustapaSet.clear();
    for (let lt of document.forms.joukkuelomake.querySelectorAll('input[type="checkbox"]')) {
      lt.removeAttribute("checked");
    }
  }

  function forminJasenetJaValiditytResetissäUusiksi() {
    // leimaustapoihin validityt
    leimaustapaSet.clear();
    asetaValiditytJokaiseenCheckboxiin();

    // jäsenet uusiksi
    let jasenkysely = document.forms.joukkuelomake.jasenkysely;
    for (let i = jasenkysely.elements.length-1; i >= 0; i--) {
      let input = jasenkysely.elements[i];
      input.parentNode.remove();
    }
    for (let i = 1; i <= 2; i++) {
      let label = document.createElement("label");
      label.textContent = "Jäsen " + i;
      let input = document.createElement("input");
      input.setAttribute("type", "text");
      input.setAttribute("pattern", ".*\\S+.*");
      input.setCustomValidity("Joukkueella on oltava vähintään kaksi jäsentä");
      input.addEventListener("input", muutoksetJaseneen);
      document.forms["joukkuelomake"]["jasenkysely"].appendChild(label).appendChild(input);
    }
  }

  /**
   * Tarkistaa jäsenkyselystä kenttien validityt:
   * - jos kaksi samaa nimeä, lisää kaikkiin "Ei voi olla kahta samaa nimeä" ja palauttaa undefined
   * - jos annettu nimi on tyhjä tai siinä on muu virhe,
   * lisää "Joukkueella on oltava vähintään yksi jäsen" ja palauttaa undefined
   * - jos annettuja (sopivia) nimiä on vähintään yksi, palauttaa palautettavaArray
   * @returns {Array} jos jäseniä ja kaikki ok, jäsenien nimien lista, jos ei jäseniä, undefined
   */
  function tarkistaJasenet() {
    let jasenlista = new Set();
    let palautettavaArray = [];
    for (let jasen of jaseninputit) {
      // jos tyhjä tai validity on false
      let annettunimi = jasen.value.trim().toUpperCase();
      if (annettunimi == "" || jasen.checkValidity() == false) {

      } else {
        if (jasenlista.has(annettunimi)) {
          jasen.setCustomValidity("Ei voi olla kahta samaa nimeä");
          return undefined;
        } else {
          jasenlista.add(annettunimi);
          palautettavaArray.push(jasen.value.trim());
        }
      }
    }

    if (jasenlista.size <= 1) {
      for (let jasen of jaseninputit) {
        jasen.setCustomValidity("Joukkueella on oltava vähintään kaksi jäsentä");
      }
      return palautettavaArray; // ennen palautettu undefined 
    }
    return palautettavaArray;
  }

  /**
   * Tyhjentää kaikki listat ja alalistat joukkuelistasta
   * sivun alareunasta
   */
  function tyhjennaJoukkuelista() {
    let emolista = document.getElementById("joukkuelista");
    while (emolista.firstChild) {
      emolista.firstChild.remove();
    }
  }

  /**
   * Luo tyhjälle paikalle uuden joukkuelistan datassa olevien joukkueiden perusteella
   */
  function luoJoukkuelista() {
    let emolista = document.getElementById("joukkuelista");
    for (let joukkue of Array.from(data.joukkueet).sort(nimiJarjestys)) {

      // joukkueen nimi ja sarja boldattuna
      let li = document.createElement("li");
      let joukkuenimi = document.createElement("a");
      joukkuenimi.setAttribute("href", "#joukkueenlisaysOtsikko");
      joukkuenimi.setAttribute("class", "joukkueennimi");
      joukkuenimi.addEventListener("click", (e) => muokkaaJoukkuetta(joukkue));
      joukkuenimi.textContent = joukkue.nimi;
      li.appendChild(joukkuenimi);
      
      let sarja = document.createElement("strong");
      for (let s of data.sarjat) {
        if (s.id == joukkue.sarja) {
          sarja.textContent = " " + s.nimi;
          break;
        }
      }
      li.appendChild(sarja);

      // perään leimaustavat listana esim: (GPS, NFC)
      let leimausteksti = " (";
      let leimaustapanimilista = [];
      for (let lt of joukkue.leimaustapa) {
        leimaustapanimilista.push(data.leimaustavat[Number(lt)]);
      }
      let leimaustekstit = leimaustapanimilista.join(', ');
      leimausteksti += leimaustekstit +")";
      li.appendChild(document.createTextNode(leimausteksti));

      // jäsenien lisääminen alalistaksi
      let alaul = document.createElement("ul");
      for (let jasen of Array.from(joukkue.jasenet).sort(merkkijonoJarjestys)) {
          let alali = document.createElement("li");
          alali.textContent = jasen;
          alaul.appendChild(alali);
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
function merkkijonoJarjestys(a,b) {
  if (a.toUpperCase() < b.toUpperCase()) {
    return -1;
  }
  if (b.toUpperCase() < a.toUpperCase()) {
    return 1;
  }
  return 0;
}

window.addEventListener("load", alustus);
