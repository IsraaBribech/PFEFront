import { Injectable } from "@angular/core"
import { HttpClient, HttpParams, HttpHeaders } from "@angular/common/http"
import { Observable, throwError } from "rxjs"
import { catchError, tap } from "rxjs/operators"

@Injectable({
  providedIn: "root",
})
export class DevoirService {
  // URL de base de l'API
  private apiBaseUrl = "http://localhost:5001/api"
  private devoirsUrl = `${this.apiBaseUrl}/devoirs`

  constructor(private http: HttpClient) {}

  /**
   * Ajoute un nouveau devoir
   * @param devoirData Les données du devoir à ajouter
   * @param file Fichier optionnel à joindre au devoir
   */
  addDevoir(devoirData: any, file: File | null = null): Observable<any> {
    // Créer un FormData pour envoyer les données
    const formData = new FormData()

    // Ajouter chaque propriété du devoir au FormData
    Object.keys(devoirData).forEach((key) => {
      // Pour l'objet options, le convertir en JSON string
      if (key === "options") {
        formData.append(key, JSON.stringify(devoirData[key]))
      } else {
        formData.append(key, devoirData[key])
      }
    })

    // Ajouter le fichier s'il existe
    if (file) {
      // Utiliser le nom de champ 'fichier' comme attendu par le backend
      formData.append("fichier", file, file.name)
    }

    console.log("DevoirService.addDevoir - Données envoyées:", this.logFormData(formData))

    // Envoyer la requête sans spécifier de Content-Type pour que le navigateur le définisse correctement
    return this.http.post<any>(this.devoirsUrl, formData).pipe(
      tap((response) => console.log("DevoirService.addDevoir - Réponse reçue:", response)),
      catchError((error) => {
        console.error("DevoirService.addDevoir - Erreur:", error)
        return this.handleError(error)
      }),
    )
  }

  /**
   * Récupère tous les devoirs avec filtres optionnels
   * @param filters Filtres optionnels
   */
  getDevoirs(filters: any = {}): Observable<any> {
    // Construire les paramètres de requête
    let params = new HttpParams()

    Object.keys(filters).forEach((key) => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== "") {
        params = params.append(key, filters[key])
      }
    })

    console.log(`DevoirService.getDevoirs - URL: ${this.devoirsUrl}`)
    console.log(`DevoirService.getDevoirs - Paramètres: ${params.toString()}`)

    return this.http.get<any>(this.devoirsUrl, { params }).pipe(
      tap((response) => {
        console.log("DevoirService.getDevoirs - Réponse reçue:", response)

        // Vérifier la structure de la réponse
        if (response && response.data) {
          console.log(`DevoirService.getDevoirs - ${response.data.length} devoirs reçus`)

          // Vérifier la structure d'un devoir pour le débogage
          if (response.data.length > 0) {
            const sampleDevoir = response.data[0]
            console.log("Structure d'un devoir:", {
              id: sampleDevoir._id,
              titre: sampleDevoir.title || sampleDevoir.titre,
              matiere: sampleDevoir.matiere,
              courId: sampleDevoir.courId,
              enseignantId: sampleDevoir.enseignantId,
              enseignant: sampleDevoir.enseignant,
            })
          }
        } else {
          console.warn("DevoirService.getDevoirs - Format de réponse inattendu:", response)
        }
      }),
      catchError((error) => {
        console.error("DevoirService.getDevoirs - Erreur:", error)

        // Afficher plus de détails sur l'erreur
        if (error.status) {
          console.error(`Code d'erreur HTTP: ${error.status}`)
        }
        if (error.error) {
          console.error("Détails de l'erreur:", error.error)
        }

        return this.handleError(error)
      }),
    )
  }

  /**
   * Récupère un devoir par son ID
   * @param id ID du devoir
   */
  getDevoirById(id: string): Observable<any> {
    console.log(`DevoirService.getDevoirById - ID: ${id}`)

    return this.http.get<any>(`${this.devoirsUrl}/${id}`).pipe(
      tap((response) => console.log(`DevoirService.getDevoirById - Réponse reçue pour ID ${id}:`, response)),
      catchError(this.handleError),
    )
  }

  /**
   * Met à jour un devoir existant
   * @param id ID du devoir à mettre à jour
   * @param devoirData Nouvelles données du devoir
   * @param file Fichier optionnel à joindre au devoir
   */
  updateDevoir(id: string, devoirData: any, file: File | null = null): Observable<any> {
    // Si nous avons un fichier, utiliser FormData
    if (file) {
      const formData = new FormData()

      // Convertir l'objet options en chaîne JSON pour éviter les problèmes de conversion
      const options = devoirData.options
      delete devoirData.options

      // Ajouter chaque propriété individuellement au FormData
      Object.keys(devoirData).forEach((key) => {
        formData.append(key, devoirData[key])
      })

      // Ajouter les options comme JSON string
      formData.append("options", JSON.stringify(options))

      // Ajouter le fichier
      formData.append("fichier", file, file.name)

      console.log(`DevoirService.updateDevoir - ID: ${id}, Données:`, this.logFormData(formData))

      return this.http.put<any>(`${this.devoirsUrl}/${id}`, formData).pipe(
        tap((response) => console.log(`DevoirService.updateDevoir - Réponse reçue pour ID ${id}:`, response)),
        catchError(this.handleError),
      )
    }
    // Sans fichier, envoyer directement les données JSON
    else {
      const headers = new HttpHeaders().set("Content-Type", "application/json")

      console.log(`DevoirService.updateDevoir - ID: ${id}, Données (JSON):`, devoirData)

      return this.http.put<any>(`${this.devoirsUrl}/${id}`, devoirData, { headers }).pipe(
        tap((response) => console.log(`DevoirService.updateDevoir - Réponse reçue pour ID ${id}:`, response)),
        catchError(this.handleError),
      )
    }
  }

  /**
   * Supprime un devoir
   * @param id ID du devoir à supprimer
   */
  deleteDevoir(id: string): Observable<any> {
    console.log(`DevoirService.deleteDevoir - ID: ${id}`)

    return this.http.delete<any>(`${this.devoirsUrl}/${id}`).pipe(
      tap((response) => console.log(`DevoirService.deleteDevoir - Réponse reçue pour ID ${id}:`, response)),
      catchError(this.handleError),
    )
  }

  /**
   * Récupère les statistiques des devoirs
   * @param enseignantId ID de l'enseignant (optionnel)
   */
  getDevoirsStats(enseignantId?: string): Observable<any> {
    let params = new HttpParams()
    if (enseignantId) {
      params = params.append("enseignantId", enseignantId)
    }

    console.log(`DevoirService.getDevoirsStats - Paramètres: ${params.toString()}`)

    return this.http.get<any>(`${this.devoirsUrl}/stats`, { params }).pipe(
      tap((response) => console.log("DevoirService.getDevoirsStats - Réponse reçue:", response)),
      catchError(this.handleError),
    )
  }

  /**
   * Récupère les statistiques globales des devoirs
   * @param enseignantId ID de l'enseignant (optionnel)
   */
  getDevoirsGlobalStats(enseignantId?: string): Observable<any> {
    let params = new HttpParams()
    if (enseignantId) {
      params = params.append("enseignantId", enseignantId)
    }

    console.log(`DevoirService.getDevoirsGlobalStats - Paramètres: ${params.toString()}`)

    return this.http.get<any>(`${this.apiBaseUrl}/devoirs-stats`, { params }).pipe(
      tap((response) => console.log("DevoirService.getDevoirsGlobalStats - Réponse reçue:", response)),
      catchError(this.handleError),
    )
  }

  /**
   * Télécharge le fichier de consigne d'un devoir
   * @param devoirId ID du devoir
   * @returns Observable contenant le fichier sous forme de Blob
   */
  telechargerFichierConsigne(devoirId: string): Observable<Blob> {
    console.log(`Téléchargement du fichier de consigne pour le devoir ${devoirId}`)

    // Configurer les en-têtes pour recevoir un blob
    const headers = new HttpHeaders({
      Accept: "application/pdf,application/octet-stream,image/*",
    })

    // Faire la requête avec responseType 'blob'
    return this.http
      .get(`${this.devoirsUrl}/${devoirId}/fichier-consigne`, {
        headers: headers,
        responseType: "blob",
      })
      .pipe(
        tap(() => console.log(`Fichier de consigne pour le devoir ${devoirId} téléchargé avec succès`)),
        catchError((error) => {
          console.error(`Erreur lors du téléchargement du fichier de consigne pour le devoir ${devoirId}:`, error)
          return throwError(() => new Error("Erreur lors du téléchargement du fichier"))
        }),
      )
  }

  /**
   * Teste la connexion à MongoDB
   */
  testConnection(): Observable<any> {
    const url = `${this.apiBaseUrl}/test-db-connection`
    console.log(`DevoirService.testConnection - URL: ${url}`)

    return this.http.get<any>(url).pipe(
      tap((response) => console.log("DevoirService.testConnection - Réponse reçue:", response)),
      catchError(this.handleError),
    )
  }

  /**
   * Gestion des erreurs HTTP
   * @param error L'erreur HTTP
   */
  private handleError(error: any) {
    console.error("DevoirService - Erreur HTTP:", error)

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
