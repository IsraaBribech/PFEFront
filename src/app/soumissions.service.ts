import { Injectable } from "@angular/core"
import { HttpClient, HttpHeaders } from "@angular/common/http"
import { type Observable, throwError, of } from "rxjs"
import { catchError, tap, map } from "rxjs/operators"

// Interface pour les soumissions de quiz
export interface QuizSubmission {
  _id?: string
  quiz: string
  etudiantId: string
  etudiantName: string
  etudiantEmail?: string
  etudiantMatricule?: string
  etudiantGroupe?: string
  devoirId?: string
  quizId?: string
  enseignantId?: string
  dateCompletion: string | Date
  score: number
  reponses?: any[]
  commentaire?: string
  startTime?: Date
  endTime?: Date
  completed?: boolean
}

// Interface pour les soumissions de devoir
export interface DevoirSubmission {
  _id?: string
  etudiantId: string
  etudiantName: string
  etudiantEmail?: string
  etudiantMatricule?: string
  etudiantGroupe?: string
  devoirId: string
  commentaire?: string
  dateSoumission: Date
  fichier: any
  note?: number
  feedback?: string
  evaluated?: boolean
  dateEvaluation?: Date
}

@Injectable({
  providedIn: "root",
})
export class SoumissionsService {
  // URL de base de l'API
  private apiBaseUrl = "http://localhost:5001/api"
  private soumissionsUrl = `${this.apiBaseUrl}/soumissions`
  private quizSoumissionsUrl = `${this.apiBaseUrl}/quiz-soumissions`
  private useMockData = false

  constructor(private http: HttpClient) {
    this.checkBackendConnection()
  }

  /**
   * Vérifie la connexion au backend
   */
  private checkBackendConnection(): void {
    this.http
      .get(`${this.apiBaseUrl}/health-check`)
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
   * Soumet un devoir
   */
  soumettreDevoir(
    etudiantId: string,
    etudiantName: string,
    devoirId: string,
    file: File,
    commentaire?: string,
    etudiantEmail?: string,
    etudiantMatricule?: string,
    etudiantGroupe?: string,
  ): Observable<any> {
    console.log(`SoumissionsService.soumettreDevoir - Soumission du devoir ${devoirId} par l'étudiant ${etudiantId}`)
    console.log(`Étudiant: ${etudiantName}, Email: ${etudiantEmail || 'Non spécifié'}`)
    console.log(`Fichier: ${file.name}, taille: ${file.size} bytes, type: ${file.type}`)

    if (this.useMockData) {
      return of({
        success: true,
        data: {
          _id: `mock-submission-${Date.now()}`,
          etudiantId,
          etudiantName,
          etudiantEmail,
          etudiantMatricule,
          etudiantGroupe,
          devoirId,
          fichier: {
            nom: file.name,
            chemin: `/uploads/devoirs/${file.name}`,
            type: file.type,
            taille: file.size
          },
          dateSoumission: new Date(),
          commentaire: commentaire || "",
        },
      })
    }

    // Créer un FormData pour envoyer les données
    const formData = new FormData()
    formData.append("etudiantId", etudiantId)
    formData.append("etudiantName", etudiantName)
    formData.append("devoirId", devoirId)

    // Ajouter les informations supplémentaires de l'étudiant si disponibles
    if (etudiantEmail) {
      formData.append("etudiantEmail", etudiantEmail)
    }
    if (etudiantMatricule) {
      formData.append("etudiantMatricule", etudiantMatricule)
    }
    if (etudiantGroupe) {
      formData.append("etudiantGroupe", etudiantGroupe)
    }
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
      catchError(this.handleError),
    )
  }

  /**
   * Soumet un quiz
   */
  soumettreQuiz(
    etudiantId: string,
    etudiantName: string,
    quizId: string,
    reponses: any[],
    score: number,
    enseignantId = "",
    etudiantEmail = "",
    etudiantMatricule = "",
    etudiantGroupe = "",
    commentaire?: string,
  ): Observable<any> {
    console.log(`SoumissionsService.soumettreQuiz - Soumission du quiz ${quizId} par l'étudiant ${etudiantId}`)
    console.log(`Enseignant destinataire: ${enseignantId || "Non spécifié"}`)

    if (this.useMockData) {
      return of({
        success: true,
        data: {
          _id: `mock-quiz-submission-${Date.now()}`,
          etudiantId,
          etudiantName,
          etudiantEmail,
          etudiantMatricule,
          etudiantGroupe,
          quizId,
          reponses,
          score,
          enseignantId,
          dateCompletion: new Date(),
          commentaire: commentaire || "",
        },
      })
    }

    const data = {
      quiz: quizId, // Utiliser 'quiz' au lieu de 'quizId' pour correspondre au schéma MongoDB
      student: etudiantId, // Utiliser 'student' au lieu de 'etudiantId' pour correspondre au schéma MongoDB
      etudiantId, // Garder pour la compatibilité
      etudiantName,
      etudiantEmail,
      etudiantMatricule,
      etudiantGroupe,
      quizId, // Garder pour la compatibilité
      reponses,
      score,
      enseignantId,
      dateCompletion: new Date(),
      commentaire,
      completed: true, // Ajouter ce champ pour indiquer que la soumission est complétée
      endTime: new Date(), // Ajouter ce champ pour indiquer l'heure de fin
    }

    console.log("Données envoyées au serveur (soumettreQuiz):", data)

    // Utiliser l'URL correcte pour les soumissions de quiz
    return this.http.post<any>(`${this.quizSoumissionsUrl}`, data).pipe(
      tap((response) => console.log("Soumission de quiz réussie:", response)),
      catchError(this.handleError),
    )
  }

  /**
   * Récupère les soumissions d'un étudiant
   */
  getSoumissionsByEtudiant(etudiantId: string): Observable<any> {
    console.log(
      `SoumissionsService.getSoumissionsByEtudiant - Récupération des soumissions pour l'étudiant ${etudiantId}`,
    )

    if (this.useMockData) {
      return of({
        success: true,
        data: this.generateMockSubmissions(etudiantId),
      })
    }

    return this.http.get<any>(`${this.soumissionsUrl}/etudiant/${etudiantId}`).pipe(
      tap((response) => console.log("SoumissionsService.getSoumissionsByEtudiant - Réponse reçue:", response)),
      catchError(this.handleError),
    )
  }

  /**
   * Récupère les soumissions d'un devoir
   */
  getSoumissionsByDevoir(devoirId: string): Observable<any> {
    console.log(`SoumissionsService.getSoumissionsByDevoir - Récupération des soumissions pour le devoir ${devoirId}`)

    if (this.useMockData) {
      // MODIFICATION: Ne pas générer de données fictives pour les nouveaux devoirs
      // Retourner un tableau vide pour les nouveaux devoirs
      return of({
        success: true,
        data: [], // Tableau vide au lieu de données fictives
      })
    }

    // Utiliser le bon endpoint pour récupérer les soumissions par devoir
    return this.http.get<any>(`${this.soumissionsUrl}/devoir/${devoirId}`).pipe(
      tap((response) => {
        console.log("SoumissionsService.getSoumissionsByDevoir - Réponse brute:", response);
        
        // Vérifier et transformer les données si nécessaire
        if (response && response.data) {
          // S'assurer que chaque soumission a les propriétés requises
          response.data = response.data.map((submission: any) => {
            // Vérifier et formater la date de soumission
            if (submission.dateSoumission) {
              submission.dateSoumission = new Date(submission.dateSoumission);
            } else if (submission.dateCreation) {
              submission.dateSoumission = new Date(submission.dateCreation);
            } else if (submission.createdAt) {
              submission.dateSoumission = new Date(submission.createdAt);
            } else {
              submission.dateSoumission = new Date();
            }
            
            // S'assurer que le nom de l'étudiant est présent
            if (!submission.etudiantName && submission.etudiant) {
              if (typeof submission.etudiant === 'object' && submission.etudiant.name) {
                submission.etudiantName = submission.etudiant.name;
              } else if (typeof submission.etudiant === 'string') {
                submission.etudiantName = `Étudiant #${submission.etudiant.substring(0, 5)}`;
              }
            }
            
            // S'assurer que les informations du fichier sont correctes
            if (submission.fichier) {
              if (typeof submission.fichier === 'string') {
                submission.fichier = {
                  nom: this.extraireNomFichier(submission.fichier),
                  chemin: submission.fichier,
                  type: this.determinerTypeFichier(submission.fichier),
                  taille: 0
                };
              } else if (!submission.fichier.nom && submission.fichier.chemin) {
                submission.fichier.nom = this.extraireNomFichier(submission.fichier.chemin);
              }
            }
            
            return submission;
          });
        }
      }),
      catchError(this.handleError),
    )
  }

  /**
   * Récupère les soumissions d'un quiz
   */
  getSoumissionsByQuiz(quizId: string): Observable<any> {
    console.log(`SoumissionsService.getSoumissionsByQuiz - Récupération des soumissions pour le quiz ${quizId}`)

    if (this.useMockData) {
      return of({
        success: true,
        data: this.generateMockQuizSubmissions(quizId),
      })
    }

    // Utiliser l'URL correcte pour les soumissions de quiz
    return this.http.get<any>(`${this.quizSoumissionsUrl}/quiz/${quizId}`).pipe(
      map((response) => {
        console.log("SoumissionsService.getSoumissionsByQuiz - Réponse brute:", response)
        // Si la réponse est un tableau, la formater correctement
        if (Array.isArray(response)) {
          return {
            success: true,
            data: response,
          }
        }
        // Sinon, retourner la réponse telle quelle
        return response
      }),
      tap((response) => console.log("SoumissionsService.getSoumissionsByQuiz - Réponse formatée:", response)),
      catchError(this.handleError),
    )
  }

  /**
   * Récupère les soumissions pour un enseignant
   */
  getSoumissionsByEnseignant(enseignantId: string): Observable<any> {
    console.log(
      `SoumissionsService.getSoumissionsByEnseignant - Récupération des soumissions pour l'enseignant ${enseignantId}`,
    )

    if (this.useMockData) {
      return of({
        success: true,
        data: this.generateMockTeacherSubmissions(enseignantId),
      })
    }

    return this.http.get<any>(`${this.soumissionsUrl}/enseignant/${enseignantId}`).pipe(
      tap((response) => {
        console.log("SoumissionsService.getSoumissionsByEnseignant - Réponse brute:", response);
        
        // Vérifier et transformer les données si nécessaire
        if (response && response.data) {
          // S'assurer que chaque soumission a les propriétés requises
          response.data = response.data.map((submission: any) => {
            // Vérifier et formater la date de soumission
            if (submission.dateSoumission) {
              submission.dateSoumission = new Date(submission.dateSoumission);
            } else if (submission.dateCreation) {
              submission.dateSoumission = new Date(submission.dateCreation);
            } else if (submission.createdAt) {
              submission.dateSoumission = new Date(submission.createdAt);
            } else {
              submission.dateSoumission = new Date();
            }
            
            // S'assurer que le nom de l'étudiant est présent
            if (!submission.etudiantName && submission.etudiant) {
              if (typeof submission.etudiant === 'object' && submission.etudiant.name) {
                submission.etudiantName = submission.etudiant.name;
              } else if (typeof submission.etudiant === 'string') {
                submission.etudiantName = `Étudiant #${submission.etudiant.substring(0, 5)}`;
              }
            }
            
            // S'assurer que les informations du fichier sont correctes
            if (submission.fichier) {
              if (typeof submission.fichier === 'string') {
                submission.fichier = {
                  nom: this.extraireNomFichier(submission.fichier),
                  chemin: submission.fichier,
                  type: this.determinerTypeFichier(submission.fichier),
                  taille: 0
                };
              } else if (!submission.fichier.nom && submission.fichier.chemin) {
                submission.fichier.nom = this.extraireNomFichier(submission.fichier.chemin);
              }
            }
            
            return submission;
          });
        }
      }),
      catchError(this.handleError),
    )
  }

  /**
   * Évalue une soumission
   */
  evaluerSoumission(soumissionId: string, note: number, feedback: string): Observable<any> {
    console.log(`SoumissionsService.evaluerSoumission - Évaluation de la soumission ${soumissionId}`)
    console.log(`Note: ${note}, Feedback: ${feedback}`)

    if (this.useMockData) {
      return of({
        success: true,
        data: {
          _id: soumissionId,
          note,
          feedback,
          evaluated: true,
          dateEvaluation: new Date(),
        },
      })
    }

    const data = {
      note,
      commentaire: feedback, // Utiliser 'commentaire' au lieu de 'feedback' pour correspondre au backend
    }

    return this.http.put<any>(`${this.soumissionsUrl}/${soumissionId}/evaluer`, data).pipe(
      tap((response) => console.log("SoumissionsService.evaluerSoumission - Réponse reçue:", response)),
      catchError(this.handleError),
    )
  }

  /**
   * Obtient l'URL de téléchargement d'un fichier de soumission
   */
  getSoumissionFileUrl(soumissionId: string): string {
    return `${this.soumissionsUrl}/${soumissionId}/fichier`
  }

  /**
   * Télécharge le fichier d'une soumission
   */
  telechargerFichierSoumission(soumissionId: string): Observable<Blob> {
    console.log(`Téléchargement du fichier de soumission ${soumissionId}`)

    // Configurer les en-têtes pour recevoir un blob
    const headers = new HttpHeaders({
      Accept: 'application/pdf,application/octet-stream,image/*',
    })

    // Faire la requête avec responseType 'blob'
    return this.http.get(`${this.soumissionsUrl}/${soumissionId}/fichier`, {
      headers,
      responseType: 'blob'
    }).pipe(
      tap(() => console.log(`Fichier de soumission ${soumissionId} téléchargé avec succès`)),
      catchError((error) => {
        console.error(`Erreur lors du téléchargement du fichier de soumission ${soumissionId}:`, error)
        return throwError(() => new Error("Erreur lors du téléchargement du fichier"))
      })
    )
  }

  /**
   * Extraire le nom du fichier à partir d'un chemin
   */
  private extraireNomFichier(chemin: string): string {
    if (!chemin) return "fichier.pdf";
    
    // Extraire le nom du fichier du chemin
    const parties = chemin.split('/');
    return parties[parties.length - 1];
  }

  /**
   * Déterminer le type de fichier à partir de son extension
   */
  private determinerTypeFichier(chemin: string): string {
    if (!chemin) return "application/pdf";
    
    const extension = chemin.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return 'application/pdf';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * Gestion des erreurs HTTP
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

  /**
   * Génère des soumissions fictives pour le mode hors ligne
   */
  private generateMockSubmissions(etudiantId: string): any[] {
    return [
      {
        _id: "mock-submission-1",
        etudiantId,
        etudiantName: "Étudiant Test",
        devoirId: "mock-devoir-1",
        fichier: {
          nom: "devoir1.pdf",
          chemin: "/uploads/devoirs/devoir1.pdf",
          type: "application/pdf",
          taille: 1024
        },
        dateSoumission: new Date(),
        note: 16,
        feedback: "Bon travail, mais quelques points à améliorer.",
        evaluated: true
      },
      {
        _id: "mock-submission-2",
        etudiantId,
        etudiantName: "Étudiant Test",
        devoirId: "mock-devoir-2",
        fichier: {
          nom: "devoir2.pdf",
          chemin: "/uploads/devoirs/devoir2.pdf",
          type: "application/pdf",
          taille: 2048
        },
        dateSoumission: new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000),
        note: null,
        feedback: null,
        evaluated: false
      }
    ]
  }

  /**
   * Génère des soumissions de devoir fictives pour le mode hors ligne
   * Cette méthode n'est plus utilisée pour les nouveaux devoirs
   */
  private generateMockDevoirSubmissions(devoirId: string): any[] {
    // MODIFICATION: Cette méthode n'est plus utilisée pour les nouveaux devoirs
    // Mais nous la gardons pour la compatibilité avec d'autres parties du code
    return []
  }

  /**
   * Génère des soumissions de quiz fictives pour le mode hors ligne
   */
  private generateMockQuizSubmissions(quizId: string): QuizSubmission[] {
    return [
      {
        _id: "mock-quiz-submission-1",
        quiz: quizId,
        etudiantId: "student-1",
        etudiantName: "Ahmed Ben Ali",
        etudiantEmail: "ahmed@example.com",
        etudiantMatricule: "E12345",
        etudiantGroupe: "Groupe 1",
        dateCompletion: new Date(),
        score: 85,
        reponses: [
          {
            questionId: "q1",
            selectedOptions: ["o2"],
            isCorrect: true,
            pointsEarned: 2,
          },
        ],
      },
      {
        _id: "mock-quiz-submission-2",
        quiz: quizId,
        etudiantId: "student-2",
        etudiantName: "Fatima Trabelsi",
        etudiantEmail: "fatima@example.com",
        etudiantMatricule: "E12346",
        etudiantGroupe: "Groupe 1.1",
        dateCompletion: new Date(new Date().getTime() - 1 * 24 * 60 * 60 * 1000),
        score: 70,
        reponses: [
          {
            questionId: "q1",
            selectedOptions: ["o2"],
            isCorrect: true,
            pointsEarned: 2,
          },
        ],
      },
    ]
  }

  /**
   * Génère des soumissions pour un enseignant fictives pour le mode hors ligne
   */
  private generateMockTeacherSubmissions(enseignantId: string): QuizSubmission[] {
    return [
      {
        _id: "mock-teacher-submission-1",
        quiz: "mock-quiz-1",
        etudiantId: "student-1",
        etudiantName: "Ahmed Ben Ali",
        etudiantEmail: "ahmed@example.com",
        etudiantMatricule: "E12345",
        etudiantGroupe: "Groupe 1",
        enseignantId,
        dateCompletion: new Date(),
        score: 85,
        reponses: [
          {
            questionId: "q1",
            selectedOptions: ["o2"],
            isCorrect: true,
            pointsEarned: 2,
          },
        ],
      },
      {
        _id: "mock-teacher-submission-2",
        quiz: "mock-quiz-2",
        etudiantId: "student-2",
        etudiantName: "Fatima Trabelsi",
        etudiantEmail: "fatima@example.com",
        etudiantMatricule: "E12346",
        etudiantGroupe: "Groupe 1.1",
        enseignantId,
        dateCompletion: new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000),
        score: 70,
        reponses: [
          {
            questionId: "q4",
            selectedOptions: ["o10"],
            isCorrect: true,
            pointsEarned: 2,
          },
        ],
      },
    ]
  }
}