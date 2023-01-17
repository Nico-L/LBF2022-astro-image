<script>
    import { onMount, tick  } from "svelte";
    import Modal from "./components/ModalPerso.svelte";
    import Chargement from "./components/chargement.svelte"
    import { dateFormatFr } from './utils/dateFr.js'
    import { v4 as uuidv4 } from 'uuid';

    export let id_atelier = 'nope';
    export let url_illustration = 'logoLBFSeul_a1t4af.png';
    export let date_atelier = '';
    export let heure_debut = '';
    export let heure_fin = '';
    export let titre_atelier = 'Un titre Atelier';
    export let nb_participants = "0"

    // récupération adresse pour vérifier si arrivée d'un lien de désinscription
    var urlModifInscription = "";
    var urlMail = ""

    /* variables */
	var placesRestantes = "Calculs en cours..."
	let ModalInscription = false
    var listeInscrits = []
    var nbPlaces = -1
    var nouveauxInscrits = [{"prenom": "", "nom": ""}]
    var desinscrit = [{nom: "", prenom: ""}]
    var actionEnCours = false
	var flagEmailVerifie = false
    var flagVerifEffacer = false
    var flagVerifDesinscription = false
    var flagComplet = false
    var flagSaveValide = false
    var flagEmailVide = false
    var flagEmailInvalide = true
    var flagTelephoneVide = true
    var busyEffacerInscription = false
    var confirmeDesinscription = false
    var busyEffacerInscrit = false
    var confirmeDesinscrit = false
    var confirmeInscription = false
    var flagSaving = false
    let saveInfo = true;
    let idInscrit = ""
    Modal;
    let uuidInscription;
    let insertInscriptions;
    var listeInscriptionsEmail = [];
    var emailInscription = "";
    var telephoneInscription = "";
    var donneesUtilisateur = null
    const optionsImg = {
        'resizing_type': 'fill',
        'width': 290,
        'height': 190,
        'gravity': 'ce'
    }
    var adresseRedirect = ""

	/*import functions*/
    import { nombreInscrits, trouverInscrit, trouverInscritByUuid, saveInscrits, deleteInscrit } from './strapi/inscriptionAteliers.js'
    import { imgProxyUrl } from './strapi/imgProxy.js'
    import { envoyerEmail } from './strapi/email.js'
    import { verifJWT } from './strapi/verifJWT'
    import functionsCall from './utils/functionsCall'

    //récupération nb inscrits au montage & recup uuid pour affichage inscription
    onMount(async () => {
        const urlModifInscription = window.location.search;
        urlMail = window.location.origin +  window.location.pathname
        var extracted = /\?uuidInscription=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})&email=([a-zA-Z0-9+._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)&idAtelier=([0-9]+)(&redirect=(.*))?/i.exec(urlModifInscription)
        await tick()
        if (extracted!==null) {
            const uuidAtelierModif = extracted[1]
            const emailModif = extracted[2]
            const idAtelierUrl = extracted[3]
            if (extracted[5]) {
                adresseRedirect = "../" + extracted[5]
            }
            if (id_atelier === parseInt(idAtelierUrl)) {
                const chercheInscrits = await functionsCall("trouverInscrit", {variables: JSON.stringify({atelierId: idAtelierUrl, email: emailModif.toLowerCase(), uuid: uuidAtelierModif})})
                if (chercheInscrits.inscrits.length > 0) {
                    emailInscription = emailModif
                    telephoneInscription = chercheInscrits.inscrits[0].telephone
                    listeInscrits = chercheInscrits.inscrits
                    actionEnCours = false
                    flagEmailVerifie = true
                    nouveauxInscrits = []
                    affModal()
                } else { window.location.assign(window.location.origin)}
            }
        }
        nbInscrits()
    });

    // appels strapi
    function nbInscrits() {
        nombreInscrits(id_atelier).then((numInscrits) => {
            nbPlaces = nb_participants - numInscrits
            flagComplet = false
            if (nbPlaces < 1) {
                placesRestantes = "Complet"
                flagComplet = true
                nouveauxInscrits = []
            } else if (nbPlaces === 1) {
                placesRestantes = "Dernière place"
            } else {
                placesRestantes = nbPlaces + " places restantes"
            }
        })
    }

	function verifInscrits() {
        if(emailInscription==="") {flagEmailVide = true; return;}
        if(/([a-zA-Z0-9+._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/i.exec(emailInscription) === null) {flagEmailInvalide = true; return;}
        // saveInfoEmail()
        actionEnCours = true
        trouverInscrit(id_atelier, emailInscription.toLowerCase(), donneesUtilisateur.jwt).then((retour) => {
            if (retour.length === 0) {
                nouveauxInscrits = [{"prenom": "", "nom": ""}]
            } else {
                listeInscrits = retour
            }
            actionEnCours = false
            flagEmailVerifie = true
        })
	}

    function verifEmail() {
        const regexMail1 = /([a-zA-Z0-9+._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/i.exec(emailInscription)
        flagEmailInvalide = regexMail1 === null
        validationSave()
    }

    function verifTel() {
        flagTelephoneVide = telephoneInscription == ""
        validationSave()
    }

async function insertInscrits() {
    if (flagSaving) return
    flagSaving = true
    if (listeInscrits.length > 0) {
        await functionsCall("saveInscription", {inscriptions: JSON.stringify(listeInscrits)})
        uuidInscription = listeInscrits[0].uuid
    } else {
        uuidInscription = uuidv4()
    }
    var tableInscriptions = []
    nouveauxInscrits.forEach((inscription) => {
        if (!(inscription.prenom === "" && inscription.nom === "")) {
            tableInscriptions.push({
                "email": emailInscription.toLowerCase(), 
                "telephone": telephoneInscription.toLocaleLowerCase(),
                "atelier": id_atelier,
                "nom": inscription.nom.charAt(0).toUpperCase() + inscription.nom.slice(1), 
                "prenom": inscription.prenom.charAt(0).toUpperCase() + inscription.prenom.slice(1),
                "uuid": uuidInscription
                })
        }
    })
    if (tableInscriptions.length > 0 ) {
        await functionsCall("saveInscription", {inscriptions: JSON.stringify(tableInscriptions)})
    }
    flagSaving = false
    close()
    confirmeInscription = true
    envoiMail(uuidInscription)
}

async function envoiMail(uuid) {
        var listeInscriptionsPourEmail = []
        listeInscrits.forEach((inscrit) => {
            listeInscriptionsPourEmail.push({"nom": inscrit.nom, "prenom": inscrit.prenom})
        })
        nouveauxInscrits.forEach((inscrit) => {
            listeInscriptionsPourEmail.push({"nom": inscrit.nom, "prenom": inscrit.prenom})
        })
        nouveauxInscrits = [{"prenom": "", "nom": ""}]
        let heureDebutSplit = heure_debut.split(':')
        let heureFinSplit = heure_fin.split(':')
        let infoHoraires = dateFormatFr(date_atelier) + ' de ' + heureDebutSplit[0] + "h" + heureDebutSplit[1] + " à " + heureFinSplit[0] + "h" + heureFinSplit[1]
        var arrayMails = []
        arrayMails.push(emailInscription)
        imgProxyUrl(url_illustration, optionsImg).then(async (urlImage) => {
            const urlDesinscription = {
                urlMail: urlMail,
                uuidInscription: uuid,
                email: emailInscription,
                telephone: telephoneInscription,
                idAtelier: id_atelier
            }
            var infoMail = {
                subject: "Confirmation de votre inscription",
                titreAtelier: titre_atelier,
                date: infoHoraires,
                participants: listeInscriptionsPourEmail,
                //urlDesinscription: urlDesinscription,
                altMachine: "Illustration Atelier",
                urlImageMail: urlImage.imgProxyUrl
            };
            let variables = {
                from: "atelier@labonnefabrique.fr",
                to: arrayMails,
                replyTo: "atelier@labonnefabrique.fr",
                //dynamicTemplateData: infoMail,
                templateId: "d-3db7863e710b491e89681ccdf840a9f4"
            }
            //envoyerEmail(variables, donneesUtilisateur.jwt)
            const retour = await functionsCall("envoiEmail", {variables: JSON.stringify(variables), infoMail: JSON.stringify(infoMail), urlDesinscription: JSON.stringify(urlDesinscription)})
        })
    }

    function effacerInscription() {
        busyEffacerInscription = true
        var listePromises = []
        listeInscrits.forEach((inscrit) => {
            listePromises.push(functionsCall("effacerInscrit", {idInscrit: inscrit.id}))
        })
        Promise.all(listePromises).then((retour) => {
            nbInscrits()
            busyEffacerInscription = false
            close()
            close()
            confirmeDesinscription = true
        })
    }
    
    function effacerInscrit() {
        busyEffacerInscrit = true
        nbInscrits()
        busyEffacerInscrit = false
        close()
        close()
        confirmeDesinscrit = true
    }

// gestion table nouveaux inscrits
	function confirmerEffaceInscrit(id, inscrit) {
        flagVerifEffacer = true
        desinscrit = inscrit
        desinscrit.id = id
    }

   async function retirerInscrit(id, index) {
    console.log('id', id)
        const effacer = await functionsCall("effacerInscrit", {idInscrit: id})
        listeInscrits.splice(index, 1)
            listeInscrits = listeInscrits
            validationSave()
            nbInscrits()
        /*deleteInscrit(id, donneesUtilisateur.jwt).then((retour) => {
            
        }) */
    }

	function dernierInscrit(index) {
		return (index + 1) === nouveauxInscrits.length
	}

	function ajoutInscrit() {
		if ((nbPlaces - nouveauxInscrits.length)>0) nouveauxInscrits.push({"prenom": "", nom: ""})
		nouveauxInscrits = nouveauxInscrits
	}

	function soustraitInscrit(index) {
		nouveauxInscrits.splice(index, 1)
		nouveauxInscrits = nouveauxInscrits
    }
    
    function validationSave() {
        var estValide = true
        listeInscrits.forEach((inscrit) => {
            if (inscrit.prenom === "" || inscrit.nom === "") {estValide = false}
        })
        nouveauxInscrits.forEach((inscrit) => {
            if (inscrit.prenom === "" || inscrit.nom === "") {estValide = false}
        })
        flagSaveValide = estValide && !flagEmailInvalide && !flagTelephoneVide
    }

	function affModal() {
        ModalInscription = true
        /*if (donneesUtilisateur !== null && donneesUtilisateur.user.doitEtreEfface) {
                window.location.assign(window.location.origin + '/dashboard')
            }
        verifInscrits()
        if (donneesUtilisateur !== null) {
            verifJWT(donneesUtilisateur.jwt).then((retour) => {
                ModalInscription = true
            })
        } else {
            //window.location.assign(window.location.origin + '/login/')
        }*/
	}

    function redirect() {
        if (adresseRedirect==="") {
            window.location.assign(window.location.origin)
        } else {
            window.location.assign(adresseRedirect)
        }
    }

	function close() {
        if (confirmeInscription) {
            confirmeInscription = false
            return
        }
        if (confirmeDesinscription) {
            confirmeDesinscription = false
            return
        }
        if (confirmeDesinscrit) {
            confirmeDesinscrit = false
            return
        }
		if (flagVerifEffacer || flagVerifDesinscription) {
            flagVerifEffacer = false
            flagVerifDesinscription = false
        } else {
        ModalInscription = false; flagEmailVerifie = false; flagVerifDesinscription = false;
        }
	}

	const handle_keydown = e => {
        if (!ModalInscription) {return}
	  if (e.key === "Escape") {
	    close();
	    return;
      }
      if (e.key === "Enter") {
          ajoutInscrit();
          e.preventDefault();
      }
	  /*if (e.key === "Tab") {
        // trap focus
        console.lModal)
        const nodeModal.querySelectorAll("*");
        console.log('nodes', nodes)
        const tabbable = Array.from(nodes).filter(n => n.tabIndex >= 0);
        console.log('tabbable', tabbable)
        let index = tabbable.indexOf(DocumentOrShadowRoot.activeElement);
        console.log('index', index)
	    if (index === -1 && e.shiftKey) index = 0;
	    index += tabbable.length + (e.shiftKey ? -1 : 1);
	    index %= tabbable.length;
	    tabbable[index].focus();
	    e.preventDefault();
	  }*/
	};
</script>

<svelte:window on:keydown={handle_keydown}/>
<div class="flex flex-row content-center absolute bottom-0 z-10">
	<div class="bg-orangeLBF flex flex-row mr-1 text-black text-sm px-1">
		<div class="my-auto">{placesRestantes}</div>
	</div>
	<div class="bg-orangeLBF flex flex-row content-center rounded-r px-1 cursor-pointer" on:click={affModal}>
		<svg class="fill-current text-black my-auto" width="16" height="16" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512">
			<path fill="currentColor" d="M402.6 83.2l90.2 90.2c3.8 3.8 3.8 10 0 13.8L274.4 405.6l-92.8 10.3c-12.4 1.4-22.9-9.1-21.5-21.5l10.3-92.8L388.8 83.2c3.8-3.8 10-3.8 13.8 0zm162-22.9l-48.8-48.8c-15.2-15.2-39.9-15.2-55.2 0l-35.4 35.4c-3.8 3.8-3.8 10 0 13.8l90.2 90.2c3.8 3.8 10 3.8 13.8 0l35.4-35.4c15.2-15.3 15.2-40 0-55.2zM384 346.2V448H64V128h229.8c3.2 0 6.2-1.3 8.5-3.5l40-40c7.6-7.6 2.2-20.5-8.5-20.5H48C21.5 64 0 85.5 0 112v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V306.2c0-10.7-12.9-16-20.5-8.5l-40 40c-2.2 2.3-3.5 5.3-3.5 8.5z"/>
		</svg>
		<div class="text-black text-sm my-auto">inscriptions</div>
	</div>
</div>
<!-- Modal inscription -->
{#if ModalInscription}
<div class="z-100 fixed w-full h-full top-0 left-0 flex items-center justify-center">
	<div class="absolute w-full h-full  bg-black opacity-75 top-0 left-0 cursor-pointer" on:click={close}>
	</div>
	<div class="relative overflow-auto max-h-5/6 w-5/6 sm:max-w-500px bg-white flex flex-col p-4 items-start rounded" role="dialog" aModal="true" >
		<h2 class="text-xl w-full pb-1 mb-1 border-b-2 border-bleuLBF font-bold">
			Votre inscription
		</h2>
		<hr class="mb-1" />
		{#if nbPlaces < 1 && listeInscrits.length === 0 && !actionEnCours }
            <h2 class="text-base text-bleuLBF w-full mx-2 pb-1 mb-1 font-normal">
                Cet atelier est complet. Nos ateliers sont régulièrement proposés, surveillez cet espace pour le prochain.
            </h2>
        {:else}
            {#if actionEnCours} 
                <Chargement>Récupération des données</Chargement>
            {:else}
                <div class="text-base text-gray-900 w-full mx-2 mb-1">
                    Votre adresse email, pour envoi de la confirmation d'inscription.
                </div>
                <div class="flex flex-col sm:mr-2 w-full">
                    <div class="ml-1 text-xs m-0 p-0 font-medium text-orangeLBF">Adresse email</div>
                    <input class="mr-2 px-1 h-10 w-full bg-white focus:outline-none focus:bg-white focus:border-lbforange-900 border-2 border-lbforange-900 rounded-lg block appearance-none leading-normal"
                        type="text" placeholder="email" bind:value={emailInscription}  on:input={verifEmail}/>
                    {#if flagEmailInvalide}
                        <div class="text-rougeLBF h-4 w-full">Merci d'entrer une adresse email valide.</div>
                    {:else}
                    <div class="text-rougeLBF h-4 w-full">&nbsp;</div>
                    {/if}
                    <div class="ml-1 mt-4 text-xs m-0 p-0 font-medium text-lbfbleu-700">Téléphone</div>
                    <input class="mr-2 px-1 h-10 w-full bg-white focus:outline-none focus:bg-white focus:border-lbfbleu-900 border-2 border-lbfbleu-900 rounded-lg block appearance-none leading-normal"
                        type="text" placeholder="téléphone" bind:value={telephoneInscription} on:input={verifTel} />
                    {#if flagTelephoneVide}
                        <div class="text-rougeLBF h-4 w-full">Merci d'entrer un numéro de téléphone.</div>
                    {:else}
                    <div class="text-rougeLBF h-4 w-full">&nbsp;</div>
                    {/if}
                </div>
                <div class="text-base text-gray-900 w-full mx-2 mb-1 mt-2">
                    Merci d'entrer le prénom et le nom des participants.
                </div>
                {#each listeInscrits as inscrit, index}
                    <div class="w-full flex flex-row justify-start mb-4">
                        <div class="flex flex-col sm:flex-row flex-wrap ">
                            <div class="flex flex-col sm:mr-2">
                                <div class="ml-1 text-xs m-0 p-0 font-medium text-bleuLBF">Nom</div>
                                <input class="mr-2 px-1 h-10 bg-white focus:outline-none focus:bg-white focus:border-lbfbleu-600 border-2 border-lbfbleu-400 rounded-lg block appearance-none leading-normal"
                                    type="text" placeholder="nom" bind:value={inscrit.nom} on:input={validationSave}/>
                            </div>
                            <div class="flex flex-col sm:mr-2">
                                <div class="ml-1 text-xs m-0 p-0 font-medium text-bleuLBF">Prénom</div>
                                <input class="mr-2 px-1 h-10 bg-white focus:outline-none focus:bg-white focus:border-lbfbleu-600 border-2 border-lbfbleu-400 rounded-lg block appearance-none leading-normal"
                                    type="text" placeholder="prenom" bind:value={inscrit.prenom} on:input={validationSave}/>
                            </div>
                        </div>
                        {#if listeInscrits.length > 1}
                            <div class="my-auto sm:w-12 w-20">
                                <svg on:click={() => retirerInscrit(inscrit.id, index)} class="mx-auto cursor-pointer mt-3 h-12 w-12 sm:h-8 sm:w-8 stroke-current text-lbfbleu-600" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" data-prefix="far" data-icon="trash-alt" viewBox="0 0 448 512">
                                    <path fill="currentColor" d="M268 416h24a12 12 0 0012-12V188a12 12 0 00-12-12h-24a12 12 0 00-12 12v216a12 12 0 0012 12zM432 80h-82.41l-34-56.7A48 48 0 00274.41 0H173.59a48 48 0 00-41.16 23.3L98.41 80H16A16 16 0 000 96v16a16 16 0 0016 16h16v336a48 48 0 0048 48h288a48 48 0 0048-48V128h16a16 16 0 0016-16V96a16 16 0 00-16-16zM171.84 50.91A6 6 0 01177 48h94a6 6 0 015.15 2.91L293.61 80H154.39zM368 464H80V128h288zm-212-48h24a12 12 0 0012-12V188a12 12 0 00-12-12h-24a12 12 0 00-12 12v216a12 12 0 0012 12z"/>
                                </svg>
                            </div>
                        {/if}
                    </div>
                {/each}
                <div>
                    {#each nouveauxInscrits as nouvelInscrit, index ('nI' + index)}
                        <div class="w-full flex flex-col justify-start">
                            <div class="flex flex-row justify-start">
                                <div class="flex flex-col sm:flex-row">
                                    <div class="flex flex-col sm:mr-2">
                                        <div class="ml-1 text-xs m-0 p-0 font-medium text-bleuLBF">Nom</div>
                                        <input class="mr-2 px-1 h-10 bg-white focus:outline-none focus:bg-white focus:border-lbfbleu-600 border-2 border-lbfbleu-400 rounded-lg block appearance-none leading-normal"
                                            type="text" placeholder="nom" bind:value={nouvelInscrit.nom} on:input={validationSave}/>
                                    </div>
                                    <div class="flex flex-col">
                                        <div class="ml-1 text-xs m-0 p-0 font-medium text-bleuLBF">Prénom</div>
                                        <input class="mr-2 px-1 h-10 bg-white focus:outline-none focus:bg-white focus:border-lbfbleu-600 border-2 border-lbfbleu-400 rounded-lg block appearance-none leading-normal"
                                            type="text" placeholder="prenom" bind:value={nouvelInscrit.prenom} on:input={validationSave}/>
                                    </div>
                                </div>
                                <div class="my-auto">
                                    {#if index > 0}
                                        <svg on:click={soustraitInscrit(index)} class="mx-auto cursor-pointer mt-3 h-12 w-12 md:h-8 md:w-8 stroke-current text-rougeLBF" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" data-prefix="far" data-icon="trash-alt" viewBox="0 0 448 512">
                                            <path fill="currentColor" d="M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.2 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.2 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z"/>
                                        </svg>
                                    {/if}
                                </div>
                            </div>
                            {#if nouvelInscrit.prenom==="" || nouvelInscrit.nom === ""}
                                <div class="text-sm font-medium text-rougeLBF ">Nom et prénom requis.</div>
                            {:else}
                                <div class="text-sm font-medium text-rougeLBF ">&nbsp;</div>
                            {/if}
                        </div>
                    {/each}
                </div>
                {#if (nbPlaces-nouveauxInscrits.length) === 0}
                    <div class="text-sm sm:text-xs md:text-sm font-medium text-rougeLBF ">Cet atelier ne peut accepter de participant supplémentaire.</div>
                {/if}
                <div>
                    {#if (nbPlaces-nouveauxInscrits.length) > 0}
                        <button on:click={ajoutInscrit} class="mt-1 mx-1 px-1 border-2 border-vertLBF rounded text-base font-medium text-vertLBF">
                            Ajouter un participant
                        </button>
                    {/if}
                    {#if listeInscrits.length > 0}
                        <button on:click={() => flagVerifDesinscription = true} class="mt-1 mx-1 px-1 border-2 border-orangeLBF rounded text-base font-medium text-orangeLBF">
                            Se désinscrire
                        </button>
                    {/if}
                    {#if flagSaveValide}
                    <button on:click={insertInscrits}  class="mt-1 mb-0 mx-1 px-1 h-8 w-24 border-2 border-bleuLBF rounded text-base font-medium text-bleuLBF">
                        {#if flagSaving}
                            <svg xmlns="http://www.w3.org/2000/svg" class="fill-current stroke-current text-bleuLBF-500 bg-bleuLBF-500 h-6 w-6 mx-auto" viewBox="0 0 50 50">
                                <g fill="none" fill-rule="evenodd" stroke-width="2" stroke="currentColor">
                                    <circle cx="22" cy="22" r="1">
                                        <animate attributeName="r" begin="0s" dur="1.8s" values="1; 20" calcMode="spline" keyTimes="0; 1" keySplines="0.165, 0.84, 0.44, 1" repeatCount="indefinite"/>
                                        <animate attributeName="stroke-opacity" begin="0s" dur="1.8s" values="1; 0" calcMode="spline" keyTimes="0; 1" keySplines="0.3, 0.61, 0.355, 1" repeatCount="indefinite"/>
                                    </circle>
                                    <circle cx="22" cy="22" r="1">
                                        <animate attributeName="r" begin="-0.9s" dur="1.8s" values="1; 20" calcMode="spline" keyTimes="0; 1" keySplines="0.165, 0.84, 0.44, 1" repeatCount="indefinite"/>
                                        <animate attributeName="stroke-opacity" begin="-0.9s" dur="1.8s" values="1; 0" calcMode="spline" keyTimes="0; 1" keySplines="0.3, 0.61, 0.355, 1" repeatCount="indefinite"/>
                                    </circle>
                                </g>
                            </svg>
                        {:else}
                            <span>Enregistrer</span>
                        {/if}
                    </button>
                    {/if}
                    
                </div>
            {/if}
		{/if}
	</div>
</div>
{/if}
{#if flagVerifDesinscription}
    <Modal has_bouton_bleu="true" bouton_bleu_busy={busyEffacerInscription} on:close={close} on:boutonBleu={effacerInscription}>
        <span slot="titre">Confirmation</span>
            Merci de confirmer votre désinscription.
        <span slot="boutonBleu">Confirmer</span>
        <span slot="boutonDefaut">Annuler</span>
    </Modal>
{/if}
{#if flagVerifEffacer}
    <Modal has_bouton_bleu="true" bouton_bleu_busy={busyEffacerInscrit} on:close={close} on:boutonBleu={effacerInscrit}>
        <span slot="titre">Confirmation</span>
            Merci de confirmer la désinscription de {desinscrit.prenom}
        <span slot="boutonBleu">Confirmer</span>
        <span slot="boutonDefaut">Annuler</span>
    </Modal>
{/if}
{#if confirmeDesinscription}
    <Modal on:close={redirect} on:retour={redirect} on:boutonBleu={redirect}>
        <span slot="titre">Votre desinscription</span>
            Votre désinscription a bien été enregistrée. 
        <span slot="boutonBleu">OK</span>
    </Modal>
{/if}
{#if confirmeDesinscrit}
    <Modal on:close={close} on:boutonBleu={effacerInscrit}>
        <span slot="titre">Desinscription</span>
           {desinscrit.prenom} est bien désinscrit.
        <span slot="boutonBleu">Confirmer</span>
    </Modal>
{/if}
{#if confirmeInscription}
    <Modal on:close={close} on:retour={redirect}>
        <span slot="titre">Votre inscription</span>
        <span class="text-justify">
            Votre inscription a bien été enregistrée. Vous allez recevoir un mail de confirmation qui contient un lien vous permettant éventuellement de vous désinscrire.<br />
            Si vous ne l'avez pas reçu dans les prochaines minutes, il y a pu avoir un problème de notre serveur ou une erreur dans l'adresse enregistrée. Cela ne compromet pas votre inscription, mais nous serons dans l'impossibilité de vous contacter si besoin.
        </span>
    </Modal>
{/if}
<slot>
</slot>
