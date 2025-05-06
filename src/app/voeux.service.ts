import { Injectable } from "@angular/core"
import { HttpClient, HttpParams, HttpHeaders } from "@angular/common/http"
import { Observable, throwError } from "rxjs"
import { catchError, tap } from "rxjs/operators"

// Interface pour les voeux
export interface Voeux {
dateTraitement: any
  nbGroupes: any
  nbFilieres: any
  _id?: string
  enseignantId: string
  enseignantNom: string
  departement: string
  specialite: string
  niveau: string
  semestre: string
  typesSeance: string[] // Tableau des types de séance (cours, td, tp)
  matieres: string[] // Tableau des IDs de matières
  commentaire?: string
  status: "pending" | "approved" | "rejected"
  commentaireChef?: string
  chefDepartementId?: string
  dateCreation?: Date
  dateReponse?: Date
  // Nouveaux champs pour la charge horaire
  chargeHoraire?: {
    coursTD: number
    totalTD: number
    tpTD: number
    cours: number;
    td: number;
    tp: number;
  }
}



// Interface pour les statistiques
export interface VoeuxStats {
  total: number
  pending: number
  approved: number
  rejected: number
}

// Interface pour la mise à jour du statut
export interface StatusUpdate {
  status: "approved" | "rejected"
  commentaireChef?: string
  matieres?: string[]
  groupes?: { groupeId: number; sousGroupeId: string }[] // Ajout des groupes
  chargeHoraire?: {
    cours: number;
    td: number;
    tp: number;
  }
}

@Injectable({
  providedIn: "root",
})
export class VoeuxService {
  private apiUrl = "http://localhost:5001/api/voeux"

  // Information de l'enseignant connecté (à remplacer par une authentification réelle)
  private currentEnseignant = {
    id: "67c4c2f07fe25e5361a1e1bf", // ID fictif, à remplacer par l'ID réel de l'enseignant connecté
    nom: "Bribech Israa", // Nom complet de l'enseignant
    grade: "Maitre Assistant" // Grade de l'enseignant
  }

  constructor(private http: HttpClient) {}

  /**
   * Récupérer tous les voeux avec filtres optionnels
   * @param filters Filtres optionnels (status, departement, etc.)
   * @returns Observable avec la liste des voeux
   */
  getAllVoeux(filters: any = {}): Observable<Voeux[]> {
    let params = new HttpParams()

    // Ajouter les filtres aux paramètres de requête
    if (filters.status && filters.status !== "all") {
      params = params.set("status", filters.status)
    }

    if (filters.departement && filters.departement !== "all") {
      params = params.set("departement", filters.departement)
    }

    if (filters.specialite && filters.specialite !== "all") {
      params = params.set("specialite", filters.specialite)
    }

    if (filters.niveau && filters.niveau !== "all") {
      params = params.set("niveau", filters.niveau)
    }

    if (filters.semestre && filters.semestre !== "all") {
      params = params.set("semestre", filters.semestre)
    }

    // Ajouter le filtre pour le type de séance
    if (filters.typesSeance && filters.typesSeance !== "all" && filters.typesSeance !== "tous") {
      params = params.set("typesSeance", filters.typesSeance)
    }

    return this.http.get<Voeux[]>(this.apiUrl, { params }).pipe(
      tap((voeux) => console.log("Voeux récupérés:", voeux)),
      catchError(this.handleError),
    )
  }

  /**
   * Récupérer les voeux d'un enseignant spécifique
   * @param enseignantId ID de l'enseignant
   * @returns Observable avec la liste des voeux de l'enseignant
   */
  getVoeuxByEnseignant(enseignantId: string): Observable<Voeux[]> {
    return this.http.get<Voeux[]>(`${this.apiUrl}/enseignant/${enseignantId}`).pipe(
      tap((voeux) => console.log(`Voeux de l'enseignant ${enseignantId}:`, voeux)),
      catchError(this.handleError),
    )
  }

  /**
   * Récupérer un voeu par son ID
   * @param id ID du voeu
   * @returns Observable avec le voeu
   */
  getVoeuxById(id: string): Observable<Voeux> {
    return this.http.get<Voeux>(`${this.apiUrl}/${id}`).pipe(
      tap((voeu) => console.log(`Voeu ${id}:`, voeu)),
      catchError(this.handleError),
    )
  }

  /**
   * Récupérer les statistiques des voeux
   * @returns Observable avec les statistiques
   */
  getVoeuxStats(): Observable<VoeuxStats> {
    return this.http.get<VoeuxStats>(`${this.apiUrl}/stats`).pipe(
      tap((stats) => console.log("Statistiques des voeux:", stats)),
      catchError(this.handleError),
    )
  }

  /**
   * Créer un nouveau voeu
   * @param voeuxData Données du voeu
   * @returns Observable avec le voeu créé
   */
  createVoeux(voeuxData: any): Observable<Voeux> {
    // S'assurer que les données sont complètes
    const processedData = {
      ...voeuxData,
      enseignantId: voeuxData.enseignantId || this.currentEnseignant.id,
      enseignantNom: voeuxData.enseignantNom || this.currentEnseignant.nom,
      status: "pending",
    }

    console.log("Données complètes du voeu à envoyer:", processedData)

    const headers = new HttpHeaders({
      "Content-Type": "application/json",
    })

    return this.http.post<Voeux>(this.apiUrl, processedData, { headers }).pipe(
      tap((voeu) => console.log("Voeu créé avec succès:", voeu)),
      catchError(this.handleError),
    )
  }

  /**
   * Mettre à jour le statut d'un voeu (approuver/rejeter)
   * @param id ID du voeu
   * @param updateData Données de mise à jour (status, commentaire, etc.)
   * @returns Observable avec le voeu mis à jour
   */
  updateVoeuxStatus(id: string, updateData: StatusUpdate): Observable<Voeux> {
    return this.http.put<Voeux>(`${this.apiUrl}/${id}/status`, updateData).pipe(
      tap((voeu) => console.log(`Statut du voeu ${id} mis à jour:`, voeu)),
      catchError(this.handleError),
    )
  }

  /**
   * Supprimer un voeu
   * @param id ID du voeu
   * @returns Observable avec le résultat de la suppression
   */
  deleteVoeux(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      tap((result) => console.log(`Voeu ${id} supprimé:`, result)),
      catchError(this.handleError),
    )
  }

  /**
   * Définir l'enseignant actuel (à appeler après connexion)
   * @param id ID de l'enseignant
   * @param nom Nom complet de l'enseignant
   * @param grade Grade de l'enseignant
   */
  setCurrentEnseignant(id: string, nom: string, grade: string): void {
    this.currentEnseignant = { id, nom, grade }
  }

  /**
   * Calculer la charge horaire en fonction du grade
   * @param grade Grade de l'enseignant
   * @param cours Nombre d'heures de cours
   * @param td Nombre d'heures de TD
   * @param tp Nombre d'heures de TP
   * @returns Objet contenant les informations de charge horaire
   */
  calculerChargeHoraire(grade: string, cours: number = 0, td: number = 0, tp: number = 0): any {
    // Conversion des heures en équivalent TD
    const coursTD = cours * 1.83;
    const tpTD = tp * 0.86;
    const totalTD = coursTD + td + tpTD;
    
    // Charge horaire de base et supplémentaire selon le grade
    let chargeBase = 0;
    let chargeSupplementaire = 0;
    
    switch (grade.toLowerCase()) {
      case 'maitre assistant':
      case 'maître assistant':
      case 'maitre-assistant':
      case 'maître-assistant':
        chargeBase = 9.5;
        chargeSupplementaire = 4;
        break;
      case 'assistant':
        chargeBase = 11;
        chargeSupplementaire = 4;
        break;
      case 'pes':
      case 'professeur':
        chargeBase = 14;
        chargeSupplementaire = 2;
        break;
      default:
        chargeBase = 9.5; // Valeur par défaut
        chargeSupplementaire = 4;
    }
    
    return {
      grade,
      conversion: {
        coursTD: parseFloat(coursTD.toFixed(2)),
        tpTD: parseFloat(tpTD.toFixed(2)),
        totalTD: parseFloat(totalTD.toFixed(2))
      },
      chargeHoraire: {
        base: chargeBase,
        supplementaire: chargeSupplementaire,
        total: chargeBase + chargeSupplementaire
      }
    };
  }

  /**
   * Gestion des erreurs HTTP
   * @param error Erreur HTTP
   * @returns Observable avec l'erreur
   */
  private handleError(error: any) {
    let errorMessage = ""

    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur: ${error.error.message}`
    } else {
      // Erreur côté serveur
      errorMessage = `Code d'erreur: ${error.status}\nMessage: ${error.error.message || error.message}`
    }

    console.error("Erreur HTTP:", error)
    console.error(errorMessage)
    return throwError(() => new Error(errorMessage))
  }
}