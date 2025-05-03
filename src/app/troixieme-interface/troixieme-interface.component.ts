import { Component, type OnInit, HostListener, type OnDestroy } from "@angular/core"
import {  Router, NavigationEnd } from "@angular/router"
import { filter } from "rxjs/operators"
import type { Subscription } from "rxjs"
import  { AuthService } from "../auth.service"
import  { SpecialitesService } from "../specialites.service"
import  { NotificationService, AcademicNotification, MessageNotification } from "../notification.service"

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

  // Pour gérer les abonnements
  private subscriptions: Subscription[] = []

  constructor(
    private router: Router,
    private authService: AuthService,
    private specialitesService: SpecialitesService,
    private notificationService: NotificationService,
  ) {
    // Écouter les événements de navigation pour mettre à jour le titre de la page
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      // Vous pouvez mettre à jour le titre de la page ici si nécessaire
      // Ne pas fermer le dropdown de notifications lors de la navigation
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
  }

  ngOnDestroy(): void {
    // Annuler tous les abonnements pour éviter les fuites de mémoire
    this.subscriptions.forEach((sub) => sub.unsubscribe())
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
        this.closeNotificationDropdown()

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
}
