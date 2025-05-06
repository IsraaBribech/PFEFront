import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { Observable, of } from "rxjs";
import { catchError, tap } from "rxjs/operators";

export interface Chapitre {
  _id: string;
  titre: string;
  numero: number;
  description: string;
  nombreSeances: number;
  semestre: string | number; // Accepte les deux types
  courId: string;
  enseignantId: string;
  lienMeet?: string;
  contientQuiz: boolean;
  contientDevoir: boolean;
  fichierNom?: string;
  fichierPath?: string;
  dateCreation?: Date;
  dateModification?: Date;
}

@Injectable({
  providedIn: "root",
})
export class ChapitreService {
  // URL de l'API correcte
  private apiUrl = "http://localhost:5001/api/chapitres";

  constructor(private http: HttpClient) {}

  // Méthode pour gérer les erreurs API avec données de secours
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed:`, error);
      // Retourner un résultat vide ou de secours pour continuer l'application
      return of(result as T);
    };
  }

  // Récupérer tous les chapitres avec filtres optionnels
  getChapitres(filters?: {
    courId?: string;
    enseignantId?: string;
    semestre?: string | number; // Accepte les deux types
    contientQuiz?: boolean;
  }): Observable<Chapitre[]> {
    let params = new HttpParams();

    // Ajouter les filtres aux paramètres si nécessaire
    if (filters) {
      if (filters.courId) params = params.set("courId", filters.courId);
      if (filters.enseignantId) params = params.set("enseignantId", filters.enseignantId);
      if (filters.semestre !== undefined) {
        // Convertir le format du semestre si nécessaire (S1 -> 1)
        let semestreValue = filters.semestre;
        if (typeof semestreValue === 'string' && semestreValue.startsWith('S')) {
          semestreValue = semestreValue.substring(1);
        }
        params = params.set("semestre", semestreValue.toString());
      }
      if (filters.contientQuiz !== undefined) params = params.set("contientQuiz", filters.contientQuiz.toString());
    }

    console.log(`Fetching chapitres with filters:`, filters);

    return this.http.get<Chapitre[]>(this.apiUrl, { params }).pipe(
      tap((chapitres: Chapitre[]) => console.log(`Fetched ${chapitres.length} chapitres`)),
      catchError(this.handleError<Chapitre[]>('getChapitres', []))
    );
  }

  // Récupérer uniquement les chapitres qui contiennent un quiz
  getChapitresWithQuiz(courId?: string): Observable<Chapitre[]> {
    let params = new HttpParams().set("contientQuiz", "true");
    
    if (courId) {
      params = params.set("courId", courId);
    }
    
    console.log(`Fetching chapitres with quizzes for course:`, courId || 'all courses');

    return this.http.get<Chapitre[]>(this.apiUrl, { params }).pipe(
      tap((chapitres: Chapitre[]) => console.log(`Fetched ${chapitres.length} chapitres with quizzes`)),
      catchError(this.handleError<Chapitre[]>('getChapitresWithQuiz', []))
    );
  }

  // Récupérer un chapitre par son ID
  getChapitre(id: string): Observable<Chapitre> {
    return this.http.get<Chapitre>(`${this.apiUrl}/${id}`).pipe(
      tap(_ => console.log(`Fetched chapitre id=${id}`)),
      catchError(this.handleError<Chapitre>(`getChapitre id=${id}`))
    );
  }


  getChapitreDetails(id: string): Observable<Chapitre> {
    console.log(`Fetching detailed information for chapitre id=${id}`);
    return this.http.get<Chapitre>(`${this.apiUrl}/${id}`).pipe(
      tap(chapitre => console.log('Chapitre details fetched:', chapitre)),
      catchError(this.handleError<Chapitre>(`getChapitreDetails id=${id}`))
    );

  }

  downloadFile(filePath: string): Observable<Blob> {
    console.log(`Downloading file from path: ${filePath}`)

    // Ensure the path starts with a slash
    if (!filePath.startsWith("/")) {
      filePath = "/" + filePath
    }

    // If the path already contains the full URL, use it directly
    let downloadUrl = filePath
    if (!filePath.startsWith("http")) {
      downloadUrl = `http://localhost:5000${filePath}`
    }

    console.log(`Final download URL: ${downloadUrl}`)

    return this.http.get(downloadUrl, { responseType: "blob" }).pipe(
      tap((_) => console.log(`Downloaded file from ${downloadUrl}`)),
      catchError((error) => {
        console.error("Error downloading file:", error)
        return this.handleError<Blob>("downloadFile")(error)
      }),
    )
  }
// Créer un nouveau chapitre
createChapitre(chapitreData: any): Promise<any> {
  console.log('Creating chapitre with data:', chapitreData);
  
  // Check if we're dealing with FormData or a regular object
  if (!(chapitreData instanceof FormData)) {
    // Convert regular object to FormData
    const formData = new FormData();
    
    // Add all fields to FormData with proper type conversion
    if (chapitreData.titre) formData.append('titre', chapitreData.titre);
    if (chapitreData.numero) formData.append('numero', chapitreData.numero.toString());
    if (chapitreData.description) formData.append('description', chapitreData.description);
    if (chapitreData.nombreSeances) formData.append('nombreSeances', chapitreData.nombreSeances.toString());
    
    // Handle semestre conversion (S1 -> 1)
    if (chapitreData.semestre) {
      let semestre = chapitreData.semestre;
      if (typeof semestre === 'string' && semestre.startsWith('S')) {
        semestre = semestre.substring(1);
      }
      formData.append('semestre', semestre.toString());
    }
    
    // Handle boolean values
    formData.append('contientQuiz', chapitreData.contientQuiz === true ? 'true' : 'false');
    formData.append('contientDevoir', chapitreData.contientDevoir === true ? 'true' : 'false');
    
    // Add other fields
    if (chapitreData.courId) formData.append('courId', chapitreData.courId);
    if (chapitreData.enseignantId) formData.append('enseignantId', chapitreData.enseignantId);
    if (chapitreData.lienMeet) formData.append('lienMeet', chapitreData.lienMeet);
    
    // Add file if present
    if (chapitreData.fichier && chapitreData.fichier instanceof File) {
      formData.append('fichier', chapitreData.fichier, chapitreData.fichier.name);
    }
    
    // Use the FormData object instead
    chapitreData = formData;
  }
  

  // Return a Promise
  return this.http.post<any>(this.apiUrl, chapitreData)
    .pipe(
      tap((newChapitre: any) => console.log(`Created chapitre w/ id=${newChapitre?._id || 'unknown'}`)),
      catchError((error) => {
        console.error('Error creating chapitre:', error);
        // Log more details about the error
        if (error.error) {
          console.error('Error details:', error.error);
        }
        return this.handleError<any>('createChapitre')(error);
      })
    )
    .toPromise();
}

  // Mettre à jour un chapitre
  updateChapitre(id: string, chapitreData: any): Observable<any> {
    console.log('Updating chapitre with id:', id);
    
    // Vérifier si chapitreData est un FormData (avec fichier) ou un objet JSON
    if (!(chapitreData instanceof FormData)) {
      // C'est un objet JSON, préparer les données
      const formData = new FormData();
      
      // Convertir les valeurs booléennes en chaînes
      const contientQuiz = chapitreData.contientQuiz === true ? 'true' : 'false';
      const contientDevoir = chapitreData.contientDevoir === true ? 'true' : 'false';
      
      // Convertir semestre en nombre si c'est une chaîne
      let semestre = chapitreData.semestre;
      if (typeof semestre === 'string' && semestre.startsWith('S')) {
        semestre = semestre.substring(1);
      }
      
      // Ajouter tous les champs au FormData
      Object.keys(chapitreData).forEach(key => {
        if (key !== 'fichier') {
          if (key === 'contientQuiz') {
            formData.append(key, contientQuiz);
          } else if (key === 'contientDevoir') {
            formData.append(key, contientDevoir);
          } else if (key === 'semestre') {
            formData.append(key, semestre);
          } else {
            formData.append(key, chapitreData[key]);
          }
        }
      });
      
      // Utiliser le FormData préparé
      chapitreData = formData;
    }

    return this.http.put<any>(`${this.apiUrl}/${id}`, chapitreData).pipe(
      tap(_ => console.log(`Updated chapitre id=${id}`)),
      catchError(this.handleError<any>('updateChapitre'))
    );
  }

  // Supprimer un chapitre
  deleteChapitre(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      tap(_ => console.log(`Deleted chapitre id=${id}`)),
      catchError(this.handleError<any>('deleteChapitre'))
    );
  }

  // Upload de fichier séparé (si nécessaire)
  uploadFile(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('fichier', file);
    
    console.log(`Uploading file: ${file.name} (${file.size} bytes)`);
    
    return this.http.post<any>(`${this.apiUrl}/upload`, formData)
      .pipe(
        tap(response => console.log(`Uploaded file ${file.name}:`, response)),
        catchError(this.handleError<any>('uploadFile'))
      )
      .toPromise();
  }

}