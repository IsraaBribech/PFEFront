import { Injectable } from "@angular/core"
import {  HttpClient, HttpHeaders, HttpParams, type HttpErrorResponse } from "@angular/common/http"
import { type Observable, throwError } from "rxjs"
import { catchError, tap, map } from "rxjs/operators"

export interface User {
  _id?: string
  name: string
  email: string
  cin: string
  level: string
  department: string
  specialty: string
  filiere: string
  group: string
  subGroup?: string
  password?: string
  telephone?: string
  birthDate?: Date | string
  civilStatus?: string
  address?: {
    street?: string
    postalCode?: string
    gouvernorat?: string
    delegation?: string
  }
  role?: string
  matricule?: string
  createdAt?: string
  updatedAt?: string
}

export interface FiliereCount {
  _id: string
  count: number
  filiereName?: string
  numero?: number
}

@Injectable({
  providedIn: "root",
})
export class UserService {
  // URL de base de l'API
  private apiUrl = "http://localhost:5000/api"

  constructor(private http: HttpClient) {}

  // Méthode d'authentification pour les étudiants
  authenticateStudent(credentials: { identifier: string; password: string }): Observable<any> {
    console.log("UserService: Tentative d'authentification étudiant avec:", credentials)

    // Utiliser l'endpoint correct pour l'authentification des étudiants
    return this.http.post(`${this.apiUrl}/users/login`, credentials).pipe(
      map((response: any) => {
        console.log("UserService: Réponse d'authentification étudiant:", response)

        // Assurez-vous que la réponse contient user et token
        if (!response.user && !response.token) {
          // Si la réponse ne contient pas la structure attendue, reformatez-la
          return {
            user: { ...response, role: "student" }, // Ajouter explicitement le rôle étudiant
            token: response.token || "token-placeholder", // Utilisez le token s'il existe, sinon un placeholder
          }
        }

        // Ajouter le rôle étudiant si ce n'est pas déjà fait
        if (response.user && !response.user.role) {
          response.user.role = "student"
        }

        return response
      }),
      catchError((error) => {
        console.error("UserService: Erreur d'authentification étudiant:", error)
        return throwError(() => error)
      }),
    )
  }

  // Récupérer les informations de l'étudiant
  getStudentInfo(): Observable<User> {
    const etudiantId = localStorage.getItem("etudiantId")
    if (!etudiantId) {
      return throwError(() => new Error("ID étudiant non disponible"))
    }

    return this.http.get<User>(`${this.apiUrl}/users/${etudiantId}`).pipe(
      tap((user) => console.log("Informations étudiant récupérées:", user)),
      catchError(this.handleError),
    )
  }

  // Authentification générale
  authenticate(credentials: { identifier: string; password: string }): Observable<{ user: User; token: string }> {
    return this.http
      .post<{ user: User; token: string }>(`${this.apiUrl}/login`, credentials, { headers: this.getHeaders() })
      .pipe(
        catchError((error) => {
          console.error("Authentication error:", error)
          return throwError(() => new Error("Échec de l'authentification"))
        }),
      )
  }

  // Récupérer tous les utilisateurs
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`).pipe(
      tap((users) => console.log("Utilisateurs récupérés:", users.length)),
      catchError(this.handleError),
    )
  }

  // Récupérer un utilisateur par ID
  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${id}`).pipe(
      tap((user) => console.log("Utilisateur récupéré:", user.name)),
      catchError(this.handleError),
    )
  }

  // Ajouter un nouvel utilisateur
  addUser(user: User): Observable<User> {
    console.log("Sending user data:", JSON.stringify(user))
    return this.http.post<User>(`${this.apiUrl}/users/add`, user, { headers: this.getHeaders() }).pipe(
      tap((newUser) => console.log("Utilisateur ajouté avec ID:", newUser._id)),
      catchError(this.handleError),
    )
  }

  // Mettre à jour un utilisateur
  updateUser(id: string, user: User): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/${id}`, user, { headers: this.getHeaders() }).pipe(
      tap((_) => console.log(`Utilisateur mis à jour avec ID: ${id}`)),
      catchError(this.handleError),
    )
  }

  // Supprimer un utilisateur
  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${id}`, { headers: this.getHeaders() }).pipe(
      tap((_) => console.log(`Utilisateur supprimé avec ID: ${id}`)),
      catchError(this.handleError),
    )
  }

  // Assigner un étudiant à un groupe
  assignStudentToGroup(userId: string, filiereId: string, groupId: string, subGroupId?: string): Observable<User> {
    const data: any = {
      filiere: filiereId,
      group: groupId,
    }

    // Ajouter le sous-groupe s'il est fourni
    if (subGroupId) {
      data.subGroup = subGroupId
    }

    return this.http
      .patch<User>(`${this.apiUrl}/users/${userId}/assign-group`, data, { headers: this.getHeaders() })
      .pipe(
        tap((_) => console.log(`Étudiant ${userId} assigné au groupe ${groupId} de la filière ${filiereId}`)),
        catchError(this.handleError),
      )
  }

  // Récupérer les étudiants par filière
  getStudentsByFiliere(filiereId: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users/filiere/${filiereId}`, { headers: this.getHeaders() }).pipe(
      tap((students) => console.log(`Étudiants de la filière ${filiereId} récupérés:`, students.length)),
      catchError(this.handleError),
    )
  }

  // Récupérer les étudiants par groupe
  getStudentsByGroup(groupId: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users/group/${groupId}`, { headers: this.getHeaders() }).pipe(
      tap((students) => console.log(`Étudiants du groupe ${groupId} récupérés:`, students.length)),
      catchError(this.handleError),
    )
  }

  // Obtenir le nombre d'étudiants par filière
  getStudentsCountByFiliere(): Observable<FiliereCount[]> {
    return this.http.get<FiliereCount[]>(`${this.apiUrl}/users/count-by-filiere`, { headers: this.getHeaders() }).pipe(
      tap((counts) => console.log("Nombre d'étudiants par filière récupéré:", counts)),
      catchError(this.handleError),
    )
  }

  // Obtenir le nombre d'étudiants par spécialité
  getStudentsCountBySpecialty(): Observable<any[]> {
    return this.http
      .get<any[]>(`${this.apiUrl}/users/count-by-specialty`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError))
  }

  // Récupérer les étudiants disponibles (sans groupe assigné)
  getAvailableStudents(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users/available`, { headers: this.getHeaders() }).pipe(
      tap((students) => console.log("Étudiants disponibles récupérés:", students.length)),
      catchError(this.handleError),
    )
  }

  // Récupérer les étudiants par filtres
  getStudentsByFilters(department?: string, level?: string, specialty?: string, filiere?: string): Observable<User[]> {
    let params = new HttpParams()
    if (department) params = params.set("department", department)
    if (level) params = params.set("level", level)
    if (specialty) params = params.set("specialty", specialty)
    if (filiere) params = params.set("filiere", filiere)

    return this.http.get<User[]>(`${this.apiUrl}/users/filter`, { headers: this.getHeaders(), params }).pipe(
      tap((students) => console.log("Étudiants filtrés récupérés:", students.length)),
      catchError(this.handleError),
    )
  }

  // Retirer un étudiant d'un groupe
  removeStudentFromGroup(studentId: string): Observable<User> {
    return this.http
      .put<User>(`${this.apiUrl}/users/${studentId}/remove-from-group`, {}, { headers: this.getHeaders() })
      .pipe(
        tap((_) => console.log(`Étudiant ${studentId} retiré du groupe`)),
        catchError(this.handleError),
      )
  }

  // Obtenir les headers HTTP
  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      "Content-Type": "application/json",
    })
  }

  // Gestion des erreurs
  private handleError(error: HttpErrorResponse) {
    console.error("API Error:", error)

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
