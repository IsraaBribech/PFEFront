import { Component, type OnInit } from "@angular/core"
import { FormBuilder, type FormGroup, Validators } from "@angular/forms"
import  { UserService } from "../user.service"
import  { MatSnackBar } from "@angular/material/snack-bar"
import  { SpecialitesService } from "../specialites.service"
import  { DepartementsService } from "../departements.service"
import  { NiveauxService } from "../niveaux.service"
import  { StatsService } from "../stats.service"
import { forkJoin } from "rxjs"
import { trigger, transition, style, animate } from "@angular/animations"

@Component({
  selector: "app-etudiants",
  templateUrl: "./etudiants.component.html",
  styleUrls: ["./etudiants.component.css"],
  animations: [
    trigger("fadeIn", [transition(":enter", [style({ opacity: 0 }), animate("300ms ease-in", style({ opacity: 1 }))])]),
    trigger("slideIn", [
      transition(":enter", [
        style({ transform: "translateY(20px)", opacity: 0 }),
        animate("300ms ease-out", style({ transform: "translateY(0)", opacity: 1 })),
      ]),
    ]),
  ],
})
export class EtudiantsComponent implements OnInit {
  // Définition des propriétés
  etudiants: any[] = []

  // Propriétés pour le filtrage et l'affichage
  filteredEtudiants: any[] = []
  selectedDepartment = ""
  selectedSpecialty = ""
  selectedLevel = ""
  selectedGroup = ""
  selectedSubGroup = ""
  viewMode = "list" // Toujours en mode liste
  searchTerm = ""

  selectedEtudiant: any = null
  showAddForm = false
  editMode = false
  showDetailPanel = true // Pour contrôler l'affichage du panneau de détails

  // Propriétés pour le formulaire d'ajout d'utilisateur
  activeModal: string | null = null
  userForm: FormGroup

  // Données pour les sélecteurs
  departments: any[] = []
  specialties: any[] = []
  niveaux: any[] = []
  filteredSpecialties: any[] = []
  availableSubGroups: string[] = [] // Pour les sous-groupes générés dynamiquement

  // Indicateurs de chargement
  loadingEtudiants = false
  loadingSpecialites = false
  loadingDepartments = false
  loadingNiveaux = false
  submitting = false
  showPassword = false
filteredGroups: any

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private snackBar: MatSnackBar,
    private specialitesService: SpecialitesService,
    private departementsService: DepartementsService,
    private niveauxService: NiveauxService,
    private statsService: StatsService
  ) {
    // Initialisation du formulaire utilisateur
    this.userForm = this.initForms()
  }

  ngOnInit(): void {
    // Chargement des données au démarrage du composant
    this.loadInitialData()

    // Ajouter un écouteur pour le changement de département
    this.userForm.get("department")?.valueChanges.subscribe((departmentId) => {
      if (departmentId) {
        this.loadSpecialtiesForDepartment(departmentId)
        // Enable specialty field when department is selected
        this.userForm.get("specialty")?.enable()
      } else {
        this.filteredSpecialties = []
        // Disable specialty field when no department is selected
        this.userForm.get("specialty")?.disable()
      }
    })

    // Replace or add this listener for group changes
  this.userForm.get("group")?.valueChanges.subscribe((groupId) => {
    if (groupId) {
      this.availableSubGroups = []
      for (let i = 1; i <= 5; i++) {
        this.availableSubGroups.push(`${groupId}.${i}`)
      }
      this.userForm.get("subGroup")?.enable()
    } else {
      this.availableSubGroups = []
      this.userForm.get("subGroup")?.disable()
    }
  })

    // Ajouter ces lignes dans la méthode ngOnInit() juste après la souscription existante pour department
    this.userForm.get("firstName")?.valueChanges.subscribe(() => {
      this.updateFullName()
    })

    this.userForm.get("lastName")?.valueChanges.subscribe(() => {
      this.updateFullName()
    })
  }

  // Ajouter cette nouvelle méthode après ngOnInit()
  private updateFullName(): void {
    const firstName = this.userForm.get("firstName")?.value || ""
    const lastName = this.userForm.get("lastName")?.value || ""
    if (firstName || lastName) {
      const fullName = `${firstName} ${lastName}`.trim()
      this.userForm.get("name")?.setValue(fullName)
    }
  }

  // Initialisation des formulaires avec validation améliorée
  private initForms(): FormGroup {
    return this.fb.group({
      _id: [""],
      // Informations personnelles
      firstName: ["", [Validators.required, Validators.minLength(2)]],
      lastName: ["", [Validators.required, Validators.minLength(2)]],
      name: ["", [Validators.required, Validators.minLength(3)]], // Champ complet pour la compatibilité
      birthDate: ["", [Validators.required]],
      civilStatus: ["", [Validators.required]],

      // Informations d'identification
      email: ["", [Validators.required, Validators.email]],
      cin: ["", [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
      telephone: ["", [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],

      // Champs d'adresse
      street: ["", [Validators.required]],
      postalCode: ["", [Validators.required]],
      gouvernorat: ["", [Validators.required]],
      delegation: ["", [Validators.required]],

      // Informations académiques
      department: ["", [Validators.required]],
      specialty: [{ value: "", disabled: true }, [Validators.required]], // Disabled by default until department is selected
      level: ["", [Validators.required]],
      group: ["", [Validators.required]],
      subGroup: [{ value: "", disabled: true }, [Validators.required]], // Disabled by default until group is selected

      // Informations supplémentaires
      couleur: ["#3498db"],

      // Statistiques - conservées mais non affichées
      nbCours: [0],
      moyenne: [0],
      projets: [0],

      // Sécurité - pour les nouveaux étudiants uniquement
      password: ["", [Validators.required, Validators.minLength(6)]],

      // Utiliser la gestion correcte des champs désactivés
      matricule: [{ value: "", disabled: true }],
    })
  }

  // Charger toutes les données initiales
  loadInitialData(): void {
    this.loadingEtudiants = true
    this.loadingDepartments = true
    this.loadingSpecialites = true
    this.loadingNiveaux = true

    // Utiliser forkJoin pour charger toutes les données en parallèle
    forkJoin({
      etudiants: this.userService.getUsers(),
      departments: this.departementsService.getDepartements(),
      specialties: this.specialitesService.getSpecialites(),
      niveaux: this.niveauxService.getNiveaux(),
    }).subscribe({
      next: (results) => {
        // Traiter les résultats
        this.processEtudiants(results.etudiants)
        this.departments = results.departments
        this.specialties = results.specialties
        this.niveaux = results.niveaux

        // Mettre à jour les indicateurs de chargement
        this.loadingEtudiants = false
        this.loadingDepartments = false
        this.loadingSpecialites = false
        this.loadingNiveaux = false
      },
      error: (error: any) => {
        console.error("Erreur lors du chargement des données initiales:", error)
        this.showNotification("Erreur lors du chargement des données. Veuillez réessayer.", true)

        // Mettre à jour les indicateurs de chargement même en cas d'erreur
        this.loadingEtudiants = false
        this.loadingDepartments = false
        this.loadingSpecialites = false
        this.loadingNiveaux = false
      },
    })
  }

  // Méthode pour générer des sous-groupes en fonction du groupe sélectionné
  generateSubGroups(groupId: string): void {
    this.availableSubGroups = []
    for (let i = 1; i <= 5; i++) {
      this.availableSubGroups.push(`${groupId}.${i}`)
    }
  }

  // Traiter les données des étudiants reçues de l'API
  processEtudiants(data: any[]): void {
    // Transformer les données des utilisateurs en format d'étudiant
    this.etudiants = data.map((user) => {
      // Extraire prénom et nom
      let prenom = "",
        nom = ""
      if (user.name) {
        const nameParts = user.name.trim().split(" ")
        if (nameParts.length >= 2) {
          prenom = nameParts[0]
          nom = nameParts.slice(1).join(" ")
        } else {
          prenom = user.name
          nom = ""
        }
      } else if (user.firstName && user.lastName) {
        prenom = user.firstName
        nom = user.lastName
      }

      // Créer l'objet étudiant avec toutes les propriétés nécessaires
      return {
        _id: user._id,
        id: user._id || user.id,
        nom: nom,
        prenom: prenom,
        email: user.email,
        cin: user.cin,
        telephone: user.telephone || "",
        birthDate: user.birthDate || "",
        civilStatus: user.civilStatus || "",
        couleur: user.couleur || this.getRandomColor(),
        nbCours: user.nbCours || 0,
        moyenne: user.moyenne || 0,
        projets: user.projets || 0,
        departmentId: user.department,
        specialtyId: user.specialty,
        levelId: user.level,
        groupId: user.group,
        subGroupId: user.subGroup,
        matricule: user.matricule || "",
        // Adresse
        street: user.street || user.address?.street || "",
        postalCode: user.postalCode || user.address?.postalCode || "",
        gouvernorat: user.gouvernorat || user.address?.gouvernorat || "",
        delegation: user.delegation || user.address?.delegation || "",
      }
    })

    // Initialiser la liste filtrée
    this.filteredEtudiants = [...this.etudiants]
  }

  // Méthodes pour le filtrage des étudiants
  onDepartmentChange(): void {
    const departmentId = this.userForm.get("department")?.value || this.selectedDepartment

    if (departmentId) {
      this.loadSpecialtiesForDepartment(departmentId)
      // Réinitialiser la spécialité sélectionnée quand le département change
      this.selectedSpecialty = ""
      this.selectedGroup = ""
      this.selectedSubGroup = ""
      this.userForm.get("specialty")?.enable()
    } else {
      this.filteredSpecialties = []
      this.userForm.get("specialty")?.disable()
      this.userForm.get("group")?.disable()
      this.userForm.get("subGroup")?.disable()
    }
    this.applyFilters()
  }

// Modify the onGroupChange method
onGroupChange(): void {
  const groupId = this.selectedGroup

  if (groupId) {
    // Generate subgroups based on the selected group
    this.availableSubGroups = []
    for (let i = 1; i <= 5; i++) {
      this.availableSubGroups.push(`${groupId}.${i}`)
    }
    this.selectedSubGroup = ""
  } else {
    this.availableSubGroups = []
  }
  this.applyFilters()
}

// Update the method that handles group selection in the form
// Add this to your component if it doesn't exist already
onFormGroupChange(): void {
  const groupId = this.userForm.get('group')?.value
  
  if (groupId) {
    this.availableSubGroups = []
    for (let i = 1; i <= 5; i++) {
      this.availableSubGroups.push(`${groupId}.${i}`)
    }
    this.userForm.get('subGroup')?.enable()
  } else {
    this.availableSubGroups = []
    this.userForm.get('subGroup')?.disable()
  }
}

  // Méthode pour gérer le changement de spécialité dans les filtres
  onSpecialtyChange(): void {
    const specialtyId = this.selectedSpecialty

    if (specialtyId) {
      this.selectedGroup = ""
      this.selectedSubGroup = ""
    }
    this.applyFilters()
  }

  applyFilters(): void {
    // Filtrer les étudiants selon les critères sélectionnés
    this.filteredEtudiants = this.etudiants.filter((etudiant) => {
      let matchesDepartment = true
      let matchesSpecialty = true
      let matchesLevel = true
      let matchesGroup = true
      let matchesSubGroup = true

      // Filtrer par département si sélectionné
      if (this.selectedDepartment) {
        matchesDepartment = etudiant.departmentId === this.selectedDepartment
      }

      // Filtrer par spécialité si sélectionnée
      if (this.selectedSpecialty) {
        matchesSpecialty = etudiant.specialtyId === this.selectedSpecialty
      }

      // Filtrer par niveau si sélectionné
      if (this.selectedLevel) {
        matchesLevel = etudiant.levelId === this.selectedLevel
      }

      // Filtrer par groupe si sélectionné
      if (this.selectedGroup) {
        matchesGroup = etudiant.groupId === this.selectedGroup
      }

      // Filtrer par sous-groupe si sélectionné
      if (this.selectedSubGroup) {
        matchesSubGroup = etudiant.subGroupId === this.selectedSubGroup
      }

      return matchesDepartment && matchesSpecialty && matchesLevel && matchesGroup && matchesSubGroup
    })

    // Appliquer la recherche si un terme est défini
    if (this.searchTerm && this.searchTerm.trim() !== "") {
      this.searchEtudiants()
    }

    // Si aucun étudiant ne correspond, afficher un message
    if (
      this.filteredEtudiants.length === 0 &&
      (this.selectedDepartment ||
        this.selectedSpecialty ||
        this.selectedLevel ||
        this.selectedGroup ||
        this.selectedSubGroup)
    ) {
      this.showNotification("Aucun étudiant ne correspond à vos critères de recherche", false)
    }
  }

  resetFilters(): void {
    this.selectedDepartment = ""
    this.selectedSpecialty = ""
    this.selectedLevel = ""
    this.selectedGroup = ""
    this.selectedSubGroup = ""
    this.searchTerm = ""
    this.filteredSpecialties = []
    this.availableSubGroups = []
    this.filteredEtudiants = [...this.etudiants]
    this.showNotification("Filtres réinitialisés", false)
  }

  // Recherche d'étudiants
  searchEtudiants(): void {
    if (!this.searchTerm || this.searchTerm.trim() === "") {
      // Si le terme de recherche est vide, appliquer simplement les filtres actuels
      this.applyFilters()
      return
    }

    const searchTermLower = this.searchTerm.toLowerCase().trim()

    // Filtrer par terme de recherche
    this.filteredEtudiants = this.filteredEtudiants.filter((etudiant) => {
      return (
        (etudiant.nom && etudiant.nom.toLowerCase().includes(searchTermLower)) ||
        (etudiant.prenom && etudiant.prenom.toLowerCase().includes(searchTermLower)) ||
        (etudiant.email && etudiant.email.toLowerCase().includes(searchTermLower)) ||
        (etudiant.cin && etudiant.cin.toLowerCase().includes(searchTermLower)) ||
        (etudiant.telephone && etudiant.telephone.toLowerCase().includes(searchTermLower)) ||
        this.getDepartmentName(etudiant.departmentId).toLowerCase().includes(searchTermLower) ||
        this.getSpecialtyName(etudiant.specialtyId).toLowerCase().includes(searchTermLower) ||
        this.getLevelName(etudiant.levelId).toLowerCase().includes(searchTermLower) ||
        (etudiant.groupId && etudiant.groupId.toLowerCase().includes(searchTermLower)) ||
        (etudiant.subGroupId && etudiant.subGroupId.toLowerCase().includes(searchTermLower))
      )
    })
  }

  // Méthode pour charger les spécialités d'un département spécifique
  loadSpecialtiesForDepartment(departmentId: string): void {
    console.log("Chargement des spécialités pour le département:", departmentId)

    if (!departmentId) {
      this.filteredSpecialties = []
      this.userForm.get("specialty")?.disable()
      return
    }

    this.loadingSpecialites = true
    this.specialitesService.getSpecialitesByDepartement(departmentId).subscribe({
      next: (data) => {
        console.log(`Spécialités du département ${departmentId}:`, data)
        this.filteredSpecialties = data
        this.loadingSpecialites = false

        // Enable specialty field now that we have data
        this.userForm.get("specialty")?.enable()

        // Si aucune spécialité n'est trouvée, informer l'utilisateur
        if (data.length === 0) {
          this.showNotification(`Aucune spécialité trouvée pour ce département`, false)
          this.userForm.get("specialty")?.disable()
        }

        // Si le département a changé, réinitialiser la valeur de spécialité dans le formulaire
        const currentSpecialty = this.userForm.get("specialty")?.value
        if (currentSpecialty) {
          const exists = this.filteredSpecialties.some((s) => s._id === currentSpecialty || s.id === currentSpecialty)

          if (!exists) {
            this.userForm.get("specialty")?.setValue("")
          }
        }
      },
      error: (error: any) => {
        console.error(`Erreur lors du chargement des spécialités pour le département ${departmentId}:`, error)
        this.showNotification("Erreur lors du chargement des spécialités", true)
        this.filteredSpecialties = []
        this.loadingSpecialites = false
        this.userForm.get("specialty")?.disable()
      },
    })
  }

  // Définition des méthodes existantes
  selectEtudiant(etudiant: any): void {
    this.selectedEtudiant = etudiant
    this.showDetailPanel = true
  }

  // Fermer le panneau de détails
  closeDetailPanel(): void {
    this.showDetailPanel = false
    this.selectedEtudiant = null
  }

  // Méthode pour éditer un étudiant
  editEtudiant(etudiant: any): void {
    this.editMode = true

    // Trouver le département, spécialité, groupe et sous-groupe correspondants
    const departmentId = etudiant.departmentId
    const specialtyId = etudiant.specialtyId
    const levelId = etudiant.levelId
    const groupId = etudiant.groupId
    const subGroupId = etudiant.subGroupId

    // Charger les spécialités pour ce département
    if (departmentId) {
      this.loadSpecialtiesForDepartment(departmentId)
    }

    // Générer les sous-groupes pour ce groupe
    if (groupId) {
      this.generateSubGroups(groupId)
    }

    // Remplir le formulaire avec les données de l'étudiant
    this.userForm.patchValue({
      _id: etudiant._id,
      firstName: etudiant.prenom,
      lastName: etudiant.nom,
      name: `${etudiant.prenom} ${etudiant.nom}`.trim(),
      cin: etudiant.cin,
      email: etudiant.email,
      telephone: etudiant.telephone || "",
      birthDate: etudiant.birthDate || "",
      civilStatus: etudiant.civilStatus || "",
      department: departmentId,
      specialty: specialtyId,
      level: levelId,
      group: groupId,
      subGroup: subGroupId,
      couleur: etudiant.couleur,
      nbCours: etudiant.nbCours,
      moyenne: etudiant.moyenne,
      projets: etudiant.projets,
      matricule: etudiant.matricule || "",
      // Adresse
      street: etudiant.street,
      postalCode: etudiant.postalCode,
      gouvernorat: etudiant.gouvernorat,
      delegation: etudiant.delegation,
    })

    // Enable fields if values are selected
    if (departmentId) {
      this.userForm.get("specialty")?.enable()
    } else {
      this.userForm.get("specialty")?.disable()
    }

    if (groupId) {
      this.userForm.get("subGroup")?.enable()
    } else {
      this.userForm.get("subGroup")?.disable()
    }

    // Désactiver la validation du mot de passe en mode édition
    const passwordControl = this.userForm.get("password")
    if (passwordControl) {
      passwordControl.clearValidators()
      passwordControl.updateValueAndValidity()
    }

    // Afficher le modal
    this.showModal("user")
  }

  deleteEtudiant(id: string): void {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet étudiant ?")) {
      this.userService.deleteUser(id).subscribe({
        next: () => {
          // Supprimer l'étudiant des listes locales
          this.etudiants = this.etudiants.filter((e) => e._id !== id && e.id !== id)
          this.filteredEtudiants = this.filteredEtudiants.filter((e) => e._id !== id && e.id !== id)

          if (this.selectedEtudiant && (this.selectedEtudiant._id === id || this.selectedEtudiant.id === id)) {
            this.selectedEtudiant = null
            this.showDetailPanel = false
          }

          this.showNotification("Étudiant supprimé avec succès")
        },
        error: (error: any) => {
          console.error("Erreur lors de la suppression de l'étudiant:", error)
          this.showNotification("Erreur lors de la suppression de l'étudiant", true)
        },
      })
    }
  }

  // Méthodes pour la gestion du modal utilisateur
  showModal(type: string): void {
    // Assurez-vous que les données sont chargées avant d'afficher le modal
    if (!this.departments.length) {
      this.loadDepartments()
    }
    if (!this.specialties.length) {
      this.loadSpecialties()
    }
    if (!this.niveaux.length) {
      this.loadNiveaux()
    }
 
    this.activeModal = type

    // Modifier la méthode showModal() pour initialiser correctement le nom complet
    // Remplacer la partie "Si ce n'est pas en mode édition, réinitialiser le formulaire" par:
    if (!this.editMode) {
      this.userForm.reset({
        couleur: "#3498db",
        nbCours: 0,
        moyenne: 0,
        projets: 0,
      })

      // Réactiver la validation du mot de passe
      const passwordControl = this.userForm.get("password")
      if (passwordControl) {
        passwordControl.setValidators([Validators.required, Validators.minLength(6)])
        passwordControl.updateValueAndValidity()
      }

      // Disable fields initially
      this.userForm.get("specialty")?.disable()
      this.userForm.get("subGroup")?.disable()
    } else {
      // En mode édition, s'assurer que le nom complet est correctement défini
      this.updateFullName()
    }
  }

  hideModal(): void {
    this.activeModal = null
    this.editMode = false
  }

  // Méthodes pour obtenir les noms à partir des IDs
  getDepartmentName(departmentId: string): string {
    if (!departmentId) return ""
    const department = this.departments.find((d) => d._id === departmentId || d.id === departmentId)
    return department ? department.name : ""
  }

  getSpecialtyName(specialtyId: string): string {
    if (!specialtyId) return ""
    const specialty = this.specialties.find((s) => s._id === specialtyId || s.id === specialtyId)
    return specialty ? specialty.name : ""
  }

  getLevelName(levelId: string): string {
    if (!levelId) return ""
    const niveau = this.niveaux.find((n) => n._id === levelId || n.id === levelId)
    return niveau ? niveau.name : ""
  }

  getGroupName(groupId: string): string {
    if (!groupId) return ""
    return `Groupe ${groupId}`
  }

  getSubGroupName(subGroupId: string): string {
    if (!subGroupId) return ""
    return subGroupId
  }

  // Méthode pour charger les départements
  loadDepartments(): void {
    this.loadingDepartments = true
    this.departementsService.getDepartements().subscribe({
      next: (data) => {
        console.log("Départements chargés:", data)
        this.departments = data
        this.loadingDepartments = false
      },
      error: (error: any) => {
        console.error("Erreur lors du chargement des départements:", error)
        this.showNotification("Erreur lors du chargement des départements", true)
        this.loadingDepartments = false
      },
    })
  }

  // Méthode pour charger les spécialités depuis la base
  loadSpecialties(): void {
    this.loadingSpecialites = true
    console.log("Début du chargement des spécialités")

    this.specialitesService.getSpecialites().subscribe({
      next: (data: any) => {
        console.log("Spécialités chargées:", data)
        this.specialties = data
        this.loadingSpecialites = false
      },
      error: (error: any) => {
        console.error("Erreur détaillée lors du chargement des spécialités:", error)
        // Afficher plus de détails sur l'erreur
        if (error.error) console.error("Corps de l'erreur:", error.error)
        if (error.status) {
          console.error("Code d'état HTTP:", error.status)
        }

        this.showNotification("Erreur lors du chargement des spécialités. Veuillez réessayer.", true)
        this.loadingSpecialites = false
      },
    })
  }

  loadNiveaux(): void {
    this.loadingNiveaux = true
    console.log("Début du chargement des niveaux")

    this.niveauxService.getNiveaux().subscribe({
      next: (data: any) => {
        console.log("Niveaux chargés:", data)
        this.niveaux = data
        this.loadingNiveaux = false
      },
      error: (error: any) => {
        console.error("Erreur détaillée lors du chargement des niveaux:", error)
        if (error.error) console.error("Corps de l'erreur:", error.error)
        if (error.status) {
          console.error("Code d'état HTTP:", error.status)
        }

        this.showNotification("Erreur lors du chargement des niveaux. Veuillez réessayer.", true)
        this.loadingNiveaux = false
      },
    })
  }

  // Méthode pour soumettre le formulaire utilisateur
  submitForm(type: string): void {
    if (this.submitting) {
      return // Éviter les soumissions multiples
    }

    // Log form state for debugging
    console.log("Form valid:", this.userForm.valid)
    console.log("Form values:", this.userForm.value)
    console.log("Form errors:", this.getFormValidationErrors())

    if (type === "user" && this.userForm.valid) {
      this.submitting = true
      console.log("Formulaire utilisateur soumis:", this.userForm.value)

      try {
        // Obtenir toutes les valeurs du formulaire, y compris les champs désactivés
        const formValues = this.userForm.getRawValue()

        // Construire le nom complet à partir des champs firstName et lastName si disponibles
        let fullName = formValues.name
        if (formValues.firstName && formValues.lastName) {
          fullName = `${formValues.firstName} ${formValues.lastName}`.trim()
          formValues.name = fullName
        }

        // Formater les données pour l'API
        const userData: any = {
          name: fullName,
          firstName: formValues.firstName,
          lastName: formValues.lastName,
          email: formValues.email,
          cin: formValues.cin,
          telephone: formValues.telephone,
          birthDate: formValues.birthDate,
          civilStatus: formValues.civilStatus,
          department: formValues.department,
          specialty: formValues.specialty,
          level: formValues.level,
          group: formValues.group,
          subGroup: formValues.subGroup,
          matricule: formValues.matricule || "",

          // Inclure les données d'adresse
          address: {
            street: formValues.street,
            postalCode: formValues.postalCode,
            gouvernorat: formValues.gouvernorat,
            delegation: formValues.delegation,
          },
          // Inclure aussi les champs d'adresse directement pour la compatibilité
          street: formValues.street,
          postalCode: formValues.postalCode,
          gouvernorat: formValues.gouvernorat,
          delegation: formValues.delegation,

          // Inclure les données supplémentaires
          couleur: formValues.couleur || "#3498db",
          nbCours: formValues.nbCours || 0,
          moyenne: formValues.moyenne || 0,
          projets: formValues.projets || 0,

          // S'assurer que tous les champs requis par l'API sont présents
          role: "student", // Ajouter le rôle si requis par l'API
        }

        // Ajouter le mot de passe uniquement pour les nouveaux utilisateurs
        if (!this.editMode) {
          userData["password"] = formValues.password
        }

        console.log("Données utilisateur préparées:", userData)

        // Déterminer si c'est un ajout ou une mise à jour
        if (this.editMode && formValues._id) {
          // Mise à jour d'un utilisateur existant
          this.userService.updateUser(formValues._id, userData).subscribe({
            next: (response: any) => {
              console.log("Réponse après mise à jour utilisateur:", response)
              this.showNotification("Étudiant mis à jour avec succès!")

              // Mettre à jour l'étudiant dans la liste locale
              this.updateLocalEtudiant({ ...userData, _id: formValues._id })

              this.hideModal()
              this.submitting = false
            },
            error: (error: any) => {
              this.handleSubmitError(error)
            },
          })
        } else {
          // Ajout d'un nouvel utilisateur
          this.userService.addUser(userData).subscribe({
            next: (response: any) => {
              console.log("Réponse après ajout utilisateur:", response)
              this.showNotification("Étudiant ajouté avec succès!")

              // Ajouter l'étudiant à la liste locale
              this.addUserAsEtudiant({ ...userData, _id: response.user?.id || response._id })

              this.hideModal()
              this.submitting = false
            },
            error: (error: any) => {
              this.handleSubmitError(error)
            },
          })
        }
      } catch (error: any) {
        console.error("Erreur lors de la préparation des données:", error)
        this.showNotification("Erreur: " + (error.message || "Veuillez vérifier les données saisies."), true)
        this.submitting = false
      }
    } else {
      // Marquer tous les champs comme touchés pour afficher les erreurs de validation
      this.markFormGroupTouched(this.userForm)

      this.showNotification("Veuillez remplir tous les champs obligatoires correctement.", true)
    }
  }

  // Helper method to mark all form controls as touched
  markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key)
      control?.markAsTouched()
      control?.markAsDirty()
      control?.updateValueAndValidity()
    })
  }

  // Helper method to get all validation errors
  getFormValidationErrors() {
    const errors: any = {}
    Object.keys(this.userForm.controls).forEach((key) => {
      const control = this.userForm.get(key)
      if (control && control.errors) {
        errors[key] = control.errors
      }
    })
    return errors
  }

  // Gérer les erreurs de soumission
  handleSubmitError(error: any): void {
    console.error("Erreur détaillée:", error)

    // Afficher plus de détails sur l'erreur
    if (error.error) console.error("Corps de l'erreur:", error.error)
    if (error.status) {
      console.error("Code d'état HTTP:", error.status)
    }

    let errorMessage = "Erreur lors de l'opération: "

    // Construire un message d'erreur plus informatif
    if (error.error && typeof error.error === "object") {
      const errorDetails = Object.entries(error.error)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ")
      errorMessage += errorDetails || "Veuillez vérifier les données saisies."
    } else if (error.message) {
      errorMessage += error.message
    } else if (typeof error.error === "string") {
      errorMessage += error.error
    } else {
      errorMessage += "Veuillez réessayer."
    }

    this.showNotification(errorMessage, true)
    this.submitting = false
  }

  // Mettre à jour un étudiant dans la liste locale
  updateLocalEtudiant(userData: any): void {
    // Trouver l'étudiant dans la liste
    const index = this.etudiants.findIndex((e) => e._id === userData._id || e.id === userData._id)

    if (index !== -1) {
      // Extraire prénom et nom
      let prenom = userData.firstName || "",
        nom = userData.lastName || ""
      if (!prenom && !nom && userData.name) {
        const nameParts = userData.name.trim().split(" ")
        if (nameParts.length >= 2) {
          prenom = nameParts[0]
          nom = nameParts.slice(1).join(" ")
        } else {
          prenom = userData.name
          nom = ""
        }
      }

      // Mettre à jour l'étudiant
      const updatedEtudiant = {
        ...this.etudiants[index],
        nom: nom,
        prenom: prenom,
        email: userData.email,
        cin: userData.cin,
        telephone: userData.telephone || this.etudiants[index].telephone,
        birthDate: userData.birthDate || this.etudiants[index].birthDate,
        civilStatus: userData.civilStatus || this.etudiants[index].civilStatus,
        couleur: userData.couleur,
        departmentId: userData.department,
        specialtyId: userData.specialty,
        levelId: userData.level,
        groupId: userData.group,
        subGroupId: userData.subGroup,
        matricule: userData.matricule || this.etudiants[index].matricule,
        nbCours: userData.nbCours || this.etudiants[index].nbCours,
        moyenne: userData.moyenne || this.etudiants[index].moyenne,
        projets: userData.projets || this.etudiants[index].projets,
        // Adresse
        street: userData.street || userData.address?.street || this.etudiants[index].street,
        postalCode: userData.postalCode || userData.address?.postalCode || this.etudiants[index].postalCode,
        gouvernorat: userData.gouvernorat || userData.address?.gouvernorat || this.etudiants[index].gouvernorat,
        delegation: userData.delegation || userData.address?.delegation || this.etudiants[index].delegation,
      }

      // Mettre à jour les listes
      this.etudiants[index] = updatedEtudiant

      // Mettre à jour la liste filtrée
      const filteredIndex = this.filteredEtudiants.findIndex((e) => e._id === userData._id || e.id === userData._id)
      if (filteredIndex !== -1) {
        this.filteredEtudiants[filteredIndex] = updatedEtudiant
      }

      // Mettre à jour l'étudiant sélectionné si nécessaire
      if (
        this.selectedEtudiant &&
        (this.selectedEtudiant._id === userData._id || this.selectedEtudiant.id === userData._id)
      ) {
        this.selectedEtudiant = updatedEtudiant
      }

      // Appliquer les filtres pour mettre à jour la liste filtrée
      this.applyFilters()
    }
  }

  // Méthode pour ajouter un étudiant directement à partir d'un utilisateur
  addUserAsEtudiant(user: any): void {
    // Extraire nom et prénom
    let prenom = user.firstName || "",
      nom = user.lastName || ""
    if (!prenom && !nom && user.name) {
      const nameParts = user.name.trim().split(" ")
      if (nameParts.length >= 2) {
        prenom = nameParts[0]
        nom = nameParts.slice(1).join(" ")
      } else {
        prenom = user.name
        nom = ""
      }
    }

    const newEtudiant = {
      _id: user._id,
      id: user._id,
      nom: nom,
      prenom: prenom,
      email: user.email,
      cin: user.cin,
      telephone: user.telephone || "",
      birthDate: user.birthDate || "",
      civilStatus: user.civilStatus || "",
      couleur: user.couleur || this.getRandomColor(),
      nbCours: user.nbCours || 0,
      moyenne: user.moyenne || 0,
      projets: user.projets || 0,
      departmentId: user.department,
      specialtyId: user.specialty,
      levelId: user.level,
      groupId: user.group,
      subGroupId: user.subGroup,
      matricule: user.matricule || "",
      // Adresse
      street: user.street || user.address?.street || "",
      postalCode: user.postalCode || user.address?.postalCode || "",
      gouvernorat: user.gouvernorat || user.address?.gouvernorat || "",
      delegation: user.delegation || user.address?.delegation || "",
    }

    this.etudiants.push(newEtudiant)
    this.filteredEtudiants.push(newEtudiant)

    // Appliquer les filtres actuels pour mettre à jour la liste filtrée
    this.applyFilters()
  }

  // Méthode d'affichage des notifications
  private showNotification(message: string, isError = false): void {
    this.snackBar.open(message, "Fermer", {
      duration: isError ? 8000 : 3000,
      horizontalPosition: "end",
      verticalPosition: "top",
      panelClass: isError ? ["error-notification"] : ["success-notification"],
    })
  }

  // Utilitaire pour générer une couleur aléatoire
  private getRandomColor(): string {
    const colors = [
      "#3498db", // Bleu
      "#2ecc71", // Vert
      "#9b59b6", // Violet
      "#e74c3c", // Rouge
      "#f39c12", // Orange
      "#1abc9c", // Turquoise
      "#d35400", // Orange foncé
      "#8e44ad", // Violet foncé
      "#16a085", // Vert foncé
      "#c0392b", // Rouge foncé
      "#27ae60", // Vert émeraude
      "#2980b9", // Bleu foncé
      "#f1c40f", // Jaune
      "#e67e22", // Carotte
      "#34495e", // Bleu gris
    ]
    return colors[Math.floor(Math.random() * colors.length)]
  }

  // Vérifier si un contrôle de formulaire a des erreurs et a été touché
  hasError(controlName: string): boolean {
    const control = this.userForm.get(controlName)
    return control ? control.invalid && (control.dirty || control.touched) : false
  }

  // Obtenir un message d'erreur pour l'affichage dans le formulaire
  getErrorMessage(controlName: string): string {
    const control = this.userForm.get(controlName)

    if (!control) return ""

    if (control.hasError("required")) {
      return "Ce champ est obligatoire"
    }
    if (control.hasError("email")) {
      return "Veuillez entrer une adresse email valide"
    }
    if (control.hasError("minlength")) {
      const minLength = control.getError("minlength").requiredLength
      return `Ce champ doit contenir au moins ${minLength} caractères`
    }
    if (control.hasError("pattern")) {
      if (controlName === "cin" || controlName === "telephone") {
        return "Ce champ doit contenir 8 chiffres"
      }
      return "Format invalide"
    }

    return ""
  }
}