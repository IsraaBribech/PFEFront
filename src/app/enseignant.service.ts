import { Injectable } from "@angular/core"
import {  HttpClient, type HttpErrorResponse, HttpHeaders, HttpParams } from "@angular/common/http"
import { catchError, type Observable, throwError, tap } from "rxjs"

export interface ChargeHoraire {
  grade: string
  conversion: {
    coursTD: number
    tpTD: number
    totalTD: number
  }
  chargeHoraire: {
    base: number
    supplementaire: number
    total: number
  }
}

export interface Enseignant {
  _id: string
  name: string
  prenom: string
  email?: string
  departement?: string
  grade?: string
  specialite?: string
  cin?: string
  telephone?: string
  adresse?: string
  dateNaissance?: Date
  dateEmbauche?: Date
  isActive?: boolean
}

@Injectable({
  providedIn: "root",
})
export class EnseignantService {
  private apiUrl = "http://localhost:5000/api/enseignants" // URL API

  constructor(private http: HttpClient) {
    // Ajoutez ce log pour déboguer
    console.log("EnseignantService apiUrl:", this.apiUrl)
  }

  // Ajouter un enseignant avec meilleure gestion des erreurs
  addEnseignant(enseignantData: any): Observable<any> {
    // Ajout des headers pour s'assurer que le serveur comprend le format JSON
    const httpOptions = {
      headers: new HttpHeaders({
        "Content-Type": "application/json",
      }),
    }

    // Log des données avant envoi pour débogage
    console.log("Données envoyées au serveur:", JSON.stringify(enseignantData))

    return this.http.post<any>(`${this.apiUrl}/add`, enseignantData, httpOptions).pipe(
      tap((response) => console.log("Réponse du serveur:", response)),
      catchError(this.handleError),
    )
  }

  // Gérer les erreurs avec plus de détails
  private handleError(error: HttpErrorResponse) {
    console.error("Erreur API détaillée:", error)

    // Extraire le message d'erreur du serveur si disponible
    let errorMessage = "Erreur lors de la communication avec le serveur."

    if (error.error && error.error.message) {
      errorMessage = error.error.message
    } else if (error.error && typeof error.error === "string") {
      errorMessage = error.error
    } else if (error.status === 400) {
      errorMessage = "Données invalides. Veuillez vérifier les champs du formulaire."
    } else if (error.status === 500) {
      errorMessage = "Erreur serveur. Veuillez réessayer plus tard."
    }

    return throwError(() => new Error(errorMessage))
  }

  getEnseignants(): Observable<any[]> {
    // Utiliser l'URL complète définie dans apiUrl
    return this.http.get<any[]>(`${this.apiUrl}`)
  }

  deleteEnseignant(id: string | number): Observable<void> {
    console.log("✅ ID envoyé vers le backend pour suppression:", id)

    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => {
        console.error("❌ Erreur suppression API:", error)
        return throwError(() => new Error("Échec de la suppression de l'enseignant"))
      }),
    )
  }

  updateEnseignant(id: string, enseignantData: any): Observable<any> {
    console.log("✅ ID envoyé vers le backend:", id) // Débogage ID Angular
    return this.http.put<any>(`${this.apiUrl}/${id}`, enseignantData)
  }

  // Améliorer la méthode getAllEnseignants pour ajouter plus de logs et de gestion d'erreurs
  getAllEnseignants(): Observable<any[]> {
    console.log(`Appel API: GET ${this.apiUrl}`)

    return this.http.get<any[]>(this.apiUrl).pipe(
      tap((enseignants) => {
        console.log(`API a retourné ${enseignants?.length || 0} enseignants`)
        if (enseignants && enseignants.length > 0) {
          console.log("Premier enseignant:", enseignants[0])
        }
      }),
      catchError((error) => {
        console.error("Erreur lors de la récupération des enseignants:", error)

        // Afficher plus de détails sur l'erreur
        if (error.status) {
          console.error(`Code d'erreur HTTP: ${error.status}`)
        }
        if (error.error) {
          console.error("Détails de l'erreur:", error.error)
        }

        return throwError(
          () => new Error(`Erreur lors de la récupération des enseignants: ${error.message || "Erreur inconnue"}`),
        )
      }),
    )
  }

  getEnseignantById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`)
  }

  // CORRECTION ICI - Suppression du "/enseignants" en trop
  getEnseignantsByDepartement(departementId: string): Observable<any[]> {
    // Correction de l'URL pour éviter la duplication
    return this.http.get<any[]>(`${this.apiUrl}/departement/${departementId}`)
  }

  // Méthode optionnelle pour le débogage - également corrigée
  getEnseignantsByDepartementUrl(departementId: string): string {
    return `${this.apiUrl}/departement/${departementId}`
  }

  getEnseignantsBySpecialite(specialiteId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/specialite/${specialiteId}`)
  }

  // Nouvelle méthode pour calculer la charge horaire
  calculerChargeHoraire(grade: string, cours = 0, td = 0, tp = 0): ChargeHoraire {
    // Conversion des heures en équivalent TD
    const coursTD = cours * 1.83
    const tpTD = tp * 0.86
    const totalTD = coursTD + td + tpTD

    // Charge horaire de base et supplémentaire selon le grade
    let chargeBase = 0
    let chargeSupplementaire = 0

    switch (grade.toLowerCase()) {
      case "maitre assistant":
      case "maître assistant":
      case "maitre-assistant":
      case "maître-assistant":
        chargeBase = 9.5
        chargeSupplementaire = 4
        break
      case "assistant":
        chargeBase = 11
        chargeSupplementaire = 4
        break
      case "pes":
      case "professeur":
        chargeBase = 14
        chargeSupplementaire = 2
        break
      default:
        chargeBase = 9.5 // Valeur par défaut
        chargeSupplementaire = 4
    }

    return {
      grade,
      conversion: {
        coursTD: Number.parseFloat(coursTD.toFixed(2)),
        tpTD: Number.parseFloat(tpTD.toFixed(2)),
        totalTD: Number.parseFloat(totalTD.toFixed(2)),
      },
      chargeHoraire: {
        base: chargeBase,
        supplementaire: chargeSupplementaire,
        total: chargeBase + chargeSupplementaire,
      },
    }
  }

  // Méthode pour récupérer la charge horaire depuis le serveur
  getChargeHoraire(enseignantId: string, cours = 0, td = 0, tp = 0): Observable<ChargeHoraire> {
    const params = new HttpParams().set("cours", cours.toString()).set("td", td.toString()).set("tp", tp.toString())

    return this.http.get<ChargeHoraire>(`${this.apiUrl}/${enseignantId}/charge-horaire`, { params }).pipe(
      tap((response) => console.log("Charge horaire récupérée:", response)),
      catchError(this.handleError),
    )
  }

  authenticate(credentials: { identifier: string; password: string }): Observable<any> {
    console.log("Envoi au serveur:", credentials) // Debug

    const httpOptions = {
      headers: new HttpHeaders({
        "Content-Type": "application/json",
      }),
    }

    // Utiliser l'endpoint /login directement sur le router principal
    // car dans votre backend, la route est définie sur le router principal et non sur le router enseignants
    return this.http.post<any>(`${this.apiUrl}/login`, credentials, httpOptions).pipe(
      tap((response) => console.log("Réponse authentification enseignant:", response)),
      catchError((error) => {
        console.error("Détails erreur:", error)

        let errorMessage = "Erreur de connexion"
        if (error.status === 401) {
          errorMessage = "CIN/Email ou mot de passe incorrect"
        } else if (error.status === 404) {
          // Message plus précis pour l'erreur 404
          errorMessage = "Service d'authentification non disponible. Vérifiez l'URL de l'API."
        }

        return throwError(() => new Error(errorMessage))
      }),
    )
  }
}
