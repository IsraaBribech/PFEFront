import { Component, type OnInit } from "@angular/core"

interface Gouvernorat {
  id: number
  nom: string
  delegations: Delegation[]
}

interface Delegation {
  id: number
  nom: string
  gouvernoratId: number
}

@Component({
  selector: "app-eduprofil",
  templateUrl: "./eduprofil.component.html",
  styleUrls: ["./eduprofil.component.css"],
})
export class EduprofilComponent implements OnInit {
  // Informations de l'étudiant
  etudiantInfo = {
    nom: "Benali",
    prenom: "Ahmed",
    dateNaissance: "1998-05-15",
    email: "ahmed.benali@etudiant.edu",
    identifiant: "E12345",
    cin: "12345678",
    etatCivil: "celibataire",
    adresse: {
      rue: "15 Rue des Oliviers",
      codePostal: "1002",
      gouvernoratId: 23, // Tunis
      delegationId: 11, // Bab Bhar
    },
    telephone: "55123456",
    photoUrl: "",
  }

  // États civils disponibles
  etatsCivils = [
    { id: "celibataire", label: "Célibataire" },
    { id: "marie", label: "Marié(e)" },
    { id: "divorce", label: "Divorcé(e)" },
  ]

  // Liste des gouvernorats
  gouvernorats: Gouvernorat[] = [
    { id: 1, nom: "Ariana", delegations: [] },
    { id: 2, nom: "Béja", delegations: [] },
    { id: 3, nom: "Ben Arous", delegations: [] },
    { id: 4, nom: "Bizerte", delegations: [] },
    { id: 5, nom: "Gabès", delegations: [] },
    { id: 6, nom: "Gafsa", delegations: [] },
    { id: 7, nom: "Jendouba", delegations: [] },
    { id: 8, nom: "Kairouan", delegations: [] },
    { id: 9, nom: "Kasserine", delegations: [] },
    { id: 10, nom: "Kébili", delegations: [] },
    { id: 11, nom: "Kef", delegations: [] },
    { id: 12, nom: "Mahdia", delegations: [] },
    { id: 13, nom: "Manouba", delegations: [] },
    { id: 14, nom: "Médenine", delegations: [] },
    { id: 15, nom: "Monastir", delegations: [] },
    { id: 16, nom: "Nabeul", delegations: [] },
    { id: 17, nom: "Sfax", delegations: [] },
    { id: 18, nom: "Sidi Bouzid", delegations: [] },
    { id: 19, nom: "Siliana", delegations: [] },
    { id: 20, nom: "Sousse", delegations: [] },
    { id: 21, nom: "Tataouine", delegations: [] },
    { id: 22, nom: "Tozeur", delegations: [] },
    { id: 23, nom: "Tunis", delegations: [] },
    { id: 24, nom: "Zaghouan", delegations: [] },
  ]

  // Liste complète des délégations
  delegations: Delegation[] = [
    { id: 1, nom: "Aïn Draham", gouvernoratId: 7 },
    { id: 2, nom: "Akouda", gouvernoratId: 20 },
    { id: 3, nom: "Agareb", gouvernoratId: 17 },
    { id: 4, nom: "Amdoun", gouvernoratId: 2 },
    { id: 5, nom: "Bab Bhar", gouvernoratId: 23 },
    { id: 6, nom: "Bab Souika", gouvernoratId: 23 },
    { id: 7, nom: "Balta-Bou Aouane", gouvernoratId: 7 },
    { id: 8, nom: "Bargou", gouvernoratId: 19 },
    { id: 9, nom: "Bekalta", gouvernoratId: 12 },
    { id: 10, nom: "Belkhir", gouvernoratId: 6 },
    { id: 11, nom: "Ben Arous", gouvernoratId: 3 },
    { id: 12, nom: "Ben Gardane", gouvernoratId: 14 },
    { id: 13, nom: "Beni Hassen", gouvernoratId: 15 },
    { id: 14, nom: "Beni Khalled", gouvernoratId: 16 },
    { id: 15, nom: "Beni Khiar", gouvernoratId: 16 },
    { id: 16, nom: "Beni Khedache", gouvernoratId: 14 },
    { id: 17, nom: "Bir Ali Ben Khalifa", gouvernoratId: 17 },
    { id: 18, nom: "Bir El Hafey", gouvernoratId: 18 },
    { id: 19, nom: "Bir Lahmar", gouvernoratId: 21 },
    { id: 20, nom: "Bir Mcherga", gouvernoratId: 24 },
    { id: 21, nom: "Bizerte Nord", gouvernoratId: 4 },
    { id: 22, nom: "Bizerte Sud", gouvernoratId: 4 },
    { id: 23, nom: "Bou Argoub", gouvernoratId: 16 },
    { id: 24, nom: "Bou Arada", gouvernoratId: 19 },
    { id: 25, nom: "Bou Hajla", gouvernoratId: 8 },
    { id: 26, nom: "Bou Merdes", gouvernoratId: 12 },
    { id: 27, nom: "Bou Salem", gouvernoratId: 7 },
    { id: 28, nom: "Boumhel El Bassatine", gouvernoratId: 3 },
    { id: 29, nom: "Bouficha", gouvernoratId: 20 },
    { id: 30, nom: "Cité El Khadra", gouvernoratId: 23 },
    { id: 31, nom: "Chorbane", gouvernoratId: 12 },
    { id: 32, nom: "Chebba", gouvernoratId: 12 },
    { id: 33, nom: "Chebika", gouvernoratId: 8 },
    { id: 34, nom: "Dar Chaâbane El Fehri", gouvernoratId: 16 },
    { id: 35, nom: "Dahmani", gouvernoratId: 11 },
    { id: 36, nom: "Degache", gouvernoratId: 22 },
    { id: 37, nom: "Dehiba", gouvernoratId: 21 },
    { id: 38, nom: "Djebel Jelloud", gouvernoratId: 23 },
    { id: 39, nom: "Djedeida", gouvernoratId: 13 },
    { id: 40, nom: "Douz Nord", gouvernoratId: 10 },
    { id: 41, nom: "Douz Sud", gouvernoratId: 10 },
    { id: 42, nom: "El Aroussa", gouvernoratId: 19 },
    { id: 43, nom: "El Alia", gouvernoratId: 4 },
    { id: 44, nom: "El Amra", gouvernoratId: 17 },
    { id: 45, nom: "El Fahs", gouvernoratId: 24 },
    { id: 46, nom: "El Guettar", gouvernoratId: 6 },
    { id: 47, nom: "El Haouaria", gouvernoratId: 16 },
    { id: 48, nom: "El Hamma", gouvernoratId: 21 },
    { id: 49, nom: "El Hamma de Gabès", gouvernoratId: 5 },
    { id: 50, nom: "El Jem", gouvernoratId: 12 },
    { id: 51, nom: "El Kabaria", gouvernoratId: 23 },
    { id: 52, nom: "El Ksour", gouvernoratId: 11 },
    { id: 53, nom: "El Menzah", gouvernoratId: 23 },
    { id: 54, nom: "El Mourouj", gouvernoratId: 3 },
    { id: 55, nom: "El Omrane", gouvernoratId: 23 },
    { id: 56, nom: "El Omrane Supérieur", gouvernoratId: 23 },
    { id: 57, nom: "El Ouardia", gouvernoratId: 23 },
    { id: 58, nom: "Ennaser", gouvernoratId: 23 },
    { id: 59, nom: "Ettadhamen", gouvernoratId: 13 },
    { id: 60, nom: "Ezzahra", gouvernoratId: 3 },
    { id: 61, nom: "Faouar", gouvernoratId: 10 },
    { id: 62, nom: "Fernana", gouvernoratId: 7 },
    { id: 63, nom: "Fériana", gouvernoratId: 9 },
    { id: 64, nom: "Fouchana", gouvernoratId: 3 },
    { id: 65, nom: "Foussana", gouvernoratId: 9 },
    { id: 66, nom: "Gaâfour", gouvernoratId: 19 },
    { id: 67, nom: "Gabès Médina", gouvernoratId: 5 },
    { id: 68, nom: "Gabès Ouest", gouvernoratId: 5 },
    { id: 69, nom: "Gabès Sud", gouvernoratId: 5 },
    { id: 70, nom: "Gafsa Nord", gouvernoratId: 6 },
    { id: 71, nom: "Gafsa Sud", gouvernoratId: 6 },
    { id: 72, nom: "Ghannouch", gouvernoratId: 5 },
    { id: 73, nom: "Ghardimaou", gouvernoratId: 7 },
    { id: 74, nom: "Ghar El Melh", gouvernoratId: 4 },
    { id: 75, nom: "Ghezala", gouvernoratId: 4 },
    { id: 76, nom: "Ghomrassen", gouvernoratId: 21 },
    { id: 77, nom: "Graïba", gouvernoratId: 17 },
    { id: 78, nom: "Grombalia", gouvernoratId: 16 },
    { id: 79, nom: "Hajeb El Ayoun", gouvernoratId: 8 },
    { id: 80, nom: "Haïdra", gouvernoratId: 9 },
    { id: 81, nom: "Hammam Chott", gouvernoratId: 3 },
    { id: 82, nom: "Hammam Ghezèze", gouvernoratId: 16 },
    { id: 83, nom: "Hammam Lif", gouvernoratId: 3 },
    { id: 84, nom: "Hammamet", gouvernoratId: 16 },
    { id: 85, nom: "Hassi El Ferid", gouvernoratId: 9 },
    { id: 86, nom: "Hazoua", gouvernoratId: 22 },
    { id: 87, nom: "Hebira", gouvernoratId: 12 },
    { id: 88, nom: "Hergla", gouvernoratId: 20 },
    { id: 89, nom: "Jammel", gouvernoratId: 15 },
    { id: 90, nom: "Jebeniana", gouvernoratId: 17 },
    { id: 91, nom: "Jendouba Nord", gouvernoratId: 7 },
    { id: 92, nom: "Jendouba Sud", gouvernoratId: 7 },
    { id: 93, nom: "Jérissa", gouvernoratId: 11 },
    { id: 94, nom: "Kalaât el-Andalous", gouvernoratId: 1 },
    { id: 95, nom: "Kalaâ Kebira", gouvernoratId: 20 },
    { id: 96, nom: "Kalaâ Seghira", gouvernoratId: 20 },
    { id: 97, nom: "Kalaat Khasba", gouvernoratId: 11 },
    { id: 98, nom: "Kalaat Senan", gouvernoratId: 11 },
    { id: 99, nom: "Kairouan Nord", gouvernoratId: 8 },
    { id: 100, nom: "Kairouan Sud", gouvernoratId: 8 },
    { id: 101, nom: "Kasserine Nord", gouvernoratId: 9 },
    { id: 102, nom: "Kasserine Sud", gouvernoratId: 9 },
    { id: 103, nom: "Kébili Nord", gouvernoratId: 10 },
    { id: 104, nom: "Kébili Sud", gouvernoratId: 10 },
    { id: 105, nom: "Kelibia", gouvernoratId: 16 },
    { id: 106, nom: "Kesra", gouvernoratId: 19 },
    { id: 107, nom: "Kerkennah", gouvernoratId: 17 },
    { id: 108, nom: "Kram", gouvernoratId: 23 },
    { id: 109, nom: "Ksour Essef", gouvernoratId: 12 },
    { id: 110, nom: "La Goulette", gouvernoratId: 23 },
    { id: 111, nom: "La Manouba", gouvernoratId: 13 },
    { id: 112, nom: "La Marsa", gouvernoratId: 23 },
    { id: 113, nom: "Le Bardo", gouvernoratId: 23 },
    { id: 114, nom: "Mahdia", gouvernoratId: 12 },
    { id: 115, nom: "Mahrès", gouvernoratId: 17 },
    { id: 116, nom: "Majel Bel Abbès", gouvernoratId: 9 },
    { id: 117, nom: "Makthar", gouvernoratId: 19 },
    { id: 118, nom: "Mareth", gouvernoratId: 5 },
    { id: 119, nom: "Matmata", gouvernoratId: 5 },
    { id: 120, nom: "Matmata Nouvelle", gouvernoratId: 5 },
    { id: 121, nom: "Mateur", gouvernoratId: 4 },
    { id: 122, nom: "Médenine Nord", gouvernoratId: 14 },
    { id: 123, nom: "Médenine Sud", gouvernoratId: 14 },
    { id: 124, nom: "Mdhilla", gouvernoratId: 6 },
    { id: 125, nom: "Melloulèche", gouvernoratId: 12 },
    { id: 126, nom: "Mégrine", gouvernoratId: 3 },
    { id: 127, nom: "Menzel Bouzaiane", gouvernoratId: 18 },
    { id: 128, nom: "Menzel Bouzelfa", gouvernoratId: 16 },
    { id: 129, nom: "Menzel Bourguiba", gouvernoratId: 4 },
    { id: 130, nom: "Menzel El Habib", gouvernoratId: 5 },
    { id: 131, nom: "Menzel Hassen", gouvernoratId: 15 },
    { id: 132, nom: "Menzel Jemil", gouvernoratId: 4 },
    { id: 133, nom: "Menzel Temime", gouvernoratId: 16 },
    { id: 134, nom: "Métlaoui", gouvernoratId: 6 },
    { id: 135, nom: "Moknine", gouvernoratId: 15 },
    { id: 136, nom: "Mohamedia", gouvernoratId: 3 },
    { id: 137, nom: "Monastir", gouvernoratId: 15 },
    { id: 138, nom: "Mornag", gouvernoratId: 3 },
    { id: 139, nom: "Mornaguia", gouvernoratId: 13 },
    { id: 140, nom: "Moularès", gouvernoratId: 6 },
    { id: 141, nom: "Nadhour", gouvernoratId: 24 },
    { id: 142, nom: "Nabeul", gouvernoratId: 16 },
    { id: 143, nom: "Nasrallah", gouvernoratId: 8 },
    { id: 144, nom: "Nebeur", gouvernoratId: 11 },
    { id: 145, nom: "Nefta", gouvernoratId: 22 },
    { id: 146, nom: "Oued Ellil", gouvernoratId: 13 },
    { id: 147, nom: "Oued Meliz", gouvernoratId: 7 },
    { id: 148, nom: "Ouled Chamekh", gouvernoratId: 12 },
    { id: 149, nom: "Ouled Haffouz", gouvernoratId: 18 },
    { id: 150, nom: "Oueslatia", gouvernoratId: 8 },
    { id: 151, nom: "Raoued", gouvernoratId: 1 },
    { id: 152, nom: "Radès", gouvernoratId: 3 },
    { id: 153, nom: "Ras Jebel", gouvernoratId: 4 },
    { id: 154, nom: "Redeyef", gouvernoratId: 6 },
    { id: 155, nom: "Regueb", gouvernoratId: 18 },
    { id: 156, nom: "Remada", gouvernoratId: 21 },
    { id: 157, nom: "Rouhia", gouvernoratId: 19 },
    { id: 158, nom: "Sbeitla", gouvernoratId: 9 },
    { id: 159, nom: "Sbikha", gouvernoratId: 8 },
    { id: 160, nom: "Sidi Ali Ben Aoun", gouvernoratId: 18 },
    { id: 161, nom: "Sidi Alouane", gouvernoratId: 12 },
    { id: 162, nom: "Sidi Bou Ali", gouvernoratId: 20 },
    { id: 163, nom: "Sidi Bouzid Est", gouvernoratId: 18 },
    { id: 164, nom: "Sidi Bouzid Ouest", gouvernoratId: 18 },
    { id: 165, nom: "Sidi Hassine", gouvernoratId: 23 },
    { id: 166, nom: "Sidi Makhlouf", gouvernoratId: 14 },
    { id: 167, nom: "Sidi Thabet", gouvernoratId: 1 },
    { id: 168, nom: "Siliana Nord", gouvernoratId: 19 },
    { id: 169, nom: "Siliana Sud", gouvernoratId: 19 },
    { id: 170, nom: "Skhira", gouvernoratId: 17 },
    { id: 171, nom: "Soliman", gouvernoratId: 16 },
    { id: 172, nom: "Sned", gouvernoratId: 6 },
    { id: 173, nom: "Sousse Jawhara", gouvernoratId: 20 },
    { id: 174, nom: "Sousse Médina", gouvernoratId: 20 },
    { id: 175, nom: "Sousse Riadh", gouvernoratId: 20 },
    { id: 176, nom: "Sousse Sidi Abdelhamid", gouvernoratId: 20 },
    { id: 177, nom: "Souk Jedid", gouvernoratId: 18 },
    { id: 178, nom: "Souk Lahad", gouvernoratId: 10 },
    { id: 179, nom: "Tabarka", gouvernoratId: 7 },
    { id: 180, nom: "Tameghza", gouvernoratId: 22 },
    { id: 181, nom: "Tajerouine", gouvernoratId: 11 },
    { id: 182, nom: "Tataouine Nord", gouvernoratId: 21 },
    { id: 183, nom: "Tataouine Sud", gouvernoratId: 21 },
    { id: 184, nom: "Teboulba", gouvernoratId: 15 },
    { id: 185, nom: "Téboursouk", gouvernoratId: 2 },
    { id: 186, nom: "Tébourba", gouvernoratId: 13 },
    { id: 187, nom: "Testour", gouvernoratId: 2 },
    { id: 188, nom: "Thala", gouvernoratId: 9 },
    { id: 189, nom: "Thyna", gouvernoratId: 17 },
    { id: 190, nom: "Tinja", gouvernoratId: 4 },
    { id: 191, nom: "Tozeur", gouvernoratId: 22 },
    { id: 192, nom: "Utique", gouvernoratId: 4 },
    { id: 193, nom: "Zaghouan", gouvernoratId: 24 },
    { id: 194, nom: "Zarzis", gouvernoratId: 14 },
    { id: 195, nom: "Zarzouna", gouvernoratId: 4 },
    { id: 196, nom: "Zeramdine", gouvernoratId: 15 },
  ]

  // Délégations filtrées en fonction du gouvernorat sélectionné
  delegationsFiltrees: Delegation[] = []

  // État de validation du formulaire
  formValide = false
  formSoumis = false
  erreurs: { [key: string]: string } = {}

  // Photo de profil
  photoPreview: string | ArrayBuffer | null = null

  constructor() {}

  ngOnInit(): void {
    // Initialiser les délégations filtrées en fonction du gouvernorat sélectionné
    this.filtrerDelegations()
  }

  // Méthode pour filtrer les délégations en fonction du gouvernorat sélectionné
  filtrerDelegations(): void {
    this.delegationsFiltrees = this.delegations.filter(
      (delegation) => delegation.gouvernoratId === this.etudiantInfo.adresse.gouvernoratId,
    )

    // Si aucune délégation n'est trouvée pour ce gouvernorat, réinitialiser la délégation sélectionnée
    if (!this.delegationsFiltrees.some((d) => d.id === this.etudiantInfo.adresse.delegationId)) {
      this.etudiantInfo.adresse.delegationId = this.delegationsFiltrees.length > 0 ? this.delegationsFiltrees[0].id : 0
    }
  }

  // Méthode pour gérer le changement de gouvernorat
  onGouvernoratChange(): void {
    this.filtrerDelegations()
  }

  // Méthode pour gérer le téléchargement de la photo de profil
  onPhotoChange(event: Event): void {
    const input = event.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      const file = input.files[0]

      // Vérifier le type de fichier
      if (!file.type.match("image.*")) {
        alert("Veuillez sélectionner une image.")
        return
      }

      // Vérifier la taille du fichier (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("La taille de l'image ne doit pas dépasser 5MB.")
        return
      }

      // Afficher l'aperçu de l'image
      const reader = new FileReader()
      reader.onload = (e) => {
        this.photoPreview = e.target?.result || null
      }
      reader.readAsDataURL(file)
    }
  }

  // Méthode pour valider le formulaire
  validerFormulaire(): boolean {
    this.erreurs = {}
    let valide = true

    // Valider le nom
    if (!this.etudiantInfo.nom.trim()) {
      this.erreurs["nom"] = "Le nom est obligatoire"
      valide = false
    }

    // Valider le prénom
    if (!this.etudiantInfo.prenom.trim()) {
      this.erreurs["prenom"] = "Le prénom est obligatoire"
      valide = false
    }

    // Valider la date de naissance
    if (!this.etudiantInfo.dateNaissance) {
      this.erreurs["dateNaissance"] = "La date de naissance est obligatoire"
      valide = false
    }

    // Valider l'email
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(this.etudiantInfo.email)) {
      this.erreurs["email"] = "L'email n'est pas valide"
      valide = false
    }

    // Valider le CIN
    if (!this.etudiantInfo.cin.trim()) {
      this.erreurs["cin"] = "Le N° CIN ou Passeport est obligatoire"
      valide = false
    }

    // Valider l'état civil
    if (!this.etudiantInfo.etatCivil) {
      this.erreurs["etatCivil"] = "L'état civil est obligatoire"
      valide = false
    }

    // Valider l'adresse
    if (!this.etudiantInfo.adresse.rue.trim()) {
      this.erreurs["rue"] = "La rue est obligatoire"
      valide = false
    }

    if (!this.etudiantInfo.adresse.codePostal.trim()) {
      this.erreurs["codePostal"] = "Le code postal est obligatoire"
      valide = false
    }

    if (!this.etudiantInfo.adresse.gouvernoratId) {
      this.erreurs["gouvernorat"] = "Le gouvernorat est obligatoire"
      valide = false
    }

    if (!this.etudiantInfo.adresse.delegationId) {
      this.erreurs["delegation"] = "La délégation est obligatoire"
      valide = false
    }

    // Valider le téléphone
    const telRegex = /^[0-9]{8}$/
    if (!telRegex.test(this.etudiantInfo.telephone)) {
      this.erreurs["telephone"] = "Le numéro de téléphone doit contenir 8 chiffres"
      valide = false
    }

    return valide
  }

  // Méthode pour soumettre le formulaire
  soumettreFormulaire(): void {
    this.formSoumis = true

    if (this.validerFormulaire()) {
      this.formValide = true
      // Ici, vous pourriez envoyer les données à un service ou une API
      console.log("Formulaire soumis avec succès", this.etudiantInfo)

      // Simuler un délai pour montrer le message de succès
      setTimeout(() => {
        this.formSoumis = false
        this.formValide = false
        alert("Profil mis à jour avec succès !")
      }, 2000)
    } else {
      console.log("Formulaire invalide", this.erreurs)
    }
  }

  // Méthode pour obtenir le nom du gouvernorat à partir de son ID
  getNomGouvernorat(id: number): string {
    const gouvernorat = this.gouvernorats.find((g) => g.id === id)
    return gouvernorat ? gouvernorat.nom : ""
  }

  // Méthode pour obtenir le nom de la délégation à partir de son ID
  getNomDelegation(id: number): string {
    const delegation = this.delegations.find((d) => d.id === id)
    return delegation ? delegation.nom : ""
  }
}