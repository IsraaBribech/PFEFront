import { Injectable } from "@angular/core"
import {  HttpClient, HttpHeaders, type HttpErrorResponse } from "@angular/common/http"
import { type Observable, catchError, throwError, tap, map } from "rxjs"

export interface Cours {
  niveauId: string | undefined
  _id: string
  titre: string
  description?: string
  departement?: string
  niveau?: string
  specialite?: string
  createdAt?: Date
  updatedAt?: Date
  isActive?: boolean
  semestre?: number
  heure?: number // Gardé pour la compatibilité avec le frontend
  heures?: string // Ajouté pour la compatibilité avec le backend
  code?: string
  seance?: string
}

@Injectable({
  providedIn: "root",
})
export class CoursService {
  private apiUrl = "http://localhost:5001/api/cours"
  private httpOptions = {
    headers: new HttpHeaders({
      "Content-Type": "application/json",
    }),
  }

  constructor(private http: HttpClient) {}

  // Récupérer tous les cours
  getAllCours(): Observable<any[]> {
    console.log("CoursService: Fetching all courses")
    return this.http.get<any[]>(this.apiUrl).pipe(
      tap((response) => console.log("API Response (getAllCours):", response)),
      map((cours) => this.convertBackendToFrontend(cours)),
      catchError((error) => this.handleError(error, "getAllCours")),
    )
  }

  // Ajouter un nouveau cours
  addCours(cours: any): Observable<any> {
    console.log("CoursService: Adding course with data:", JSON.stringify(cours))

    // Convertir les données pour le backend
    const backendCours = this.convertFrontendToBackend(cours)

    // Log the URL and headers for debugging
    console.log("API URL:", this.apiUrl)
    console.log("Headers:", this.httpOptions.headers)
    console.log("Données envoyées au backend:", backendCours)

    return this.http.post<any>(this.apiUrl, backendCours, this.httpOptions).pipe(
      tap((response) => console.log("API Response (addCours):", response)),
      map((response) => this.convertBackendToFrontend(response)),
      catchError((error) => {
        console.error("Error in addCours:", error)
        console.error("Error status:", error.status)
        console.error("Error message:", error.message)

        if (error.error) {
          console.error("Error details:", error.error)
        }

        return this.handleError(error, "addCours")
      }),
    )
  }

  /** DELETE: delete the cours from the server */
  deleteCours(id: string): Observable<any> {
    console.log(`CoursService: Deleting course with ID ${id}`)
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      tap((response) => console.log("API Response (deleteCours):", response)),
      catchError((error) => this.handleError(error, "deleteCours")),
    )
  }

  /** PUT: update the cours on the server */
  updateCours(id: string, cours: any): Observable<any> {
    console.log(`CoursService: Updating course ${id}`, cours)

    // Convertir les données pour le backend
    const backendCours = this.convertFrontendToBackend(cours)
    console.log("Données envoyées au backend:", backendCours)

    return this.http.put<any>(`${this.apiUrl}/${id}`, backendCours, this.httpOptions).pipe(
      tap((response) => console.log("API Response (updateCours):", response)),
      map((response) => this.convertBackendToFrontend(response)),
      catchError((error) => this.handleError(error, "updateCours")),
    )
  }

  // Récupérer tous les cours avec le type Cours[]
  getCours(): Observable<Cours[]> {
    console.log("CoursService: Fetching courses")
    return this.http.get<Cours[]>(this.apiUrl).pipe(
      tap((cours) => console.log(`Fetched ${cours.length} courses`)),
      map((cours) => this.convertBackendToFrontend(cours)),
      catchError((error) => {
        console.error("Error fetching courses:", error)
        return this.handleError(error, "getCours")
      }),
    )
  }

  // Récupérer un cours par ID
  getCoursById(id: string): Observable<Cours> {
    console.log(`CoursService: Fetching course with ID ${id}`)
    return this.http.get<Cours>(`${this.apiUrl}/${id}`).pipe(
      tap((response) => console.log("Cours récupéré:", response)),
      map((cours) => this.convertBackendToFrontend(cours)),
      catchError((error) => this.handleError(error, "getCoursById")),
    )
  }

  // Récupérer les statistiques des cours par heures
  getStatistiquesHeures(): Observable<any> {
    console.log("CoursService: Fetching course statistics by hours")
    return this.http.get<any>(`${this.apiUrl}/statistiques/heures`).pipe(
      tap((response) => console.log("Statistiques par heures:", response)),
      catchError((error) => this.handleError(error, "getStatistiquesHeures")),
    )
  }

  // Filtrer les cours par nombre d'heures
  getCoursParHeures(heures: string): Observable<Cours[]> {
    console.log(`CoursService: Fetching courses with ${heures} hours`)
    // Comme il n'y a pas d'endpoint spécifique, on filtre côté client
    return this.getCours().pipe(
      map((cours) => cours.filter((c) => c.heures === heures || c.heure === Number.parseInt(heures))),
      tap((cours) => console.log(`Filtré ${cours.length} cours de ${heures} heures`)),
      catchError((error) => this.handleError(error, "getCoursParHeures")),
    )
  }

  // Convertir les données du format frontend vers le format backend
  private convertFrontendToBackend(cours: any): any {
    if (!cours) return cours

    // Si c'est un tableau, convertir chaque élément
    if (Array.isArray(cours)) {
      return cours.map((c) => this.convertFrontendToBackend(c))
    }

    const result = { ...cours }

    // Convertir heure (number) en heures (string) pour le backend
    if (result.heure !== undefined && result.heures === undefined) {
      result.heures = result.heure.toString()
    }

    // Convertir semestre (number) en format attendu par le backend (S1, S2)
    if (result.semestre !== undefined) {
      // Si le backend attend S1/S2 au lieu de 1/2, décommenter ces lignes
      // result.semestre = result.semestre === 1 ? 'S1' :
      //                   result.semestre === 2 ? 'S2' :
      //                   result.semestre.toString();
    }

    return result
  }

  // Convertir les données du format backend vers le format frontend
  private convertBackendToFrontend(cours: any): any {
    if (!cours) return cours

    // Si c'est un tableau, convertir chaque élément
    if (Array.isArray(cours)) {
      return cours.map((c) => this.convertBackendToFrontend(c))
    }

    const result = { ...cours }

    // Convertir heures (string) en heure (number) pour le frontend
    if (result.heures !== undefined && result.heure === undefined) {
      result.heure = Number.parseInt(result.heures)
    }

    // Convertir semestre (S1, S2) en format attendu par le frontend (1, 2)
    if (result.semestre !== undefined && typeof result.semestre === "string") {
      // Si le backend renvoie S1/S2 au lieu de 1/2, décommenter ces lignes
      // result.semestre = result.semestre === 'S1' ? 1 :
      //                   result.semestre === 'S2' ? 2 :
      //                   parseInt(result.semestre);
    }

    return result
  }

  // Enhanced error handling method
  private handleError(error: HttpErrorResponse, operation: string) {
    console.error(`Service error in ${operation}:`, error)

    let errorMessage = "Une erreur est survenue"

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Erreur client: ${error.error.message}`
    } else {
      // Server-side error
      errorMessage = `Code: ${error.status}, Message: ${error.message}`

      // Try to extract more detailed error message from response
      if (error.error && error.error.message) {
        errorMessage += `, Détails: ${error.error.message}`
      }

      // Log additional details for debugging
      if (error.error) {
        console.error("Error details:", error.error)
        if (error.error.error) {
          console.error("Specific error:", error.error.error)
        }
      }
    }

    // You can emit a notification or log to a service here
    console.error(errorMessage)

    // Return an observable with a user-facing error message
    return throwError(() => error)
  }
}
