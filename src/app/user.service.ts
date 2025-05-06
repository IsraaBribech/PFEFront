import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from "@angular/common/http";
import { Observable, throwError, BehaviorSubject } from "rxjs";
import { catchError, tap, map } from "rxjs/operators";

export interface User {
  niveau: string;
  id: string | undefined;
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
  password?: string;
  telephone?: string;
  birthDate?: Date | string;
  civilStatus?: string;
  address?: {
    street?: string;
    postalCode?: string;
    gouvernorat?: string;
    delegation?: string;
  };
  role?: string;
  matricule?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FiliereCount {
  _id: string;
  count: number;
  filiereName?: string;
  numero?: number;
}

@Injectable({
  providedIn: "root",
})
export class UserService {
  // Base API URL
  private apiUrl = "http://localhost:5001/api";
  
  // Subject to track current user
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    // Check if a user is already stored in localStorage
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        this.currentUserSubject.next(JSON.parse(storedUser));
      } catch (e) {
        console.error("Error parsing stored user:", e);
        localStorage.removeItem('currentUser');
      }
    }
  }

  // Student authentication method
  authenticateStudent(credentials: { identifier: string; password: string }): Observable<any> {
    console.log("UserService: Attempting student authentication with:", credentials);

    // Use correct endpoint for student authentication
    return this.http.post(`${this.apiUrl}/users/login`, credentials, {
      headers: this.getHeaders()
    }).pipe(
      map((response: any) => {
        console.log("UserService: Student authentication response:", response);

        // Ensure response contains user and token
        if (!response.user && !response.token) {
          // If response doesn't contain expected structure, reformat it
          return {
            user: { ...response, role: "student" }, // Explicitly add student role
            token: response.token || "token-placeholder", // Use token if it exists, otherwise a placeholder
          };
        }

        // Add student role if not already done
        if (response.user && !response.user.role) {
          response.user.role = "student";
        }

        // Store user and token in localStorage
        if (response.user && response.token) {
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          localStorage.setItem('token', response.token);
          localStorage.setItem('etudiantId', response.user._id || response.user.id || '');
          this.currentUserSubject.next(response.user);
        }

        return response;
      }),
      catchError((error) => {
        console.error("UserService: Student authentication error:", error);
        return throwError(() => error);
      }),
    );
  }

  // Get student information
  getStudentInfo(): Observable<User> {
    const etudiantId = localStorage.getItem("etudiantId");
    if (!etudiantId) {
      return throwError(() => new Error("Student ID not available"));
    }

    return this.http.get<User>(`${this.apiUrl}/users/${etudiantId}`, { 
      headers: this.getAuthHeaders() 
    }).pipe(
      tap((user) => {
        console.log("Student information retrieved:", user);
        // Update current user
        this.currentUserSubject.next(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
      }),
      catchError(this.handleError),
    );
  }

  // General authentication
  authenticate(credentials: { identifier: string; password: string }): Observable<{ user: User; token: string }> {
    return this.http
      .post<{ user: User; token: string }>(`${this.apiUrl}/login`, credentials, { 
        headers: this.getHeaders() 
      })
      .pipe(
        tap(response => {
          // Store user and token in localStorage
          if (response.user && response.token) {
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            localStorage.setItem('token', response.token);
            if (response.user.role === 'student') {
              localStorage.setItem('etudiantId', response.user._id || response.user.id || '');
            }
            this.currentUserSubject.next(response.user);
          }
        }),
        catchError((error) => {
          console.error("Authentication error:", error);
          return throwError(() => new Error("Authentication failed"));
        }),
      );
  }

  // Get all users
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`, { 
      headers: this.getAuthHeaders() 
    }).pipe(
      tap((users) => console.log("Users retrieved:", users.length)),
      catchError(this.handleError),
    );
  }

  // Get user by ID
  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${id}`, { 
      headers: this.getAuthHeaders() 
    }).pipe(
      tap((user) => console.log("User retrieved:", user.name)),
      catchError(this.handleError),
    );
  }

  // Add a new user
  addUser(user: User): Observable<User> {
    console.log("Sending user data:", JSON.stringify(user));
    
    // Ensure all required fields are present
    const userData = {
      ...user,
      // Add default values if needed
      role: user.role || 'student',
      // Ensure these fields are present for MongoDB
      matricule: user.matricule || this.generateMatricule(),
    };
    
    return this.http.post<User>(`${this.apiUrl}/users/add`, userData, { 
      headers: this.getHeaders() 
    }).pipe(
      tap((newUser) => {
        console.log("User added with ID:", newUser._id);
        
        // If this is the current user, update localStorage
        if (this.isCurrentUser(newUser)) {
          localStorage.setItem('currentUser', JSON.stringify(newUser));
          this.currentUserSubject.next(newUser);
        }
      }),
      catchError((error) => {
        console.error("Error adding user:", error);
        // Detailed log for debugging
        if (error.error) {
          console.error("Error details:", error.error);
        }
        return this.handleError(error);
      }),
    );
  }

  // Generate a unique matricule (if needed)
  private generateMatricule(): string {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `MAT-${timestamp}-${random}`;
  }

  // Check if user is the current user
  private isCurrentUser(user: User): boolean {
    const currentUser = this.currentUserSubject.value;
    if (!currentUser) return false;
    
    return (
      (!!user._id && !!currentUser._id && user._id === currentUser._id) ||
      (!!user.id && !!currentUser.id && user.id === currentUser.id) ||
      (!!user.email && !!currentUser.email && user.email === currentUser.email)
    );
  }

  // Update a user
  updateUser(id: string, user: User): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/${id}`, user, { 
      headers: this.getAuthHeaders() 
    }).pipe(
      tap((updatedUser) => {
        console.log(`User updated with ID: ${id}`);
        
        // If this is the current user, update localStorage
        if (this.isCurrentUser(updatedUser)) {
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
          this.currentUserSubject.next(updatedUser);
        }
      }),
      catchError(this.handleError),
    );
  }

  // Delete a user
  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${id}`, { 
      headers: this.getAuthHeaders() 
    }).pipe(
      tap((_) => {
        console.log(`User deleted with ID: ${id}`);
        
        // If this is the current user, clean localStorage
        const currentUser = this.currentUserSubject.value;
        if (currentUser && (currentUser._id === id || currentUser.id === id)) {
          this.logout();
        }
      }),
      catchError(this.handleError),
    );
  }

  // Logout
  logout(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    localStorage.removeItem('etudiantId');
    this.currentUserSubject.next(null);
  }

  // Assign a student to a group
  assignStudentToGroup(userId: string, filiereId: string, groupId: string, subGroupId?: string): Observable<User> {
    const data: any = {
      filiere: filiereId,
      group: groupId,
    };

    // Add subgroup if provided
    if (subGroupId) {
      data.subGroup = subGroupId;
    }

    return this.http
      .patch<User>(`${this.apiUrl}/users/${userId}/assign-group`, data, { 
        headers: this.getAuthHeaders() 
      })
      .pipe(
        tap((updatedUser) => {
          console.log(`Student ${userId} assigned to group ${groupId} of filiere ${filiereId}`);
          
          // If this is the current user, update localStorage
          if (this.isCurrentUser(updatedUser)) {
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            this.currentUserSubject.next(updatedUser);
          }
        }),
        catchError(this.handleError),
      );
  }

  // Get students by filiere
  getStudentsByFiliere(filiereId: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users/filiere/${filiereId}`, { 
      headers: this.getAuthHeaders() 
    }).pipe(
      tap((students) => console.log(`Students of filiere ${filiereId} retrieved:`, students.length)),
      catchError(this.handleError),
    );
  }

  // Get students by group
  getStudentsByGroup(groupId: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users/group/${groupId}`, { 
      headers: this.getAuthHeaders() 
    }).pipe(
      tap((students) => console.log(`Students of group ${groupId} retrieved:`, students.length)),
      catchError(this.handleError),
    );
  }

  // Get student count by filiere
  getStudentsCountByFiliere(): Observable<FiliereCount[]> {
    return this.http.get<FiliereCount[]>(`${this.apiUrl}/users/count-by-filiere`, { 
      headers: this.getAuthHeaders() 
    }).pipe(
      tap((counts) => console.log("Student count by filiere retrieved:", counts)),
      catchError(this.handleError),
    );
  }

  // Get student count by specialty
  getStudentsCountBySpecialty(): Observable<any[]> {
    return this.http
      .get<any[]>(`${this.apiUrl}/users/count-by-specialty`, { 
        headers: this.getAuthHeaders() 
      })
      .pipe(catchError(this.handleError));
  }

  // Get available students (without assigned group)
  getAvailableStudents(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users/available`, { 
      headers: this.getAuthHeaders() 
    }).pipe(
      tap((students) => console.log("Available students retrieved:", students.length)),
      catchError(this.handleError),
    );
  }

  // Get students by filters
  getStudentsByFilters(department?: string, level?: string, specialty?: string, filiere?: string): Observable<User[]> {
    let params = new HttpParams();
    if (department) params = params.set("department", department);
    if (level) params = params.set("level", level);
    if (specialty) params = params.set("specialty", specialty);
    if (filiere) params = params.set("filiere", filiere);

    return this.http.get<User[]>(`${this.apiUrl}/users/filter`, { 
      headers: this.getAuthHeaders(), 
      params 
    }).pipe(
      tap((students) => console.log("Filtered students retrieved:", students.length)),
      catchError(this.handleError),
    );
  }

  // Remove a student from a group
  removeStudentFromGroup(studentId: string): Observable<User> {
    return this.http
      .put<User>(`${this.apiUrl}/users/${studentId}/remove-from-group`, {}, { 
        headers: this.getAuthHeaders() 
      })
      .pipe(
        tap((updatedUser) => {
          console.log(`Student ${studentId} removed from group`);
          
          // If this is the current user, update localStorage
          if (this.isCurrentUser(updatedUser)) {
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            this.currentUserSubject.next(updatedUser);
          }
        }),
        catchError(this.handleError),
      );
  }

  // Get basic HTTP headers
  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      "Content-Type": "application/json",
    });
  }

  // Get HTTP headers with authentication token
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    const headers = this.getHeaders();
    
    return token 
      ? headers.set('Authorization', `Bearer ${token}`)
      : headers;
  }

  // Error handling
  private handleError(error: HttpErrorResponse) {
    console.error("API Error:", error);

    let errorMessage = "An error occurred while communicating with the server.";

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error code: ${error.status}, Message: ${error.message}`;

      // Show more details if available
      if (error.error && typeof error.error === "object") {
        console.error("Error details:", error.error);
        if (error.error.message) {
          errorMessage = error.error.message;
        }
      }
    }

    return throwError(() => new Error(errorMessage));
  }
}