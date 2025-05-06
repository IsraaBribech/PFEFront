import { Injectable } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { BehaviorSubject, type Observable, of, forkJoin } from "rxjs"
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

  // Charger toutes les notifications pour un utilisateur
  loadAllNotifications(
    userId: string,
    userType: "etudiant" | "enseignant",
  ): Observable<{ academic: AcademicNotification[]; messages: MessageNotification[] }> {
    return forkJoin({
      academic: this.loadAcademicNotifications(userId, userType),
      messages: this.loadMessageNotifications(userId, userType),
    })
  }

  // Charger les notifications académiques
  loadAcademicNotifications(userId: string, userType: "etudiant" | "enseignant"): Observable<AcademicNotification[]> {
    const queryParam = userType === "etudiant" ? "etudiantId" : "enseignantId"

    return this.http.get<any[]>(`${this.apiUrl}/academic?${queryParam}=${userId}`).pipe(
      map((data) => this.transformAcademicNotifications(data)),
      tap((notifications) => {
        this.academicNotificationsSubject.next(notifications)
        this.updateUnreadAcademicCount(notifications)
      }),
      catchError((error) => {
        console.error("Erreur lors de la récupération des notifications académiques:", error)
        // En cas d'erreur, utiliser des données simulées
        const mockNotifications = this.generateMockAcademicNotifications(userId)
        this.academicNotificationsSubject.next(mockNotifications)
        this.updateUnreadAcademicCount(mockNotifications)
        return of(mockNotifications)
      }),
    )
  }

  // Charger les notifications de messages
  loadMessageNotifications(userId: string, userType: "etudiant" | "enseignant"): Observable<MessageNotification[]> {
    const queryParam = userType === "etudiant" ? "etudiantId" : "enseignantId"

    return this.http.get<any[]>(`${this.apiUrl}/messages?${queryParam}=${userId}`).pipe(
      map((data) => this.transformMessageNotifications(data)),
      tap((notifications) => {
        this.messageNotificationsSubject.next(notifications)
        this.updateUnreadMessageCount(notifications)
      }),
      catchError((error) => {
        console.error("Erreur lors de la récupération des notifications de messages:", error)
        // En cas d'erreur, utiliser des données simulées
        const mockNotifications = this.generateMockMessageNotifications(userId)
        this.messageNotificationsSubject.next(mockNotifications)
        this.updateUnreadMessageCount(mockNotifications)
        return of(mockNotifications)
      }),
    )
  }

  // Transformation des données académiques du serveur
  private transformAcademicNotifications(data: any[]): AcademicNotification[] {
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
    return this.http.patch<any>(`${this.apiUrl}/academic/${notificationId}/read`, {}).pipe(
      map((data) => this.transformAcademicNotifications([data])[0]),
      tap((updatedNotification) => {
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
        }
        return of(notification as AcademicNotification)
      }),
    )
  }

  // Marquer une notification de message comme lue
  markMessageNotificationAsRead(notificationId: string | number): Observable<MessageNotification> {
    return this.http.patch<any>(`${this.apiUrl}/messages/${notificationId}/read`, {}).pipe(
      map((data) => this.transformMessageNotifications([data])[0]),
      tap((updatedNotification) => {
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
        }
        return of(notification as MessageNotification)
      }),
    )
  }

  // Marquer toutes les notifications académiques comme lues
  markAllAcademicNotificationsAsRead(userId: string, userType: "etudiant" | "enseignant"): Observable<any> {
    const queryParam = userType === "etudiant" ? "etudiantId" : "enseignantId"

    return this.http.patch<any>(`${this.apiUrl}/academic/read-all?${queryParam}=${userId}`, {}).pipe(
      tap(() => {
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

    return this.http.patch<any>(`${this.apiUrl}/messages/read-all?${queryParam}=${userId}`, {}).pipe(
      tap(() => {
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
    enseignantId: string;
    etudiantId: string;
    etudiantName: string;
    quizId: string;
    quizTitle: string;
    score: number;
    dateCompletion: Date;
  }): Observable<any> {
    console.log(`NotificationService.notifyTeacherAboutQuizSubmission - Notification à l'enseignant ${notification.enseignantId}`);
    
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
      enseignantId: notification.enseignantId
    };
    
    return this.http.post<any>(`${this.apiUrl}/academic`, notificationData).pipe(
      tap(response => {
        console.log("Notification à l'enseignant envoyée:", response);
        
        // Si l'enseignant est actuellement connecté, mettre à jour ses notifications
        if (response) {
          const currentNotifications = this.academicNotificationsSubject.value;
          const newNotification = this.transformAcademicNotifications([response])[0];
          this.academicNotificationsSubject.next([newNotification, ...currentNotifications]);
          this.updateUnreadAcademicCount([newNotification, ...currentNotifications]);
        }
      }),
      catchError(error => {
        console.error("Erreur lors de l'envoi de la notification à l'enseignant:", error);
        
        // En cas d'erreur, créer une notification locale pour les tests
        const mockNotification: AcademicNotification = {
          id: `soumission-${Date.now()}`,
          type: "soumission",
          title: `Quiz soumis: ${notification.quizTitle}`,
          message: `L'étudiant ${notification.etudiantName} a soumis le quiz "${notification.quizTitle}" avec un score de ${notification.score}%.`,
          date: new Date(),
          read: false,
          contenuId: notification.quizId,
          linkedId: notification.quizId,
          etudiantId: notification.etudiantId,
          enseignantId: notification.enseignantId
        };
        
        return of(mockNotification);
      })
    );
  }

  // Générer des notifications académiques simulées pour les tests
  generateMockAcademicNotifications(userId: string): AcademicNotification[] {
    const types: ("cours" | "devoir" | "quiz" | "soumission")[] = ["cours", "devoir", "quiz", "soumission"]
    const now = new Date()

    const mockNotifications: AcademicNotification[] = []

    for (let i = 0; i < 5; i++) {
      const daysAgo = i % 3 // 0, 1 ou 2 jours
      const date = new Date(now)
      date.setDate(date.getDate() - daysAgo)

      const type = types[i % types.length]
      const read = i > 2 // Les 3 premières sont non lues
      const contentId = `content-${i + 1}`

      mockNotifications.push({
        id: `academic-${i + 1}`,
        type,
        title: this.getMockAcademicTitle(type, i),
        message: this.getMockAcademicMessage(type, i),
        date,
        read,
        contenuId: contentId,
        linkedId: contentId, // Ajout de la propriété manquante
        etudiantId: userId,
      })
    }

    return mockNotifications
  }

  // Générer des notifications de messages simulées pour les tests
  generateMockMessageNotifications(userId: string): MessageNotification[] {
    const now = new Date()

    const mockNotifications: MessageNotification[] = []

    for (let i = 0; i < 5; i++) {
      const daysAgo = i % 3 // 0, 1 ou 2 jours
      const date = new Date(now)
      date.setDate(date.getDate() - daysAgo)

      const read = i > 1 // Les 2 premières sont non lues
      const messageId = `message-${i + 1}`

      mockNotifications.push({
        id: `message-${i + 1}`,
        type: "message",
        title: `Nouveau message dans "${this.getMockForumTopic(i)}"`,
        message: `${this.getMockSenderName(i)} a répondu à votre message dans la discussion "${this.getMockForumTopic(i)}"`,
        date,
        read,
        expediteurId: `user-${i + 10}`,
        expediteurNom: this.getMockSenderName(i),
        sujetId: `topic-${i + 1}`,
        sujetTitre: this.getMockForumTopic(i),
        messageId: messageId, // Ajout de la propriété manquante
      })
    }

    return mockNotifications
  }

  private getMockAcademicTitle(type: string, index: number): string {
    switch (type) {
      case "cours":
        return `Nouveau chapitre disponible (${index + 1})`
      case "devoir":
        return `Devoir assigné (${index + 1})`
      case "quiz":
        return `Quiz disponible (${index + 1})`
      case "soumission":
        return `Devoir évalué (${index + 1})`
      default:
        return `Notification (${index + 1})`
    }
  }

  private getMockAcademicMessage(type: string, index: number): string {
    switch (type) {
      case "cours":
        return `Le chapitre ${index + 1} du cours est maintenant disponible.`
      case "devoir":
        return `Un nouveau devoir a été assigné, à rendre avant le ${this.getFutureDate(7)}.`
      case "quiz":
        return `Un nouveau quiz est disponible jusqu'au ${this.getFutureDate(3)}.`
      case "soumission":
        return `Votre devoir a été évalué. Note: ${15 + index}/20.`
      default:
        return `Contenu de la notification ${index + 1}.`
    }
  }

  private getMockSenderName(index: number): string {
    const names = ["Ahmed Ben Ali", "Fatima Trabelsi", "Mohamed Sassi", "Leila Gharbi", "Karim Bouzid"]
    return names[index % names.length]
  }

  private getMockForumTopic(index: number): string {
    const topics = [
      "Questions sur le TP1",
      "Problème avec l'exercice 3",
      "Date de l'examen final",
      "Documentation du projet",
      "Ressources supplémentaires",
    ]
    return topics[index % topics.length]
  }

  private getFutureDate(days: number): string {
    const date = new Date()
    date.setDate(date.getDate() + days)
    return date.toLocaleDateString("fr-FR")
  }
}