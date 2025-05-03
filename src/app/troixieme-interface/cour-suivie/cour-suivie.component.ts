import { Component, type OnInit, HostListener, type OnDestroy } from "@angular/core"
import  { Router } from "@angular/router"
import  { CoursService, Cours } from "../../cours.service"
import  { ChapitreService, Chapitre } from "../../chapitre.service"
import  { DepartementsService } from "../../departements.service"
import  { NiveauxService } from "../../niveaux.service"
import  { SpecialitesService } from "../../specialites.service"
import  { EnseignantService } from "../../enseignant.service"
import  { AuthService, StudentInfo } from "../../auth.service"
import  { NotificationService, AcademicNotification, MessageNotification } from "../../notification.service"
import { forkJoin, type Subscription } from "rxjs"

// Interface améliorée pour les chapitres UI
interface ChapitreUI {
  id: string
  titre: string
  description: string
  fichierPdf: string
  fichierNom: string
  dateCreation: Date
  taille: string
  enseignantNom: string
  semestre: string | number
}

interface TypeCours {
  enseignant: string
  chapitres: ChapitreUI[]
  disponible: boolean
}

interface Matiere {
  id: string
  nom: string
  credits: number
  heures: number
  couleur: string
  icon: string
  departement: string
  description?: string
  cours: TypeCours
  td: TypeCours
  tp: TypeCours
}

@Component({
  selector: "app-cour-suivie",
  templateUrl: "./cour-suivie.component.html",
  styleUrls: ["./cour-suivie.component.css"],
})
export class CourSuivieComponent implements OnInit, OnDestroy {
  // Informations de l'étudiant
  etudiantName = ""
  etudiantEmail = ""
  etudiantMatricule = ""

  // Informations académiques de l'étudiant
  department = ""
  specialty = ""
  level = ""
  group = ""

  // Informations de l'étudiant
  studentInfo: StudentInfo | null = null

  // Onglet actif
  activeSemester: "semestre1" | "semestre2" = "semestre1"

  // Type de contenu actif (cours, td, tp)
  activeContentType: "cours" | "td" | "tp" = "cours"

  // Matière sélectionnée
  selectedMatiere: Matiere | null = null

  // Ajout pour les notifications
  academicNotifications: AcademicNotification[] = []
  messageNotifications: MessageNotification[] = []
  showNotificationDropdown = false
  activeNotificationTab: "academic" | "messages" = "academic"

  // Données depuis la base de données
  coursFromDB: Cours[] = []
  chapitresFromDB: Chapitre[] = []
  departements: any[] = []
  niveaux: any[] = []
  specialites: any[] = []
  enseignants: any[] = []

  // Liste des matières du semestre 1 et 2
  matieresSemestre1: Matiere[] = []
  matieresSemestre2: Matiere[] = []

  // Indicateurs de chargement
  loading = true
  error = false

  // Pour gérer les abonnements
  private subscriptions: Subscription[] = []

  constructor(
    private router: Router,
    private coursService: CoursService,
    private chapitreService: ChapitreService,
    private departementsService: DepartementsService,
    private niveauxService: NiveauxService,
    private specialitesService: SpecialitesService,
    private enseignantService: EnseignantService,
    private authService: AuthService,
    private notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    // Charger les informations de l'étudiant
    this.loadStudentInfo()

    // Charger les notifications
    this.loadNotifications()

    // S'abonner aux mises à jour des notifications
    this.subscriptions.push(
      this.notificationService.academicNotifications$.subscribe((notifications) => {
        this.academicNotifications = notifications.slice(0, 5) // Limiter à 5 notifications pour le dropdown
      }),
      this.notificationService.messageNotifications$.subscribe((notifications) => {
        this.messageNotifications = notifications.slice(0, 5) // Limiter à 5 notifications pour le dropdown
      }),
    )

    // Charger les données depuis la base de données
    this.loadAllData()
  }

  ngOnDestroy(): void {
    // Annuler tous les abonnements pour éviter les fuites de mémoire
    this.subscriptions.forEach((sub) => sub.unsubscribe())
  }

  // Méthode pour charger les informations de l'étudiant
  loadStudentInfo(): void {
    console.log("Chargement des informations de l'étudiant...")

    // Récupérer les informations de l'étudiant depuis le service d'authentification
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
    }
  }

  // Méthode pour mettre à jour les informations de l'étudiant
  updateStudentInfo(): void {
    if (this.studentInfo) {
      // Mettre à jour les informations de base
      this.etudiantName = this.studentInfo.name || "Étudiant"
      this.etudiantEmail = this.studentInfo.email || "etudiant@example.com"
      this.etudiantMatricule = this.studentInfo.matricule || "E00000"

      // Mettre à jour les informations académiques
      this.department = this.studentInfo.department || ""
      this.specialty = this.studentInfo.specialty || ""
      this.level = this.studentInfo.level || ""
      this.group = this.studentInfo.group || ""

      console.log("Informations de l'étudiant mises à jour:", {
        nom: this.etudiantName,
        email: this.etudiantEmail,
        matricule: this.etudiantMatricule,
        department: this.department,
        specialty: this.specialty,
        level: this.level,
        group: this.group,
      })
    }
  }

  // Méthode pour charger toutes les données nécessaires
  loadAllData(): void {
    this.loading = true
    this.error = false

    // Utiliser forkJoin pour charger toutes les données en parallèle
    forkJoin({
      cours: this.coursService.getCours(),
      departements: this.departementsService.getDepartements(),
      niveaux: this.niveauxService.getNiveaux(),
      specialites: this.specialitesService.getSpecialites(),
      chapitres: this.chapitreService.getChapitres(),
      enseignants: this.enseignantService.getAllEnseignants(),
    }).subscribe({
      next: (results) => {
        console.log("Données chargées:", results)

        // Stocker les données récupérées
        this.coursFromDB = results.cours
        this.departements = results.departements
        this.niveaux = results.niveaux
        this.specialites = results.specialites
        this.chapitresFromDB = results.chapitres
        this.enseignants = results.enseignants

        // Transformer les données en matières
        this.transformDataToMatieres()

        this.loading = false
      },
      error: (error) => {
        console.error("Erreur lors du chargement des données:", error)
        this.error = true
        this.loading = false
      },
    })
  }

  // Transformer les données de la BD en matières pour l'affichage avec amélioration pour les fichiers PDF
  transformDataToMatieres(): void {
    // Réinitialiser les tableaux
    this.matieresSemestre1 = []
    this.matieresSemestre2 = []

    // Couleurs pour les matières
    const colors = ["#6366f1", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#ef4444", "#3b82f6"]
    // Icônes pour les matières
    const icons = ["fa-code", "fa-database", "fa-sitemap", "fa-brain", "fa-robot", "fa-server", "fa-cubes"]

    // Parcourir les cours et créer les matières
    this.coursFromDB.forEach((cours, index) => {
      // Trouver le département correspondant
      const departement = this.departements.find((d) => d._id === cours.departement)
      const departementNom = departement ? departement.name || departement.nom : "Département inconnu"

      // Déterminer le semestre
      const semestre = cours.semestre || 1

      // Filtrer les chapitres pour ce cours
      const chapitresCours = this.chapitresFromDB.filter((c) => c.courId === cours._id)

      console.log(`Chapitres trouvés pour le cours ${cours.titre}:`, chapitresCours)

      // Créer l'objet matière
      const matiere: Matiere = {
        id: cours._id,
        nom: cours.titre,
        credits: 6, // Valeur par défaut ou à récupérer si disponible
        heures: cours.heure || Number.parseInt(cours.heures || "42"), // Conversion en nombre
        couleur: colors[index % colors.length],
        icon: icons[index % icons.length],
        departement: departementNom,
        description: cours.description,
        cours: {
          enseignant: this.getEnseignantName(
            chapitresCours.find((c) => !c.contientQuiz && !c.contientDevoir)?.enseignantId,
          ),
          disponible: chapitresCours.some((c) => !c.contientQuiz && !c.contientDevoir),
          chapitres: chapitresCours
            .filter((c) => !c.contientQuiz && !c.contientDevoir)
            .map((c) => this.mapChapitreToUI(c)),
        },
        td: {
          enseignant: this.getEnseignantName(chapitresCours.find((c) => c.contientDevoir)?.enseignantId),
          disponible: chapitresCours.some((c) => c.contientDevoir),
          chapitres: chapitresCours.filter((c) => c.contientDevoir).map((c) => this.mapChapitreToUI(c)),
        },
        tp: {
          enseignant: this.getEnseignantName(chapitresCours.find((c) => c.contientQuiz)?.enseignantId),
          disponible: chapitresCours.some((c) => c.contientQuiz),
          chapitres: chapitresCours.filter((c) => c.contientQuiz).map((c) => this.mapChapitreToUI(c)),
        },
      }

      // Ajouter la matière au semestre correspondant
      if (semestre === 1) {
        this.matieresSemestre1.push(matiere)
      } else {
        this.matieresSemestre2.push(matiere)
      }
    })

    console.log("Matières transformées:", {
      semestre1: this.matieresSemestre1,
      semestre2: this.matieresSemestre2,
    })
  }

  // Nouvelle méthode pour mapper un chapitre de la BD vers l'interface UI
  mapChapitreToUI(chapitre: Chapitre): ChapitreUI {
    // Extraire le nom du fichier à partir du chemin complet
    const fichierPath = chapitre.fichierPath || ""
    const fichierNom = chapitre.fichierNom || this.extractFileName(fichierPath)

    // Calculer une taille approximative basée sur la longueur de la description
    const taille = this.calculateFileSize(chapitre.description?.length || 0)

    // Convertir la date de création en objet Date
    let dateCreation: Date
    try {
      dateCreation = chapitre.dateCreation ? new Date(chapitre.dateCreation) : new Date()
    } catch (error) {
      console.error("Erreur lors de la conversion de la date:", error)
      dateCreation = new Date() // Utiliser la date actuelle en cas d'erreur
    }

    return {
      id: chapitre._id,
      titre: chapitre.titre,
      description: chapitre.description,
      fichierPdf: fichierPath,
      fichierNom: fichierNom,
      dateCreation: dateCreation,
      taille: taille,
      enseignantNom: this.getEnseignantName(chapitre.enseignantId),
      semestre: chapitre.semestre,
    }
  }

  // Méthode pour extraire le nom du fichier à partir du chemin
  extractFileName(path: string): string {
    if (!path) return "document.pdf"

    // Extraire le nom du fichier à partir du chemin
    const parts = path.split("/")
    const fileName = parts[parts.length - 1]

    return fileName || "document.pdf"
  }

  // Méthode pour calculer une taille approximative de fichier
  calculateFileSize(contentLength: number): string {
    // Base size for PDF structure
    const baseSize = 100 * 1024 // 100 KB

    // Add size based on content length (approximation)
    const contentSize = contentLength * 10 // ~10 bytes per character

    const totalSizeInBytes = baseSize + contentSize

    // Convert to appropriate unit
    if (totalSizeInBytes < 1024 * 1024) {
      // Less than 1 MB
      return `${Math.round(totalSizeInBytes / 1024)} KB`
    } else {
      // More than 1 MB
      return `${(totalSizeInBytes / (1024 * 1024)).toFixed(1)} MB`
    }
  }

  // Méthode pour obtenir le nom de l'enseignant à partir de son ID
  getEnseignantName(enseignantId?: string): string {
    if (!enseignantId) return "Enseignant non assigné"

    const enseignant = this.enseignants.find((e) => e._id === enseignantId)
    if (enseignant) {
      return `${enseignant.prenom || ""} ${enseignant.nom || ""}`.trim()
    }

    return "Enseignant non trouvé"
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

  // Méthode pour charger les notifications
  loadNotifications(): void {
    const userId = this.getUserId()
    if (!userId) {
      return
    }

    // Déterminer si l'utilisateur est un étudiant ou un enseignant
    const userType = this.authService.isStudent() ? "etudiant" : "enseignant"

    this.notificationService.loadAllNotifications(userId, userType).subscribe({
      error: (err) => {
        console.error("Erreur lors du chargement des notifications:", err)
      },
    })
  }

  // Obtenir l'ID de l'utilisateur approprié selon son rôle
  private getUserId(): string {
    if (this.authService.isStudent()) {
      return localStorage.getItem("etudiantId") || ""
    } else if (this.authService.isTeacher()) {
      return localStorage.getItem("enseignantId") || ""
    }
    return ""
  }

  // Méthode pour afficher/masquer le dropdown de notifications
  toggleNotificationDropdown(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation()
    }
    this.showNotificationDropdown = !this.showNotificationDropdown
  }

  // Changer l'onglet actif dans le dropdown de notifications
  setActiveNotificationTab(tab: "academic" | "messages"): void {
    this.activeNotificationTab = tab
  }

  // Méthode pour fermer le dropdown si on clique ailleurs
  closeNotificationDropdown(): void {
    this.showNotificationDropdown = false
  }

  // Méthode pour marquer une notification académique comme lue
  markAcademicNotificationAsRead(notification: AcademicNotification): void {
    if (notification.read) return

    this.notificationService.markAcademicNotificationAsRead(notification.id).subscribe({
      next: () => {
        console.log(`Notification académique ${notification.id} marquée comme lue`)
        // Naviguer vers la destination appropriée
        this.navigateToDestination(notification)
      },
      error: (err) => {
        console.error("Erreur lors du marquage de la notification comme lue:", err)
      },
    })
  }

  // Méthode pour marquer une notification de message comme lue
  markMessageNotificationAsRead(notification: MessageNotification): void {
    if (notification.read) return

    this.notificationService.markMessageNotificationAsRead(notification.id).subscribe({
      next: () => {
        console.log(`Notification de message ${notification.id} marquée comme lue`)
        this.closeNotificationDropdown()

        // Naviguer vers le forum de discussion avec le message ouvert
        this.router.navigate(["/troixieme-interface/message-envoyer"], {
          queryParams: { messageId: notification.messageId },
        })
      },
      error: (err) => {
        console.error("Erreur lors du marquage de la notification comme lue:", err)
      },
    })
  }

  // Méthode pour naviguer vers la destination appropriée selon le type de notification
  navigateToDestination(notification: AcademicNotification): void {
    this.closeNotificationDropdown()

    // Si un lien spécifique est fourni, l'utiliser
    if (notification.lien) {
      this.router.navigateByUrl(notification.lien)
      return
    }

    // Sinon, déterminer la destination en fonction du type de notification
    switch (notification.type) {
      case "cours":
        // Naviguer vers l'interface des cours
        this.router.navigate(["/troixieme-interface/cour-suivie"], {
          queryParams: { contenuId: notification.contenuId },
        })
        break
      case "devoir":
        // Naviguer vers l'interface des devoirs
        this.router.navigate(["/troixieme-interface/devoir-realiser"], {
          queryParams: { devoirId: notification.contenuId },
        })
        break
      case "quiz":
        // Naviguer vers l'interface des quiz
        this.router.navigate(["/troixieme-interface/quiz-repond"], {
          queryParams: { quizId: notification.contenuId },
        })
        break
      case "soumission":
        // Naviguer vers l'interface des soumissions (devoirs ou quiz selon le contexte)
        if (notification.message.toLowerCase().includes("quiz")) {
          this.router.navigate(["/troixieme-interface/quiz-repond"], {
            queryParams: { quizId: notification.contenuId },
          })
        } else {
          this.router.navigate(["/troixieme-interface/devoir-realiser"], {
            queryParams: { devoirId: notification.contenuId },
          })
        }
        break
      default:
        // Par défaut, naviguer vers l'interface principale
        this.router.navigate(["/troixieme-interface"])
    }
  }

  // Méthode pour obtenir le nombre de notifications académiques non lues
  getUnreadAcademicNotificationsCount(): number {
    return this.academicNotifications.filter((n) => !n.read).length
  }

  // Méthode pour obtenir le nombre de notifications de messages non lues
  getUnreadMessageNotificationsCount(): number {
    return this.messageNotifications.filter((n) => !n.read).length
  }

  // Méthode pour obtenir le nombre total de notifications non lues
  getUnreadNotificationsCount(): number {
    return this.getUnreadAcademicNotificationsCount() + this.getUnreadMessageNotificationsCount()
  }

  // Méthode pour obtenir l'icône en fonction du type de notification académique
  getAcademicNotificationIcon(type: string): string {
    switch (type) {
      case "cours":
        return "fa-book"
      case "devoir":
        return "fa-tasks"
      case "quiz":
        return "fa-question-circle"
      case "soumission":
        return "fa-check-circle"
      default:
        return "fa-bell"
    }
  }

  // Méthode pour formater le temps écoulé
  formatTimeAgo(date: Date): string {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000)

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

  // Méthode pour naviguer vers la page de notifications
  navigateToNotifications(): void {
    this.router.navigate(["/troixieme-interface/notification"])
    this.closeNotificationDropdown()
  }

  // Méthode pour changer de semestre
  changeSemester(semester: "semestre1" | "semestre2"): void {
    this.activeSemester = semester
    this.selectedMatiere = null // Réinitialiser la matière sélectionnée lors du changement de semestre
  }

  // Méthode pour sélectionner une matière
  selectMatiere(matiere: Matiere): void {
    this.selectedMatiere = matiere

    // Sélectionner le premier type de contenu disponible
    if (matiere.cours.disponible) {
      this.activeContentType = "cours"
    } else if (matiere.td.disponible) {
      this.activeContentType = "td"
    } else if (matiere.tp.disponible) {
      this.activeContentType = "tp"
    }
  }

  // Méthode pour changer le type de contenu actif
  changeContentType(type: "cours" | "td" | "tp"): void {
    if (this.selectedMatiere && this.isContentTypeAvailable(type)) {
      this.activeContentType = type
    }
  }

  // Méthode pour revenir à la liste des matières
  backToMatieres(): void {
    this.selectedMatiere = null
  }

  // Méthode pour formater les dates - CORRIGÉE
  formatDate(date: Date | string): string {
    if (!date) return "Date inconnue"

    try {
      // Convertir en objet Date si c'est une chaîne
      const dateObj = typeof date === "string" ? new Date(date) : date

      // Vérifier si la date est valide
      if (isNaN(dateObj.getTime())) {
        return "Date invalide"
      }

      return dateObj.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    } catch (error) {
      console.error("Erreur lors du formatage de la date:", error)
      return "Date invalide"
    }
  }

  // Méthode pour obtenir la taille du fichier
  getFileSize(chapitre: ChapitreUI): string {
    return chapitre.taille || "1 Mo"
  }

  // Méthode pour vérifier si un type de contenu est disponible
  isContentTypeAvailable(type: "cours" | "td" | "tp"): boolean {
    if (!this.selectedMatiere) return false

    switch (type) {
      case "cours":
        return this.selectedMatiere.cours.disponible
      case "td":
        return this.selectedMatiere.td.disponible
      case "tp":
        return this.selectedMatiere.tp.disponible
      default:
        return false
    }
  }

  // Méthode pour obtenir les chapitres du type de contenu actif
  getActiveChapitres(): ChapitreUI[] {
    if (!this.selectedMatiere) return []

    switch (this.activeContentType) {
      case "cours":
        return this.selectedMatiere.cours.chapitres
      case "td":
        return this.selectedMatiere.td.chapitres
      case "tp":
        return this.selectedMatiere.tp.chapitres
      default:
        return []
    }
  }

  // Méthode pour obtenir l'enseignant du type de contenu actif
  getActiveEnseignant(): string {
    if (!this.selectedMatiere) return ""

    switch (this.activeContentType) {
      case "cours":
        return this.selectedMatiere.cours.enseignant
      case "td":
        return this.selectedMatiere.td.enseignant
      case "tp":
        return this.selectedMatiere.tp.enseignant
      default:
        return ""
    }
  }

  // Méthode pour obtenir le nombre de chapitres disponibles par type
  getChapitresCount(type: "cours" | "td" | "tp"): number {
    if (!this.selectedMatiere) return 0

    switch (type) {
      case "cours":
        return this.selectedMatiere.cours.chapitres.length
      case "td":
        return this.selectedMatiere.td.chapitres.length
      case "tp":
        return this.selectedMatiere.tp.chapitres.length
      default:
        return 0
    }
  }

  // Méthode améliorée pour télécharger un fichier
  downloadFile(chapitre: ChapitreUI): void {
    if (!chapitre.fichierPdf || chapitre.fichierPdf === "#") {
      alert("Le fichier n'est pas disponible.")
      return
    }

    console.log("Tentative de téléchargement du fichier:", chapitre.fichierPdf)

    // Si c'est un chemin complet vers le fichier
    if (chapitre.fichierPdf.startsWith("http")) {
      window.open(chapitre.fichierPdf, "_blank")
      return
    }

    // Construire l'URL complète pour le téléchargement
    const apiBaseUrl = "http://localhost:5000" // Assurez-vous que c'est la bonne URL de base
    let downloadUrl = chapitre.fichierPdf

    // S'assurer que le chemin commence par un slash
    if (!downloadUrl.startsWith("/")) {
      downloadUrl = "/" + downloadUrl
    }

    // Construire l'URL complète
    const fullUrl = apiBaseUrl + downloadUrl
    console.log("URL de téléchargement complète:", fullUrl)

    // Télécharger directement le fichier
    fetch(fullUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`)
        }
        return response.blob()
      })
      .then((blob) => {
        // Créer un URL pour le blob
        const url = window.URL.createObjectURL(blob)

        // Créer un élément a pour déclencher le téléchargement
        const a = document.createElement("a")
        a.href = url
        a.download = chapitre.fichierNom || `${chapitre.titre}.pdf`
        document.body.appendChild(a)
        a.click()

        // Nettoyer
        window.URL.revokeObjectURL(url)
        a.remove()

        console.log("Téléchargement terminé avec succès")
      })
      .catch((error) => {
        console.error("Erreur lors du téléchargement du fichier:", error)
        alert("Erreur lors du téléchargement du fichier. Veuillez réessayer.")

        // Essayer une approche alternative si la première méthode échoue
        if (chapitre.id) {
          console.log("Tentative de téléchargement via l'ID du chapitre:", chapitre.id)
          this.chapitreService.getChapitre(chapitre.id).subscribe({
            next: (chapitreDetails) => {
              if (chapitreDetails && chapitreDetails.fichierPath) {
                const alternativeUrl =
                  apiBaseUrl + (chapitreDetails.fichierPath.startsWith("/") ? "" : "/") + chapitreDetails.fichierPath
                console.log("URL alternative:", alternativeUrl)
                window.open(alternativeUrl, "_blank")
              } else {
                alert("Le fichier n'est pas disponible pour ce chapitre.")
              }
            },
            error: (error) => {
              console.error("Erreur lors de la récupération des détails du chapitre:", error)
              alert("Erreur lors de la récupération des détails du chapitre.")
            },
          })
        }
      })
  }

  // Méthode pour rafraîchir les données
  refreshData(): void {
    this.loadAllData()
  }

  // Méthode pour se déconnecter
  logout(): void {
    console.log("Déconnexion en cours...")
    this.authService.logout()
  }
}
