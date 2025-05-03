import { Injectable } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { type Observable, of } from "rxjs"
import { catchError, tap } from "rxjs/operators"

export interface Message {
  _id?: string
  expediteur: "etudiant" | "enseignant"
  expediteurId: string
  nomExpediteur: string
  avatarExpediteur: string
  destinataireId: string
  destinataire: string
  matiereId: string
  matiere: string
  sujet: string
  contenu: string
  dateEnvoi: Date
  lu: boolean
  reponses?: Message[]
}

export interface Matiere {
  _id: string
  nom: string
  enseignant: string
  enseignantId: string
  couleur: string
  icon: string
}

@Injectable({
  providedIn: "root",
})
export class MessageService {
  private apiUrl = "http://localhost:5000/api"

  constructor(private http: HttpClient) {}

  // Récupérer les messages reçus par un étudiant
  getMessagesRecus(etudiantId: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.apiUrl}/messages/recus/${etudiantId}`).pipe(
      tap((messages) => console.log("Messages reçus récupérés:", messages)),
      catchError(this.handleError<Message[]>("getMessagesRecus", [])),
    )
  }

  // Récupérer les messages envoyés par un étudiant
  getMessagesEnvoyes(etudiantId: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.apiUrl}/messages/envoyes/${etudiantId}`).pipe(
      tap((messages) => console.log("Messages envoyés récupérés:", messages)),
      catchError(this.handleError<Message[]>("getMessagesEnvoyes", [])),
    )
  }

  // Récupérer les messages reçus par un étudiant pour une matière spécifique
  getMessagesRecusByMatiere(etudiantId: string, matiereId: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.apiUrl}/messages/recus/${etudiantId}/matiere/${matiereId}`).pipe(
      tap((messages) => console.log(`Messages reçus pour la matière ${matiereId} récupérés:`, messages)),
      catchError((error) => {
        console.error(`Erreur lors de la récupération des messages reçus pour la matière ${matiereId}:`, error);
        
        // Si l'API n'est pas encore implémentée, simuler des données
        if (error.status === 404) {
          console.log("Simulation de données pour les messages reçus par matière");
          return of(this.getMockMessagesRecusByMatiere(matiereId));
        }
        
        return this.handleError<Message[]>(`getMessagesRecusByMatiere(${matiereId})`, [])(error);
      })
    );
  }

  // Récupérer les messages envoyés par un étudiant pour une matière spécifique
  getMessagesEnvoyesByMatiere(etudiantId: string, matiereId: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.apiUrl}/messages/envoyes/${etudiantId}/matiere/${matiereId}`).pipe(
      tap((messages) => console.log(`Messages envoyés pour la matière ${matiereId} récupérés:`, messages)),
      catchError((error) => {
        console.error(`Erreur lors de la récupération des messages envoyés pour la matière ${matiereId}:`, error);
        
        // Si l'API n'est pas encore implémentée, simuler des données
        if (error.status === 404) {
          console.log("Simulation de données pour les messages envoyés par matière");
          return of(this.getMockMessagesEnvoyesByMatiere(matiereId));
        }
        
        return this.handleError<Message[]>(`getMessagesEnvoyesByMatiere(${matiereId})`, [])(error);
      })
    );
  }

  // Récupérer les matières disponibles pour un étudiant
  getMatieresForEtudiant(etudiantId: string): Observable<Matiere[]> {
    return this.http.get<Matiere[]>(`${this.apiUrl}/matieres/etudiant/${etudiantId}`).pipe(
      tap((matieres) => console.log("Matières récupérées:", matieres)),
      catchError((error) => {
        console.error("Erreur lors de la récupération des matières:", error);
        
        // Si l'API n'est pas encore implémentée, simuler des données
        if (error.status === 404) {
          console.log("Simulation de données pour les matières");
          return of(this.getMockMatieres());
        }
        
        // Propager l'erreur au lieu de retourner un tableau vide
        throw error;
      }),
    )
  }

  // Envoyer un nouveau message
  envoyerMessage(message: Message): Observable<Message> {
    return this.http.post<Message>(`${this.apiUrl}/messages`, message).pipe(
      tap((newMessage) => console.log("Message envoyé:", newMessage)),
      catchError(this.handleError<Message>("envoyerMessage")),
    )
  }

  // Répondre à un message
  repondreMessage(messageId: string, reponse: Message): Observable<Message> {
    return this.http.post<Message>(`${this.apiUrl}/messages/${messageId}/reponses`, reponse).pipe(
      tap((updatedMessage) => console.log("Réponse envoyée:", updatedMessage)),
      catchError(this.handleError<Message>("repondreMessage")),
    )
  }

  // Marquer un message comme lu
  marquerCommeLu(messageId: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/messages/${messageId}/lu`, {}).pipe(
      tap(() => console.log("Message marqué comme lu")),
      catchError(this.handleError<any>("marquerCommeLu")),
    )
  }

  // Données simulées pour les tests
  private getMockMatieres(): Matiere[] {
    return [
      {
        _id: "mat1",
        nom: "Algorithmique Avancée",
        enseignant: "Dr. Ahmed Benali",
        enseignantId: "ens1",
        couleur: "#4f46e5",
        icon: "fa-code",
      },
      {
        _id: "mat2",
        nom: "Bases de Données",
        enseignant: "Prof. Sarah Mansouri",
        enseignantId: "ens2",
        couleur: "#10b981",
        icon: "fa-database",
      },
      {
        _id: "mat3",
        nom: "Réseaux Informatiques",
        enseignant: "Dr. Mohamed Kaddour",
        enseignantId: "ens3",
        couleur: "#f59e0b",
        icon: "fa-network-wired",
      },
      {
        _id: "mat4",
        nom: "Intelligence Artificielle",
        enseignant: "Prof. Leila Hamidi",
        enseignantId: "ens4",
        couleur: "#8b5cf6",
        icon: "fa-brain",
      },
    ];
  }

  private getMockMessagesRecusByMatiere(matiereId: string): Message[] {
    const mockMessages: Message[] = [
      {
        _id: "msg1",
        expediteur: "enseignant",
        expediteurId: "ens1",
        nomExpediteur: "Dr. Ahmed Benali",
        avatarExpediteur: "AB",
        destinataireId: "dummy-id",
        destinataire: "Israa Bribech",
        matiereId: "mat1",
        matiere: "Algorithmique Avancée",
        sujet: "Informations sur le prochain TP",
        contenu:
          "Bonjour à tous,\n\nJe vous informe que le prochain TP portera sur les algorithmes de tri avancés. Veuillez préparer les exercices 3 et 4 du chapitre 5.\n\nCordialement,\nDr. Benali",
        dateEnvoi: new Date(2023, 4, 15, 10, 30),
        lu: false,
      },
      {
        _id: "msg2",
        expediteur: "enseignant",
        expediteurId: "ens1",
        nomExpediteur: "Dr. Ahmed Benali",
        avatarExpediteur: "AB",
        destinataireId: "dummy-id",
        destinataire: "Israa Bribech",
        matiereId: "mat1",
        matiere: "Algorithmique Avancée",
        sujet: "Changement de salle pour le cours",
        contenu:
          "Chers étudiants,\n\nJe vous informe que notre prochain cours aura lieu dans la salle B204 au lieu de la salle habituelle.\n\nMerci de votre attention,\nDr. Benali",
        dateEnvoi: new Date(2023, 4, 10, 14, 15),
        lu: true,
      },
    ];

    return mockMessages.filter(msg => msg.matiereId === matiereId);
  }

  private getMockMessagesEnvoyesByMatiere(matiereId: string): Message[] {
    const mockMessages: Message[] = [
      {
        _id: "msg3",
        expediteur: "etudiant",
        expediteurId: "dummy-id",
        nomExpediteur: "Israa Bribech",
        avatarExpediteur: "IB",
        destinataireId: "ens1",
        destinataire: "Dr. Ahmed Benali",
        matiereId: "mat1",
        matiere: "Algorithmique Avancée",
        sujet: "Question sur l'exercice 2",
        contenu:
          "Bonjour Dr. Benali,\n\nJ'ai une question concernant l'exercice 2 du dernier TD. Pourriez-vous m'expliquer comment appliquer l'algorithme de Dijkstra dans ce cas précis?\n\nMerci d'avance,\nIsraa Bribech",
        dateEnvoi: new Date(2023, 4, 12, 9, 45),
        lu: true,
        reponses: [
          {
            expediteur: "enseignant",
            expediteurId: "ens1",
            nomExpediteur: "Dr. Ahmed Benali",
            avatarExpediteur: "AB",
            destinataireId: "dummy-id",
            destinataire: "Israa Bribech",
            matiereId: "mat1",
            matiere: "Algorithmique Avancée",
            sujet: "Re: Question sur l'exercice 2",
            contenu:
              "Bonjour Israa,\n\nPour appliquer l'algorithme de Dijkstra dans cet exercice, vous devez d'abord modéliser le problème sous forme de graphe pondéré. Ensuite, suivez les étapes suivantes:\n\n1. Initialisez les distances\n2. Sélectionnez le nœud de départ\n3. Mettez à jour les distances des voisins\n4. Marquez le nœud comme visité\n5. Répétez jusqu'à ce que tous les nœuds soient visités\n\nN'hésitez pas si vous avez d'autres questions.\n\nCordialement,\nDr. Benali",
            dateEnvoi: new Date(2023, 4, 12, 14, 30),
            lu: true,
          },
        ],
      },
    ];

    return mockMessages.filter(msg => msg.matiereId === matiereId);
  }

  // Gestion des erreurs
  private handleError<T>(operation = "operation", result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} a échoué:`, error)
      // Retourner un résultat vide pour continuer l'application
      return of(result as T)
    }
  }
}