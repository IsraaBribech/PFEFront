import { Injectable } from "@angular/core"
import  { HttpClient } from "@angular/common/http"
import { type Observable, throwError, forkJoin, of } from "rxjs"
import { catchError, tap, switchMap, map } from "rxjs/operators"
import  { Router } from "@angular/router"
import  { EnseignantService } from "./enseignant.service"
import  { UserService } from "./user.service"
import  { SpecialitesService } from "./specialites.service"

export interface AuthResponse {
  user: any
  token: string
}

// Interface StudentInfo pour inclure les noms mappés
export interface StudentInfo {
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
  matricule?: string
  role?: string

  // Noms mappés
  departmentName?: string
  specialtyName?: string
  levelName?: string
  filiereName?: string
  groupName?: string
}

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private apiUrl = "http://localhost:5000/api"
  private currentUser: any = null
  private studentInfo: StudentInfo | null = null

  constructor(
    private http: HttpClient,
    private router: Router,
    private enseignantService: EnseignantService,
    private userService: UserService,
    private specialitesService: SpecialitesService,
  ) {
    // Charger l'utilisateur depuis localStorage lors de l'initialisation du service
    this.loadUserFromStorage()
  }

  // Charger l'utilisateur depuis localStorage
  private loadUserFromStorage(): void {
    const userStr = localStorage.getItem("currentUser")
    if (userStr) {
      try {
        this.currentUser = JSON.parse(userStr)
        console.log("Utilisateur chargé depuis localStorage:", this.currentUser)

        // Charger également les informations de l'étudiant si disponibles
        const studentInfoStr = localStorage.getItem("studentInfo")
        if (studentInfoStr) {
          this.studentInfo = JSON.parse(studentInfoStr)
          console.log("Informations étudiant chargées depuis localStorage:", this.studentInfo)
        }
      } catch (e) {
        console.error("Erreur lors de l'analyse de l'utilisateur depuis localStorage:", e)
        this.logout() // Effacer les données invalides
      }
    }
  }

  // Authentifier l'utilisateur (essayer d'abord enseignant, puis étudiant)
  authenticate(credentials: { identifier: string; password: string }): Observable<AuthResponse> {
    console.log("AuthService: Tentative d'authentification avec:", credentials.identifier)

    // D'abord essayer d'authentifier en tant qu'enseignant
    return this.enseignantService.authenticate(credentials).pipe(
      tap((response) => {
        console.log("AuthService: Authentification enseignant réussie:", response)
        this.handleSuccessfulAuth(response, "teacher")
      }),
      catchError((error) => {
        console.log("AuthService: Échec de l'authentification enseignant, tentative d'authentification étudiant")

        // Si l'authentification enseignant échoue, essayer l'authentification étudiant
        return this.userService.authenticateStudent(credentials).pipe(
          switchMap((response) => {
            console.log("AuthService: Authentification étudiant réussie:", response)
            this.handleSuccessfulAuth(response, "student")

            // Récupérer les informations complètes de l'étudiant, y compris les noms des entités
            return this.loadCompleteStudentInfo(response.user || response)
          }),
          catchError((error) => {
            console.error("AuthService: Échec de l'authentification pour enseignant et étudiant:", error)
            return throwError(() => new Error("Identifiants incorrects"))
          }),
        )
      }),
    )
  }

  // Charger les informations complètes de l'étudiant avec les noms des entités
  private loadCompleteStudentInfo(user: any): Observable<AuthResponse> {
    if (!user) {
      return throwError(() => new Error("Données utilisateur manquantes"))
    }

    console.log("Chargement des informations complètes de l'étudiant:", user)

    // Récupérer les noms des entités en parallèle
    return forkJoin({
      specialtyName: user.specialty
        ? this.specialitesService.getSpecialtyNameById(user.specialty).pipe(
            catchError((error) => {
              console.error("Erreur lors de la récupération du nom de la spécialité:", error)
              return of("Spécialité non disponible")
            }),
          )
        : of("Spécialité non disponible"),
      departmentName: of(this.mapDepartmentName(user.department)),
      levelName: of(this.mapLevelName(user.level)),
    }).pipe(
      map((results) => {
        console.log("Résultats des requêtes pour les noms des entités:", results)
        console.log("ID de spécialité de l'utilisateur:", user.specialty)

        // Stocker les informations complètes de l'étudiant
        this.storeStudentInfo({
          ...user,
          specialtyName: results.specialtyName,
          departmentName: results.departmentName,
          levelName: results.levelName,
        })

        // Retourner la réponse d'authentification originale
        return {
          user: user,
          token: localStorage.getItem("authToken") || "token-placeholder",
        }
      }),
      catchError((error) => {
        console.error("Erreur lors du chargement des informations complètes de l'étudiant:", error)

        // En cas d'erreur, stocker quand même les informations de base
        this.storeStudentInfo(user)

        // Retourner la réponse d'authentification originale
        return of({
          user: user,
          token: localStorage.getItem("authToken") || "token-placeholder",
        })
      }),
    )
  }

  // Mapper les IDs des départements à leurs noms
  mapDepartmentName(departmentId: string): string {
    const departmentMap: Record<string, string> = {
      "68026eacfb69384629ea9321": "Informatique",
      "68026eacfb69384629ea9322": "Gestion",
      "68026eacfb69384629ea9323": "Finance",
      "68026eacfb69384629ea9324": "Marketing",
      // Ajoutez d'autres mappings selon vos besoins
    }

    return departmentMap[departmentId] || "Département non disponible"
  }

  // Mapper les IDs des niveaux à leurs noms
  mapLevelName(levelId: string): string {
    const levelMap: Record<string, string> = {
      "68027005fb69384629ea9387": "Licence 1",
      "68027005fb69384629ea9388": "Licence 2",
      "68027005fb69384629ea9389": "Licence 3",
      "68027005fb69384629ea9390": "Master 1",
      "68027005fb69384629ea9391": "Master 2",
      // Ajoutez d'autres mappings selon vos besoins
    }

    return levelMap[levelId] || "Niveau non disponible"
  }

  // Stocker les informations de l'étudiant
  private storeStudentInfo(user: any): void {
    if (!user) return

    console.log("Stockage des informations étudiant:", user)

    // Créer un objet avec les informations de l'étudiant
    const studentInfo: StudentInfo = {
      _id: user._id || user.id,
      name: user.name || "Nom non disponible",
      email: user.email || "Email non disponible",
      cin: user.cin || "CIN non disponible",
      level: user.level || "Niveau non disponible",
      department: user.department || "Département non disponible",
      specialty: user.specialty || "Spécialité non disponible",
      filiere: user.filiere || "Filière non disponible",
      group: user.group || "Groupe non disponible",
      subGroup: user.subGroup || undefined,
      matricule: user.matricule || "Matricule non disponible",
      role: "student",

      // Ajouter les noms mappés
      departmentName: user.departmentName || this.mapDepartmentName(user.department),
      specialtyName: user.specialtyName || "Spécialité non disponible",
      levelName: user.levelName || this.mapLevelName(user.level),
      // Ajouter le nom formaté du groupe
      groupName: user.group ? `Groupe ${user.group}` : "Groupe non assigné",
    }

    // Stocker dans la propriété du service
    this.studentInfo = studentInfo

    // Stocker dans localStorage pour persistance
    localStorage.setItem("studentInfo", JSON.stringify(studentInfo))

    console.log("Informations étudiant stockées:", studentInfo)
  }

  // Obtenir les informations de l'étudiant
  getStudentInfo(): StudentInfo | null {
    return this.studentInfo
  }

  // Gérer l'authentification réussie
  private handleSuccessfulAuth(response: any, role: "teacher" | "student"): void {
    console.log(`AuthService: Traitement de l'authentification réussie pour ${role}:`, response)

    // Extraire l'utilisateur et le token de la réponse
    let user, token

    if (response.user && response.token) {
      // Format standard {user: {...}, token: "..."}
      user = response.user
      token = response.token
    } else if (response.token) {
      // Format {token: "...", ...userInfo}
      token = response.token
      // Copier tous les champs sauf token dans user
      const { token: _, ...userInfo } = response
      user = userInfo
    } else {
      // Format où la réponse est l'utilisateur lui-même
      user = response
      token = "token-placeholder" // Utiliser un placeholder si aucun token n'est fourni
    }

    // Convertir le rôle du backend au format attendu par le frontend
    let frontendRole = role
    if (user.role === "enseignant") {
      frontendRole = "teacher"
    } else if (user.role === "etudiant") {
      frontendRole = "student"
    }

    // Stocker les détails de l'utilisateur et le token
    this.currentUser = {
      ...user,
      role: frontendRole,
    }

    // Sauvegarder dans localStorage
    localStorage.setItem("currentUser", JSON.stringify(this.currentUser))
    localStorage.setItem("userRole", frontendRole)
    localStorage.setItem("authToken", token)

    // Stocker l'ID séparément pour un accès plus facile
    if (frontendRole === "teacher") {
      localStorage.setItem("enseignantId", user._id || user.id || "")
    } else {
      localStorage.setItem("etudiantId", user._id || user.id || "")
    }

    console.log(`AuthService: Utilisateur ${frontendRole} authentifié et stocké:`, this.currentUser)
  }

  // Obtenir l'utilisateur authentifié actuel
  getCurrentUser(): any {
    return this.currentUser
  }

  // Vérifier si l'utilisateur est authentifié
  isAuthenticated(): boolean {
    const isAuth = !!this.currentUser
    console.log("AuthService: Vérification d'authentification:", isAuth, this.currentUser)
    return isAuth
  }

  // Vérifier le rôle de l'utilisateur
  getUserRole(): string | null {
    const role = this.currentUser ? this.currentUser.role : null
    console.log("AuthService: Rôle de l'utilisateur:", role)
    return role
  }

  // Vérifier si l'utilisateur est un enseignant
  isTeacher(): boolean {
    const isTeacher = this.currentUser?.role === "teacher"
    console.log("AuthService: Est enseignant:", isTeacher)
    return isTeacher
  }

  // Vérifier si l'utilisateur est un étudiant
  isStudent(): boolean {
    const isStudent = this.currentUser?.role === "student"
    console.log("AuthService: Est étudiant:", isStudent)
    return isStudent
  }

  // Déconnecter l'utilisateur
  logout(): void {
    console.log("AuthService: Déconnexion de l'utilisateur")

    // Effacer les données utilisateur
    this.currentUser = null
    this.studentInfo = null

    // Supprimer toutes les données de session du localStorage
    localStorage.removeItem("currentUser")
    localStorage.removeItem("userRole")
    localStorage.removeItem("authToken")
    localStorage.removeItem("enseignantId")
    localStorage.removeItem("etudiantId")
    localStorage.removeItem("studentInfo")

    // Afficher un message de confirmation
    console.log("AuthService: Utilisateur déconnecté avec succès")

    // Rediriger vers la page de connexion
    this.router.navigate(["/login"])
  }

  // Obtenir le token d'authentification
  getToken(): string | null {
    return localStorage.getItem("authToken")
  }

  // Vérifier si le token est expiré (version simplifiée)
  isTokenExpired(): boolean {
    // Dans une application réelle, vous décoderiez le JWT et vérifieriez son expiration
    return false
  }

  // Rafraîchir le token si nécessaire
  refreshToken(): Observable<any> {
    const token = this.getToken()
    if (!token) {
      return throwError(() => new Error("Aucun token disponible"))
    }

    // Implémentation de rafraîchissement de token
    return this.http
      .post(`${this.apiUrl}/auth/refresh-token`, {
        token: token,
      })
      .pipe(
        catchError((error) => {
          console.error("Erreur lors du rafraîchissement du token:", error)
          return throwError(() => error)
        }),
      )
  }
}
