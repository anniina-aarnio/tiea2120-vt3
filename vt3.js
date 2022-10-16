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
  let joukkueennimet = new Map();
  for (let joukkue of Array.from(data.joukkueet).sort((a,b) => {
    if (a.nimi < b.nimi) {
      return -1;
    } else if (b.nimi < a.nimi) {
      return 1;
    } else {
      return 0;
    }
  })) {
    joukkueennimet[joukkue.nimi] = joukkue;
  }
  

  // ------ FORMIN PYÖRITTELY ------
  // Joukkueen nimen tarkistuksia yms

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

  // Tallennusyritys nappia painamalla, ei välttämättä submit-tapahtuma (?)
  document.querySelector('input[type="submit"]').addEventListener("click", function (e) {
    let onkoOK = tarkistaJasenet();
    console.log(onkoOK);
  });

  // Tallennustapahtumat
  document.forms.joukkuelomake.addEventListener("submit", function(e) {
    e.preventDefault();
    let ok = tarkistaJasenet();
    document.forms.joukkuelomake.reportValidity();
  });

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
      return true;
    } else {
      for (let jasen of jaseninputit) {
        jasen.setCustomValidity("Joukkueella on oltava vähintään yksi jäsen");
      }
      return false;
    }
  }


}

window.addEventListener("load", alustus);
