import { Injectable } from "@angular/core"
import {  HttpClient, HttpHeaders } from "@angular/common/http"
import { type Observable, throwError } from "rxjs"
import { catchError, tap } from "rxjs/operators"

@Injectable({
  providedIn: "root",
})
export class NiveauxService {
  private apiUrl = "http://localhost:5001/api/niveaux"
  private httpOptions = {
    headers: new HttpHeaders({
      "Content-Type": "application/json",
    }),
  }

  constructor(private http: HttpClient) {}

  // Récupérer tous les niveaux
  getNiveaux(): Observable<any[]> {
    console.log("NiveauxService: Récupération de tous les niveaux")
    return this.http.get<any[]>(this.apiUrl).pipe(
      tap((niveaux) => console.log(`${niveaux.length} niveaux récupérés`)),
      catchError(this.handleError),
    )
  }

  // Ajouter un nouveau niveau
  addNiveau(niveau: any): Observable<any> {
    console.log("NiveauxService: Ajout d'un niveau", niveau)
    return this.http.post<any>(`${this.apiUrl}/add`, niveau, this.httpOptions).pipe(
      tap((response) => console.log("Niveau ajouté:", response)),
      catchError(this.handleError),
    )
  }

  // Mettre à jour un niveau
  updateNiveau(id: string, niveau: any): Observable<any> {
    console.log("🔍 URL appelée:", `${this.apiUrl}/${id}`, niveau)
    return this.http.put<any>(`${this.apiUrl}/${id}`, niveau, this.httpOptions).pipe(
      tap((response) => console.log("Niveau mis à jour:", response)),
      catchError(this.handleError),
    )
  }

  // Supprimer un niveau
  deleteNiveau(id: string): Observable<any> {
    console.log(`NiveauxService: Suppression du niveau ${id}`)
    return this.http.delete<any>(`${this.apiUrl}/${id}`, this.httpOptions).pipe(
      tap((response) => console.log("Niveau supprimé:", response)),
      catchError(this.handleError),
    )
  }

  // Récupérer un niveau par ID
  getNiveauById(id: string): Observable<any> {
    console.log(`NiveauxService: Récupération du niveau ${id}`)
    return this.http.get<any>(`${this.apiUrl}/${id}`, this.httpOptions).pipe(
      tap((niveau) => console.log("Niveau récupéré:", niveau)),
      catchError(this.handleError),
    )
  }

  // Récupérer les niveaux par département
  getNiveauxByDepartement(departementId: string): Observable<any[]> {
    console.log(`Appel à getNiveauxByDepartement avec departementId: ${departementId}`);
    
    // Assurez-vous que cette URL correspond exactement à celle définie dans server.js
    return this.http.get<any[]>(`${this.apiUrl}/departement/${departementId}`).pipe(
      tap(niveaux => console.log('Niveaux récupérés par département:', niveaux)),
      catchError(error => {
        console.error('Erreur lors de la récupération des niveaux par département:', error);
        return throwError(() => error);
      })
    );
  }

  // Gestion des erreurs améliorée
  private handleError(error: any): Observable<never> {
    console.error("Une erreur est survenue:", error)

    let errorMessage = "Une erreur est survenue lors de la communication avec le serveur."

    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur: ${error.error.message}`
    } else {
      // Erreur côté serveur
      errorMessage = `Code d'erreur: ${error.status}, Message: ${error.message}`

      // Afficher plus de détails si disponibles
      if (error.error && typeof error.error === "object") {
        console.error("Détails de l'erreur:", error.error)
        if (error.error.message) {
          errorMessage = error.error.message
        }
      }
    }

    return throwError(() => new Error(errorMessage))
  }
}