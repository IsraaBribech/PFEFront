import { Component, type OnInit, type OnDestroy, ViewEncapsulation } from "@angular/core"
import  { Router } from "@angular/router"
import { type Subscription, combineLatest } from "rxjs"
import  { NotificationService, AcademicNotification, MessageNotification } from "../../notification.service"
import  { AuthService } from "../../auth.service"

interface Chapitre {
  _id: string
  titre: string
  description: string
  courId: string
  // Autres propriétés nécessaires
}

interface Cours {
  _id: string
  titre: string
  // Autres propriétés nécessaires
}

interface Devoir {
  _id: string
  title: string
  description: string
  // Autres propriétés nécessaires
}

interface Quiz {
  _id: string
  title: string
  description: string
  // Autres propriétés nécessaires
}

@Component({
  selector: "app-edunotification",
  templateUrl: "./edunotification.component.html",
  styleUrls: ["./edunotification.component.css"],
  encapsulation: ViewEncapsulation.None,
})
export class EdunotificationComponent implements OnInit, OnDestroy {
  // Propriétés pour les notifications académiques
  academicNotifications: AcademicNotification[] = []
  filteredAcademicNotifications: AcademicNotification[] = []
  activeAcademicFilter = "all"

  // Propriétés pour les notifications de messages
  messageNotifications: MessageNotification[] = []
  filteredMessageNotifications: MessageNotification[] = []

  // Propriétés communes
  activeTab: "academic" | "messages" = "academic"
  isLoading = true
  error: string | null = null

  // Pour la pagination
  academicCurrentPage = 1
  messageCurrentPage = 1
  itemsPerPage = 10
  academicTotalItems = 0
  messageTotalItems = 0

  // Pour les abonnements (subscriptions)
  private subscriptions: Subscription[] = []

  // Données des chapitres, cours, devoirs et quiz
  chapitres: Chapitre[] = []
  cours: Cours[] = []
  devoirs: Devoir[] = []
  quizzes: Quiz[] = []

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadNotifications()

    // S'abonner aux mises à jour des notifications
    this.subscriptions.push(
      this.notificationService.academicNotifications$.subscribe((notifications) => {
        this.academicNotifications = notifications
        this.applyAcademicFilters()
      }),

      this.notificationService.messageNotifications$.subscribe((notifications) => {
        this.messageNotifications = notifications
        this.applyMessageFilters()
      }),

      // Combiner les deux observables pour mettre à jour l'état de chargement
      combineLatest([
        this.notificationService.academicNotifications$,
        this.notificationService.messageNotifications$,
      ]).subscribe(() => {
        this.isLoading = false
      }),
    )
  }

  ngOnDestroy(): void {
    // Annuler tous les abonnements pour éviter les fuites de mémoire
    this.subscriptions.forEach((sub) => sub.unsubscribe())
  }

  // Chargement des notifications depuis le service
  loadNotifications(): void {
    this.isLoading = true
    this.error = null

    const userId = this.getUserId()
    if (!userId) {
      this.error = "Impossible de récupérer l'ID de l'utilisateur"
      this.isLoading = false
      return
    }

    // Déterminer si l'utilisateur est un étudiant ou un enseignant
    const userType = this.authService.isStudent() ? "etudiant" : "enseignant"

    // Charger les deux types de notifications
    this.notificationService.loadAllNotifications(userId, userType).subscribe({
      error: (err) => {
        console.error("Erreur lors du chargement des notifications:", err)
        this.error = "Impossible de charger les notifications"
        this.isLoading = false
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

  // Changer l'onglet actif
  setActiveTab(tab: "academic" | "messages"): void {
    this.activeTab = tab
  }

  // Marquer une notification académique comme lue
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

  // Marquer une notification de message comme lue
  markMessageNotificationAsRead(notification: MessageNotification): void {
    if (notification.read) return

    this.notificationService.markMessageNotificationAsRead(notification.id).subscribe({
      next: () => {
        console.log(`Notification de message ${notification.id} marquée comme lue`)
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

  // Marquer toutes les notifications académiques comme lues
  markAllAcademicNotificationsAsRead(): void {
    const userId = this.getUserId()
    if (!userId) return

    const userType = this.authService.isStudent() ? "etudiant" : "enseignant"

    this.notificationService.markAllAcademicNotificationsAsRead(userId, userType).subscribe({
      error: (err) => {
        console.error("Erreur lors du marquage de toutes les notifications comme lues:", err)
      },
    })
  }

  // Marquer toutes les notifications de messages comme lues
  markAllMessageNotificationsAsRead(): void {
    const userId = this.getUserId()
    if (!userId) return

    const userType = this.authService.isStudent() ? "etudiant" : "enseignant"

    this.notificationService.markAllMessageNotificationsAsRead(userId, userType).subscribe({
      error: (err) => {
        console.error("Erreur lors du marquage de toutes les notifications comme lues:", err)
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

  // Filtrer les notifications académiques selon le type sélectionné
  setAcademicFilter(filter: string): void {
    this.activeAcademicFilter = filter
    this.applyAcademicFilters()
  }

  // Appliquer les filtres aux notifications académiques
  applyAcademicFilters(): void {
    if (this.activeAcademicFilter === "all") {
      this.filteredAcademicNotifications = [...this.academicNotifications]
    } else if (this.activeAcademicFilter === "unread") {
      this.filteredAcademicNotifications = this.academicNotifications.filter((n) => !n.read)
    } else {
      this.filteredAcademicNotifications = this.academicNotifications.filter(
        (n) => n.type === this.activeAcademicFilter,
      )
    }

    this.academicTotalItems = this.filteredAcademicNotifications.length
    this.academicCurrentPage = 1 // Revenir à la première page après filtrage
  }

  // Filtrer les notifications de messages
  applyMessageFilters(): void {
    // Pour l'instant, on affiche toutes les notifications de messages
    this.filteredMessageNotifications = [...this.messageNotifications]

    // On pourrait ajouter des filtres spécifiques aux messages plus tard
    this.messageTotalItems = this.filteredMessageNotifications.length
    this.messageCurrentPage = 1
  }

  // Rafraîchir les notifications
  refreshNotifications(): void {
    this.loadNotifications()
  }

  // Obtenir l'icône appropriée pour le type de notification académique
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

  // Formater l'affichage du temps écoulé de manière conviviale
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

  // Formater une date selon le format français
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  // Pagination: obtenir les éléments de la page courante pour les notifications académiques
  getCurrentAcademicPageItems(): AcademicNotification[] {
    const startIndex = (this.academicCurrentPage - 1) * this.itemsPerPage
    return this.filteredAcademicNotifications.slice(startIndex, startIndex + this.itemsPerPage)
  }

  // Pagination: obtenir les éléments de la page courante pour les notifications de messages
  getCurrentMessagePageItems(): MessageNotification[] {
    const startIndex = (this.messageCurrentPage - 1) * this.itemsPerPage
    return this.filteredMessageNotifications.slice(startIndex, startIndex + this.itemsPerPage)
  }

  // Pagination: aller à la page spécifiée pour les notifications académiques
  goToAcademicPage(page: number): void {
    this.academicCurrentPage = page
  }

  // Pagination: aller à la page spécifiée pour les notifications de messages
  goToMessagePage(page: number): void {
    this.messageCurrentPage = page
  }

  // Pagination: obtenir le nombre total de pages pour les notifications académiques
  getAcademicTotalPages(): number {
    return Math.ceil(this.filteredAcademicNotifications.length / this.itemsPerPage)
  }

  // Pagination: obtenir le nombre total de pages pour les notifications de messages
  getMessageTotalPages(): number {
    return Math.ceil(this.filteredMessageNotifications.length / this.itemsPerPage)
  }

  // Pagination: obtenir un tableau de numéros de page pour l'affichage des notifications académiques
  getAcademicPageNumbers(): number[] {
    const totalPages = this.getAcademicTotalPages()
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  // Pagination: obtenir un tableau de numéros de page pour l'affichage des notifications de messages
  getMessagePageNumbers(): number[] {
    const totalPages = this.getMessageTotalPages()
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
}
