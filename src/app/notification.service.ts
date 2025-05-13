import { Injectable } from "@angular/core"
import  { HttpClient } from "@angular/common/http"
import { BehaviorSubject, type Observable, of, forkJoin, throwError } from "rxjs"
import { map, tap, catchError } from "rxjs/operators"

// Interface de base pour les notifications
export interface BaseNotification {
  id: string | number
  title: string
  message: string
  date: Date
  read: boolean
  lien?: string
}

// Interface pour les notifications académiques (cours, devoirs, quiz)
export interface AcademicNotification extends BaseNotification {
  type: "cours" | "devoir" | "quiz" | "soumission"
  contenuId: string // ID du chapitre, devoir ou quiz concerné
  linkedId: string // ID associé pour la navigation
  etudiantId?: string
  enseignantId?: string
}

// Interface pour les notifications de messages du forum
export interface MessageNotification extends BaseNotification {
  type: "message"
  messageId: string // ID du message
  expediteurId: string
  expediteurNom: string
  sujetId: string
  sujetTitre: string
}

// Type union pour tous les types de notifications
export type Notification = AcademicNotification | MessageNotification

@Injectable({
  providedIn: "root",
})
export class NotificationService {
  private apiUrl = "http://localhost:5001/api/notifications"

  // BehaviorSubjects pour les deux types de notifications
  private academicNotificationsSubject = new BehaviorSubject<AcademicNotification[]>([])
  private messageNotificationsSubject = new BehaviorSubject<MessageNotification[]>([])

  // Compteurs de notifications non lues
  private unreadAcademicCountSubject = new BehaviorSubject<number>(0)
  private unreadMessageCountSubject = new BehaviorSubject<number>(0)

  // Observables publics
  public academicNotifications$ = this.academicNotificationsSubject.asObservable()
  public messageNotifications$ = this.messageNotificationsSubject.asObservable()
  public unreadAcademicCount$ = this.unreadAcademicCountSubject.asObservable()
  public unreadMessageCount$ = this.unreadMessageCountSubject.asObservable()

  constructor(private http: HttpClient) {}

  // Méthode pour tester la connexion au service
  testConnection(): Observable<any> {
    return this.http.get(`${this.apiUrl}/test-connection`).pipe(
      catchError((error) => {
        console.error("Erreur lors du test de connexion au service de notification:", error)
        return throwError(() => new Error("Erreur de connexion au service de notification"))
      }),
    )
  }

  // Charger toutes les notifications pour un utilisateur
  loadAllNotifications(
    userId: string,
    userType: "etudiant" | "enseignant",
  ): Observable<{ academic: AcademicNotification[]; messages: MessageNotification[] }> {
    console.log(`NotificationService: Chargement des notifications pour ${userType} avec ID ${userId}`)

    // Vérifier les paramètres
    if (!userId || !userType) {
      console.error("UserId et userType sont requis pour charger les notifications")
      return throwError(() => new Error("UserId et userType sont requis"))
    }

    return forkJoin({
      academic: this.loadAcademicNotifications(userId, userType),
      messages: this.loadMessageNotifications(userId, userType),
    }).pipe(
      tap((results) => {
        console.log(`Notifications académiques chargées: ${results.academic.length}`)
        console.log(`Notifications de messages chargées: ${results.messages.length}`)
      }),
      catchError((error) => {
        console.error("Erreur lors du chargement des notifications:", error)
        return throwError(() => new Error("Erreur lors du chargement des notifications"))
      }),
    )
  }

  // Charger les notifications académiques
  loadAcademicNotifications(userId: string, userType: "etudiant" | "enseignant"): Observable<AcademicNotification[]> {
    const queryParam = userType === "etudiant" ? "etudiantId" : "enseignantId"
    console.log(`Chargement des notifications académiques pour ${queryParam}=${userId}`)

    return this.http.get<any>(`${this.apiUrl}/academic?${queryParam}=${userId}`).pipe(
      map((response) => {
        if (response && response.success && Array.isArray(response.data)) {
          return this.transformAcademicNotifications(response.data)
        } else if (Array.isArray(response)) {
          return this.transformAcademicNotifications(response)
        } else {
          console.warn("Format de réponse inattendu pour les notifications académiques:", response)
          return []
        }
      }),
      tap((notifications) => {
        console.log(`${notifications.length} notifications académiques chargées`)
        this.academicNotificationsSubject.next(notifications)
        this.updateUnreadAcademicCount(notifications)
      }),
      catchError((error) => {
        console.error("Erreur lors de la récupération des notifications académiques:", error)
        // Ne pas utiliser de données simulées, retourner un tableau vide
        this.academicNotificationsSubject.next([])
        this.updateUnreadAcademicCount([])
        return of([])
      }),
    )
  }

  // Charger les notifications de messages
  loadMessageNotifications(userId: string, userType: "etudiant" | "enseignant"): Observable<MessageNotification[]> {
    const queryParam = userType === "etudiant" ? "etudiantId" : "enseignantId"
    console.log(`Chargement des notifications de messages pour ${queryParam}=${userId}`)

    return this.http.get<any>(`${this.apiUrl}/messages?${queryParam}=${userId}`).pipe(
      map((response) => {
        if (response && response.success && Array.isArray(response.data)) {
          return this.transformMessageNotifications(response.data)
        } else if (Array.isArray(response)) {
          return this.transformMessageNotifications(response)
        } else {
          console.warn("Format de réponse inattendu pour les notifications de messages:", response)
          return []
        }
      }),
      tap((notifications) => {
        console.log(`${notifications.length} notifications de messages chargées`)
        this.messageNotificationsSubject.next(notifications)
        this.updateUnreadMessageCount(notifications)
      }),
      catchError((error) => {
        console.error("Erreur lors de la récupération des notifications de messages:", error)
        // Ne pas utiliser de données simulées, retourner un tableau vide
        this.messageNotificationsSubject.next([])
        this.updateUnreadMessageCount([])
        return of([])
      }),
    )
  }

  // Transformation des données académiques du serveur
  private transformAcademicNotifications(data: any[]): AcademicNotification[] {
    if (!Array.isArray(data) || data.length === 0) {
      return []
    }

    return data.map((item) => ({
      id: item._id || item.id,
      type: item.type || "cours",
      title: item.titre || item.title || "Notification",
      message: item.message || item.contenu || "",
      date: new Date(item.date || item.dateCreation || new Date()),
      read: item.lu || item.read || false,
      etudiantId: item.etudiantId,
      enseignantId: item.enseignantId,
      lien: item.lien,
      contenuId: item.contenuId || item.chapitreId || item.devoirId || item.quizId || "",
      linkedId: item.linkedId || item.contenuId || item.chapitreId || item.devoirId || item.quizId || "",
    }))
  }

  // Transformation des données de messages du serveur
  private transformMessageNotifications(data: any[]): MessageNotification[] {
    if (!Array.isArray(data) || data.length === 0) {
      return []
    }

    return data.map((item) => ({
      id: item._id || item.id,
      type: "message",
      title: item.titre || item.title || "Nouveau message",
      message: item.message || item.contenu || "",
      date: new Date(item.date || item.dateCreation || new Date()),
      read: item.lu || item.read || false,
      lien: item.lien,
      expediteurId: item.expediteurId || item.senderId || "",
      expediteurNom: item.expediteurNom || item.senderName || "Utilisateur",
      sujetId: item.sujetId || item.topicId || "",
      sujetTitre: item.sujetTitre || item.topicTitle || "Discussion",
      messageId: item.messageId || item._id || item.id || "",
    }))
  }

  // Mise à jour du compteur de notifications académiques non lues
  private updateUnreadAcademicCount(notifications: AcademicNotification[]): void {
    const count = notifications.filter((n) => !n.read).length
    this.unreadAcademicCountSubject.next(count)
  }

  // Mise à jour du compteur de notifications de messages non lues
  private updateUnreadMessageCount(notifications: MessageNotification[]): void {
    const count = notifications.filter((n) => !n.read).length
    this.unreadMessageCountSubject.next(count)
  }

  // Récupérer le nombre total de notifications non lues
  getTotalUnreadCount(): Observable<number> {
    return forkJoin([this.unreadAcademicCount$, this.unreadMessageCount$]).pipe(
      map(([academicCount, messageCount]) => academicCount + messageCount),
    )
  }

  // Marquer une notification académique comme lue
  markAcademicNotificationAsRead(notificationId: string | number): Observable<AcademicNotification> {
    console.log(`Marquage de la notification académique ${notificationId} comme lue`)

    return this.http.patch<any>(`${this.apiUrl}/academic/${notificationId}/read`, {}).pipe(
      map((data) => {
        if (data && data.success && data.data) {
          return this.transformAcademicNotifications([data.data])[0]
        } else if (data) {
          return this.transformAcademicNotifications([data])[0]
        } else {
          throw new Error("Format de réponse inattendu")
        }
      }),
      tap((updatedNotification) => {
        console.log(`Notification académique ${notificationId} marquée comme lue avec succès`)
        const currentNotifications = this.academicNotificationsSubject.value
        const updatedNotifications = currentNotifications.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n,
        )
        this.academicNotificationsSubject.next(updatedNotifications)
        this.updateUnreadAcademicCount(updatedNotifications)
      }),
      catchError((error) => {
        console.error(`Erreur lors du marquage de la notification académique ${notificationId} comme lue:`, error)
        // Mettre à jour localement en cas d'erreur
        const currentNotifications = this.academicNotificationsSubject.value
        const notification = currentNotifications.find((n) => n.id === notificationId)
        if (notification) {
          notification.read = true
          this.academicNotificationsSubject.next([...currentNotifications])
          this.updateUnreadAcademicCount(currentNotifications)
          return of({ ...notification, read: true } as AcademicNotification)
        }
        return throwError(() => new Error(`Notification ${notificationId} non trouvée`))
      }),
    )
  }

  // Marquer une notification de message comme lue
  markMessageNotificationAsRead(notificationId: string | number): Observable<MessageNotification> {
    console.log(`Marquage de la notification de message ${notificationId} comme lue`)

    return this.http.patch<any>(`${this.apiUrl}/messages/${notificationId}/read`, {}).pipe(
      map((data) => {
        if (data && data.success && data.data) {
          return this.transformMessageNotifications([data.data])[0]
        } else if (data) {
          return this.transformMessageNotifications([data])[0]
        } else {
          throw new Error("Format de réponse inattendu")
        }
      }),
      tap((updatedNotification) => {
        console.log(`Notification de message ${notificationId} marquée comme lue avec succès`)
        const currentNotifications = this.messageNotificationsSubject.value
        const updatedNotifications = currentNotifications.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n,
        )
        this.messageNotificationsSubject.next(updatedNotifications)
        this.updateUnreadMessageCount(updatedNotifications)
      }),
      catchError((error) => {
        console.error(`Erreur lors du marquage de la notification de message ${notificationId} comme lue:`, error)
        // Mettre à jour localement en cas d'erreur
        const currentNotifications = this.messageNotificationsSubject.value
        const notification = currentNotifications.find((n) => n.id === notificationId)
        if (notification) {
          notification.read = true
          this.messageNotificationsSubject.next([...currentNotifications])
          this.updateUnreadMessageCount(currentNotifications)
          return of({ ...notification, read: true } as MessageNotification)
        }
        return throwError(() => new Error(`Notification ${notificationId} non trouvée`))
      }),
    )
  }

  // Marquer toutes les notifications académiques comme lues
  markAllAcademicNotificationsAsRead(userId: string, userType: "etudiant" | "enseignant"): Observable<any> {
    const queryParam = userType === "etudiant" ? "etudiantId" : "enseignantId"
    console.log(`Marquage de toutes les notifications académiques comme lues pour ${queryParam}=${userId}`)

    return this.http.patch<any>(`${this.apiUrl}/academic/read-all?${queryParam}=${userId}`, {}).pipe(
      tap((response) => {
        console.log("Toutes les notifications académiques marquées comme lues:", response)
        const currentNotifications = this.academicNotificationsSubject.value
        const updatedNotifications = currentNotifications.map((n) => ({ ...n, read: true }))
        this.academicNotificationsSubject.next(updatedNotifications)
        this.unreadAcademicCountSubject.next(0)
      }),
      catchError((error) => {
        console.error("Erreur lors du marquage de toutes les notifications académiques comme lues:", error)
        // Mettre à jour localement en cas d'erreur
        const currentNotifications = this.academicNotificationsSubject.value
        const updatedNotifications = currentNotifications.map((n) => ({ ...n, read: true }))
        this.academicNotificationsSubject.next(updatedNotifications)
        this.unreadAcademicCountSubject.next(0)
        return of({ success: true })
      }),
    )
  }

  // Marquer toutes les notifications de messages comme lues
  markAllMessageNotificationsAsRead(userId: string, userType: "etudiant" | "enseignant"): Observable<any> {
    const queryParam = userType === "etudiant" ? "etudiantId" : "enseignantId"
    console.log(`Marquage de toutes les notifications de messages comme lues pour ${queryParam}=${userId}`)

    return this.http.patch<any>(`${this.apiUrl}/messages/read-all?${queryParam}=${userId}`, {}).pipe(
      tap((response) => {
        console.log("Toutes les notifications de messages marquées comme lues:", response)
        const currentNotifications = this.messageNotificationsSubject.value
        const updatedNotifications = currentNotifications.map((n) => ({ ...n, read: true }))
        this.messageNotificationsSubject.next(updatedNotifications)
        this.unreadMessageCountSubject.next(0)
      }),
      catchError((error) => {
        console.error("Erreur lors du marquage de toutes les notifications de messages comme lues:", error)
        // Mettre à jour localement en cas d'erreur
        const currentNotifications = this.messageNotificationsSubject.value
        const updatedNotifications = currentNotifications.map((n) => ({ ...n, read: true }))
        this.messageNotificationsSubject.next(updatedNotifications)
        this.unreadMessageCountSubject.next(0)
        return of({ success: true })
      }),
    )
  }

  /**
   * Notifie un enseignant qu'un étudiant a soumis un quiz
   * @param notification Les informations de notification
   */
  notifyTeacherAboutQuizSubmission(notification: {
    enseignantId: string
    etudiantId: string
    etudiantName: string
    quizId: string
    quizTitle: string
    score: number
    dateCompletion: Date
  }): Observable<any> {
    console.log(
      `NotificationService.notifyTeacherAboutQuizSubmission - Notification à l'enseignant ${notification.enseignantId}`,
    )

    // Créer une notification académique de type soumission
    const notificationData: Partial<AcademicNotification> = {
      type: "soumission",
      title: `Quiz soumis: ${notification.quizTitle}`,
      message: `L'étudiant ${notification.etudiantName} a soumis le quiz "${notification.quizTitle}" avec un score de ${notification.score}%.`,
      date: new Date(),
      read: false,
      contenuId: notification.quizId,
      linkedId: notification.quizId,
      etudiantId: notification.etudiantId,
      enseignantId: notification.enseignantId,
    }

    return this.http.post<any>(`${this.apiUrl}/academic`, notificationData).pipe(
      tap((response) => {
        console.log("Notification à l'enseignant envoyée:", response)

        // Si l'enseignant est actuellement connecté, mettre à jour ses notifications
        if (response) {
          const currentNotifications = this.academicNotificationsSubject.value
          let newNotification: AcademicNotification

          if (response.success && response.data) {
            newNotification = this.transformAcademicNotifications([response.data])[0]
          } else {
            newNotification = this.transformAcademicNotifications([response])[0]
          }

          this.academicNotificationsSubject.next([newNotification, ...currentNotifications])
          this.updateUnreadAcademicCount([newNotification, ...currentNotifications])
        }
      }),
      catchError((error) => {
        console.error("Erreur lors de l'envoi de la notification à l'enseignant:", error)
        return throwError(() => new Error("Erreur lors de l'envoi de la notification"))
      }),
    )
  }

  /**
   * Notifie un étudiant qu'un enseignant a évalué son devoir
   */
  notifyStudentAboutAssignmentGraded(notification: {
    etudiantId: string
    enseignantId: string
    enseignantName: string
    devoirId: string
    devoirTitle: string
    note: number
    commentaire: string
  }): Observable<any> {
    console.log(
      `NotificationService.notifyStudentAboutAssignmentGraded - Notification à l'étudiant ${notification.etudiantId}`,
    )

    // Créer une notification académique de type soumission
    const notificationData: Partial<AcademicNotification> = {
      type: "soumission",
      title: `Devoir évalué: ${notification.devoirTitle}`,
      message: `L'enseignant ${notification.enseignantName} a évalué votre devoir "${notification.devoirTitle}" avec une note de ${notification.note}/20.`,
      date: new Date(),
      read: false,
      contenuId: notification.devoirId,
      linkedId: notification.devoirId,
      etudiantId: notification.etudiantId,
      enseignantId: notification.enseignantId,
    }

    return this.http.post<any>(`${this.apiUrl}/academic`, notificationData).pipe(
      tap((response) => {
        console.log("Notification à l'étudiant envoyée:", response)
      }),
      catchError((error) => {
        console.error("Erreur lors de l'envoi de la notification à l'étudiant:", error)
        return throwError(() => new Error("Erreur lors de l'envoi de la notification"))
      }),
    )
  }

  /**
   * Crée une notification pour un nouveau message dans le forum
   */
  createMessageNotification(notification: {
    destinataireId: string
    destinataireType: "etudiant" | "enseignant"
    expediteurId: string
    expediteurNom: string
    messageId: string
    sujetId: string
    sujetTitre: string
    message: string
  }): Observable<any> {
    console.log(
      `NotificationService.createMessageNotification - Notification à ${notification.destinataireType} ${notification.destinataireId}`,
    )

    // Créer les données de notification
    const notificationData: any = {
      title: `Nouveau message dans "${notification.sujetTitre}"`,
      message: notification.message,
      expediteurId: notification.expediteurId,
      expediteurNom: notification.expediteurNom,
      messageId: notification.messageId,
      sujetId: notification.sujetId,
      sujetTitre: notification.sujetTitre,
      read: false,
    }

    // Ajouter le bon ID de destinataire selon le type
    if (notification.destinataireType === "etudiant") {
      notificationData.etudiantId = notification.destinataireId
    } else {
      notificationData.enseignantId = notification.destinataireId
    }

    return this.http.post<any>(`${this.apiUrl}/messages`, notificationData).pipe(
      tap((response) => {
        console.log("Notification de message envoyée:", response)
      }),
      catchError((error) => {
        console.error("Erreur lors de l'envoi de la notification de message:", error)
        return throwError(() => new Error("Erreur lors de l'envoi de la notification de message"))
      }),
    )
  }
}
