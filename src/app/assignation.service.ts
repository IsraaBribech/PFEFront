import { Injectable } from "@angular/core"
import { HttpClient, HttpParams } from "@angular/common/http"
import { type Observable, of, throwError } from "rxjs"
import { catchError, tap } from "rxjs/operators"

export interface Assignation {
  _id?: string
  enseignantId: string
  enseignantNom: string
  matiereId: string
  matiereNom: string
  type: "cours" | "td" | "tp"
  departement: string
  specialite: string
  niveau: string
  semestre: string
  chefDepartementId: string
  dateAssignation: string
  commentaire?: string
  // Nouveaux champs pour les groupes
  groupes?: {
    filiereId: string
    groupeId: string
  }[]
}

@Injectable({
  providedIn: "root",
})
export class AssignationService {
  private apiUrl = "http://localhost:5000/api/assignations"

  constructor(private http: HttpClient) {}

  /**
   * Récupérer toutes les assignations avec filtres optionnels
   */
  getAllAssignations(filters: any = {}): Observable<Assignation[]> {
    let params = new HttpParams()

    // Ajouter les filtres aux paramètres de requête
    Object.keys(filters).forEach((key) => {
      if (filters[key] && filters[key] !== "all") {
        params = params.set(key, filters[key])
      }
    })

    return this.http.get<Assignation[]>(this.apiUrl, { params }).pipe(
      tap((assignations) => console.log("Assignations récupérées:", assignations)),
      catchError(this.handleError),
    )
  }

  /**
   * Récupérer les assignations d'un enseignant spécifique
   */
  getAssignationsByEnseignant(enseignantId: string): Observable<Assignation[]> {
    return this.http.get<Assignation[]>(`${this.apiUrl}/enseignant/${enseignantId}`).pipe(
      tap((assignations) => console.log(`Assignations de l'enseignant ${enseignantId}:`, assignations)),
      catchError(this.handleError),
    )
  }

  /**
   * Récupérer une assignation par son ID
   */
  getAssignationById(id: string): Observable<Assignation> {
    return this.http.get<Assignation>(`${this.apiUrl}/${id}`).pipe(
      tap((assignation) => console.log(`Assignation ${id}:`, assignation)),
      catchError(this.handleError),
    )
  }

  /**
   * Créer une nouvelle assignation
   */
  createAssignation(assignationData: any): Observable<Assignation> {
    // Vérifier que les données sont complètes
    if (!assignationData.enseignantId || !assignationData.matiereId || !assignationData.type) {
      return throwError(() => new Error("Données d'assignation incomplètes"))
    }

    return this.http.post<Assignation>(this.apiUrl, assignationData).pipe(
      tap((assignation) => console.log("Assignation créée avec succès:", assignation)),
      catchError(this.handleError),
    )
  }

  /**
   * Mettre à jour une assignation
   */
  updateAssignation(id: string, assignationData: any): Observable<Assignation> {
    return this.http.put<Assignation>(`${this.apiUrl}/${id}`, assignationData).pipe(
      tap((assignation) => console.log(`Assignation ${id} mise à jour:`, assignation)),
      catchError(this.handleError),
    )
  }

  /**
   * Supprimer une assignation
   */
  deleteAssignation(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      tap((result) => console.log(`Assignation ${id} supprimée:`, result)),
      catchError(this.handleError),
    )
  }

  /**
   * Gestion des erreurs HTTP
   */
  private handleError(error: any) {
    console.error("Erreur HTTP:", error)
    return throwError(() => error)
  }
}