import { Injectable } from "@angular/core"
import {  HttpClient, HttpHeaders } from "@angular/common/http"
import { type Observable, throwError, of } from "rxjs"
import { catchError, tap, map } from "rxjs/operators"

// Interface compatible avec les deux formats (ancien et nouveau)
export interface Specialite {
  _id: string
  id?: string
  name: string
  nom?: string // Pour la compatibilité avec l'ancien format
  description?: string
  department: string
  departement?: string // Pour la compatibilité avec l'ancien format
  level: string | { _id: string }
  niveau?: string // Pour la compatibilité avec l'ancien format
  couleur?: string
}

@Injectable({
  providedIn: "root",
})
export class SpecialitesService {
  private apiUrl = "http://localhost:5001/api/specialites"

  // Cache pour les spécialités
  private specialitesCache: Map<string, Specialite> = new Map()
  private allSpecialitesCache: Specialite[] = []
  private lastCacheUpdate = 0
  private cacheDuration = 5 * 60 * 1000 // 5 minutes en millisecondes

  constructor(private http: HttpClient) {}

  // Méthode pour obtenir les en-têtes HTTP
  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      "Content-Type": "application/json",
    })
  }

  // Ajouter une nouvelle spécialité
  addSpecialite(specialiteData: any): Observable<any> {
    console.log("📤 Données brutes:", specialiteData)

    // Normaliser les données pour le backend
    const payload = {
      name: specialiteData.nom || specialiteData.name,
      description: specialiteData.description || "",
      department: specialiteData.departement || specialiteData.department,
      level: specialiteData.niveau || specialiteData.level,
      couleur: specialiteData.couleur || "#3498db",
    }

    console.log("📤 Données normalisées envoyées au serveur:", payload)

    // Invalider le cache après ajout
    this.invalidateCache()

    return this.http.post(`${this.apiUrl}`, payload, { headers: this.getHeaders() }).pipe(
      tap((response) => console.log("✅ Réponse du serveur (ajout):", response)),
      catchError((error) => {
        console.error("❌ Erreur détaillée lors de l'ajout:", error)
        return throwError(() => error)
      }),
    )
  }

  // Récupérer toutes les spécialités
  getSpecialites(): Observable<Specialite[]> {
    // Vérifier si le cache est valide
    if (this.isCacheValid() && this.allSpecialitesCache.length > 0) {
      console.log("Utilisation du cache pour toutes les spécialités")
      return of(this.allSpecialitesCache)
    }

    console.log("Appel API: getSpecialites()")
    return this.http.get<Specialite[]>(`${this.apiUrl}`, { headers: this.getHeaders() }).pipe(
      map((specialites) => {
        // Normaliser les données pour assurer la compatibilité
        return specialites.map(this.normalizeSpecialite)
      }),
      tap((specialites) => {
        console.log("Spécialités récupérées:", specialites)
        // Mettre à jour le cache
        this.allSpecialitesCache = specialites
        this.updateCache(specialites)
        this.lastCacheUpdate = Date.now()
      }),
      catchError((error) => {
        console.error("Erreur lors de la récupération des spécialités:", error)
        return throwError(() => error)
      }),
    )
  }

  // Récupérer les spécialités par département
  getSpecialitesByDepartement(departmentId: string): Observable<Specialite[]> {
    console.log(`Appel API: getSpecialitesByDepartement(${departmentId})`)
    return this.http
      .get<Specialite[]>(`${this.apiUrl}/department/${departmentId}`, { headers: this.getHeaders() })
      .pipe(
        map((specialites) => {
          // Normaliser les données pour assurer la compatibilité
          return specialites.map(this.normalizeSpecialite)
        }),
        tap((specialites) => {
          console.log(`Spécialités récupérées pour le département ${departmentId}:`, specialites)
          // Mettre à jour le cache pour ces spécialités
          this.updateCache(specialites)
        }),
        catchError((error) => {
          console.error("Erreur lors de la récupération des spécialités par département:", error)
          return throwError(() => error)
        }),
      )
  }

  // Supprimer une spécialité
  deleteSpecialite(id: string): Observable<any> {
    // Invalider le cache après suppression
    this.invalidateCache()

    return this.http.delete(`${this.apiUrl}/specialites/${id}`).pipe(
      tap(() => console.log(`Spécialité ${id} supprimée`)),
      catchError((error) => {
        console.error("Erreur lors de la suppression de la spécialité:", error)
        return throwError(() => error)
      }),
    )
  }

  // Mettre à jour une spécialité
  updateSpecialite(id: string, specialiteData: any): Observable<any> {
    // Invalider le cache après mise à jour
    this.invalidateCache()

    return this.http.put<any>(`${this.apiUrl}/update/${id}`, specialiteData).pipe(
      tap((updatedSpecialite) => console.log("Spécialité mise à jour", updatedSpecialite)),
      catchError((error) => {
        console.error("❌ Erreur détaillée lors de la mise à jour:", error)
        return throwError(() => error)
      }),
    )
  }

  // Obtenir une spécialité par ID
  getSpecialiteById(id: string): Observable<Specialite> {
    // Vérifier si la spécialité est dans le cache
    if (this.isCacheValid() && this.specialitesCache.has(id)) {
      console.log(`Utilisation du cache pour la spécialité ${id}`)
      return of(this.specialitesCache.get(id) as Specialite)
    }

    return this.http.get<Specialite>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() }).pipe(
      map(this.normalizeSpecialite),
      tap((specialite) => {
        console.log(`Spécialité ${id} récupérée:`, specialite)
        // Ajouter au cache
        this.specialitesCache.set(id, specialite)
      }),
      catchError((error) => {
        console.error("Erreur lors de la récupération de la spécialité:", error)
        return throwError(() => error)
      }),
    )
  }

  // Récupérer toutes les spécialités (méthode alternative)
  getAllSpecialites(): Observable<Specialite[]> {
    // Vérifier si le cache est valide
    if (this.isCacheValid() && this.allSpecialitesCache.length > 0) {
      console.log("Utilisation du cache pour toutes les spécialités (getAllSpecialites)")
      return of(this.allSpecialitesCache)
    }

    console.log("Appel API: getAllSpecialites()")
    return this.http.get<Specialite[]>(this.apiUrl, { headers: this.getHeaders() }).pipe(
      map((specialites) => {
        // Normaliser les données pour assurer la compatibilité
        return specialites.map(this.normalizeSpecialite)
      }),
      tap((specialites) => {
        console.log("Toutes les spécialités récupérées:", specialites)
        // Mettre à jour le cache
        this.allSpecialitesCache = specialites
        this.updateCache(specialites)
        this.lastCacheUpdate = Date.now()
      }),
      catchError((error) => {
        console.error("Erreur lors de la récupération de toutes les spécialités:", error)
        return throwError(() => error)
      }),
    )
  }

  // Obtenir le nom d'une spécialité par son ID
  getSpecialtyNameById(id: string): Observable<string> {
    if (!id) {
      console.log("ID de spécialité non fourni")
      return of("Spécialité non disponible")
    }

    console.log(`Tentative de récupération du nom de la spécialité avec ID: ${id}`)

    // Vérifier si la spécialité est dans le cache
    if (this.isCacheValid() && this.specialitesCache.has(id)) {
      const specialite = this.specialitesCache.get(id)
      console.log(`Nom de spécialité trouvé dans le cache pour ${id}:`, specialite?.name)
      return of(specialite?.name || "Spécialité non disponible")
    }

    // Si la spécialité n'est pas dans le cache, la récupérer
    return this.http.get<Specialite>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() }).pipe(
      tap((specialite) => {
        console.log(`Spécialité ${id} récupérée:`, specialite)
        // Ajouter au cache
        if (specialite) {
          this.specialitesCache.set(id, specialite)
        }
      }),
      map((specialite) => {
        if (specialite && specialite.name) {
          return specialite.name
        }
        return "Spécialité non disponible"
      }),
      catchError((error) => {
        console.error(`Erreur lors de la récupération du nom de la spécialité ${id}:`, error)

        // Essayer une approche alternative - récupérer toutes les spécialités
        return this.getAllSpecialites().pipe(
          map((specialites) => {
            const found = specialites.find((s) => s._id === id || s.id === id)
            return found?.name || "Spécialité non disponible"
          }),
          catchError(() => of("Spécialité non disponible")),
        )
      }),
    )
  }

  // Normaliser une spécialité pour assurer la compatibilité avec les deux formats
  private normalizeSpecialite(specialite: any): Specialite {
    if (!specialite) return {} as Specialite

    return {
      _id: specialite._id || specialite.id || "",
      id: specialite.id || specialite._id || "",
      name: specialite.name || specialite.nom || "",
      nom: specialite.nom || specialite.name || "", // Pour la compatibilité
      description: specialite.description || "",
      department: specialite.department || specialite.departement || "",
      departement: specialite.departement || specialite.department || "", // Pour la compatibilité
      level: specialite.level || specialite.niveau || "",
      niveau: specialite.niveau || specialite.level || "", // Pour la compatibilité
      couleur: specialite.couleur || "#3498db",
    }
  }

  // Méthodes de gestion du cache
  private updateCache(specialites: Specialite[]): void {
    specialites.forEach((specialite) => {
      if (specialite._id) {
        this.specialitesCache.set(specialite._id, specialite)
      }
      if (specialite.id && specialite.id !== specialite._id) {
        this.specialitesCache.set(specialite.id, specialite)
      }
    })
  }

  private isCacheValid(): boolean {
    return Date.now() - this.lastCacheUpdate < this.cacheDuration
  }

  private invalidateCache(): void {
    this.specialitesCache.clear()
    this.allSpecialitesCache = []
    this.lastCacheUpdate = 0
  }
}
