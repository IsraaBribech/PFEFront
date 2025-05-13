import { Component, type OnInit, HostListener, type OnDestroy } from "@angular/core"
import {  Router, NavigationEnd } from "@angular/router"
import { filter } from "rxjs/operators"
import  { Subscription } from "rxjs"
import  { AuthService } from "../auth.service"
import  { SpecialitesService } from "../specialites.service"
import  { NotificationService, AcademicNotification, MessageNotification } from "../notification.service"
import  { CoursService } from "../cours.service"
import  { DevoirService } from "../devoir.service"
import  { QuizService } from "../quiz.service"
import  { HttpClient } from "@angular/common/http"
import  { MessageService } from "../message.service"

// Interface pour les résultats de recherche
interface SearchResult {
  id: string
  title: string
  type: "cours" | "devoir" | "quiz" | "message" | "notification"
  description?: string
  route: string
  queryParams?: any
}

@Component({
  selector: "app-troixieme-interface",
  templateUrl: "./troixieme-interface.component.html",
  styleUrls: ["./troixieme-interface.component.css"],
})
export class TroixiemeInterfaceComponent implements OnInit, OnDestroy {
  // Informations de l'étudiant
  etudiantName = "Chargement..."
  etudiantEmail = "Chargement..."
  etudiantMatricule = "Chargement..."

  // Informations académiques
  departement = "Chargement..."
  specialite = "Chargement..."
  niveau = "Chargement..."
  groupe = "Chargement..."

  // Statistiques
  statsData = {
    cours: 5,
    devoirs: 8,
    quizzes: 3,
    messages: 12,
    notifications: 7,
  }

  // Onglet actif
  activeSemester: "semestre1" | "semestre2" = "semestre1"

  messageStats: any

  // Ajout pour les notifications
  academicNotifications: AcademicNotification[] = []
  messageNotifications: MessageNotification[] = []
  showNotificationDropdown = false
  activeNotificationTab: "academic" | "messages" = "academic"

  // Propriétés pour la recherche
  searchQuery = ""
  showSearchResults = false
  searchResults: SearchResult[] = []
  filteredSearchResults: SearchResult[] = []
  selectedResultIndex = 0
  searchDebounceTimeout: any = null

  // Pour gérer les abonnements
  private subscriptions: Subscription[] = []

  constructor(
    private router: Router,
    private authService: AuthService,
    private specialitesService: SpecialitesService,
    private notificationService: NotificationService,
    private coursService: CoursService,
    private devoirService: DevoirService,
    private quizService: QuizService,
    private messageService: MessageService,
    private http: HttpClient,
  ) {
    // Écouter les événements de navigation pour mettre à jour le titre de la page
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      // Vous pouvez mettre à jour le titre de la page ici si nécessaire
      // Ne pas fermer le dropdown de notifications lors de la navigation
      this.showSearchResults = false
    })
  }

  ngOnInit(): void {
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

    // Charger les informations de l'étudiant
    this.loadStudentInfo()

    // Essayer de charger manuellement les informations de spécialité si nécessaire
    this.loadSpecialtyInfo()

    // Initialiser les données de recherche
    this.initializeSearchData()

    // Tester l'API de recherche
    // Décommentez cette ligne pour tester l'API au chargement
    // this.testSearchAPI();
  }

  ngOnDestroy(): void {
    // Annuler tous les abonnements pour éviter les fuites de mémoire
    this.subscriptions.forEach((sub) => sub.unsubscribe())

    // Nettoyer le timeout de debounce
    if (this.searchDebounceTimeout) {
      clearTimeout(this.searchDebounceTimeout)
    }
  }

  // Initialiser les données de recherche
  initializeSearchData(): void {
    // Charger les données pour la recherche
    this.loadSearchData()

    // Ajouter un écouteur d'événement pour fermer les résultats de recherche quand on appuie sur Escape
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        this.showSearchResults = false
      }
    })
  }

  // Charger les données pour la recherche
  loadSearchData(): void {
    // Réinitialiser les résultats de recherche
    this.searchResults = []

    // Si aucune requête, ne rien faire
    if (!this.searchQuery || this.searchQuery.trim().length < 2) {
      this.filteredSearchResults = []
      return
    }

    console.log("Recherche en cours pour:", this.searchQuery)

    // Récupérer l'ID de l'utilisateur
    const userId = this.getUserId()
    const userType = this.authService.isStudent() ? "etudiant" : "enseignant"

    // Construire les paramètres de requête
    const params = {
      query: this.searchQuery,
      userId: userId,
      userType: userType,
    }

    console.log("Paramètres de recherche:", params)

    // Faire la requête à l'API avec gestion d'erreur améliorée
    this.http.get<any>(`http://localhost:5001/api/search`, { params }).subscribe({
      next: (response: any) => {
        if (response && response.success && response.data) {
          this.searchResults = response.data

          // Analyser les types de résultats pour le débogage
          const resultTypes: Record<string, number> = {}
          response.data.forEach((item: SearchResult) => {
            if (!resultTypes[item.type]) {
              resultTypes[item.type] = 0
            }
            resultTypes[item.type]++
          })
          console.log("Types de résultats:", resultTypes)

          this.filterSearchResults()
        } else {
          console.warn("Format de réponse inattendu pour la recherche:", response)
          // Ne pas utiliser de données de secours, afficher un message à l'utilisateur
          alert("La recherche n'a pas retourné de résultats valides.")
          this.filteredSearchResults = []
        }
      },
      error: (error: any) => {
        console.error("Erreur lors de la recherche:", error)
        // Ne pas utiliser de données de secours, afficher un message à l'utilisateur
        alert("Erreur lors de la recherche. Veuillez réessayer plus tard.")
        this.filteredSearchResults = []
      },
    })
  }

  // Ajouter cette méthode pour charger des données de secours en cas d'erreur
  loadFallbackSearchData(): void {
    console.log("Chargement des données de recherche de secours")

    // Exemple de données de recherche
    this.searchResults = [
      // Cours
      {
        id: "cours1",
        title: "Programmation Web",
        type: "cours",
        description: "Cours de programmation web avec HTML, CSS et JavaScript",
        route: "/troixieme-interface/cour-suivie",
        queryParams: { id: "cours1" },
      },
      {
        id: "cours2",
        title: "Bases de données",
        type: "cours",
        description: "Cours sur les bases de données relationnelles",
        route: "/troixieme-interface/cour-suivie",
        queryParams: { id: "cours2" },
      },
      {
        id: "cours3",
        title: "Algorithmes avancés",
        type: "cours",
        description: "Cours sur les algorithmes avancés et structures de données",
        route: "/troixieme-interface/cour-suivie",
        queryParams: { id: "cours3" },
      },

      // Devoirs
      {
        id: "devoir1",
        title: "Projet de programmation web",
        type: "devoir",
        description: "Créer un site web responsive avec HTML, CSS et JavaScript",
        route: "/troixieme-interface/devoir-realiser",
        queryParams: { id: "devoir1" },
      },
      {
        id: "devoir2",
        title: "Exercices de SQL",
        type: "devoir",
        description: "Exercices sur les requêtes SQL",
        route: "/troixieme-interface/devoir-realiser",
        queryParams: { id: "devoir2" },
      },

      // Quiz
      {
        id: "quiz1",
        title: "Quiz sur HTML et CSS",
        type: "quiz",
        description: "Quiz pour tester vos connaissances en HTML et CSS",
        route: "/troixieme-interface/quiz-repond",
        queryParams: { id: "quiz1" },
      },
      {
        id: "quiz2",
        title: "Quiz sur les bases de données",
        type: "quiz",
        description: "Quiz pour tester vos connaissances en bases de données",
        route: "/troixieme-interface/quiz-repond",
        queryParams: { id: "quiz2" },
      },

      // Messages
      {
        id: "message1",
        title: "Discussion sur le projet final",
        type: "message",
        description: "Discussion avec les étudiants sur le projet final",
        route: "/troixieme-interface/message-envoyer",
        queryParams: { id: "message1" },
      },

      // Notifications
      {
        id: "notification1",
        title: "Nouveau devoir disponible",
        type: "notification",
        description: "Un nouveau devoir a été ajouté au cours de programmation web",
        route: "/troixieme-interface/notification",
        queryParams: { id: "notification1" },
      },
    ]
  }

  // Modifions la méthode onSearchInput pour mieux gérer les erreurs
  onSearchInput(): void {
    // Annuler le timeout précédent
    if (this.searchDebounceTimeout) {
      clearTimeout(this.searchDebounceTimeout)
    }

    // Définir un nouveau timeout pour éviter trop de recherches pendant la frappe
    this.searchDebounceTimeout = setTimeout(() => {
      if (this.searchQuery && this.searchQuery.trim().length >= 2) {
        // Charger les données depuis l'API si la requête a au moins 2 caractères
        this.loadSearchData()
      } else {
        // Sinon, vider les résultats
        this.filteredSearchResults = []
        this.showSearchResults = false
      }
    }, 300) // 300ms de délai
  }

  // Filtrer les résultats de recherche en fonction de la requête
  filterSearchResults(): void {
    if (!this.searchQuery) {
      this.filteredSearchResults = []
      return
    }

    const query = this.searchQuery.toLowerCase().trim()

    // Si nous avons déjà des résultats de l'API, les filtrer localement
    if (this.searchResults.length > 0) {
      this.filteredSearchResults = this.searchResults.filter((result) => {
        // Rechercher dans le titre
        const titleMatch = result.title.toLowerCase().includes(query)

        // Rechercher dans la description si elle existe
        const descriptionMatch = result.description ? result.description.toLowerCase().includes(query) : false

        // Rechercher dans le type
        const typeMatch = this.getCategoryLabel(result.type).toLowerCase().includes(query)

        return titleMatch || descriptionMatch || typeMatch
      })

      // Trier les résultats par pertinence
      this.filteredSearchResults.sort((a, b) => {
        // Priorité aux correspondances exactes dans le titre
        const aExactTitle = a.title.toLowerCase() === query
        const bExactTitle = b.title.toLowerCase() === query

        if (aExactTitle && !bExactTitle) return -1
        if (!aExactTitle && bExactTitle) return 1

        // Ensuite, priorité aux titres qui commencent par la requête
        const aStartsWithTitle = a.title.toLowerCase().startsWith(query)
        const bStartsWithTitle = b.title.toLowerCase().startsWith(query)

        if (aStartsWithTitle && !bStartsWithTitle) return -1
        if (!aStartsWithTitle && bStartsWithTitle) return 1

        // Ensuite, trier par type (cours, devoirs, quiz, etc.)
        return this.getTypePriority(a.type) - this.getTypePriority(b.type)
      })
    }

    // Mettre à jour l'état de l'interface
    this.showSearchResults = this.searchQuery.length > 0
    this.selectedResultIndex = 0 // Réinitialiser l'index sélectionné
  }

  // Obtenir la priorité d'un type pour le tri
  getTypePriority(type: string): number {
    switch (type) {
      case "cours":
        return 1
      case "devoir":
        return 2
      case "quiz":
        return 3
      case "message":
        return 4
      case "notification":
        return 5
      default:
        return 10
    }
  }

  // Naviguer vers le résultat sélectionné
  navigateToResult(result: SearchResult): void {
    console.log("Navigation vers le résultat:", result)

    // Traitement spécifique selon le type de résultat
    switch (result.type) {
      case "cours":
        // Pour les cours, s'assurer d'utiliser le bon paramètre (courId)
        this.router.navigate(["/troixieme-interface/cour-suivie"], {
          queryParams: { courId: result.id },
        })
        break
      case "devoir":
        // Pour les devoirs, utiliser devoirId
        this.router.navigate(["/troixieme-interface/devoir-realiser"], {
          queryParams: { devoirId: result.id },
        })
        break
      case "quiz":
        // Pour les quiz, utiliser quizId
        this.router.navigate(["/troixieme-interface/quiz-repond"], {
          queryParams: { quizId: result.id },
        })
        break
      default:
        // Pour les autres types, utiliser les paramètres par défaut
        this.router.navigate([result.route], { queryParams: result.queryParams })
    }

    this.showSearchResults = false
    this.searchQuery = "" // Effacer la requête après la navigation
  }

  // Naviguer vers le premier résultat (touche Entrée)
  navigateToFirstResult(): void {
    if (this.filteredSearchResults.length > 0) {
      this.navigateToResult(this.filteredSearchResults[this.selectedResultIndex])
    }
  }

  // Sélectionner le résultat suivant (touche flèche bas)
  selectNextResult(): void {
    if (this.filteredSearchResults.length > 0) {
      this.selectedResultIndex = (this.selectedResultIndex + 1) % this.filteredSearchResults.length
      this.scrollToSelectedResult()
    }
  }

  // Sélectionner le résultat précédent (touche flèche haut)
  selectPreviousResult(): void {
    if (this.filteredSearchResults.length > 0) {
      this.selectedResultIndex =
        (this.selectedResultIndex - 1 + this.filteredSearchResults.length) % this.filteredSearchResults.length
      this.scrollToSelectedResult()
    }
  }

  // Faire défiler jusqu'au résultat sélectionné
  scrollToSelectedResult(): void {
    setTimeout(() => {
      const selectedElement = document.querySelector(".search-result-item.active")
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest", behavior: "smooth" })
      }
    }, 0)
  }

  // Effacer la recherche
  clearSearch(): void {
    this.searchQuery = ""
    this.filteredSearchResults = []
    this.showSearchResults = false
  }

  // Obtenir l'icône pour un type de résultat de recherche
  getSearchResultIcon(type: string): string {
    switch (type) {
      case "cours":
        return "fa-book"
      case "devoir":
        return "fa-tasks"
      case "quiz":
        return "fa-question-circle"
      case "message":
        return "fa-envelope"
      case "notification":
        return "fa-bell"
      default:
        return "fa-search"
    }
  }

  // Obtenir le libellé pour un type de résultat de recherche
  getCategoryLabel(type: string): string {
    switch (type) {
      case "cours":
        return "Cours"
      case "devoir":
        return "Devoir"
      case "quiz":
        return "Quiz"
      case "message":
        return "Message"
      case "notification":
        return "Notification"
      default:
        return "Autre"
    }
  }

  // Méthode pour charger les informations de l'étudiant
  loadStudentInfo(): void {
    const studentInfo = this.authService.getStudentInfo()

    if (studentInfo) {
      this.updateStudentInfo(studentInfo)
    } else {
      console.warn("Aucune information d'étudiant disponible")
    }
  }

  // Ajouter cette méthode après loadStudentInfo()
  loadSpecialtyInfo(): void {
    const studentInfo = this.authService.getStudentInfo()

    if (
      studentInfo &&
      studentInfo.specialty &&
      (!studentInfo.specialtyName || studentInfo.specialtyName === "Spécialité non disponible")
    ) {
      console.log("Tentative de chargement manuel de la spécialité:", studentInfo.specialty)

      this.specialitesService.getSpecialtyNameById(studentInfo.specialty).subscribe({
        next: (name) => {
          console.log("Nom de spécialité récupéré manuellement:", name)
          this.specialite = name
        },
        error: (error) => {
          console.error("Erreur lors du chargement manuel de la spécialité:", error)
        },
      })
    }
  }

  // Mettre à jour les informations de l'étudiant dans le composant
  updateStudentInfo(info: any): void {
    this.etudiantName = info.name || "Nom non disponible"
    this.etudiantEmail = info.email || "Email non disponible"
    this.etudiantMatricule = info.matricule || "Matricule non disponible"

    // Utiliser les noms mappés au lieu des IDs
    this.departement = info.departmentName || "Département non disponible"
    this.specialite = info.specialtyName || "Spécialité non disponible"
    this.niveau = info.levelName || "Niveau non disponible"

    // Utiliser le nom formaté du groupe s'il est disponible, sinon utiliser l'ID du groupe
    this.groupe = info.groupName || info.group || "Groupe non disponible"

    console.log("Informations étudiant mises à jour dans l'interface:", {
      nom: this.etudiantName,
      email: this.etudiantEmail,
      matricule: this.etudiantMatricule,
      departement: this.departement,
      specialite: this.specialite,
      niveau: this.niveau,
      groupe: this.groupe,
    })
  }

  // Écouteur d'événement pour fermer le dropdown quand on clique ailleurs
  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent): void {
    // Vérifier si le clic est en dehors du dropdown
    const target = event.target as HTMLElement
    if (!target.closest(".notification-btn") && !target.closest(".notification-dropdown")) {
      this.closeNotificationDropdown()
    }

    // Fermer les résultats de recherche si on clique en dehors
    if (!target.closest(".search-bar") && !target.closest(".search-results")) {
      this.showSearchResults = false
    }
  }

  // Méthode pour charger les notifications
  loadNotifications(): void {
    const userId = this.getUserId()
    if (!userId) {
      console.warn("ID utilisateur non disponible, impossible de charger les notifications")
      return
    }

    // Déterminer si l'utilisateur est un étudiant ou un enseignant
    const userType = this.authService.isStudent() ? "etudiant" : "enseignant"

    console.log(`Chargement des notifications pour ${userType} avec ID: ${userId}`)

    // Utiliser le service de notification pour charger les vraies notifications
    this.notificationService.loadAllNotifications(userId, userType).subscribe({
      next: (result: any) => {
        console.log("Notifications chargées avec succès:", result)
        // Les notifications sont déjà mises à jour via les observables du service
      },
      error: (err: any) => {
        console.error("Erreur lors du chargement des notifications:", err)
        // Ne pas charger de données de secours en cas d'erreur
        // Afficher un message d'erreur à l'utilisateur
        alert("Impossible de charger les notifications. Veuillez réessayer plus tard.")
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

        // Mettre à jour l'état local
        const updatedNotifications = this.academicNotifications.map((n) =>
          n.id === notification.id ? { ...n, read: true } : n,
        )
        this.academicNotifications = updatedNotifications

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

        // Mettre à jour l'état local
        const updatedNotifications = this.messageNotifications.map((n) =>
          n.id === notification.id ? { ...n, read: true } : n,
        )
        this.messageNotifications = updatedNotifications

        // Naviguer vers la destination appropriée
        if (notification.lien) {
          this.router.navigateByUrl(notification.lien)
        } else {
          // Si pas de lien spécifique, naviguer vers l'interface de messages
          this.router.navigate(["/troixieme-interface/message-envoyer"])
        }
      },
      error: (err) => {
        console.error("Erreur lors du marquage de la notification comme lue:", err)
      },
    })
  }

  // Naviguer vers la destination appropriée selon le type de notification
  navigateToDestination(notification: AcademicNotification): void {
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

  // Ajouter cette méthode pour vérifier si les notifications sont vides
  areNotificationsEmpty(): boolean {
    return this.academicNotifications.length === 0 && this.messageNotifications.length === 0
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
    return (
      this.academicNotifications.filter((n) => !n.read).length + this.messageNotifications.filter((n) => !n.read).length
    )
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

  // Méthode pour vérifier si on est sur la page d'accueil
  isHomePage(): boolean {
    return this.router.url === "/troixieme-interface"
  }

  // Méthode pour formater les dates
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  // Méthode pour obtenir la classe CSS en fonction du type d'événement
  getEventClass(type: string): string {
    switch (type) {
      case "devoir":
        return "assignments"
      case "quiz":
        return "quizzes"
      case "cours":
        return "courses"
      case "message":
        return "messages"
      case "soumission":
        return "soumission"
      case "système":
      case "notification":
        return "notifications"
      default:
        return ""
    }
  }

  // Méthode pour obtenir l'icône en fonction du type d'événement
  getEventIcon(type: string): string {
    switch (type) {
      case "devoir":
        return "fa-tasks"
      case "quiz":
        return "fa-question-circle"
      case "cours":
        return "fa-book"
      case "message":
        return "fa-envelope"
      case "soumission":
        return "fa-check-circle"
      case "système":
      case "notification":
        return "fa-bell"
      default:
        return "fa-calendar"
    }
  }

  // Méthode pour naviguer vers le profil
  navigateToProfile(): void {
    this.router.navigate(["/troixieme-interface/eduprofil"])
  }

  // Méthode pour naviguer vers la page de notifications
  navigateToNotifications(): void {
    this.router.navigate(["/troixieme-interface/notification"])
    this.closeNotificationDropdown()
  }

  // Méthode pour obtenir le titre de la page courante
  getCurrentPageTitle(): string {
    if (this.isHomePage()) {
      return "Tableau de bord"
    } else if (this.router.url.includes("/cour-suivie")) {
      return "Mes cours"
    } else if (this.router.url.includes("/devoir-realiser")) {
      return "Mes devoirs"
    } else if (this.router.url.includes("/quiz-repond")) {
      return "Mes quiz"
    } else if (this.router.url.includes("/message-envoyer")) {
      return "Forum de discussion"
    } else if (this.router.url.includes("/notification")) {
      return "Notifications"
    } else if (this.router.url.includes("/eduprofil")) {
      return "Mon profil"
    }
    return "Tableau de bord"
  }

  // Méthode pour se déconnecter
  logout(): void {
    console.log("Déconnexion en cours...")
    this.authService.logout()
  }

  // Ajouter cette méthode pour tester la connexion à l'API
  testSearchAPI(): void {
    console.log("Test de l'API de recherche...")

    this.http.get<any>(`http://localhost:5001/api/search-test`).subscribe({
      next: (response: any) => {
        console.log("Test de l'API réussi:", response)
        alert("Connexion à l'API de recherche réussie!")
      },
      error: (error: any) => {
        console.error("Erreur lors du test de l'API:", error)
        alert("Erreur de connexion à l'API de recherche. Vérifiez la console pour plus de détails.")
      },
    })
  }

  // Ajouter cette méthode pour tester les modèles disponibles
  testModelsInfo(): void {
    console.log("Récupération des informations sur les modèles...")

    this.http.get<any>(`http://localhost:5001/api/models-info`).subscribe({
      next: (response: any) => {
        console.log("Informations sur les modèles:", response)
        if (response.success) {
          console.log("Modèles disponibles:", response.models)
          console.log("Détails des modèles:", response.modelsInfo)

          // Afficher un résumé dans une alerte
          let summary = "Modèles disponibles:\n\n"
          for (const modelName in response.modelsInfo) {
            const info = response.modelsInfo[modelName]
            summary += `${modelName}: ${info.count || 0} documents\n`
          }
          alert(summary)
        }
      },
      error: (error: any) => {
        console.error("Erreur lors de la récupération des informations sur les modèles:", error)
        alert(
          "Erreur lors de la récupération des informations sur les modèles. Vérifiez la console pour plus de détails.",
        )
      },
    })
  }

  // Ajouter cette méthode pour vérifier l'état des notifications
  checkNotificationStatus(): void {
    console.log("État des notifications:")
    console.log(`- Notifications académiques: ${this.academicNotifications.length}`)
    console.log(`- Notifications de messages: ${this.messageNotifications.length}`)
    console.log(`- Non lues académiques: ${this.getUnreadAcademicNotificationsCount()}`)
    console.log(`- Non lues messages: ${this.getUnreadMessageNotificationsCount()}`)

    // Vérifier la connexion au service de notification
    this.notificationService.testConnection().subscribe({
      next: (result: any) => {
        console.log("Test de connexion au service de notification réussi:", result)
      },
      error: (err: any) => {
        console.error("Erreur de connexion au service de notification:", err)
      },
    })
  }
}
