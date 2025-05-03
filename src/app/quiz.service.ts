import { Injectable } from "@angular/core"
import  { HttpClient } from "@angular/common/http"
import { type Observable, of, throwError } from "rxjs"
import { catchError, map, tap } from "rxjs/operators"

// Interface pour les options de questions
export interface QuizOption {
  text: string
  isCorrect: boolean
}

// Interface pour les questions de quiz
export interface QuizQuestion {
  text: string
  type: "single" | "multiple" | "text"
  options?: QuizOption[]
  correctAnswer?: string
  points: number
}

// Interface pour les étudiants - mise à jour avec les propriétés manquantes
export interface Student {
  _id: string
  name: string
  email: string
  matricule: string
  group: string
  // Nouvelles propriétés pour les soumissions
  hasResponded?: boolean
  submissionDate?: Date
  score?: number
  responses?: any[] // Réponses de l'étudiant au quiz
}

// Interface pour les quiz
export interface Quiz {
  _id?: string
  title: string
  description?: string
  subject?: string
  cour?: string
  chapitreId?: string
  type?: string
  duration?: number
  dueDate?: Date
  questions?: QuizQuestion[]
  teacher?: string
  createdAt?: Date
  students?: Student[]
  responseCount?: number
}

@Injectable({
  providedIn: "root",
})
export class QuizService {
  private apiUrl = "http://localhost:5000/api/quiz"
  private useMockData = false // Pour le mode hors ligne

  constructor(private http: HttpClient) {
    // Vérifier la connexion au backend
    this.checkBackendConnection()
  }

  /**
   * Vérifie la connexion au backend
   */
  private checkBackendConnection(): void {
    this.http
      .get("http://localhost:5000/api/health-check")
      .pipe(
        tap(() => {
          console.log("Backend connecté avec succès")
          this.useMockData = false
        }),
        catchError((error) => {
          console.warn("Échec de connexion au backend. Mode hors ligne activé.", error)
          this.useMockData = true
          return of(null)
        }),
      )
      .subscribe()
  }

  /**
   * Récupère tous les quiz
   */
  getQuizzes(): Observable<Quiz[]> {
    if (this.useMockData) {
      return of(this.generateMockQuizzes())
    }

    return this.http.get<any>(this.apiUrl).pipe(
      map((response) => response.data || []),
      catchError((error) => {
        console.error("Erreur lors de la récupération des quiz:", error)
        if (error.status === 0 || error.status === 404) {
          this.useMockData = true
          return this.getQuizzes()
        }
        return throwError(() => error)
      }),
    )
  }

  /**
   * Récupère les quiz pour les étudiants
   * Nouvelle méthode pour récupérer les quiz destinés aux étudiants
   */
  getQuizzesForStudents(): Observable<Quiz[]> {
    if (this.useMockData) {
      return of(this.generateMockQuizzes())
    }

    return this.http.get<any>(`${this.apiUrl}/for-students`).pipe(
      map((response) => response.data || []),
      catchError((error) => {
        console.error("Erreur lors de la récupération des quiz pour les étudiants:", error)
        if (error.status === 0 || error.status === 404) {
          this.useMockData = true
          return this.getQuizzes()
        }
        return throwError(() => error)
      }),
    )
  }

  /**
   * Récupère un quiz par son ID
   */
  getQuizById(id: string): Observable<Quiz> {
    if (this.useMockData) {
      const quiz = this.generateMockQuizzes().find((q) => q._id === id)
      return quiz ? of(quiz) : throwError(() => new Error("Quiz non trouvé"))
    }

    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map((response) => response.data),
      catchError((error) => {
        console.error(`Erreur lors de la récupération du quiz ${id}:`, error)
        if (error.status === 0 || error.status === 404) {
          this.useMockData = true
          return this.getQuizById(id)
        }
        return throwError(() => error)
      }),
    )
  }

  /**
   * Crée un nouveau quiz
   */
  createQuiz(quiz: Quiz): Observable<Quiz> {
    if (this.useMockData) {
      const newQuiz = {
        ...quiz,
        _id: `mock-${Date.now()}`,
        createdAt: new Date(),
      }
      return of(newQuiz)
    }

    return this.http.post<any>(this.apiUrl, quiz).pipe(
      map((response) => response.data),
      catchError((error) => {
        console.error("Erreur lors de la création du quiz:", error)
        if (error.status === 0 || error.status === 404) {
          this.useMockData = true
          return this.createQuiz(quiz)
        }
        return throwError(() => error)
      }),
    )
  }

  /**
   * Met à jour un quiz existant
   */
  updateQuiz(id: string, quiz: Quiz): Observable<Quiz> {
    if (this.useMockData) {
      const updatedQuiz = {
        ...quiz,
        _id: id,
      }
      return of(updatedQuiz)
    }

    return this.http.put<any>(`${this.apiUrl}/${id}`, quiz).pipe(
      map((response) => response.data),
      catchError((error) => {
        console.error(`Erreur lors de la mise à jour du quiz ${id}:`, error)
        if (error.status === 0 || error.status === 404) {
          this.useMockData = true
          return this.updateQuiz(id, quiz)
        }
        return throwError(() => error)
      }),
    )
  }

  /**
   * Supprime un quiz
   */
  deleteQuiz(id: string): Observable<any> {
    if (this.useMockData) {
      return of({ success: true, message: "Quiz supprimé avec succès" })
    }

    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.error(`Erreur lors de la suppression du quiz ${id}:`, error)
        if (error.status === 0 || error.status === 404) {
          this.useMockData = true
          return this.deleteQuiz(id)
        }
        return throwError(() => error)
      }),
    )
  }

  /**
   * Récupère les quiz par matière ou sujet
   */
  getQuizzesBySubject(subject: string): Observable<Quiz[]> {
    if (this.useMockData) {
      return of(this.generateMockQuizzes().filter((q) => q.subject === subject))
    }

    return this.http.get<any>(`${this.apiUrl}/subject/${subject}`).pipe(
      map((response) => response.data || []),
      catchError((error) => {
        console.error(`Erreur lors de la récupération des quiz pour le sujet ${subject}:`, error)
        if (error.status === 0 || error.status === 404) {
          this.useMockData = true
          return this.getQuizzesBySubject(subject)
        }
        return throwError(() => error)
      }),
    )
  }

  /**
   * Génère des quiz fictifs pour le mode hors ligne
   */
  private generateMockQuizzes(): Quiz[] {
    return [
      {
        _id: "mock-1",
        title: "Introduction aux algorithmes",
        description: "Quiz sur les concepts de base des algorithmes",
        subject: "Algorithmes",
        type: "Cours",
        duration: 30,
        dueDate: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        teacher: "teacher-id",
        questions: [
          {
            text: "Qu'est-ce qu'un algorithme?",
            type: "single",
            options: [
              { text: "Un langage de programmation", isCorrect: false },
              { text: "Une suite d'instructions pour résoudre un problème", isCorrect: true },
              { text: "Un type de données", isCorrect: false },
              { text: "Un composant matériel", isCorrect: false },
            ],
            points: 2,
          },
          {
            text: "Quels sont les avantages des algorithmes récursifs?",
            type: "multiple",
            options: [
              { text: "Ils sont toujours plus rapides", isCorrect: false },
              { text: "Ils peuvent simplifier la résolution de problèmes complexes", isCorrect: true },
              { text: "Ils utilisent moins de mémoire", isCorrect: false },
              { text: "Ils peuvent être appliqués à des problèmes divisibles", isCorrect: true },
            ],
            points: 3,
          },
          {
            text: "Expliquez la complexité temporelle et donnez un exemple d'algorithme avec sa complexité.",
            type: "text",
            points: 5,
          },
        ],
        students: [
          {
            _id: "student-1",
            name: "Ahmed Ben Ali",
            email: "ahmed@example.com",
            matricule: "12345",
            group: "G1",
            hasResponded: true,
            submissionDate: new Date(),
            score: 85,
          },
          {
            _id: "student-2",
            name: "Fatima Trabelsi",
            email: "fatima@example.com",
            matricule: "12346",
            group: "G1",
            hasResponded: false,
          },
        ],
        responseCount: 1,
      },
      {
        _id: "mock-2",
        title: "Structures de données avancées",
        description: "Quiz sur les arbres et les graphes",
        subject: "Structures de données",
        type: "TD",
        duration: 45,
        dueDate: new Date(new Date().getTime() + 3 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        teacher: "teacher-id",
        questions: [
          {
            text: "Qu'est-ce qu'un arbre binaire de recherche?",
            type: "single",
            options: [
              { text: "Un arbre où chaque nœud a exactement deux enfants", isCorrect: false },
              {
                text: "Un arbre où pour chaque nœud, tous les éléments dans le sous-arbre gauche sont inférieurs et tous les éléments dans le sous-arbre droit sont supérieurs",
                isCorrect: true,
              },
              { text: "Un arbre où les nœuds sont stockés dans un tableau", isCorrect: false },
              { text: "Un arbre où la hauteur est minimale", isCorrect: false },
            ],
            points: 2,
          },
        ],
        students: [],
        responseCount: 0,
      },
    ]
  }
}
