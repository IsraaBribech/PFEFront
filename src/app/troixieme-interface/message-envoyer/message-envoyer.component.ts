import { Component, type OnInit, ViewEncapsulation, HostListener, type OnDestroy } from "@angular/core"
import { Router } from "@angular/router"
import { AuthService, StudentInfo } from "../../auth.service"
import { MessageService, Message, Matiere } from "../../message.service"
import { NotificationService, AcademicNotification, MessageNotification } from "../../notification.service"
import { finalize } from "rxjs/operators"
import { Subscription } from "rxjs"

@Component({
  selector: "app-message-envoyer",
  templateUrl: "./message-envoyer.component.html",
  styleUrls: ["./message-envoyer.component.css"],
  encapsulation: ViewEncapsulation.None, // Désactive l'encapsulation des styles
})
export class MessageEnvoyerComponent implements OnInit, OnDestroy {
  // Informations de l'étudiant
  etudiantName = ""
  etudiantEmail = ""
  etudiantMatricule = ""
  etudiantId = ""

  // Informations académiques de l'étudiant
  department = ""
  specialty = ""
  level = ""
  group = ""

  // Informations de l'étudiant
  studentInfo: StudentInfo | null = null

  // Onglet actif - Ajout de "matiere" comme nouvel onglet par défaut
  activeTab: "recus" | "envoyes" | "nouveau" | "matiere" = "matiere"

  // Matière sélectionnée pour le forum
  selectedMatiere: Matiere | null = null

  // Message sélectionné
  selectedMessage: Message | null = null

  // Nouveau message
  nouveauMessage = {
    sujet: "",
    contenu: "",
    matiereId: "",
  }

  // État d'envoi
  isSubmitting = false
  messageEnvoye = false
  isLoading = {
    messagesRecus: false,
    messagesEnvoyes: false,
    matieres: false,
  }

  // État d'erreur
  error = {
    matieres: false,
    messagesRecus: false,
    messagesEnvoyes: false,
  }

  // Recherche
  searchTerm = ""

  // Notifications
  academicNotifications: AcademicNotification[] = []
  messageNotifications: MessageNotification[] = []
  showNotificationDropdown = false
  activeNotificationTab: "academic" | "messages" = "academic"
  notificationSubscriptions: Subscription[] = []

  // Liste des matières
  matieres: Matiere[] = []

  // Liste des messages
  messagesRecus: Message[] = []
  messagesEnvoyes: Message[] = []

  constructor(
    private router: Router,
    private authService: AuthService,
    private messageService: MessageService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    // Charger les informations de l'étudiant
    this.loadStudentInfo()

    // Charger les matières
    this.loadMatieres()
    
    // S'abonner aux notifications
    this.subscribeToNotifications()
  }

  ngOnDestroy(): void {
    // Se désabonner de toutes les souscriptions
    this.notificationSubscriptions.forEach((subscription) => {
      if (subscription) {
        subscription.unsubscribe()
      }
    })
  }

  // Méthode pour s'abonner aux notifications
  subscribeToNotifications(): void {
    // S'abonner aux notifications académiques
    const academicSub = this.notificationService.academicNotifications$.subscribe({
      next: (notifications) => {
        console.log("Notifications académiques mises à jour:", notifications)
        this.academicNotifications = notifications
      },
      error: (error: any) => {
        console.error("Erreur lors de la réception des notifications académiques:", error)
      },
    })

    // S'abonner aux notifications de messages
    const messageSub = this.notificationService.messageNotifications$.subscribe({
      next: (notifications) => {
        console.log("Notifications de messages mises à jour:", notifications)
        this.messageNotifications = notifications
      },
      error: (error: any) => {
        console.error("Erreur lors de la réception des notifications de messages:", error)
      },
    })

    // S'abonner aux compteurs de notifications non lues
    const unreadAcademicSub = this.notificationService.unreadAcademicCount$.subscribe((count) => {
      console.log("Nombre de notifications académiques non lues:", count)
    })

    const unreadMessageSub = this.notificationService.unreadMessageCount$.subscribe((count) => {
      console.log("Nombre de notifications de messages non lues:", count)
    })

    // Ajouter les souscriptions à la liste pour pouvoir les désabonner plus tard
    this.notificationSubscriptions.push(academicSub, messageSub, unreadAcademicSub, unreadMessageSub)
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
      this.etudiantId = "dummy-id"
    }
    
    // Charger les notifications après avoir récupéré l'ID de l'étudiant
    if (this.etudiantId) {
      this.loadNotifications()
    }
  }

  // Méthode pour mettre à jour les informations de l'étudiant
  updateStudentInfo(): void {
    if (this.studentInfo) {
      // Mettre à jour les informations de base
      this.etudiantName = this.studentInfo.name || "Étudiant"
      this.etudiantEmail = this.studentInfo.email || "etudiant@example.com"
      this.etudiantMatricule = this.studentInfo.matricule || "E00000"
      this.etudiantId = this.studentInfo._id || ""

      // Mettre à jour les informations académiques
      this.department = this.studentInfo.department || ""
      this.specialty = this.studentInfo.specialty || ""
      this.level = this.studentInfo.level || ""
      this.group = this.studentInfo.group || ""
    }
  }

  // Méthode pour charger les notifications
  loadNotifications(): void {
    // Récupérer l'ID de l'utilisateur connecté
    const userId = this.etudiantId || "student-id"
    const userType = "etudiant"

    // Charger toutes les notifications
    const sub = this.notificationService.loadAllNotifications(userId, userType).subscribe({
      next: (result) => {
        console.log("Notifications chargées:", result)
        // Les notifications sont déjà mises à jour via les observables
      },
      error: (error: any) => {
        console.error("Erreur lors du chargement des notifications:", error)
        // En cas d'erreur, le service utilise déjà des données de démonstration
      },
    })

    this.notificationSubscriptions.push(sub)
  }

  // Charger les matières depuis la base de données
  loadMatieres(): void {
    if (!this.etudiantId) {
      console.warn("ID étudiant non disponible, impossible de charger les matières")
      return
    }

    this.isLoading.matieres = true
    this.error.matieres = false

    console.log("Chargement des matières pour l'étudiant ID:", this.etudiantId)

    this.messageService
      .getMatieresForEtudiant(this.etudiantId)
      .pipe(finalize(() => (this.isLoading.matieres = false)))
      .subscribe({
        next: (matieres) => {
          if (matieres && matieres.length > 0) {
            this.matieres = matieres
            console.log("Matières chargées:", matieres)
          } else {
            console.warn("Aucune matière retournée par l'API")
            this.error.matieres = true
          }
        },
        error: (error) => {
          console.error("Erreur lors du chargement des matières:", error)
          this.error.matieres = true
        },
      })
  }

  // Charger les messages pour une matière spécifique
  loadMessagesForMatiere(matiereId: string): void {
    if (!this.etudiantId) return

    // Charger les messages reçus pour cette matière
    this.loadMessagesRecusByMatiere(matiereId)
    
    // Charger les messages envoyés pour cette matière
    this.loadMessagesEnvoyesByMatiere(matiereId)
  }

  // Charger les messages reçus pour une matière spécifique
  loadMessagesRecusByMatiere(matiereId: string): void {
    this.isLoading.messagesRecus = true
    this.error.messagesRecus = false

    this.messageService
      .getMessagesRecusByMatiere(this.etudiantId, matiereId)
      .pipe(finalize(() => (this.isLoading.messagesRecus = false)))
      .subscribe({
        next: (messages) => {
          this.messagesRecus = messages
          console.log("Messages reçus chargés pour la matière:", messages)
        },
        error: (error) => {
          console.error("Erreur lors du chargement des messages reçus:", error)
          this.error.messagesRecus = true
        },
      })
  }

  // Charger les messages envoyés pour une matière spécifique
  loadMessagesEnvoyesByMatiere(matiereId: string): void {
    this.isLoading.messagesEnvoyes = true
    this.error.messagesEnvoyes = false

    this.messageService
      .getMessagesEnvoyesByMatiere(this.etudiantId, matiereId)
      .pipe(finalize(() => (this.isLoading.messagesEnvoyes = false)))
      .subscribe({
        next: (messages: Message[]) => {
          this.messagesEnvoyes = messages
          console.log("Messages envoyés chargés pour la matière:", messages)
        },
        error: (error: any) => {
          console.error("Erreur lors du chargement des messages envoyés:", error)
          this.error.messagesEnvoyes = true
        },
      })
  }

  // Méthode pour obtenir les initiales d'un nom
  getInitials(name: string): string {
    if (!name) return "?"

    const parts = name.split(" ")
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }

    return name.substring(0, 2).toUpperCase()
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

  // Méthode pour définir l'onglet actif des notifications
  setActiveNotificationTab(tab: "academic" | "messages"): void {
    this.activeNotificationTab = tab
  }

  // Méthode pour marquer une notification académique comme lue
  markAcademicNotificationAsRead(notification: AcademicNotification): void {
    // Marquer la notification comme lue
    this.notificationService.markAcademicNotificationAsRead(notification.id).subscribe({
      next: (updatedNotification) => {
        console.log(`Notification académique ${notification.id} marquée comme lue:`, updatedNotification)

        // Fermer le dropdown de notifications
        this.closeNotificationDropdown()

        // Naviguer vers le contenu approprié en fonction du type de notification
        this.navigateToNotificationContent(notification)
      },
      error: (error: any) => {
        console.error(`Erreur lors du marquage de la notification académique ${notification.id}:`, error)
      },
    })
  }

  // Méthode pour marquer un message comme lu et naviguer vers la conversation
  markMessageNotificationAsRead(notification: MessageNotification): void {
    this.notificationService.markMessageNotificationAsRead(notification.id).subscribe({
      next: (updatedNotification) => {
        console.log(`Message ${notification.id} marqué comme lu:`, updatedNotification)

        // Fermer le dropdown de notifications
        this.closeNotificationDropdown()

        // Si nous avons un messageId, essayer de trouver le message correspondant
        if (notification.messageId) {
          // Chercher dans les messages reçus
          const message = this.messagesRecus.find(m => m._id === notification.messageId);
          if (message) {
            this.selectMessage(message);
            return;
          }
        }

        // Si le message n'est pas trouvé ou pas de messageId, naviguer vers la page des messages
        // avec des paramètres pour aider à le retrouver
        this.router.navigate(["/troixieme-interface/message-envoyer"], {
          queryParams: {
            expediteur: notification.expediteurNom,
            sujet: notification.sujetTitre
          },
        })
      },
      error: (error: any) => {
        console.error(`Erreur lors du marquage du message ${notification.id}:`, error)
      },
    })
  }

  // Nouvelle méthode pour naviguer vers le contenu approprié en fonction du type de notification
  navigateToNotificationContent(notification: AcademicNotification): void {
    // Extraire les informations de la notification
    const type = notification.type
    const contentId = notification.linkedId // Utiliser linkedId pour la navigation
    const title = notification.title

    switch (type) {
      case "cours":
        // Naviguer vers le cours spécifique
        this.router.navigate(["/troixieme-interface/cour-suivie"], {
          queryParams: { id: contentId },
        })
        break

      case "devoir":
        // Naviguer vers le devoir spécifique
        this.router.navigate(["/troixieme-interface/devoir-realiser"], {
          queryParams: { id: contentId },
        })
        break

      case "quiz":
        // Naviguer vers le quiz spécifique
        this.router.navigate(["/troixieme-interface/quiz-repond"], {
          queryParams: { id: contentId },
        })
        break

      default:
        // Pour les autres types, naviguer vers la page de notifications
        this.router.navigate(["/troixieme-interface/notification"])
        break
    }
  }

  // Méthodes pour marquer toutes les notifications comme lues
  markAllAcademicNotificationsAsRead(): void {
    const userId = this.etudiantId || "student-id"
    const userType = "etudiant"

    this.notificationService.markAllAcademicNotificationsAsRead(userId, userType).subscribe({
      next: () => {
        console.log("Toutes les notifications académiques ont été marquées comme lues")
      },
      error: (error: any) => {
        console.error("Erreur lors du marquage de toutes les notifications académiques:", error)
      },
    })
  }

  markAllMessageNotificationsAsRead(): void {
    const userId = this.etudiantId || "student-id"
    const userType = "etudiant"

    this.notificationService.markAllMessageNotificationsAsRead(userId, userType).subscribe({
      next: () => {
        console.log("Tous les messages ont été marqués comme lus")
      },
      error: (error: any) => {
        console.error("Erreur lors du marquage de tous les messages:", error)
      },
    })
  }

  // Méthode pour obtenir le nombre total de notifications non lues
  getUnreadNotificationsCount(): number {
    const academicCount = this.getUnreadAcademicNotificationsCount()
    const messageCount = this.getUnreadMessageNotificationsCount()
    return academicCount + messageCount
  }

  // Méthode pour obtenir le nombre de notifications académiques non lues
  getUnreadAcademicNotificationsCount(): number {
    return this.academicNotifications.filter((n) => !n.read).length
  }

  // Méthode pour obtenir le nombre de messages non lus
  getUnreadMessageNotificationsCount(): number {
    return this.messageNotifications.filter((n) => !n.read).length
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
      case "message":
        return "fa-comment"
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

  // Changer d'onglet
  changeTab(tab: "recus" | "envoyes" | "nouveau" | "matiere"): void {
    this.activeTab = tab
    this.selectedMessage = null
  }

  // Sélectionner une matière
  selectMatiere(matiere: Matiere): void {
    this.selectedMatiere = matiere
    this.nouveauMessage.matiereId = matiere._id
    
    // Charger les messages pour cette matière
    this.loadMessagesForMatiere(matiere._id)
    
    // Changer l'onglet actif vers "recus"
    this.changeTab("recus")
  }

  // Retourner à la sélection de matière
  backToMatieres(): void {
    this.selectedMatiere = null
    this.changeTab("matiere")
  }

  // Sélectionner un message
  selectMessage(message: Message): void {
    this.selectedMessage = message

    // Marquer comme lu si c'est un message reçu et qu'il n'est pas déjà lu
    if (message.expediteur === "enseignant" && !message.lu) {
      message.lu = true

      // Mettre à jour dans la base de données
      if (message._id) {
        this.messageService.marquerCommeLu(message._id).subscribe({
          next: () => console.log("Message marqué comme lu dans la base de données"),
          error: (error) => console.error("Erreur lors du marquage du message comme lu:", error),
        })
      }
    }
  }

  // Revenir à la liste des messages
  backToMessages(): void {
    this.selectedMessage = null
  }

  // Envoyer un nouveau message
  envoyerMessage(): void {
    if (!this.nouveauMessage.sujet || !this.nouveauMessage.contenu || !this.nouveauMessage.matiereId) {
      return
    }

    this.isSubmitting = true

    const matiere = this.matieres.find((m) => m._id === this.nouveauMessage.matiereId)

    if (!matiere) {
      this.isSubmitting = false
      return
    }

    const nouveauMsg: Message = {
      expediteur: "etudiant",
      expediteurId: this.etudiantId,
      nomExpediteur: this.etudiantName,
      avatarExpediteur: this.getInitials(this.etudiantName),
      destinataireId: matiere.enseignantId,
      destinataire: matiere.enseignant,
      matiereId: matiere._id,
      matiere: matiere.nom,
      sujet: this.nouveauMessage.sujet,
      contenu: this.nouveauMessage.contenu,
      dateEnvoi: new Date(),
      lu: false,
    }

    this.messageService
      .envoyerMessage(nouveauMsg)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (message) => {
          console.log("Message envoyé avec succès:", message)

          // Ajouter le message à la liste des messages envoyés
          this.messagesEnvoyes.unshift(message)
          this.messageEnvoye = true

          // Réinitialiser le formulaire après 2 secondes
          setTimeout(() => {
            this.nouveauMessage = {
              sujet: "",
              contenu: "",
              matiereId: this.selectedMatiere ? this.selectedMatiere._id : "",
            }
            this.messageEnvoye = false
            this.changeTab("envoyes")
          }, 2000)
        },
        error: (error) => {
          console.error("Erreur lors de l'envoi du message:", error)
          alert("Une erreur est survenue lors de l'envoi du message. Veuillez réessayer.")
        },
      })
  }

  // Répondre à un message
  repondreMessage(message: Message, reponse: string): void {
    if (!reponse.trim() || !message._id) {
      return
    }

    this.isSubmitting = true

    const nouvelleReponse: Message = {
      expediteur: "etudiant",
      expediteurId: this.etudiantId,
      nomExpediteur: this.etudiantName,
      avatarExpediteur: this.getInitials(this.etudiantName),
      destinataireId: message.expediteurId,
      destinataire: message.nomExpediteur,
      matiereId: message.matiereId,
      matiere: message.matiere,
      sujet: "Re: " + message.sujet,
      contenu: reponse,
      dateEnvoi: new Date(),
      lu: false,
    }

    this.messageService
      .repondreMessage(message._id, nouvelleReponse)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (updatedMessage) => {
          console.log("Réponse envoyée avec succès:", updatedMessage)

          // Mettre à jour le message avec la réponse
          if (!message.reponses) {
            message.reponses = []
          }
          message.reponses.push(nouvelleReponse)

          // Ajouter également aux messages envoyés
          this.messagesEnvoyes.unshift({
            ...nouvelleReponse,
            _id: `rep-${Date.now()}`,
          })
        },
        error: (error) => {
          console.error("Erreur lors de l'envoi de la réponse:", error)
          alert("Une erreur est survenue lors de l'envoi de la réponse. Veuillez réessayer.")
        },
      })
  }

  // Formater la date
  formatDate(date: Date | string): string {
    const dateObj = typeof date === "string" ? new Date(date) : date
    return dateObj.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Formater le contenu du message
  formatMessageContent(content: string): string {
    return content.replace(/\n/g, "<br>")
  }

  // Formater le contenu
  formatContent(content: string): string {
    return content.replace(/\n/g, "<br>")
  }

  // Obtenir les messages filtrés par recherche
  getFilteredMessages(messages: Message[]): Message[] {
    if (!this.searchTerm.trim()) {
      return messages
    }

    const term = this.searchTerm.toLowerCase()
    return messages.filter(
      (msg) =>
        msg.sujet.toLowerCase().includes(term) ||
        msg.contenu.toLowerCase().includes(term) ||
        msg.matiere.toLowerCase().includes(term) ||
        msg.nomExpediteur.toLowerCase().includes(term),
    )
  }

  // Vérifier si un message est non lu
  isUnread(message: Message): boolean {
    return message.expediteur === "enseignant" && !message.lu
  }

  // Obtenir le nombre de messages non lus
  getUnreadCount(): number {
    return this.messagesRecus.filter((msg) => !msg.lu).length
  }
}