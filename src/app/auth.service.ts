import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable, throwError, BehaviorSubject, of, forkJoin } from "rxjs";
import { catchError, tap, switchMap, map } from "rxjs/operators";
import { Router } from "@angular/router";

// Définir des interfaces pour une meilleure sécurité de type
export interface AuthResponse {
  user: any;
  token: string;
}

export interface StudentInfo {
  _id?: string;
  name: string;
  email: string;
  cin: string;
  level: string;
  department: string;
  specialty: string;
  filiere: string;
  group: string;
  subGroup?: string;
  matricule?: string;
  role?: string;

  // Noms mappés pour l'affichage
  departmentName?: string;
  specialtyName?: string;
  levelName?: string;
  filiereName?: string;
  groupName?: string;
}

export interface TeacherInfo {
  _id?: string;
  name: string;
  email: string;
  cin: string;
  department: string;
  specialty: string;
  role?: string;
  
  // Noms mappés pour l'affichage
  departmentName?: string;
  specialtyName?: string;
}

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private apiUrl = "http://localhost:5001/api";
  private currentUser: any = null;
  private studentInfo: StudentInfo | null = null;
  private teacherInfo: TeacherInfo | null = null;

  // BehaviorSubject pour suivre l'état d'authentification
  private authStateSubject = new BehaviorSubject<boolean>(false);
  public authState$ = this.authStateSubject.asObservable();

  // Mappages des départements et niveaux
  private departmentMap: Record<string, string> = {
    "68026eacfb69384629ea9321": "Informatique",
    "68026eacfb69384629ea9322": "Gestion",
    "68026eacfb69384629ea9323": "Finance",
    "68026eacfb69384629ea9324": "Marketing",
    "68026f4cfb69384629ea935c": "Comptabilité"
  };

  private levelMap: Record<string, string> = {
    "68027005fb69384629ea9387": "Licence 1",
    "68027005fb69384629ea9388": "Licence 2",
    "68027005fb69384629ea9389": "Licence 3",
    "68027005fb69384629ea9390": "Master 1",
    "68027005fb69384629ea9391": "Master 2",
    "6802708cfb69384629ea939c": "Licence Professionnelle",
    "680271aafb69384629ea93ab": "Master Professionnel 1",
    "68027301fb69384629ea93fc": "Master Professionnel 2"
  };

  // Mapping complet des spécialités avec toutes les données fournies
  private specialtyMap: Record<string, string> = {
    // Liste complète des spécialités
    "68028cb1cce3382cf10f15bc": "Business Information System",
    "68028ccecce3382cf10f15bf": "E-Business",
    "68028cdecce3382cf10f15c2": "E-Business",
    "68028dc6cce3382cf10f15f1": "Business Information System",
    "68028e23cce3382cf10f15f7": "Logistique et production",
    "68028e4bcce3382cf10f15fa": "Management",
    "68028e78cce3382cf10f15fd": "Marketing",
    "68028eaccce3382cf10f1600": "Sciences comptables",
    "68028ef7cce3382cf10f1606": "Tronc commun",
    "68028f08cce3382cf10f1609": "Tronc commun",
    "68028f17cce3382cf10f160c": "Tronc commun",
    "68028f23cce3382cf10f160f": "Tronc commun",
    "68028f61cce3382cf10f1615": "Tronc commun",
    "68028fb8cce3382cf10f1629": "Sciences Comptables",
    "68029001cce3382cf10f163e": "Commerce Electronique",
    "68029023cce3382cf10f1641": "Ingénierie de Développement Mobile",
    "6802902dcce3382cf10f1644": "Ingénierie de Développement Mobile",
    "68029041cce3382cf10f1647": "Commerce Electronique"
  };

  // Mapping des filières
  private filiereMap: Record<string, string> = {
    "681250ee8586f83771db59d2": "Filière 1 - 1ère Licence - Tronc commun"
  };

  // Mapping des groupes
  private groupMap: Record<string, string> = {
    "681250ee8586f83771db59d3": "Groupe 1"
  };

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Charger l'utilisateur depuis le stockage lors de l'initialisation du service
    this.loadUserFromStorage();
  }

  // Charger l'utilisateur depuis localStorage
  private loadUserFromStorage(): void {
    const userStr = localStorage.getItem("currentUser");
    if (userStr) {
      try {
        this.currentUser = JSON.parse(userStr);
        console.log("Utilisateur chargé depuis localStorage:", this.currentUser);
        this.authStateSubject.next(true);

        // Charger les informations spécifiques selon le rôle
        if (this.currentUser.role === 'student') {
          const studentInfoStr = localStorage.getItem("studentInfo");
          if (studentInfoStr) {
            this.studentInfo = JSON.parse(studentInfoStr);
            console.log("Informations étudiant chargées depuis localStorage:", this.studentInfo);
          }
        } else if (this.currentUser.role === 'teacher') {
          const teacherInfoStr = localStorage.getItem("teacherInfo");
          if (teacherInfoStr) {
            this.teacherInfo = JSON.parse(teacherInfoStr);
            console.log("Informations enseignant chargées depuis localStorage:", this.teacherInfo);
          }
        }
      } catch (e) {
        console.error("Erreur lors de l'analyse de l'utilisateur depuis localStorage:", e);
        this.logout(); // Effacer les données invalides
      }
    }
  }

  // Authentifier l'utilisateur (essayer d'abord étudiant, puis enseignant)
  authenticate(credentials: { identifier: string; password: string }): Observable<AuthResponse> {
    console.log("AuthService: Tentative d'authentification avec:", credentials.identifier);

    // Appeler directement l'API d'authentification des étudiants
    return this.http.post<any>(`${this.apiUrl}/users/login`, credentials, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    }).pipe(
      tap(response => {
        console.log("Réponse brute du serveur (étudiant):", response);
      }),
      switchMap(response => {
        // Gérer l'authentification réussie
        this.handleSuccessfulAuth(response, "student");
        
        // Charger les informations complètes de l'étudiant
        return this.loadCompleteStudentInfo(response.user || response);
      }),
      catchError(error => {
        console.error("Erreur d'authentification étudiant:", error);
        
        // Si l'erreur est "Identifiant invalide", essayer l'authentification enseignant
        if (error.error && error.error.message === "Identifiant invalide") {
          console.log("Identifiant non trouvé comme étudiant, essai comme enseignant...");
          
          // Essayer l'authentification enseignant
          return this.authenticateTeacher(credentials).pipe(
            tap(response => {
              console.log("AuthService: Authentification enseignant réussie:", response);
              this.handleSuccessfulAuth(response, "teacher");
            }),
            switchMap(response => {
              // Charger les informations complètes de l'enseignant
              return this.loadCompleteTeacherInfo(response.user || response);
            }),
            catchError(teacherError => {
              console.error("Échec de l'authentification pour enseignant et étudiant:", teacherError);
              
              // Journaliser les détails de l'erreur pour le débogage
              if (error.error) {
                console.error("Détails de l'erreur étudiant:", error.error);
              }
              if (teacherError.error) {
                console.error("Détails de l'erreur enseignant:", teacherError.error);
              }
              
              // Retourner un message d'erreur approprié
              const errorMessage = teacherError.error && teacherError.error.message 
                ? teacherError.error.message 
                : "Identifiants incorrects";
              
              return throwError(() => new Error(errorMessage));
            })
          );
        } else {
          // Pour les autres erreurs, les renvoyer directement
          const errorMessage = error.error && error.error.message 
            ? error.error.message 
            : "Erreur d'authentification";
          
          return throwError(() => new Error(errorMessage));
        }
      })
    );
  }

  // Méthode d'authentification des enseignants
  private authenticateTeacher(credentials: { identifier: string; password: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/enseignants/login`, credentials, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    }).pipe(
      tap(response => {
        console.log("Réponse brute du serveur (enseignant):", response);
      })
    );
  }

  // Méthode de diagnostic pour tester les identifiants
  checkCredentials(credentials: { identifier: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/check-credentials`, credentials, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    }).pipe(
      tap(result => {
        console.log("Résultat du test des identifiants:", result);
      }),
      catchError(error => {
        console.error("Erreur lors du test des identifiants:", error);
        return throwError(() => error);
      })
    );
  }

  // Charger les informations complètes de l'enseignant avec les noms des entités
  private loadCompleteTeacherInfo(user: any): Observable<AuthResponse> {
    if (!user) {
      return throwError(() => new Error("Données utilisateur manquantes"));
    }

    console.log("Chargement des informations complètes de l'enseignant:", user);

    // Mapper directement les noms des départements
    const departmentName = this.mapDepartmentName(user.department);

    // Obtenir le nom de la spécialité
    let specialtyName = "Spécialité non assignée";
    
    if (user.specialty) {
      console.log("Type de spécialité reçu (enseignant):", typeof user.specialty, user.specialty);
      
      // Si la spécialité est un objet avec une propriété 'nom' ou 'name'
      if (typeof user.specialty === 'object' && user.specialty !== null) {
        if (user.specialty.nom) {
          specialtyName = user.specialty.nom;
          console.log("Nom de spécialité trouvé dans l'objet (nom):", specialtyName);
        } else if (user.specialty.name) {
          specialtyName = user.specialty.name;
          console.log("Nom de spécialité trouvé dans l'objet (name):", specialtyName);
        } else if (user.specialty._id && this.specialtyMap[user.specialty._id]) {
          // Si l'objet a un _id et que cet _id est dans notre mapping
          specialtyName = this.specialtyMap[user.specialty._id];
          console.log("Nom de spécialité trouvé via l'ID dans l'objet:", specialtyName);
        }
      } 
      // Si la spécialité est une chaîne de caractères, vérifier si c'est un ID dans notre mapping
      else if (typeof user.specialty === 'string') {
        // Vérifier si l'ID existe dans notre mapping
        if (this.specialtyMap[user.specialty]) {
          specialtyName = this.specialtyMap[user.specialty];
          console.log("Nom de spécialité trouvé dans le mapping:", specialtyName);
        } else {
          // Si ce n'est pas dans le mapping, c'est peut-être déjà le nom
          specialtyName = user.specialty;
          console.log("Utilisation de la chaîne de spécialité directement:", specialtyName);
        }
      }
    }

    // Stocker les informations complètes de l'enseignant
    this.storeTeacherInfo({
      ...user,
      specialtyName,
      departmentName
    });

    // Retourner la réponse d'authentification originale
    return of({
      user: user,
      token: localStorage.getItem("authToken") || "token-placeholder",
    });
  }

  // Charger les informations complètes de l'étudiant avec les noms des entités
  private loadCompleteStudentInfo(user: any): Observable<AuthResponse> {
    if (!user) {
      return throwError(() => new Error("Données utilisateur manquantes"));
    }

    console.log("Chargement des informations complètes de l'étudiant:", user);

    // Mapper directement les noms des départements et niveaux
    const departmentName = this.mapDepartmentName(user.department);
    const levelName = this.mapLevelName(user.level);

    // Obtenir le nom de la spécialité
    let specialtyName = "Spécialité non assignée";
    
    if (user.specialty) {
      console.log("Type de spécialité reçu:", typeof user.specialty, user.specialty);
      
      // Si la spécialité est un objet avec une propriété 'nom' ou 'name'
      if (typeof user.specialty === 'object' && user.specialty !== null) {
        if (user.specialty.nom) {
          specialtyName = user.specialty.nom;
          console.log("Nom de spécialité trouvé dans l'objet (nom):", specialtyName);
        } else if (user.specialty.name) {
          specialtyName = user.specialty.name;
          console.log("Nom de spécialité trouvé dans l'objet (name):", specialtyName);
        } else if (user.specialty._id && this.specialtyMap[user.specialty._id]) {
          // Si l'objet a un _id et que cet _id est dans notre mapping
          specialtyName = this.specialtyMap[user.specialty._id];
          console.log("Nom de spécialité trouvé via l'ID dans l'objet:", specialtyName);
        }
      } 
      // Si la spécialité est une chaîne de caractères, vérifier si c'est un ID dans notre mapping
      else if (typeof user.specialty === 'string') {
        // Vérifier si l'ID existe dans notre mapping
        if (this.specialtyMap[user.specialty]) {
          specialtyName = this.specialtyMap[user.specialty];
          console.log("Nom de spécialité trouvé dans le mapping:", specialtyName);
        } else {
          // Si ce n'est pas dans le mapping, c'est peut-être déjà le nom
          specialtyName = user.specialty;
          console.log("Utilisation de la chaîne de spécialité directement:", specialtyName);
        }
      }
    }

    // Obtenir le nom de la filière
    let filiereName = "Filière non assignée";
    
    if (user.filiere) {
      console.log("Type de filière reçu:", typeof user.filiere, user.filiere);
      
      // Si la filière est un objet avec une propriété 'nom' ou 'name'
      if (typeof user.filiere === 'object' && user.filiere !== null) {
        if (user.filiere.nom) {
          filiereName = user.filiere.nom;
          console.log("Nom de filière trouvé dans l'objet (nom):", filiereName);
        } else if (user.filiere.name) {
          filiereName = user.filiere.name;
          console.log("Nom de filière trouvé dans l'objet (name):", filiereName);
        } else if (user.filiere._id && this.filiereMap[user.filiere._id]) {
          // Si l'objet a un _id et que cet _id est dans notre mapping
          filiereName = this.filiereMap[user.filiere._id];
          console.log("Nom de filière trouvé via l'ID dans l'objet:", filiereName);
        }
      } 
      // Si la filière est une chaîne de caractères, vérifier si c'est un ID dans notre mapping
      else if (typeof user.filiere === 'string') {
        // Vérifier si l'ID existe dans notre mapping
        if (this.filiereMap[user.filiere]) {
          filiereName = this.filiereMap[user.filiere];
          console.log("Nom de filière trouvé dans le mapping:", filiereName);
        } else {
          // Si ce n'est pas dans le mapping, c'est peut-être déjà le nom
          filiereName = user.filiere;
          console.log("Utilisation de la chaîne de filière directement:", filiereName);
        }
      }
    }

    // Obtenir le nom du groupe
    let groupName = "Groupe non assigné";

    if (user.group) {
      console.log("Type de groupe reçu:", typeof user.group, user.group);
      
      // Si le groupe est un objet avec une propriété 'nom', 'name' ou 'numero'
      if (typeof user.group === 'object' && user.group !== null) {
        if (user.group.nom) {
          groupName = user.group.nom;
        } else if (user.group.name) {
          groupName = user.group.name;
        } else if (user.group.numero) {
          // Utiliser directement le numéro tel quel, qu'il soit "1" ou "1.1"
          groupName = `Groupe ${user.group.numero}`;
        } else if (user.group._id && this.groupMap[user.group._id]) {
          groupName = this.groupMap[user.group._id];
        }
      } 
      // Si le groupe est une chaîne de caractères
      else if (typeof user.group === 'string') {
        // Vérifier si l'ID existe dans notre mapping
        if (this.groupMap[user.group]) {
          groupName = this.groupMap[user.group];
        } else {
          // Utiliser directement la valeur, qu'elle soit "1" ou "1.1"
          groupName = `Groupe ${user.group}`;
        }
      }
    }

    console.log("Nom de spécialité final déterminé:", specialtyName);
    console.log("Nom de filière final déterminé:", filiereName);
    console.log("Nom de groupe final déterminé:", groupName);

    // Stocker les informations complètes de l'étudiant
    this.storeStudentInfo({
      ...user,
      specialtyName,
      departmentName,
      levelName,
      filiereName,
      groupName
    });

    // Retourner la réponse d'authentification originale
    return of({
      user: user,
      token: localStorage.getItem("authToken") || "token-placeholder",
    });
  }

  // Mapper les IDs des départements à leurs noms
  mapDepartmentName(departmentId: string): string {
    return this.departmentMap[departmentId] || "Département non disponible";
  }

  // Mapper les IDs des niveaux à leurs noms
  mapLevelName(levelId: string): string {
    return this.levelMap[levelId] || "Niveau non disponible";
  }

  // Mapper les IDs des spécialités à leurs noms
  mapSpecialtyName(specialtyId: string): string {
    return this.specialtyMap[specialtyId] || "Spécialité non disponible";
  }

  // Mapper les IDs des filières à leurs noms
  mapFiliereName(filiereId: string): string {
    return this.filiereMap[filiereId] || "Filière non disponible";
  }

  // Mapper les IDs des groupes à leurs noms
  mapGroupName(groupId: string): string {
    // Vérifier d'abord si nous avons le nom dans notre mapping
    if (this.groupMap[groupId]) {
      return this.groupMap[groupId];
    }
    
    // Si c'est un nombre ou une chaîne numérique simple
    if (!isNaN(Number(groupId))) {
      // Vérifier si c'est un format avec sous-groupe (comme "1.1")
      if (groupId.includes('.')) {
        return `Groupe ${groupId}`;
      } else {
        return `Groupe ${groupId}`;
      }
    }
    
    // Pour les autres cas (probablement un ID MongoDB)
    return "Groupe non disponible";
  }

  // Stocker les informations de l'enseignant
  private storeTeacherInfo(user: any): void {
    if (!user) return;

    console.log("Stockage des informations enseignant:", user);

    // Déterminer l'ID de la spécialité
    let specialtyId = user.specialty;
    if (typeof user.specialty === 'object' && user.specialty !== null) {
      specialtyId = user.specialty._id || user.specialty.id;
    }

    // Créer un objet avec les informations de l'enseignant
    const teacherInfo: TeacherInfo = {
      _id: user._id || user.id,
      name: user.name || "Nom non disponible",
      email: user.email || "Email non disponible",
      cin: user.cin || "CIN non disponible",
      department: user.department || "Département non disponible",
      specialty: specialtyId || "Spécialité non assignée",
      role: "teacher",

      // Ajouter les noms mappés
      departmentName: user.departmentName || this.mapDepartmentName(user.department),
      // Utiliser specialtyName s'il est défini, sinon essayer de mapper l'ID
      specialtyName: user.specialtyName || this.mapSpecialtyName(specialtyId)
    };

    // Stocker dans la propriété du service
    this.teacherInfo = teacherInfo;

    // Stocker dans localStorage pour persistance
    localStorage.setItem("teacherInfo", JSON.stringify(teacherInfo));

    console.log("Informations enseignant stockées:", teacherInfo);
  }

  // Stocker les informations de l'étudiant
  private storeStudentInfo(user: any): void {
    if (!user) return;

    console.log("Stockage des informations étudiant:", user);

    // Déterminer l'ID de la spécialité
    let specialtyId = user.specialty;
    if (typeof user.specialty === 'object' && user.specialty !== null) {
      specialtyId = user.specialty._id || user.specialty.id;
    }

    // Déterminer l'ID de la filière
    let filiereId = user.filiere;
    if (typeof user.filiere === 'object' && user.filiere !== null) {
      filiereId = user.filiere._id || user.filiere.id;
    }

    // Déterminer l'ID du groupe
    let groupId = user.group;
    if (typeof user.group === 'object' && user.group !== null) {
      groupId = user.group._id || user.group.id;
    }

    // Créer un objet avec les informations de l'étudiant
    const studentInfo: StudentInfo = {
      _id: user._id || user.id,
      name: user.name || "Nom non disponible",
      email: user.email || "Email non disponible",
      cin: user.cin || "CIN non disponible",
      level: user.level || "Niveau non disponible",
      department: user.department || "Département non disponible",
      specialty: specialtyId || "Spécialité non assignée",
      filiere: filiereId || "Filière non disponible",
      group: groupId || "Groupe non disponible",
      subGroup: user.subGroup || undefined,
      matricule: user.matricule || "Matricule non disponible",
      role: "student",

      // Ajouter les noms mappés
      departmentName: user.departmentName || this.mapDepartmentName(user.department),
      // Utiliser specialtyName s'il est défini, sinon essayer de mapper l'ID
      specialtyName: user.specialtyName || this.mapSpecialtyName(specialtyId),
      levelName: user.levelName || this.mapLevelName(user.level),
      // Utiliser filiereName s'il est défini, sinon essayer de mapper l'ID
      filiereName: user.filiereName || this.mapFiliereName(filiereId),
      // Utiliser groupName s'il est défini, sinon essayer de mapper l'ID
      groupName: user.groupName || this.mapGroupName(groupId),
    };

    // Stocker dans la propriété du service
    this.studentInfo = studentInfo;

    // Stocker dans localStorage pour persistance
    localStorage.setItem("studentInfo", JSON.stringify(studentInfo));

    console.log("Informations étudiant stockées:", studentInfo);
  }

  // Obtenir les informations de l'enseignant
  getTeacherInfo(): TeacherInfo | null {
    // Si les informations sont déjà en mémoire, les retourner
    if (this.teacherInfo) {
      // Vérifier si la spécialité est un ID et le convertir en nom si nécessaire
      if (this.teacherInfo.specialty && this.specialtyMap[this.teacherInfo.specialty]) {
        this.teacherInfo.specialtyName = this.specialtyMap[this.teacherInfo.specialty];
      }
      
      return this.teacherInfo;
    }
    
    // Sinon, essayer de les récupérer depuis localStorage
    const teacherInfoStr = localStorage.getItem("teacherInfo");
    if (teacherInfoStr) {
      try {
        const storedInfo = JSON.parse(teacherInfoStr) as TeacherInfo;
        
        // Vérifier si la spécialité est un ID et le convertir en nom si nécessaire
        if (storedInfo.specialty && this.specialtyMap[storedInfo.specialty]) {
          storedInfo.specialtyName = this.specialtyMap[storedInfo.specialty];
        }
        
        this.teacherInfo = storedInfo;
        return storedInfo;
      } catch (e) {
        console.error("Erreur lors de l'analyse des informations enseignant:", e);
        return null;
      }
    }
    
    return null;
  }

  // Obtenir les informations de l'étudiant
  getStudentInfo(): StudentInfo | null {
    // Si les informations sont déjà en mémoire, les retourner
    if (this.studentInfo) {
      // Vérifier si la spécialité est un ID et le convertir en nom si nécessaire
      if (this.studentInfo.specialty && this.specialtyMap[this.studentInfo.specialty]) {
        this.studentInfo.specialtyName = this.specialtyMap[this.studentInfo.specialty];
      }
      
      // Vérifier si la filière est un ID et le convertir en nom si nécessaire
      if (this.studentInfo.filiere && this.filiereMap[this.studentInfo.filiere]) {
        this.studentInfo.filiereName = this.filiereMap[this.studentInfo.filiere];
      }
      
      // Vérifier si le groupe est un ID et le convertir en nom si nécessaire
      if (this.studentInfo.group && this.groupMap[this.studentInfo.group]) {
        this.studentInfo.groupName = this.groupMap[this.studentInfo.group];
      } else if (this.studentInfo.group) {
        // Utiliser directement la valeur du groupe, qu'elle soit "1" ou "1.1"
        this.studentInfo.groupName = `Groupe ${this.studentInfo.group}`;
      }
      
      return this.studentInfo;
    }
    
    // Sinon, essayer de les récupérer depuis localStorage
    const studentInfoStr = localStorage.getItem("studentInfo");
    if (studentInfoStr) {
      try {
        const storedInfo = JSON.parse(studentInfoStr) as StudentInfo;
        
        // Vérifier si la spécialité est un ID et le convertir en nom si nécessaire
        if (storedInfo.specialty && this.specialtyMap[storedInfo.specialty]) {
          storedInfo.specialtyName = this.specialtyMap[storedInfo.specialty];
        }
        
        // Vérifier si la filière est un ID et le convertir en nom si nécessaire
        if (storedInfo.filiere && this.filiereMap[storedInfo.filiere]) {
          storedInfo.filiereName = this.filiereMap[storedInfo.filiere];
        }
        
        // Vérifier si le groupe est un ID et le convertir en nom si nécessaire
        if (storedInfo.group && this.groupMap[storedInfo.group]) {
          storedInfo.groupName = this.groupMap[storedInfo.group];
        } else if (storedInfo.group) {
          // Utiliser directement la valeur du groupe, qu'elle soit "1" ou "1.1"
          storedInfo.groupName = `Groupe ${storedInfo.group}`;
        }
        
        this.studentInfo = storedInfo;
        return storedInfo;
      } catch (e) {
        console.error("Erreur lors de l'analyse des informations étudiant:", e);
        return null;
      }
    }
    
    return null;
  }

  // Gérer l'authentification réussie
  private handleSuccessfulAuth(response: any, role: "teacher" | "student"): void {
    console.log(`AuthService: Traitement de l'authentification réussie pour ${role}:`, response);

    // Extraire l'utilisateur et le token de la réponse
    let user, token;

    if (response.user && response.token) {
      // Format standard {user: {...}, token: "..."}
      user = response.user;
      token = response.token;
    } else if (response.token) {
      // Format {token: "...", ...userInfo}
      token = response.token;
      // Copier tous les champs sauf token dans user
      const { token: _, ...userInfo } = response;
      user = userInfo;
    } else {
      // Format où la réponse est l'utilisateur lui-même
      user = response;
      token = "token-placeholder"; // Utiliser un placeholder si aucun token n'est fourni
    }

    // Convertir le rôle du backend au format attendu par le frontend
    let frontendRole = role;
    if (user.role === "enseignant") {
      frontendRole = "teacher";
    } else if (user.role === "etudiant") {
      frontendRole = "student";
    }

    // Stocker les détails de l'utilisateur et le token
    this.currentUser = {
      ...user,
      role: frontendRole,
    };

    // Sauvegarder dans localStorage
    localStorage.setItem("currentUser", JSON.stringify(this.currentUser));
    localStorage.setItem("userRole", frontendRole);
    localStorage.setItem("authToken", token);

    // Stocker l'ID séparément pour un accès plus facile
    if (frontendRole === "teacher") {
      localStorage.setItem("enseignantId", user._id || user.id || "");
    } else {
      localStorage.setItem("etudiantId", user._id || user.id || "");
    }

    // Mettre à jour l'état d'authentification
    this.authStateSubject.next(true);

    console.log(`AuthService: Utilisateur ${frontendRole} authentifié et stocké:`, this.currentUser);
  }

  // Obtenir l'utilisateur authentifié actuel
  getCurrentUser(): any {
    return this.currentUser;
  }

  // Vérifier si l'utilisateur est authentifié
  isAuthenticated(): boolean {
    const isAuth = !!this.currentUser;
    console.log("AuthService: Vérification d'authentification:", isAuth, this.currentUser);
    return isAuth;
  }

  // Obtenir le rôle de l'utilisateur
  getUserRole(): string | null {
    const role = this.currentUser ? this.currentUser.role : null;
    console.log("AuthService: Rôle de l'utilisateur:", role);
    return role;
  }

  // Vérifier si l'utilisateur est un enseignant
  isTeacher(): boolean {
    const isTeacher = this.currentUser?.role === "teacher";
    console.log("AuthService: Est enseignant:", isTeacher);
    return isTeacher;
  }

  // Vérifier si l'utilisateur est un étudiant
  isStudent(): boolean {
    const isStudent = this.currentUser?.role === "student";
    console.log("AuthService: Est étudiant:", isStudent);
    return isStudent;
  }

  // Déconnecter l'utilisateur
  logout(): void {
    console.log("AuthService: Déconnexion de l'utilisateur");

    // Effacer les données utilisateur
    this.currentUser = null;
    this.studentInfo = null;
    this.teacherInfo = null;

    // Supprimer toutes les données de session du localStorage
    localStorage.removeItem("currentUser");
    localStorage.removeItem("userRole");
    localStorage.removeItem("authToken");
    localStorage.removeItem("enseignantId");
    localStorage.removeItem("etudiantId");
    localStorage.removeItem("studentInfo");
    localStorage.removeItem("teacherInfo");

    // Mettre à jour l'état d'authentification
    this.authStateSubject.next(false);

    // Afficher un message de confirmation
    console.log("AuthService: Utilisateur déconnecté avec succès");

    // Rediriger vers la page de connexion
    this.router.navigate(["/login"]);
  }

  // Obtenir le token d'authentification
  getToken(): string | null {
    return localStorage.getItem("authToken");
  }

  // Vérifier si le token est expiré (version simplifiée)
  isTokenExpired(): boolean {
    // Dans une application réelle, vous décoderiez le JWT et vérifieriez son expiration
    return false;
  }

  // Rafraîchir le token si nécessaire
  refreshToken(): Observable<any> {
    const token = this.getToken();
    if (!token) {
      return throwError(() => new Error("Aucun token disponible"));
    }

    // Implémentation de rafraîchissement de token
    return this.http
      .post(`${this.apiUrl}/auth/refresh-token`, {
        token: token,
      }, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json'
        })
      })
      .pipe(
        catchError((error) => {
          console.error("Erreur lors du rafraîchissement du token:", error);
          return throwError(() => error);
        }),
      );
  }

  // Méthode pour récupérer directement les informations de spécialité
  getSpecialtyInfo(specialtyId: string): Observable<any> {
    if (!specialtyId) {
      return throwError(() => new Error("ID de spécialité non fourni"));
    }

    // Vérifier d'abord si nous avons le nom dans notre mapping
    if (this.specialtyMap[specialtyId]) {
      return of({
        _id: specialtyId,
        nom: this.specialtyMap[specialtyId]
      });
    }

    // Sinon, faire une requête à l'API
    return this.http.get<any>(`${this.apiUrl}/specialties/${specialtyId}`, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`
      })
    }).pipe(
      tap(specialty => {
        console.log("Informations de spécialité récupérées:", specialty);
        // Mettre à jour notre mapping pour les futures références
        if (specialty && specialty.nom) {
          this.specialtyMap[specialtyId] = specialty.nom;
        } else if (specialty && specialty.name) {
          this.specialtyMap[specialtyId] = specialty.name;
        }
      }),
      catchError(error => {
        console.error("Erreur lors de la récupération des informations de spécialité:", error);
        return throwError(() => error);
      })
    );
  }

  // Méthode pour récupérer directement les informations de filière
  getFiliereInfo(filiereId: string): Observable<any> {
    if (!filiereId) {
      return throwError(() => new Error("ID de filière non fourni"));
    }

    // Vérifier d'abord si nous avons le nom dans notre mapping
    if (this.filiereMap[filiereId]) {
      return of({
        _id: filiereId,
        nom: this.filiereMap[filiereId]
      });
    }

    // Sinon, faire une requête à l'API
    return this.http.get<any>(`${this.apiUrl}/filieres/${filiereId}`, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`
      })
    }).pipe(
      tap(filiere => {
        console.log("Informations de filière récupérées:", filiere);
        // Mettre à jour notre mapping pour les futures références
        if (filiere && filiere.nom) {
          this.filiereMap[filiereId] = filiere.nom;
        } else if (filiere && filiere.name) {
          this.filiereMap[filiereId] = filiere.name;
        }
      }),
      catchError(error => {
        console.error("Erreur lors de la récupération des informations de filière:", error);
        return throwError(() => error);
      })
    );
  }

  // Méthode pour récupérer directement les informations de groupe
  getGroupInfo(groupId: string): Observable<any> {
    if (!groupId) {
      return throwError(() => new Error("ID de groupe non fourni"));
    }

    // Vérifier d'abord si nous avons le nom dans notre mapping
    if (this.groupMap[groupId]) {
      return of({
        _id: groupId,
        nom: this.groupMap[groupId]
      });
    }

    // Sinon, faire une requête à l'API
    return this.http.get<any>(`${this.apiUrl}/groupes/${groupId}`, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`
      })
    }).pipe(
      tap(group => {
        console.log("Informations de groupe récupérées:", group);
        // Mettre à jour notre mapping pour les futures références
        if (group && group.nom) {
          this.groupMap[groupId] = group.nom;
        } else if (group && group.name) {
          this.groupMap[groupId] = group.name;
        } else if (group && group.numero) {
          this.groupMap[groupId] = `Groupe ${group.numero}`;
        }
      }),
      catchError(error => {
        console.error("Erreur lors de la récupération des informations de groupe:", error);
        return throwError(() => error);
      })
    );
  }

  // Méthode pour charger dynamiquement toutes les spécialités
  loadAllSpecialties(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/specialties`, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`
      })
    }).pipe(
      tap(specialties => {
        console.log("Toutes les spécialités récupérées:", specialties);
        // Mettre à jour notre mapping
        if (Array.isArray(specialties)) {
          specialties.forEach(specialty => {
            if (specialty._id) {
              // Utiliser nom ou name selon ce qui est disponible
              const specialtyName = specialty.nom || specialty.name;
              if (specialtyName) {
                this.specialtyMap[specialty._id] = specialtyName;
              }
            }
          });
        }
      }),
      catchError(error => {
        console.error("Erreur lors de la récupération des spécialités:", error);
        return throwError(() => error);
      })
    );
  }

  // Méthode pour charger dynamiquement toutes les filières
  loadAllFilieres(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/filieres`, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`
      })
    }).pipe(
      tap(filieres => {
        console.log("Toutes les filières récupérées:", filieres);
        // Mettre à jour notre mapping
        if (Array.isArray(filieres)) {
          filieres.forEach(filiere => {
            if (filiere._id) {
              // Utiliser nom ou name selon ce qui est disponible
              const filiereName = filiere.nom || filiere.name;
              if (filiereName) {
                this.filiereMap[filiere._id] = filiereName;
              }
            }
          });
        }
      }),
      catchError(error => {
        console.error("Erreur lors de la récupération des filières:", error);
        return throwError(() => error);
      })
    );
  }

  // Méthode pour charger dynamiquement tous les groupes
  loadAllGroups(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/groupes`, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`
      })
    }).pipe(
      tap(groups => {
        console.log("Tous les groupes récupérés:", groups);
        // Mettre à jour notre mapping
        if (Array.isArray(groups)) {
          groups.forEach(group => {
            if (group._id) {
              // Utiliser nom, name ou numero selon ce qui est disponible
              let groupName;
              if (group.nom) {
                groupName = group.nom;
              } else if (group.name) {
                groupName = group.name;
              } else if (group.numero) {
                groupName = `Groupe ${group.numero}`;
              }
              
              if (groupName) {
                this.groupMap[group._id] = groupName;
              }
            }
          });
        }
      }),
      catchError(error => {
        console.error("Erreur lors de la récupération des groupes:", error);
        return throwError(() => error);
      })
    );
  }

  // Méthode pour précharger toutes les données de référence
  preloadAllReferenceData(): Observable<any> {
    return forkJoin({
      specialties: this.loadAllSpecialties(),
      filieres: this.loadAllFilieres(),
      groups: this.loadAllGroups()
    }).pipe(
      tap(results => {
        console.log("Toutes les données de référence chargées:", results);
      }),
      catchError(error => {
        console.error("Erreur lors du préchargement des données de référence:", error);
        return throwError(() => error);
      })
    );
  }
}