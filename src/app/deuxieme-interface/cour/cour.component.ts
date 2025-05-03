import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, Observable, of } from 'rxjs';
import { ChapitreService } from './../../chapitre.service';
import { CoursService } from './../../cours.service';
import { SpecialitesService } from './../../specialites.service';
import { NiveauxService } from './../../niveaux.service';
import { DepartementsService } from './../../departements.service';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-cour',
  templateUrl: './cour.component.html',
  styleUrls: ['./cour.component.css'],
  animations: [
    trigger('submenuAnimation', [
      state('void', style({
        height: '0',
        opacity: '0',
        transform: 'translateY(-10px)',
        overflow: 'hidden'
      })),
      state('*', style({
        height: '*',
        opacity: '1',
        transform: 'translateY(0)',
        overflow: 'hidden'
      })),
      transition('void => *', [
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)')
      ]),
      transition('* => void', [
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)')
      ])
    ])
  ]
})
export class CourComponent implements OnInit {
matiere: any;
onFileChange($event: Event) {
throw new Error('Method not implemented.');
}
  // Paramètres de la route
  matiereId: string = '';
  semestre: number = 1;

  // Données de la matière actuelle
  currentMatiere: any = null;

  // Liste des chapitres
  chapitres: any[] = [];
  filteredChapitres: any[] = [];

  // Formulaire pour les chapitres
  chapitreForm!: FormGroup;
  editChapitreForm!: FormGroup;

  // État de chargement
  isLoading: boolean = false;
  isLoadingChapitres: boolean = false;

  // Modals
  showAddChapitreModal: boolean = false;
  showEditChapitreModal: boolean = false;
  showDeleteChapitreModal: boolean = false;
  chapitreToEdit: any = null;
  chapitreToDelete: any = null;
  
  // Propriétés pour le template HTML
  activeModal: string | null = null;
  selectedChapitre: any = null;
  enseignantName: string = 'Israa Bribech';
  enseignantEmail: string = 'israabribech2002@gmail.com';
  showCourSubmenu: boolean = false;
  showSemestreSubmenu: { [key: number]: boolean } = { 1: false, 2: false };

  // Fichier pour le chapitre
  chapitreFile: File | null = null;
  editChapitreFile: File | null = null;

  // Recherche et filtrage
  searchTerm: string = '';
  filterType: string = 'all';

  // Données pour les formulaires
  departements: any[] = [];
  niveaux: any[] = [];
  specialites: any[] = [];
  cours: any[] = [];
  matieresSemestre1: any[] = [];
  matieresSemestre2: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private chapitreService: ChapitreService,
    private coursService: CoursService,
    private specialitesService: SpecialitesService,
    private niveauxService: NiveauxService,
    private departementsService: DepartementsService
  ) { }

 
// Dans la méthode ngOnInit, assurez-vous de charger les cours dès le démarrage
ngOnInit(): void {
  this.initForms();
  
  // D'abord charger toutes les données de référence
  this.loadAllData().then(() => {
    // Puis charger les paramètres de la route et les données spécifiques
    this.loadRouteParams();
    
    // Charger explicitement les cours pour les deux semestres
    this.loadCoursBySemestre(1);
    this.loadCoursBySemestre(2);
  });
}

// Méthode améliorée pour charger les cours par semestre
loadCoursBySemestre(semestre: number): void {
  this.isLoading = true;
  console.log(`Chargement des cours pour le semestre ${semestre}...`);

  // Utiliser le service pour obtenir tous les cours
  this.coursService.getAllCours().subscribe({
    next: (cours) => {
      // Filtrer les cours par le semestre spécifié
      const filteredCours = cours.filter((c) => {
        // Vérifier si semestre est un nombre ou une chaîne
        if (typeof c.semestre === 'string') {
          return c.semestre === semestre.toString();
        } else {
          return c.semestre === semestre;
        }
      });

      console.log(`Loaded ${filteredCours.length} courses for semester ${semestre}`);

      // Mapper les cours filtrés en objets matière avec des informations détaillées
      const matieres = filteredCours.map((c) => {
        return {
          id: c._id,
          nom: c.titre || "Sans titre",
          departement: this.getDepartementName(c.departement || ""),
          niveau: this.getNiveauName(c.niveau || ""),
          type: this.getCoursType(c),
          heures: c.heures || (c.heure ? c.heure.toString() : "")
        };
      });

      // Mettre à jour les cours du semestre approprié
      if (semestre === 1) {
        this.matieresSemestre1 = matieres;
      } else if (semestre === 2) {
        this.matieresSemestre2 = matieres;
      }

      this.isLoading = false;
    },
    error: (error) => {
      console.error(`Error loading courses for semester ${semestre}:`, error);
      this.showNotification(`Erreur lors du chargement des cours pour le semestre ${semestre}`, "OK");
      this.isLoading = false;

      // Utiliser des données de secours si disponibles
      if (semestre === 1 || semestre === 2) {
        this.setupFallbackData();
      }
    },
  });
}



  
  // Modifiez loadAllData pour retourner une Promise
  loadAllData(): Promise<void> {
    this.isLoading = true;
    
    return new Promise<void>((resolve) => {
      // Utiliser forkJoin pour charger toutes les données en parallèle
      forkJoin({
        cours: this.coursService.getAllCours(),
        departements: this.departementsService.getDepartements(),
        niveaux: this.niveauxService.getNiveaux(),
        specialites: this.specialitesService.getSpecialites()
      }).subscribe({
        next: (results) => {
          // Stocker les données récupérées
          this.cours = results.cours;
          this.departements = results.departements;
          this.niveaux = results.niveaux;
          this.specialites = results.specialites;
  
          console.log('Départements chargés:', this.departements);
          console.log('Niveaux chargés:', this.niveaux);
  
          // Filtrer les cours par semestre
          this.filterCoursBySemestre();
  
          this.isLoading = false;
          resolve();
        },
        error: (error: any) => {
          console.error('Erreur lors du chargement des données:', error);
          this.showNotification('Erreur lors du chargement des données', 'OK');
          this.isLoading = false;
  
          // Utiliser des données statiques en cas d'erreur
          this.setupFallbackData();
          resolve();
        }
      });
    });
  }


// Initialiser les formulaires
initForms(): void {
  this.chapitreForm = this.fb.group({
    titre: ['', Validators.required],
    numero: ['', [Validators.required, Validators.min(1)]],
    description: ['', Validators.required],
    nombreSeances: ['', [Validators.required, Validators.min(1)]],
    lienClassroom: [''], // Changed from lienMeet to lienClassroom
    contientQuiz: [false],
    contientDevoir: [false],
    fichier: [''],
    fichierNom: [''],
    fichierPath: [''],
    courId: ['', Validators.required],
    semestre: ['1', Validators.required],
    enseignantId: ['67c4c2f07fe25e5361a1e1bf'] // ID de l'enseignant connecté
  });

  this.editChapitreForm = this.fb.group({
    _id: [''],
    titre: ['', Validators.required],
    numero: ['', [Validators.required, Validators.min(1)]],
    description: ['', Validators.required],
    nombreSeances: ['', [Validators.required, Validators.min(1)]],
    lienClassroom: [''], // Changed from lienMeet to lienClassroom
    contientQuiz: [false],
    contientDevoir: [false],
    fichier: [''],
    fichierNom: [''],
    fichierPath: [''],
    courId: ['', Validators.required],
    semestre: ['1', Validators.required],
    enseignantId: ['67c4c2f07fe25e5361a1e1bf'] // ID de l'enseignant connecté
  });
}

  // Charger les paramètres de la route
  loadRouteParams(): void {
    this.route.queryParams.subscribe(params => {
      this.matiereId = params['matiereId'] || '';
      this.semestre = Number(params['semestre']) || 1;

      if (this.matiereId) {
        this.loadMatiereDetails(this.matiereId);
        this.loadChapitres();
      } else {
        this.showNotification('ID de matière manquant', 'Fermer');
        this.router.navigate(['/dashboard']);
      }
    });
  }

 

// Modifiez la méthode loadMatiereDetails pour ajouter des logs et gérer les cas où les données ne sont pas encore chargées
loadMatiereDetails(matiereId: string): void {
  this.isLoading = true;
  console.log(`Chargement des détails de la matière ${matiereId}...`);

  this.coursService.getCoursById(matiereId).subscribe({
    next: (data) => {
      if (data) {
        console.log('Données de matière reçues:', data);
        console.log('Département ID:', data.departement);
        console.log('Niveau ID:', data.niveau);
        console.log('Départements disponibles:', this.departements);
        console.log('Niveaux disponibles:', this.niveaux);
        
        // Vérifier si les départements et niveaux sont chargés
        if (this.departements.length === 0 || this.niveaux.length === 0) {
          console.log('Départements ou niveaux non chargés, utilisation de valeurs par défaut');
        }
        
        this.currentMatiere = {
          id: data._id,
          nom: data.titre || "Sans titre",
          departement: this.getDepartementName(data.departement || ""),
          niveau: this.getNiveauName(data.niveau || ""),
          type: this.getCoursType(data),
        };
        console.log('Matière formatée:', this.currentMatiere);
      }
      this.isLoading = false;
    },
    error: (error: any) => {
      console.error('Erreur lors du chargement des détails de la matière:', error);
      this.showNotification('Erreur lors du chargement des détails de la matière', 'OK');
      this.isLoading = false;

      // Utiliser des données statiques en cas d'erreur
      this.currentMatiere = {
        id: matiereId,
        nom: 'Matière non trouvée',
        departement: 'Inconnu',
        niveau: 'Inconnu',
        type: 'Cours'
      };
    }
  });
}

// Charger les chapitres de la matière
loadChapitres(): void {
  this.isLoadingChapitres = true;
  console.log(`Chargement des chapitres pour la matière ${this.matiereId} et le semestre ${this.semestre}...`);

  // Use the semestre number directly
  this.chapitreService.getChapitres({
    courId: this.matiereId,
    semestre: this.semestre, // Use number directly
    contientQuiz: undefined
  }).subscribe({
    next: (data) => {
      this.chapitres = data;
      this.filteredChapitres = [...this.chapitres];
      console.log(`${this.chapitres.length} chapitres chargés`);
      this.isLoadingChapitres = false;
    },
    error: (error: any) => {
      console.error('Erreur lors du chargement des chapitres:', error);
      this.showNotification('Erreur lors du chargement des chapitres', 'OK');
      this.isLoadingChapitres = false;

      // Utiliser des données statiques en cas d'erreur
      this.setupFallbackChapitres();
    }
  });
}

// Convertir le numéro de semestre en format attendu par l'API
convertToSemestreFormat(semestre: number): string {
  return semestre.toString(); // Just return the number as string, not S1 format
}

  // Filtrer les cours par semestre
  filterCoursBySemestre(): void {
    console.log('Filtrage des cours par semestre...');
    
    // Pour le semestre 1 (S1)
    this.matieresSemestre1 = this.cours
      .filter((c) => {
        const semestreStr = this.convertToSemestreFormat(1);
        const match = c.semestre === semestreStr;
        return match;
      })
      .map((c) => {
        return {
          id: c._id,
          nom: c.titre || "Sans titre",
          departement: this.getDepartementName(c.departement || ""),
          niveau: this.getNiveauName(c.niveau || ""),
          type: this.getCoursType(c),
        };
      });

    // Pour le semestre 2 (S2)
    this.matieresSemestre2 = this.cours
      .filter((c) => {
        const semestreStr = this.convertToSemestreFormat(2);
        const match = c.semestre === semestreStr;
        return match;
      })
      .map((c) => {
        return {
          id: c._id,
          nom: c.titre || "Sans titre",
          departement: this.getDepartementName(c.departement || ""),
          niveau: this.getNiveauName(c.niveau || ""),
          type: this.getCoursType(c),
        };
      });

    console.log(`Filtered ${this.matieresSemestre1.length} courses for semester 1 (S1)`);
    console.log(`Filtered ${this.matieresSemestre2.length} courses for semester 2 (S2)`);
  }

  // Configurer des données de secours en cas d'erreur
  setupFallbackData(): void {
    // Données de secours pour les départements, niveaux, spécialités
    this.departements = [
      { _id: '1', name: 'Informatique' },
      { _id: '2', name: 'Gestion' },
      { _id: '3', name: 'Finance' }
    ];

    this.niveaux = [
      { _id: '1', name: 'Licence 1' },
      { _id: '2', name: 'Licence 2' },
      { _id: '3', name: 'Licence 3' },
      { _id: '4', name: 'Master 1' },
      { _id: '5', name: 'Master 2' }
    ];

    this.specialites = [
      { _id: '1', name: 'Développement Web', departement: '1', niveau: '3' },
      { _id: '2', name: 'Réseaux', departement: '1', niveau: '4' },
      { _id: '3', name: 'Comptabilité', departement: '2', niveau: '2' },
      { _id: '4', name: 'Marketing', departement: '2', niveau: '3' },
      { _id: '5', name: 'Banque', departement: '3', niveau: '5' }
    ];

    // Données de secours pour les cours
    this.cours = [
      {
        _id: '1',
        titre: 'Programmation Web',
        departement: '1',
        niveau: '3',
        semestre: 'S1',
        type: 'Cours'
      },
      {
        _id: '2',
        titre: 'Bases de données',
        departement: '1',
        niveau: '2',
        semestre: 'S1',
        type: 'TD'
      },
      {
        _id: '3',
        titre: 'Algorithmes',
        departement: '1',
        niveau: '1',
        semestre: 'S1',
        type: 'TP'
      },
      {
        _id: '4',
        titre: 'Comptabilité',
        departement: '2',
        niveau: '2',
        semestre: 'S1',
        type: 'Cours'
      },
      {
        _id: '5',
        titre: 'Développement Mobile',
        departement: '1',
        niveau: '3',
        semestre: 'S2',
        type: 'Cours'
      },
      {
        _id: '6',
        titre: 'Intelligence Artificielle',
        departement: '1',
        niveau: '4',
        semestre: 'S2',
        type: 'TD'
      },
      {
        _id: '7',
        titre: 'Réseaux',
        departement: '1',
        niveau: '2',
        semestre: 'S2',
        type: 'TP'
      },
      {
        _id: '8',
        titre: 'Marketing Digital',
        departement: '2',
        niveau: '3',
        semestre: 'S2',
        type: 'Cours'
      }
    ];

    // Filtrer les cours par semestre
    this.filterCoursBySemestre();
  }

  // Configurer des données de secours pour les chapitres
  setupFallbackChapitres(): void {
    this.chapitres = [
      {
        _id: '1',
        titre: 'Introduction à la programmation web',
        numero: 1,
        description: 'Présentation des concepts de base du web',
        nombreSeances: 2,
        lienMeet: 'https://meet.google.com/abc-defg-hij',
        contientQuiz: true,
        contientDevoir: false,
        fichierNom: 'intro_web.pdf',
        fichierPath: '/assets/files/intro_web.pdf',
        courId: this.matiereId,
        semestre: this.convertToSemestreFormat(this.semestre),
        enseignantId: '67c4c2f07fe25e5361a1e1bf',
        dateCreation: new Date()
      },
      {
        _id: '2',
        titre: 'HTML et CSS',
        numero: 2,
        description: 'Les bases du HTML et CSS pour créer des pages web',
        nombreSeances: 3,
        lienMeet: 'https://meet.google.com/klm-nopq-rst',
        contientQuiz: true,
        contientDevoir: true,
        fichierNom: 'html_css.pdf',
        fichierPath: '/assets/files/html_css.pdf',
        courId: this.matiereId,
        semestre: this.convertToSemestreFormat(this.semestre),
        enseignantId: '67c4c2f07fe25e5361a1e1bf',
        dateCreation: new Date()
      },
      {
        _id: '3',
        titre: 'JavaScript',
        numero: 3,
        description: 'Introduction à JavaScript et à la programmation côté client',
        nombreSeances: 4,
        lienMeet: 'https://meet.google.com/uvw-xyz-123',
        contientQuiz: false,
        contientDevoir: true,
        fichierNom: 'javascript.pdf',
        fichierPath: '/assets/files/javascript.pdf',
        courId: this.matiereId,
        semestre: this.convertToSemestreFormat(this.semestre),
        enseignantId: '67c4c2f07fe25e5361a1e1bf',
        dateCreation: new Date()
      }
    ];

    this.filteredChapitres = [...this.chapitres];
  }

// Méthodes d'aide pour la conversion des IDs en noms
getDepartementName(departementId: string): string {
  if (!departementId) return "Non spécifié";
  if (this.departements.length === 0) return "Chargement...";
  
  // Essayer de trouver par _id
  let dept = this.departements.find(d => d._id === departementId);
  
  // Si non trouvé, essayer de trouver par id (sans underscore)
  if (!dept) {
    dept = this.departements.find(d => d.id === departementId);
  }
  
  // Si toujours non trouvé, essayer de trouver par name (au cas où l'ID est en fait le nom)
  if (!dept) {
    dept = this.departements.find(d => d.name === departementId);
  }
  
  return dept ? dept.name : departementId; // Retourner l'ID comme fallback au lieu de "Département inconnu"
}

getNiveauName(niveauId: string): string {
  if (!niveauId) return "Non spécifié";
  if (this.niveaux.length === 0) return "Chargement...";
  
  // Essayer de trouver par _id
  let niveau = this.niveaux.find(n => n._id === niveauId);
  
  // Si non trouvé, essayer de trouver par id (sans underscore)
  if (!niveau) {
    niveau = this.niveaux.find(n => n.id === niveauId);
  }
  
  // Si toujours non trouvé, essayer de trouver par name (au cas où l'ID est en fait le nom)
  if (!niveau) {
    niveau = this.niveaux.find(n => n.name === niveauId);
  }
  
  return niveau ? niveau.name : niveauId; // Retourner l'ID comme fallback au lieu de "Niveau inconnu"
}

  getCoursType(cours: any): string {
    // Logique pour déterminer le type de cours (Cours, TD, TP)
    if (cours.type) return cours.type;
    return 'Cours'; // Valeur par défaut
  }

  // Rechercher des chapitres
  searchChapitres(): void {
    if (!this.searchTerm.trim()) {
      this.filteredChapitres = [...this.chapitres];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredChapitres = this.chapitres.filter(chapitre => 
      chapitre.titre.toLowerCase().includes(term) || 
      chapitre.description.toLowerCase().includes(term)
    );
  }

  // Filtrer les chapitres par type
  filterChapitres(type: string = 'all'): void {
    this.filterType = type;

    if (type === 'all') {
      this.filteredChapitres = [...this.chapitres];
      return;
    }

    if (type === 'quiz') {
      this.filteredChapitres = this.chapitres.filter(chapitre => chapitre.contientQuiz);
    } else if (type === 'devoir') {
      this.filteredChapitres = this.chapitres.filter(chapitre => chapitre.contientDevoir);
    }
  }

  // Méthodes pour la gestion des modals
  showModal(modalType: string): void {
    this.activeModal = modalType;
    if (modalType === 'chapitre') {
      this.openAddChapitreModal();
    }
  }

  hideModal(): void {
    this.activeModal = null;
    this.closeAddChapitreModal();
    this.closeEditChapitreModal();
    this.closeDeleteChapitreModal();
  }

  // Méthodes pour la navigation
  navigateToMatiere(matiereId: string, semestre: number): void {
    this.router.navigate(['/cour'], {
      queryParams: {
        matiereId: matiereId,
        semestre: semestre
      }
    });
  }

  // Méthodes pour les sous-menus
  toggleCourSubmenu(): void {
    this.showCourSubmenu = !this.showCourSubmenu;
    if (!this.showCourSubmenu) {
      this.showSemestreSubmenu = { 1: false, 2: false };
    }
  }

  toggleSemestreSubmenu(semestre: number): void {
    this.showSemestreSubmenu[semestre] = !this.showSemestreSubmenu[semestre];
  }

// Méthode pour formater les dates
formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'Non disponible';
  
  try {
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Date invalide';
  }
}

  // Méthode pour générer une couleur aléatoire
  getRandomColor(seed: string): string {
    // Simple hash function pour générer une couleur basée sur une chaîne
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  }

// Ouvrir le modal d'ajout de chapitre
openAddChapitreModal(): void {
  // Convert semestre to number first
  const semestreNum = this.semestre;
  
  this.chapitreForm.reset({
    courId: this.matiereId,
    semestre: semestreNum.toString(), // Use number as string, not S1 format
    enseignantId: '67c4c2f07fe25e5361a1e1bf',
    contientQuiz: false,
    contientDevoir: false,
    lienClassroom: '', // Changed from lienMeet to lienClassroom
    fichierNom: '' // Initialize fichierNom field
  });
  this.chapitreFile = null;
  this.showAddChapitreModal = true;
  this.activeModal = 'chapitre';
}
  // Fermer le modal d'ajout de chapitre
  closeAddChapitreModal(): void {
    this.showAddChapitreModal = false;
    if (this.activeModal === 'chapitre') {
      this.activeModal = null;
    }
  }



  // Gérer le changement de fichier pour l'édition de chapitre
  onEditFileChange(event: any): void {
    if (event.target.files.length > 0) {
      this.editChapitreFile = event.target.files[0];
      this.editChapitreForm.patchValue({
        fichierNom: this.editChapitreFile ? this.editChapitreFile.name : ''
      });
    }
  }

// In your component
submitChapitreForm(): void {
  if (this.chapitreForm.invalid) {
    this.showNotification('Veuillez remplir tous les champs obligatoires', 'OK');
    return;
  }

  this.isLoading = true;
  
  // Create FormData object
  const formData = new FormData();
  
  // Get form values
  const chapitreData = this.chapitreForm.value;
  
  // Add all form fields to FormData
  formData.append('titre', chapitreData.titre);
  formData.append('numero', chapitreData.numero.toString());
  formData.append('description', chapitreData.description);
  formData.append('nombreSeances', chapitreData.nombreSeances.toString());
  
  // Convert semestre format (S1 -> 1)
  let semestre = chapitreData.semestre;
  if (typeof semestre === 'string' && semestre.startsWith('S')) {
    semestre = semestre.substring(1);
  }
  formData.append('semestre', semestre);
  
  formData.append('courId', this.matiereId);
  formData.append('enseignantId', '67c4c2f07fe25e5361a1e1bf'); // Your enseignantId
  formData.append('contientQuiz', chapitreData.contientQuiz ? 'true' : 'false');
  formData.append('contientDevoir', chapitreData.contientDevoir ? 'true' : 'false');
  
  // Add lienClassroom if provided (changed from lienMeet)
  if (chapitreData.lienClassroom) {
    formData.append('lienMeet', chapitreData.lienClassroom); // Map lienClassroom to lienMeet for the API
  }
  
  // Add current date for dateCreation
  formData.append('dateCreation', new Date().toISOString());
  
  // Add file if selected
  if (this.chapitreFile) {
    formData.append('fichier', this.chapitreFile, this.chapitreFile.name);
    formData.append('fichierNom', this.chapitreFile.name);
  }
  

  
  // Call the service with FormData
  this.chapitreService.createChapitre(formData)
    .then((response) => {
      console.log('Chapitre créé avec succès:', response);
      this.showNotification('Chapitre créé avec succès', 'OK');
      this.hideModal();
      this.loadChapitres();
      this.isLoading = false;
    })
    .catch((error) => {
      console.error('Erreur lors de la création du chapitre:', error);
      this.showNotification('Erreur lors de la création du chapitre', 'OK');
      this.isLoading = false;
    });
}
  // Simuler l'upload de fichier - retourne une Promise
  uploadFile(file: File): Promise<any> {
    // Simulation d'une réponse d'API
    return new Promise<any>((resolve) => {
      setTimeout(() => {
        resolve({
          path: `/uploads/${file.name}`,
          success: true
        });
      }, 1000);
    });
  }

  // Créer un chapitre
  createChapitre(chapitreData: any): void {
    // Correction: Utiliser then() au lieu de subscribe() pour les Promises
    this.createChapitreService(chapitreData).then((response: any) => {
      console.log('Chapitre créé avec succès:', response);
      this.showNotification('Chapitre créé avec succès', 'OK');
      this.closeAddChapitreModal();
      this.loadChapitres();
      this.isLoading = false;
    }).catch((error: any) => {
      console.error('Erreur lors de la création du chapitre:', error);
      this.showNotification('Erreur lors de la création du chapitre', 'OK');
      this.isLoading = false;
    });
  }

  // Simuler la création d'un chapitre - retourne une Promise
  createChapitreService(chapitreData: any): Promise<any> {
    // Simulation d'une réponse d'API
    return new Promise<any>((resolve) => {
      setTimeout(() => {
        const newChapitre = {
          ...chapitreData,
          _id: Math.random().toString(36).substring(2, 15),
          dateCreation: new Date()
        };
        resolve(newChapitre);
      }, 1000);
    });
  }

  // Méthodes pour la gestion des chapitres
  viewChapitre(chapitre: any): void {
    this.selectedChapitre = chapitre;
    this.activeModal = 'viewChapitre';
  }

  editChapitre(chapitre: any): void {
    this.openEditChapitreModal(chapitre);
  }

  confirmDeleteChapitre(chapitre: any): void {
    this.chapitreToDelete = chapitre;
    this.activeModal = 'confirmDelete';
    this.showDeleteChapitreModal = true;
  }

// Ouvrir le modal d'édition de chapitre
openEditChapitreModal(chapitre: any): void {
  this.chapitreToEdit = chapitre;
  this.editChapitreForm.reset({
    _id: chapitre._id,
    titre: chapitre.titre,
    numero: chapitre.numero,
    description: chapitre.description,
    nombreSeances: chapitre.nombreSeances,
    lienClassroom: chapitre.lienMeet || '', // Map lienMeet to lienClassroom for the form
    contientQuiz: chapitre.contientQuiz || false,
    contientDevoir: chapitre.contientDevoir || false,
    fichierNom: chapitre.fichierNom || '',
    fichierPath: chapitre.fichierPath || '',
    courId: chapitre.courId,
    semestre: chapitre.semestre,
    enseignantId: chapitre.enseignantId
  });
  this.editChapitreFile = null;
  this.showEditChapitreModal = true;
  this.activeModal = 'editChapitre';
}

  // Fermer le modal d'édition de chapitre
  closeEditChapitreModal(): void {
    this.showEditChapitreModal = false;
    this.chapitreToEdit = null;
    if (this.activeModal === 'editChapitre') {
      this.activeModal = null;
    }
  }

// Soumettre le formulaire d'édition de chapitre
submitEditChapitreForm(): void {
  if (this.editChapitreForm.invalid) {
    this.showNotification('Veuillez remplir tous les champs obligatoires', 'OK');
    return;
  }

  this.isLoading = true;
  const chapitreData = this.editChapitreForm.value;
  
  // Create FormData for the update
  const formData = new FormData();
  
  // Add all form fields to FormData
  formData.append('_id', chapitreData._id);
  formData.append('titre', chapitreData.titre);
  formData.append('numero', chapitreData.numero.toString());
  formData.append('description', chapitreData.description);
  formData.append('nombreSeances', chapitreData.nombreSeances.toString());
  
  // Map lienClassroom to lienMeet for the API
  if (chapitreData.lienClassroom) {
    formData.append('lienMeet', chapitreData.lienClassroom);
  }
  
  formData.append('contientQuiz', chapitreData.contientQuiz ? 'true' : 'false');
  formData.append('contientDevoir', chapitreData.contientDevoir ? 'true' : 'false');
  formData.append('courId', chapitreData.courId);
  formData.append('semestre', chapitreData.semestre.toString());
  formData.append('enseignantId', chapitreData.enseignantId);
  
  // Add dateModification
  formData.append('dateModification', new Date().toISOString());
  
  // If there's an existing file path, include it
  if (chapitreData.fichierPath) {
    formData.append('fichierPath', chapitreData.fichierPath);
  }
  
  if (chapitreData.fichierNom) {
    formData.append('fichierNom', chapitreData.fichierNom);
  }

  // If a new file is selected, add it
  if (this.editChapitreFile) {
    formData.append('fichier', this.editChapitreFile, this.editChapitreFile.name);
    formData.append('fichierNom', this.editChapitreFile.name);
  }

  // Update the chapitre with the FormData
  this.chapitreService.updateChapitre(chapitreData._id, formData).subscribe({
    next: (response) => {
      console.log('Chapitre mis à jour avec succès:', response);
      this.showNotification('Chapitre mis à jour avec succès', 'OK');
      this.closeEditChapitreModal();
      this.loadChapitres();
      this.isLoading = false;
    },
    error: (error: any) => {
      console.error('Erreur lors de la mise à jour du chapitre:', error);
      this.showNotification('Erreur lors de la mise à jour du chapitre', 'OK');
      this.isLoading = false;
    }
  });
}

  // Mettre à jour un chapitre
  updateChapitre(chapitreData: any): void {
    this.chapitreService.updateChapitre(chapitreData._id, chapitreData).subscribe({
      next: (response) => {
        console.log('Chapitre mis à jour avec succès:', response);
        this.showNotification('Chapitre mis à jour avec succès', 'OK');
        this.closeEditChapitreModal();
        this.loadChapitres();
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Erreur lors de la mise à jour du chapitre:', error);
        this.showNotification('Erreur lors de la mise à jour du chapitre', 'OK');
        this.isLoading = false;
      }
    });
  }

  // Ouvrir le modal de suppression de chapitre
  openDeleteChapitreModal(chapitre: any): void {
    this.chapitreToDelete = chapitre;
    this.showDeleteChapitreModal = true;
    this.activeModal = 'confirmDelete';
  }

  // Fermer le modal de suppression de chapitre
  closeDeleteChapitreModal(): void {
    this.showDeleteChapitreModal = false;
    this.chapitreToDelete = null;
    if (this.activeModal === 'confirmDelete') {
      this.activeModal = null;
    }
  }

  // Supprimer un chapitre
  deleteChapitre(): void {
    if (!this.chapitreToDelete) {
      return;
    }

    this.isLoading = true;
    this.chapitreService.deleteChapitre(this.chapitreToDelete._id).subscribe({
      next: (response) => {
        console.log('Chapitre supprimé avec succès:', response);
        this.showNotification('Chapitre supprimé avec succès', 'OK');
        this.closeDeleteChapitreModal();
        this.loadChapitres();
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Erreur lors de la suppression du chapitre:', error);
        this.showNotification('Erreur lors de la suppression du chapitre', 'OK');
        this.isLoading = false;
      }
    });
  }

  // Télécharger un fichier de chapitre
  downloadChapitreFile(chapitre: any): void {
    if (!chapitre.fichierPath) {
      this.showNotification('Aucun fichier disponible pour ce chapitre', 'OK');
      return;
    }

    // Correction: Utiliser then() au lieu de subscribe() pour les Promises
    this.downloadFile(chapitre.fichierPath).then((response: any) => {
      // Créer un lien temporaire pour télécharger le fichier
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', chapitre.fichierNom || 'chapitre.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    }).catch((error: any) => {
      console.error('Erreur lors du téléchargement du fichier:', error);
      this.showNotification('Erreur lors du téléchargement du fichier', 'OK');
    });
  }

  // Simuler le téléchargement d'un fichier - retourne une Promise
  downloadFile(path: string): Promise<any> {
    // Simulation d'une réponse d'API
    return new Promise<any>((resolve) => {
      setTimeout(() => {
        // Simuler un contenu de fichier
        const dummyContent = new Blob(['Contenu du fichier simulé'], { type: 'application/pdf' });
        resolve(dummyContent);
      }, 1000);
    });
  }

  // Afficher une notification
  showNotification(message: string, action = 'Fermer', duration = 3000): void {
    this.snackBar.open(message, action, {
      duration: duration > 0 ? duration : undefined,
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }

  // Naviguer vers la page d'accueil
  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
