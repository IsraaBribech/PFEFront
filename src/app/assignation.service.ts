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

    // Vérifier si nous sommes en mode développement ou si l'API n'est pas encore implémentée
    if (!this.apiUrl || localStorage.getItem("useLocalAssignations") === "true") {
      console.log("Utilisation des données locales pour les assignations")
      // Retourner des données fictives pour le développement
      return of(this.getMockAssignations())
    }

    return this.http.get<Assignation[]>(this.apiUrl, { params }).pipe(
      tap((assignations) => console.log("Assignations récupérées:", assignations)),
      catchError((error) => {
        console.error("Erreur lors de la récupération des assignations:", error)
        // En cas d'erreur 404, utiliser des données fictives
        if (error.status === 404) {
          console.log("API d'assignations non disponible, utilisation des données locales")
          localStorage.setItem("useLocalAssignations", "true")
          return of(this.getMockAssignations())
        }
        return this.handleError(error)
      }),
    )
  }

  // Ajouter cette méthode pour générer des données fictives
  private getMockAssignations(): Assignation[] {
    return [
      {
        _id: "a1",
        enseignantId: "e1",
        enseignantNom: "Bribech Israa",
        matiereId: "c1",
        matiereNom: "Introduction à Angular",
        type: "cours",
        departement: "dep1",
        specialite: "spe1",
        niveau: "niv3",
        semestre: "1",
        chefDepartementId: "CD123",
        dateAssignation: new Date(2023, 8, 15).toISOString(),
      },
      {
        _id: "a2",
        enseignantId: "e2",
        enseignantNom: "Benali Ahmed",
        matiereId: "c2",
        matiereNom: "Machine Learning avec Python",
        type: "td",
        departement: "dep1",
        specialite: "spe2",
        niveau: "niv3",
        semestre: "1",
        chefDepartementId: "CD123",
        dateAssignation: new Date(2023, 8, 16).toISOString(),
      },
    ]
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
    if (localStorage.getItem("useLocalAssignations") === "true") {
      console.log("Mode hors ligne: simulation de création d'assignation")
      const newAssignation: Assignation = {
        _id: `a${new Date().getTime()}`,
        ...assignationData,
        dateAssignation: new Date().toISOString(),
      }
      return of(newAssignation)
    }

    return this.http.post<Assignation>(this.apiUrl, assignationData).pipe(
      tap((assignation) => console.log("Assignation créée avec succès:", assignation)),
      catchError((error) => {
        if (error.status === 404) {
          console.log("API d'assignations non disponible, simulation de création")
          localStorage.setItem("useLocalAssignations", "true")
          const newAssignation: Assignation = {
            _id: `a${new Date().getTime()}`,
            ...assignationData,
            dateAssignation: new Date().toISOString(),
          }
          return of(newAssignation)
        }
        return this.handleError(error)
      }),
    )
  }

  /**
   * Mettre à jour une assignation
   */
  updateAssignation(id: string, assignationData: any): Observable<Assignation> {
    if (localStorage.getItem("useLocalAssignations") === "true") {
      console.log("Mode hors ligne: simulation de mise à jour d'assignation")
      const updatedAssignation: Assignation = {
        _id: id,
        ...assignationData,
      }
      return of(updatedAssignation)
    }

    return this.http.put<Assignation>(`${this.apiUrl}/${id}`, assignationData).pipe(
      tap((assignation) => console.log(`Assignation ${id} mise à jour:`, assignation)),
      catchError(this.handleError),
    )
  }

  /**
   * Supprimer une assignation
   */
  deleteAssignation(id: string): Observable<any> {
    if (localStorage.getItem("useLocalAssignations") === "true") {
      console.log("Mode hors ligne: simulation de suppression d'assignation")
      return of({ success: true, message: "Assignation supprimée avec succès" })
    }

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
