import { Injectable } from "@angular/core"
import  { HttpClient } from "@angular/common/http"
import { type Observable, of, throwError } from "rxjs"
import { catchError, map, tap } from "rxjs/operators"

// Interface pour les options de questions
export interface QuizOption {
  text: string
  isCorrect: boolean
  _id?: string
}

// Interface pour les questions de quiz
export interface QuizQuestion {
  text: string
  type: "single" | "multiple" | "text"
  options?: QuizOption[]
  correctAnswer?: string
  points: number
  _id?: string
}

// Interface pour les étudiants
export interface Student {
  _id: string
  name: string
  email: string
  matricule: string
  group: string
  hasResponded?: boolean
  submissionDate?: Date
  score?: number
  responses?: any[]
}

// Interface pour les enseignants
export interface Teacher {
  _id: string
  name: string
  prenom?: string
  email?: string
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
  teacher?: string | Teacher
  teacherName?: string
  createdAt?: Date
  students?: Student[]
  responseCount?: number
  published?: boolean
  isActive?: boolean
  passingScore?: number
  maxAttempts?: number
  allowRetake?: boolean
  randomizeQuestions?: boolean
  showCorrectAnswers?: boolean
}

@Injectable({
  providedIn: "root",
})
export class QuizService {
  private apiUrl = "http://localhost:5001/api/quiz"
  private useMockData = false

  constructor(private http: HttpClient) {
    this.checkBackendConnection()
  }

  /**
   * Vérifie la connexion au backend
   */
  private checkBackendConnection(): void {
    this.http
      .get(`${this.apiUrl}/health-check`)
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
      map((response) => {
        console.log("Réponse brute du serveur (getQuizzes):", response)
        const quizzes = response.data || []
        // Extraire le nom de l'enseignant si disponible
        return quizzes.map((quiz: Quiz) => {
          if (quiz.teacher && typeof quiz.teacher === "object") {
            quiz.teacherName = this.formatTeacherName(quiz.teacher as Teacher)
          }
          return quiz
        })
      }),
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
   */
  getQuizzesForStudents(): Observable<Quiz[]> {
    if (this.useMockData) {
      return of(this.generateMockQuizzes())
    }

    // Utiliser la même route que getQuizzes mais avec un paramètre pour indiquer que c'est pour un étudiant
    return this.http.get<any>(`${this.apiUrl}?forStudent=true`).pipe(
      map((response) => {
        console.log("Réponse brute du serveur (getQuizzesForStudents):", response)
        const quizzes = response.data || []
        // Extraire le nom de l'enseignant si disponible
        return quizzes.map((quiz: Quiz) => {
          if (quiz.teacher && typeof quiz.teacher === "object") {
            quiz.teacherName = this.formatTeacherName(quiz.teacher as Teacher)
          }
          return quiz
        })
      }),
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
  getQuizById(id: string, forStudent = false): Observable<Quiz> {
    if (this.useMockData) {
      const quiz = this.generateMockQuizzes().find((q) => q._id === id)
      return quiz ? of(quiz) : throwError(() => new Error("Quiz non trouvé"))
    }

    // Ajouter le paramètre forStudent pour indiquer si c'est pour un étudiant
    return this.http.get<any>(`${this.apiUrl}/${id}?forStudent=${forStudent}`).pipe(
      map((response) => {
        console.log(`Réponse brute du serveur (getQuizById ${id}):`, response)
        const quiz = response.data
        // Extraire le nom de l'enseignant si disponible
        if (quiz.teacher && typeof quiz.teacher === "object") {
          quiz.teacherName = this.formatTeacherName(quiz.teacher as Teacher)
        }
        return quiz
      }),
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

    console.log("Données envoyées au serveur (createQuiz):", quiz)
    return this.http.post<any>(this.apiUrl, quiz).pipe(
      map((response) => {
        console.log("Réponse du serveur (createQuiz):", response)
        return response.data
      }),
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

    console.log(`Données envoyées au serveur (updateQuiz ${id}):`, quiz)
    return this.http.put<any>(`${this.apiUrl}/${id}`, quiz).pipe(
      map((response) => {
        console.log(`Réponse du serveur (updateQuiz ${id}):`, response)
        return response.data
      }),
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
      tap((response) => console.log(`Réponse du serveur (deleteQuiz ${id}):`, response)),
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

    return this.http.get<any>(`${this.apiUrl}?subject=${subject}`).pipe(
      map((response) => {
        console.log(`Réponse du serveur (getQuizzesBySubject ${subject}):`, response)
        return response.data || []
      }),
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
   * Formate le nom de l'enseignant
   */
  private formatTeacherName(teacher: Teacher): string {
    if (!teacher) return "Enseignant inconnu"

    if (teacher.prenom) {
      return `${teacher.prenom} ${teacher.name}`
    }

    return teacher.name || "Enseignant inconnu"
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
        teacherName: "Dr. Martin Dupont",
        questions: [
          {
            _id: "q1",
            text: "Qu'est-ce qu'un algorithme?",
            type: "single",
            options: [
              { _id: "o1", text: "Un langage de programmation", isCorrect: false },
              { _id: "o2", text: "Une suite d'instructions pour résoudre un problème", isCorrect: true },
              { _id: "o3", text: "Un type de données", isCorrect: false },
              { _id: "o4", text: "Un composant matériel", isCorrect: false },
            ],
            points: 2,
          },
          {
            _id: "q2",
            text: "Quels sont les avantages des algorithmes récursifs?",
            type: "multiple",
            options: [
              { _id: "o5", text: "Ils sont toujours plus rapides", isCorrect: false },
              { _id: "o6", text: "Ils peuvent simplifier la résolution de problèmes complexes", isCorrect: true },
              { _id: "o7", text: "Ils utilisent moins de mémoire", isCorrect: false },
              { _id: "o8", text: "Ils peuvent être appliqués à des problèmes divisibles", isCorrect: true },
            ],
            points: 3,
          },
          {
            _id: "q3",
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
        published: true,
        isActive: true,
        passingScore: 60,
        maxAttempts: 3,
        allowRetake: true,
        randomizeQuestions: false,
        showCorrectAnswers: true,
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
        teacherName: "Prof. Claire Dubois",
        questions: [
          {
            _id: "q4",
            text: "Qu'est-ce qu'un arbre binaire de recherche?",
            type: "single",
            options: [
              { _id: "o9", text: "Un arbre où chaque nœud a exactement deux enfants", isCorrect: false },
              {
                _id: "o10",
                text: "Un arbre où pour chaque nœud, tous les éléments dans le sous-arbre gauche sont inférieurs et tous les éléments dans le sous-arbre droit sont supérieurs",
                isCorrect: true,
              },
              { _id: "o11", text: "Un arbre où les nœuds sont stockés dans un tableau", isCorrect: false },
              { _id: "o12", text: "Un arbre où la hauteur est minimale", isCorrect: false },
            ],
            points: 2,
          },
        ],
        students: [],
        responseCount: 0,
        published: true,
        isActive: true,
        passingScore: 60,
        maxAttempts: 2,
        allowRetake: false,
        randomizeQuestions: true,
        showCorrectAnswers: false,
      },
    ]
  }
}
