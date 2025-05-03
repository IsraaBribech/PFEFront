import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DepartementsService {
  private apiUrl = 'http://localhost:5000/api/departements'; // Assurez-vous que le backend tourne bien

  constructor(private http: HttpClient) {}

  // Ajouter un département
  addDepartement(departementData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}`, departementData);
  }

  // Récupérer tous les départements
  getDepartements(): Observable<any> {
    return this.http.get(`${this.apiUrl}`);
  }

  // Récupérer un département par ID
  getDepartementById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  // Modifier un département par ID
  updateDepartement(id: string, updatedData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, updatedData);
  }


  

  // Supprimer un département par ID
  deleteDepartement(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
