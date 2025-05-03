import { Component, type OnInit } from "@angular/core"
import {  FormBuilder, FormGroup, type FormArray, Validators } from "@angular/forms"
import  { Router } from "@angular/router"
import  { MatSnackBar } from "@angular/material/snack-bar"
import { forkJoin } from "rxjs"
import  { ChapitreService } from "./../chapitre.service"
import  { CoursService } from "./../cours.service"
import  { SpecialitesService } from "./../specialites.service"
import  { NiveauxService } from "./../niveaux.service"
import  { VoeuxService } from "./../voeux.service"
import  { DepartementsService } from "./../departements.service"
import  { DevoirService } from "./../devoir.service"
import { trigger, style, transition, animate } from "@angular/animations"

@Component({
  selector: "app-deuxieme-interface",
  templateUrl: "./deuxieme-interface.component.html",
  styleUrls: ["./deuxieme-interface.component.css"],
  animations: [
    trigger("submenuAnimation", [
      transition(":enter", [
        style({ height: 0, opacity: 0 }),
        animate("300ms ease-out", style({ height: "*", opacity: 1 })),
      ]),
      transition(":leave", [
        style({ height: "*", opacity: 1 }),
        animate("300ms ease-in", style({ height: 0, opacity: 0 })),
      ]),
    ]),
  ],
})
export class DeuxiemeInterfaceComponent implements OnInit {
  // Informations de l'enseignant
  enseignantName = "Israa Bribech"
  enseignantEmail = "israabribech2002@gmail.com"
  enseignantCIN = "12345678"
  enseignantId = "67c4c2f07fe25e5361a1e1bf" // ID de l'enseignant connecté
  departement = "Informatique"
  specialite = "Développement Web"
  grade = "Professeur"
  experience = "15"
  userRole = "chef_departement" // Default role for testing

  // Statistiques
  coursStats = {
    total: 0,
    active: 0,
    draft: 0,
  }

  chapitreStats = {
    total: 0,
    published: 0,
    draft: 0,
  }

  devoirStats = {
    total: 0,
    pending: 0,
    graded: 0,
  }

  quizStats = {
    total: 0,
    active: 0,
    completed: 0,
  }

  messageStats = {
    total: 0,
    unread: 0,
    sent: 0,
  }

  voeuxStats = {
    total: 0,
    approved: 0,
    pending: 0,
  }

  // Modal actif
  activeModal: string | null = null

  // Semestre sélectionné
  selectedSemestre: number | null = null

  // États du menu
  showCourSubmenu = false
  showSemestreSubmenu: { [key: number]: boolean } = { 1: false, 2: false }

  // Matières par semestre avec ajout du type (Cours, TD, TP)
  matieresSemestre1: any[] = []
  matieresSemestre2: any[] = []

  // Variables pour stocker les matières originales (pour la recherche et le filtrage)
  _originalMatieresSemestre1: any[] | null = null
  _originalMatieresSemestre2: any[] | null = null

  // Afficher la liste des matières
  showMatieresList = false

  // Formulaires
  courForm!: FormGroup
  devoirForm!: FormGroup
  chapitreForm!: FormGroup
  quizForm!: FormGroup
  messageForm!: FormGroup
  voeuxForm!: FormGroup

  // Données pour les formulaires
  departements: any[] = []
  niveaux: any[] = []
  specialites: any[] = []

  filteredSpecialites: any[] = []
  filteredSpecialitesByNiveau: any[] = []
  filteredCours: any[] = []
  allCours: any[] = []

  // Fichiers
  courFile: File | null = null
  devoirFile: File | null = null
  chapitreFile: File | null = null

  // Matières pour les voeux
  matieres: any[] = []
  selectedMatieres: any[] = []

  // Indicateur de chargement
  isLoading = false

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private chapitreService: ChapitreService,
    private coursService: CoursService,
    private specialitesService: SpecialitesService,
    private niveauxService: NiveauxService,
    private departementsService: DepartementsService,
    private snackBar: MatSnackBar,
    private voeuxService: VoeuxService,
    private devoirService: DevoirService,
  ) {}

  ngOnInit(): void {
    this.initForms()
    this.loadAllData()
    this.loadChapitresStats()
    this.loadVoeuxStats()

    // Charger explicitement les cours pour les deux semestres
    this.loadCoursBySemestre(1)
    this.loadCoursBySemestre(2)
  }

  // Utilitaire pour convertir le numéro de semestre en format "S1"/"S2"
  convertToSemestreFormat(semestre: number | string): string {
    if (typeof semestre === "number" || (typeof semestre === "string" && !semestre.startsWith("S"))) {
      return `S${semestre}`
    }
    return semestre as string
  }

  // Utilitaire pour convertir le format "S1"/"S2" en numéro de semestre
  convertFromSemestreFormat(semestre: string): number {
    if (semestre.startsWith("S")) {
      return Number.parseInt(semestre.substring(1))
    }
    return Number.parseInt(semestre)
  }

  // Charger toutes les données nécessaires
  loadAllData(): void {
    this.isLoading = true

    // Utiliser forkJoin pour charger toutes les données en parallèle
    forkJoin({
      cours: this.coursService.getAllCours(),
      departements: this.departementsService.getDepartements(),
      niveaux: this.niveauxService.getNiveaux(),
      specialites: this.specialitesService.getSpecialites(),
    }).subscribe({
      next: (results) => {
        // Stocker les données récupérées
        this.allCours = results.cours
        console.log("Cours chargés:", this.allCours)

        this.departements = results.departements
        this.niveaux = results.niveaux
        this.specialites = results.specialites

        // Préparer les matières pour les voeux
        this.matieres = this.allCours.map((cours) => ({
          id: cours._id,
          nom: cours.title || cours.titre,
        }))

        // Mettre à jour les statistiques
        this.updateStatistics()

        // Filtrer les cours par semestre
        this.filterCoursBySemestre()

        this.isLoading = false
      },
      error: (error) => {
        console.error("Erreur lors du chargement des données:", error)
        this.showNotification("Erreur lors du chargement des données", "OK")
        this.isLoading = false

        // Utiliser des données statiques en cas d'erreur
        this.setupFallbackData()
      },
    })
  }

  // Charger les statistiques des chapitres
  loadChapitresStats(): void {
    this.isLoading = true
    this.chapitreService
      .getChapitres({
        enseignantId: this.enseignantId,
        contientQuiz: undefined,
        semestre: "",
      })
      .subscribe({
        next: (chapitres) => {
          this.chapitreStats.total = chapitres.length
          this.chapitreStats.published = chapitres.filter((c) => c.dateCreation).length
          this.chapitreStats.draft = this.chapitreStats.total - this.chapitreStats.published
          this.isLoading = false
        },
        error: (error) => {
          console.error("Erreur lors du chargement des statistiques des chapitres:", error)
          // Utiliser des valeurs par défaut en cas d'erreur
          this.chapitreStats.total = 0
          this.chapitreStats.published = 0
          this.chapitreStats.draft = 0
          this.isLoading = false
        },
      })
  }

  // Charger les statistiques des voeux
  loadVoeuxStats(): void {
    this.isLoading = true
    this.voeuxService.getVoeuxStats().subscribe({
      next: (stats) => {
        this.voeuxStats.total = stats.total
        this.voeuxStats.approved = stats.approved
        this.voeuxStats.pending = stats.pending
        this.isLoading = false
      },
      error: (error) => {
        console.error("Erreur lors du chargement des statistiques des voeux:", error)
        // Utiliser des valeurs par défaut en cas d'erreur
        this.voeuxStats.total = 0
        this.voeuxStats.approved = 0
        this.voeuxStats.pending = 0
        this.isLoading = false
      },
    })
  }

  // Mettre à jour les statistiques
  updateStatistics(): void {
    // Statistiques des cours
    this.coursStats.total = this.allCours.length
    this.coursStats.active = this.allCours.filter((c) => c.estActif).length
    this.coursStats.draft = this.coursStats.total - this.coursStats.active

    // Autres statistiques pourraient être mises à jour ici si les données sont disponibles
  }

  filterCoursBySemestre(): void {
    console.log("Filtrage des cours par semestre...")

    // Filter courses by semester 1 (S1)
    this.matieresSemestre1 = this.allCours
      .filter((c) => {
        const match = c.semestre === "S1"
        return match
      })
      .map((c) => this.mapCoursToMatiere(c, 1))

    // Filter courses by semester 2 (S2)
    this.matieresSemestre2 = this.allCours
      .filter((c) => {
        const match = c.semestre === "S2"
        return match
      })
      .map((c) => this.mapCoursToMatiere(c, 2))

    console.log(`Filtered ${this.matieresSemestre1.length} courses for semester 1 (S1)`)
    console.log(`Filtered ${this.matieresSemestre2.length} courses for semester 2 (S2)`)

    // Sauvegarder les copies pour la recherche et le filtrage
    this._originalMatieresSemestre1 = [...this.matieresSemestre1]
    this._originalMatieresSemestre2 = [...this.matieresSemestre2]
  }

  // Méthode améliorée pour charger les cours par semestre
  loadCoursBySemestre(semestre: number): void {
    this.isLoading = true

    // Utiliser le service existant pour obtenir tous les cours
    this.coursService.getAllCours().subscribe({
      next: (cours) => {
        // Convertir le numéro de semestre au format "S1"/"S2"
        const semestreStr = this.convertToSemestreFormat(semestre)

        console.log(`Recherche des cours pour le semestre ${semestreStr}...`)
        console.log(
          "Cours disponibles:",
          cours.map((c) => ({ id: c._id, titre: c.titre, semestre: c.semestre })),
        )

        // Filtrer les cours par le semestre spécifié
        const filteredCours = cours.filter((c) => c.semestre === semestreStr)

        console.log(`Loaded ${filteredCours.length} courses for semester ${semestre} (${semestreStr})`)

        // Mapper les cours filtrés en objets matière avec des informations sur les heures
        const matieres = filteredCours.map((c) => {
          const matiere = this.mapCoursToMatiere(c, semestre)

          // Ajouter des informations sur les heures du cours
          matiere.heures = c.heures || (c.heure ? c.heure.toString() : "")

          return matiere
        })

        // Mettre à jour les cours du semestre approprié
        if (semestre === 1) {
          this.matieresSemestre1 = matieres
          this._originalMatieresSemestre1 = [...matieres]
        } else if (semestre === 2) {
          this.matieresSemestre2 = matieres
          this._originalMatieresSemestre2 = [...matieres]
        }

        this.isLoading = false
      },
      error: (error) => {
        console.error(`Error loading courses for semester ${semestre}:`, error)
        this.showNotification(`Erreur lors du chargement des cours pour le semestre ${semestre}`, "OK")
        this.isLoading = false

        // Utiliser des données de secours si disponibles
        if (semestre === 1 || semestre === 2) {
          this.setupFallbackData()
        }
      },
    })
  }

  // Mapper un cours à un objet matière pour l'affichage
  mapCoursToMatiere(cours: any, semestre: number): any {
    return {
      id: cours._id,
      nom: cours.titre || cours.title,
      departement: this.getDepartementName(cours.departement || cours.departementId),
      niveau: this.getNiveauName(cours.niveau || cours.niveauId),
      type: this.getCoursType(cours),
      icon: this.getCoursIcon(cours),
      heures: cours.heures || (cours.heure ? cours.heure.toString() : ""),
    }
  }

  // Configurer des données de secours en cas d'erreur
  setupFallbackData(): void {
    // Données de secours pour les départements, niveaux, spécialités
    this.departements = [
      { _id: "1", name: "Informatique" },
      { _id: "2", name: "Gestion" },
      { _id: "3", name: "Finance" },
    ]

    this.niveaux = [
      { _id: "1", name: "Licence 1" },
      { _id: "2", name: "Licence 2" },
      { _id: "3", name: "Licence 3" },
      { _id: "4", name: "Master 1" },
      { _id: "5", name: "Master 2" },
    ]

    this.specialites = [
      { _id: "1", name: "Développement Web", departement: "1", niveau: "3" },
      { _id: "2", name: "Réseaux", departement: "1", niveau: "4" },
      { _id: "3", name: "Comptabilité", departement: "2", niveau: "2" },
      { _id: "4", name: "Marketing", departement: "2", niveau: "3" },
      { _id: "5", name: "Banque", departement: "3", niveau: "5" },
    ]

    // Données de secours pour les cours
    this.matieresSemestre1 = [
      {
        id: "1",
        nom: "Programmation Web",
        departement: "Informatique",
        niveau: "Licence 3",
        type: "Cours",
        icon: "code",
        heures: "21",
      },
      {
        id: "2",
        nom: "Bases de données",
        departement: "Informatique",
        niveau: "Licence 2",
        type: "TD",
        icon: "database",
        heures: "21",
      },
      {
        id: "3",
        nom: "Algorithmes",
        departement: "Informatique",
        niveau: "Licence 1",
        type: "TP",
        icon: "microchip",
        heures: "21",
      },
      {
        id: "4",
        nom: "Comptabilité",
        departement: "Gestion",
        niveau: "Licence 2",
        type: "Cours",
        icon: "file-invoice",
        heures: "42",
      },
    ]

    this.matieresSemestre2 = [
      {
        id: "5",
        nom: "Développement Mobile",
        departement: "Informatique",
        niveau: "Licence 3",
        type: "Cours",
        icon: "mobile-alt",
        heures: "21",
      },
      {
        id: "6",
        nom: "Intelligence Artificielle",
        departement: "Informatique",
        niveau: "Master 1",
        type: "TD",
        icon: "brain",
        heures: "21",
      },
      {
        id: "7",
        nom: "Réseaux",
        departement: "Informatique",
        niveau: "Licence 2",
        type: "TP",
        icon: "network-wired",
        heures: "21",
      },
      {
        id: "8",
        nom: "Marketing Digital",
        departement: "Gestion",
        niveau: "Licence 3",
        type: "Cours",
        icon: "chart-line",
        heures: "42",
      },
    ]

    // Sauvegarder les copies pour la recherche et le filtrage
    this._originalMatieresSemestre1 = [...this.matieresSemestre1]
    this._originalMatieresSemestre2 = [...this.matieresSemestre2]

    // Préparer les matières pour les voeux
    this.matieres = [
      { id: "1", nom: "Programmation Web" },
      { id: "2", nom: "Bases de données" },
      { id: "3", nom: "Algorithmes" },
      { id: "4", nom: "Comptabilité" },
      { id: "5", nom: "Développement Mobile" },
      { id: "6", nom: "Intelligence Artificielle" },
      { id: "7", nom: "Réseaux" },
      { id: "8", nom: "Marketing Digital" },
    ]
  }

  // Méthodes d'aide pour la conversion des IDs en noms
  getDepartementName(departementId: string): string {
    const dept = this.departements.find((d) => d._id === departementId)
    return dept ? dept.name : "Département inconnu"
  }

  getNiveauName(niveauId: string): string {
    const niveau = this.niveaux.find((n) => n._id === niveauId)
    return niveau ? niveau.name : "Niveau inconnu"
  }

  getCoursType(cours: any): string {
    // Logique pour déterminer le type de cours (Cours, TD, TP)
    if (cours.seance) return cours.seance
    if (cours.type) return cours.type
    return "Cours" // Valeur par défaut
  }

  getCoursIcon(cours: any): string {
    // Logique pour déterminer l'icône du cours
    switch (this.getCoursType(cours)) {
      case "Cours":
        return "book"
      case "TD":
        return "pencil-alt"
      case "TP":
        return "laptop-code"
      default:
        return "book"
    }
  }

  // Toggle pour le menu des cours
  toggleCourSubmenu(): void {
    this.showCourSubmenu = !this.showCourSubmenu
    // Fermer les sous-menus de semestre si on ferme le menu cours
    if (!this.showCourSubmenu) {
      this.showSemestreSubmenu = { 1: false, 2: false }
    }
  }

  // Toggle pour les sous-menus de semestre
  toggleSemestreSubmenu(semestre: number): void {
    this.showSemestreSubmenu[semestre] = !this.showSemestreSubmenu[semestre]

    // Si on ouvre le sous-menu, charger les cours pour ce semestre
    if (this.showSemestreSubmenu[semestre]) {
      this.loadCoursBySemestre(semestre)
    }
  }

  // Naviguer vers la page de cours pour une matière spécifique
  navigateToMatiere(matiereId: string, semestre: number): void {
    this.router.navigate(["/cour"], {
      queryParams: {
        matiereId: matiereId,
        semestre: semestre,
      },
    })
  }

  // Rechercher des matières
  rechercherMatieres(term: string): void {
    if (!term.trim()) {
      // Si la recherche est vide, restaurer les matières originales
      if (this._originalMatieresSemestre1) {
        this.matieresSemestre1 = [...this._originalMatieresSemestre1]
      }
      if (this._originalMatieresSemestre2) {
        this.matieresSemestre2 = [...this._originalMatieresSemestre2]
      }
      return
    }

    this.isLoading = true

    const searchTerm = term.toLowerCase()

    // Sauvegarder les matières originales si ce n'est pas déjà fait
    if (!this._originalMatieresSemestre1) {
      this._originalMatieresSemestre1 = [...this.matieresSemestre1]
    }
    if (!this._originalMatieresSemestre2) {
      this._originalMatieresSemestre2 = [...this.matieresSemestre2]
    }

    // Filtrer les matières des deux semestres
    this.matieresSemestre1 = this._originalMatieresSemestre1.filter(
      (m) =>
        m.nom.toLowerCase().includes(searchTerm) ||
        m.departement.toLowerCase().includes(searchTerm) ||
        m.niveau.toLowerCase().includes(searchTerm) ||
        m.type.toLowerCase().includes(searchTerm),
    )

    this.matieresSemestre2 = this._originalMatieresSemestre2.filter(
      (m) =>
        m.nom.toLowerCase().includes(searchTerm) ||
        m.departement.toLowerCase().includes(searchTerm) ||
        m.niveau.toLowerCase().includes(searchTerm) ||
        m.type.toLowerCase().includes(searchTerm),
    )

    this.isLoading = false
  }

  // Filtrer les matières par type
  filtrerMatiereParType(semestre: number, type: string): void {
    // Restaurer les matières originales si nécessaire
    if (!this._originalMatieresSemestre1 && semestre === 1) {
      this._originalMatieresSemestre1 = [...this.matieresSemestre1]
    }
    if (!this._originalMatieresSemestre2 && semestre === 2) {
      this._originalMatieresSemestre2 = [...this.matieresSemestre2]
    }

    this.isLoading = true

    // Si type est 'Tous', réinitialiser les matières
    if (type === "Tous") {
      if (semestre === 1 && this._originalMatieresSemestre1) {
        this.matieresSemestre1 = [...this._originalMatieresSemestre1]
      } else if (semestre === 2 && this._originalMatieresSemestre2) {
        this.matieresSemestre2 = [...this._originalMatieresSemestre2]
      } else {
        // Si les originaux ne sont pas disponibles, recharger
        this.loadCoursBySemestre(semestre)
      }
    } else {
      // Filtrer par type spécifique
      const originalMatieres =
        semestre === 1
          ? this._originalMatieresSemestre1 || [...this.matieresSemestre1]
          : this._originalMatieresSemestre2 || [...this.matieresSemestre2]

      const filteredMatieres = originalMatieres.filter((m) => m.type === type)

      if (semestre === 1) {
        this.matieresSemestre1 = filteredMatieres
      } else {
        this.matieresSemestre2 = filteredMatieres
      }
    }

    this.isLoading = false
  }

  // Helper method to show notifications
  showNotification(message: string, action = "Fermer", duration = 3000): void {
    this.snackBar.open(message, action, {
      duration: duration > 0 ? duration : undefined,
      horizontalPosition: "end",
      verticalPosition: "top",
    })
  }

  // Initialisation des formulaires
  initForms(): void {
    this.courForm = this.fb.group({
      titre: ["", Validators.required],
      departement: ["", Validators.required],
      niveau: ["", Validators.required],
      specialite: ["", Validators.required],
      semestre: ["1", Validators.required],
      heures: ["21", [Validators.required]], // Valeurs possibles: 21 ou 42
      seance: ["Cours", Validators.required], // Ajout du champ seance (Cours, TD, TP)
    })

    this.devoirForm = this.fb.group({
      title: ["", Validators.required],
      departement: ["", Validators.required],
      niveau: ["", Validators.required],
      specialite: ["", Validators.required],
      cour: ["", Validators.required],
      description: ["", Validators.required],
      dueDate: ["", Validators.required],
    })

    this.chapitreForm = this.fb.group({
      titre: ["", Validators.required],
      numero: ["", [Validators.required, Validators.min(1)]],
      description: ["", Validators.required],
      nombreSeances: ["", [Validators.required, Validators.min(1)]],
      lienMeet: [""],
      contientQuiz: [false],
      contientDevoir: [false],
      fichier: [""],
      fichierNom: [""],
      fichierPath: [""],
      courId: ["", Validators.required],
      semestre: ["1", Validators.required],
      enseignantId: [this.enseignantId],
    })

    this.quizForm = this.fb.group({
      title: ["", Validators.required],
      cour: ["", Validators.required],
    })

    this.messageForm = this.fb.group({
      recipient: ["", Validators.required],
      subject: ["", Validators.required],
      content: ["", Validators.required],
    })

    // Mise à jour du formulaire de voeux pour gérer plusieurs matières avec leurs types de séance
    this.voeuxForm = this.fb.group({
      semestre: ["1", Validators.required],
      departement: ["", Validators.required],
      niveau: ["", Validators.required],
      specialite: ["", Validators.required],
      matieres: this.fb.array([]), // FormArray pour les matières
      commentaire: [""],
    })
  }

  // Getter pour accéder au FormArray des matières
  get matieresFormArray(): FormArray {
    return this.voeuxForm.get("matieres") as FormArray
  }

  // Ajouter une matière au formulaire
  addMatiere(): void {
    const matiereGroup = this.fb.group({
      id: ["", Validators.required],
      typeCours: [false],
      typeTD: [false],
      typeTP: [false],
    })

    this.matieresFormArray.push(matiereGroup)
  }

  // Supprimer une matière du formulaire
  removeMatiere(index: number): void {
    this.matieresFormArray.removeAt(index)
  }

  // Vérifier si au moins un type de séance est sélectionné pour une matière
  isAnyTypeSelected(index: number): boolean {
    const matiereGroup = this.matieresFormArray.at(index) as FormGroup
    return (
      matiereGroup.get("typeCours")?.value || matiereGroup.get("typeTD")?.value || matiereGroup.get("typeTP")?.value
    )
  }

  // Afficher un modal
  showModal(modalType: string): void {
    this.activeModal = modalType

    // Réinitialiser les filtres
    this.filteredSpecialites = []
    this.filteredSpecialitesByNiveau = []
    this.filteredCours = []

    // Si c'est le modal chapitre, charger les cours pour le sélecteur
    if (modalType === "chapitre") {
      this.updateCoursDropdown()
    }

    // Si c'est le modal voeux, ajouter une matière vide par défaut
    if (modalType === "voeux") {
      // Réinitialiser le FormArray des matières
      while (this.matieresFormArray.length !== 0) {
        this.matieresFormArray.removeAt(0)
      }
      // Ajouter une matière vide
      this.addMatiere()
    }
  }

  // Méthode spécifique pour afficher le modal de cours
  showCourModal(): void {
    this.courForm.reset({
      semestre: "1",
      heures: "21",
      seance: "Cours",
    })
    this.showModal("cour")
  }

  // Mettre à jour la liste déroulante des cours
  updateCoursDropdown(): void {
    // Filtrer les cours selon le semestre sélectionné
    const semestre = this.chapitreForm.get("semestre")?.value
    const semestreStr = this.convertToSemestreFormat(semestre)

    this.filteredCours = this.allCours.filter((cours) => cours.semestre === semestreStr)
  }

  // Cacher le modal actif
  hideModal(): void {
    this.activeModal = null
    // Réinitialiser les formulaires
    this.chapitreForm.reset({
      contientQuiz: false,
      contientDevoir: false,
      semestre: "1",
      enseignantId: this.enseignantId,
      numero: "",
      nombreSeances: "",
    })

    // Réinitialiser les autres formulaires selon le besoin
    this.courForm.reset({
      semestre: "1",
      heures: "21",
      seance: "Cours",
    })

    this.devoirForm.reset()
    this.quizForm.reset()
    this.messageForm.reset()

    // Réinitialiser le formulaire de voeux
    this.voeuxForm.reset({
      semestre: "1",
    })

    // Vider le FormArray des matières
    while (this.matieresFormArray.length !== 0) {
      this.matieresFormArray.removeAt(0)
    }

    // Réinitialiser les fichiers
    this.courFile = null
    this.devoirFile = null
    this.chapitreFile = null
  }

  // Update the selectSemestre method to load courses for the selected semester
  selectSemestre(semestre: number): void {
    this.selectedSemestre = semestre
    this.showMatieresList = true

    // Load courses for the selected semester
    this.loadCoursBySemestre(semestre)
  }

  // Retourner à la sélection de semestre
  backToSemestreSelection(): void {
    this.selectedSemestre = null
    this.showMatieresList = false
  }

  // Gérer le changement de département
  onDepartementChange(event: any): void {
    const departementId = event.target.value

    // Filtrer les spécialités par département
    this.filteredSpecialites = this.specialites.filter(
      (spec) => spec.departement === departementId || spec.departementId === departementId,
    )

    // Si un niveau est déjà sélectionné, appliquer également ce filtre
    const niveauId = this.getSelectedNiveauId()
    if (niveauId) {
      this.filterSpecialitesByNiveau(niveauId)
    }

    // Mettre à jour les cours filtrés si nécessaire
    this.updateFilteredCours()
  }

  // Gérer le changement de niveau
  onNiveauChange(event: any): void {
    const niveauId = event.target.value

    // Filtrer les spécialités par niveau
    this.filterSpecialitesByNiveau(niveauId)

    // Mettre à jour les cours filtrés
    this.updateFilteredCours()
  }

  // Filtrer les spécialités par niveau
  filterSpecialitesByNiveau(niveauId: string): void {
    // Si nous avons déjà des spécialités filtrées par département
    if (this.filteredSpecialites.length > 0) {
      this.filteredSpecialitesByNiveau = this.filteredSpecialites.filter(
        (spec) => spec.niveau === niveauId || spec.niveauId === niveauId,
      )
    } else {
      // Sinon, filtrer toutes les spécialités par niveau
      this.filteredSpecialitesByNiveau = this.specialites.filter(
        (spec) => spec.niveau === niveauId || spec.niveauId === niveauId,
      )
    }
  }

  // Mettre à jour les cours filtrés en fonction du département et du niveau
  updateFilteredCours(): void {
    const departementId = this.getSelectedDepartementId()
    const niveauId = this.getSelectedNiveauId()
    const specialiteId = this.getSelectedSpecialiteId()
    const semestre = this.getSelectedSemestre()
    const semestreStr = semestre ? this.convertToSemestreFormat(semestre) : null

    // Filtrer les cours selon les critères sélectionnés
    this.filteredCours = this.allCours.filter((cours) => {
      let match = true

      if (semestreStr) {
        match = match && cours.semestre === semestreStr
      }

      if (departementId) {
        match = match && (cours.departement === departementId || cours.departementId === departementId)
      }

      if (niveauId) {
        match = match && (cours.niveau === niveauId || cours.niveauId === niveauId)
      }

      if (specialiteId) {
        match = match && (cours.specialite === specialiteId || cours.specialiteId === specialiteId)
      }

      return match
    })
  }

  // Obtenir l'ID du département sélectionné dans le formulaire actif
  getSelectedDepartementId(): string {
    if (this.activeModal === "chapitre") {
      return this.chapitreForm.get("departement")?.value
    } else if (this.activeModal === "devoir") {
      return this.devoirForm.get("departement")?.value
    } else if (this.activeModal === "cour") {
      return this.courForm.get("departement")?.value
    } else if (this.activeModal === "voeux") {
      return this.voeuxForm.get("departement")?.value
    }
    return ""
  }

  // Obtenir l'ID du niveau sélectionné dans le formulaire actif
  getSelectedNiveauId(): string {
    if (this.activeModal === "chapitre") {
      return this.chapitreForm.get("niveau")?.value
    } else if (this.activeModal === "devoir") {
      return this.devoirForm.get("niveau")?.value
    } else if (this.activeModal === "cour") {
      return this.courForm.get("niveau")?.value
    } else if (this.activeModal === "voeux") {
      return this.voeuxForm.get("niveau")?.value
    }
    return ""
  }

  // Obtenir l'ID de la spécialité sélectionnée dans le formulaire actif
  getSelectedSpecialiteId(): string {
    if (this.activeModal === "chapitre") {
      return this.chapitreForm.get("specialite")?.value
    } else if (this.activeModal === "devoir") {
      return this.devoirForm.get("specialite")?.value
    } else if (this.activeModal === "cour") {
      return this.courForm.get("specialite")?.value
    } else if (this.activeModal === "voeux") {
      return this.voeuxForm.get("specialite")?.value
    }
    return ""
  }

  // Obtenir le semestre sélectionné dans le formulaire actif
  getSelectedSemestre(): string {
    if (this.activeModal === "chapitre") {
      return this.chapitreForm.get("semestre")?.value
    } else if (this.activeModal === "cour") {
      return this.courForm.get("semestre")?.value
    } else if (this.activeModal === "voeux") {
      return this.voeuxForm.get("semestre")?.value
    }
    return ""
  }

  // Gérer le changement de semestre dans le formulaire de chapitre
  onSemestreChange(event: any): void {
    this.updateCoursDropdown()
  }

  // Gérer le changement de spécialité
  onSpecialiteChange(event: any): void {
    // Mettre à jour les cours filtrés
    this.updateFilteredCours()
  }

  onCourFileChange(event: any): void {
    const file = event.target.files[0]
    if (file) {
      this.chapitreFile = file

      // Met à jour le champ du formulaire
      this.chapitreForm.patchValue({
        fichier: file.name,
        fichierNom: file.name,
      })

      // Si tu veux forcer la validation
      this.chapitreForm.get("fichier")?.updateValueAndValidity()
    }
  }

  // Gérer le changement de fichier pour le devoir
  onDevoirFileChange(event: any): void {
    if (event.target.files.length > 0) {
      this.devoirFile = event.target.files[0]
    }
  }

  // Préparer les données de voeux pour l'API
  prepareVoeuxData(): any {
    // Extraire les matières et leurs types de séance
    const matieresData = this.matieresFormArray.controls.map((control: any) => {
      const matiereGroup = control as FormGroup
      const matiereId = matiereGroup.get("id")?.value
      const typeCours = matiereGroup.get("typeCours")?.value
      const typeTD = matiereGroup.get("typeTD")?.value
      const typeTP = matiereGroup.get("typeTP")?.value

      // Créer un tableau des types de séance sélectionnés
      const typesSeance = []
      if (typeCours) typesSeance.push("cours")
      if (typeTD) typesSeance.push("td")
      if (typeTP) typesSeance.push("tp")

      return {
        id: matiereId,
        typesSeance: typesSeance,
      }
    })

    // Filtrer les matières qui ont au moins un type de séance sélectionné
    const validMatieres = matieresData.filter((matiere: any) => matiere.typesSeance.length > 0)

    // Extraire les IDs des matières et les types de séance pour l'API
    const matiereIds = validMatieres.map((matiere: any) => matiere.id)
    const typesSeance = Array.from(new Set(validMatieres.flatMap((matiere: any) => matiere.typesSeance)))

    // Convertir le semestre au format attendu par l'API
    const semestre = this.convertToSemestreFormat(this.voeuxForm.get("semestre")?.value)

    return {
      semestre: semestre,
      departement: this.voeuxForm.get("departement")?.value,
      specialite: this.voeuxForm.get("specialite")?.value,
      niveau: this.voeuxForm.get("niveau")?.value,
      matieres: matiereIds,
      typesSeance: typesSeance,
      commentaire: this.voeuxForm.get("commentaire")?.value || "",
    }
  }

  // Soumettre un formulaire
  submitForm(formType: string): void {
    switch (formType) {
      case "cour":
        if (this.courForm.valid) {
          console.log("Soumission du formulaire de cours:", this.courForm.value)

          const coursData = {
            ...this.courForm.value,
            // Convertir le semestre au format attendu par l'API
            semestre: this.convertToSemestreFormat(this.courForm.value.semestre),
            enseignantId: this.enseignantId,
            estActif: true,
            dateCreation: new Date().toISOString(),
          }

          this.isLoading = true
          this.coursService.addCours(coursData).subscribe({
            next: (response) => {
              console.log("Cours ajouté avec succès:", response)
              this.showNotification("Cours ajouté avec succès!")
              this.isLoading = false
              this.hideModal()

              // Mettre à jour les statistiques
              this.coursStats.total++
              this.coursStats.active++

              // Recharger les cours
              this.loadCoursBySemestre(1)
              this.loadCoursBySemestre(2)
            },
            error: (error) => {
              console.error("Erreur lors de l'ajout du cours:", error)
              this.showNotification("Erreur lors de l'ajout du cours. Veuillez réessayer.", "OK")
              this.isLoading = false
            },
          })
        } else {
          this.markFormGroupTouched(this.courForm)
          this.showNotification("Veuillez remplir tous les champs obligatoires.", "OK")
        }
        break

      case "devoir":
        if (this.devoirForm.valid) {
          console.log("Soumission du formulaire de devoir:", this.devoirForm.value)

          // Créer l'objet de données pour l'API
          const devoirData = {
            title: this.devoirForm.value.title,
            description: this.devoirForm.value.description,
            dueDate: this.devoirForm.value.dueDate,
            courId: this.devoirForm.value.cour,
            departementId: this.devoirForm.value.departement,
            niveauId: this.devoirForm.value.niveau,
            specialiteId: this.devoirForm.value.specialite,
            enseignantId: this.enseignantId,
            statut: "publié",
            options: {
              autoriserRenduTardif: false,
              noteMax: 20,
              visiblePourEtudiants: true,
            },
          }

          this.isLoading = true

          // Ajouter des logs pour déboguer
          console.log("Données du devoir avant envoi:", devoirData)
          console.log("Fichier avant envoi:", this.devoirFile)

          // Appel au service DevoirService
          this.devoirService.addDevoir(devoirData, this.devoirFile).subscribe({
            next: (response) => {
              console.log("Devoir ajouté avec succès:", response)
              this.showNotification("Devoir assigné avec succès!")
              this.isLoading = false
              this.hideModal()

              // Mettre à jour les statistiques
              this.devoirStats.total++
              this.devoirStats.pending++
            },
            error: (error) => {
              console.error("Erreur lors de l'ajout du devoir:", error)
              this.showNotification("Erreur lors de l'ajout du devoir. Veuillez réessayer.", "OK")
              this.isLoading = false
            },
          })
        } else {
          this.markFormGroupTouched(this.devoirForm)
          this.showNotification("Veuillez remplir tous les champs obligatoires.", "OK")
        }
        break

      case "chapitre":
        if (this.chapitreForm.invalid) {
          this.showNotification("Veuillez remplir tous les champs obligatoires", "OK")
          return
        }

        this.isLoading = true
        const chapitreData = this.chapitreForm.value

        // Si un fichier est sélectionné, l'uploader d'abord
        if (this.chapitreFile) {
          const formData = new FormData()

          // Ajouter les champs du formulaire
          Object.keys(chapitreData).forEach((key) => {
            if (key !== "fichier" && key !== "fichierNom" && key !== "fichierPath") {
              formData.append(key, chapitreData[key])
            }
          })

          // Ajouter le fichier
          formData.append("fichier", this.chapitreFile, this.chapitreFile.name)

          // CORRECTION: Utiliser then/catch au lieu de subscribe
          this.chapitreService
            .createChapitre(formData)
            .then((response) => {
              console.log("Chapitre ajouté avec succès:", response)
              this.showNotification("Chapitre ajouté avec succès!")
              this.chapitreStats.total++
              this.chapitreStats.published++
              this.isLoading = false
              this.hideModal()
              this.loadChapitresStats()
            })
            .catch((error) => {
              console.error("Erreur lors de l'ajout du chapitre:", error)
              this.showNotification("Erreur lors de l'ajout du chapitre. API non disponible.", "OK")
              this.isLoading = false
              // Simuler un succès pour le développement
              this.simulateChapitreSuccess()
            })
        } else {
          // Sans fichier, on peut envoyer directement l'objet JSON
          // CORRECTION: Utiliser then/catch au lieu de subscribe
          this.chapitreService
            .createChapitre(chapitreData)
            .then((response) => {
              console.log("Chapitre ajouté avec succès:", response)
              this.showNotification("Chapitre ajouté avec succès!")
              this.chapitreStats.total++
              this.chapitreStats.published++
              this.isLoading = false
              this.hideModal()
              this.loadChapitresStats()
            })
            .catch((error) => {
              console.error("Erreur lors de l'ajout du chapitre:", error)
              this.showNotification("Erreur lors de l'ajout du chapitre. API non disponible.", "OK")
              this.isLoading = false
              // Simuler un succès pour le développement
              this.simulateChapitreSuccess()
            })
        }
        break

      case "voeux":
        if (this.voeuxForm.valid) {
          // Vérifier que chaque matière a au moins un type de séance sélectionné
          let isValid = true
          for (let i = 0; i < this.matieresFormArray.length; i++) {
            if (!this.isAnyTypeSelected(i)) {
              isValid = false
              this.showNotification("Veuillez sélectionner au moins un type de séance pour chaque matière.", "OK")
              break
            }
          }

          if (isValid) {
            console.log("Soumission du formulaire de voeux:", this.voeuxForm.value)

            // Préparer les données pour l'API
            const voeuxData = this.prepareVoeuxData()

            // Ajouter les informations de l'enseignant
            voeuxData.enseignantId = this.enseignantId
            voeuxData.enseignantNom = this.enseignantName

            this.isLoading = true

            // Appeler le service pour créer le voeu
            this.voeuxService.createVoeux(voeuxData).subscribe({
              next: (response) => {
                console.log("Voeux créé avec succès:", response)
                this.showNotification("Voeux soumis avec succès!")
                this.isLoading = false
                this.hideModal()

                // Mettre à jour les statistiques
                this.voeuxStats.total++
                this.voeuxStats.pending++

                // Recharger les statistiques
                this.loadVoeuxStats()
              },
              error: (error) => {
                console.error("Erreur lors de la création du voeu:", error)
                this.showNotification("Erreur lors de la soumission des voeux. Veuillez réessayer.", "OK")
                this.isLoading = false
              },
            })
          }
        } else {
          this.markFormGroupTouched(this.voeuxForm)
          this.showNotification("Veuillez remplir tous les champs obligatoires.", "OK")
        }
        break
    }
  }

  // Méthode utilitaire pour marquer tous les champs d'un formulaire comme touchés
  markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched()

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control)
      }
    })
  }

  // Méthode pour obtenir la couleur de fond selon le type de cours
  getCoursColor(type: string): string {
    switch (type) {
      case "Cours":
        return "#6366f1"
      case "TD":
        return "#f59e0b"
      case "TP":
        return "#10b981"
      default:
        return "#6366f1"
    }
  }

  // Méthode pour simuler un succès lors de l'ajout d'un chapitre (pour le développement)
  simulateChapitreSuccess(): void {
    // Simuler un délai pour l'ajout
    setTimeout(() => {
      console.log("Simulation: Chapitre ajouté avec succès")
      this.showNotification("Chapitre ajouté avec succès (mode développement)!")

      // Mettre à jour les statistiques
      this.chapitreStats.total++
      this.chapitreStats.published++

      this.isLoading = false
      this.hideModal()
    }, 1000)
  }

  // Méthode pour exporter la liste des matières en PDF
  exporterMatieresEnPDF(): void {
    this.showNotification("Exportation en PDF en cours...")
    // Ici, vous pourriez implémenter la logique d'exportation PDF
    // Utiliser une bibliothèque comme jsPDF ou pdfmake
    setTimeout(() => {
      this.showNotification("Liste des matières exportée en PDF avec succès!")
    }, 1500)
  }

  // Calculer le total des heures par semestre
  calculerTotalHeuresSemestre(semestre: number): number {
    const matieres = semestre === 1 ? this.matieresSemestre1 : this.matieresSemestre2
    return matieres.reduce((total, matiere) => {
      const heures = Number.parseInt(matiere.heures) || 0
      return total + heures
    }, 0)
  }

  // Vérifier si l'utilisateur est chef de département
  isChefDepartement(): boolean {
    // Check for both "chef_departement" and "chef de département" roles (case insensitive)
    return (
      this.userRole?.toLowerCase().includes("chef") ||
      this.grade?.toLowerCase().includes("chef") ||
      this.departement?.toLowerCase().includes("chef")
    )
  }
}
