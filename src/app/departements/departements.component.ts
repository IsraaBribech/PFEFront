import { Component, OnInit } from '@angular/core';
import { DepartementsService } from '../departements.service';
import { SpecialitesService } from '../specialites.service';
import { NiveauxService } from '../niveaux.service';
import { EnseignantService } from '../enseignant.service';
import { UserService } from '../user.service';
import { forkJoin, catchError, of } from 'rxjs';
import { MatSnackBar } from "@angular/material/snack-bar";

// Interfaces
interface Departement {
  _id?: string;
  id?: string;
  nom?: string;
  name?: string;
  description: string;
  couleur?: string;
  chefDepartement?: string;
  emailChef?: string;
  dateCreation?: Date;
  nbEtudiants?: number;
  nbEnseignants?: number;
  specialites?: Specialite[];
  niveaux?: Niveau[];
}

interface Specialite {
  _id?: string;
  id?: string;
  nom?: string;
  name?: string;
  description: string;
  departementId?: string;
  department?: string;
}

interface Niveau {
  _id?: string;
  id?: string;
  nom?: string;
  name?: string;
  specialiteId?: string;
}

interface User {
  _id?: string;
  id?: string;
  nom?: string;
  name?: string;
  prenom?: string;
  role: 'etudiant' | 'enseignant' | 'admin';
  departementId?: string;
  department?: string;
  specialiteId?: string;
  specialty?: string;
  niveauId?: string;
  level?: string;
}

@Component({
  selector: 'app-departements',
  templateUrl: './departements.component.html',
  styleUrls: ['./departements.component.css']
})
export class DepartementsComponent implements OnInit {
  // Propriétés
  departements: Departement[] = [];
  specialites: Specialite[] = [];
  niveaux: Niveau[] = [];
  utilisateurs: User[] = [];
  enseignants: any[] = [];
  filteredDepartements: Departement[] = [];
  isLoading = true;
  loadingError = false;
  errorMessage = '';
  
  showEditForm = false;
  editingDepartement: any = {};

  selectedDepartement: Departement | null = null;
  showAddForm = false;
  newDepartement = {
    nom: '',
    description: '',
    couleur: '#3498db',
    chefDepartement: '',
    emailChef: '',
    dateCreation: new Date()
  };

  constructor(
    private departementsService: DepartementsService,
    private specialitesService: SpecialitesService,
    private niveauxService: NiveauxService,
    private userService: UserService,
    private enseignantService: EnseignantService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    this.isLoading = true;
    this.loadingError = false;
    this.errorMessage = '';


    
    
    // Charger toutes les données avec forkJoin
    forkJoin({
      departements: this.departementsService.getDepartements().pipe(catchError(err => {
        console.error('Erreur lors du chargement des départements:', err);
        return of([]);
      })),
      specialites: this.specialitesService.getSpecialites().pipe(catchError(err => {
        console.error('Erreur lors du chargement des spécialités:', err);
        return of([]);
      })),
      niveaux: this.niveauxService.getNiveaux().pipe(catchError(err => {
        console.error('Erreur lors du chargement des niveaux:', err);
        return of([]);
      })),
      utilisateurs: this.userService.getUsers().pipe(catchError(err => {
        console.error('Erreur lors du chargement des utilisateurs:', err);
        return of([]);
      })),
      enseignants: this.enseignantService.getAllEnseignants().pipe(catchError(err => {
        console.error('Erreur lors du chargement des enseignants:', err);
        return of([]);
      }))
    }).subscribe({
      next: data => {
        console.log('Données chargées:', data);
        
        // Normaliser les données des départements
        this.departements = data.departements.map((dept: any) => this.normalizeDepartement(dept));
        
        // Normaliser les données des spécialités
        this.specialites = data.specialites.map((spec: any) => this.normalizeSpecialite(spec));
        
        // Normaliser les données des niveaux
        this.niveaux = data.niveaux.map(niv => this.normalizeNiveau(niv));
        
        // Normaliser les données des utilisateurs
        this.utilisateurs = data.utilisateurs.map(user => this.normalizeUser(user));
        
        // Stocker les enseignants
        this.enseignants = data.enseignants;
        
        // Enrichir les départements avec des données supplémentaires
        this.enrichDepartements();
        this.isLoading = false;
      },
      error: err => {
        console.error('Erreur lors du chargement des données:', err);
        this.isLoading = false;
        this.loadingError = true;
        this.errorMessage = err.message || 'Erreur lors du chargement des données';
        this.showNotification(this.errorMessage, 'error');
      }
    });
  }

  // Normaliser les données des départements pour gérer les différences de structure
  normalizeDepartement(dept: any): Departement {
    return {
      id: dept._id || dept.id,
      nom: dept.nom || dept.name,
      description: dept.description || '',
      couleur: dept.couleur || '#3498db',
      chefDepartement: dept.chefDepartement || '',
      emailChef: dept.emailChef || '',
      dateCreation: dept.dateCreation ? new Date(dept.dateCreation) : new Date()
    };
  }

  // Normaliser les données des spécialités
  normalizeSpecialite(spec: any): Specialite {
    return {
      id: spec._id || spec.id,
      nom: spec.nom || spec.name,
      description: spec.description || '',
      departementId: spec.departementId || spec.department
    };
  }

  // Normaliser les données des niveaux
  normalizeNiveau(niv: any): Niveau {
    return {
      id: niv._id || niv.id,
      nom: niv.nom || niv.name,
      specialiteId: niv.specialiteId
    };
  }

  // Normaliser les données des utilisateurs
  normalizeUser(user: any): User {
    return {
      id: user._id || user.id,
      nom: user.nom || user.name,
      prenom: user.prenom || '',
      role: user.role || 'etudiant',
      departementId: user.departementId || user.department,
      specialiteId: user.specialiteId || user.specialty,
      niveauId: user.niveauId || user.level
    };
  }

  enrichDepartements(): void {
    this.departements.forEach(departement => {
      // Filtrer les spécialités de ce département
      departement.specialites = this.specialites.filter(s => 
        s.departementId === departement.id || 
        s.department === departement.id
      );
      
      // Compter les étudiants du département (role = 'etudiant')
      departement.nbEtudiants = this.utilisateurs.filter(u => 
        u.role === 'etudiant' && 
        (u.departementId === departement.id || u.department === departement.id)
      ).length;
      
      // Compter les enseignants du département
      departement.nbEnseignants = this.enseignants.filter(e => 
        e.department === departement.id || e.departement === departement.id
      ).length;
      
      // Récupérer les niveaux disponibles dans ce département
      const specialiteIds = departement.specialites?.map(s => s.id) || [];
      departement.niveaux = this.niveaux.filter(n => 
        specialiteIds.includes(n.specialiteId)
      );
    });
    
    // Appliquer un tri par nom de département
    this.departements.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
    
    // Mettre à jour la liste filtrée
    this.filteredDepartements = [...this.departements];
    
    console.log('Départements enrichis:', this.departements);
  }

  closeModalOnOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.toggleAddForm();
    }
  }

  selectDepartement(departement: Departement): void {
    console.log('Département sélectionné:', departement);
    this.selectedDepartement = departement;
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    
    // Réinitialiser le formulaire si on le ferme
    if (!this.showAddForm) {
      this.newDepartement = {
        nom: '',
        description: '',
        couleur: '#3498db',
        chefDepartement: '',
        emailChef: '',
        dateCreation: new Date()
      };
    }
  }

  editDepartement(departement: Departement): void {
    console.log('Édition du département:', departement);
    
    // Créer une copie pour éviter de modifier directement l'objet
    this.editingDepartement = {
      id: departement.id,
      nom: departement.nom,
      description: departement.description,
      couleur: departement.couleur || '#3498db',
      chefDepartement: departement.chefDepartement || '',
      emailChef: departement.emailChef || '',
      dateCreation: departement.dateCreation || new Date()
    };
    
    this.showEditForm = true;
  }

  toggleEditForm(): void {
    this.showEditForm = !this.showEditForm;
    
    // Réinitialiser le formulaire si on le ferme
    if (!this.showEditForm) {
      this.editingDepartement = {};
    }
  }

  updateDepartement(): void {
    console.log('Mise à jour du département:', this.editingDepartement);
    
    if (!this.editingDepartement.id) {
      this.showNotification('ID du département manquant pour la mise à jour', 'error');
      return;
    }
    
    // Préparer les données à envoyer au serveur
    const departementData = {
      name: this.editingDepartement.nom,
      description: this.editingDepartement.description,
      couleur: this.editingDepartement.couleur,
      chefDepartement: this.editingDepartement.chefDepartement,
      emailChef: this.editingDepartement.emailChef,
      dateCreation: this.editingDepartement.dateCreation
    };
    
    this.departementsService.updateDepartement(this.editingDepartement.id, departementData)
      .subscribe({
        next: (response) => {
          console.log('Réponse de mise à jour:', response);
          
          // Mettre à jour le département dans la liste
          const index = this.departements.findIndex(d => d.id === this.editingDepartement.id);
          if (index !== -1) {
            // Normaliser les données reçues
            const updatedDept = this.normalizeDepartement(
              response.departement || response
            );
            
            this.departements[index] = updatedDept;
            
            // Mettre à jour le département sélectionné si c'est celui qui a été modifié
            if (this.selectedDepartement && this.selectedDepartement.id === updatedDept.id) {
              this.selectedDepartement = updatedDept;
            }
          }
          
          this.showEditForm = false;
          this.showNotification('Département mis à jour avec succès', 'success');
          
          // Recharger les données pour s'assurer que tout est à jour
          this.loadAllData();
        },
        error: (err) => {
          console.error('Erreur lors de la mise à jour du département:', err);
          this.showNotification(
            err.message || 'Erreur lors de la mise à jour du département', 
            'error'
          );
        }
      });
  }

  addDepartement(): void {
    console.log('Ajout d\'un nouveau département:', this.newDepartement);
    
    // Vérifier que les champs obligatoires sont remplis
    if (!this.newDepartement.nom) {
      this.showNotification('Le nom du département est obligatoire', 'error');
      return;
    }
    
    // Préparer les données à envoyer au serveur
    const departementData = {
      name: this.newDepartement.nom,
      description: this.newDepartement.description,
      couleur: this.newDepartement.couleur,
      chefDepartement: this.newDepartement.chefDepartement,
      emailChef: this.newDepartement.emailChef,
      dateCreation: this.newDepartement.dateCreation
    };
    
    this.departementsService.addDepartement(departementData)
      .subscribe({
        next: (response) => {
          console.log('Réponse d\'ajout:', response);
          
          // Normaliser les données reçues
          const newDept = this.normalizeDepartement(
            response.departement || response
          );
          
          // Ajouter le nouveau département à la liste
          this.departements.push({
            ...newDept,
            specialites: [],
            nbEtudiants: 0,
            nbEnseignants: 0,
            niveaux: []
          });
          
          // Mettre à jour la liste filtrée
          this.filteredDepartements = [...this.departements];
          
          // Réinitialiser le formulaire
          this.newDepartement = {
            nom: '',
            description: '',
            couleur: '#3498db',
            chefDepartement: '',
            emailChef: '',
            dateCreation: new Date()
          };
          
          this.showAddForm = false;
          this.showNotification('Département ajouté avec succès', 'success');
          
          // Recharger les données pour s'assurer que tout est à jour
          this.loadAllData();
        },
        error: (err) => {
          console.error('Erreur lors de l\'ajout du département:', err);
          this.showNotification(
            err.message || 'Erreur lors de l\'ajout du département', 
            'error'
          );
        }
      });
  }

  deleteDepartement(id: string): void {
    console.log('Suppression du département:', id);
    
    const confirmation = confirm('Êtes-vous sûr de vouloir supprimer ce département?');
    
    if (confirmation) {
      this.departementsService.deleteDepartement(id)
        .subscribe({
          next: () => {
            // Supprimer le département de la liste
            this.departements = this.departements.filter(dep => dep.id !== id);
            
            // Mettre à jour la liste filtrée
            this.filteredDepartements = [...this.departements];
            
            // Réinitialiser le département sélectionné s'il a été supprimé
            if (this.selectedDepartement && this.selectedDepartement.id === id) {
              this.selectedDepartement = null;
            }
            
            this.showNotification('Département supprimé avec succès', 'success');
          },
          error: (err) => {
            console.error('Erreur lors de la suppression du département:', err);
            this.showNotification(
              err.message || 'Erreur lors de la suppression du département', 
              'error'
            );
          }
        });
    }
  }

  // Méthode de notification utilisant MatSnackBar
  private showNotification(message: string, type: string = 'success'): void {
    console.log(`[${type}] ${message}`);
    
    // Configuration du SnackBar
    const duration = 3000; // 3 secondes
    const panelClass = type === 'error' ? ['snackbar-error'] : ['snackbar-success'];
    
    // Afficher la notification avec MatSnackBar
    this.snackBar.open(message, 'Fermer', {
      duration: duration,
      panelClass: panelClass,
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }

  // Méthodes pour compter les étudiants par spécialité et niveau
  getStudentCountBySpecialite(specialiteId: string): number {
    return this.utilisateurs.filter(u => 
      u.role === 'etudiant' && 
      (u.specialiteId === specialiteId || u.specialty === specialiteId)
    ).length;
  }

  getStudentCountByNiveau(niveauId: string): number {
    return this.utilisateurs.filter(u => 
      u.role === 'etudiant' && 
      (u.niveauId === niveauId || u.level === niveauId)
    ).length;
  }

  // Méthode pour obtenir les niveaux d'une spécialité
  getNiveauxBySpecialite(specialiteId: string): Niveau[] {
    return this.niveaux.filter(n => n.specialiteId === specialiteId);
  }

  // Méthode pour compter les enseignants par spécialité
  getTeacherCountBySpecialite(specialiteId: string): number {
    return this.enseignants.filter(e => 
      e.specialite === specialiteId || e.specialty === specialiteId
    ).length;
  }

  // Improved version
getTotalNiveaux(departement: Departement): number {
  // Debug logging
  console.log('Department:', departement);
  console.log('Specialites:', departement.specialites);
  console.log('Niveaux array:', this.niveaux);
  
  if (!departement || !departement.specialites || departement.specialites.length === 0) {
    console.log('No specialties found');
    return 0;
  }
  
  const specialiteIds = departement.specialites.map(s => s.id);
  console.log('Specialite IDs:', specialiteIds);
  
  const filteredNiveaux = this.niveaux.filter(n => specialiteIds.includes(n.specialiteId));
  console.log('Filtered niveaux:', filteredNiveaux);
  
  return filteredNiveaux.length;
}

  // Méthode pour éclaircir une couleur (utilisée pour les dégradés)
  lightenColor(color: string, percent: number): string {
    if (!color || !color.startsWith('#')) {
      return '#3498db'; // Couleur par défaut
    }
    
    // Convertir la couleur hexadécimale en RGB
    let r = parseInt(color.slice(1, 3), 16);
    let g = parseInt(color.slice(3, 5), 16);
    let b = parseInt(color.slice(5, 7), 16);

    // Éclaircir les valeurs
    r = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
    g = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
    b = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));

    // Convertir en hexadécimal
    const rHex = r.toString(16).padStart(2, '0');
    const gHex = g.toString(16).padStart(2, '0');
    const bHex = b.toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
  }
}