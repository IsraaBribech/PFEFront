import { Injectable } from "@angular/core"
import  { HttpClient } from "@angular/common/http"
import { type Observable, throwError } from "rxjs"
import { catchError, tap } from "rxjs/operators"

// Interface pour les soumissions de quiz
export interface QuizSubmission {
  etudiantId: string
  etudiantName: string
  etudiantEmail?: string
  etudiantMatricule?: string
  etudiantGroupe?: string
  devoirId?: string
  quizId?: string
  dateCompletion: string | Date
  score: number
  reponses?: any[]
  commentaire?: string
}

@Injectable({
  providedIn: "root",
})
export class SoumissionsService {
  // URL de base de l'API
  private apiBaseUrl = "http://localhost:5000/api"
  private soumissionsUrl = `${this.apiBaseUrl}/soumissions`

  constructor(private http: HttpClient) {}

  /**
   * Soumet un devoir
   * @param etudiantId ID de l'étudiant
   * @param etudiantName Nom de l'étudiant
   * @param devoirId ID du devoir
   * @param file Fichier à soumettre
   * @param commentaire Commentaire optionnel
   */
  soumettreDevoir(
    etudiantId: string,
    etudiantName: string,
    devoirId: string,
    file: File,
    commentaire?: string,
  ): Observable<any> {
    console.log(`SoumissionsService.soumettreDevoir - Soumission du devoir ${devoirId} par l'étudiant ${etudiantId}`)
    console.log(`Fichier: ${file.name}, taille: ${file.size} bytes, type: ${file.type}`)

    // Créer un FormData pour envoyer les données
    const formData = new FormData()
    formData.append("etudiantId", etudiantId)
    formData.append("etudiantName", etudiantName)
    formData.append("devoirId", devoirId)

    if (commentaire) {
      formData.append("commentaire", commentaire)
    }

    // Ajouter le fichier - utiliser le nom de champ 'fichierSoumission' au lieu de 'fichier'
    formData.append("fichierSoumission", file, file.name)

    // Afficher le contenu du FormData pour le débogage
    console.log("FormData content:", this.logFormData(formData))

    // Retourner un Observable simple sans gestion d'événements qui peut causer des problèmes
    return this.http.post<any>(this.soumissionsUrl, formData).pipe(
      tap((response) => console.log("Soumission réussie:", response)),
      catchError((error) => {
        console.error("SoumissionsService.soumettreDevoir - Erreur détaillée:", error)

        // Vérifier si l'erreur est liée à la connexion réseau
        if (!navigator.onLine) {
          return throwError(
            () => new Error("Pas de connexion Internet. Veuillez vérifier votre connexion et réessayer."),
          )
        }

        // Erreur HTTP standard
        let errorMessage = "Une erreur est survenue lors de la soumission"

        if (error.error instanceof ErrorEvent) {
          // Erreur côté client
          errorMessage = `Erreur: ${error.error.message}`
        } else {
          // Erreur côté serveur
          errorMessage = `Code d'erreur: ${error.status}\nMessage: ${error.error?.message || error.statusText}`

          // Ajouter des détails spécifiques selon le code d'erreur
          if (error.status === 500) {
            errorMessage = "Erreur serveur interne. Veuillez réessayer plus tard ou contacter l'administrateur."
          } else if (error.status === 413) {
            errorMessage = "Le fichier est trop volumineux. La taille maximale est de 10 Mo."
          } else if (error.status === 415) {
            errorMessage = "Format de fichier non supporté. Veuillez utiliser PDF, JPG ou PNG."
          } else if (error.status === 0) {
            errorMessage = "Impossible de se connecter au serveur. Veuillez vérifier votre connexion internet."
          }
        }

        return throwError(() => new Error(errorMessage))
      }),
    )
  }

  /**
   * Soumet un quiz
   * @param etudiantId ID de l'étudiant
   * @param etudiantName Nom de l'étudiant
   * @param quizId ID du quiz
   * @param reponses Réponses au quiz
   * @param score Score obtenu
   * @param commentaire Commentaire optionnel
   */
  soumettreQuiz(
    etudiantId: string,
    etudiantName: string,
    quizId: string,
    reponses: any[],
    score: number,
    commentaire?: string,
  ): Observable<any> {
    console.log(`SoumissionsService.soumettreQuiz - Soumission du quiz ${quizId} par l'étudiant ${etudiantId}`)

    const data = {
      etudiantId,
      etudiantName,
      quizId,
      reponses,
      score,
      dateCompletion: new Date(),
      commentaire,
    }

    return this.http.post<any>(`${this.apiBaseUrl}/quiz-soumissions`, data).pipe(
      tap((response) => console.log("Soumission de quiz réussie:", response)),
      catchError((error) => {
        console.error("SoumissionsService.soumettreQuiz - Erreur détaillée:", error)
        return this.handleError(error)
      }),
    )
  }

  /**
   * Récupère les soumissions d'un étudiant
   * @param etudiantId ID de l'étudiant
   */
  getSoumissionsByEtudiant(etudiantId: string): Observable<any> {
    console.log(
      `SoumissionsService.getSoumissionsByEtudiant - Récupération des soumissions pour l'étudiant ${etudiantId}`,
    )

    return this.http.get<any>(`${this.apiBaseUrl}/quiz-soumissions/etudiant/${etudiantId}`).pipe(
      tap((response) => console.log("SoumissionsService.getSoumissionsByEtudiant - Réponse reçue:", response)),
      catchError((error) => {
        console.error("SoumissionsService.getSoumissionsByEtudiant - Erreur:", error)
        return this.handleError(error)
      }),
    )
  }

  /**
   * Récupère les soumissions d'un devoir
   * @param devoirId ID du devoir
   */
  getSoumissionsByDevoir(devoirId: string): Observable<any> {
    console.log(`SoumissionsService.getSoumissionsByDevoir - Récupération des soumissions pour le devoir ${devoirId}`)

    // Utiliser le bon endpoint pour récupérer les soumissions par devoir
    return this.http.get<any>(`${this.soumissionsUrl}/devoir/${devoirId}`).pipe(
      tap((response) => console.log("SoumissionsService.getSoumissionsByDevoir - Réponse reçue:", response)),
      catchError((error) => {
        console.error("SoumissionsService.getSoumissionsByDevoir - Erreur:", error)
        return this.handleError(error)
      }),
    )
  }

  /**
   * Récupère les soumissions d'un quiz
   * @param quizId ID du quiz
   */
  getSoumissionsByQuiz(quizId: string): Observable<QuizSubmission[]> {
    console.log(`SoumissionsService.getSoumissionsByQuiz - Récupération des soumissions pour le quiz ${quizId}`)

    return this.http.get<QuizSubmission[]>(`${this.apiBaseUrl}/quiz-soumissions/quiz/${quizId}`).pipe(
      tap((response) => console.log("SoumissionsService.getSoumissionsByQuiz - Réponse reçue:", response)),
      catchError((error) => {
        console.error("SoumissionsService.getSoumissionsByQuiz - Erreur:", error)
        return this.handleError(error)
      }),
    )
  }

  /**
   * Évalue une soumission
   * @param soumissionId ID de la soumission
   * @param note Note attribuée
   * @param feedback Commentaire de l'enseignant
   */
  evaluerSoumission(soumissionId: string, note: number, feedback: string): Observable<any> {
    console.log(`SoumissionsService.evaluerSoumission - Évaluation de la soumission ${soumissionId}`)

    const data = {
      note,
      commentaire: feedback, // Assurez-vous que le nom du champ correspond à ce que le backend attend
    }

    return this.http.put<any>(`${this.soumissionsUrl}/${soumissionId}/evaluer`, data).pipe(
      tap((response) => console.log("SoumissionsService.evaluerSoumission - Réponse reçue:", response)),
      catchError((error) => {
        console.error("SoumissionsService.evaluerSoumission - Erreur:", error)
        return this.handleError(error)
      }),
    )
  }

  /**
   * Obtient l'URL de téléchargement d'un fichier de soumission
   * @param soumissionId ID de la soumission
   */
  getSoumissionFileUrl(soumissionId: string): string {
    return `${this.soumissionsUrl}/${soumissionId}/fichier`
  }

  /**
   * Gestion des erreurs HTTP
   * @param error L'erreur HTTP
   */
  private handleError(error: any) {
    console.error("SoumissionsService - Erreur HTTP:", error)

    let errorMessage = "Une erreur est survenue"

    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur: ${error.error.message}`
      console.error("Erreur côté client:", error.error.message)
    } else {
      // Erreur côté serveur
      errorMessage = `Code d'erreur: ${error.status}\nMessage: ${error.error?.message || error.statusText}`
      console.error(`Erreur côté serveur - Code: ${error.status}, Message:`, error.error)
    }

    return throwError(() => new Error(errorMessage))
  }

  /**
   * Utilitaire pour logger le contenu d'un FormData
   * @param formData Le FormData à logger
   */
  private logFormData(formData: FormData): any {
    const formDataObj: any = {}
    formData.forEach((value, key) => {
      // Ne pas afficher le contenu des fichiers, juste leur nom
      if (value instanceof File) {
        formDataObj[key] = `File: ${value.name} (${value.size} bytes)`
      } else {
        formDataObj[key] = value
      }
    })
    return formDataObj
  }
}
