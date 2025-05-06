import { Injectable } from "@angular/core"
import { HttpClient, HttpHeaders, HttpEventType } from "@angular/common/http"
import { type Observable, throwError } from "rxjs"
import { catchError, map } from "rxjs/operators"

@Injectable({
  providedIn: "root",
})
export class UploadcourService {
  private apiUrl = "http://localhost:5001/api" // URL de votre API backend

  constructor(private http: HttpClient) {}

  // Méthode pour télécharger un fichier de cours et ajouter les données du cours
  uploadCours(formData: any, file: File): Observable<any> {
    // Créer un FormData pour envoyer à la fois les données du formulaire et le fichier
    const uploadData = new FormData()

    // Ajouter le fichier au FormData
    if (file) {
      uploadData.append("courFile", file, file.name)
    }

    // Ajouter les données du cours au FormData
    uploadData.append("titre", formData.title) // Changer "title" en "titre" pour le backend
    uploadData.append("departement", formData.departement)
    uploadData.append("niveau", formData.niveau)
    uploadData.append("specialite", formData.specialite)
    uploadData.append("teacher", formData.teacher || "")
    uploadData.append("seance", "cours") // Ajouter un champ seance par défaut

    // Configurer les headers pour l'upload de fichier
    const headers = new HttpHeaders()

    // Envoyer la requête POST au backend
    return this.http
      .post(`${this.apiUrl}/uploadcours/upload`, uploadData, {
        headers,
        reportProgress: true,
        observe: "events",
      })
      .pipe(
        map((event) => {
          // Suivre la progression de l'upload
          if (event.type === HttpEventType.UploadProgress && event.total) {
            const progress = Math.round((100 * event.loaded) / event.total)
            return { status: "progress", progress }
          } else if (event.type === HttpEventType.Response) {
            return { status: "complete", data: event.body }
          }
          return { status: "pending" }
        }),
        catchError((error) => {
          console.error("Erreur lors de l'upload du cours:", error)
          return throwError(() => new Error("Erreur lors de l'upload du cours. Veuillez réessayer."))
        }),
      )
  }

  // Méthode pour récupérer tous les cours
  getAllCours(): Observable<any> {
    return this.http.get(`${this.apiUrl}/cours`).pipe(
      catchError((error) => {
        console.error("Erreur lors de la récupération des cours:", error)
        return throwError(() => new Error("Erreur lors de la récupération des cours."))
      }),
    )
  }

  // Méthode pour récupérer les cours par département, niveau et spécialité
  getCoursByFilters(departement: string, niveau: string, specialite: string): Observable<any> {
    let url = `${this.apiUrl}/cours/filter?`

    if (departement) url += `departement=${departement}&`
    if (niveau) url += `niveau=${niveau}&`
    if (specialite) url += `specialite=${specialite}`

    return this.http.get(url).pipe(
      catchError((error) => {
        console.error("Erreur lors de la récupération des cours filtrés:", error)
        return throwError(() => new Error("Erreur lors de la récupération des cours filtrés."))
      }),
    )
  }
}
