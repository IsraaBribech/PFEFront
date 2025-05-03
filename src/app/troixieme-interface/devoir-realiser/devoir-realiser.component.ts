import { Component, type OnInit, type OnDestroy, HostListener } from "@angular/core"
import  { Router } from "@angular/router"
import  { HttpClient } from "@angular/common/http"
import  { DevoirService } from "../../devoir.service"
import  { SoumissionsService } from "../../soumissions.service"
import  { CoursService, Cours } from "../../cours.service"
import  { EnseignantService } from "../../enseignant.service"
import  { AuthService, StudentInfo } from "../../auth.service"
import  { NotificationService, AcademicNotification, MessageNotification } from "../../notification.service"
import  { Subscription } from "rxjs"

interface Devoir {
  id: string
  titre: string
  description: string
  matiere: string
  enseignant: string
  dateCreation: Date
  dateLimite: Date
  fichierConsigne: string
  soumis: boolean
  dateSoumission?: Date
  fichierSoumis?: string
  note?: number
  commentaire?: string
  couleur: string
  icon: string
  type: "cours" | "td" | "tp"
}

interface Matiere {
  nom: string
  couleur: string
  icon: string
  enseignants: {
    cours: string
    td: string
    tp: string
  }
}

// Définir l'interface Enseignant
interface Enseignant {
  _id: string
  nom: string
  prenom: string
  email: string
  departement: string
  grade: string
}

@Component({
  selector: "app-devoir-realiser",
  templateUrl: "./devoir-realiser.component.html",
  styleUrls: ["./devoir-realiser.component.css"],
})
export class DevoirRealiserComponent implements OnInit, OnDestroy {
  // Informations de l'étudiant
  etudiantName = ""
  etudiantEmail = ""
  etudiantMatricule = ""
  etudiantId = ""

  // Informations académiques de l'étudiant
  departement = ""
  specialite = ""
  niveau = ""
  groupe = ""

  // Informations de l'étudiant
  studentInfo: StudentInfo | null = null

  // Onglet actif
  activeSemester: "semestre1" | "semestre2" = "semestre1"

  // Filtres
  searchTerm = ""
  matiereFilter = ""
  typeFilter = ""

  // Tri
  sortColumn = "dateLimite"
  sortDirection = "asc"

  // Modal de soumission
  showSoumissionModal = false
  selectedDevoir: Devoir | null = null
  fichierAEnvoyer: File | null = null
  isSubmitting = false
  confirmationMessage = ""
  commentaire = ""

  // Notifications
  academicNotifications: AcademicNotification[] = []
  messageNotifications: MessageNotification[] = []
  unreadAcademicCount = 0
  unreadMessageCount = 0
  activeNotificationTab: "academic" | "message" = "academic"
  showNotificationDropdown = false

  // Abonnements pour les notifications
  private academicNotificationsSubscription: Subscription | null = null
  private messageNotificationsSubscription: Subscription | null = null
  private unreadAcademicCountSubscription: Subscription | null = null
  private unreadMessageCountSubscription: Subscription | null = null

  // Matières
  matieresSemestre1: Matiere[] = []
  matieresSemestre2: Matiere[] = []

  // Devoirs
  devoirsSemestre1: Devoir[] = []
  devoirsSemestre2: Devoir[] = []
  filteredDevoirs: Devoir[] = []

  // Cours
  coursList: Cours[] = []
  isLoading = true
  errorMessage = ""

  // Ajouter cette propriété pour stocker les enseignants
  enseignants: Enseignant[] = []

  constructor(
    private router: Router,
    private devoirService: DevoirService,
    private soumissionsService: SoumissionsService,
    private coursService: CoursService,
    private enseignantService: EnseignantService,
    private http: HttpClient,
    private authService: AuthService,
    private notificationService: NotificationService, // Ajouter le service de notification
  ) {}

  // Modifier la méthode ngOnInit pour charger également les enseignants
  ngOnInit(): void {
    this.loadStudentInfo() // Charger les informations de l'étudiant
    this.loadCours()
    this.loadEnseignants() // Ajouter cette ligne
    this.loadDevoirs()
    this.loadRealNotifications() // Remplacer loadNotifications par loadRealNotifications
    this.loadSoumissions() // Ajouter cette ligne pour charger les soumissions
  }

  // Ajouter la méthode ngOnDestroy pour se désabonner
  ngOnDestroy(): void {
    // Se désabonner de tous les observables
    if (this.academicNotificationsSubscription) {
      this.academicNotificationsSubscription.unsubscribe()
    }
    if (this.messageNotificationsSubscription) {
      this.messageNotificationsSubscription.unsubscribe()
    }
    if (this.unreadAcademicCountSubscription) {
      this.unreadAcademicCountSubscription.unsubscribe()
    }
    if (this.unreadMessageCountSubscription) {
      this.unreadMessageCountSubscription.unsubscribe()
    }
  }

  // Remplacer la méthode loadStudentInfo() par cette version corrigée
  loadStudentInfo(): void {
    console.log("Chargement des informations de l'étudiant...")

    // getStudentInfo() retourne directement un StudentInfo | null, pas un Observable
    this.studentInfo = this.authService.getStudentInfo()

    if (this.studentInfo) {
      console.log("Informations de l'étudiant récupérées:", this.studentInfo)
      this.updateStudentInfo()
    } else {
      console.warn("Aucune information d'étudiant retournée")
      // Utiliser des valeurs par défaut
      this.etudiantName = "Israa Bribech"
      this.etudiantEmail = "israabribech2002@gmail.com"
      this.etudiantMatricule = "E12345"
      this.etudiantId = "67c4c2f07fe25e5361a1e1bf" // ID par défaut pour les tests
    }
  }

  // Remplacer la méthode updateStudentInfo() par cette version corrigée
  updateStudentInfo(): void {
    if (this.studentInfo) {
      // Mettre à jour les informations de base
      // Utiliser name au lieu de prenom/nom
      this.etudiantName = this.studentInfo.name || "Nom non disponible"
      this.etudiantEmail = this.studentInfo.email || "Email non disponible"
      this.etudiantMatricule = this.studentInfo.matricule || "Matricule non disponible"
      this.etudiantId = this.studentInfo._id || "67c4c2f07fe25e5361a1e1bf" // ID par défaut si non disponible

      // Mettre à jour les informations académiques en utilisant les noms de propriétés corrects
      this.departement = this.studentInfo.department || ""
      this.specialite = this.studentInfo.specialty || ""
      this.niveau = this.studentInfo.level || ""
      this.groupe = this.studentInfo.group || ""

      console.log("Informations de l'étudiant mises à jour:", {
        nom: this.etudiantName,
        email: this.etudiantEmail,
        matricule: this.etudiantMatricule,
        id: this.etudiantId,
        departement: this.departement,
        specialite: this.specialite,
        niveau: this.niveau,
        groupe: this.groupe,
      })
    }
  }

  // Modifier cette méthode pour utiliser le service de soumissions
  loadSoumissions(): void {
    if (!this.etudiantId) {
      console.warn("ID étudiant non disponible, impossible de charger les soumissions")
      return
    }

    console.log(`Chargement des soumissions pour l'étudiant ${this.etudiantId}...`)

    this.soumissionsService.getSoumissionsByEtudiant(this.etudiantId).subscribe({
      next: (response) => {
        if (response && response.data) {
          const soumissions = response.data
          console.log(`${soumissions.length} soumissions chargées:`, soumissions)

          // Mettre à jour les devoirs avec les informations de soumission
          this.updateDevoirsWithSoumissions(soumissions)
        } else {
          console.warn("Format de réponse inattendu pour les soumissions:", response)
        }
      },
      error: (error) => {
        console.error("Erreur lors du chargement des soumissions:", error)
      },
    })
  }

  // Ajouter cette méthode pour mettre à jour les devoirs avec les informations de soumission
  updateDevoirsWithSoumissions(soumissions: any[]): void {
    console.log("Mise à jour des devoirs avec les informations de soumission...")

    // Créer un map des soumissions par devoir pour un accès rapide
    const soumissionsMap = new Map<string, any>()
    soumissions.forEach((soumission) => {
      soumissionsMap.set(soumission.devoirId, soumission)
    })

    // Mettre à jour les devoirs du semestre 1
    this.devoirsSemestre1 = this.devoirsSemestre1.map((devoir) => {
      const soumission = soumissionsMap.get(devoir.id)
      if (soumission) {
        console.log(
          `Devoir "${devoir.titre}" a été soumis le ${new Date(soumission.dateSoumission).toLocaleDateString()}`,
        )
        return {
          ...devoir,
          soumis: true,
          dateSoumission: new Date(soumission.dateSoumission),
          fichierSoumis: soumission.fichier ? this.soumissionsService.getSoumissionFileUrl(soumission._id) : undefined,
          note: soumission.note,
          commentaire: soumission.feedback,
        }
      }
      return devoir
    })

    // Mettre à jour les devoirs du semestre 2
    this.devoirsSemestre2 = this.devoirsSemestre2.map((devoir) => {
      const soumission = soumissionsMap.get(devoir.id)
      if (soumission) {
        console.log(
          `Devoir "${devoir.titre}" a été soumis le ${new Date(soumission.dateSoumission).toLocaleDateString()}`,
        )
        return {
          ...devoir,
          soumis: true,
          dateSoumission: new Date(soumission.dateSoumission),
          fichierSoumis: soumission.fichier ? this.soumissionsService.getSoumissionFileUrl(soumission._id) : undefined,
          note: soumission.note,
          commentaire: soumission.feedback,
        }
      }
      return devoir
    })

    // Mettre à jour les devoirs filtrés
    this.filterDevoirs()
  }

  // Modifier la méthode loadEnseignants pour ajouter plus de logs et de gestion d'erreurs
  loadEnseignants(): void {
    console.log("Début du chargement des enseignants...")

    this.enseignantService.getAllEnseignants().subscribe({
      next: (enseignants) => {
        if (!enseignants || enseignants.length === 0) {
          console.warn("Aucun enseignant retourné par l'API")
          this.enseignants = this.getDefaultEnseignants()
          return
        }

        this.enseignants = enseignants
        console.log(`${this.enseignants.length} enseignants chargés:`, this.enseignants)

        // Vérifier si les enseignants ont les propriétés attendues
        const sampleEnseignant = this.enseignants[0]
        console.log("Structure d'un enseignant:", {
          id: sampleEnseignant._id,
          nom: sampleEnseignant.nom,
          prenom: sampleEnseignant.prenom,
        })

        // Mettre à jour les devoirs avec les noms d'enseignants
        if (this.devoirsSemestre1.length > 0 || this.devoirsSemestre2.length > 0) {
          console.log("Mise à jour des devoirs avec les noms d'enseignants...")
          this.updateDevoirsWithEnseignantNames()
        }
      },
      error: (error) => {
        console.error("Erreur lors du chargement des enseignants:", error)
        // Créer des enseignants de test en cas d'erreur
        this.enseignants = this.getDefaultEnseignants()
        console.log("Utilisation des enseignants par défaut:", this.enseignants)
      },
    })
  }

  // Ajouter cette méthode pour créer des enseignants de test
  getDefaultEnseignants(): any[] {
    return [
      { _id: "1", nom: "Dupont", prenom: "Jean", email: "jean.dupont@univ.fr", departement: "1", grade: "Professeur" },
      {
        _id: "2",
        nom: "Martin",
        prenom: "Sophie",
        email: "sophie.martin@univ.fr",
        departement: "1",
        grade: "Maître Assistant",
      },
      {
        _id: "3",
        nom: "Bernard",
        prenom: "Michel",
        email: "michel.bernard@univ.fr",
        departement: "2",
        grade: "Assistant",
      },
      {
        _id: "4",
        nom: "Petit",
        prenom: "Claire",
        email: "claire.petit@univ.fr",
        departement: "2",
        grade: "Professeur",
      },
      {
        _id: "5",
        nom: "Robert",
        prenom: "Thomas",
        email: "thomas.robert@univ.fr",
        departement: "3",
        grade: "Maître Assistant",
      },
    ]
  }

  // Améliorer la méthode updateDevoirsWithEnseignantNames pour ajouter des logs
  updateDevoirsWithEnseignantNames(): void {
    console.log("Mise à jour des noms d'enseignants dans les devoirs...")

    // Mettre à jour les devoirs du semestre 1
    this.devoirsSemestre1 = this.devoirsSemestre1.map((devoir) => {
      const originalEnseignant = devoir.enseignant
      const newEnseignant = this.getEnseignantName(devoir.enseignant)

      if (originalEnseignant !== newEnseignant) {
        console.log(`Devoir "${devoir.titre}": Enseignant ${originalEnseignant} -> ${newEnseignant}`)
      }

      return {
        ...devoir,
        enseignant: newEnseignant,
      }
    })

    // Mettre à jour les devoirs du semestre 2
    this.devoirsSemestre2 = this.devoirsSemestre2.map((devoir) => {
      const originalEnseignant = devoir.enseignant
      const newEnseignant = this.getEnseignantName(devoir.enseignant)

      if (originalEnseignant !== newEnseignant) {
        console.log(`Devoir "${devoir.titre}": Enseignant ${originalEnseignant} -> ${newEnseignant}`)
      }

      return {
        ...devoir,
        enseignant: newEnseignant,
      }
    })

    // Mettre à jour les devoirs filtrés
    this.filterDevoirs()
  }

  // Méthode pour charger les cours depuis le service
  loadCours(): void {
    this.isLoading = true
    this.coursService.getCours().subscribe({
      next: (cours) => {
        this.coursList = cours
        console.log("Cours chargés:", this.coursList)
        this.initializeMatieresFromCours()
        this.isLoading = false
      },
      error: (error) => {
        console.error("Erreur lors du chargement des cours:", error)
        this.errorMessage = "Impossible de charger les cours. Veuillez réessayer plus tard."
        this.isLoading = false
      },
    })
  }

  // Méthode pour initialiser les matières à partir des cours
  initializeMatieresFromCours(): void {
    // Réinitialiser les matières
    this.matieresSemestre1 = []
    this.matieresSemestre2 = []

    // Couleurs et icônes par défaut pour les matières
    const defaultColors = ["#6366f1", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444", "#0ea5e9"]
    const defaultIcons = ["fa-code", "fa-database", "fa-sitemap", "fa-js", "fa-server", "fa-cubes"]

    // Grouper les cours par semestre
    const coursSemestre1 = this.coursList.filter((cours) => cours.semestre === 1)
    const coursSemestre2 = this.coursList.filter((cours) => cours.semestre === 2)

    // Créer les matières pour le semestre 1
    coursSemestre1.forEach((cours, index) => {
      const colorIndex = index % defaultColors.length
      const iconIndex = index % defaultIcons.length

      this.matieresSemestre1.push({
        nom: cours.titre,
        couleur: defaultColors[colorIndex],
        icon: defaultIcons[iconIndex],
        enseignants: {
          cours: "Prof. " + (cours.titre.split(" ")[0] || "Inconnu"),
          td: "M. Assistant",
          tp: "Mme. Assistante",
        },
      })
    })

    // Créer les matières pour le semestre 2
    coursSemestre2.forEach((cours, index) => {
      const colorIndex = index % defaultColors.length
      const iconIndex = index % defaultIcons.length

      this.matieresSemestre2.push({
        nom: cours.titre,
        couleur: defaultColors[colorIndex],
        icon: defaultIcons[iconIndex],
        enseignants: {
          cours: "Prof. " + (cours.titre.split(" ")[0] || "Inconnu"),
          td: "M. Assistant",
          tp: "Mme. Assistante",
        },
      })
    })

    // Si aucune matière n'a été créée, utiliser des données par défaut
    if (this.matieresSemestre1.length === 0) {
      this.matieresSemestre1 = this.getDefaultMatieresSemestre1()
    }
    if (this.matieresSemestre2.length === 0) {
      this.matieresSemestre2 = this.getDefaultMatieresSemestre2()
    }
  }

  // Modifier la méthode processDevoirs pour mieux gérer les IDs d'enseignants
  processDevoirs(devoirs: any[]): void {
    // Réinitialiser les tableaux de devoirs
    this.devoirsSemestre1 = []
    this.devoirsSemestre2 = []

    console.log("Traitement des devoirs:", devoirs)

    devoirs.forEach((devoir) => {
      // Déterminer le semestre en fonction des données du devoir
      const semestre =
        devoir.semestre || (devoir.courId && this.coursList.find((c) => c._id === devoir.courId)?.semestre) || 1

      // Récupérer le nom de la matière
      let matiereName = "Non spécifié"
      if (devoir.courId) {
        const cours = this.coursList.find((c) => c._id === devoir.courId)
        if (cours) {
          matiereName = cours.titre
        }
      } else if (devoir.matiere) {
        matiereName = devoir.matiere
      } else if (devoir.courTitle) {
        matiereName = devoir.courTitle
      }

      // Récupérer l'ID de l'enseignant
      // Ajouter des logs pour voir ce que contient réellement le devoir
      console.log(`Devoir ID ${devoir._id || devoir.id} - Données enseignant:`, {
        enseignantId: devoir.enseignantId,
        enseignant: devoir.enseignant,
      })

      // Récupérer l'ID de l'enseignant avec plus de robustesse
      let enseignantId = "Non spécifié"

      if (devoir.enseignantId) {
        enseignantId = devoir.enseignantId
        console.log(`Utilisation de enseignantId: ${enseignantId}`)
      } else if (devoir.enseignant && typeof devoir.enseignant === "object" && devoir.enseignant._id) {
        enseignantId = devoir.enseignant._id
        console.log(`Utilisation de enseignant._id: ${enseignantId}`)
      } else if (devoir.enseignant && typeof devoir.enseignant === "string") {
        enseignantId = devoir.enseignant
        console.log(`Utilisation de enseignant (string): ${enseignantId}`)
      }

      // Créer un objet Devoir à partir des données de l'API
      const devoirObj: Devoir = {
        id: devoir._id || devoir.id,
        titre: devoir.title || devoir.titre,
        description: devoir.description || "Aucune description disponible",
        matiere: matiereName,
        enseignant: enseignantId, // Temporairement l'ID, sera remplacé par le nom plus tard
        dateCreation: new Date(devoir.dateCreation || devoir.createdAt || new Date()),
        dateLimite: new Date(devoir.dueDate || devoir.dateLimite || new Date()),
        fichierConsigne: this.getFichierUrl(devoir),
        soumis: devoir.soumis || false,
        couleur: this.getMatiereColor(matiereName),
        icon: this.getMatiereIcon(matiereName),
        type: this.determineType(devoir),
      }

      // Ajouter le devoir au semestre correspondant
      if (semestre === 1) {
        this.devoirsSemestre1.push(devoirObj)
      } else {
        this.devoirsSemestre2.push(devoirObj)
      }
    })

    console.log("Devoirs traités:", {
      semestre1: this.devoirsSemestre1.length,
      semestre2: this.devoirsSemestre2.length,
    })

    // Mettre à jour les noms des enseignants si les enseignants sont déjà chargés
    if (this.enseignants && this.enseignants.length > 0) {
      this.updateDevoirsWithEnseignantNames()
    }
  }

  // Méthode pour charger les devoirs depuis le service
  loadDevoirs(): void {
    this.devoirService.getDevoirs().subscribe({
      next: (response) => {
        if (response && response.data) {
          const devoirs = response.data

          // Traiter les devoirs et les répartir par semestre
          this.processDevoirs(devoirs)
          this.filterDevoirs()
        } else {
          console.log("Aucun devoir trouvé ou format de réponse incorrect")
          this.initializeDevoirs() // Utiliser des données de test si aucun devoir n'est trouvé
        }
      },
      error: (error) => {
        console.error("Erreur lors du chargement des devoirs:", error)
        this.initializeDevoirs() // Utiliser des données de test en cas d'erreur
      },
    })
  }

  // Méthode pour déterminer le type de devoir
  determineType(devoir: any): "cours" | "td" | "tp" {
    if (devoir.type) {
      if (devoir.type.toLowerCase().includes("td")) return "td"
      if (devoir.type.toLowerCase().includes("tp")) return "tp"
      return "cours"
    }

    // Par défaut, retourner 'cours'
    return "cours"
  }

  // Remplacer la méthode getEnseignantName par cette version améliorée
  getEnseignantName(enseignantId: string): string {
    if (!enseignantId) return "Non spécifié"

    // Si l'enseignant n'est pas un ID mais déjà un nom (pour la compatibilité)
    if (typeof enseignantId === "string" && enseignantId.includes(" ")) {
      return enseignantId
    }

    // Vérifier si nous avons des enseignants chargés
    if (this.enseignants && this.enseignants.length > 0) {
      // Chercher l'enseignant dans la liste des enseignants chargés
      const enseignant = this.enseignants.find((e) => e._id === enseignantId)
      if (enseignant) {
        return `${enseignant.prenom} ${enseignant.nom}`
      }
    }

    // Ajouter des logs pour le débogage
    console.log(`Enseignant non trouvé pour l'ID: ${enseignantId}`)
    console.log(`Liste des enseignants disponibles:`, this.enseignants)

    // Si l'ID ressemble à un ObjectId MongoDB (24 caractères hexadécimaux)
    if (typeof enseignantId === "string" && /^[0-9a-fA-F]{24}$/.test(enseignantId)) {
      return `Enseignant #${enseignantId.substring(0, 5)}`
    }

    // Pour tout autre format d'ID
    return `Enseignant ${enseignantId}`
  }

  // Méthode pour obtenir l'URL du fichier de consigne
  getFichierUrl(devoir: any): string {
    if (devoir.fichier && devoir.fichier.chemin) {
      return `http://localhost:5000${devoir.fichier.chemin}`
    }

    // URL par défaut si aucun fichier n'est spécifié
    return `assets/devoirs/default/consigne.pdf`
  }

  // Modifier la méthode getMatiereColor pour utiliser le nom de la matière au lieu de l'ID du cours
  getMatiereColor(matiereName: string): string {
    if (!matiereName) return "#6366f1" // Couleur par défaut

    // Chercher dans les matières du semestre 1
    const matiereSem1 = this.matieresSemestre1.find((m) => m.nom === matiereName)
    if (matiereSem1) return matiereSem1.couleur

    // Chercher dans les matières du semestre 2
    const matiereSem2 = this.matieresSemestre2.find((m) => m.nom === matiereName)
    if (matiereSem2) return matiereSem2.couleur

    // Générer une couleur cohérente basée sur le nom de la matière
    return this.getRandomColor(matiereName)
  }

  // Modifier la méthode getMatiereIcon pour utiliser le nom de la matière au lieu de l'ID du cours
  getMatiereIcon(matiereName: string): string {
    if (!matiereName) return "fa-book" // Icône par défaut

    // Chercher dans les matières du semestre 1
    const matiereSem1 = this.matieresSemestre1.find((m) => m.nom === matiereName)
    if (matiereSem1) return matiereSem1.icon

    // Chercher dans les matières du semestre 2
    const matiereSem2 = this.matieresSemestre2.find((m) => m.nom === matiereName)
    if (matiereSem2) return matiereSem2.icon

    // Déterminer l'icône en fonction du nom de la matière
    const matiereLower = matiereName.toLowerCase()

    if (matiereLower.includes("web") || matiereLower.includes("html") || matiereLower.includes("css")) {
      return "fa-code"
    } else if (matiereLower.includes("base") && matiereLower.includes("donn")) {
      return "fa-database"
    } else if (matiereLower.includes("algo")) {
      return "fa-sitemap"
    } else if (matiereLower.includes("javascript") || matiereLower.includes("js")) {
      return "fa-js"
    } else if (matiereLower.includes("back") || matiereLower.includes("server")) {
      return "fa-server"
    } else if (matiereLower.includes("archi")) {
      return "fa-cubes"
    } else {
      return "fa-book"
    }
  }

  // Méthode pour générer une couleur aléatoire cohérente basée sur le nom de la matière
  getRandomColor(matiereName: string): string {
    let hash = 0
    for (let i = 0; i < matiereName.length; i++) {
      hash = matiereName.charCodeAt(i) + ((hash << 5) - hash)
    }

    const hue = hash % 360
    return `hsl(${hue}, 70%, 60%)`
  }

  // Écouteur d'événement pour fermer le dropdown quand on clique ailleurs
  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent): void {
    // Vérifier si le clic est en dehors du dropdown
    const target = event.target as HTMLElement
    if (!target.closest(".notification-btn") && !target.closest(".notification-dropdown")) {
      this.closeNotificationDropdown()
    }
  }

  // Remplacer la méthode loadNotifications par loadRealNotifications
  loadRealNotifications(): void {
    if (!this.etudiantId) {
      console.warn("ID étudiant non disponible, impossible de charger les notifications")
      return
    }

    console.log(`Chargement des notifications pour l'étudiant ${this.etudiantId}...`)

    // S'abonner aux notifications académiques
    this.academicNotificationsSubscription = this.notificationService.academicNotifications$.subscribe(
      (notifications) => {
        this.academicNotifications = notifications
        console.log(`${notifications.length} notifications académiques chargées`)
      },
    )

    // S'abonner aux notifications de messages
    this.messageNotificationsSubscription = this.notificationService.messageNotifications$.subscribe(
      (notifications) => {
        this.messageNotifications = notifications
        console.log(`${notifications.length} notifications de messages chargées`)
      },
    )

    // S'abonner aux compteurs de notifications non lues
    this.unreadAcademicCountSubscription = this.notificationService.unreadAcademicCount$.subscribe((count) => {
      this.unreadAcademicCount = count
      console.log(`${count} notifications académiques non lues`)
    })

    this.unreadMessageCountSubscription = this.notificationService.unreadMessageCount$.subscribe((count) => {
      this.unreadMessageCount = count
      console.log(`${count} notifications de messages non lues`)
    })

    // Charger les notifications depuis le service
    this.notificationService.loadAllNotifications(this.etudiantId, "etudiant").subscribe({
      next: (result) => {
        console.log("Notifications chargées avec succès:", result)
      },
      error: (error) => {
        console.error("Erreur lors du chargement des notifications:", error)
      },
    })
  }

  // Ajouter la méthode pour définir l'onglet actif
  setActiveNotificationTab(tab: "academic" | "message"): void {
    this.activeNotificationTab = tab
  }

  // Remplacer la méthode getUnreadNotificationsCount
  getUnreadNotificationsCount(): number {
    return this.unreadAcademicCount + this.unreadMessageCount
  }

  // Ajouter la méthode pour marquer une notification académique comme lue
  markAcademicNotificationAsRead(notification: AcademicNotification): void {
    this.notificationService.markAcademicNotificationAsRead(notification.id).subscribe({
      next: () => {
        console.log(`Notification académique ${notification.id} marquée comme lue`)
        this.navigateToDestination(notification)
      },
      error: (error) => {
        console.error(`Erreur lors du marquage de la notification académique ${notification.id} comme lue:`, error)
      },
    })
  }

  // Ajouter la méthode pour marquer une notification de message comme lue
  markMessageNotificationAsRead(notification: MessageNotification): void {
    this.notificationService.markMessageNotificationAsRead(notification.id).subscribe({
      next: () => {
        console.log(`Notification de message ${notification.id} marquée comme lue`)
        this.navigateToForum(notification)
      },
      error: (error) => {
        console.error(`Erreur lors du marquage de la notification de message ${notification.id} comme lue:`, error)
      },
    })
  }

  // Ajouter la méthode pour marquer toutes les notifications comme lues
  markAllNotificationsAsRead(): void {
    if (!this.etudiantId) return

    if (this.activeNotificationTab === "academic") {
      this.notificationService.markAllAcademicNotificationsAsRead(this.etudiantId, "etudiant").subscribe({
        next: () => console.log("Toutes les notifications académiques marquées comme lues"),
        error: (error) =>
          console.error("Erreur lors du marquage de toutes les notifications académiques comme lues:", error),
      })
    } else {
      this.notificationService.markAllMessageNotificationsAsRead(this.etudiantId, "etudiant").subscribe({
        next: () => console.log("Toutes les notifications de messages marquées comme lues"),
        error: (error) =>
          console.error("Erreur lors du marquage de toutes les notifications de messages comme lues:", error),
      })
    }
  }

  // Ajouter la méthode pour naviguer vers la destination d'une notification académique
  navigateToDestination(notification: AcademicNotification): void {
    this.closeNotificationDropdown()

    switch (notification.type) {
      case "cours":
        this.router.navigate(["/troixieme-interface/cour-suivie"], {
          queryParams: { id: notification.linkedId },
        })
        break
      case "devoir":
        // Rester sur la page actuelle mais peut-être filtrer pour montrer le devoir spécifique
        const devoir = [...this.devoirsSemestre1, ...this.devoirsSemestre2].find((d) => d.id === notification.linkedId)
        if (devoir) {
          this.openSoumissionModal(devoir)
        }
        break
      case "quiz":
        this.router.navigate(["/troixieme-interface/quiz-repond"], {
          queryParams: { id: notification.linkedId },
        })
        break
      case "soumission":
        // Peut-être afficher les détails de la soumission
        break
      default:
        this.router.navigate(["/troixieme-interface/notification"])
    }
  }

  // Ajouter la méthode pour naviguer vers le forum pour une notification de message
  navigateToForum(notification: MessageNotification): void {
    this.closeNotificationDropdown()
    this.router.navigate(["/troixieme-interface/message-envoyer"], {
      queryParams: {
        messageId: notification.messageId,
        sujetId: notification.sujetId,
      },
    })
  }

  // Conserver la méthode navigateToNotifications existante
  navigateToNotifications(): void {
    this.router.navigate(["/troixieme-interface/notification"])
    this.closeNotificationDropdown()
  }

  // Méthode pour afficher/masquer le dropdown de notifications
  toggleNotificationDropdown(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation()
    }
    this.showNotificationDropdown = !this.showNotificationDropdown
  }

  // Méthode pour fermer le dropdown si on clique ailleurs
  closeNotificationDropdown(): void {
    this.showNotificationDropdown = false
  }

  // Méthode pour obtenir l'icône en fonction du type de notification
  getNotificationIcon(type: string): string {
    switch (type) {
      case "cours":
        return "fa-book"
      case "devoir":
        return "fa-tasks"
      case "quiz":
        return "fa-question-circle"
      case "soumission":
        return "fa-check-circle"
      case "message":
        return "fa-comment"
      default:
        return "fa-bell"
    }
  }

  // Méthode pour formater le temps écoulé
  formatTimeAgo(date: Date): string {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) {
      return "À l'instant"
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60)
    if (diffInMinutes < 60) {
      return `Il y a ${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""}`
    }

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) {
      return `Il y a ${diffInHours} heure${diffInHours > 1 ? "s" : ""}`
    }

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) {
      return `Il y a ${diffInDays} jour${diffInDays > 1 ? "s" : ""}`
    }

    return this.formatDate(date)
  }

  // Méthodes pour les matières par défaut (utilisées si l'API ne renvoie pas de données)
  getDefaultMatieresSemestre1(): Matiere[] {
    return [
      {
        nom: "Programmation Web",
        couleur: "#6366f1",
        icon: "fa-code",
        enseignants: {
          cours: "Dr. Martin Dupont",
          td: "Mme. Sophie Laurent",
          tp: "M. Jean Petit",
        },
      },
      {
        nom: "Bases de données",
        couleur: "#f59e0b",
        icon: "fa-database",
        enseignants: {
          cours: "Prof. Claire Dubois",
          td: "M. Thomas Bernard",
          tp: "Mme. Marie Leroy",
        },
      },
      {
        nom: "Algorithmes avancés",
        couleur: "#10b981",
        icon: "fa-sitemap",
        enseignants: {
          cours: "Dr. Philippe Martin",
          td: "M. Alexandre Blanc",
          tp: "Mme. Julie Moreau",
        },
      },
    ]
  }

  getDefaultMatieresSemestre2(): Matiere[] {
    return [
      {
        nom: "Frameworks JavaScript",
        couleur: "#8b5cf6",
        icon: "fa-js",
        enseignants: {
          cours: "Dr. Julien Moreau",
          td: "Mme. Claire Dubois",
          tp: "M. Thomas Bernard",
        },
      },
      {
        nom: "Développement Backend",
        couleur: "#10b981",
        icon: "fa-server",
        enseignants: {
          cours: "Prof. Lucie Girard",
          td: "M. Philippe Martin",
          tp: "Dr. Marc Dubois",
        },
      },
      {
        nom: "Architecture logicielle",
        couleur: "#f59e0b",
        icon: "fa-cubes",
        enseignants: {
          cours: "Dr. Marc Dubois",
          td: "Prof. Antoine Rousseau",
          tp: "Mme. Nathalie Mercier",
        },
      },
    ]
  }

  // Initialiser les devoirs à partir des données par défaut
  initializeDevoirs(): void {
    // Générer les devoirs pour le semestre 1
    this.devoirsSemestre1 = []
    this.matieresSemestre1.forEach((matiere) => {
      // Devoir de cours
      this.devoirsSemestre1.push({
        id: `s1-${matiere.nom}-cours`,
        titre: `Examen de ${matiere.nom}`,
        description: `Examen théorique sur les concepts fondamentaux de ${matiere.nom}.`,
        matiere: matiere.nom,
        enseignant: matiere.enseignants.cours,
        dateCreation: new Date(2023, 8, 5),
        dateLimite: new Date(2023, 9, 15),
        fichierConsigne: `assets/devoirs/${this.slugify(matiere.nom)}/examen.pdf`,
        soumis: false,
        couleur: matiere.couleur,
        icon: matiere.icon,
        type: "cours",
      })

      // Devoir de TD
      this.devoirsSemestre1.push({
        id: `s1-${matiere.nom}-td`,
        titre: `Exercices de TD - ${matiere.nom}`,
        description: `Série d'exercices pratiques sur ${matiere.nom}.`,
        matiere: matiere.nom,
        enseignant: matiere.enseignants.td,
        dateCreation: new Date(2023, 8, 10),
        dateLimite: new Date(2023, 9, 20),
        fichierConsigne: `assets/devoirs/${this.slugify(matiere.nom)}/td/exercices.pdf`,
        soumis: Math.random() > 0.5, // Aléatoirement soumis ou non
        dateSoumission: new Date(2023, 9, 18),
        fichierSoumis: `assets/soumissions/${this.slugify(matiere.nom)}/td/exercices.pdf`,
        note: Math.floor(Math.random() * 6) + 14, // Note entre 14 et 19
        commentaire: "Bon travail, mais quelques points à améliorer.",
        couleur: matiere.couleur,
        icon: matiere.icon,
        type: "td",
      })

      // Devoir de TP
      this.devoirsSemestre1.push({
        id: `s1-${matiere.nom}-tp`,
        titre: `Projet de TP - ${matiere.nom}`,
        description: `Projet pratique sur ${matiere.nom}.`,
        matiere: matiere.nom,
        enseignant: matiere.enseignants.tp,
        dateCreation: new Date(2023, 9, 1),
        dateLimite: new Date(2023, 10, 5),
        fichierConsigne: `assets/devoirs/${this.slugify(matiere.nom)}/tp/projet.pdf`,
        soumis: false,
        couleur: matiere.couleur,
        icon: matiere.icon,
        type: "tp",
      })
    })

    // Générer les devoirs pour le semestre 2
    this.devoirsSemestre2 = []
    this.matieresSemestre2.forEach((matiere) => {
      // Devoir de cours
      this.devoirsSemestre2.push({
        id: `s2-${matiere.nom}-cours`,
        titre: `Examen de ${matiere.nom}`,
        description: `Examen théorique sur les concepts fondamentaux de ${matiere.nom}.`,
        matiere: matiere.nom,
        enseignant: matiere.enseignants.cours,
        dateCreation: new Date(2024, 1, 15),
        dateLimite: new Date(2024, 2, 15),
        fichierConsigne: `assets/devoirs/${this.slugify(matiere.nom)}/examen.pdf`,
        soumis: false,
        couleur: matiere.couleur,
        icon: matiere.icon,
        type: "cours",
      })

      // Devoir de TD
      this.devoirsSemestre2.push({
        id: `s2-${matiere.nom}-td`,
        titre: `Exercices de TD - ${matiere.nom}`,
        description: `Série d'exercices pratiques sur ${matiere.nom}.`,
        matiere: matiere.nom,
        enseignant: matiere.enseignants.td,
        dateCreation: new Date(2024, 1, 20),
        dateLimite: new Date(2024, 2, 20),
        fichierConsigne: `assets/devoirs/${this.slugify(matiere.nom)}/td/exercices.pdf`,
        soumis: false,
        couleur: matiere.couleur,
        icon: matiere.icon,
        type: "td",
      })

      // Devoir de TP
      this.devoirsSemestre2.push({
        id: `s2-${matiere.nom}-tp`,
        titre: `Projet de TP - ${matiere.nom}`,
        description: `Projet pratique sur ${matiere.nom}.`,
        matiere: matiere.nom,
        enseignant: matiere.enseignants.tp,
        dateCreation: new Date(2024, 1, 25),
        dateLimite: new Date(2024, 2, 25),
        fichierConsigne: `assets/devoirs/${this.slugify(matiere.nom)}/tp/projet.pdf`,
        soumis: false,
        couleur: matiere.couleur,
        icon: matiere.icon,
        type: "tp",
      })
    })
  }

  // Convertir un nom en slug pour les chemins de fichiers
  slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+/, "")
      .replace(/-+$/, "")
  }

  // Changer de semestre
  changeSemester(semester: "semestre1" | "semestre2"): void {
    this.activeSemester = semester
    this.filterDevoirs()
  }

  // Filtrer les devoirs
  filterDevoirs(): void {
    let devoirs = this.activeSemester === "semestre1" ? this.devoirsSemestre1 : this.devoirsSemestre2

    // Filtre par recherche
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase()
      devoirs = devoirs.filter(
        (devoir) =>
          devoir.titre.toLowerCase().includes(searchLower) ||
          devoir.description.toLowerCase().includes(searchLower) ||
          devoir.matiere.toLowerCase().includes(searchLower) ||
          devoir.enseignant.toLowerCase().includes(searchLower),
      )
    }

    // Filtre par matière
    if (this.matiereFilter) {
      devoirs = devoirs.filter((devoir) => devoir.matiere === this.matiereFilter)
    }

    // Filtre par type
    if (this.typeFilter) {
      devoirs = devoirs.filter((devoir) => devoir.type === this.typeFilter)
    }

    // Tri
    devoirs = this.sortDevoirs(devoirs)

    this.filteredDevoirs = devoirs
  }

  // Trier les devoirs
  sortTable(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc"
    } else {
      this.sortColumn = column
      this.sortDirection = "asc"
    }
    this.filterDevoirs()
  }

  // Obtenir l'icône de tri
  getSortIcon(column: string): string {
    if (this.sortColumn !== column) {
      return "fa-sort"
    }
    return this.sortDirection === "asc" ? "fa-sort-up" : "fa-sort-down"
  }

  // Trier les devoirs
  sortDevoirs(devoirs: Devoir[]): Devoir[] {
    return devoirs.sort((a, b) => {
      let comparison = 0

      switch (this.sortColumn) {
        case "enseignant":
          comparison = a.enseignant.localeCompare(b.enseignant)
          break
        case "matiere":
          comparison = a.matiere.localeCompare(b.matiere)
          break
        case "type":
          comparison = a.type.localeCompare(b.type)
          break
        case "dateCreation":
          comparison = a.dateCreation.getTime() - b.dateCreation.getTime()
          break
        case "dateLimite":
          comparison = a.dateLimite.getTime() - b.dateLimite.getTime()
          break
        default:
          comparison = a.dateLimite.getTime() - b.dateLimite.getTime()
      }

      return this.sortDirection === "asc" ? comparison : -comparison
    })
  }

  // Obtenir les matières uniques pour le semestre actif
  getUniqueMatieresForSemester(): string[] {
    const devoirs = this.activeSemester === "semestre1" ? this.devoirsSemestre1 : this.devoirsSemestre2
    const matieres = new Set<string>()
    devoirs.forEach((devoir) => matieres.add(devoir.matiere))
    return Array.from(matieres).sort()
  }

  // Ouvrir le modal de soumission
  openSoumissionModal(devoir: Devoir): void {
    this.selectedDevoir = devoir
    this.fichierAEnvoyer = null
    this.commentaire = ""
    this.confirmationMessage = ""
    this.showSoumissionModal = true
  }

  // Fermer le modal de soumission
  closeSoumissionModal(event: Event): void {
    if (
      event.target === event.currentTarget ||
      (event.target as HTMLElement).classList.contains("modal-close") ||
      (event.target as HTMLElement).classList.contains("btn-cancel")
    ) {
      this.showSoumissionModal = false
      this.selectedDevoir = null
      this.fichierAEnvoyer = null
      this.commentaire = ""
      this.confirmationMessage = ""
    }
  }

  // Gérer le fichier sélectionné
  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement
    if (target && target.files && target.files.length > 0) {
      const file = target.files[0]
      if (file) {
        // Vérifier le type de fichier (PDF ou image)
        if (file.type === "application/pdf" || file.type.startsWith("image/")) {
          this.fichierAEnvoyer = file
        } else {
          alert("Veuillez sélectionner un fichier PDF ou une image.")
          target.value = "" // Réinitialiser l'input file
        }
      }
    }
  }

  // Soumettre un devoir
  soumettreDevoir(): void {
    if (!this.fichierAEnvoyer || !this.selectedDevoir) {
      alert("Veuillez sélectionner un fichier à soumettre.")
      return
    }

    this.isSubmitting = true
    this.confirmationMessage = "" // Reset any previous message

    // Log the submission data for debugging
    console.log("Soumission de devoir:", {
      etudiantId: this.etudiantId,
      etudiantName: this.etudiantName,
      devoirId: this.selectedDevoir.id,
      fichier: this.fichierAEnvoyer.name,
      commentaire: this.commentaire,
    })

    // Vérifier la taille du fichier
    if (this.fichierAEnvoyer.size > 10 * 1024 * 1024) {
      // 10 MB
      this.confirmationMessage = "Le fichier est trop volumineux. La taille maximale est de 10 Mo."
      this.isSubmitting = false
      return
    }

    // Vérifier le type de fichier
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
    if (!allowedTypes.includes(this.fichierAEnvoyer.type)) {
      this.confirmationMessage = "Format de fichier non supporté. Veuillez utiliser PDF, JPG ou PNG."
      this.isSubmitting = false
      return
    }

    // Utiliser le service de soumissions pour soumettre le devoir
    this.soumissionsService
      .soumettreDevoir(
        this.etudiantId,
        this.etudiantName,
        this.selectedDevoir.id,
        this.fichierAEnvoyer,
        this.commentaire,
      )
      .subscribe({
        next: (response) => {
          console.log("Soumission réussie:", response)

          // Mettre à jour l'état du devoir
          if (this.selectedDevoir) {
            this.selectedDevoir.soumis = true
            this.selectedDevoir.dateSoumission = new Date()

            // Mettre à jour les devoirs filtrés
            this.updateDevoirInList(this.selectedDevoir)
            this.filterDevoirs()
          }

          // Afficher un message de confirmation
          this.confirmationMessage = "Votre devoir a été soumis avec succès !"
          this.isSubmitting = false

          // Recharger les soumissions après un court délai
          setTimeout(() => {
            this.loadSoumissions()
          }, 1000)
        },
        error: (error) => {
          console.error("Erreur lors de la soumission:", error)

          // Afficher le message d'erreur
          this.confirmationMessage = error.message || "Erreur lors de la soumission du devoir. Veuillez réessayer."
          this.isSubmitting = false
        },
      })
  }

  // Mettre à jour un devoir dans la liste
  updateDevoirInList(devoir: Devoir): void {
    // Mettre à jour dans la liste du semestre 1
    const index1 = this.devoirsSemestre1.findIndex((d) => d.id === devoir.id)
    if (index1 !== -1) {
      this.devoirsSemestre1[index1] = { ...devoir }
    }

    // Mettre à jour dans la liste du semestre 2
    const index2 = this.devoirsSemestre2.findIndex((d) => d.id === devoir.id)
    if (index2 !== -1) {
      this.devoirsSemestre2[index2] = { ...devoir }
    }
  }

  // Formater les dates
  formatDate(date: Date): string {
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  // Vérifier si un devoir est en retard
  isLate(devoir: Devoir): boolean {
    const today = new Date()
    return !devoir.soumis && today > devoir.dateLimite
  }

  // Vérifier si un devoir est proche de la date limite
  isCloseToDeadline(devoir: Devoir): boolean {
    const today = new Date()
    const diffTime = devoir.dateLimite.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return !devoir.soumis && diffDays <= 3 && diffDays > 0
  }

  // Obtenir le nombre de jours restants
  getJoursRestants(dateLimite: Date): number {
    const today = new Date()
    const diffTime = dateLimite.getTime() - today.getTime()
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
  }

  // Obtenir la classe CSS pour une ligne de tableau
  getRowClass(devoir: Devoir): string {
    if (devoir.soumis) {
      return "row-soumis"
    } else if (this.isLate(devoir)) {
      return "row-retard"
    } else if (this.isCloseToDeadline(devoir)) {
      return "row-proche"
    }
    return ""
  }

  // Obtenir le libellé pour un type de cours
  getTypeLabel(type: string): string {
    switch (type) {
      case "cours":
        return "Cours"
      case "td":
        return "TD"
      case "tp":
        return "TP"
      default:
        return type
    }
  }

  // Méthode pour télécharger un fichier
  telechargerFichier(devoir: Devoir): void {
    console.log(`Téléchargement du fichier pour le devoir: ${devoir.id} - ${devoir.titre}`)

    // Afficher un indicateur de chargement
    const loadingToast = document.createElement("div")
    loadingToast.className = "loading-toast"
    loadingToast.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Téléchargement en cours...'
    document.body.appendChild(loadingToast)

    // Utiliser le service pour télécharger le fichier
    this.devoirService.telechargerFichierConsigne(devoir.id).subscribe({
      next: (response: Blob) => {
        // Créer un URL pour le blob
        const url: string = window.URL.createObjectURL(response)

        // Extraire le nom du fichier à partir de l'URL ou utiliser un nom par défaut
        const filename = this.extraireNomFichier(devoir.fichierConsigne) || `consigne_${devoir.id}.pdf`

        // Créer un élément <a> pour déclencher le téléchargement
        const a = document.createElement("a")
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()

        // Nettoyer
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        document.body.removeChild(loadingToast)

        console.log(`Téléchargement réussi: ${filename}`)
      },
      error: (error) => {
        console.error("Erreur lors du téléchargement du fichier:", error)
        document.body.removeChild(loadingToast)

        // Afficher un message d'erreur
        const errorToast = document.createElement("div")
        errorToast.className = "error-toast"
        errorToast.innerHTML =
          '<i class="fas fa-exclamation-circle"></i> Erreur lors du téléchargement. Veuillez réessayer.'
        document.body.appendChild(errorToast)

        // Supprimer le message d'erreur après 3 secondes
        setTimeout(() => {
          document.body.removeChild(errorToast)
        }, 3000)

        // Si le fichier n'est pas disponible sur le serveur, essayer de le télécharger depuis l'URL directe
        if (devoir.fichierConsigne && devoir.fichierConsigne.startsWith("http")) {
          this.telechargerFichierDirectement(devoir.fichierConsigne, devoir.id)
        }
      },
    })
  }

  // Méthode pour extraire le nom du fichier à partir d'une URL
  extraireNomFichier(url: string): string {
    if (!url) return ""

    // Essayer d'extraire le nom du fichier de l'URL
    const urlParts = url.split("/")
    let filename = urlParts[urlParts.length - 1]

    // Supprimer les paramètres de requête s'il y en a
    if (filename.includes("?")) {
      filename = filename.split("?")[0]
    }

    return filename
  }

  // Méthode de secours pour télécharger directement depuis l'URL
  telechargerFichierDirectement(url: string, devoirId: string): void {
    console.log(`Tentative de téléchargement direct depuis: ${url}`)

    // Créer un élément <a> pour déclencher le téléchargement
    const a = document.createElement("a")
    a.href = url
    a.target = "_blank"
    a.download = `consigne_${devoirId}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // Méthode pour se déconnecter
  logout(): void {
    console.log("Déconnexion en cours...")
    this.authService.logout()
  }
}
