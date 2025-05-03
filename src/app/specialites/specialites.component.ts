import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DepartementsService } from '../departements.service';
import  { NiveauxService } from '../niveaux.service';
import { SpecialitesService } from '../specialites.service';
import { Stats } from '../stats.service';
import { UserService } from '../user.service'; // Ajout du service utilisateur

@Component({
  selector: 'app-specialites',
  templateUrl: './specialites.component.html',
  styleUrls: ['./specialites.component.css'],
})
export class SpecialitesComponent implements OnInit {
  // Propriétés pour le filtrage
  filteredDepartement: any = '';
  filteredNiveau: any = '';
  searchTerm: string = '';
  selectedDepartment: any = null;
  selectedLevel: any = null;

  // Propriétés pour la spécialité sélectionnée et les modals
  selectedSpecialite: any = null;
  showDetailModal: boolean = false;
  showForm: boolean = false;
  showDeleteConfirmation: boolean = false;
  specialiteToDelete: any = null;
  formMode: 'add' | 'edit' = 'add';

  // Statistiques utilisateurs
  userStats: any = { total: 0, growth: 0, chart: 0 };
  
  // Ajout d'une propriété pour stocker le nombre d'étudiants par spécialité
  studentsPerSpecialty: Map<string, number> = new Map();

  // Propriétés pour le formulaire
  specialiteForm: FormGroup;
  editSpecialiteData: any = {};

  // Propriétés pour stocker les données
  specialites: any[] = [];
  filteredSpecialites: any[] = [];
  departments: any[] = [];
  niveaux: any[] = [];

  // États de chargement et erreurs
  loading: boolean = false;
  loadingDepartments: boolean = false;
  loadingNiveaux: boolean = false;
  error: string = '';
  statsService: any;
  specialtyStats: any;
  departmentStats: any;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient ,
    private specialitesService: SpecialitesService,
    private departementsService: DepartementsService,
    private niveauxService: NiveauxService,
    private userService: UserService // Injection du service utilisateur
  ) {
    // Initialisation du formulaire
    this.specialiteForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(3)]],
      description: ['',],
      departement: ['', Validators.required],
      niveau: ['', Validators.required],
      couleur: ['#3498db'],
    });
  }

  ngOnInit(): void {
    // Charger les données au démarrage
    this.loadDepartments();
    this.loadNiveaux();
    this.loadSpecialites();
    this.loadStudentsCountPerSpecialty(); // Nouvelle méthode pour charger le nombre d'étudiants
    this.loadStatistics(); // Charger les statistiques globales
  }

  // Nouvelle méthode pour charger le nombre d'étudiants par spécialité
  loadStudentsCountPerSpecialty(): void {
    this.userService.getStudentsCountBySpecialty().subscribe({
      next: (data) => {
        console.log('Nombre d\'étudiants par spécialité:', data);
        
        // Stocker les données dans la Map
        this.studentsPerSpecialty.clear();
        data.forEach((item: any) => {
          this.studentsPerSpecialty.set(item.specialtyId, item.count);
        });
        
        // Mettre à jour les spécialités avec le nombre d'étudiants
        this.updateSpecialtiesWithStudentCount();
      },
      error: (err) => {
        console.error('Erreur lors du chargement du nombre d\'étudiants:', err);
        this.showNotification('Erreur lors du chargement du nombre d\'étudiants', true);
      }
    });
  }
  
  // Méthode pour mettre à jour les spécialités avec le nombre d'étudiants
  updateSpecialtiesWithStudentCount(): void {
    this.specialites = this.specialites.map(specialite => {
      const id = specialite.id || specialite._id;
      return {
        ...specialite,
        nbEtudiants: this.studentsPerSpecialty.get(id) || 0
      };
    });
    
    // Mettre à jour les spécialités filtrées également
    this.applyFilters();
  }

  // Méthode pour obtenir le nombre d'étudiants pour une spécialité
  getStudentCount(specialite: any): number {
    const id = specialite.id || specialite._id;
    return this.studentsPerSpecialty.get(id) || specialite.nbEtudiants || 0;
  }

  // Méthode pour afficher les notifications
  showNotification(message: string, isError: boolean = false): void {
    console.log(`${isError ? 'Erreur:' : 'Info:'} ${message}`);
    // Ici, vous pourriez implémenter une notification visuelle
  }

  // Méthode pour obtenir le nom du département
  getDepartementNom(departmentId: string): string {
    if (!departmentId) return 'N/A';
  
    // Si c'est un objet avec une propriété 'name' ou 'nom'
    if (typeof departmentId === 'object') {
      return (departmentId as { name?: string; nom?: string }).name || (departmentId as { name?: string; nom?: string }).nom || 'N/A';
    }
  
    // Si c'est un ID, cherchez le département correspondant
    if (this.departments && this.departments.length > 0) {
      const dept = this.departments.find(
        (d) => d.id === departmentId || d._id === departmentId
      );
      if (dept) {
        return dept.name || dept.nom || 'N/A';
      }
    }
  
    return 'N/A';
  }

  // Méthode pour obtenir le nom du niveau
  getNiveauNom(niveau: any): string {
    if (!niveau) return 'N/A';

    // Si c'est un objet avec une propriété 'name' ou 'nom'
    if (typeof niveau === 'object') {
      return niveau.name || niveau.nom || 'N/A';
    }

    // Si c'est un ID, cherchez le niveau correspondant
    if (this.niveaux && this.niveaux.length > 0) {
      const niv = this.niveaux.find(
        (n) => n.id === niveau || n._id === niveau
      );
      if (niv) {
        return niv.name || niv.nom || 'N/A';
      }
    }

    return 'N/A';
  }

  // Méthodes de chargement des données
  loadSpecialites(): void {
    this.loading = true;
    this.error = '';
  
    this.specialitesService.getSpecialites().subscribe({
      next: (data) => {
        console.log('Spécialités chargées:', data);
        this.specialites = (data || []).map((specialite: any) => {
          // Normaliser les données pour assurer la cohérence
          const normalizedSpecialite = {
            ...specialite,
            id: specialite.id || specialite._id,
            name: specialite.name || specialite.nom,
            nom: specialite.name || specialite.nom,
            department: specialite.department || specialite.departement,
            departement: specialite.department || specialite.departement,
            level: specialite.level || specialite.niveau,
            niveau: specialite.level || specialite.niveau,
            nbEtudiants: specialite.nbEtudiants || 0
          };
          
          return normalizedSpecialite;
        });
        
        // Si les données des étudiants sont déjà chargées, mettre à jour les spécialités
        if (this.studentsPerSpecialty.size > 0) {
          this.updateSpecialtiesWithStudentCount();
        }
        
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des spécialités:', err);
        this.error = 'Erreur lors du chargement des spécialités: ' + (err.message || 'Erreur inconnue');
        this.loading = false;
      },
    });
  }

  // Charger toutes les statistiques
  loadStatistics(): void {
    // Statistiques globales
    this.statsService.getStats().subscribe({
      next: (data: Stats) => {
        this.userStats = data.users;
        this.specialtyStats = data.specialties;
        this.departmentStats = data.departments;
      },
      error: (error: any) => {
        console.error("Erreur lors du chargement des statistiques:", error);
      },
    });
  }

  loadDepartments(): void {
    this.loadingDepartments = true;
    this.departementsService.getDepartements().subscribe({
      next: (data) => {
        console.log('Départements chargés:', data);
        this.departments = data || [];
        this.loadingDepartments = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des départements:', err);
        this.showNotification('Erreur lors du chargement des départements', true);
        this.loadingDepartments = false;
      },
    });
  }

  loadNiveaux(): void {
    this.loadingNiveaux = true;
    this.niveauxService.getNiveaux().subscribe({
      next: (data) => {
        console.log('Niveaux chargés:', data);
        this.niveaux = data || [];
        this.loadingNiveaux = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des niveaux:', err);
        this.showNotification('Erreur lors du chargement des niveaux', true);
        this.loadingNiveaux = false;
      },
    });
  }

  // Méthode pour appliquer les filtres
  applyFilters(): void {
    this.filteredSpecialites = this.specialites.filter((specialite) => {
      // Vérifier si le département correspond
      const matchesDepartment =
        !this.selectedDepartment ||
        specialite.department === this.selectedDepartment.id ||
        specialite.department === this.selectedDepartment._id;
  
      // Vérifier si le niveau correspond
      const matchesLevel =
        !this.selectedLevel ||
        specialite.level === this.selectedLevel.id ||
        specialite.level === this.selectedLevel._id;
  
      // Vérifier si le terme de recherche correspond
      const matchesSearchTerm =
        !this.searchTerm ||
        (specialite.name || specialite.nom)
          .toLowerCase()
          .includes(this.searchTerm.toLowerCase());
  
      return matchesDepartment && matchesLevel && matchesSearchTerm;
    });
  
    // Afficher un message si aucun résultat ne correspond
    if (this.filteredSpecialites.length === 0 && (this.selectedDepartment || this.selectedLevel || this.searchTerm)) {
      this.showNotification('Aucune spécialité ne correspond aux critères de recherche', false);
    }
  }

  resetFilters(): void {
    this.filteredDepartement = '';
    this.filteredNiveau = '';
    this.searchTerm = '';
    this.selectedDepartment = null;
    this.selectedLevel = null;
    this.filteredSpecialites = [...this.specialites];
  }

  // Méthodes pour la gestion des spécialités
  toggleAddForm(): void {
    this.newSpecialite();
  }

  selectSpecialite(specialite: any): void {
    this.selectedSpecialite = specialite;
    this.showDetailModal = true;
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
  }

  newSpecialite(): void {
    this.formMode = 'add';
    this.editSpecialiteData = {};
    this.specialiteForm.reset({
      couleur: '#3498db',
    });
    this.showForm = true;
  }

  editSpecialite(specialite: any): void {
    console.log('Editing specialite:', specialite);
    this.formMode = 'edit';
    this.editSpecialiteData = { ...specialite };

    // Trouver les objets complets pour département et niveau
    let departementObj = specialite.departement;
    if (typeof specialite.departement !== 'object' && this.departments.length > 0) {
      departementObj =
        this.departments.find(
          (d) => d.id === specialite.departement || d._id === specialite.departement
        ) || specialite.departement;
    }

    let niveauObj = specialite.niveau;
    if (typeof specialite.niveau !== 'object' && this.niveaux.length > 0) {
      niveauObj =
        this.niveaux.find(
          (n) => n.id === specialite.niveau || n._id === specialite.niveau
        ) || specialite.niveau;
    }

    // Patch le formulaire avec les valeurs correctes
    this.specialiteForm.patchValue({
      nom: specialite.name || specialite.nom,
      description: specialite.description,
      departement: departementObj,
      niveau: niveauObj,
      couleur: specialite.couleur || '#3498db',
    });

    this.showForm = true;
  }

  saveSpecialite(): void {
    if (this.specialiteForm.invalid) {
      console.log('Formulaire invalide:', this.specialiteForm.errors);
      return;
    }
  
    // Préparer les données à envoyer
    const formData: any = {
      name: this.specialiteForm.value.nom,
      departement: this.specialiteForm.value.departement,
      niveau: this.specialiteForm.value.niveau,
      description: this.specialiteForm.value.description || '',
      couleur: this.specialiteForm.value.couleur || '#3498db'
    };
  
    // Traiter le département
    if (typeof this.specialiteForm.value.departement === 'object' && this.specialiteForm.value.departement !== null) {
      formData.department = this.specialiteForm.value.departement.id || this.specialiteForm.value.departement._id;
    } else {
      formData.department = this.specialiteForm.value.departement;
    }
  
    // Traiter le niveau
    if (typeof this.specialiteForm.value.niveau === 'object' && this.specialiteForm.value.niveau !== null) {
      formData.level = this.specialiteForm.value.niveau.id || this.specialiteForm.value.niveau._id;
    } else {
      formData.level = this.specialiteForm.value.niveau;
    }
  
    console.log('Données préparées pour l\'envoi:', formData);
  
    if (this.formMode === 'add') {
      // Ajouter une nouvelle spécialité
      this.specialitesService.addSpecialite(formData).subscribe({
        next: (response) => {
          console.log('Réponse après ajout:', response);
          // Normaliser la réponse
          const newSpecialite = {
            ...response,
            id: response.id || response._id,
            name: response.name,
            nom: response.name,
            department: response.department,
            departement: response.department,
            level: response.level,
            niveau: response.level,
            nbEtudiants: 0
          };
          
          this.specialites.push(newSpecialite);
          this.showForm = false;
          this.applyFilters();
          this.showNotification('Spécialité ajoutée avec succès');
        },
        error: (err) => {
          console.error('Erreur détaillée lors de l\'ajout:', err);
          this.showNotification(`Erreur lors de l'ajout: ${err.error?.message || err.message || 'Erreur inconnue'}`, true);
        }
      });
    } else {
      // Mettre à jour une spécialité existante
      const id = this.editSpecialiteData.id || this.editSpecialiteData._id;
      
      this.specialitesService.updateSpecialite(id, formData).subscribe({
        next: (response) => {
          console.log('Réponse après mise à jour:', response);
          // Normaliser la réponse
          const updatedSpecialite = {
            ...response,
            id: response.id || response._id,
            name: response.name,
            nom: response.name,
            department: response.department,
            departement: response.department,
            level: response.level,
            niveau: response.level,
            nbEtudiants: this.editSpecialiteData.nbEtudiants || 0
          };
          
          const index = this.specialites.findIndex(s => 
            (s.id === id || s._id === id)
          );
          
          if (index !== -1) {
            this.specialites[index] = updatedSpecialite;
            
            if (this.selectedSpecialite && 
                (this.selectedSpecialite.id === id || this.selectedSpecialite._id === id)) {
              this.selectedSpecialite = {...updatedSpecialite};
            }
          }
          
          this.showForm = false;
          this.applyFilters();
          this.showNotification('Spécialité mise à jour avec succès');
        },
        error: (err) => {
          console.error('Erreur détaillée lors de la mise à jour:', err);
          this.showNotification(`Erreur lors de la mise à jour: ${err.error?.message || err.message || 'Erreur inconnue'}`, true);
        }
      });
    }
  }

  cancelForm(): void {
    this.showForm = false;
  }

 // Supprimer une spécialité
 confirmDelete(specialite: any) {
  if (confirm(`Voulez-vous vraiment supprimer la spécialité ${specialite.name} ?`)) {
    this.deleteSpecialite(specialite._id);
  }
}
deleteSpecialite(specialiteId: string): void {
  console.log('Tentative de suppression de l\'ID:', specialiteId.trim());
  
  this.http.delete(`http://localhost:5000/api/specialites/${encodeURIComponent(specialiteId)}`, { responseType: 'text' })
    .subscribe({
      next: (response) => {
        console.log('Spécialité supprimée', response);
        // Refresh your specialites list here
        this.loadSpecialites(); // Or whatever method you use to reload the data
      },
      error: (error) => {
        console.error('Erreur lors de la suppression', error);
      }
    });
}



updateSpecialite(specialiteId: string, specialiteData: any): void {
  // Remarquez que "update/" est supprimé de l'URL
  this.http.put<any>(
    `http://localhost:5000/api/specialites/${encodeURIComponent(specialiteId)}`, 
    specialiteData
  ).subscribe({
    next: (response) => {
      console.log('Spécialité mise à jour avec succès', response);
      // Rafraîchir la liste des spécialités
      this.loadSpecialites();
    },
    error: (error) => {
      console.error('Erreur détaillée lors de la mise à jour:', error);
      // Afficher plus de détails sur l'erreur
      console.error('Erreur:', error.message);
    }
  });
}


  // Méthode pour comparer les objets dans les sélecteurs
  compareObjects(o1: any, o2: any): boolean {
    if (!o1 || !o2) return o1 === o2;

    // Compare IDs if objects
    if (typeof o1 === 'object' && typeof o2 === 'object') {
      const id1 = o1.id || o1._id;
      const id2 = o2.id || o2._id;
      return id1 === id2;
    }

    // Direct comparison if one is ID and other is object
    if (typeof o1 === 'object') {
      return o1.id === o2 || o1._id === o2;
    }

    if (typeof o2 === 'object') {
      return o2.id === o1 || o2._id === o1;
    }

    // Direct comparison if both are IDs
    return o1 === o2;
  }
  // Ajouter cette méthode pour gérer le changement de département
onDepartmentChange(event: any): void {
  const departmentId = event.target ? event.target.value : (event.id || event._id);
  
  if (!departmentId) {
    // Si aucun département n'est sélectionné, charger tous les niveaux
    this.loadNiveaux();
    return;
  }
  
  console.log(`Département sélectionné: ${departmentId}`);
  this.loadingNiveaux = true;
  
  // Charger les niveaux pour ce département
  this.niveauxService.getNiveauxByDepartement(departmentId).subscribe({
    next: (data) => {
      console.log('Niveaux chargés pour le département:', data);
      this.niveaux = data || [];
      this.loadingNiveaux = false;
      
      // Réinitialiser le niveau sélectionné
      this.selectedLevel = null;
      this.filteredNiveau = '';
      
      // Appliquer les filtres
      this.applyFilters();
    },
    error: (err) => {
      console.error('Erreur lors du chargement des niveaux par département:', err);
      this.showNotification('Erreur lors du chargement des niveaux', true);
      this.loadingNiveaux = false;
    },
  });
}
}