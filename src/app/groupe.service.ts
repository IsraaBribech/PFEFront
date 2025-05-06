import { Injectable } from "@angular/core"
import  { HttpClient, HttpErrorResponse } from "@angular/common/http"
import { Observable, throwError } from "rxjs"
import { catchError, tap, retry } from "rxjs/operators"

// Interfaces pour les types de données
export interface Etudiant {
  _id: string
  name?: string
  nom?: string
  prenom?: string
  email?: string
  cin?: string
}

export interface Groupe {
name: any
  _id?: string
  code: string
  nom?: string
  capacite: number
  etudiants: Etudiant[] | string[]
}

export interface Filiere {
  nbGroupes: any
  nbFilieres: any
  _id?: string
  numero: number
  name: string
  departement: string
  niveau: string
  specialite?: string
  capaciteMax: number
  groupes: Groupe[]
  createdAt?: string
  updatedAt?: string
  studentCount?: number // Ajout de cette propriété pour stocker le nombre d'étudiants
}

@Injectable({
  providedIn: "root",
})
export class GroupeService {
  private apiUrl = "http://localhost:5001/api/groupes"

  constructor(private http: HttpClient) {}

  // Récupérer tous les groupes
  getGroupes(): Observable<Filiere[]> {
    // Pour le développement, si l'API n'est pas disponible, retourner des données simulées
    if (this.isDevelopmentMode()) {
      console.log("Mode développement: utilisation de données simulées pour les groupes")
      return new Observable((observer) => {
        setTimeout(() => {
          observer.complete()
        }, 500)
      })
    }

    return this.http.get<Filiere[]>(this.apiUrl).pipe(
      retry(1), // Réessayer une fois en cas d'échec
      tap((data) => console.log("Groupes récupérés:", data)),
      catchError(this.handleError),
    )
  }

  // Ajouter un nouveau groupe
  addGroupe(groupeData: Partial<Filiere>): Observable<Filiere> {
    // Pour le développement, si l'API n'est pas disponible, simuler l'ajout
    if (this.isDevelopmentMode()) {
      console.log("Mode développement: simulation d'ajout de groupe", groupeData)
      return new Observable((observer) => {
        setTimeout(() => {
          // Générer automatiquement les groupes si ils ne sont pas fournis
          const groupes = groupeData.groupes || []
          if (groupes.length === 0 && groupeData.numero) {
            for (let i = 1; i <= 4; i++) {
              groupes.push({
                code: `${groupeData.numero}.${i}`,
                nom: `Groupe ${groupeData.numero}.${i}`,
                capacite: 30,
                etudiants: [],
                name: undefined
              })
            }
          }

          const newGroupe: Filiere = {
            _id: "mock_" + new Date().getTime(),
            ...(groupeData as Filiere),
            groupes,
            createdAt: new Date().toISOString(),
          }
          observer.next(newGroupe)
          observer.complete()
        }, 500)
      })
    }

    // Assurez-vous que les données sont correctement formatées pour le backend
    // Le backend attend des "filieres" mais le frontend utilise "groupes"
    console.log("Données à envoyer:", groupeData)

    return this.http.post<Filiere>(this.apiUrl, groupeData).pipe(
      tap((data) => console.log("Groupe ajouté:", data)),
      catchError(this.handleError),
    )
  }

  // Supprimer un groupe
  deleteGroupe(id: string): Observable<any> {
    // Pour le développement, si l'API n'est pas disponible, simuler la suppression
    if (this.isDevelopmentMode()) {
      console.log("Mode développement: simulation de suppression de groupe", id)
      return new Observable((observer) => {
        setTimeout(() => {
          observer.next({ success: true, message: "Groupe supprimé avec succès" })
          observer.complete()
        }, 500)
      })
    }

    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      tap((data) => console.log("Groupe supprimé:", data)),
      catchError(this.handleError),
    )
  }

  // Mettre à jour un groupe
  updateGroupe(id: string, groupeData: Partial<Filiere>): Observable<Filiere> {
    // Pour le développement, si l'API n'est pas disponible, simuler la mise à jour
    if (this.isDevelopmentMode()) {
      console.log("Mode développement: simulation de mise à jour de groupe", id, groupeData)
      return new Observable((observer) => {
        setTimeout(() => {
          const updatedGroupe: Filiere = {
            _id: id,
            ...(groupeData as Filiere),
            updatedAt: new Date().toISOString(),
          }
          observer.next(updatedGroupe)
          observer.complete()
        }, 500)
      })
    }

    return this.http.put<Filiere>(`${this.apiUrl}/${id}`, groupeData).pipe(
      tap((data) => console.log("Groupe mis à jour:", data)),
      catchError(this.handleError),
    )
  }

  // Récupérer un groupe par ID
  getGroupeById(id: string): Observable<Filiere> {
    // Pour le développement, si l'API n'est pas disponible, retourner des données simulées
    if (this.isDevelopmentMode()) {
      console.log("Mode développement: utilisation de données simulées pour le groupe", id)
      return new Observable((observer) => {
   
      })
    }

    return this.http.get<Filiere>(`${this.apiUrl}/${id}`).pipe(
      retry(1), // Réessayer une fois en cas d'échec
      tap((data) => console.log("Groupe récupéré:", data)),
      catchError(this.handleError),
    )
  }

  // Ajouter un groupe à une filière
  addGroupeToFiliere(filiereId: string, groupeData: Partial<Groupe>): Observable<Filiere> {
    if (this.isDevelopmentMode()) {
      console.log("Mode développement: simulation d'ajout de groupe", filiereId, groupeData)
      return new Observable((observer) => {
    
      })
    }

    return this.http.post<Filiere>(`${this.apiUrl}/${filiereId}/filieres`, groupeData).pipe(
      tap((data) => console.log("Groupe ajouté:", data)),
      catchError(this.handleError),
    )
  }

  // Ajouter un étudiant à un groupe
  addEtudiantToGroupe(filiereId: string, groupeId: string, etudiantId: string): Observable<Filiere> {
    if (this.isDevelopmentMode()) {
      console.log("Mode développement: simulation d'ajout d'étudiant à un groupe", filiereId, groupeId, etudiantId)
      return new Observable((observer) => {

      })
    }

    return this.http.post<Filiere>(`${this.apiUrl}/${filiereId}/filieres/${groupeId}/etudiants`, { etudiantId }).pipe(
      tap((data) => console.log("Étudiant ajouté au groupe:", data)),
      catchError(this.handleError),
    )
  }

  // Retirer un étudiant d'un groupe
  removeEtudiantFromGroupe(filiereId: string, groupeId: string, etudiantId: string): Observable<any> {
    if (this.isDevelopmentMode()) {
      console.log("Mode développement: simulation de retrait d'étudiant d'un groupe", filiereId, groupeId, etudiantId)
      return new Observable((observer) => {
        setTimeout(() => {
          observer.next({ success: true, message: "Étudiant retiré avec succès du groupe" })
          observer.complete()
        }, 500)
      })
    }

    return this.http.delete<any>(`${this.apiUrl}/${filiereId}/filieres/${groupeId}/etudiants/${etudiantId}`).pipe(
      tap((data) => console.log("Étudiant retiré du groupe:", data)),
      catchError(this.handleError),
    )
  }

  // Gestion des erreurs
  private handleError(error: HttpErrorResponse) {
    let errorMessage = ""
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur: ${error.error.message}`
    } else {
      // Erreur côté serveur
      errorMessage = `Code d'erreur: ${error.status}, Message: ${error.message}`

      // Ajouter plus de détails si disponibles
      if (error.error && error.error.message) {
        errorMessage += `, Détails: ${error.error.message}`
      }
    }
    console.error(errorMessage)
    return throwError(() => new Error(errorMessage))
  }

  // Vérifier si nous sommes en mode développement
  private isDevelopmentMode(): boolean {
    return false // Changer à false pour utiliser l'API réelle au lieu des données simulées
  }

 
   
}
